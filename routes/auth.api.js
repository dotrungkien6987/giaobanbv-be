var express = require("express");
var router = express.Router();
const rateLimit = require("express-rate-limit");
const authController = require("../controllers/auth.controller");
const authentication = require("../middlewares/authentication");
const { body, validationResult } = require("express-validator");
const { sendResponse } = require("../helpers/utils");

const INVALID_LOGIN_INPUT_MESSAGE = "Thong tin dang nhap khong hop le";
const TOO_MANY_LOGIN_ATTEMPTS_MESSAGE =
  "Qua nhieu lan thu dang nhap. Vui long thu lai sau.";
const DEFAULT_LOGIN_RATE_LIMIT_WINDOW_MS = 60 * 1000;
const DEFAULT_LOGIN_RATE_LIMIT_MAX = 5;

const loginRateLimitWindowMs = Math.max(
  parseInt(process.env.LOGIN_RATE_LIMIT_WINDOW_MS || "", 10) ||
    DEFAULT_LOGIN_RATE_LIMIT_WINDOW_MS,
  1000,
);

const loginRateLimitMax = Math.max(
  parseInt(process.env.LOGIN_RATE_LIMIT_MAX || "", 10) ||
    DEFAULT_LOGIN_RATE_LIMIT_MAX,
  1,
);

const loginValidation = [
  body("UserName")
    .exists({ values: "falsy" })
    .withMessage(INVALID_LOGIN_INPUT_MESSAGE)
    .bail()
    .isString()
    .withMessage(INVALID_LOGIN_INPUT_MESSAGE)
    .bail()
    .trim()
    .isLength({ min: 1, max: 100 })
    .withMessage(INVALID_LOGIN_INPUT_MESSAGE),
  body("PassWord")
    .exists({ values: "falsy" })
    .withMessage(INVALID_LOGIN_INPUT_MESSAGE)
    .bail()
    .isString()
    .withMessage(INVALID_LOGIN_INPUT_MESSAGE)
    .bail()
    .isLength({ min: 1, max: 255 })
    .withMessage(INVALID_LOGIN_INPUT_MESSAGE),
];

function normalizeLoginIdentifier(value) {
  return typeof value === "string" ? value.trim().toLowerCase() : "";
}

async function validateLoginRequest(req, res, next) {
  await Promise.all(loginValidation.map((validation) => validation.run(req)));

  const errors = validationResult(req);

  if (errors.isEmpty()) {
    return next();
  }

  return sendResponse(
    res,
    400,
    false,
    null,
    { message: INVALID_LOGIN_INPUT_MESSAGE },
    INVALID_LOGIN_INPUT_MESSAGE,
  );
}

const loginLimiter = rateLimit({
  windowMs: loginRateLimitWindowMs,
  max: loginRateLimitMax,
  skipSuccessfulRequests: true,
  standardHeaders: true,
  legacyHeaders: false,
  keyGenerator: (req) => {
    const ipKey = rateLimit.ipKeyGenerator(req.ip || "");
    const userNameKey =
      normalizeLoginIdentifier(req.body?.UserName) || "unknown-user";
    return `${userNameKey}:${ipKey}`;
  },
  handler: (req, res) =>
    sendResponse(
      res,
      429,
      false,
      null,
      { message: TOO_MANY_LOGIN_ATTEMPTS_MESSAGE },
      TOO_MANY_LOGIN_ATTEMPTS_MESSAGE,
    ),
});

/**
 * @route POST /auth/login  Login with username and password
 * @description  Login with username and password
 * @body {UserName,PassWord}
 * @access Public
 */
router.post(
  "/login",
  loginLimiter,
  validateLoginRequest,
  authController.loginWithUserName,
);

router.post("/logout", authentication.logoutAllowed, authController.logout);

module.exports = router;
