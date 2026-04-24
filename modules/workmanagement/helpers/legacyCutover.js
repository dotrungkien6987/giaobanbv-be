const { sendResponse } = require("../../../helpers/utils");

const WRITE_METHODS = new Set(["POST", "PUT", "PATCH", "DELETE"]);

const DOMAIN_LABELS = {
  yeucau: "Yêu cầu",
  congviec: "Công việc",
  kpi: "KPI",
  notifications: "Thông báo",
};

const NOTIFICATION_TYPE_PREFIXES = [
  { prefix: "yeucau-", domain: "yeucau" },
  { prefix: "congviec-", domain: "congviec" },
  { prefix: "kpi-", domain: "kpi" },
];

const parseBooleanEnv = (name, defaultValue = false) => {
  const rawValue = process.env[name];

  if (rawValue === undefined) {
    return defaultValue;
  }

  return ["1", "true", "yes", "on"].includes(
    String(rawValue).trim().toLowerCase(),
  );
};

const normalizeDomain = (value) => {
  const normalized = String(value || "")
    .trim()
    .toLowerCase()
    .replace(/[\s_]+/g, "-");

  switch (normalized) {
    case "yeu-cau":
    case "yeucau":
      return "yeucau";
    case "cong-viec":
    case "congviec":
      return "congviec";
    case "kpi":
      return "kpi";
    case "thong-bao":
    case "thongbao":
    case "notification":
    case "notifications":
      return "notifications";
    case "*":
    case "all":
      return "*";
    default:
      return normalized;
  }
};

const getManagedDomains = () => {
  const rawValue = process.env.WM_V2_OWNED_DOMAINS || "";

  return new Set(rawValue.split(",").map(normalizeDomain).filter(Boolean));
};

const hasAnyManagedDomain = (domains) => {
  return domains.some((domain) => isManagedDomain(domain));
};

const getAccessMode = () => {
  const rawMode = String(process.env.WM_V2_ACCESS_MODE || "readonly")
    .trim()
    .toLowerCase();

  if (rawMode === "off") {
    return "off";
  }

  return "readonly";
};

const isManagedDomain = (domain) => {
  const normalizedDomain = normalizeDomain(domain);

  if (!normalizedDomain) {
    return false;
  }

  const managedDomains = getManagedDomains();
  return managedDomains.has("*") || managedDomains.has(normalizedDomain);
};

const shouldBlockRequest = (req, domain) => {
  if (!isManagedDomain(domain)) {
    return false;
  }

  if (req.method === "OPTIONS") {
    return false;
  }

  const accessMode = getAccessMode();

  if (accessMode === "off") {
    return true;
  }

  return WRITE_METHODS.has(req.method);
};

const buildMessage = (domain) => {
  const normalizedDomain = normalizeDomain(domain);
  const label = DOMAIN_LABELS[normalizedDomain] || normalizedDomain;

  if (getAccessMode() === "off") {
    return `${label} đã chuyển sang V2. Vui lòng thao tác trên hệ thống mới.`;
  }

  return `${label} đã chuyển sang V2 và chỉ còn xem trên V1. Vui lòng thao tác trên hệ thống mới.`;
};

const createCutoverGuard = (domainOrResolver) => (req, res, next) => {
  const resolvedDomain =
    typeof domainOrResolver === "function"
      ? domainOrResolver(req)
      : domainOrResolver;

  if (!shouldBlockRequest(req, resolvedDomain)) {
    return next();
  }

  const message = buildMessage(resolvedDomain);

  return sendResponse(res, 403, false, null, { message }, message);
};

const getDomainForNotificationType = (type) => {
  const normalizedType = String(type || "")
    .trim()
    .toLowerCase();

  if (!normalizedType) {
    return null;
  }

  const matched = NOTIFICATION_TYPE_PREFIXES.find(({ prefix }) =>
    normalizedType.startsWith(prefix),
  );

  return matched ? matched.domain : null;
};

const shouldDisableLegacyJobs = () => {
  return (
    parseBooleanEnv("WM_V2_DISABLE_LEGACY_JOBS", false) &&
    hasAnyManagedDomain(["yeucau", "congviec", "kpi", "*"])
  );
};

const shouldDisableLegacyRealtime = () => {
  return (
    parseBooleanEnv("WM_V2_DISABLE_LEGACY_REALTIME", false) &&
    hasAnyManagedDomain(["yeucau", "congviec", "kpi", "notifications", "*"])
  );
};

const shouldBypassNotificationType = (type) => {
  if (!parseBooleanEnv("WM_V2_DISABLE_LEGACY_NOTIFICATIONS", false)) {
    return false;
  }

  const domain = getDomainForNotificationType(type);
  return domain ? isManagedDomain(domain) : false;
};

module.exports = {
  createCutoverGuard,
  isManagedDomain,
  normalizeDomain,
  shouldDisableLegacyJobs,
  shouldDisableLegacyRealtime,
  shouldBypassNotificationType,
};
