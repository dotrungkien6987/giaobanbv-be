require("dotenv").config();
const assert = require("assert/strict");

const { AppError } = require("./helpers/utils");
const controller = require("./controllers/quyTrinhISO.controller");
const QuyTrinhISO = require("./models/QuyTrinhISO");
const QuyTrinhISO_KhoaPhanPhoi = require("./models/QuyTrinhISO_KhoaPhanPhoi");

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

async function invokeController(handler, req) {
  const res = createMockRes();
  let nextError;

  await handler(req, res, (error) => {
    nextError = error;
    return error;
  });

  return { res, nextError };
}

function makeFindByIdQuery(value) {
  return {
    populate() {
      return this;
    },
    lean() {
      return Promise.resolve(value);
    },
    then(onFulfilled, onRejected) {
      return Promise.resolve(value).then(onFulfilled, onRejected);
    },
  };
}

function makeFindQuery(value) {
  return {
    populate() {
      return this;
    },
    sort() {
      return this;
    },
    skip() {
      return this;
    },
    limit() {
      return this;
    },
    lean() {
      return Promise.resolve(value);
    },
  };
}

function makeDistributionQuery(value) {
  return {
    populate() {
      return this;
    },
    lean() {
      return Promise.resolve(value);
    },
    then(onFulfilled, onRejected) {
      return Promise.resolve(value).then(onFulfilled, onRejected);
    },
  };
}

function makeDoc(overrides = {}) {
  const base = {
    _id: "quytrinh-1",
    MaQuyTrinh: "ISO-001",
    PhienBan: "1.0",
    TrangThai: "ACTIVE",
    IsDeleted: false,
    KhoaXayDungID: { _id: "khoa-build", TenKhoa: "QLCL" },
    getFilesByType: async () => ({ pdf: [], word: [] }),
    toJSON() {
      return {
        _id: this._id,
        MaQuyTrinh: this.MaQuyTrinh,
        PhienBan: this.PhienBan,
        TrangThai: this.TrangThai,
      };
    },
  };

  return { ...base, ...overrides };
}

async function main() {
  const originalFindById = QuyTrinhISO.findById;
  const originalFind = QuyTrinhISO.find;
  const originalCountDocuments = QuyTrinhISO.countDocuments;
  const originalExists = QuyTrinhISO_KhoaPhanPhoi.exists;
  const originalDistributionFind = QuyTrinhISO_KhoaPhanPhoi.find;

  try {
    QuyTrinhISO.countDocuments = async () => 1;
    QuyTrinhISO_KhoaPhanPhoi.find = () =>
      makeDistributionQuery([
        { KhoaID: { _id: "khoa-a", TenKhoa: "Khoa A", MaKhoa: "KA" } },
      ]);

    QuyTrinhISO.findById = (id) => makeFindByIdQuery(makeDoc({ _id: id }));
    QuyTrinhISO.find = () => makeFindQuery([makeDoc()]);
    QuyTrinhISO_KhoaPhanPhoi.exists = async () => true;

    const allowedDetail = await invokeController(controller.detail, {
      params: { id: "quytrinh-active" },
      user: { PhanQuyen: "nomal", KhoaID: "khoa-a" },
    });

    assert.equal(allowedDetail.nextError, undefined);
    assert.equal(allowedDetail.res.statusCode, 200);
    assert.equal(allowedDetail.res.body.success, true);

    QuyTrinhISO.findById = (id) =>
      makeFindByIdQuery(makeDoc({ _id: id, TrangThai: "INACTIVE" }));

    const inactiveDetailDenied = await invokeController(controller.detail, {
      params: { id: "quytrinh-inactive" },
      user: { PhanQuyen: "nomal", KhoaID: "khoa-a" },
    });

    assert.ok(inactiveDetailDenied.nextError instanceof AppError);
    assert.equal(inactiveDetailDenied.nextError.statusCode, 403);
    assert.equal(
      inactiveDetailDenied.nextError.message,
      "Không có quyền xem quy trình này",
    );

    const inactiveVersionsDenied = await invokeController(
      controller.getVersions,
      {
        params: { id: "quytrinh-inactive" },
        query: {},
        user: { PhanQuyen: "nomal", KhoaID: "khoa-a" },
      },
    );

    assert.ok(inactiveVersionsDenied.nextError instanceof AppError);
    assert.equal(inactiveVersionsDenied.nextError.statusCode, 403);
    assert.equal(
      inactiveVersionsDenied.nextError.message,
      "Không có quyền xem quy trình này",
    );

    const inactiveDetailAllowedForQlcl = await invokeController(
      controller.detail,
      {
        params: { id: "quytrinh-inactive" },
        user: { PhanQuyen: "qlcl", KhoaID: "khoa-qlcl" },
      },
    );

    assert.equal(inactiveDetailAllowedForQlcl.nextError, undefined);
    assert.equal(inactiveDetailAllowedForQlcl.res.statusCode, 200);
    assert.equal(inactiveDetailAllowedForQlcl.res.body.success, true);

    const inactiveVersionsAllowedForQlcl = await invokeController(
      controller.getVersions,
      {
        params: { id: "quytrinh-inactive" },
        query: {},
        user: { PhanQuyen: "admin", KhoaID: "khoa-qlcl" },
      },
    );

    assert.equal(inactiveVersionsAllowedForQlcl.nextError, undefined);
    assert.equal(inactiveVersionsAllowedForQlcl.res.statusCode, 200);
    assert.equal(inactiveVersionsAllowedForQlcl.res.body.success, true);

    console.log("QuyTrinhISO read scope smoke test passed.");
  } finally {
    QuyTrinhISO.findById = originalFindById;
    QuyTrinhISO.find = originalFind;
    QuyTrinhISO.countDocuments = originalCountDocuments;
    QuyTrinhISO_KhoaPhanPhoi.exists = originalExists;
    QuyTrinhISO_KhoaPhanPhoi.find = originalDistributionFind;
  }
}

main().catch((error) => {
  console.error("QuyTrinhISO read scope smoke test failed.");
  console.error(error);
  process.exitCode = 1;
});
