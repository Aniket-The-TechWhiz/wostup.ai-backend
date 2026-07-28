const jwt = require("jsonwebtoken");

const JWT_SECRET = process.env.JWT_SECRET || "your-secret-key-change-in-production";
const TEMP_TOKEN_EXPIRY = "5m"; // 5 minutes

function generateAccessToken(user) {
  const payload = {
    sub: String(user.id),
    role: user.role || "user",
    version: typeof user.token_version === "number" ? user.token_version : 0,
  };
  return jwt.sign(payload, JWT_SECRET, { expiresIn: "15m" });
}

// 🔥 NEW: Generate temporary token for OTP verification
function generateTemporaryToken(userId) {
  return jwt.sign({ sub: String(userId), purpose: "otp" }, JWT_SECRET, { expiresIn: TEMP_TOKEN_EXPIRY });
}

// 🔥 NEW: Verify temporary token
function verifyTemporaryToken(token) {
  try {
    const decoded = jwt.verify(token, JWT_SECRET);
    if (decoded.purpose !== "otp") return null;
    return decoded;
  } catch (_error) {
    return null;
  }
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
  generateTemporaryToken,
  verifyTemporaryToken,
};