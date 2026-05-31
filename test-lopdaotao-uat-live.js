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
const TEMP_USER_PREFIX = "uat-lopdaotao-temp";
const TEMP_LOP_PREFIX = "UAT-LDTAO";
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
    HoTen: `UAT LopDaoTao ${role}`,
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
    "Khong tao duoc creator va viewer rieng cho probe LopDaoTao.",
  );

  return { creatorUser, viewerUser, provisioned };
}

function buildLopDaoTaoPayload(
  marker,
  hinhThucCapNhatMa,
  spoofedOwner = "spoofed-owner",
) {
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
      SoLuong: 1,
      UserIDCreated: spoofedOwner,
      NgayBatDau: new Date().toISOString(),
      NgayKetThuc: new Date().toISOString(),
    },
  };
}

function buildUpdatePayload(lopId, marker, hinhThucCapNhatMa) {
  return {
    _id: lopId,
    Ten: `${marker}-Updated`,
    SoLuong: 1,
    MaHinhThucCapNhat: hinhThucCapNhatMa,
    NoiDaoTao: "UAT",
    NguonKinhPhi: "UAT",
    HinhThucDaoTao: "UAT",
    QuyetDinh: marker,
    GhiChu: `${marker}-updated`,
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

async function verifyCleanup() {
  const [users, lopdaotaos, drafts] = await Promise.all([
    User.find({ UserName: { $regex: `^${TEMP_USER_PREFIX}-` } })
      .select("_id")
      .lean(),
    LopDaoTao.find({ Ten: { $regex: `^${TEMP_LOP_PREFIX}-` } })
      .select("_id")
      .lean(),
    LopDaoTaoNhanVienTam.find({}).select("_id LopDaoTaoID").lean(),
  ]);

  const tempLopIds = new Set(lopdaotaos.map((item) => String(item._id)));
  const remainingDrafts = drafts
    .filter((item) => tempLopIds.has(String(item.LopDaoTaoID)))
    .map((item) => String(item._id));

  return {
    users: users.map((item) => String(item._id)),
    lopdaotaos: lopdaotaos.map((item) => String(item._id)),
    drafts: remainingDrafts,
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
    "Khong tim thay KhoaID hop le de tao persona tam cho probe LopDaoTao.",
  );

  const provisionedUsers = [];
  const adminPack = await ensureUserByRole(users, "admin", fallbackUser.KhoaID);
  const superadminPack = await ensureUserByRole(
    users,
    "superadmin",
    fallbackUser.KhoaID,
  );
  const regularPack = await ensureRegularUsers(users, fallbackUser.KhoaID);

  for (const pack of [adminPack, superadminPack]) {
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
    .limit(2)
    .lean();
  ensure(
    nhanViens.length >= 1,
    "Khong du NhanVien dang lam viec de seed temp sync data.",
  );

  return {
    adminUser: adminPack.user,
    superadminUser: superadminPack.user,
    creatorUser: regularPack.creatorUser,
    viewerUser: regularPack.viewerUser,
    provisionedUsers,
    hinhThucCapNhatMa: matchedHinhThuc.Ma,
    nhanVienId: String(nhanViens[0]._id),
  };
}

async function main() {
  await mongoose.connect(process.env.MONGODB_URI);
  await cleanupTempLopDaoTaos();
  await cleanupTempUsers();

  const scenario = await resolveScenario();

  const creatorToken = signToken(scenario.creatorUser._id);
  const viewerToken = signToken(scenario.viewerUser._id);
  const adminToken = signToken(scenario.adminUser._id);
  const superadminToken = signToken(scenario.superadminUser._id);

  console.log("LopDaoTao live runtime probe");
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

  const viewerMarker = buildMarker("viewer-create");
  const creatorMarker = buildMarker("creator-main");

  const results = [];
  const runCase = async (name, fn) => {
    try {
      const detail = await fn();
      results.push({ name, status: "PASS", ...detail });
    } catch (error) {
      results.push({ name, status: "FAIL", detail: error.message });
    }
  };

  let viewerLopId = null;
  let creatorLopId = null;

  await runCase("[ALLOW viewer] POST /lopdaotao", async () => {
    const response = await requestJson("/lopdaotao", {
      method: "POST",
      token: viewerToken,
      body: buildLopDaoTaoPayload(viewerMarker, scenario.hinhThucCapNhatMa),
    });
    ensure(response.status === 200, `Expected 200, got ${response.status}`);
    viewerLopId = String(response.json?.data?._id || "");
    ensure(viewerLopId, "Viewer create response missing LopDaoTao id.");
    const saved = await LopDaoTao.findById(viewerLopId).lean();
    ensure(saved, "Viewer-created LopDaoTao not found in DB.");
    ensure(
      String(saved.UserIDCreated) === String(scenario.viewerUser._id),
      "Viewer create still trusted spoofed UserIDCreated.",
    );
    return {
      httpStatus: response.status,
      lopId: viewerLopId,
      owner: String(saved.UserIDCreated),
    };
  });

  await runCase("[ALLOW creator] POST /lopdaotao", async () => {
    const response = await requestJson("/lopdaotao", {
      method: "POST",
      token: creatorToken,
      body: buildLopDaoTaoPayload(creatorMarker, scenario.hinhThucCapNhatMa),
    });
    ensure(response.status === 200, `Expected 200, got ${response.status}`);
    creatorLopId = String(response.json?.data?._id || "");
    ensure(creatorLopId, "Creator create response missing LopDaoTao id.");
    const saved = await LopDaoTao.findById(creatorLopId).lean();
    ensure(saved, "Creator-created LopDaoTao not found in DB.");
    ensure(
      String(saved.UserIDCreated) === String(scenario.creatorUser._id),
      "Creator create still trusted spoofed UserIDCreated.",
    );

    await LopDaoTaoNhanVienTam.insertMany([
      {
        LopDaoTaoID: creatorLopId,
        NhanVienID: scenario.nhanVienId,
        UserID: scenario.creatorUser._id,
        UserName: scenario.creatorUser.UserName,
        VaiTro: "Hoc vien",
      },
      {
        LopDaoTaoID: creatorLopId,
        NhanVienID: scenario.nhanVienId,
        UserID: scenario.viewerUser._id,
        UserName: scenario.viewerUser.UserName,
        VaiTro: "Hoc vien",
      },
    ]);

    return {
      httpStatus: response.status,
      lopId: creatorLopId,
      owner: String(saved.UserIDCreated),
    };
  });

  await runCase("[BLOCK viewer] PUT /lopdaotao", async () => {
    const response = await requestJson("/lopdaotao", {
      method: "PUT",
      token: viewerToken,
      body: buildUpdatePayload(
        creatorLopId,
        creatorMarker,
        scenario.hinhThucCapNhatMa,
      ),
    });
    ensure(response.status === 403, `Expected 403, got ${response.status}`);
    return { httpStatus: response.status, message: getErrorMessage(response) };
  });

  await runCase("[ALLOW creator] PUT /lopdaotao", async () => {
    const response = await requestJson("/lopdaotao", {
      method: "PUT",
      token: creatorToken,
      body: buildUpdatePayload(
        creatorLopId,
        creatorMarker,
        scenario.hinhThucCapNhatMa,
      ),
    });
    ensure(response.status === 200, `Expected 200, got ${response.status}`);
    ensure(
      String(response.json?.data?._id) === creatorLopId,
      "Creator update response returned wrong LopDaoTao id.",
    );
    return { httpStatus: response.status, lopId: creatorLopId };
  });

  await runCase("[BLOCK viewer] PUT /lopdaotao/trangthai", async () => {
    const response = await requestJson("/lopdaotao/trangthai", {
      method: "PUT",
      token: viewerToken,
      body: { lopdaotaoID: creatorLopId, TrangThai: true },
    });
    ensure(response.status === 403, `Expected 403, got ${response.status}`);
    return { httpStatus: response.status, message: getErrorMessage(response) };
  });

  await runCase("[ALLOW admin] PUT /lopdaotao/trangthai", async () => {
    const response = await requestJson("/lopdaotao/trangthai", {
      method: "PUT",
      token: adminToken,
      body: { lopdaotaoID: creatorLopId, TrangThai: true },
    });
    ensure(response.status === 200, `Expected 200, got ${response.status}`);
    ensure(
      response.json?.data?.TrangThai === true,
      "Admin status update did not persist TrangThai=true.",
    );
    return {
      httpStatus: response.status,
      trangThai: response.json.data.TrangThai,
    };
  });

  await runCase("[BLOCK viewer] PUT /lopdaotao/updatehoidong", async () => {
    const response = await requestJson("/lopdaotao/updatehoidong", {
      method: "PUT",
      token: viewerToken,
      body: {
        lopdaotaoID: creatorLopId,
        hoidongID: String(new mongoose.Types.ObjectId()),
      },
    });
    ensure(response.status === 403, `Expected 403, got ${response.status}`);
    return { httpStatus: response.status, message: getErrorMessage(response) };
  });

  await runCase("[ALLOW superadmin] PUT /lopdaotao/updatehoidong", async () => {
    const hoiDongId = String(new mongoose.Types.ObjectId());
    const response = await requestJson("/lopdaotao/updatehoidong", {
      method: "PUT",
      token: superadminToken,
      body: { lopdaotaoID: creatorLopId, hoidongID: hoiDongId },
    });
    ensure(response.status === 200, `Expected 200, got ${response.status}`);
    ensure(
      String(response.json?.data?.HoiDongID) === hoiDongId,
      "Superadmin updateHoiDong response returned wrong HoiDongID.",
    );
    return { httpStatus: response.status, hoiDongId };
  });

  await runCase(
    "[BLOCK viewer] GET /lopdaotao/dongbothanhvientam/:id",
    async () => {
      const response = await requestJson(
        `/lopdaotao/dongbothanhvientam/${creatorLopId}`,
        {
          token: viewerToken,
        },
      );
      ensure(response.status === 403, `Expected 403, got ${response.status}`);
      return {
        httpStatus: response.status,
        message: getErrorMessage(response),
      };
    },
  );

  await runCase(
    "[ALLOW admin] GET /lopdaotao/dongbothanhvientam/:id",
    async () => {
      const response = await requestJson(
        `/lopdaotao/dongbothanhvientam/${creatorLopId}`,
        {
          token: adminToken,
        },
      );
      ensure(response.status === 200, `Expected 200, got ${response.status}`);
      ensure(
        Array.isArray(response.json?.data),
        "Expected sync response array.",
      );
      ensure(
        response.json.data.length === 1,
        `Expected 1 unique temp member, got ${response.json.data.length}.`,
      );
      return {
        httpStatus: response.status,
        uniqueMembers: response.json.data.length,
      };
    },
  );

  await runCase("[BLOCK viewer] DELETE /lopdaotao/:id", async () => {
    const response = await requestJson(`/lopdaotao/${creatorLopId}`, {
      method: "DELETE",
      token: viewerToken,
    });
    ensure(response.status === 403, `Expected 403, got ${response.status}`);
    return { httpStatus: response.status, message: getErrorMessage(response) };
  });

  await runCase("[ALLOW superadmin] DELETE /lopdaotao/:id", async () => {
    const response = await requestJson(`/lopdaotao/${viewerLopId}`, {
      method: "DELETE",
      token: superadminToken,
    });
    ensure(response.status === 200, `Expected 200, got ${response.status}`);
    const saved = await LopDaoTao.findById(viewerLopId)
      .select("+isDeleted")
      .lean();
    ensure(
      saved?.isDeleted === true,
      "Superadmin delete did not soft-delete viewer LopDaoTao.",
    );
    return { httpStatus: response.status, lopId: viewerLopId };
  });

  await runCase("[ALLOW creator] DELETE /lopdaotao/:id", async () => {
    const response = await requestJson(`/lopdaotao/${creatorLopId}`, {
      method: "DELETE",
      token: creatorToken,
    });
    ensure(response.status === 200, `Expected 200, got ${response.status}`);
    const saved = await LopDaoTao.findById(creatorLopId)
      .select("+isDeleted")
      .lean();
    ensure(
      saved?.isDeleted === true,
      "Creator delete did not soft-delete own LopDaoTao.",
    );
    return { httpStatus: response.status, lopId: creatorLopId };
  });

  console.table(results);
  const failed = results.filter((item) => item.status === "FAIL");

  if (failed.length > 0) {
    console.error("LopDaoTao runtime probe failed:");
    console.table(failed);
    process.exitCode = 1;
    return;
  }

  console.log("LopDaoTao runtime probe passed.");
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
      const cleanupState = await verifyCleanup();
      console.log("Cleanup verification:", cleanupState);
      ensure(
        cleanupState.users.length === 0 &&
          cleanupState.lopdaotaos.length === 0 &&
          cleanupState.drafts.length === 0,
        "Cleanup left temporary LopDaoTao data behind.",
      );
    } catch (error) {
      console.error("Failed to clean up LopDaoTao UAT data:", error);
      process.exitCode = 1;
    }
    await mongoose.disconnect();
  });
