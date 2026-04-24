/**
 * CORS Configuration
 *
 * Shared whitelist for Express and Socket.IO
 * Centralized here to avoid circular dependencies
 */

const LEGACY_WHITELIST = [
  "http://192.168.5.200:3001",
  "https://bvdktphutho.net",
  "http://bvdktphutho.net",
  "http://192.168.5.200:3000",
  "http://localhost:3000",
  "http://localhost:3001",
  "http://192.168.1.248:3000",
  "http://27.72.116.110:777",
  "http://27.72.116.110:8443",
  "http://bvdkphutho.io.vn:8443",
  "http://bvdkphutho.io.vn:777",
  "http://api.bvdkphutho.io.vn",
];

const parseOrigins = (rawValue = "") =>
  String(rawValue)
    .split(",")
    .map((origin) => origin.trim())
    .filter(Boolean);

const getAllowedOrigins = () => {
  const configuredOrigins = parseOrigins(
    process.env.CORS_ORIGINS || process.env.CORS_ORIGIN || "",
  );

  return configuredOrigins.length > 0 ? configuredOrigins : LEGACY_WHITELIST;
};

const whitelist = getAllowedOrigins();

/**
 * Express CORS options delegate
 */
const corsOptionsDelegate = function (req, callback) {
  const allowedOrigins = getAllowedOrigins();
  var corsOptions;
  if (allowedOrigins.indexOf(req.header("Origin")) !== -1) {
    corsOptions = { origin: true };
  } else {
    corsOptions = { origin: false };
  }
  callback(null, corsOptions);
};

module.exports = {
  whitelist,
  corsOptionsDelegate,
  getAllowedOrigins,
};
