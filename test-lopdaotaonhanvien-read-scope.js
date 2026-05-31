const assert = require("assert");

const lopdaotaonhanvienController = require("./controllers/lopdaotaonhanvien.controller");
const lopdaotaoController = require("./controllers/lopdaotao.controller");
const LopDaoTaoNhanVien = require("./models/LopDaoTaoNhanVien");
const LopDaoTao = require("./models/LopDaoTao");
const LopDaoTaoNhanVienTam = require("./models/LopDaoTaoNhanVienTam");
const LopDaoTaoNhanVienDT06 = require("./models/LopDaoTaoNhanVienDT06");
const DaTaFix = require("./models/DaTaFix");
const HinhThucCapNhat = require("./models/HinhThucCapNhat");

function createQueryResult(items) {
  return {
    sort() {
      return this;
    },
    skip() {
      return this;
    },
    limit() {
      return Promise.resolve(items);
    },
    populate() {
      return this;
    },
    then(resolve, reject) {
      return Promise.resolve(items).then(resolve, reject);
    },
    catch(reject) {
      return Promise.resolve(items).catch(reject);
    },
  };
}

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
    lopDaoTaoFind: LopDaoTao.find,
    lopDaoTaoFindById: LopDaoTao.findById,
    lopDaoTaoNhanVienCountDocuments: LopDaoTaoNhanVien.countDocuments,
    lopDaoTaoNhanVienFind: LopDaoTaoNhanVien.find,
    lopDaoTaoNhanVienTamFind: LopDaoTaoNhanVienTam.find,
    lopDaoTaoNhanVienDT06Find: LopDaoTaoNhanVienDT06.find,
    daTaFixFindOne: DaTaFix.findOne,
    hinhThucCapNhatFind: HinhThucCapNhat.find,
  };

  try {
    let capturedListCriteria = null;
    LopDaoTao.find = async (criteria) => {
      assert.deepStrictEqual(criteria, {
        UserIDCreated: "creator-1",
        isDeleted: false,
      });
      return [{ _id: "lop-owned-1" }];
    };
    LopDaoTaoNhanVien.countDocuments = async (criteria) => {
      capturedListCriteria = criteria;
      return 1;
    };
    LopDaoTaoNhanVien.find = (criteria) => {
      capturedListCriteria = criteria;
      return createQueryResult([
        { _id: "member-1", LopDaoTaoID: "lop-owned-1" },
      ]);
    };

    const creatorListResponse = await invoke(
      lopdaotaonhanvienController.getAllPhanTrang,
      {
        user: { userId: "creator-1", PhanQuyen: "manager" },
        query: {},
      },
    );

    assert.strictEqual(creatorListResponse.statusCode, 200);
    assert.deepStrictEqual(capturedListCriteria, {
      $and: [{ isDeleted: false }, { LopDaoTaoID: { $in: ["lop-owned-1"] } }],
    });
    assert.strictEqual(
      creatorListResponse.body.data.lopdaotaonhanviens.length,
      1,
    );

    let privilegedScoped = false;
    LopDaoTao.find = async () => {
      privilegedScoped = true;
      return [];
    };
    LopDaoTaoNhanVien.countDocuments = async (criteria) => {
      capturedListCriteria = criteria;
      return 0;
    };
    LopDaoTaoNhanVien.find = (criteria) => {
      capturedListCriteria = criteria;
      return createQueryResult([]);
    };

    const privilegedListResponse = await invoke(
      lopdaotaonhanvienController.getAllPhanTrang,
      {
        user: { userId: "daotao-1", PhanQuyen: "daotao" },
        query: {},
      },
    );

    assert.strictEqual(privilegedListResponse.statusCode, 200);
    assert.strictEqual(privilegedScoped, false);
    assert.deepStrictEqual(capturedListCriteria, {
      $and: [{ isDeleted: false }],
    });

    DaTaFix.findOne = async () => ({
      NhomHinhThucCapNhat: [{ Ma: "NCKH", Ten: "Nghien cuu" }],
    });
    HinhThucCapNhat.find = async () => [
      {
        Ma: "NCKH011",
        TenBenhVien: "De tai cap co so",
        MaNhomHinhThucCapNhat: "NCKH",
      },
    ];
    LopDaoTao.findById = async () => ({
      _id: "lop-1",
      UserIDCreated: "creator-1",
      MaHinhThucCapNhat: "NCKH011",
      Ten: "Lop thu nghiem",
      toObject() {
        return {
          _id: this._id,
          UserIDCreated: this.UserIDCreated,
          MaHinhThucCapNhat: this.MaHinhThucCapNhat,
          Ten: this.Ten,
        };
      },
    });

    let rosterQueryCalled = false;
    LopDaoTaoNhanVien.find = () => {
      rosterQueryCalled = true;
      return createQueryResult([{ _id: "member-1" }]);
    };
    LopDaoTaoNhanVienTam.find = () => {
      rosterQueryCalled = true;
      return createQueryResult([{ _id: "member-tam-1" }]);
    };
    LopDaoTaoNhanVienDT06.find = async () => {
      rosterQueryCalled = true;
      return [{ _id: "dt06-1" }];
    };

    const unauthorizedDetailResponse = await invoke(
      lopdaotaoController.getById,
      {
        user: { userId: "viewer-1", PhanQuyen: "manager" },
        query: { lopdaotaoID: "lop-1", tam: "false" },
      },
    );

    assert.strictEqual(unauthorizedDetailResponse.statusCode, 200);
    assert.strictEqual(rosterQueryCalled, false);
    assert.deepStrictEqual(
      unauthorizedDetailResponse.body.data.lopdaotaonhanvien,
      [],
    );
    assert.deepStrictEqual(
      unauthorizedDetailResponse.body.data.lopdaotaonhanvienDT06,
      [],
    );

    rosterQueryCalled = false;
    LopDaoTaoNhanVien.find = () => {
      rosterQueryCalled = true;
      return createQueryResult([
        { _id: "member-1", NhanVienID: { _id: "nv-1" } },
      ]);
    };
    LopDaoTaoNhanVienDT06.find = async () => {
      rosterQueryCalled = true;
      return [{ _id: "dt06-1" }];
    };

    const creatorDetailResponse = await invoke(lopdaotaoController.getById, {
      user: { userId: "creator-1", PhanQuyen: "manager" },
      query: { lopdaotaoID: "lop-1", tam: "false" },
    });

    assert.strictEqual(creatorDetailResponse.statusCode, 200);
    assert.strictEqual(rosterQueryCalled, true);
    assert.strictEqual(
      creatorDetailResponse.body.data.lopdaotaonhanvien.length,
      1,
    );
    assert.strictEqual(
      creatorDetailResponse.body.data.lopdaotaonhanvienDT06.length,
      1,
    );

    console.log("lopdaotaonhanvien read-scope smoke tests passed");
  } finally {
    LopDaoTao.find = originals.lopDaoTaoFind;
    LopDaoTao.findById = originals.lopDaoTaoFindById;
    LopDaoTaoNhanVien.countDocuments =
      originals.lopDaoTaoNhanVienCountDocuments;
    LopDaoTaoNhanVien.find = originals.lopDaoTaoNhanVienFind;
    LopDaoTaoNhanVienTam.find = originals.lopDaoTaoNhanVienTamFind;
    LopDaoTaoNhanVienDT06.find = originals.lopDaoTaoNhanVienDT06Find;
    DaTaFix.findOne = originals.daTaFixFindOne;
    HinhThucCapNhat.find = originals.hinhThucCapNhatFind;
  }
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
