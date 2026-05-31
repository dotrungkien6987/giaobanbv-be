require("dotenv").config();
const assert = require("assert/strict");

const authentication = require("./middlewares/authentication");
const { AppError } = require("./helpers/utils");
const hoidongRouter = require("./routes/hoidong.api");

function getRouteLayer(path, method) {
  return hoidongRouter.stack.find(
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
  return hoidongRouter.stack.some(
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
  const putRoute = getRouteLayer("/", "put");
  const deleteRoute = getRouteLayer("/:hoidongID", "delete");

  assert.ok(getAllRoute, "GET /hoidong route must exist");
  assert.ok(postRoute, "POST /hoidong route must exist");
  assert.ok(putRoute, "PUT /hoidong route must exist");
  assert.ok(deleteRoute, "DELETE /hoidong/:hoidongID route must exist");

  assertAdminDaotaoOnly(getRouteHandles(getAllRoute, "get"), "GET /hoidong");
  assertAdminDaotaoOnly(getRouteHandles(postRoute, "post"), "POST /hoidong");
  assertAdminDaotaoOnly(getRouteHandles(putRoute, "put"), "PUT /hoidong");
  assertAdminDaotaoOnly(
    getRouteHandles(deleteRoute, "delete"),
    "DELETE /hoidong/:hoidongID",
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

  console.log("HoiDong route guard smoke test passed.");
}

main().catch((error) => {
  console.error("HoiDong route guard smoke test failed.");
  console.error(error);
  process.exitCode = 1;
});
