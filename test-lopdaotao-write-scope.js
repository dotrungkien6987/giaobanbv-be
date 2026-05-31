const assert = require("assert");

const lopdaotaoController = require("./controllers/lopdaotao.controller");
const LopDaoTao = require("./models/LopDaoTao");
const LopDaoTaoNhanVien = require("./models/LopDaoTaoNhanVien");
const DaTaFix = require("./models/DaTaFix");
const HinhThucCapNhat = require("./models/HinhThucCapNhat");

function createResponseCollector() {
  return {
    statusCode: null,
    body: null,
    status(code) {
      this.statusCode = code;
      return this;
    },
    json(payload) {
      this.body = payload;
      return payload;
    },
  };
}

async function invoke(handler, req) {
  const res = createResponseCollector();
  return new Promise((resolve, reject) => {
    const maybePromise = handler(req, res, (error) => {
      if (error) {
        reject(error);
        return;
      }

      resolve({ statusCode: res.statusCode, body: res.body });
    });

    Promise.resolve(maybePromise)
      .then(() => {
        if (res.body) {
          resolve({ statusCode: res.statusCode, body: res.body });
          return;
        }

        reject(new Error("Handler did not send a response"));
      })
      .catch(reject);
  });
}

async function main() {
  const originals = {
    lopDaoTaoCreate: LopDaoTao.create,
    lopDaoTaoFindById: LopDaoTao.findById,
    lopDaoTaoFindByIdAndUpdate: LopDaoTao.findByIdAndUpdate,
    lopDaoTaoFindOneAndUpdate: LopDaoTao.findOneAndUpdate,
    daTaFixFindOne: DaTaFix.findOne,
    hinhThucCapNhatFind: HinhThucCapNhat.find,
    lopDaoTaoNhanVienUpdateMany: LopDaoTaoNhanVien.updateMany,
  };

  try {
    let capturedCreatePayload = null;
    LopDaoTao.create = async (payload) => {
      capturedCreatePayload = payload;
      return { _id: "lop-1" };
    };
    LopDaoTao.findById = async (id) => {
      if (id === "lop-1") {
        return {
          _id: "lop-1",
          MaHinhThucCapNhat: "NCKH011",
          toObject() {
            return {
              _id: "lop-1",
              MaHinhThucCapNhat: "NCKH011",
              UserIDCreated: "creator-1",
            };
          },
        };
      }

      if (id === "lop-2") {
        return {
          _id: "lop-2",
          UserIDCreated: "creator-1",
          SoLuong: 1,
          MaHinhThucCapNhat: "NCKH011",
        };
      }

      return null;
    };
    DaTaFix.findOne = async () => ({
      NhomHinhThucCapNhat: [{ Ma: "NCKH", Ten: "Nghien cuu" }],
    });
    HinhThucCapNhat.find = async () => [
      { Ma: "NCKH011", Ten: "De tai", MaNhomHinhThucCapNhat: "NCKH" },
    ];

    const insertResponse = await invoke(lopdaotaoController.insertOne, {
      user: { userId: "creator-1", PhanQuyen: "manager" },
      body: {
        lopdaotaoData: {
          Ten: "Lop moi",
          MaHinhThucCapNhat: "NCKH011",
          UserIDCreated: "spoofed-user",
        },
      },
    });

    assert.strictEqual(insertResponse.statusCode, 200);
    assert.strictEqual(capturedCreatePayload.UserIDCreated, "creator-1");

    await assert.rejects(
      () =>
        invoke(lopdaotaoController.updateOneLopDaoTao, {
          user: { userId: "viewer-1", PhanQuyen: "manager" },
          body: {
            _id: "lop-2",
            Ten: "Khong duoc phep",
            SoLuong: 1,
            MaHinhThucCapNhat: "NCKH011",
          },
        }),
      (error) => {
        assert.strictEqual(error.statusCode, 403);
        return true;
      },
    );

    let capturedUpdate = null;
    LopDaoTao.findByIdAndUpdate = async (id, payload) => {
      capturedUpdate = { id, payload };
      return { _id: id, ...payload };
    };

    const adminUpdateResponse = await invoke(
      lopdaotaoController.updateOneLopDaoTao,
      {
        user: { userId: "admin-1", PhanQuyen: "admin" },
        body: {
          _id: "lop-2",
          Ten: "Da cap nhat",
          SoLuong: 1,
          MaHinhThucCapNhat: "NCKH011",
        },
      },
    );

    assert.strictEqual(adminUpdateResponse.statusCode, 200);
    assert.deepStrictEqual(capturedUpdate, {
      id: "lop-2",
      payload: {
        _id: "lop-2",
        Ten: "Da cap nhat",
        SoLuong: 1,
        MaHinhThucCapNhat: "NCKH011",
      },
    });

    let deleteTouched = false;
    LopDaoTao.findOneAndUpdate = async () => {
      deleteTouched = true;
      return { _id: "lop-2", isDeleted: true };
    };
    LopDaoTaoNhanVien.updateMany = async () => ({ modifiedCount: 1 });

    const creatorDeleteResponse = await invoke(
      lopdaotaoController.deleteOneLopDaoTao,
      {
        user: { userId: "creator-1", PhanQuyen: "manager" },
        params: { lopdaotaoID: "lop-2" },
      },
    );

    assert.strictEqual(creatorDeleteResponse.statusCode, 200);
    assert.strictEqual(deleteTouched, true);

    console.log("lopdaotao write-scope smoke tests passed");
  } finally {
    LopDaoTao.create = originals.lopDaoTaoCreate;
    LopDaoTao.findById = originals.lopDaoTaoFindById;
    LopDaoTao.findByIdAndUpdate = originals.lopDaoTaoFindByIdAndUpdate;
    LopDaoTao.findOneAndUpdate = originals.lopDaoTaoFindOneAndUpdate;
    DaTaFix.findOne = originals.daTaFixFindOne;
    HinhThucCapNhat.find = originals.hinhThucCapNhatFind;
    LopDaoTaoNhanVien.updateMany = originals.lopDaoTaoNhanVienUpdateMany;
  }
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
