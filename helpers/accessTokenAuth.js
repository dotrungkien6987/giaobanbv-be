const jwt = require("jsonwebtoken");

const { AppError } = require("./utils");
const RevokedToken = require("../models/RevokedToken");

function getJwtSecret() {
  return process.env.JWT_SECRET_KEY || process.env.JWT_SECRET;
}

function createAuthenticationError(message) {
  return new AppError(401, message, "Authentication Error");
}

function normalizeTokenString(tokenString) {
  if (typeof tokenString !== "string") {
    throw createAuthenticationError("Login required");
  }

  const trimmedToken = tokenString.trim();

  if (!trimmedToken) {
    throw createAuthenticationError("Login required");
  }

  if (/^Bearer\s+/i.test(trimmedToken)) {
    return trimmedToken.replace(/^Bearer\s+/i, "").trim();
  }

  return trimmedToken;
}

async function ensureTokenNotRevoked(payload, options = {}) {
  const { allowRevoked = false } = options;

  if (!payload?.jti) {
    return false;
  }

  const revokedToken = await RevokedToken.findOne({ jti: payload.jti })
    .select("_id")
    .lean();

  if (revokedToken && !allowRevoked) {
    throw createAuthenticationError("Token has been revoked");
  }

  return Boolean(revokedToken);
}

async function authenticateAccessToken(tokenString, options = {}) {
  const { allowRevoked = false } = options;
  const rawToken = normalizeTokenString(tokenString);

  let payload;
  try {
    payload = jwt.verify(rawToken, getJwtSecret());
  } catch (error) {
    if (error.name === "TokenExpiredError") {
      throw new AppError(401, "Token expired", "Authenticate Error");
    }
    throw createAuthenticationError("Token is invalid");
  }

  const isRevoked = await ensureTokenNotRevoked(payload, { allowRevoked });

  return {
    rawToken,
    payload,
    userId: payload?._id || null,
    jti: payload?.jti || null,
    exp: payload?.exp || null,
    expiresAt: payload?.exp ? new Date(payload.exp * 1000) : null,
    isLegacyToken: !payload?.jti,
    isRevoked,
  };
}

async function revokeAuthContext(authContext, options = {}) {
  if (!authContext?.jti || !authContext?.expiresAt) {
    return {
      revoked: false,
      reason: "legacy-token",
    };
  }

  const writeResult = await RevokedToken.updateOne(
    { jti: authContext.jti },
    {
      $setOnInsert: {
        jti: authContext.jti,
        userId: options.userId || authContext.userId || null,
        reason: options.reason || "logout",
        revokedAt: new Date(),
        expiresAt: authContext.expiresAt,
      },
    },
    { upsert: true },
  );

  return {
    revoked: Boolean(writeResult?.upsertedCount),
    alreadyRevoked: !writeResult?.upsertedCount,
    reason: options.reason || "logout",
  };
}

module.exports = {
  authenticateAccessToken,
  revokeAuthContext,
};
