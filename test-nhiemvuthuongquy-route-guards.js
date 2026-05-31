require("dotenv").config();
const assert = require("assert/strict");

const authentication = require("./middlewares/authentication");
const { AppError } = require("./helpers/utils");
const nhiemVuThuongQuyRouter = require("./routes/nhiemvuThuongQuy");
const nhiemVuThuongQuyController = require("./modules/workmanagement/controllers/nhiemvuThuongQuy.controller");
const NhiemVuThuongQuy = require("./modules/workmanagement/models/NhiemVuThuongQuy");
const NhanVien = require("./models/NhanVien");

function getRouteLayer(path, method) {
  return nhiemVuThuongQuyRouter.stack.find(
    (layer) =>
      layer.route &&
      layer.route.path === path &&
      Boolean(layer.route.methods?.[method]),
  );
}

function hasGlobalLoginRequired() {
  return nhiemVuThuongQuyRouter.stack.some(
    (layer) => !layer.route && layer.handle === authentication.loginRequired,
  );
}

function getRouteHandles(layer, method) {
  return layer.route.stack
    .filter((stackLayer) => stackLayer.method === method)
    .map((stackLayer) => stackLayer.handle);
}

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

function expectAppError(error, statusCode, message, label) {
  assert.ok(error instanceof AppError, `${label} must return AppError`);
  assert.equal(error.statusCode, statusCode, `${label} status mismatch`);
  assert.equal(error.message, message, `${label} message mismatch`);
}

function makePopulateQueryResult(value) {
  return {
    value,
    populate() {
      return this;
    },
  };
}

function makeSelectLeanResult(value) {
  return {
    select() {
      return this;
    },
    lean() {
      return Promise.resolve(value);
    },
  };
}

async function main() {
  const originalCreate = NhiemVuThuongQuy.create;
  const originalCountDocuments = NhiemVuThuongQuy.countDocuments;
  const originalFind = NhiemVuThuongQuy.find;
  const originalFindById = NhiemVuThuongQuy.findById;
  const originalFindOne = NhiemVuThuongQuy.findOne;
  const originalFindByIdAndUpdate = NhiemVuThuongQuy.findByIdAndUpdate;
  const originalNhanVienFindById = NhanVien.findById;

  try {
    const getRoute = getRouteLayer("/", "get");
    const postRoute = getRouteLayer("/", "post");
    const putRoute = getRouteLayer("/", "put");
    const deleteRoute = getRouteLayer("/:id", "delete");

    assert.ok(getRoute, "GET /nhiemvu-thuongquy route must exist");
    assert.ok(postRoute, "POST /nhiemvu-thuongquy route must exist");
    assert.ok(putRoute, "PUT /nhiemvu-thuongquy route must exist");
    assert.ok(deleteRoute, "DELETE /nhiemvu-thuongquy/:id route must exist");
    assert.ok(
      hasGlobalLoginRequired(),
      "All nhiemvu-thuongquy routes must stay behind global loginRequired",
    );

    assert.equal(
      getRouteHandles(getRoute, "get")[0],
      nhiemVuThuongQuyController.getAll,
      "GET /nhiemvu-thuongquy must map to controller getAll",
    );
    assert.equal(
      getRouteHandles(postRoute, "post")[0],
      nhiemVuThuongQuyController.insertOne,
      "POST /nhiemvu-thuongquy must map to controller insertOne",
    );
    assert.equal(
      getRouteHandles(putRoute, "put")[0],
      nhiemVuThuongQuyController.updateOne,
      "PUT /nhiemvu-thuongquy must map to controller updateOne",
    );
    assert.equal(
      getRouteHandles(deleteRoute, "delete")[0],
      nhiemVuThuongQuyController.deleteOne,
      "DELETE /nhiemvu-thuongquy/:id must map to controller deleteOne",
    );

    function makePagedQueryResult(value) {
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
          return Promise.resolve(value);
        },
      };
    }

    let lastCountFilter = null;
    let lastFindFilter = null;

    NhanVien.findById = () => makeSelectLeanResult({ KhoaID: "khoa-a" });
    NhiemVuThuongQuy.countDocuments = async (filter) => {
      lastCountFilter = filter;
      return 1;
    };
    NhiemVuThuongQuy.find = (filter) => {
      lastFindFilter = filter;
      return makePagedQueryResult([
        {
          _id: "nvtq-own-khoa",
          TenNhiemVu: "Đi buồng khoa A",
          KhoaID: { _id: "khoa-a", TenKhoa: "Khoa A" },
        },
      ]);
    };

    const regularRead = await invokeController(
      nhiemVuThuongQuyController.getAll,
      {
        user: {
          userId: "user-regular",
          PhanQuyen: "nomal",
          NhanVienID: "nhanvien-regular",
        },
        query: {},
      },
    );
    assert.equal(regularRead.nextError, undefined);
    assert.equal(regularRead.res.statusCode, 200);
    assert.deepEqual(lastCountFilter, {
      $and: [{ isDeleted: false }, { KhoaID: "khoa-a" }],
    });
    assert.deepEqual(lastFindFilter, {
      $and: [{ isDeleted: false }, { KhoaID: "khoa-a" }],
    });
    assert.equal(regularRead.res.body.data.count, 1);

    NhiemVuThuongQuy.countDocuments = async (filter) => {
      lastCountFilter = filter;
      return 2;
    };
    NhiemVuThuongQuy.find = (filter) => {
      lastFindFilter = filter;
      return makePagedQueryResult([{ _id: "nvtq-1" }, { _id: "nvtq-2" }]);
    };

    const adminRead = await invokeController(
      nhiemVuThuongQuyController.getAll,
      {
        user: {
          userId: "admin-1",
          PhanQuyen: "admin",
          NhanVienID: "nhanvien-admin",
        },
        query: {},
      },
    );
    assert.equal(adminRead.nextError, undefined);
    assert.equal(adminRead.res.statusCode, 200);
    assert.deepEqual(lastCountFilter, { $and: [{ isDeleted: false }] });
    assert.deepEqual(lastFindFilter, { $and: [{ isDeleted: false }] });
    assert.equal(adminRead.res.body.data.count, 2);

    NhiemVuThuongQuy.create = async () => {
      throw new Error("regular user insert should not reach model layer");
    };
    const regularCreate = await invokeController(
      nhiemVuThuongQuyController.insertOne,
      {
        user: {
          userId: "user-regular",
          PhanQuyen: "nomal",
          NhanVienID: "nhanvien-regular",
        },
        body: {
          TenNhiemVu: "Không hợp lệ",
          KhoaID: "khoa-a",
        },
      },
    );
    expectAppError(
      regularCreate.nextError,
      403,
      "Bạn không có quyền thao tác với nhiệm vụ thường quy",
      "Regular user create",
    );

    NhanVien.findById = () => makeSelectLeanResult({ KhoaID: "khoa-a" });
    NhiemVuThuongQuy.create = async (payload) => ({
      _id: "nvtq-1",
      ...payload,
    });
    NhiemVuThuongQuy.findById = () =>
      makePopulateQueryResult({
        _id: "nvtq-1",
        KhoaID: { _id: "khoa-a" },
        NguoiTaoID: { _id: "manager-1" },
      });

    const managerCreateOwnKhoa = await invokeController(
      nhiemVuThuongQuyController.insertOne,
      {
        user: {
          userId: "manager-1",
          PhanQuyen: "manager",
          NhanVienID: "nhanvien-1",
        },
        body: {
          TenNhiemVu: "Theo dõi khoa A",
          KhoaID: "khoa-a",
          MucDoKhoDefault: 4,
        },
      },
    );
    assert.equal(managerCreateOwnKhoa.nextError, undefined);
    assert.equal(managerCreateOwnKhoa.res.statusCode, 200);
    assert.equal(managerCreateOwnKhoa.res.body.success, true);

    const managerCreateOtherKhoa = await invokeController(
      nhiemVuThuongQuyController.insertOne,
      {
        user: {
          userId: "manager-1",
          PhanQuyen: "manager",
          NhanVienID: "nhanvien-1",
        },
        body: {
          TenNhiemVu: "Theo dõi khoa B",
          KhoaID: "khoa-b",
          MucDoKhoDefault: 5,
        },
      },
    );
    expectAppError(
      managerCreateOtherKhoa.nextError,
      403,
      "Bạn chỉ có thể thao tác với nhiệm vụ của khoa mình quản lý",
      "Manager create foreign khoa",
    );

    NhiemVuThuongQuy.create = async (payload) => ({
      _id: "nvtq-2",
      ...payload,
    });
    NhiemVuThuongQuy.findById = () =>
      makePopulateQueryResult({
        _id: "nvtq-2",
        KhoaID: { _id: "khoa-b" },
        NguoiTaoID: { _id: "admin-1" },
      });

    const adminCreate = await invokeController(
      nhiemVuThuongQuyController.insertOne,
      {
        user: {
          userId: "admin-1",
          PhanQuyen: "admin",
          NhanVienID: "nhanvien-admin",
        },
        body: {
          TenNhiemVu: "Admin quản trị liên khoa",
          KhoaID: "khoa-b",
          MucDoKhoDefault: 7,
        },
      },
    );
    assert.equal(adminCreate.nextError, undefined);
    assert.equal(adminCreate.res.statusCode, 200);
    assert.equal(adminCreate.res.body.success, true);

    NhiemVuThuongQuy.findOne = async () => ({
      _id: "nvtq-own",
      KhoaID: "khoa-a",
      isDeleted: false,
    });
    NhiemVuThuongQuy.findByIdAndUpdate = async () => ({
      _id: "nvtq-own",
      isDeleted: true,
    });

    const managerDeleteOwnKhoa = await invokeController(
      nhiemVuThuongQuyController.deleteOne,
      {
        params: { id: "nvtq-own" },
        user: {
          userId: "manager-1",
          PhanQuyen: "manager",
          NhanVienID: "nhanvien-1",
        },
      },
    );
    assert.equal(managerDeleteOwnKhoa.nextError, undefined);
    assert.equal(managerDeleteOwnKhoa.res.statusCode, 200);
    assert.equal(managerDeleteOwnKhoa.res.body.success, true);

    NhiemVuThuongQuy.findOne = async () => ({
      _id: "nvtq-foreign",
      KhoaID: "khoa-b",
      isDeleted: false,
    });
    NhiemVuThuongQuy.findByIdAndUpdate = async () => {
      throw new Error("foreign khoa delete should not reach model layer");
    };

    const managerDeleteForeignKhoa = await invokeController(
      nhiemVuThuongQuyController.deleteOne,
      {
        params: { id: "nvtq-foreign" },
        user: {
          userId: "manager-1",
          PhanQuyen: "manager",
          NhanVienID: "nhanvien-1",
        },
      },
    );
    expectAppError(
      managerDeleteForeignKhoa.nextError,
      403,
      "Bạn chỉ có thể thao tác với nhiệm vụ của khoa mình quản lý",
      "Manager delete foreign khoa",
    );

    console.log("NhiemVuThuongQuy route/controller guard smoke test passed.");
  } finally {
    NhiemVuThuongQuy.create = originalCreate;
    NhiemVuThuongQuy.countDocuments = originalCountDocuments;
    NhiemVuThuongQuy.find = originalFind;
    NhiemVuThuongQuy.findById = originalFindById;
    NhiemVuThuongQuy.findOne = originalFindOne;
    NhiemVuThuongQuy.findByIdAndUpdate = originalFindByIdAndUpdate;
    NhanVien.findById = originalNhanVienFindById;
  }
}

main().catch((error) => {
  console.error("NhiemVuThuongQuy route/controller guard smoke test failed.");
  console.error(error);
  process.exitCode = 1;
});
