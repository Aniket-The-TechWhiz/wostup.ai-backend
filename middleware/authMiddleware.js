const { verifyAccessToken, extractTokenFromHeader } = require("../utils/jwt");
const { getUserById } = require("../services/userProfileService");

async function authMiddleware(req, res, next) {
  try {
    const authHeader = req.headers.authorization || req.headers.Authorization;
    const token = extractTokenFromHeader(authHeader);
    if (!token) return res.status(401).json({ error: "Unauthorized" });

    const payload = verifyAccessToken(token);
    if (!payload) return res.status(401).json({ error: "Invalid or expired token" });

    const user = await getUserById(payload.sub);
    if (!user) return res.status(401).json({ error: "User not found" });

    // If token_version is used (uncomment in User model), verify it
    const userTokenVersion = typeof user.token_version === "number" ? user.token_version : 0;
    if ((payload.version || 0) !== userTokenVersion) {
      return res.status(401).json({ error: "Token has been revoked" });
    }

    req.user = user;
    req.auth = { userId: user.id, email: user.email };
    next();
  } catch (err) {
    next(err);
  }
}

module.exports = authMiddleware;
module.exports.authMiddleware = authMiddleware;