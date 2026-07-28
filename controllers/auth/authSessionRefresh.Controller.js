


const AuthRefreshToken = require("../../models/authRefreshTokens.model");
const AuthSession = require("../../models/authSessions.model");
const asyncHandler = require("express-async-handler");
const crypto = require("crypto");
const { getUserById } = require("../../services/userProfileService");
const { generateAccessToken } = require("../../utils/jwt");
const { User } = require("../../models");

// 🔐 Hash helper
function hashToken(token) {
  return crypto.createHash("sha256").update(token).digest("hex");
}

// CREATE SESSION + REFRESH TOKEN

const createSessionAndRefreshToken = async (
  userId,
  ipAddress,
  userAgent,
  expiresInMinutes = 60 * 24 * 30 // 30 days
) => {
  const sessionToken = crypto.randomBytes(32).toString("hex");
  const refreshToken = crypto.randomBytes(32).toString("hex");

  const expiresAt = new Date(Date.now() + expiresInMinutes * 60 * 1000);

  // Create session
  const session = await AuthSession.create({
    userId,
    sessionToken,
    ipAddress,
    userAgent,
    expiresAt,
  });

  // Create refresh token
  const refreshDoc = await AuthRefreshToken.create({
    userId,
    tokenHash: hashToken(refreshToken),
    sessionId: session._id,
    expiresAt,
  });

  return {
    sessionToken,
    refreshToken,
    sessionId: session._id,
    refreshTokenId: refreshDoc._id,
  };
};

// 2️⃣ REFRESH TOKEN HANDLER

const refreshTokenHandler = asyncHandler(async (req, res) => {
  const { refreshToken } = req.body;

  if (!refreshToken) {
    return res.status(400).json({ error: "Refresh token required" });
  }

  const tokenHash = hashToken(refreshToken);
  const now = new Date();

  // Find valid token
  const tokenDoc = await AuthRefreshToken.findOne({
    tokenHash,
    revokedAt: null,
    expiresAt: { $gt: now },
  });

  if (!tokenDoc) {
    return res.status(401).json({ error: "Invalid or expired refresh token" });
  }

  // Validate session
  const session = await AuthSession.findById(tokenDoc.sessionId);

  if (!session || session.revokedAt || session.expiresAt < now) {
    return res.status(401).json({ error: "Session expired or revoked" });
  }

  // Get user
  const user = await getUserById(tokenDoc.userId);
  if (!user) {
    return res.status(404).json({ error: "User not found" });
  }

  // 🔥 ROTATE TOKEN (security)
  tokenDoc.revokedAt = new Date();
  await tokenDoc.save();

  const newTokens = await createSessionAndRefreshToken(
    user.id,
    req.ip,
    req.headers["user-agent"]
  );

  const accessToken = generateAccessToken(user);

  return res.status(200).json({
    accessToken,
    refreshToken: newTokens.refreshToken,
  });
});

// 3️⃣ LOGOUT HANDLER

const logoutHandler = asyncHandler(async (req, res) => {
  const { sessionToken, refreshToken } = req.body;

  if (!sessionToken && !refreshToken) {
    return res.status(400).json({ error: "Session or refresh token required" });
  }

  const now = new Date();

  // Revoke session (only for this user)
  if (sessionToken && req.user?.id) {
    await AuthSession.updateOne(
      { sessionToken, userId: req.user.id },
      { $set: { revokedAt: now } }
    );
  }

  // Revoke refresh token safely
  if (refreshToken && req.user?.id) {
    const tokenHash = hashToken(refreshToken);

    await AuthRefreshToken.updateOne(
      { tokenHash, userId: req.user.id },
      { $set: { revokedAt: now } }
    );
  }

  // Invalidate ALL access tokens
  if (req.user?.id) {
    await User.updateOne(
      { _id: req.user.id },
      { $inc: { token_version: 1 } }
    );
  }

  return res.status(200).json({ message: "Logged out successfully" });
});


module.exports = {
  createSessionAndRefreshToken,
  refreshTokenHandler,
  logoutHandler,
};