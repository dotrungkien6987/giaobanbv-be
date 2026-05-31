const { catchAsync, sendResponse } = require("../helpers/utils");
const { revokeAuthContext } = require("../helpers/accessTokenAuth");
const User = require("../models/User");
const bcrypt = require("bcryptjs");

const authController = {};
const INVALID_LOGIN_INPUT_MESSAGE = "Thong tin dang nhap khong hop le";
const INVALID_CREDENTIALS_MESSAGE = "Ten dang nhap hoac mat khau khong dung";
const PASSWORD_CHANGE_REQUIRED_MESSAGE =
  "Ban can doi mat khau truoc khi tiep tuc su dung he thong.";
const DUMMY_PASSWORD_HASH = bcrypt.hashSync(
  "session-3-invalid-login-placeholder",
  10,
);
const DEFAULT_LOGIN_LOCKOUT_ATTEMPTS = 10;
const DEFAULT_LOGIN_LOCKOUT_MINUTES = 15;

const loginLockoutAttempts = Math.max(
  parseInt(process.env.LOGIN_LOCKOUT_ATTEMPTS || "", 10) ||
    DEFAULT_LOGIN_LOCKOUT_ATTEMPTS,
  1,
);

const loginLockoutMinutes = Math.max(
  parseInt(process.env.LOGIN_LOCKOUT_MINUTES || "", 10) ||
    DEFAULT_LOGIN_LOCKOUT_MINUTES,
  1,
);

function buildLockoutMessage(lockUntil) {
  const lockRemainingMs = Math.max(lockUntil.getTime() - Date.now(), 0);
  const lockRemainingMinutes = Math.max(
    1,
    Math.ceil(lockRemainingMs / (60 * 1000)),
  );

  return `Tai khoan tam thoi bi khoa. Vui long thu lai sau ${lockRemainingMinutes} phut hoac lien he quan tri vien.`;
}

authController.loginWithUserName = catchAsync(async (req, res, next) => {
  const { UserName, PassWord } = req.body;

  if (typeof UserName !== "string" || typeof PassWord !== "string") {
    return sendResponse(
      res,
      400,
      false,
      null,
      { message: INVALID_LOGIN_INPUT_MESSAGE },
      INVALID_LOGIN_INPUT_MESSAGE,
    );
  }

  const normalizedUserName = UserName.trim();

  if (!normalizedUserName || !PassWord.length) {
    return sendResponse(
      res,
      400,
      false,
      null,
      { message: INVALID_LOGIN_INPUT_MESSAGE },
      INVALID_LOGIN_INPUT_MESSAGE,
    );
  }

  const user = await User.findOne(
    { UserName: normalizedUserName },
    "+PassWord +failedLoginAttempts +lockUntil",
  ).populate("KhoaID");

  if (user?.lockUntil && user.lockUntil.getTime() > Date.now()) {
    const lockoutMessage = buildLockoutMessage(user.lockUntil);

    return sendResponse(
      res,
      423,
      false,
      null,
      { message: lockoutMessage },
      lockoutMessage,
    );
  }

  const passwordHash = user?.PassWord || DUMMY_PASSWORD_HASH;
  const isMatch = await bcrypt.compare(PassWord, passwordHash);

  if (!user || !isMatch) {
    if (user) {
      user.failedLoginAttempts = (user.failedLoginAttempts || 0) + 1;

      if (user.failedLoginAttempts >= loginLockoutAttempts) {
        user.lockUntil = new Date(Date.now() + loginLockoutMinutes * 60 * 1000);
      }

      await user.save();

      if (user.lockUntil && user.lockUntil.getTime() > Date.now()) {
        const lockoutMessage = buildLockoutMessage(user.lockUntil);

        return sendResponse(
          res,
          423,
          false,
          null,
          { message: lockoutMessage },
          lockoutMessage,
        );
      }
    }

    return sendResponse(
      res,
      401,
      false,
      null,
      { message: INVALID_CREDENTIALS_MESSAGE },
      INVALID_CREDENTIALS_MESSAGE,
    );
  }

  if (user.failedLoginAttempts || user.lockUntil) {
    user.failedLoginAttempts = 0;
    user.lockUntil = null;
    await user.save();
  }

  const accessToken = await user.generateToken();
  return sendResponse(
    res,
    200,
    true,
    {
      user: {
        ...user.toJSON(),
        mustChangePassword: Boolean(user.mustChangePassword),
      },
      accessToken,
      mustChangePassword: Boolean(user.mustChangePassword),
      message: user.mustChangePassword
        ? PASSWORD_CHANGE_REQUIRED_MESSAGE
        : null,
    },
    null,
    "Login success",
  );
});

authController.logout = catchAsync(async (req, res) => {
  const revokeResult = await revokeAuthContext(req.auth, {
    userId: req.userId,
    reason: "logout",
  });

  let disconnectedSockets = 0;
  const socketService = req.app?.get("socketService");

  if (
    socketService &&
    typeof socketService.disconnectByAuthJti === "function" &&
    req.auth?.jti
  ) {
    disconnectedSockets = await socketService.disconnectByAuthJti(req.auth.jti);
  }

  return sendResponse(
    res,
    200,
    true,
    {
      revoked: revokeResult.revoked,
      alreadyRevoked: revokeResult.alreadyRevoked,
      legacyToken: req.auth?.isLegacyToken || false,
      disconnectedSockets,
    },
    null,
    "Logout success",
  );
});

module.exports = authController;
