const assert = require("assert");

const lopdaotaonhanvientamController = require("./controllers/lopdaotaonhanvientam.controller");
const LopDaoTao = require("./models/LopDaoTao");
const LopDaoTaoNhanVienTam = require("./models/LopDaoTaoNhanVienTam");

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
  const creatorId = "64f3cb6035c717ab00d75b8b";
  const viewerId = "64f3cb6035c717ab00d75b8c";
  const adminId = "64f3cb6035c717ab00d75b8d";
  const lopDaoTaoId = "64f3cb6035c717ab00d75b8e";
  const nhanVienId = "64f3cb6035c717ab00d75b8f";
  const originals = {
    lopDaoTaoFindById: LopDaoTao.findById,
    lopDaoTaoNhanVienTamFind: LopDaoTaoNhanVienTam.find,
    lopDaoTaoNhanVienTamInsertMany: LopDaoTaoNhanVienTam.insertMany,
    lopDaoTaoNhanVienTamDeleteMany: LopDaoTaoNhanVienTam.deleteMany,
    lopDaoTaoNhanVienTamUpdateOne: LopDaoTaoNhanVienTam.updateOne,
  };

  try {
    LopDaoTao.findById = async () => ({
      _id: lopDaoTaoId,
      UserIDCreated: creatorId,
    });

    await assert.rejects(
      () =>
        invoke(
          lopdaotaonhanvientamController.insertOrUpdateLopdaotaoNhanVienTam,
          {
            user: {
              userId: viewerId,
              UserName: "viewer",
              PhanQuyen: "manager",
            },
            body: {
              lopdaotaoID: lopDaoTaoId,
              userID: creatorId,
              lopdaotaonhanvienData: [
                {
                  LopDaoTaoID: lopDaoTaoId,
                  NhanVienID: nhanVienId,
                  VaiTro: "Hoc vien",
                  UserID: creatorId,
                  UserName: "spoofed",
                },
              ],
            },
          },
        ),
      (error) => {
        assert.strictEqual(error.statusCode, 403);
        return true;
      },
    );

    let findCalls = [];
    let insertedItems = [];
    LopDaoTaoNhanVienTam.find = async (criteria) => {
      findCalls.push(criteria);
      return [];
    };
    LopDaoTaoNhanVienTam.insertMany = async (items) => {
      insertedItems = items;
      return items;
    };
    LopDaoTaoNhanVienTam.deleteMany = async () => ({ deletedCount: 0 });
    LopDaoTaoNhanVienTam.updateOne = async () => ({ matchedCount: 0 });

    const creatorResponse = await invoke(
      lopdaotaonhanvientamController.insertOrUpdateLopdaotaoNhanVienTam,
      {
        user: {
          userId: creatorId,
          UserName: "creator",
          PhanQuyen: "manager",
        },
        body: {
          lopdaotaoID: lopDaoTaoId,
          userID: viewerId,
          lopdaotaonhanvienData: [
            {
              LopDaoTaoID: lopDaoTaoId,
              NhanVienID: nhanVienId,
              VaiTro: "Hoc vien",
              UserID: viewerId,
              UserName: "spoofed",
            },
          ],
        },
      },
    );

    assert.strictEqual(creatorResponse.statusCode, 200);
    assert.strictEqual(insertedItems.length, 1);
    assert.strictEqual(insertedItems[0].UserID, creatorId);
    assert.strictEqual(insertedItems[0].UserName, "creator");
    assert.deepStrictEqual(findCalls[0], {
      LopDaoTaoID: new (require("mongoose").Types.ObjectId)(lopDaoTaoId),
      UserID: creatorId,
    });
    assert.deepStrictEqual(findCalls[1], {
      LopDaoTaoID: new (require("mongoose").Types.ObjectId)(lopDaoTaoId),
      UserID: creatorId,
    });

    findCalls = [];
    const adminResponse = await invoke(
      lopdaotaonhanvientamController.insertOrUpdateLopdaotaoNhanVienTam,
      {
        user: {
          userId: adminId,
          UserName: "admin",
          PhanQuyen: "admin",
        },
        body: {
          lopdaotaoID: lopDaoTaoId,
          userID: viewerId,
          lopdaotaonhanvienData: [
            {
              LopDaoTaoID: lopDaoTaoId,
              NhanVienID: nhanVienId,
              VaiTro: "Hoc vien",
              UserID: viewerId,
              UserName: "spoofed",
            },
          ],
        },
      },
    );

    assert.strictEqual(adminResponse.statusCode, 200);
    assert.strictEqual(insertedItems[0].UserID, adminId);
    assert.strictEqual(insertedItems[0].UserName, "admin");

    console.log("lopdaotaonhanvientam scope smoke tests passed");
  } finally {
    LopDaoTao.findById = originals.lopDaoTaoFindById;
    LopDaoTaoNhanVienTam.find = originals.lopDaoTaoNhanVienTamFind;
    LopDaoTaoNhanVienTam.insertMany = originals.lopDaoTaoNhanVienTamInsertMany;
    LopDaoTaoNhanVienTam.deleteMany = originals.lopDaoTaoNhanVienTamDeleteMany;
    LopDaoTaoNhanVienTam.updateOne = originals.lopDaoTaoNhanVienTamUpdateOne;
  }
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
