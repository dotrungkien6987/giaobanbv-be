const { AppError, catchAsync } = require("../helpers/utils");
const { authenticateAccessToken } = require("../helpers/accessTokenAuth");

const User = require("../models/User");
// NhanVien references removed from loginRequired per request

const authentication = {};
const PASSWORD_CHANGE_REQUIRED_MESSAGE =
  "Ban can doi mat khau truoc khi tiep tuc su dung he thong.";
const ADMIN_DAOTAO_ROLES = ["admin", "superadmin", "daotao"];
const NHANVIEN_PRIVILEGED_ROLES = ["admin", "superadmin", "cntt", "daotao"];
const DOAN_HOPTAC_PRIVILEGED_ROLES = ["admin", "superadmin", "cntt", "daotao"];
const TAPSAN_ALLOWED_ROLES = [
  "admin",
  "superadmin",
  "daotao",
  "manager",
  "nomal",
  "noibo",
];

function getRequestPath(req) {
  return `${req.baseUrl || ""}${req.path || ""}`;
}

function canBypassPasswordChange(req) {
  const requestPath = getRequestPath(req);

  if (req.method === "GET") {
    return (
      requestPath === "/api/user/me" || requestPath === "/api/user/me/full"
    );
  }

  if (req.method === "PUT") {
    return requestPath === "/api/user/me/resetpass";
  }

  return false;
}

function normalizeRole(role) {
  return typeof role === "string" ? role.toLowerCase() : "";
}

function normalizeStringArray(values) {
  return Array.isArray(values)
    ? values.filter((value) => typeof value === "string")
    : [];
}

function buildRequestUser(user) {
  return {
    userId: user._id.toString(),
    UserName: user.UserName,
    Email: user.Email,
    PhanQuyen: user.PhanQuyen,
    NhanVienID: user.NhanVienID ? user.NhanVienID.toString() : null,
    KhoaID: user.KhoaID ? user.KhoaID.toString() : null,
    KhoaTaiChinh: normalizeStringArray(user.KhoaTaiChinh),
    mustChangePassword: Boolean(user.mustChangePassword),
  };
}

async function ensureRequestAuth(req, options = {}) {
  if (req.auth?.userId) {
    req.userId = req.auth.userId;
    return req.auth;
  }

  const authContext = await authenticateAccessToken(
    req.headers.authorization,
    options,
  );

  req.auth = authContext;
  req.userId = authContext.userId;
  return authContext;
}

async function getRoleFromRequest(req) {
  const requestRole = normalizeRole(req.user?.PhanQuyen);
  if (requestRole) {
    return requestRole;
  }

  await ensureRequestAuth(req);
  const user = await User.findById(req.userId).select("PhanQuyen").lean();
  return normalizeRole(user?.PhanQuyen);
}

function assertAllowedRole(role, allowedRoles, message) {
  if (allowedRoles.includes(role)) {
    return;
  }

  throw new AppError(403, message, "AUTHORIZATION_ERROR");
}

authentication.loginRequired = async (req, res, next) => {
  try {
    const authContext = await ensureRequestAuth(req);

    const user = await User.findById(authContext.userId)
      .select(
        "UserName Email PhanQuyen NhanVienID KhoaID KhoaTaiChinh mustChangePassword",
      )
      .lean();
    if (!user) {
      throw new AppError(401, "User không tồn tại", "Authentication Error");
    }

    req.user = buildRequestUser(user);

    if (user.mustChangePassword && !canBypassPasswordChange(req)) {
      throw new AppError(
        403,
        PASSWORD_CHANGE_REQUIRED_MESSAGE,
        "PASSWORD_CHANGE_REQUIRED",
      );
    }

    next();
  } catch (error) {
    next(error);
  }
};

authentication.logoutAllowed = async (req, res, next) => {
  try {
    await ensureRequestAuth(req, { allowRevoked: true });
    next();
  } catch (error) {
    next(error);
  }
};

authentication.adminRequired = catchAsync(async (req, res, next) => {
  const role = await getRoleFromRequest(req);
  assertAllowedRole(role, ["admin", "superadmin"], "Admin required");
  next();
});

authentication.adminDaotaoRequired = catchAsync(async (req, res, next) => {
  const role = await getRoleFromRequest(req);
  assertAllowedRole(role, ADMIN_DAOTAO_ROLES, "Admin or DaoTao required");
  next();
});

authentication.adminOrCnttRequired = catchAsync(async (req, res, next) => {
  const role = await getRoleFromRequest(req);
  assertAllowedRole(
    role,
    ["admin", "superadmin", "cntt"],
    "Admin or CNTT required",
  );
  next();
});

authentication.nhanVienPrivilegedRequired = catchAsync(
  async (req, res, next) => {
    const role = await getRoleFromRequest(req);
    assertAllowedRole(
      role,
      NHANVIEN_PRIVILEGED_ROLES,
      "Quyen quan tri nhan vien bi tu choi",
    );
    next();
  },
);

authentication.doanHopTacPrivilegedRequired = catchAsync(
  async (req, res, next) => {
    const role = await getRoleFromRequest(req);
    assertAllowedRole(
      role,
      DOAN_HOPTAC_PRIVILEGED_ROLES,
      "Ban khong co quyen truy cap chuc nang Doan ra/Doan vao",
    );
    next();
  },
);

authentication.tapSanAccessRequired = catchAsync(async (req, res, next) => {
  const role = await getRoleFromRequest(req);
  assertAllowedRole(
    role,
    TAPSAN_ALLOWED_ROLES,
    "Ban khong co quyen truy cap chuc nang TapSan",
  );
  next();
});

authentication.adminOrTongtrucRequired = catchAsync(async (req, res, next) => {
  const role = await getRoleFromRequest(req);
  assertAllowedRole(
    role,
    ["admin", "superadmin", "manager"],
    "Admin or Manager required",
  );
  next();
});

// Middleware for QLCL (Quality Control) - used for QuyTrinhISO module
authentication.qlclRequired = catchAsync(async (req, res, next) => {
  const role = await getRoleFromRequest(req);
  assertAllowedRole(
    role,
    ["qlcl", "admin", "superadmin"],
    "Chỉ người dùng QLCL mới có quyền thực hiện",
  );
  next();
});

module.exports = authentication;
