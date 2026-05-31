require("dotenv").config();
const assert = require("assert/strict");

const authentication = require("./middlewares/authentication");
const { AppError } = require("./helpers/utils");
const loaiChuyenMonRouter = require("./routes/loaichuyenmon.api");

function getRouteLayer(path, method) {
  return loaiChuyenMonRouter.stack.find(
    (layer) =>
      layer.route &&
      layer.route.path === path &&
      Boolean(layer.route.methods?.[method]),
  );
}

function getRouteHandles(layer, method) {
  return layer.route.stack
    .filter((stackLayer) => stackLayer.method === method)
    .map((stackLayer) => stackLayer.handle);
}

function hasGlobalLoginRequired() {
  return loaiChuyenMonRouter.stack.some(
    (layer) => !layer.route && layer.handle === authentication.loginRequired,
  );
}

async function invokeMiddleware(middleware, req) {
  return await new Promise((resolve, reject) => {
    Promise.resolve(middleware(req, {}, (error) => resolve(error))).catch(
      reject,
    );
  });
}

function assertLoginOnly(handles, label) {
  assert.ok(
    hasGlobalLoginRequired(),
    `${label} must stay behind global loginRequired`,
  );
  assert.ok(
    !handles.includes(authentication.adminRequired),
    `${label} must not require adminRequired`,
  );
}

function assertAdminDaotaoOnly(handles, label) {
  assert.equal(
    handles[0],
    authentication.adminDaotaoRequired,
    `${label} must require adminDaotaoRequired`,
  );
  assert.ok(
    hasGlobalLoginRequired(),
    `${label} must stay behind global loginRequired`,
  );
}

async function main() {
  const getAllRoute = getRouteLayer("/", "get");
  const postRoute = getRouteLayer("/", "post");
  const getByIdRoute = getRouteLayer("/:id", "get");
  const putRoute = getRouteLayer("/:id", "put");
  const deleteRoute = getRouteLayer("/:id", "delete");

  assert.ok(getAllRoute, "GET /loaichuyenmon route must exist");
  assert.ok(postRoute, "POST /loaichuyenmon route must exist");
  assert.ok(getByIdRoute, "GET /loaichuyenmon/:id route must exist");
  assert.ok(putRoute, "PUT /loaichuyenmon/:id route must exist");
  assert.ok(deleteRoute, "DELETE /loaichuyenmon/:id route must exist");

  assertLoginOnly(getRouteHandles(getAllRoute, "get"), "GET /loaichuyenmon");
  assertAdminDaotaoOnly(
    getRouteHandles(postRoute, "post"),
    "POST /loaichuyenmon",
  );
  assertLoginOnly(
    getRouteHandles(getByIdRoute, "get"),
    "GET /loaichuyenmon/:id",
  );
  assertAdminDaotaoOnly(
    getRouteHandles(putRoute, "put"),
    "PUT /loaichuyenmon/:id",
  );
  assertAdminDaotaoOnly(
    getRouteHandles(deleteRoute, "delete"),
    "DELETE /loaichuyenmon/:id",
  );

  const regularUserError = await invokeMiddleware(
    authentication.adminDaotaoRequired,
    {
      user: { PhanQuyen: "nomal" },
    },
  );
  assert.ok(
    regularUserError instanceof AppError,
    "Regular role must be rejected by adminDaotaoRequired",
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
    "Manager role must be rejected by adminDaotaoRequired",
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

  console.log("LoaiChuyenMon route guard smoke test passed.");
}

main().catch((error) => {
  console.error("LoaiChuyenMon route guard smoke test failed.");
  console.error(error);
  process.exitCode = 1;
});
