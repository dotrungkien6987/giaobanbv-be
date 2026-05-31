require("dotenv").config();
const jwt = require("jsonwebtoken");

const API_BASE = (
  process.env.UAT_BASE_URL ||
  process.env.BASE_URL ||
  `http://localhost:${process.env.PORT || 8020}/api`
).replace(/\/$/, "");

const TEST_USER = {
  UserName: process.env.TEST_USERNAME || "admin",
  PassWord: process.env.TEST_PASSWORD || "123456",
};

const FALLBACK_PROTECTED_PATH = process.env.AUTH_REVOKE_FALLBACK_PATH || null;

const colors = {
  reset: "\x1b[0m",
  green: "\x1b[32m",
  red: "\x1b[31m",
  yellow: "\x1b[33m",
  blue: "\x1b[34m",
  cyan: "\x1b[36m",
};

const log = {
  success: (message) =>
    console.log(`${colors.green}✓${colors.reset} ${message}`),
  error: (message) => console.log(`${colors.red}✗${colors.reset} ${message}`),
  warn: (message) => console.log(`${colors.yellow}⚠${colors.reset} ${message}`),
  info: (message) => console.log(`${colors.blue}ℹ${colors.reset} ${message}`),
  section: (message) =>
    console.log(
      `\n${colors.cyan}${"=".repeat(60)}${colors.reset}\n${colors.cyan}${message}${colors.reset}\n${colors.cyan}${"=".repeat(60)}${colors.reset}`,
    ),
};

function ensure(condition, message) {
  if (!condition) {
    throw new Error(message);
  }
}

async function requestJson(path, { method = "GET", token, body } = {}) {
  const response = await fetch(`${API_BASE}${path}`, {
    method,
    headers: {
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
      ...(body ? { "Content-Type": "application/json" } : {}),
    },
    body: body ? JSON.stringify(body) : undefined,
  });

  const text = await response.text();
  let json = null;

  try {
    json = text ? JSON.parse(text) : null;
  } catch {
    json = null;
  }

  return { status: response.status, ok: response.ok, json, text };
}

function getMessage(response) {
  return (
    response.json?.errors?.message ||
    response.json?.message ||
    response.text ||
    "Unknown error"
  );
}

async function loginAndGetToken() {
  const response = await requestJson("/auth/login", {
    method: "POST",
    body: TEST_USER,
  });

  ensure(response.ok, `Login failed: ${getMessage(response)}`);

  const accessToken = response.json?.data?.accessToken;
  ensure(accessToken, "Login response did not include accessToken");

  return accessToken;
}

async function expectStatus(path, expectedStatus, options, message) {
  const response = await requestJson(path, options);
  ensure(
    response.status === expectedStatus,
    `${message}. Expected ${expectedStatus}, received ${response.status}: ${getMessage(response)}`,
  );
  return response;
}

async function run() {
  log.section("AUTH LOGOUT REVOCATION TEST");
  log.info(`API base: ${API_BASE}`);

  const tokenA = await loginAndGetToken();
  const decodedA = jwt.decode(tokenA) || {};
  ensure(decodedA.jti, "New token is missing jti claim");
  log.success(`Login #1 returned token with jti ${decodedA.jti}`);

  await expectStatus(
    "/user/me",
    200,
    { token: tokenA },
    "Token A should access /user/me before logout",
  );
  log.success("Token A can access /user/me before logout");

  const logoutA = await expectStatus(
    "/auth/logout",
    200,
    { method: "POST", token: tokenA },
    "Logout should succeed for token A",
  );
  log.success(
    `Logout completed (revoked=${logoutA.json?.data?.revoked}, legacyToken=${logoutA.json?.data?.legacyToken})`,
  );

  await expectStatus(
    "/user/me",
    401,
    { token: tokenA },
    "Token A should be rejected after logout",
  );
  log.success("Token A is rejected after logout");

  const tokenB = await loginAndGetToken();
  const decodedB = jwt.decode(tokenB) || {};
  ensure(
    decodedB.jti && decodedB.jti !== decodedA.jti,
    "Second login should issue a new jti",
  );
  log.success(`Login #2 returned token with new jti ${decodedB.jti}`);

  await expectStatus(
    "/user/me",
    200,
    { token: tokenB },
    "Token B should access /user/me after token A logout",
  );
  log.success("Token B works independently from token A revocation");

  if (FALLBACK_PROTECTED_PATH) {
    const beforeLogout = await requestJson(FALLBACK_PROTECTED_PATH, {
      token: tokenB,
    });

    if (beforeLogout.status === 200) {
      log.success(
        `Fallback route ${FALLBACK_PROTECTED_PATH} is accessible before logout`,
      );

      await expectStatus(
        "/auth/logout",
        200,
        { method: "POST", token: tokenB },
        "Logout should succeed for token B",
      );

      await expectStatus(
        FALLBACK_PROTECTED_PATH,
        401,
        { token: tokenB },
        `Revoked token should be rejected by fallback route ${FALLBACK_PROTECTED_PATH}`,
      );
      log.success(
        `Fallback route ${FALLBACK_PROTECTED_PATH} rejects revoked token`,
      );
    } else {
      log.warn(
        `Skipping fallback route assertion for ${FALLBACK_PROTECTED_PATH}: initial status ${beforeLogout.status}`,
      );
    }
  } else {
    log.info(
      "No AUTH_REVOKE_FALLBACK_PATH provided, skipping fallback-route check",
    );
  }

  log.section("RESULT");
  log.success("Focused logout revocation checks passed");
}

run().catch((error) => {
  log.section("RESULT");
  log.error(error.message || String(error));
  process.exitCode = 1;
});
