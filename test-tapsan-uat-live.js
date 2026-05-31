require("dotenv").config();
const mongoose = require("mongoose");
const jwt = require("jsonwebtoken");

const User = require("./models/User");
const TapSan = require("./models/TapSan");
const TapSanBaiBao = require("./models/TapSanBaiBao");

const BASE_URL =
  process.env.UAT_BASE_URL ||
  `http://localhost:${process.env.PORT || 8000}/api`;
const ALLOWED_ROLES = [
  "admin",
  "superadmin",
  "daotao",
  "manager",
  "nomal",
  "noibo",
];
const BLOCKED_ROLES = ["cntt", "qlcl"];
const TEMP_USER_PREFIX = "uat-tapsan-temp";

function signToken(userId) {
  return jwt.sign({ _id: String(userId) }, process.env.JWT_SECRET_KEY, {
    expiresIn: "1d",
  });
}

async function requestJson(path, { method = "GET", token, body } = {}) {
  const response = await fetch(`${BASE_URL}${path}`, {
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
  } catch (error) {
    json = null;
  }

  return { status: response.status, ok: response.ok, json, text };
}

function ensure(condition, message) {
  if (!condition) {
    throw new Error(message);
  }
}

function getErrorMessage(response) {
  return (
    response.json?.errors?.message ||
    response.json?.message ||
    response.text ||
    "Unknown error"
  );
}

function getItems(response) {
  return response.json?.data?.items || [];
}

function getTotal(response) {
  return response.json?.data?.total ?? response.json?.data?.pagination?.total;
}

function pickFirstUserByRole(users, roles) {
  const selected = new Map();
  for (const role of roles) {
    const match = users.find(
      (user) => String(user.PhanQuyen || "").toLowerCase() === role,
    );
    if (match) {
      selected.set(role, match);
    }
  }
  return selected;
}

function createTempUserDoc(role, khoaId) {
  const now = new Date();
  const stamp = `${now.getTime()}-${Math.floor(Math.random() * 10000)}`;
  return {
    _id: new mongoose.Types.ObjectId(),
    UserName: `${TEMP_USER_PREFIX}-${role}-${stamp}`,
    PassWord: `temp-${role}`,
    KhoaID: khoaId,
    HoTen: `UAT TapSan ${role}`,
    UserHis: "",
    isDeleted: false,
    failedLoginAttempts: 0,
    lockUntil: null,
    mustChangePassword: false,
    Email: "",
    PhanQuyen: role,
    KhoaTaiChinh: [],
    DashBoard: [],
    KhoaLichTruc: [],
    createdAt: now,
    updatedAt: now,
  };
}

async function ensureAllowedUsers(users) {
  const allowedUsers = pickFirstUserByRole(users, ALLOWED_ROLES);
  const cleanupUserIds = [];
  const provisionedUsers = [];

  const fallbackUser =
    users.find((user) => user.KhoaID) ||
    (await User.findOne({ KhoaID: { $ne: null } })
      .select("KhoaID")
      .lean());

  ensure(
    fallbackUser?.KhoaID,
    "Khong tim thay KhoaID hop le de tao persona tam cho TapSan.",
  );

  const missingAllowedRoles = ALLOWED_ROLES.filter(
    (role) => !allowedUsers.has(role),
  );

  for (const role of missingAllowedRoles) {
    const tempDoc = createTempUserDoc(role, fallbackUser.KhoaID);
    await User.collection.insertOne(tempDoc);
    const tempUser = {
      _id: tempDoc._id,
      UserName: tempDoc.UserName,
      PhanQuyen: tempDoc.PhanQuyen,
      KhoaID: tempDoc.KhoaID,
      __provisioned: true,
    };
    allowedUsers.set(role, tempUser);
    cleanupUserIds.push(tempDoc._id);
    provisionedUsers.push(tempUser);
  }

  return { allowedUsers, cleanupUserIds, provisionedUsers };
}

async function loadScenario() {
  const users = await User.find({
    PhanQuyen: { $in: [...ALLOWED_ROLES, ...BLOCKED_ROLES] },
    mustChangePassword: { $ne: true },
  })
    .select("UserName PhanQuyen KhoaID")
    .lean();

  const { allowedUsers, cleanupUserIds, provisionedUsers } =
    await ensureAllowedUsers(users);
  const blockedUsers = pickFirstUserByRole(users, BLOCKED_ROLES);

  ensure(
    allowedUsers.size > 0,
    "Khong tim thay user thuoc nhom role duoc phep TapSan.",
  );
  ensure(
    blockedUsers.size > 0,
    "Khong tim thay user thuoc nhom role bi chan TapSan.",
  );

  let baiBao = await TapSanBaiBao.findOne({ isDeleted: { $ne: true } })
    .select("_id TapSanId TieuDe MaBaiBao")
    .sort({ NgayTao: -1 })
    .lean();

  let tapSan = null;
  if (baiBao?.TapSanId) {
    tapSan = await TapSan.findById(baiBao.TapSanId)
      .select("_id Loai NamXuatBan SoXuatBan TrangThai")
      .lean();
  }

  if (!tapSan) {
    tapSan = await TapSan.findOne({ isDeleted: false })
      .select("_id Loai NamXuatBan SoXuatBan TrangThai")
      .sort({ createdAt: -1 })
      .lean();
  }

  ensure(tapSan, "Khong tim thay TapSan hop le trong DB de probe runtime.");

  if (!baiBao) {
    baiBao = await TapSanBaiBao.findOne({
      TapSanId: tapSan._id,
      isDeleted: { $ne: true },
    })
      .select("_id TapSanId TieuDe MaBaiBao")
      .sort({ NgayTao: -1 })
      .lean();
  }

  return {
    allowedUsers,
    blockedUsers,
    tapSan,
    baiBao,
    cleanupUserIds,
    provisionedUsers,
  };
}

async function main() {
  await mongoose.connect(process.env.MONGODB_URI);
  const scenario = await loadScenario();

  const selectedUsers = [
    ...scenario.allowedUsers.entries(),
    ...scenario.blockedUsers.entries(),
  ].map(([role, user]) => ({
    role,
    UserName: user.UserName,
    KhoaID: user.KhoaID ? String(user.KhoaID) : null,
    provisioned: Boolean(user.__provisioned),
  }));

  console.log("TapSan live runtime probe");
  console.log(`Base URL: ${BASE_URL}`);
  console.log("Selected users:");
  console.table(selectedUsers);
  if (scenario.provisionedUsers.length > 0) {
    console.log(
      "Provisioned temporary users for missing roles:",
      scenario.provisionedUsers.map((user) => ({
        role: user.PhanQuyen,
        UserName: user.UserName,
      })),
    );
  }
  console.log("TapSan scenario:", {
    tapSanId: String(scenario.tapSan._id),
    loai: scenario.tapSan.Loai,
    namXuatBan: scenario.tapSan.NamXuatBan,
    soXuatBan: scenario.tapSan.SoXuatBan,
    trangThai: scenario.tapSan.TrangThai,
    baiBaoId: scenario.baiBao?._id ? String(scenario.baiBao._id) : null,
    maBaiBao: scenario.baiBao?.MaBaiBao || null,
  });

  const results = [];
  const runCase = async (name, fn) => {
    try {
      const detail = await fn();
      results.push({ name, status: "PASS", ...detail });
    } catch (error) {
      results.push({ name, status: "FAIL", detail: error.message });
    }
  };
  const skipCase = (name, detail) => {
    results.push({ name, status: "SKIP", detail });
  };

  const allowedChecks = [
    {
      label: "GET /tapsan",
      path: "/tapsan?size=500",
      validate: (res) => {
        ensure(res.status === 200, `Expected 200, got ${res.status}`);
        const items = getItems(res);
        ensure(
          Array.isArray(items),
          "List response does not contain items array.",
        );
        ensure(items.length > 0, "TapSan list returned no items.");
        ensure(
          items.some(
            (item) => String(item._id) === String(scenario.tapSan._id),
          ),
          "Expected probe TapSan to appear in list response.",
        );
        return { httpStatus: res.status, count: items.length };
      },
    },
    {
      label: "GET /tapsan/:id",
      path: `/tapsan/${scenario.tapSan._id}`,
      validate: (res) => {
        ensure(res.status === 200, `Expected 200, got ${res.status}`);
        ensure(
          String(res.json?.data?._id) === String(scenario.tapSan._id),
          "TapSan detail returned unexpected id.",
        );
        return {
          httpStatus: res.status,
          tapSanId: String(scenario.tapSan._id),
        };
      },
    },
    {
      label: "GET /tapsan/:tapSanId/baibao",
      path: `/tapsan/${scenario.tapSan._id}/baibao?limit=50`,
      validate: (res) => {
        ensure(res.status === 200, `Expected 200, got ${res.status}`);
        const items = getItems(res);
        ensure(
          Array.isArray(items),
          "BaiBao list response does not contain items array.",
        );
        if (scenario.baiBao?._id) {
          ensure(
            items.some(
              (item) => String(item._id) === String(scenario.baiBao._id),
            ),
            "Expected probe BaiBao to appear in TapSan BaiBao list response.",
          );
        }
        return {
          httpStatus: res.status,
          total: getTotal(res),
          baiBaoCount: items.length,
        };
      },
    },
    {
      label: "GET /tapsan/nhanvien-options",
      path: "/tapsan/nhanvien-options?limit=10",
      validate: (res) => {
        ensure(res.status === 200, `Expected 200, got ${res.status}`);
        const items = getItems(res);
        ensure(
          Array.isArray(items),
          "NhanVien options response does not contain items array.",
        );
        return { httpStatus: res.status, count: items.length };
      },
    },
    {
      label: "GET /attachments/TapSan/:id/kehoach/files",
      path: `/attachments/TapSan/${scenario.tapSan._id}/kehoach/files?page=1&size=10`,
      validate: (res) => {
        ensure(res.status === 200, `Expected 200, got ${res.status}`);
        return { httpStatus: res.status };
      },
    },
    {
      label: "GET /attachments/TapSan/:id/file/files",
      path: `/attachments/TapSan/${scenario.tapSan._id}/file/files?page=1&size=10`,
      validate: (res) => {
        ensure(res.status === 200, `Expected 200, got ${res.status}`);
        return { httpStatus: res.status };
      },
    },
  ];

  if (scenario.baiBao?._id) {
    allowedChecks.push(
      {
        label: "GET /tapsan/baibao/:id",
        path: `/tapsan/baibao/${scenario.baiBao._id}`,
        validate: (res) => {
          ensure(res.status === 200, `Expected 200, got ${res.status}`);
          ensure(
            String(res.json?.data?._id) === String(scenario.baiBao._id),
            "BaiBao detail returned unexpected id.",
          );
          return {
            httpStatus: res.status,
            baiBaoId: String(scenario.baiBao._id),
          };
        },
      },
      {
        label: "GET /attachments/TapSanBaiBao/:id/file/files",
        path: `/attachments/TapSanBaiBao/${scenario.baiBao._id}/file/files?page=1&size=10`,
        validate: (res) => {
          ensure(res.status === 200, `Expected 200, got ${res.status}`);
          return { httpStatus: res.status };
        },
      },
    );
  } else {
    skipCase(
      "GET /tapsan/baibao/:id",
      "Khong tim thay BaiBao de test detail va attachment ownerType TapSanBaiBao.",
    );
    skipCase(
      "GET /attachments/TapSanBaiBao/:id/file/files",
      "Khong tim thay BaiBao de test attachment ownerType TapSanBaiBao.",
    );
  }

  for (const [role, user] of scenario.allowedUsers.entries()) {
    const token = signToken(user._id);
    for (const check of allowedChecks) {
      await runCase(`[ALLOW ${role}] ${check.label}`, async () => {
        const res = await requestJson(check.path, { token });
        return {
          role,
          userName: user.UserName,
          ...(check.validate(res) || {}),
        };
      });
    }
  }

  const blockedChecks = [
    { label: "GET /tapsan", path: "/tapsan?size=20" },
    { label: "GET /tapsan/:id", path: `/tapsan/${scenario.tapSan._id}` },
    {
      label: "GET /tapsan/:tapSanId/baibao",
      path: `/tapsan/${scenario.tapSan._id}/baibao?limit=20`,
    },
    {
      label: "GET /tapsan/nhanvien-options",
      path: "/tapsan/nhanvien-options?limit=5",
    },
    {
      label: "GET /attachments/TapSan/:id/kehoach/files",
      path: `/attachments/TapSan/${scenario.tapSan._id}/kehoach/files?page=1&size=10`,
    },
    {
      label: "GET /attachments/TapSan/:id/file/files",
      path: `/attachments/TapSan/${scenario.tapSan._id}/file/files?page=1&size=10`,
    },
  ];
  if (scenario.baiBao?._id) {
    blockedChecks.push(
      {
        label: "GET /tapsan/baibao/:id",
        path: `/tapsan/baibao/${scenario.baiBao._id}`,
      },
      {
        label: "GET /attachments/TapSanBaiBao/:id/file/files",
        path: `/attachments/TapSanBaiBao/${scenario.baiBao._id}/file/files?page=1&size=10`,
      },
    );
  }

  for (const [role, user] of scenario.blockedUsers.entries()) {
    const token = signToken(user._id);
    for (const check of blockedChecks) {
      await runCase(`[BLOCK ${role}] ${check.label}`, async () => {
        const res = await requestJson(check.path, { token });
        ensure(res.status === 403, `Expected 403, got ${res.status}`);
        return {
          role,
          userName: user.UserName,
          httpStatus: res.status,
          message: getErrorMessage(res),
        };
      });
    }
  }

  const failed = results.filter((item) => item.status === "FAIL");
  console.table(results);

  if (failed.length > 0) {
    console.error("TapSan runtime probe failed:");
    console.table(failed);
    process.exitCode = 1;
    return;
  }

  console.log("TapSan runtime probe passed.");
}

main()
  .catch((error) => {
    console.error(error);
    process.exitCode = 1;
  })
  .finally(async () => {
    try {
      const tempUsers = await User.find({
        UserName: { $regex: `^${TEMP_USER_PREFIX}-` },
      })
        .select("_id")
        .lean();
      if (tempUsers.length > 0) {
        await User.deleteMany({
          _id: { $in: tempUsers.map((user) => user._id) },
        });
      }
    } catch (error) {
      console.error("Failed to clean up temporary TapSan UAT users:", error);
      process.exitCode = 1;
    }
    await mongoose.disconnect();
  });
