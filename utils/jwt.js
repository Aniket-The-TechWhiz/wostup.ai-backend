const jwt = require("jsonwebtoken");

const JWT_SECRET = process.env.JWT_SECRET || "your-secret-key-change-in-production";

function generateAccessToken(user) {
  const payload = {
    sub: String(user.id),
    role: user.role || "user",
    version: typeof user.token_version === "number" ? user.token_version : 0,
  };
  return jwt.sign(payload, JWT_SECRET, { expiresIn: "15m" });
}

function generateRefreshTokenPlaceholder() {
  return null;
}

function verifyAccessToken(token) {
  try {
    return jwt.verify(token, JWT_SECRET);
  } catch (_error) {
    return null;
  }
}

function extractTokenFromHeader(authHeader) {
  if (!authHeader || !authHeader.startsWith("Bearer ")) return null;
  return authHeader.slice(7);
}

module.exports = {
  generateAccessToken,
  verifyAccessToken,
  extractTokenFromHeader,
};
