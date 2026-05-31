require("dotenv").config();
const assert = require("assert/strict");

const authentication = require("./middlewares/authentication");
const { AppError } = require("./helpers/utils");
const logeventRouter = require("./routes/his/logevent.api");

function getRouteLayer(path, method) {
  return logeventRouter.stack.find(
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

async function main() {
  const getRoute = getRouteLayer("/", "get");
  const postRoute = getRouteLayer("/", "post");
  const putRoute = getRouteLayer("/:logeventid", "put");
  const patchRoute = getRouteLayer("/:logeventid", "patch");

  assert.ok(getRoute, "GET /logevent route must exist");
  assert.ok(postRoute, "POST /logevent route must exist");
  assert.ok(putRoute, "PUT /logevent/:logeventid route must exist");
  assert.ok(patchRoute, "PATCH /logevent/:logeventid route must exist");

  assertAdminOnly(getRouteHandles(getRoute), "GET /logevent");
  assertAdminOnly(getRouteHandles(postRoute), "POST /logevent");
  assertAdminOnly(getRouteHandles(putRoute), "PUT /logevent/:logeventid");
  assertAdminOnly(getRouteHandles(patchRoute), "PATCH /logevent/:logeventid");

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

  console.log("Logevent route guard smoke test passed.");
}

main().catch((error) => {
  console.error("Logevent route guard smoke test failed.");
  console.error(error);
  process.exitCode = 1;
});
