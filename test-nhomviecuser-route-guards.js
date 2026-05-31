require("dotenv").config();
const assert = require("assert/strict");

const authentication = require("./middlewares/authentication");
const { AppError } = require("./helpers/utils");
const nhomViecUserRouter = require("./routes/nhomViecUser");
const nhomViecUserController = require("./modules/workmanagement/controllers/nhomViecUser.controller");
const NhomViecUser = require("./modules/workmanagement/models/NhomViecUser");

function getRouteLayer(path, method) {
  return nhomViecUserRouter.stack.find(
    (layer) =>
      layer.route &&
      layer.route.path === path &&
      Boolean(layer.route.methods?.[method]),
  );
}

function hasGlobalLoginRequired() {
  return nhomViecUserRouter.stack.some(
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

async function invokeMiddleware(middleware, req) {
  return await new Promise((resolve, reject) => {
    Promise.resolve(middleware(req, {}, (error) => resolve(error))).catch(
      reject,
    );
  });
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

async function main() {
  const originalCreate = NhomViecUser.create;
  const originalCountDocuments = NhomViecUser.countDocuments;
  const originalFind = NhomViecUser.find;
  const originalFindById = NhomViecUser.findById;
  const originalFindOne = NhomViecUser.findOne;
  const originalFindByIdAndUpdate = NhomViecUser.findByIdAndUpdate;

  try {
    const getRoute = getRouteLayer("/", "get");
    const postRoute = getRouteLayer("/", "post");
    const putRoute = getRouteLayer("/", "put");
    const deleteRoute = getRouteLayer("/:id", "delete");

    assert.ok(getRoute, "GET /nhomviec-user route must exist");
    assert.ok(postRoute, "POST /nhomviec-user route must exist");
    assert.ok(putRoute, "PUT /nhomviec-user route must exist");
    assert.ok(deleteRoute, "DELETE /nhomviec-user/:id route must exist");
    assert.ok(
      hasGlobalLoginRequired(),
      "All nhomviec-user routes must stay behind global loginRequired",
    );

    assert.equal(
      getRouteHandles(getRoute, "get")[0],
      nhomViecUserController.getAll,
      "GET /nhomviec-user must map to controller getAll",
    );
    assert.equal(
      getRouteHandles(postRoute, "post")[0],
      nhomViecUserController.insertOne,
      "POST /nhomviec-user must map to controller insertOne",
    );
    assert.equal(
      getRouteHandles(putRoute, "put")[0],
      nhomViecUserController.updateOne,
      "PUT /nhomviec-user must map to controller updateOne",
    );
    assert.equal(
      getRouteHandles(deleteRoute, "delete")[0],
      nhomViecUserController.deleteOne,
      "DELETE /nhomviec-user/:id must map to controller deleteOne",
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

    NhomViecUser.countDocuments = async (filter) => {
      lastCountFilter = filter;
      return 1;
    };
    NhomViecUser.find = (filter) => {
      lastFindFilter = filter;
      return makePagedQueryResult([
        {
          _id: "nhom-own",
          TenNhom: "Nhóm của tôi",
          NguoiTaoID: { _id: "user-regular", HoTen: "Người dùng thường" },
        },
      ]);
    };

    const regularRead = await invokeController(nhomViecUserController.getAll, {
      user: { userId: "user-regular", PhanQuyen: "nomal" },
      query: {},
    });
    assert.equal(regularRead.nextError, undefined);
    assert.equal(regularRead.res.statusCode, 200);
    assert.deepEqual(lastCountFilter, {
      $and: [{ isDeleted: false }, { NguoiTaoID: "user-regular" }],
    });
    assert.deepEqual(lastFindFilter, {
      $and: [{ isDeleted: false }, { NguoiTaoID: "user-regular" }],
    });
    assert.equal(regularRead.res.body.data.count, 1);
    assert.equal(regularRead.res.body.data.nhomViecUsers.length, 1);

    NhomViecUser.countDocuments = async (filter) => {
      lastCountFilter = filter;
      return 2;
    };
    NhomViecUser.find = (filter) => {
      lastFindFilter = filter;
      return makePagedQueryResult([{ _id: "nhom-1" }, { _id: "nhom-2" }]);
    };

    const adminRead = await invokeController(nhomViecUserController.getAll, {
      user: { userId: "admin-1", PhanQuyen: "admin" },
      query: {},
    });
    assert.equal(adminRead.nextError, undefined);
    assert.equal(adminRead.res.statusCode, 200);
    assert.deepEqual(lastCountFilter, { $and: [{ isDeleted: false }] });
    assert.deepEqual(lastFindFilter, { $and: [{ isDeleted: false }] });
    assert.equal(adminRead.res.body.data.count, 2);

    NhomViecUser.create = async () => {
      throw new Error("regular user create should not reach model layer");
    };
    const regularCreate = await invokeController(
      nhomViecUserController.insertOne,
      {
        user: { userId: "user-regular", PhanQuyen: "nomal" },
        body: { TenNhom: "Không hợp lệ", MoTa: "Blocked" },
      },
    );
    expectAppError(
      regularCreate.nextError,
      403,
      "Bạn không có quyền tạo nhóm việc",
      "Regular user create",
    );

    NhomViecUser.create = async (payload) => ({ _id: "nhom-1", ...payload });
    NhomViecUser.findById = () =>
      makePopulateQueryResult({
        _id: "nhom-1",
        TenNhom: "Nhóm quản lý",
        NguoiTaoID: { _id: "manager-1" },
      });

    const managerCreate = await invokeController(
      nhomViecUserController.insertOne,
      {
        user: { userId: "manager-1", PhanQuyen: "manager" },
        body: {
          TenNhom: "Nhóm quản lý",
          MoTa: "Cho phép manager tạo nhóm do mình sở hữu",
        },
      },
    );
    assert.equal(managerCreate.nextError, undefined);
    assert.equal(managerCreate.res.statusCode, 200);
    assert.equal(managerCreate.res.body.success, true);
    assert.equal(
      managerCreate.res.body.message,
      "Tạo thành công",
      "Manager create must succeed",
    );

    NhomViecUser.findOne = async () => ({
      _id: "nhom-own",
      NguoiTaoID: "manager-1",
      isDeleted: false,
    });
    NhomViecUser.findByIdAndUpdate = () =>
      makePopulateQueryResult({
        _id: "nhom-own",
        TenNhom: "Nhóm đã cập nhật",
        NguoiTaoID: { _id: "manager-1" },
      });

    const managerUpdateOwn = await invokeController(
      nhomViecUserController.updateOne,
      {
        user: { userId: "manager-1", PhanQuyen: "manager" },
        body: {
          nhomViecUser: {
            _id: "nhom-own",
            TenNhom: "Nhóm đã cập nhật",
            MoTa: "Manager tự sửa nhóm của mình",
          },
        },
      },
    );
    assert.equal(managerUpdateOwn.nextError, undefined);
    assert.equal(managerUpdateOwn.res.statusCode, 200);
    assert.equal(managerUpdateOwn.res.body.success, true);

    NhomViecUser.findOne = async () => ({
      _id: "nhom-other",
      NguoiTaoID: "other-user",
      isDeleted: false,
    });
    NhomViecUser.findByIdAndUpdate = async () => {
      throw new Error("manager update foreign group should not update model");
    };

    const managerUpdateOther = await invokeController(
      nhomViecUserController.updateOne,
      {
        user: { userId: "manager-1", PhanQuyen: "manager" },
        body: {
          nhomViecUser: {
            _id: "nhom-other",
            TenNhom: "Nhóm khác",
            MoTa: "Không được phép",
          },
        },
      },
    );
    expectAppError(
      managerUpdateOther.nextError,
      403,
      "Bạn không có quyền cập nhật nhóm việc này",
      "Manager update foreign group",
    );

    NhomViecUser.findOne = async () => ({
      _id: "nhom-admin",
      NguoiTaoID: "other-user",
      isDeleted: false,
    });
    NhomViecUser.findByIdAndUpdate = async () => ({
      _id: "nhom-admin",
      isDeleted: true,
    });

    const adminDelete = await invokeController(
      nhomViecUserController.deleteOne,
      {
        params: { id: "nhom-admin" },
        user: { userId: "admin-1", PhanQuyen: "admin" },
      },
    );
    assert.equal(adminDelete.nextError, undefined);
    assert.equal(adminDelete.res.statusCode, 200);
    assert.equal(adminDelete.res.body.success, true);
    assert.equal(adminDelete.res.body.message, "Xóa thành công");

    const regularAdminRequiredError = await invokeMiddleware(
      authentication.loginRequired,
      {
        headers: {},
      },
    );
    assert.ok(
      regularAdminRequiredError instanceof AppError,
      "Missing token must still be rejected by loginRequired",
    );
    assert.equal(regularAdminRequiredError.statusCode, 401);

    console.log("NhomViecUser route/controller guard smoke test passed.");
  } finally {
    NhomViecUser.create = originalCreate;
    NhomViecUser.countDocuments = originalCountDocuments;
    NhomViecUser.find = originalFind;
    NhomViecUser.findById = originalFindById;
    NhomViecUser.findOne = originalFindOne;
    NhomViecUser.findByIdAndUpdate = originalFindByIdAndUpdate;
  }
}

main().catch((error) => {
  console.error("NhomViecUser route/controller guard smoke test failed.");
  console.error(error);
  process.exitCode = 1;
});
