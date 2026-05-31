require("dotenv").config();
const mongoose = require("mongoose");
const jwt = require("jsonwebtoken");

const User = require("./models/User");
const QuyTrinhISO = require("./models/QuyTrinhISO");
const QuyTrinhISO_KhoaPhanPhoi = require("./models/QuyTrinhISO_KhoaPhanPhoi");

const BASE_URL =
  process.env.UAT_BASE_URL ||
  `http://localhost:${process.env.PORT || 8000}/api`;
const REGULAR_ROLES = ["nomal", "manager", "noibo"];
const QLCL_ROLES = ["qlcl", "admin", "superadmin"];

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

function getItems(response) {
  return response.json?.data?.items || [];
}

function getVersions(response) {
  return response.json?.data?.versions || [];
}

function getSummaryTotal(response) {
  return response.json?.data?.summary?.totalDocuments;
}

async function loadScenario() {
  const qlclUser = await User.findOne({
    PhanQuyen: { $in: QLCL_ROLES },
    mustChangePassword: { $ne: true },
  })
    .select("UserName PhanQuyen KhoaID")
    .lean();

  const regularUsers = await User.find({
    PhanQuyen: { $in: REGULAR_ROLES },
    KhoaID: { $ne: null },
    mustChangePassword: { $ne: true },
  })
    .select("UserName PhanQuyen KhoaID")
    .lean();

  ensure(
    qlclUser,
    "Khong tim thay user qlcl/admin/superadmin co the dung cho UAT.",
  );
  ensure(
    regularUsers.length > 1,
    "Khong du user thuong de lap scenario distributed/unrelated.",
  );

  const distributions = await QuyTrinhISO_KhoaPhanPhoi.find({})
    .select("QuyTrinhISOID KhoaID")
    .lean();
  ensure(
    distributions.length > 0,
    "Khong tim thay du lieu phan phoi QuyTrinhISO.",
  );

  const docIds = [
    ...new Set(distributions.map((item) => String(item.QuyTrinhISOID))),
  ];
  const docs = await QuyTrinhISO.find({
    _id: { $in: docIds },
    IsDeleted: false,
  })
    .select("_id TrangThai MaQuyTrinh PhienBan")
    .lean();
  ensure(
    docs.length > 0,
    "Khong tim thay du lieu QuyTrinhISO hop le trong DB.",
  );

  const docById = new Map(docs.map((doc) => [String(doc._id), doc]));
  const usersByKhoa = new Map();
  for (const user of regularUsers) {
    const key = String(user.KhoaID);
    if (!usersByKhoa.has(key)) {
      usersByKhoa.set(key, []);
    }
    usersByKhoa.get(key).push(user);
  }

  const khoaDocs = new Map();
  const docKhoaMap = new Map();
  for (const item of distributions) {
    const docId = String(item.QuyTrinhISOID);
    const khoaId = String(item.KhoaID);
    const doc = docById.get(docId);
    if (!doc) continue;

    if (!docKhoaMap.has(docId)) {
      docKhoaMap.set(docId, new Set());
    }
    docKhoaMap.get(docId).add(khoaId);

    if (!khoaDocs.has(khoaId)) {
      khoaDocs.set(khoaId, { active: null, inactive: null });
    }

    const bucket = khoaDocs.get(khoaId);
    if (doc.TrangThai === "ACTIVE" && !bucket.active) {
      bucket.active = doc;
    }
    if (doc.TrangThai === "INACTIVE" && !bucket.inactive) {
      bucket.inactive = doc;
    }
  }

  let distributedScenario = null;
  for (const [khoaId, bucket] of khoaDocs.entries()) {
    if (bucket.active && bucket.inactive && usersByKhoa.has(khoaId)) {
      distributedScenario = {
        user: usersByKhoa.get(khoaId)[0],
        activeDoc: bucket.active,
        inactiveDoc: bucket.inactive,
      };
      break;
    }
  }
  if (!distributedScenario) {
    for (const [khoaId, bucket] of khoaDocs.entries()) {
      if (bucket.active && usersByKhoa.has(khoaId)) {
        distributedScenario = {
          user: usersByKhoa.get(khoaId)[0],
          activeDoc: bucket.active,
          inactiveDoc: bucket.inactive,
        };
        break;
      }
    }
  }

  ensure(
    distributedScenario,
    "Khong tim thay user thuong + quy trinh ACTIVE duoc phan phoi cho khoa cua user.",
  );

  const distributedKhoaId = String(distributedScenario.user.KhoaID);
  const isDocDistributedToKhoa = (doc, khoaId) => {
    if (!doc) return false;
    return docKhoaMap.get(String(doc._id))?.has(String(khoaId)) || false;
  };

  let unrelatedUser = regularUsers.find(
    (user) =>
      String(user.KhoaID) !== distributedKhoaId &&
      !isDocDistributedToKhoa(distributedScenario.activeDoc, user.KhoaID),
  );
  if (!unrelatedUser) {
    unrelatedUser = regularUsers.find(
      (user) => String(user.KhoaID) !== distributedKhoaId,
    );
  }
  ensure(unrelatedUser, "Khong tim thay user unrelated o khoa khac.");

  let unrelatedActiveDoc = distributedScenario.activeDoc;
  if (isDocDistributedToKhoa(unrelatedActiveDoc, unrelatedUser.KhoaID)) {
    unrelatedActiveDoc =
      docs.find(
        (doc) =>
          doc.TrangThai === "ACTIVE" &&
          !isDocDistributedToKhoa(doc, unrelatedUser.KhoaID),
      ) || null;
  }
  ensure(
    unrelatedActiveDoc,
    "Khong tim thay quy trinh ACTIVE cua khoa khac de test user unrelated.",
  );

  let unrelatedInactiveDoc = distributedScenario.inactiveDoc;
  if (
    unrelatedInactiveDoc &&
    isDocDistributedToKhoa(unrelatedInactiveDoc, unrelatedUser.KhoaID)
  ) {
    unrelatedInactiveDoc =
      docs.find(
        (doc) =>
          doc.TrangThai === "INACTIVE" &&
          !isDocDistributedToKhoa(doc, unrelatedUser.KhoaID),
      ) || null;
  }

  return {
    qlclUser,
    distributedUser: distributedScenario.user,
    unrelatedUser,
    activeDistributedDoc: distributedScenario.activeDoc,
    inactiveDistributedDoc: distributedScenario.inactiveDoc,
    unrelatedActiveDoc,
    unrelatedInactiveDoc,
  };
}

async function main() {
  await mongoose.connect(process.env.MONGODB_URI);
  const scenario = await loadScenario();

  const qlclToken = signToken(scenario.qlclUser._id);
  const distributedToken = signToken(scenario.distributedUser._id);
  const unrelatedToken = signToken(scenario.unrelatedUser._id);

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

  let qlclStatsTotal = null;
  let distributedStatsTotal = null;
  let unrelatedStatsTotal = null;

  await runCase("QLCL list sees non-deleted documents", async () => {
    const res = await requestJson("/quytrinhiso?size=500", {
      token: qlclToken,
    });
    ensure(res.status === 200, `Expected 200, got ${res.status}`);
    const items = getItems(res);
    ensure(items.length > 0, "QLCL list returned no items.");
    return { httpStatus: res.status, count: items.length };
  });

  await runCase("QLCL statistics", async () => {
    const res = await requestJson("/quytrinhiso/statistics", {
      token: qlclToken,
    });
    ensure(res.status === 200, `Expected 200, got ${res.status}`);
    qlclStatsTotal = getSummaryTotal(res);
    ensure(
      typeof qlclStatsTotal === "number",
      "Missing statistics summary totalDocuments.",
    );
    return { httpStatus: res.status, totalDocuments: qlclStatsTotal };
  });

  if (scenario.inactiveDistributedDoc) {
    await runCase("QLCL can read inactive detail", async () => {
      const res = await requestJson(
        `/quytrinhiso/${scenario.inactiveDistributedDoc._id}`,
        { token: qlclToken },
      );
      ensure(res.status === 200, `Expected 200, got ${res.status}`);
      ensure(
        String(res.json?.data?.quyTrinh?._id) ===
          String(scenario.inactiveDistributedDoc._id),
        "Inactive detail payload did not match selected document.",
      );
      return { httpStatus: res.status };
    });

    await runCase("QLCL can read inactive versions", async () => {
      const res = await requestJson(
        `/quytrinhiso/${scenario.inactiveDistributedDoc._id}/versions`,
        { token: qlclToken },
      );
      ensure(res.status === 200, `Expected 200, got ${res.status}`);
      const versions = getVersions(res);
      ensure(versions.length > 0, "QLCL versions returned no rows.");
      return { httpStatus: res.status, versions: versions.length };
    });
  } else {
    skipCase(
      "QLCL inactive detail/versions",
      "Khong tim thay inactive doc duoc phan phoi trong DB hien tai.",
    );
  }

  await runCase("Distributed user list scope", async () => {
    const res = await requestJson("/quytrinhiso?size=500", {
      token: distributedToken,
    });
    ensure(res.status === 200, `Expected 200, got ${res.status}`);
    const items = getItems(res);
    ensure(
      items.some(
        (item) =>
          String(item._id) === String(scenario.activeDistributedDoc._id),
      ),
      "Active distributed doc was not visible in regular user list.",
    );
    if (scenario.inactiveDistributedDoc) {
      ensure(
        !items.some(
          (item) =>
            String(item._id) === String(scenario.inactiveDistributedDoc._id),
        ),
        "Inactive distributed doc still appeared in regular user list.",
      );
    }
    return { httpStatus: res.status, count: items.length };
  });

  await runCase("Distributed user can read active detail", async () => {
    const res = await requestJson(
      `/quytrinhiso/${scenario.activeDistributedDoc._id}`,
      { token: distributedToken },
    );
    ensure(res.status === 200, `Expected 200, got ${res.status}`);
    return { httpStatus: res.status };
  });

  await runCase("Distributed user versions are ACTIVE only", async () => {
    const res = await requestJson(
      `/quytrinhiso/${scenario.activeDistributedDoc._id}/versions`,
      { token: distributedToken },
    );
    ensure(res.status === 200, `Expected 200, got ${res.status}`);
    const versions = getVersions(res);
    ensure(versions.length > 0, "Regular user versions returned no rows.");
    ensure(
      versions.every((version) => version.TrangThai === "ACTIVE"),
      "Regular user received non-ACTIVE versions.",
    );
    return { httpStatus: res.status, versions: versions.length };
  });

  if (scenario.inactiveDistributedDoc) {
    await runCase("Distributed user cannot read inactive detail", async () => {
      const res = await requestJson(
        `/quytrinhiso/${scenario.inactiveDistributedDoc._id}`,
        { token: distributedToken },
      );
      ensure(res.status === 403, `Expected 403, got ${res.status}`);
      return { httpStatus: res.status };
    });

    await runCase(
      "Distributed user cannot read inactive versions",
      async () => {
        const res = await requestJson(
          `/quytrinhiso/${scenario.inactiveDistributedDoc._id}/versions`,
          { token: distributedToken },
        );
        ensure(res.status === 403, `Expected 403, got ${res.status}`);
        return { httpStatus: res.status };
      },
    );
  } else {
    skipCase(
      "Distributed user inactive guards",
      "Khong co inactive distributed doc de retest guard detail/versions.",
    );
  }

  await runCase("Distributed user statistics", async () => {
    const res = await requestJson("/quytrinhiso/statistics", {
      token: distributedToken,
    });
    ensure(res.status === 200, `Expected 200, got ${res.status}`);
    distributedStatsTotal = getSummaryTotal(res);
    ensure(
      typeof distributedStatsTotal === "number",
      "Missing regular-user statistics summary totalDocuments.",
    );
    if (typeof qlclStatsTotal === "number") {
      ensure(
        distributedStatsTotal <= qlclStatsTotal,
        "Regular-user statistics exceeded QLCL totalDocuments.",
      );
    }
    return { httpStatus: res.status, totalDocuments: distributedStatsTotal };
  });

  await runCase(
    "Unrelated user cannot read other department active detail",
    async () => {
      const res = await requestJson(
        `/quytrinhiso/${scenario.unrelatedActiveDoc._id}`,
        {
          token: unrelatedToken,
        },
      );
      ensure(res.status === 403, `Expected 403, got ${res.status}`);
      return { httpStatus: res.status };
    },
  );

  await runCase(
    "Unrelated user cannot read other department active versions",
    async () => {
      const res = await requestJson(
        `/quytrinhiso/${scenario.unrelatedActiveDoc._id}/versions`,
        { token: unrelatedToken },
      );
      ensure(res.status === 403, `Expected 403, got ${res.status}`);
      return { httpStatus: res.status };
    },
  );

  if (scenario.unrelatedInactiveDoc) {
    await runCase("Unrelated user cannot read inactive detail", async () => {
      const res = await requestJson(
        `/quytrinhiso/${scenario.unrelatedInactiveDoc._id}`,
        { token: unrelatedToken },
      );
      ensure(res.status === 403, `Expected 403, got ${res.status}`);
      return { httpStatus: res.status };
    });
  } else {
    skipCase(
      "Unrelated user inactive detail guard",
      "Khong tim thay inactive doc ngoai scope cua user unrelated.",
    );
  }

  await runCase("Unrelated user statistics", async () => {
    const res = await requestJson("/quytrinhiso/statistics", {
      token: unrelatedToken,
    });
    ensure(res.status === 200, `Expected 200, got ${res.status}`);
    unrelatedStatsTotal = getSummaryTotal(res);
    ensure(
      typeof unrelatedStatsTotal === "number",
      "Missing unrelated-user statistics summary totalDocuments.",
    );
    if (typeof qlclStatsTotal === "number") {
      ensure(
        unrelatedStatsTotal <= qlclStatsTotal,
        "Unrelated-user statistics exceeded QLCL totalDocuments.",
      );
    }
    return { httpStatus: res.status, totalDocuments: unrelatedStatsTotal };
  });

  await runCase("Unrelated user create is rejected", async () => {
    const res = await requestJson("/quytrinhiso", {
      method: "POST",
      token: unrelatedToken,
      body: {},
    });
    ensure(res.status === 403, `Expected 403, got ${res.status}`);
    return { httpStatus: res.status };
  });

  await runCase("Unrelated user distribution update is rejected", async () => {
    const res = await requestJson(
      `/quytrinhiso/${scenario.activeDistributedDoc._id}/distribution`,
      {
        method: "PUT",
        token: unrelatedToken,
        body: { khoaPhanPhoiIds: [] },
      },
    );
    ensure(res.status === 403, `Expected 403, got ${res.status}`);
    return { httpStatus: res.status };
  });

  const summary = {
    baseUrl: BASE_URL,
    personas: {
      qlclUser: {
        userName: scenario.qlclUser.UserName,
        role: scenario.qlclUser.PhanQuyen,
      },
      distributedUser: {
        userName: scenario.distributedUser.UserName,
        role: scenario.distributedUser.PhanQuyen,
        khoaId: String(scenario.distributedUser.KhoaID),
      },
      unrelatedUser: {
        userName: scenario.unrelatedUser.UserName,
        role: scenario.unrelatedUser.PhanQuyen,
        khoaId: String(scenario.unrelatedUser.KhoaID),
      },
    },
    docs: {
      activeDistributedDoc: {
        id: String(scenario.activeDistributedDoc._id),
        maQuyTrinh: scenario.activeDistributedDoc.MaQuyTrinh,
        phienBan: scenario.activeDistributedDoc.PhienBan,
      },
      inactiveDistributedDoc: scenario.inactiveDistributedDoc
        ? {
            id: String(scenario.inactiveDistributedDoc._id),
            maQuyTrinh: scenario.inactiveDistributedDoc.MaQuyTrinh,
            phienBan: scenario.inactiveDistributedDoc.PhienBan,
          }
        : null,
      unrelatedActiveDoc: {
        id: String(scenario.unrelatedActiveDoc._id),
        maQuyTrinh: scenario.unrelatedActiveDoc.MaQuyTrinh,
        phienBan: scenario.unrelatedActiveDoc.PhienBan,
      },
    },
    totals: {
      qlclStatsTotal,
      distributedStatsTotal,
      unrelatedStatsTotal,
    },
  };

  console.log("UAT scenario:");
  console.log(JSON.stringify(summary, null, 2));
  console.table(results);

  const failed = results.filter((item) => item.status === "FAIL");
  if (failed.length > 0) {
    process.exitCode = 1;
  }

  await mongoose.disconnect();
}

main().catch(async (error) => {
  console.error("QuyTrinhISO live UAT probe failed.");
  console.error(error);
  try {
    await mongoose.disconnect();
  } catch (disconnectError) {}
  process.exitCode = 1;
});
