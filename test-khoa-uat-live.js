require("dotenv").config();
const mongoose = require("mongoose");
const jwt = require("jsonwebtoken");

const User = require("./models/User");
const Khoa = require("./models/Khoa");

const BASE_URL =
  process.env.UAT_BASE_URL ||
  `http://localhost:${process.env.PORT || 8000}/api`;
const ISO_ALLOWED_ROLES = ["admin", "superadmin", "qlcl"];
const ISO_BLOCKED_ROLES = ["daotao", "cntt", "manager", "nomal", "noibo"];
const WRITE_ALLOWED_ROLES = ["admin", "superadmin"];
const WRITE_BLOCKED_ROLES = ["qlcl", ...ISO_BLOCKED_ROLES];
const TEMP_USER_PREFIX = "uat-khoa-temp";
const TEMP_KHOA_PREFIX = "UAT-KHOA";

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

function ensure(condition, message) {
  if (!condition) {
    throw new Error(message);
  }
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
    HoTen: `UAT Khoa ${role}`,
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
    provisionedUsers.push(tempUser);
  }

  return { selected, provisionedUsers };
}

function buildMarker(role) {
  return `${TEMP_KHOA_PREFIX}-${role}-${Date.now()}-${Math.floor(
    Math.random() * 10000,
  )}`;
}

function buildKhoaPayload(role, marker, stt) {
  return {
    TenKhoa: `${marker}-Ten`,
    MaKhoa: marker,
    LoaiKhoa: "khac",
    STT: stt,
    HisDepartmentID: 900000 + stt,
    HisDepartmentGroupID: 910000 + stt,
    HisDepartmentType: 1,
    GhiChuUAT: role,
  };
}

async function cleanupTempUsers() {
  const tempUsers = await User.find({
    UserName: { $regex: `^${TEMP_USER_PREFIX}-` },
  })
    .select("_id")
    .lean();

  if (tempUsers.length > 0) {
    await User.deleteMany({ _id: { $in: tempUsers.map((user) => user._id) } });
  }
}

async function cleanupTempKhoas() {
  await Khoa.deleteMany({ MaKhoa: { $regex: `^${TEMP_KHOA_PREFIX}-` } });
}

async function loadScenario() {
  const allRoles = Array.from(
    new Set([
      ...ISO_ALLOWED_ROLES,
      ...ISO_BLOCKED_ROLES,
      ...WRITE_ALLOWED_ROLES,
      ...WRITE_BLOCKED_ROLES,
    ]),
  );
  const users = await User.find({
    PhanQuyen: { $in: allRoles },
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
    "Khong tim thay KhoaID hop le de tao persona tam cho probe Khoa.",
  );

  const rolePack = await ensureRoleUsers(users, allRoles, fallbackUser.KhoaID);

  const existingKhoa = await Khoa.findOne({})
    .select("_id STT")
    .sort({ createdAt: -1 })
    .lean();
  ensure(
    existingKhoa?._id,
    "Khong tim thay Khoa nao trong DB de test PUT/DELETE bị chan.",
  );

  const maxSttDoc = await Khoa.findOne({})
    .sort({ STT: -1 })
    .select("STT")
    .lean();

  return {
    isoAllowedUsers: new Map(
      ISO_ALLOWED_ROLES.map((role) => [role, rolePack.selected.get(role)]),
    ),
    isoBlockedUsers: new Map(
      ISO_BLOCKED_ROLES.map((role) => [role, rolePack.selected.get(role)]),
    ),
    writeAllowedUsers: new Map(
      WRITE_ALLOWED_ROLES.map((role) => [role, rolePack.selected.get(role)]),
    ),
    writeBlockedUsers: new Map(
      WRITE_BLOCKED_ROLES.map((role) => [role, rolePack.selected.get(role)]),
    ),
    provisionedUsers: rolePack.provisionedUsers,
    existingKhoaId: String(existingKhoa._id),
    nextSttBase: Number(maxSttDoc?.STT || 1000) + 100,
  };
}

async function main() {
  await mongoose.connect(process.env.MONGODB_URI);
  const scenario = await loadScenario();

  console.log("KHOA-01 live runtime probe");
  console.log(`Base URL: ${BASE_URL}`);
  console.table(
    [
      ...scenario.isoAllowedUsers.entries(),
      ...scenario.isoBlockedUsers.entries(),
    ].map(([role, user]) => ({
      role,
      UserName: user.UserName,
      provisioned: Boolean(user.__provisioned),
    })),
  );
  if (scenario.provisionedUsers.length > 0) {
    console.log(
      "Provisioned temporary users for missing roles:",
      scenario.provisionedUsers.map((user) => ({
        role: user.PhanQuyen,
        UserName: user.UserName,
      })),
    );
  }
  console.log("Scenario:", {
    existingKhoaId: scenario.existingKhoaId,
    nextSttBase: scenario.nextSttBase,
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

  for (const [role, user] of scenario.isoAllowedUsers.entries()) {
    const token = signToken(user._id);

    await runCase(`[ALLOW ${role}] GET /khoa/iso`, async () => {
      const response = await requestJson("/khoa/iso", { token });
      ensure(response.status === 200, `Expected 200, got ${response.status}`);
      ensure(
        Array.isArray(response.json?.data?.khoas),
        "Expected khoa ISO array.",
      );
      return {
        role,
        userName: user.UserName,
        httpStatus: response.status,
        isoCount: response.json.data.khoas.length,
      };
    });

    await runCase(`[ALLOW ${role}] GET /khoa/iso/accessible`, async () => {
      const response = await requestJson("/khoa/iso/accessible", { token });
      ensure(response.status === 200, `Expected 200, got ${response.status}`);
      ensure(
        Array.isArray(response.json?.data?.khoas),
        "Expected khoa ISO accessible array.",
      );
      return {
        role,
        userName: user.UserName,
        httpStatus: response.status,
        isoCount: response.json.data.khoas.length,
      };
    });
  }

  for (const [index, [role, user]] of [
    ...scenario.writeAllowedUsers.entries(),
  ].entries()) {
    const token = signToken(user._id);

    await runCase(`[ALLOW ${role}] POST/PUT/DELETE /khoa`, async () => {
      const marker = buildMarker(role);
      const createResponse = await requestJson("/khoa", {
        method: "POST",
        token,
        body: buildKhoaPayload(role, marker, scenario.nextSttBase + index),
      });
      ensure(
        createResponse.status === 201,
        `Expected 201, got ${createResponse.status}`,
      );

      const createdId = String(createResponse.json?.data?.newKhoa?._id || "");
      ensure(createdId, "Create response missing newKhoa id.");

      const updateResponse = await requestJson(`/khoa/${createdId}`, {
        method: "PUT",
        token,
        body: {
          TenKhoa: `${marker}-Updated`,
          STT: scenario.nextSttBase + index + 1,
        },
      });
      ensure(
        updateResponse.status === 200,
        `Expected 200, got ${updateResponse.status}`,
      );

      const deleteResponse = await requestJson(`/khoa/${createdId}`, {
        method: "DELETE",
        token,
      });
      ensure(
        deleteResponse.status === 200,
        `Expected 200, got ${deleteResponse.status}`,
      );

      return {
        role,
        userName: user.UserName,
        createStatus: createResponse.status,
        updateStatus: updateResponse.status,
        deleteStatus: deleteResponse.status,
      };
    });
  }

  for (const [role, user] of scenario.isoBlockedUsers.entries()) {
    const token = signToken(user._id);

    await runCase(`[BLOCK ${role}] GET /khoa/iso`, async () => {
      const response = await requestJson("/khoa/iso", { token });
      ensure(response.status === 403, `Expected 403, got ${response.status}`);
      return {
        role,
        userName: user.UserName,
        httpStatus: response.status,
        message: getErrorMessage(response),
      };
    });

    await runCase(`[BLOCK ${role}] GET /khoa/iso/accessible`, async () => {
      const response = await requestJson("/khoa/iso/accessible", { token });
      ensure(response.status === 200, `Expected 200, got ${response.status}`);
      ensure(
        Array.isArray(response.json?.data?.khoas),
        "Expected khoa ISO accessible array.",
      );
      return {
        role,
        userName: user.UserName,
        httpStatus: response.status,
        isoCount: response.json.data.khoas.length,
      };
    });
  }

  for (const [role, user] of scenario.writeBlockedUsers.entries()) {
    const token = signToken(user._id);

    await runCase(`[BLOCK ${role}] POST /khoa`, async () => {
      const response = await requestJson("/khoa", {
        method: "POST",
        token,
        body: buildKhoaPayload(
          role,
          buildMarker(role),
          scenario.nextSttBase + 50,
        ),
      });
      ensure(response.status === 403, `Expected 403, got ${response.status}`);
      return {
        role,
        userName: user.UserName,
        httpStatus: response.status,
        message: getErrorMessage(response),
      };
    });

    await runCase(`[BLOCK ${role}] PUT /khoa/:id`, async () => {
      const response = await requestJson(`/khoa/${scenario.existingKhoaId}`, {
        method: "PUT",
        token,
        body: { TenKhoa: `${TEMP_KHOA_PREFIX}-Blocked-${role}` },
      });
      ensure(response.status === 403, `Expected 403, got ${response.status}`);
      return {
        role,
        userName: user.UserName,
        httpStatus: response.status,
        message: getErrorMessage(response),
      };
    });

    await runCase(`[BLOCK ${role}] DELETE /khoa/:id`, async () => {
      const response = await requestJson(`/khoa/${scenario.existingKhoaId}`, {
        method: "DELETE",
        token,
      });
      ensure(response.status === 403, `Expected 403, got ${response.status}`);
      return {
        role,
        userName: user.UserName,
        httpStatus: response.status,
        message: getErrorMessage(response),
      };
    });
  }

  console.table(results);

  const failed = results.filter((item) => item.status === "FAIL");
  if (failed.length > 0) {
    console.error("KHOA-01 runtime probe failed:");
    console.table(failed);
    process.exitCode = 1;
    return;
  }

  console.log("KHOA-01 runtime probe passed.");
}

main()
  .catch((error) => {
    console.error(error);
    process.exitCode = 1;
  })
  .finally(async () => {
    try {
      await cleanupTempUsers();
      await cleanupTempKhoas();
    } catch (error) {
      console.error("Failed to clean up KHOA UAT data:", error);
      process.exitCode = 1;
    }

    await mongoose.disconnect();
  });
