require("dotenv").config();
const fs = require("fs-extra");
const mongoose = require("mongoose");
const jwt = require("jsonwebtoken");

const User = require("./models/User");
const DoanRa = require("./models/DoanRa");
const DoanVao = require("./models/DoanVao");
const TepTin = require("./modules/workmanagement/models/TepTin");
const uploadConfig = require("./modules/workmanagement/helpers/uploadConfig");

const BASE_URL =
  process.env.UAT_BASE_URL ||
  `http://localhost:${process.env.PORT || 8000}/api`;
const ALLOWED_ROLES = ["admin", "superadmin", "cntt", "daotao"];
const BLOCKED_ROLES = ["manager", "nomal", "noibo", "qlcl"];
const TEMP_USER_PREFIX = "uat-doanhoptac-temp";

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
  } catch {
    json = null;
  }

  return { status: response.status, ok: response.ok, json, text };
}

async function requestBinary(path, { token } = {}) {
  const response = await fetch(`${BASE_URL}${path}`, {
    method: "GET",
    headers: {
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    },
  });

  const headers = {
    contentType: response.headers.get("content-type") || "",
    contentDisposition: response.headers.get("content-disposition") || "",
  };

  if (response.ok) {
    await response.arrayBuffer();
    return { status: response.status, ok: true, headers };
  }

  const text = await response.text();
  let json = null;
  try {
    json = text ? JSON.parse(text) : null;
  } catch {
    json = null;
  }

  return { status: response.status, ok: false, headers, json, text };
}

function ensure(condition, message) {
  if (!condition) {
    throw new Error(message);
  }
}

function getItems(response) {
  return response.json?.data?.items || [];
}

function getErrorMessage(response) {
  return (
    response.json?.errors?.message ||
    response.json?.error?.message ||
    response.json?.message ||
    response.text ||
    "Unknown error"
  );
}

function createTempUserDoc(role, khoaId) {
  const now = new Date();
  const stamp = `${now.getTime()}-${Math.floor(Math.random() * 10000)}`;
  return {
    _id: new mongoose.Types.ObjectId(),
    UserName: `${TEMP_USER_PREFIX}-${role}-${stamp}`,
    PassWord: `temp-${role}`,
    KhoaID: khoaId,
    HoTen: `UAT DoanHopTac ${role}`,
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

async function ensureRoleUsers(existingUsers, roles, fallbackKhoaId) {
  const selected = new Map();
  const cleanupUserIds = [];
  const provisionedUsers = [];

  for (const role of roles) {
    const existing = existingUsers.find(
      (user) => String(user.PhanQuyen || "").toLowerCase() === role,
    );
    if (existing) {
      selected.set(role, existing);
      continue;
    }

    const tempDoc = createTempUserDoc(role, fallbackKhoaId);
    await User.collection.insertOne(tempDoc);
    const tempUser = {
      _id: tempDoc._id,
      UserName: tempDoc.UserName,
      PhanQuyen: tempDoc.PhanQuyen,
      KhoaID: tempDoc.KhoaID,
      __provisioned: true,
    };
    selected.set(role, tempUser);
    cleanupUserIds.push(tempDoc._id);
    provisionedUsers.push(tempUser);
  }

  return { selected, cleanupUserIds, provisionedUsers };
}

async function resolveAttachmentScenario(ownerType, Model) {
  const ownerDoc = await Model.findOne({ isDeleted: false })
    .select("_id")
    .sort({ createdAt: -1 })
    .lean();

  const fileDocs = await TepTin.find({
    OwnerType: ownerType,
    TrangThai: "ACTIVE",
  })
    .select("_id OwnerID OwnerField TenGoc DuongDan")
    .sort({ NgayTaiLen: -1 })
    .limit(50)
    .lean();

  let streamDoc = null;
  for (const doc of fileDocs) {
    try {
      const absPath = uploadConfig.toAbs(doc.DuongDan);
      if (await fs.pathExists(absPath)) {
        streamDoc = doc;
        break;
      }
    } catch {
      // Ignore invalid/missing paths and keep looking for a better candidate.
    }
  }

  const primaryFile = streamDoc || fileDocs[0] || null;
  const ownerId = primaryFile?.OwnerID || ownerDoc?._id?.toString() || null;

  ensure(ownerId, `Khong tim thay owner hop le cho ${ownerType}.`);

  return {
    ownerType,
    ownerId: String(ownerId),
    field: primaryFile?.OwnerField || "file",
    fileDoc: primaryFile,
    streamSupported: Boolean(streamDoc),
  };
}

async function loadScenario() {
  const users = await User.find({
    PhanQuyen: { $in: [...ALLOWED_ROLES, ...BLOCKED_ROLES] },
    mustChangePassword: { $ne: true },
  })
    .select("UserName PhanQuyen KhoaID")
    .lean();

  const fallbackUser =
    users.find((user) => user.KhoaID) ||
    (await User.findOne({ KhoaID: { $ne: null } })
      .select("KhoaID")
      .lean());

  ensure(
    fallbackUser?.KhoaID,
    "Khong tim thay KhoaID hop le de tao persona tam cho probe DoanHopTac.",
  );

  const allowedPack = await ensureRoleUsers(
    users,
    ALLOWED_ROLES,
    fallbackUser.KhoaID,
  );
  const blockedPack = await ensureRoleUsers(
    users,
    BLOCKED_ROLES,
    fallbackUser.KhoaID,
  );

  const doanRa = await resolveAttachmentScenario("doanra", DoanRa);
  const doanVao = await resolveAttachmentScenario("doanvao", DoanVao);

  return {
    allowedUsers: allowedPack.selected,
    blockedUsers: blockedPack.selected,
    provisionedUsers: [
      ...allowedPack.provisionedUsers,
      ...blockedPack.provisionedUsers,
    ],
    doanRa,
    doanVao,
  };
}

async function cleanupTempUsers() {
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

  console.log("DoanHopTac attachments live runtime probe");
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
  console.log("Attachment scenarios:", {
    doanRaOwnerId: scenario.doanRa.ownerId,
    doanRaField: scenario.doanRa.field,
    doanRaFileId: scenario.doanRa.fileDoc?._id
      ? String(scenario.doanRa.fileDoc._id)
      : null,
    doanVaoOwnerId: scenario.doanVao.ownerId,
    doanVaoField: scenario.doanVao.field,
    doanVaoFileId: scenario.doanVao.fileDoc?._id
      ? String(scenario.doanVao.fileDoc._id)
      : null,
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

  const listChecks = [
    {
      label: "GET /attachments/DoanRa/:ownerId/:field/files",
      ownerType: "doanra",
      path: `/attachments/DoanRa/${scenario.doanRa.ownerId}/${scenario.doanRa.field}/files?page=1&size=10`,
      expectedFileId: scenario.doanRa.fileDoc?._id
        ? String(scenario.doanRa.fileDoc._id)
        : null,
    },
    {
      label: "GET /attachments/DoanVao/:ownerId/:field/files",
      ownerType: "doanvao",
      path: `/attachments/DoanVao/${scenario.doanVao.ownerId}/${scenario.doanVao.field}/files?page=1&size=10`,
      expectedFileId: scenario.doanVao.fileDoc?._id
        ? String(scenario.doanVao.fileDoc._id)
        : null,
    },
  ];

  for (const [role, user] of scenario.allowedUsers.entries()) {
    const token = signToken(user._id);
    for (const check of listChecks) {
      await runCase(`[ALLOW ${role}] ${check.label}`, async () => {
        const res = await requestJson(check.path, { token });
        ensure(res.status === 200, `Expected 200, got ${res.status}`);
        const items = getItems(res);
        ensure(
          Array.isArray(items),
          "Attachment list response missing items array.",
        );
        if (check.expectedFileId) {
          ensure(
            items.some((item) => String(item._id) === check.expectedFileId),
            `Expected attachment ${check.expectedFileId} in list response.`,
          );
        }
        return {
          role,
          userName: user.UserName,
          ownerType: check.ownerType,
          httpStatus: res.status,
          count: items.length,
        };
      });
    }
  }

  for (const [role, user] of scenario.blockedUsers.entries()) {
    const token = signToken(user._id);
    for (const check of listChecks) {
      await runCase(`[BLOCK ${role}] ${check.label}`, async () => {
        const res = await requestJson(check.path, { token });
        ensure(res.status === 403, `Expected 403, got ${res.status}`);
        return {
          role,
          userName: user.UserName,
          ownerType: check.ownerType,
          httpStatus: res.status,
          message: getErrorMessage(res),
        };
      });
    }
  }

  const streamAllowedUser =
    scenario.allowedUsers.get("admin") ||
    scenario.allowedUsers.values().next().value;
  const streamBlockedUser =
    scenario.blockedUsers.get("nomal") ||
    scenario.blockedUsers.values().next().value;

  const streamChecks = [
    {
      label: "GET /attachments/files/:id/inline (DoanRa)",
      path: scenario.doanRa.fileDoc?._id
        ? `/attachments/files/${scenario.doanRa.fileDoc._id}/inline`
        : null,
      disposition: "inline",
      ownerType: "doanra",
      supported: scenario.doanRa.streamSupported,
    },
    {
      label: "GET /attachments/files/:id/download (DoanRa)",
      path: scenario.doanRa.fileDoc?._id
        ? `/attachments/files/${scenario.doanRa.fileDoc._id}/download`
        : null,
      disposition: "attachment",
      ownerType: "doanra",
      supported: scenario.doanRa.streamSupported,
    },
    {
      label: "GET /attachments/files/:id/inline (DoanVao)",
      path: scenario.doanVao.fileDoc?._id
        ? `/attachments/files/${scenario.doanVao.fileDoc._id}/inline`
        : null,
      disposition: "inline",
      ownerType: "doanvao",
      supported: scenario.doanVao.streamSupported,
    },
    {
      label: "GET /attachments/files/:id/download (DoanVao)",
      path: scenario.doanVao.fileDoc?._id
        ? `/attachments/files/${scenario.doanVao.fileDoc._id}/download`
        : null,
      disposition: "attachment",
      ownerType: "doanvao",
      supported: scenario.doanVao.streamSupported,
    },
  ];

  for (const check of streamChecks) {
    if (!check.path || !check.supported) {
      skipCase(
        check.label,
        `Khong tim thay tep ${check.ownerType} con ton tai tren storage de test stream.`,
      );
      continue;
    }

    await runCase(
      `[ALLOW ${streamAllowedUser.PhanQuyen}] ${check.label}`,
      async () => {
        const res = await requestBinary(check.path, {
          token: signToken(streamAllowedUser._id),
        });
        ensure(res.status === 200, `Expected 200, got ${res.status}`);
        ensure(
          res.headers.contentDisposition
            .toLowerCase()
            .includes(check.disposition),
          `Expected Content-Disposition to include ${check.disposition}.`,
        );
        return {
          role: streamAllowedUser.PhanQuyen,
          userName: streamAllowedUser.UserName,
          ownerType: check.ownerType,
          httpStatus: res.status,
        };
      },
    );

    await runCase(
      `[BLOCK ${streamBlockedUser.PhanQuyen}] ${check.label}`,
      async () => {
        const res = await requestBinary(check.path, {
          token: signToken(streamBlockedUser._id),
        });
        ensure(res.status === 403, `Expected 403, got ${res.status}`);
        return {
          role: streamBlockedUser.PhanQuyen,
          userName: streamBlockedUser.UserName,
          ownerType: check.ownerType,
          httpStatus: res.status,
          message: getErrorMessage(res),
        };
      },
    );
  }

  const failed = results.filter((item) => item.status === "FAIL");
  console.table(results);

  if (failed.length > 0) {
    console.error("DoanHopTac attachments runtime probe failed:");
    console.table(failed);
    process.exitCode = 1;
    return;
  }

  console.log("DoanHopTac attachments runtime probe passed.");
}

main()
  .catch((error) => {
    console.error(error);
    process.exitCode = 1;
  })
  .finally(async () => {
    try {
      await cleanupTempUsers();
    } catch (error) {
      console.error(
        "Failed to clean up temporary DoanHopTac UAT users:",
        error,
      );
      process.exitCode = 1;
    }
    await mongoose.disconnect();
  });
