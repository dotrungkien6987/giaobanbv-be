require("dotenv").config();
const assert = require("assert/strict");

const authentication = require("./middlewares/authentication");
const { AppError } = require("./helpers/utils");
const datafixRouter = require("./routes/datafix.api");

function getRouteLayer(path, method) {
  return datafixRouter.stack.find(
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

async function main() {
  const getAllRoute = getRouteLayer("/getAll", "get");
  const insertOrUpdateRoute = getRouteLayer("/insertOrUpdate", "post");

  assert.ok(getAllRoute, "GET /datafix/getAll route must exist");
  assert.ok(
    insertOrUpdateRoute,
    "POST /datafix/insertOrUpdate route must exist",
  );

  const getHandles = getRouteHandles(getAllRoute);
  const postHandles = getRouteHandles(insertOrUpdateRoute);

  assert.equal(
    getHandles[0],
    authentication.loginRequired,
    "GET /datafix/getAll must stay behind loginRequired",
  );
  assert.ok(
    !getHandles.includes(authentication.adminRequired),
    "GET /datafix/getAll must not require adminRequired",
  );

  assert.equal(
    postHandles[0],
    authentication.loginRequired,
    "POST /datafix/insertOrUpdate must stay behind loginRequired",
  );
  assert.equal(
    postHandles[1],
    authentication.adminRequired,
    "POST /datafix/insertOrUpdate must require adminRequired",
  );

  const regularUserError = await invokeMiddleware(
    authentication.adminRequired,
    {
      user: { PhanQuyen: "nomal" },
    },
  );
  assert.ok(
    regularUserError instanceof AppError,
    "Regular non-admin role must be rejected by adminRequired",
  );
  assert.equal(regularUserError.statusCode, 403);
  assert.equal(regularUserError.message, "Admin required");

  const managerError = await invokeMiddleware(authentication.adminRequired, {
    user: { PhanQuyen: "manager" },
  });
  assert.ok(
    managerError instanceof AppError,
    "Manager role must still be rejected by adminRequired",
  );
  assert.equal(managerError.statusCode, 403);
  assert.equal(managerError.message, "Admin required");

  const adminError = await invokeMiddleware(authentication.adminRequired, {
    user: { PhanQuyen: "admin" },
  });
  assert.equal(adminError, undefined, "Admin role must pass adminRequired");

  const superadminError = await invokeMiddleware(authentication.adminRequired, {
    user: { PhanQuyen: "superadmin" },
  });
  assert.equal(
    superadminError,
    undefined,
    "Superadmin role must pass adminRequired",
  );

  console.log("DataFix route guard smoke test passed.");
}

main().catch((error) => {
  console.error("DataFix route guard smoke test failed.");
  console.error(error);
  process.exitCode = 1;
});
