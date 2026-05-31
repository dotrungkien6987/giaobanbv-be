require("dotenv").config();
const mongoose = require("mongoose");
const jwt = require("jsonwebtoken");

const User = require("./models/User");
const NhanVien = require("./models/NhanVien");
const LopDaoTao = require("./models/LopDaoTao");
const LopDaoTaoNhanVien = require("./models/LopDaoTaoNhanVien");
const DaTaFix = require("./models/DaTaFix");
const HinhThucCapNhat = require("./models/HinhThucCapNhat");

const BASE_URL =
  process.env.UAT_BASE_URL ||
  `http://localhost:${process.env.PORT || 8000}/api`;
const TEMP_USER_PREFIX = "uat-lopdaotaonhanvien-temp";
const TEMP_LOP_PREFIX = "UAT-LDTNV";
const MANAGE_ROLES = ["admin", "superadmin"];
const ROSTER_READ_ROLES = ["daotao"];
const REGULAR_ROLES = ["manager", "nomal", "noibo"];

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

function buildMarker(label) {
  return `${TEMP_LOP_PREFIX}-${label}-${Date.now()}-${Math.floor(
    Math.random() * 10000,
  )}`;
}

function createTempUserDoc(role, khoaId) {
  const now = new Date();
  const stamp = `${now.getTime()}-${Math.floor(Math.random() * 10000)}`;

  return {
    _id: new mongoose.Types.ObjectId(),
    UserName: `${TEMP_USER_PREFIX}-${role}-${stamp}`,
    PassWord: `temp-${role}`,
    KhoaID: khoaId,
    HoTen: `UAT LopDaoTaoNhanVien ${role}`,
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

async function ensureUserByRole(existingUsers, role, fallbackKhoaId) {
  const existing = existingUsers.find(
    (user) => String(user.PhanQuyen || "").toLowerCase() === role,
  );
  if (existing) {
    return { user: existing, provisioned: null };
  }

  const tempDoc = createTempUserDoc(role, fallbackKhoaId);
  await User.collection.insertOne(tempDoc);

  return {
    user: {
      _id: tempDoc._id,
      UserName: tempDoc.UserName,
      PhanQuyen: tempDoc.PhanQuyen,
      KhoaID: tempDoc.KhoaID,
      __provisioned: true,
    },
    provisioned: {
      _id: tempDoc._id,
      UserName: tempDoc.UserName,
      PhanQuyen: tempDoc.PhanQuyen,
    },
  };
}

async function ensureRegularUsers(existingUsers, fallbackKhoaId) {
  const regularUsers = existingUsers.filter((user) =>
    REGULAR_ROLES.includes(String(user.PhanQuyen || "").toLowerCase()),
  );

  const provisioned = [];
  let creatorUser = regularUsers[0] || null;
  let viewerUser = regularUsers.find(
    (user) => String(user._id) !== String(creatorUser?._id || ""),
  );

  if (!creatorUser) {
    const created = await ensureUserByRole(
      existingUsers,
      "manager",
      fallbackKhoaId,
    );
    creatorUser = created.user;
    if (created.provisioned) provisioned.push(created.provisioned);
    existingUsers.push(creatorUser);
  }

  if (!viewerUser) {
    const created = await ensureUserByRole(
      existingUsers,
      "nomal",
      fallbackKhoaId,
    );
    viewerUser = created.user;
    if (created.provisioned) provisioned.push(created.provisioned);
    existingUsers.push(viewerUser);
  }

  ensure(
    String(creatorUser._id) !== String(viewerUser._id),
    "Khong tao duoc creator va viewer rieng cho probe LopDaoTaoNhanVien.",
  );

  return { creatorUser, viewerUser, provisioned };
}

function buildLopDaoTaoPayload(marker, hinhThucCapNhatMa) {
  return {
    lopdaotaoData: {
      MaHinhThucCapNhat: hinhThucCapNhatMa,
      Ten: `${marker}-Lop`,
      TrangThai: false,
      QuyetDinh: marker,
      NoiDaoTao: "UAT",
      NguonKinhPhi: "UAT",
      HinhThucDaoTao: "UAT",
      GhiChu: marker,
      SoLuong: 2,
      NgayBatDau: new Date().toISOString(),
      NgayKetThuc: new Date().toISOString(),
    },
  };
}

function buildRosterPayload(lopId, nhanVienIds) {
  return {
    lopdaotaoID: lopId,
    lopdaotaonhanvienData: nhanVienIds.map((nhanVienId, index) => ({
      LopDaoTaoID: lopId,
      NhanVienID: String(nhanVienId),
      VaiTro: index === 0 ? "Hoc vien" : "Thu ky",
    })),
  };
}

function hasRosterEntry(items, lopId, memberId) {
  return items.some(
    (item) =>
      String(item.LopDaoTaoID) === String(lopId) &&
      (!memberId || String(item._id) === String(memberId)),
  );
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

async function cleanupTempLopDaoTaos() {
  const tempLops = await LopDaoTao.find({
    Ten: { $regex: `^${TEMP_LOP_PREFIX}-` },
  })
    .select("_id")
    .lean();

  if (tempLops.length === 0) {
    return;
  }

  const lopIds = tempLops.map((item) => item._id);
  await Promise.all([
    LopDaoTaoNhanVien.deleteMany({ LopDaoTaoID: { $in: lopIds } }),
    LopDaoTao.deleteMany({ _id: { $in: lopIds } }),
  ]);
}

async function resolveScenario() {
  const users = await User.find({ mustChangePassword: { $ne: true } })
    .select("UserName PhanQuyen KhoaID")
    .lean();

  const fallbackUser =
    users.find((user) => user.KhoaID) ||
    (await User.findOne({ KhoaID: { $ne: null } })
      .select("KhoaID")
      .lean());
  ensure(
    fallbackUser?.KhoaID,
    "Khong tim thay KhoaID hop le de tao persona tam cho probe LopDaoTaoNhanVien.",
  );

  const provisionedUsers = [];
  const adminPack = await ensureUserByRole(users, "admin", fallbackUser.KhoaID);
  const superadminPack = await ensureUserByRole(
    users,
    "superadmin",
    fallbackUser.KhoaID,
  );
  const daotaoPack = await ensureUserByRole(
    users,
    "daotao",
    fallbackUser.KhoaID,
  );
  const regularPack = await ensureRegularUsers(users, fallbackUser.KhoaID);

  for (const pack of [adminPack, superadminPack, daotaoPack]) {
    if (pack.provisioned) provisionedUsers.push(pack.provisioned);
  }
  provisionedUsers.push(...regularPack.provisioned);

  const dataFix = await DaTaFix.findOne({}).lean();
  ensure(
    dataFix?.NhomHinhThucCapNhat?.length,
    "Khong tim thay NhomHinhThucCapNhat.",
  );

  const nhomCodes = new Set(dataFix.NhomHinhThucCapNhat.map((item) => item.Ma));
  const hinhThucCapNhat = await HinhThucCapNhat.findOne({}).lean();
  const hinhThucs = hinhThucCapNhat
    ? await HinhThucCapNhat.find({}).lean()
    : [];
  const matchedHinhThuc = hinhThucs.find((item) =>
    nhomCodes.has(item.MaNhomHinhThucCapNhat),
  );
  ensure(
    matchedHinhThuc?.Ma,
    "Khong tim thay HinhThucCapNhat hop le de tao LopDaoTao tam.",
  );

  const nhanViens = await NhanVien.findDangLamViec({})
    .select("_id")
    .limit(3)
    .lean();
  ensure(
    nhanViens.length >= 3,
    "Khong du NhanVien dang lam viec de tao roster tam.",
  );

  return {
    adminUser: adminPack.user,
    superadminUser: superadminPack.user,
    daotaoUser: daotaoPack.user,
    creatorUser: regularPack.creatorUser,
    viewerUser: regularPack.viewerUser,
    provisionedUsers,
    hinhThucCapNhatMa: matchedHinhThuc.Ma,
    nhanVienIds: nhanViens.map((item) => String(item._id)),
  };
}

async function main() {
  await mongoose.connect(process.env.MONGODB_URI);
  const scenario = await resolveScenario();

  const creatorToken = signToken(scenario.creatorUser._id);
  const adminToken = signToken(scenario.adminUser._id);
  const superadminToken = signToken(scenario.superadminUser._id);
  const daotaoToken = signToken(scenario.daotaoUser._id);
  const viewerToken = signToken(scenario.viewerUser._id);

  console.log("LopDaoTaoNhanVien live runtime probe");
  console.log(`Base URL: ${BASE_URL}`);
  console.table([
    {
      persona: "creator",
      role: scenario.creatorUser.PhanQuyen,
      UserName: scenario.creatorUser.UserName,
      provisioned: Boolean(scenario.creatorUser.__provisioned),
    },
    {
      persona: "viewer",
      role: scenario.viewerUser.PhanQuyen,
      UserName: scenario.viewerUser.UserName,
      provisioned: Boolean(scenario.viewerUser.__provisioned),
    },
    {
      persona: "daotao",
      role: scenario.daotaoUser.PhanQuyen,
      UserName: scenario.daotaoUser.UserName,
      provisioned: Boolean(scenario.daotaoUser.__provisioned),
    },
    {
      persona: "admin",
      role: scenario.adminUser.PhanQuyen,
      UserName: scenario.adminUser.UserName,
      provisioned: Boolean(scenario.adminUser.__provisioned),
    },
    {
      persona: "superadmin",
      role: scenario.superadminUser.PhanQuyen,
      UserName: scenario.superadminUser.UserName,
      provisioned: Boolean(scenario.superadminUser.__provisioned),
    },
  ]);
  if (scenario.provisionedUsers.length > 0) {
    console.log(
      "Provisioned temporary users for missing roles:",
      scenario.provisionedUsers.map((user) => ({
        role: user.PhanQuyen,
        UserName: user.UserName,
      })),
    );
  }

  const marker = buildMarker("main");
  const createLopResponse = await requestJson("/lopdaotao", {
    method: "POST",
    token: creatorToken,
    body: buildLopDaoTaoPayload(marker, scenario.hinhThucCapNhatMa),
  });
  ensure(
    createLopResponse.status === 200,
    `Create LopDaoTao expected 200, got ${createLopResponse.status}`,
  );

  const lopId = String(createLopResponse.json?.data?._id || "");
  ensure(lopId, "Create LopDaoTao response missing id.");

  const results = [];
  const runCase = async (name, fn) => {
    try {
      const detail = await fn();
      results.push({ name, status: "PASS", ...detail });
    } catch (error) {
      results.push({ name, status: "FAIL", detail: error.message });
    }
  };

  let memberIds = [];
  const baseRosterIds = scenario.nhanVienIds.slice(0, 2);
  const extraNhanVienId = scenario.nhanVienIds[2];

  await runCase("[ALLOW creator] POST /lopdaotaonhanvien", async () => {
    const response = await requestJson("/lopdaotaonhanvien", {
      method: "POST",
      token: creatorToken,
      body: buildRosterPayload(lopId, baseRosterIds),
    });
    ensure(response.status === 200, `Expected 200, got ${response.status}`);
    ensure(Array.isArray(response.json?.data), "Expected roster array.");
    ensure(
      response.json.data.length === 2,
      "Expected 2 roster members after creator POST.",
    );
    memberIds = response.json.data.map((item) => String(item._id));
    return {
      httpStatus: response.status,
      rosterSize: response.json.data.length,
    };
  });

  await runCase("[BLOCK viewer] POST /lopdaotaonhanvien", async () => {
    const response = await requestJson("/lopdaotaonhanvien", {
      method: "POST",
      token: viewerToken,
      body: buildRosterPayload(lopId, baseRosterIds),
    });
    ensure(response.status === 403, `Expected 403, got ${response.status}`);
    return { httpStatus: response.status, message: getErrorMessage(response) };
  });

  await runCase("[BLOCK daotao] POST /lopdaotaonhanvien", async () => {
    const response = await requestJson("/lopdaotaonhanvien", {
      method: "POST",
      token: daotaoToken,
      body: buildRosterPayload(lopId, baseRosterIds),
    });
    ensure(response.status === 403, `Expected 403, got ${response.status}`);
    return { httpStatus: response.status, message: getErrorMessage(response) };
  });

  await runCase("[ALLOW admin] POST /lopdaotaonhanvien", async () => {
    const response = await requestJson("/lopdaotaonhanvien", {
      method: "POST",
      token: adminToken,
      body: buildRosterPayload(lopId, [...baseRosterIds, extraNhanVienId]),
    });
    ensure(response.status === 200, `Expected 200, got ${response.status}`);
    ensure(Array.isArray(response.json?.data), "Expected roster array.");
    ensure(
      response.json.data.length === 3,
      "Expected 3 roster members after admin POST.",
    );
    memberIds = response.json.data.map((item) => String(item._id));
    return {
      httpStatus: response.status,
      rosterSize: response.json.data.length,
    };
  });

  const creatorMemberId = memberIds[0];
  const adminMemberId = memberIds[1];
  const superadminMemberId = memberIds[2];

  const listChecks = [
    {
      label: "[ALLOW creator] GET /lopdaotaonhanvien",
      token: creatorToken,
      expectedContains: true,
      allowed: true,
    },
    {
      label: "[ALLOW admin] GET /lopdaotaonhanvien",
      token: adminToken,
      expectedContains: true,
      allowed: true,
    },
    {
      label: "[ALLOW superadmin] GET /lopdaotaonhanvien",
      token: superadminToken,
      expectedContains: true,
      allowed: true,
    },
    {
      label: "[ALLOW daotao] GET /lopdaotaonhanvien",
      token: daotaoToken,
      expectedContains: true,
      allowed: true,
    },
    {
      label: "[BLOCK viewer] GET /lopdaotaonhanvien",
      token: viewerToken,
      expectedContains: false,
      allowed: false,
    },
    {
      label: "[ALLOW creator] GET /lopdaotaonhanvien?search",
      token: creatorToken,
      expectedContains: true,
      allowed: true,
      path: `/lopdaotaonhanvien?search=${encodeURIComponent(marker)}`,
    },
    {
      label: "[ALLOW daotao] GET /lopdaotaonhanvien?search",
      token: daotaoToken,
      expectedContains: true,
      allowed: true,
      path: `/lopdaotaonhanvien?search=${encodeURIComponent(marker)}`,
    },
    {
      label: "[BLOCK viewer] GET /lopdaotaonhanvien?search",
      token: viewerToken,
      expectedContains: false,
      allowed: false,
      path: `/lopdaotaonhanvien?search=${encodeURIComponent(marker)}`,
    },
  ];

  for (const check of listChecks) {
    await runCase(check.label, async () => {
      const response = await requestJson(check.path || "/lopdaotaonhanvien", {
        token: check.token,
      });
      ensure(response.status === 200, `Expected 200, got ${response.status}`);
      const items = response.json?.data?.lopdaotaonhanviens || [];
      const containsTempRoster = hasRosterEntry(items, lopId);
      ensure(
        containsTempRoster === check.expectedContains,
        `Expected containsTempRoster=${check.expectedContains}, got ${containsTempRoster}`,
      );
      return {
        httpStatus: response.status,
        containsTempRoster,
        count: items.length,
      };
    });
  }

  const extraChecks = [
    {
      label: "[ALLOW creator] GET /lopdaotao/getextra",
      token: creatorToken,
      expectedCount: 3,
    },
    {
      label: "[ALLOW admin] GET /lopdaotao/getextra",
      token: adminToken,
      expectedCount: 3,
    },
    {
      label: "[ALLOW superadmin] GET /lopdaotao/getextra",
      token: superadminToken,
      expectedCount: 3,
    },
    {
      label: "[ALLOW daotao] GET /lopdaotao/getextra",
      token: daotaoToken,
      expectedCount: 3,
    },
    {
      label: "[BLOCK viewer] GET /lopdaotao/getextra",
      token: viewerToken,
      expectedCount: 0,
    },
  ];

  for (const check of extraChecks) {
    await runCase(check.label, async () => {
      const response = await requestJson(
        `/lopdaotao/getextra?lopdaotaoID=${lopId}&tam=false`,
        { token: check.token },
      );
      ensure(response.status === 200, `Expected 200, got ${response.status}`);
      const roster = response.json?.data?.lopdaotaonhanvien || [];
      ensure(
        roster.length === check.expectedCount,
        `Expected ${check.expectedCount} roster entries, got ${roster.length}`,
      );
      return {
        httpStatus: response.status,
        rosterCount: roster.length,
      };
    });
  }

  const detailChecks = [
    {
      label: "[ALLOW creator] GET /lopdaotaonhanvien/:id",
      token: creatorToken,
      memberId: creatorMemberId,
      expectedStatus: 200,
    },
    {
      label: "[ALLOW admin] GET /lopdaotaonhanvien/:id",
      token: adminToken,
      memberId: adminMemberId,
      expectedStatus: 200,
    },
    {
      label: "[ALLOW superadmin] GET /lopdaotaonhanvien/:id",
      token: superadminToken,
      memberId: superadminMemberId,
      expectedStatus: 200,
    },
    {
      label: "[BLOCK daotao] GET /lopdaotaonhanvien/:id",
      token: daotaoToken,
      memberId: creatorMemberId,
      expectedStatus: 403,
    },
    {
      label: "[BLOCK viewer] GET /lopdaotaonhanvien/:id",
      token: viewerToken,
      memberId: creatorMemberId,
      expectedStatus: 403,
    },
  ];

  for (const check of detailChecks) {
    await runCase(check.label, async () => {
      const response = await requestJson(
        `/lopdaotaonhanvien/${check.memberId}`,
        {
          token: check.token,
        },
      );
      ensure(
        response.status === check.expectedStatus,
        `Expected ${check.expectedStatus}, got ${response.status}`,
      );
      return {
        httpStatus: response.status,
        message:
          check.expectedStatus === 403 ? getErrorMessage(response) : undefined,
      };
    });
  }

  await runCase("[ALLOW superadmin] PUT /lopdaotaonhanvien", async () => {
    const response = await requestJson("/lopdaotaonhanvien", {
      method: "PUT",
      token: superadminToken,
      body: {
        lopdaotaonhanvienDiemDanhData: [
          {
            _id: superadminMemberId,
            DiemDanh: [true, false],
            SoTinChiTichLuy: 2,
          },
        ],
      },
    });
    ensure(response.status === 200, `Expected 200, got ${response.status}`);
    return { httpStatus: response.status };
  });

  for (const [label, token] of [
    ["[BLOCK daotao] PUT /lopdaotaonhanvien", daotaoToken],
    ["[BLOCK viewer] PUT /lopdaotaonhanvien", viewerToken],
  ]) {
    await runCase(label, async () => {
      const response = await requestJson("/lopdaotaonhanvien", {
        method: "PUT",
        token,
        body: {
          lopdaotaonhanvienDiemDanhData: [
            {
              _id: superadminMemberId,
              DiemDanh: [false, false],
              SoTinChiTichLuy: 0,
            },
          ],
        },
      });
      ensure(response.status === 403, `Expected 403, got ${response.status}`);
      return {
        httpStatus: response.status,
        message: getErrorMessage(response),
      };
    });
  }

  await runCase("[ALLOW creator] PUT /lopdaotaonhanvien/upload", async () => {
    const response = await requestJson("/lopdaotaonhanvien/upload", {
      method: "PUT",
      token: creatorToken,
      body: {
        lopdaotaonhanvienID: creatorMemberId,
        Images: [`uat://${marker}/creator.png`],
      },
    });
    ensure(response.status === 200, `Expected 200, got ${response.status}`);
    return { httpStatus: response.status };
  });

  await runCase("[ALLOW admin] PUT /lopdaotaonhanvien/upload", async () => {
    const response = await requestJson("/lopdaotaonhanvien/upload", {
      method: "PUT",
      token: adminToken,
      body: {
        lopdaotaonhanvienID: adminMemberId,
        Images: [`uat://${marker}/admin.png`],
      },
    });
    ensure(response.status === 200, `Expected 200, got ${response.status}`);
    return { httpStatus: response.status };
  });

  for (const [label, token] of [
    ["[BLOCK daotao] PUT /lopdaotaonhanvien/upload", daotaoToken],
    ["[BLOCK viewer] PUT /lopdaotaonhanvien/upload", viewerToken],
  ]) {
    await runCase(label, async () => {
      const response = await requestJson("/lopdaotaonhanvien/upload", {
        method: "PUT",
        token,
        body: {
          lopdaotaonhanvienID: superadminMemberId,
          Images: [`uat://${marker}/blocked.png`],
        },
      });
      ensure(response.status === 403, `Expected 403, got ${response.status}`);
      return {
        httpStatus: response.status,
        message: getErrorMessage(response),
      };
    });
  }

  for (const [label, token] of [
    ["[BLOCK daotao] DELETE /lopdaotaonhanvien/:id", daotaoToken],
    ["[BLOCK viewer] DELETE /lopdaotaonhanvien/:id", viewerToken],
  ]) {
    await runCase(label, async () => {
      const response = await requestJson(
        `/lopdaotaonhanvien/${superadminMemberId}`,
        {
          method: "DELETE",
          token,
        },
      );
      ensure(response.status === 403, `Expected 403, got ${response.status}`);
      return {
        httpStatus: response.status,
        message: getErrorMessage(response),
      };
    });
  }

  await runCase("[ALLOW creator] DELETE /lopdaotaonhanvien/:id", async () => {
    const response = await requestJson(
      `/lopdaotaonhanvien/${creatorMemberId}`,
      {
        method: "DELETE",
        token: creatorToken,
      },
    );
    ensure(response.status === 200, `Expected 200, got ${response.status}`);
    return { httpStatus: response.status };
  });

  await runCase("[ALLOW admin] DELETE /lopdaotaonhanvien/:id", async () => {
    const response = await requestJson(`/lopdaotaonhanvien/${adminMemberId}`, {
      method: "DELETE",
      token: adminToken,
    });
    ensure(response.status === 200, `Expected 200, got ${response.status}`);
    return { httpStatus: response.status };
  });

  console.table(results);
  const failed = results.filter((item) => item.status === "FAIL");

  if (failed.length > 0) {
    console.error("LopDaoTaoNhanVien runtime probe failed:");
    console.table(failed);
    process.exitCode = 1;
    return;
  }

  console.log("LopDaoTaoNhanVien runtime probe passed.");
}

main()
  .catch((error) => {
    console.error(error);
    process.exitCode = 1;
  })
  .finally(async () => {
    try {
      await cleanupTempLopDaoTaos();
      await cleanupTempUsers();
    } catch (error) {
      console.error("Failed to clean up LopDaoTaoNhanVien UAT data:", error);
      process.exitCode = 1;
    }
    await mongoose.disconnect();
  });
