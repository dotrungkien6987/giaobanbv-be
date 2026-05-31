require("dotenv").config();
const mongoose = require("mongoose");
const jwt = require("jsonwebtoken");

const User = require("./models/User");
const NhanVien = require("./models/NhanVien");
const DoanRa = require("./models/DoanRa");
const DoanVao = require("./models/DoanVao");

const BASE_URL =
  process.env.UAT_BASE_URL ||
  `http://localhost:${process.env.PORT || 8000}/api`;
const ALLOWED_ROLES = ["admin", "superadmin", "cntt", "daotao"];
const BLOCKED_ROLES = ["manager", "nomal", "noibo", "qlcl"];
const TEMP_USER_PREFIX = "uat-doanhoptac-routes-temp";
const TEMP_RECORD_PREFIX = "UAT-DOANHOPTAC-ROUTES";

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
    HoTen: `UAT DoanHopTac Routes ${role}`,
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

function nowIsoDate() {
  return new Date().toISOString();
}

function buildMarker(role, family) {
  return `${TEMP_RECORD_PREFIX}-${family}-${role}-${Date.now()}-${Math.floor(
    Math.random() * 10000,
  )}`;
}

function buildDoanRaPayload(nhanVienId, role, marker) {
  return {
    NgayKyVanBan: nowIsoDate(),
    ThanhVien: [
      {
        NhanVienId: String(nhanVienId),
        SoHoChieu: "",
        CoBaoCao: false,
      },
    ],
    SoVanBanChoPhep: marker,
    MucDichXuatCanh: `UAT ${role}`,
    TuNgay: nowIsoDate(),
    DenNgay: nowIsoDate(),
    NguonKinhPhi: "UAT",
    QuocGiaDen: "Nhật Bản",
    GhiChu: marker,
  };
}

function buildDoanVaoPayload(role, marker) {
  return {
    NgayKyVanBan: nowIsoDate(),
    SoVanBanChoPhep: marker,
    MucDichXuatCanh: `UAT ${role}`,
    DonViGioiThieu: "UAT",
    TuNgay: nowIsoDate(),
    DenNgay: nowIsoDate(),
    CoBaoCao: false,
    GhiChu: marker,
    ThanhVien: [
      {
        Ten: `UAT ${role}`,
        NgaySinh: "1990-01-01",
        GioiTinh: 1,
        ChucVu: "Khách mời",
        DonViCongTac: "UAT",
        QuocTich: "Việt Nam",
        SoHoChieu: "",
      },
    ],
  };
}

async function ensureScenarioRecord(Model, family, payloadFactory) {
  let doc = await Model.findOne({ isDeleted: false }).select("_id").lean();
  if (doc) return { id: String(doc._id), seeded: false };

  const marker = buildMarker("seed", family);
  const created = await Model.create(payloadFactory(marker));
  return { id: String(created._id), seeded: true };
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

async function cleanupTempRecords() {
  await Promise.all([
    DoanRa.deleteMany({ GhiChu: { $regex: `^${TEMP_RECORD_PREFIX}-` } }),
    DoanVao.deleteMany({ GhiChu: { $regex: `^${TEMP_RECORD_PREFIX}-` } }),
  ]);
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
    "Khong tim thay KhoaID hop le de tao persona tam cho probe DoanHopTac routes.",
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

  const nhanVien = await NhanVien.findOne({})
    .select("_id")
    .sort({ createdAt: -1 })
    .lean();
  ensure(
    nhanVien?._id,
    "Khong tim thay NhanVien hop le de tao payload DoanRa.",
  );

  const doanRaBase = await ensureScenarioRecord(DoanRa, "doanra", (marker) =>
    buildDoanRaPayload(nhanVien._id, "seed", marker),
  );
  const doanVaoBase = await ensureScenarioRecord(DoanVao, "doanvao", (marker) =>
    buildDoanVaoPayload("seed", marker),
  );

  return {
    allowedUsers: allowedPack.selected,
    blockedUsers: blockedPack.selected,
    provisionedUsers: [
      ...allowedPack.provisionedUsers,
      ...blockedPack.provisionedUsers,
    ],
    nhanVienId: String(nhanVien._id),
    doanRaBaseId: doanRaBase.id,
    doanVaoBaseId: doanVaoBase.id,
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

  console.log("DoanHopTac business routes live runtime probe");
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
  console.log("Route scenarios:", {
    doanRaBaseId: scenario.doanRaBaseId,
    doanVaoBaseId: scenario.doanVaoBaseId,
    nhanVienId: scenario.nhanVienId,
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

  const doanRaReadChecks = [
    {
      label: "GET /doanra",
      path: "/doanra",
      validate: (res) => {
        ensure(res.status === 200, `Expected 200, got ${res.status}`);
        ensure(Array.isArray(res.json?.data), "Expected DoanRa list array.");
        return { httpStatus: res.status, count: res.json.data.length };
      },
    },
    {
      label: "GET /doanra/:id",
      path: `/doanra/${scenario.doanRaBaseId}`,
      validate: (res) => {
        ensure(res.status === 200, `Expected 200, got ${res.status}`);
        ensure(
          String(res.json?.data?._id) === scenario.doanRaBaseId,
          "Unexpected DoanRa detail id.",
        );
        return { httpStatus: res.status, doanRaId: scenario.doanRaBaseId };
      },
    },
    {
      label: "GET /doanra/members",
      path: "/doanra/members?limit=5",
      validate: (res) => {
        ensure(res.status === 200, `Expected 200, got ${res.status}`);
        return { httpStatus: res.status };
      },
    },
    {
      label: "GET /doanra/options",
      path: "/doanra/options",
      validate: (res) => {
        ensure(res.status === 200, `Expected 200, got ${res.status}`);
        return { httpStatus: res.status };
      },
    },
  ];

  const doanVaoReadChecks = [
    {
      label: "GET /doanvao",
      path: "/doanvao",
      validate: (res) => {
        ensure(res.status === 200, `Expected 200, got ${res.status}`);
        ensure(
          Array.isArray(res.json?.data?.doanVaos),
          "Expected DoanVao list array.",
        );
        return {
          httpStatus: res.status,
          count: res.json.data.doanVaos.length,
        };
      },
    },
    {
      label: "GET /doanvao/:id",
      path: `/doanvao/${scenario.doanVaoBaseId}`,
      validate: (res) => {
        ensure(res.status === 200, `Expected 200, got ${res.status}`);
        ensure(
          String(res.json?.data?._id) === scenario.doanVaoBaseId,
          "Unexpected DoanVao detail id.",
        );
        return { httpStatus: res.status, doanVaoId: scenario.doanVaoBaseId };
      },
    },
    {
      label: "GET /doanvao/members",
      path: "/doanvao/members?limit=5",
      validate: (res) => {
        ensure(res.status === 200, `Expected 200, got ${res.status}`);
        return { httpStatus: res.status };
      },
    },
    {
      label: "GET /doanvao/stats",
      path: "/doanvao/stats?year=2026",
      validate: (res) => {
        ensure(res.status === 200, `Expected 200, got ${res.status}`);
        return { httpStatus: res.status };
      },
    },
  ];

  for (const [role, user] of scenario.allowedUsers.entries()) {
    const token = signToken(user._id);

    for (const check of [...doanRaReadChecks, ...doanVaoReadChecks]) {
      await runCase(`[ALLOW ${role}] ${check.label}`, async () => {
        const res = await requestJson(check.path, { token });
        return {
          role,
          userName: user.UserName,
          ...(check.validate(res) || {}),
        };
      });
    }

    await runCase(`[ALLOW ${role}] POST /doanra`, async () => {
      const marker = buildMarker(role, "doanra");
      const createRes = await requestJson("/doanra", {
        method: "POST",
        token,
        body: buildDoanRaPayload(scenario.nhanVienId, role, marker),
      });
      ensure(createRes.status === 200, `Expected 200, got ${createRes.status}`);
      const createdId = String(createRes.json?.data?._id || "");
      ensure(createdId, "DoanRa create response missing id.");

      const updateRes = await requestJson(`/doanra/${createdId}`, {
        method: "PUT",
        token,
        body: { GhiChu: `${marker}-updated` },
      });
      ensure(updateRes.status === 200, `Expected 200, got ${updateRes.status}`);

      const deleteRes = await requestJson(`/doanra/${createdId}`, {
        method: "DELETE",
        token,
      });
      ensure(deleteRes.status === 200, `Expected 200, got ${deleteRes.status}`);

      return { role, userName: user.UserName, httpStatus: createRes.status };
    });

    await runCase(`[ALLOW ${role}] POST /doanvao`, async () => {
      const marker = buildMarker(role, "doanvao");
      const createRes = await requestJson("/doanvao", {
        method: "POST",
        token,
        body: buildDoanVaoPayload(role, marker),
      });
      ensure(createRes.status === 200, `Expected 200, got ${createRes.status}`);
      const createdId = String(createRes.json?.data?._id || "");
      ensure(createdId, "DoanVao create response missing id.");

      const updateRes = await requestJson(`/doanvao/${createdId}`, {
        method: "PUT",
        token,
        body: { GhiChu: `${marker}-updated` },
      });
      ensure(updateRes.status === 200, `Expected 200, got ${updateRes.status}`);

      const deleteRes = await requestJson(`/doanvao/${createdId}`, {
        method: "DELETE",
        token,
      });
      ensure(deleteRes.status === 200, `Expected 200, got ${deleteRes.status}`);

      return { role, userName: user.UserName, httpStatus: createRes.status };
    });
  }

  for (const [role, user] of scenario.blockedUsers.entries()) {
    const token = signToken(user._id);

    for (const check of [...doanRaReadChecks, ...doanVaoReadChecks]) {
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

    await runCase(`[BLOCK ${role}] POST /doanra`, async () => {
      const res = await requestJson("/doanra", {
        method: "POST",
        token,
        body: buildDoanRaPayload(
          scenario.nhanVienId,
          role,
          buildMarker(role, "doanra-blocked"),
        ),
      });
      ensure(res.status === 403, `Expected 403, got ${res.status}`);
      return {
        role,
        userName: user.UserName,
        httpStatus: res.status,
        message: getErrorMessage(res),
      };
    });

    await runCase(`[BLOCK ${role}] PUT /doanra/:id`, async () => {
      const res = await requestJson(`/doanra/${scenario.doanRaBaseId}`, {
        method: "PUT",
        token,
        body: { GhiChu: buildMarker(role, "doanra-put") },
      });
      ensure(res.status === 403, `Expected 403, got ${res.status}`);
      return {
        role,
        userName: user.UserName,
        httpStatus: res.status,
        message: getErrorMessage(res),
      };
    });

    await runCase(`[BLOCK ${role}] DELETE /doanra/:id`, async () => {
      const res = await requestJson(`/doanra/${scenario.doanRaBaseId}`, {
        method: "DELETE",
        token,
      });
      ensure(res.status === 403, `Expected 403, got ${res.status}`);
      return {
        role,
        userName: user.UserName,
        httpStatus: res.status,
        message: getErrorMessage(res),
      };
    });

    await runCase(`[BLOCK ${role}] POST /doanvao`, async () => {
      const res = await requestJson("/doanvao", {
        method: "POST",
        token,
        body: buildDoanVaoPayload(role, buildMarker(role, "doanvao-blocked")),
      });
      ensure(res.status === 403, `Expected 403, got ${res.status}`);
      return {
        role,
        userName: user.UserName,
        httpStatus: res.status,
        message: getErrorMessage(res),
      };
    });

    await runCase(`[BLOCK ${role}] PUT /doanvao/:id`, async () => {
      const res = await requestJson(`/doanvao/${scenario.doanVaoBaseId}`, {
        method: "PUT",
        token,
        body: { GhiChu: buildMarker(role, "doanvao-put") },
      });
      ensure(res.status === 403, `Expected 403, got ${res.status}`);
      return {
        role,
        userName: user.UserName,
        httpStatus: res.status,
        message: getErrorMessage(res),
      };
    });

    await runCase(`[BLOCK ${role}] DELETE /doanvao/:id`, async () => {
      const res = await requestJson(`/doanvao/${scenario.doanVaoBaseId}`, {
        method: "DELETE",
        token,
      });
      ensure(res.status === 403, `Expected 403, got ${res.status}`);
      return {
        role,
        userName: user.UserName,
        httpStatus: res.status,
        message: getErrorMessage(res),
      };
    });
  }

  const failed = results.filter((item) => item.status === "FAIL");
  console.table(results);

  if (failed.length > 0) {
    console.error("DoanHopTac routes runtime probe failed:");
    console.table(failed);
    process.exitCode = 1;
    return;
  }

  console.log("DoanHopTac routes runtime probe passed.");
}

main()
  .catch((error) => {
    console.error(error);
    process.exitCode = 1;
  })
  .finally(async () => {
    try {
      await cleanupTempUsers();
      await cleanupTempRecords();
    } catch (error) {
      console.error(
        "Failed to clean up temporary DoanHopTac route UAT data:",
        error,
      );
      process.exitCode = 1;
    }
    await mongoose.disconnect();
  });
