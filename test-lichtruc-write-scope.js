require("dotenv").config();
const assert = require("assert/strict");

const { AppError } = require("./helpers/utils");
const lichTrucController = require("./controllers/lichtruc.controller");
const LichTruc = require("./models/LichTruc");
const User = require("./models/User");
const Khoa = require("./models/Khoa");

function createMockRes() {
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

async function invokeController(controller, req) {
  const res = createMockRes();
  let nextError;

  await controller(req, res, (error) => {
    nextError = error;
    return error;
  });

  return { res, nextError };
}

function makePopulatedResult(value) {
  return {
    ...value,
    _doc: value,
    populate() {
      return this;
    },
  };
}

function daysFromToday(offset) {
  const date = new Date();
  date.setHours(9, 0, 0, 0);
  date.setDate(date.getDate() + offset);
  return date;
}

async function main() {
  const originalUserFindById = User.findById;
  const originalKhoaFindById = Khoa.findById;
  const originalLichTrucCreate = LichTruc.create;
  const originalLichTrucFindById = LichTruc.findById;
  const originalLichTrucFindOne = LichTruc.findOne;

  try {
    let createCallCount = 0;

    User.findById = (id) => ({
      select() {
        return {
          lean: async () => {
            if (id === "user-khoa-allowed") {
              return {
                _id: id,
                PhanQuyen: "nomal",
                KhoaID: "own-khoa-id",
                KhoaLichTruc: ["HSCC"],
              };
            }

            if (id === "user-denied") {
              return {
                _id: id,
                PhanQuyen: "nomal",
                KhoaID: "own-khoa-id",
                KhoaLichTruc: [],
              };
            }

            if (id === "admin-user") {
              return {
                _id: id,
                PhanQuyen: "admin",
                KhoaID: "admin-khoa-id",
                KhoaLichTruc: [],
              };
            }

            return null;
          },
        };
      },
    });

    Khoa.findById = (id) => ({
      select() {
        return {
          lean: async () => {
            if (id === "allowed-khoa-id") {
              return { _id: id, MaKhoa: "HSCC" };
            }

            if (id === "denied-khoa-id") {
              return { _id: id, MaKhoa: "KKB" };
            }

            return null;
          },
        };
      },
    });

    LichTruc.create = async (payload) => {
      createCallCount += 1;
      return {
        _id: `lichtruc-${createCallCount}`,
        ...payload,
      };
    };

    LichTruc.findById = (id) =>
      makePopulatedResult({
        _id: id,
        Ngay: daysFromToday(1),
        KhoaID: { _id: "allowed-khoa-id", TenKhoa: "Hồi sức cấp cứu" },
        DieuDuong: "DD Test",
        BacSi: "BS Test",
        GhiChu: "Ghi chú",
        UserID: "user-khoa-allowed",
      });

    LichTruc.findOne = async () => null;

    const deniedBulk = await invokeController(
      lichTrucController.updateOrInsert,
      {
        userId: "user-denied",
        body: [
          {
            _id: 0,
            Ngay: daysFromToday(1).toISOString(),
            KhoaID: "denied-khoa-id",
            DieuDuong: "DD A",
            BacSi: "BS A",
            GhiChu: "Denied",
          },
        ],
        user: { PhanQuyen: "nomal", KhoaID: "own-khoa-id" },
      },
    );

    assert.equal(deniedBulk.nextError, undefined);
    assert.equal(deniedBulk.res.statusCode, 200);
    assert.equal(deniedBulk.res.body.success, true);
    assert.equal(deniedBulk.res.body.data.updatedRecords.length, 0);
    assert.equal(deniedBulk.res.body.data.errors.length, 1);
    assert.match(
      deniedBulk.res.body.data.errors[0],
      /Không có quyền cập nhật lịch trực cho khoa denied-khoa-id/,
    );

    const allowedBulk = await invokeController(
      lichTrucController.updateOrInsert,
      {
        userId: "user-khoa-allowed",
        body: [
          {
            _id: 0,
            Ngay: daysFromToday(1).toISOString(),
            KhoaID: "allowed-khoa-id",
            DieuDuong: "DD B",
            BacSi: "BS B",
            GhiChu: "Allowed",
          },
        ],
        user: { PhanQuyen: "nomal", KhoaID: "own-khoa-id" },
      },
    );

    assert.equal(allowedBulk.nextError, undefined);
    assert.equal(allowedBulk.res.statusCode, 200);
    assert.equal(allowedBulk.res.body.success, true);
    assert.equal(allowedBulk.res.body.data.updatedRecords.length, 1);
    assert.equal(allowedBulk.res.body.data.errors.length, 0);
    assert.equal(createCallCount, 1);

    const adminPastCreate = await invokeController(
      lichTrucController.createLichTruc,
      {
        userId: "admin-user",
        body: {
          Ngay: daysFromToday(-3).toISOString(),
          KhoaID: "denied-khoa-id",
          DieuDuong: "DD Admin",
          BacSi: "BS Admin",
          GhiChu: "Past date allowed for admin",
        },
        user: { PhanQuyen: "admin", KhoaID: "admin-khoa-id" },
      },
    );

    assert.equal(adminPastCreate.nextError, undefined);
    assert.equal(adminPastCreate.res.statusCode, 201);
    assert.equal(adminPastCreate.res.body.success, true);
    assert.equal(adminPastCreate.res.body.data.lichTruc._id, "lichtruc-2");

    const stalePastBlocked = await invokeController(
      lichTrucController.updateOrInsert,
      {
        userId: "user-khoa-allowed",
        body: [
          {
            _id: 0,
            Ngay: daysFromToday(-3).toISOString(),
            KhoaID: "allowed-khoa-id",
            DieuDuong: "DD C",
            BacSi: "BS C",
            GhiChu: "Old date",
          },
        ],
        user: { PhanQuyen: "nomal", KhoaID: "own-khoa-id" },
      },
    );

    assert.equal(stalePastBlocked.nextError, undefined);
    assert.equal(stalePastBlocked.res.statusCode, 200);
    assert.equal(stalePastBlocked.res.body.data.updatedRecords.length, 0);
    assert.equal(stalePastBlocked.res.body.data.errors.length, 1);
    assert.match(
      stalePastBlocked.res.body.data.errors[0],
      /Không thể cập nhật lịch trực của ngày đã qua/,
    );
    assert.equal(createCallCount, 2);

    console.log("LichTruc write scope smoke test passed.");
  } finally {
    User.findById = originalUserFindById;
    Khoa.findById = originalKhoaFindById;
    LichTruc.create = originalLichTrucCreate;
    LichTruc.findById = originalLichTrucFindById;
    LichTruc.findOne = originalLichTrucFindOne;
  }
}

main().catch((error) => {
  console.error("LichTruc write scope smoke test failed.");
  if (error instanceof AppError) {
    console.error(error.statusCode, error.message, error.errorType);
  } else {
    console.error(error);
  }
  process.exitCode = 1;
});
