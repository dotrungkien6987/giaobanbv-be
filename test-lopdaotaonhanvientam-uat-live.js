require("dotenv").config();
const mongoose = require("mongoose");
const jwt = require("jsonwebtoken");

const User = require("./models/User");
const NhanVien = require("./models/NhanVien");
const LopDaoTao = require("./models/LopDaoTao");
const LopDaoTaoNhanVienTam = require("./models/LopDaoTaoNhanVienTam");
const DaTaFix = require("./models/DaTaFix");
const HinhThucCapNhat = require("./models/HinhThucCapNhat");

const BASE_URL =
  process.env.UAT_BASE_URL ||
  `http://localhost:${process.env.PORT || 8000}/api`;
const TEMP_USER_PREFIX = "uat-lopdaotaonhanvientam-temp";
const TEMP_LOP_PREFIX = "UAT-LDTNVT";
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
    HoTen: `UAT LopDaoTaoNhanVienTam ${role}`,
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
    "Khong tao duoc creator va viewer rieng cho probe LopDaoTaoNhanVienTam.",
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
      SoLuong: 3,
      NgayBatDau: new Date().toISOString(),
      NgayKetThuc: new Date().toISOString(),
    },
  };
}

function buildTempDraftPayload(lopId, nhanVienIds) {
  return {
    lopdaotaoID: lopId,
    userID: "spoofed-user",
    lopdaotaonhanvienData: nhanVienIds.map((nhanVienId, index) => ({
      LopDaoTaoID: lopId,
      NhanVienID: String(nhanVienId),
      VaiTro: index === 0 ? "Hoc vien" : "Thu ky",
      UserID: "spoofed-user",
      UserName: "spoofed-name",
    })),
  };
}

function ensureDraftScope({
  items,
  expectedUserId,
  expectedUserName,
  expectedCount,
  lopId,
}) {
  ensure(Array.isArray(items), "Expected response data array.");
  ensure(
    items.length === expectedCount,
    `Expected ${expectedCount} draft entries, got ${items.length}.`,
  );
  ensure(
    items.every((item) => String(item.UserID) === String(expectedUserId)),
    "Response contained draft rows of another user.",
  );
  ensure(
    items.every((item) => String(item.LopDaoTaoID) === String(lopId)),
    "Response contained draft rows of another LopDaoTao.",
  );
  ensure(
    items.every(
      (item) => String(item.UserName || "") === String(expectedUserName || ""),
    ),
    "Response did not preserve current auth username.",
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
    LopDaoTaoNhanVienTam.deleteMany({ LopDaoTaoID: { $in: lopIds } }),
    LopDaoTao.deleteMany({ _id: { $in: lopIds } }),
  ]);
}

async function cleanupTempDraftsForUsers() {
  const tempUsers = await User.find({
    UserName: { $regex: `^${TEMP_USER_PREFIX}-` },
  })
    .select("_id")
    .lean();

  if (tempUsers.length > 0) {
    await LopDaoTaoNhanVienTam.deleteMany({
      UserID: { $in: tempUsers.map((user) => user._id) },
    });
  }
}

async function verifyCleanup() {
  const [users, lopdaotaos] = await Promise.all([
    User.find({ UserName: { $regex: `^${TEMP_USER_PREFIX}-` } })
      .select("_id")
      .lean(),
    LopDaoTao.find({ Ten: { $regex: `^${TEMP_LOP_PREFIX}-` } })
      .select("_id")
      .lean(),
  ]);

  const draftConditions = [];
  if (users.length > 0) {
    draftConditions.push({ UserID: { $in: users.map((user) => user._id) } });
  }
  if (lopdaotaos.length > 0) {
    draftConditions.push({
      LopDaoTaoID: { $in: lopdaotaos.map((lop) => lop._id) },
    });
  }

  const drafts = draftConditions.length
    ? await LopDaoTaoNhanVienTam.find({ $or: draftConditions })
        .select("_id")
        .lean()
    : [];

  return {
    users: users.map((item) => String(item._id)),
    lopdaotaos: lopdaotaos.map((item) => String(item._id)),
    drafts: drafts.map((item) => String(item._id)),
  };
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
    "Khong tim thay KhoaID hop le de tao persona tam cho probe LopDaoTaoNhanVienTam.",
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
    "Khong du NhanVien dang lam viec de tao draft tam.",
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
  await cleanupTempDraftsForUsers();
  await cleanupTempLopDaoTaos();
  await cleanupTempUsers();

  const scenario = await resolveScenario();

  const creatorToken = signToken(scenario.creatorUser._id);
  const adminToken = signToken(scenario.adminUser._id);
  const superadminToken = signToken(scenario.superadminUser._id);
  const daotaoToken = signToken(scenario.daotaoUser._id);
  const viewerToken = signToken(scenario.viewerUser._id);

  console.log("LopDaoTaoNhanVienTam live runtime probe");
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

  const creatorNhanVienId = scenario.nhanVienIds[0];
  const adminNhanVienId = scenario.nhanVienIds[1];
  const superadminNhanVienIds = scenario.nhanVienIds.slice(1, 3);

  await runCase("[BLOCK viewer] POST /lopdaotaonhanvientam", async () => {
    const response = await requestJson("/lopdaotaonhanvientam", {
      method: "POST",
      token: viewerToken,
      body: buildTempDraftPayload(lopId, [creatorNhanVienId]),
    });
    ensure(response.status === 403, `Expected 403, got ${response.status}`);
    return { httpStatus: response.status, message: getErrorMessage(response) };
  });

  await runCase("[BLOCK daotao] POST /lopdaotaonhanvientam", async () => {
    const response = await requestJson("/lopdaotaonhanvientam", {
      method: "POST",
      token: daotaoToken,
      body: buildTempDraftPayload(lopId, [creatorNhanVienId]),
    });
    ensure(response.status === 403, `Expected 403, got ${response.status}`);
    return { httpStatus: response.status, message: getErrorMessage(response) };
  });

  await runCase("[ALLOW creator] POST /lopdaotaonhanvientam", async () => {
    const response = await requestJson("/lopdaotaonhanvientam", {
      method: "POST",
      token: creatorToken,
      body: buildTempDraftPayload(lopId, [creatorNhanVienId]),
    });
    ensure(response.status === 200, `Expected 200, got ${response.status}`);
    ensureDraftScope({
      items: response.json?.data,
      expectedUserId: scenario.creatorUser._id,
      expectedUserName: scenario.creatorUser.UserName,
      expectedCount: 1,
      lopId,
    });
    return {
      httpStatus: response.status,
      draftCount: response.json.data.length,
      scopedUser: String(response.json.data[0].UserID),
    };
  });

  await runCase("[ALLOW admin] POST /lopdaotaonhanvientam", async () => {
    const response = await requestJson("/lopdaotaonhanvientam", {
      method: "POST",
      token: adminToken,
      body: buildTempDraftPayload(lopId, [adminNhanVienId]),
    });
    ensure(response.status === 200, `Expected 200, got ${response.status}`);
    ensureDraftScope({
      items: response.json?.data,
      expectedUserId: scenario.adminUser._id,
      expectedUserName: scenario.adminUser.UserName,
      expectedCount: 1,
      lopId,
    });
    return {
      httpStatus: response.status,
      draftCount: response.json.data.length,
      scopedUser: String(response.json.data[0].UserID),
    };
  });

  await runCase("[ALLOW superadmin] POST /lopdaotaonhanvientam", async () => {
    const response = await requestJson("/lopdaotaonhanvientam", {
      method: "POST",
      token: superadminToken,
      body: buildTempDraftPayload(lopId, superadminNhanVienIds),
    });
    ensure(response.status === 200, `Expected 200, got ${response.status}`);
    ensureDraftScope({
      items: response.json?.data,
      expectedUserId: scenario.superadminUser._id,
      expectedUserName: scenario.superadminUser.UserName,
      expectedCount: 2,
      lopId,
    });
    return {
      httpStatus: response.status,
      draftCount: response.json.data.length,
      scopedUser: String(response.json.data[0].UserID),
    };
  });

  await runCase(
    "[PASS isolation] Drafts stay partitioned by current user",
    async () => {
      const drafts = await LopDaoTaoNhanVienTam.find({
        LopDaoTaoID: lopId,
      }).lean();
      const countsByUser = drafts.reduce((accumulator, item) => {
        const key = String(item.UserID);
        accumulator[key] = (accumulator[key] || 0) + 1;
        return accumulator;
      }, {});

      ensure(
        drafts.length === 4,
        `Expected 4 draft rows in DB, got ${drafts.length}.`,
      );
      ensure(
        countsByUser[String(scenario.creatorUser._id)] === 1,
        "Creator draft count mismatch.",
      );
      ensure(
        countsByUser[String(scenario.adminUser._id)] === 1,
        "Admin draft count mismatch.",
      );
      ensure(
        countsByUser[String(scenario.superadminUser._id)] === 2,
        "Superadmin draft count mismatch.",
      );
      ensure(
        !countsByUser[String(scenario.viewerUser._id)],
        "Viewer unexpectedly owned draft rows.",
      );
      ensure(
        !countsByUser[String(scenario.daotaoUser._id)],
        "Daotao unexpectedly owned draft rows.",
      );

      return {
        draftCount: drafts.length,
        creatorDrafts: countsByUser[String(scenario.creatorUser._id)] || 0,
        adminDrafts: countsByUser[String(scenario.adminUser._id)] || 0,
        superadminDrafts:
          countsByUser[String(scenario.superadminUser._id)] || 0,
      };
    },
  );

  console.table(results);
  const failed = results.filter((item) => item.status === "FAIL");

  if (failed.length > 0) {
    console.error("LopDaoTaoNhanVienTam runtime probe failed:");
    console.table(failed);
    process.exitCode = 1;
    return;
  }

  console.log("LopDaoTaoNhanVienTam runtime probe passed.");
}

main()
  .catch((error) => {
    console.error(error);
    process.exitCode = 1;
  })
  .finally(async () => {
    try {
      await cleanupTempDraftsForUsers();
      await cleanupTempLopDaoTaos();
      await cleanupTempUsers();
      const cleanupState = await verifyCleanup();
      console.log("Cleanup verification:", cleanupState);
      ensure(
        cleanupState.users.length === 0 &&
          cleanupState.lopdaotaos.length === 0 &&
          cleanupState.drafts.length === 0,
        "Cleanup left temporary LopDaoTaoNhanVienTam data behind.",
      );
    } catch (error) {
      console.error("Failed to clean up LopDaoTaoNhanVienTam UAT data:", error);
      process.exitCode = 1;
    }
    await mongoose.disconnect();
  });
