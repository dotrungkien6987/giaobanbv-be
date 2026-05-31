require("dotenv").config();
const assert = require("assert/strict");

const authentication = require("./middlewares/authentication");
const { AppError } = require("./helpers/utils");
const nhomKhoaRouter = require("./routes/nhomkhoasothutu.api");

function getRouteLayer(path, method) {
  return nhomKhoaRouter.stack.find(
    (layer) =>
      layer.route &&
      layer.route.path === path &&
      Boolean(layer.route.methods?.[method]),
  );
}

function getRouteHandles(layer) {
  return layer.route.stack.map((stackLayer) => stackLayer.handle);
}

async function invokeMiddleware(middleware, req) {
  return await new Promise((resolve, reject) => {
    Promise.resolve(middleware(req, {}, (error) => resolve(error))).catch(
      reject,
    );
  });
}

function assertAdminOnly(handles, label) {
  assert.equal(
    handles[0],
    authentication.loginRequired,
    `${label} must stay behind loginRequired`,
  );
  assert.equal(
    handles[1],
    authentication.adminRequired,
    `${label} must require adminRequired`,
  );
}

function assertAdminDaotaoOnly(handles, label) {
  assert.equal(
    handles[0],
    authentication.loginRequired,
    `${label} must stay behind loginRequired`,
  );
  assert.equal(
    handles[1],
    authentication.adminDaotaoRequired,
    `${label} must require adminDaotaoRequired`,
  );
}

function assertLoginOnly(handles, label) {
  assert.equal(
    handles[0],
    authentication.loginRequired,
    `${label} must stay behind loginRequired`,
  );
  assert.ok(
    !handles.includes(authentication.adminRequired),
    `${label} must not require adminRequired`,
  );
}

async function main() {
  const postRoute = getRouteLayer("/", "post");
  const getLookupRoute = getRouteLayer("/lookup", "get");
  const getAllRoute = getRouteLayer("/all", "get");
  const getDepartmentIdsRoute = getRouteLayer("/departmentids", "get");
  const getByIdRoute = getRouteLayer("/:id", "get");
  const putRoute = getRouteLayer("/:id", "put");
  const deleteRoute = getRouteLayer("/:id", "delete");

  assert.ok(postRoute, "POST /nhomkhoasothutu route must exist");
  assert.ok(getLookupRoute, "GET /nhomkhoasothutu/lookup route must exist");
  assert.ok(getAllRoute, "GET /nhomkhoasothutu/all route must exist");
  assert.ok(
    getDepartmentIdsRoute,
    "GET /nhomkhoasothutu/departmentids route must exist",
  );
  assert.ok(getByIdRoute, "GET /nhomkhoasothutu/:id route must exist");
  assert.ok(putRoute, "PUT /nhomkhoasothutu/:id route must exist");
  assert.ok(deleteRoute, "DELETE /nhomkhoasothutu/:id route must exist");

  assertAdminDaotaoOnly(getRouteHandles(postRoute), "POST /nhomkhoasothutu");
  assertAdminOnly(
    getRouteHandles(getLookupRoute),
    "GET /nhomkhoasothutu/lookup",
  );
  assertAdminDaotaoOnly(
    getRouteHandles(getAllRoute),
    "GET /nhomkhoasothutu/all",
  );
  assertAdminDaotaoOnly(
    getRouteHandles(getDepartmentIdsRoute),
    "GET /nhomkhoasothutu/departmentids",
  );
  assertAdminDaotaoOnly(
    getRouteHandles(getByIdRoute),
    "GET /nhomkhoasothutu/:id",
  );
  assertAdminDaotaoOnly(getRouteHandles(putRoute), "PUT /nhomkhoasothutu/:id");
  assertAdminDaotaoOnly(
    getRouteHandles(deleteRoute),
    "DELETE /nhomkhoasothutu/:id",
  );

  const regularUserError = await invokeMiddleware(
    authentication.adminDaotaoRequired,
    {
      user: { PhanQuyen: "nomal" },
    },
  );
  assert.ok(
    regularUserError instanceof AppError,
    "Regular non-privileged role must be rejected by adminDaotaoRequired",
  );
  assert.equal(regularUserError.statusCode, 403);
  assert.equal(regularUserError.message, "Admin or DaoTao required");

  const managerError = await invokeMiddleware(
    authentication.adminDaotaoRequired,
    {
      user: { PhanQuyen: "manager" },
    },
  );
  assert.ok(
    managerError instanceof AppError,
    "Manager role must still be rejected by adminDaotaoRequired",
  );
  assert.equal(managerError.statusCode, 403);
  assert.equal(managerError.message, "Admin or DaoTao required");

  const daotaoError = await invokeMiddleware(
    authentication.adminDaotaoRequired,
    {
      user: { PhanQuyen: "daotao" },
    },
  );
  assert.equal(
    daotaoError,
    undefined,
    "DaoTao role must pass adminDaotaoRequired",
  );

  const adminError = await invokeMiddleware(
    authentication.adminDaotaoRequired,
    {
      user: { PhanQuyen: "admin" },
    },
  );
  assert.equal(
    adminError,
    undefined,
    "Admin role must pass adminDaotaoRequired",
  );

  const superadminError = await invokeMiddleware(
    authentication.adminDaotaoRequired,
    {
      user: { PhanQuyen: "superadmin" },
    },
  );
  assert.equal(
    superadminError,
    undefined,
    "Superadmin role must pass adminDaotaoRequired",
  );

  console.log("NhomKhoaSoThuTu route guard smoke test passed.");
}

main().catch((error) => {
  console.error("NhomKhoaSoThuTu route guard smoke test failed.");
  console.error(error);
  process.exitCode = 1;
});
