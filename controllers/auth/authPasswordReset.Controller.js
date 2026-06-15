const AuthPasswordResetToken = require("../../models/authPasswordResetTokens.model");
const AuthAccount = require("../../models/authAccounts.model");
const async_handler = require("express-async-handler");
const { getUserByEmail, hashPassword } = require("../../services/userService");
const { issueAndSendPasswordRestEmail, verifyPasswordResetToken } = require("../../services/passwordResetService");

// 1. Send password reset email
const sendPasswordRestTokenEmail = async_handler(async (req, res) => {
    const email = req.body.email || req.body;
    if (!email) return res.status(400).send("email not provided!!!");
    const user = await getUserByEmail(email);
    if (!user) return res.status(404).send("User not found!!!");
    await issueAndSendPasswordRestEmail(user);
    res.status(200).json({ message: "password reset email sent" });
});

// 2. Verify password reset token (GET or POST)
const verifyPasswordResetTokenHandler = async_handler(async (req, res) => {
    const token = req.body.token || req.query.token;
    if (!token) return res.status(400).json({ error: "Token is required" });
    // You may want to move this logic to passwordResetService for DRY
    const tokenHash = require("crypto").createHash("sha256").update(token).digest("hex");
    const now = new Date();
    const tokenDoc = await AuthPasswordResetToken.findOne({ tokenHash, usedAt: null, expiresAt: { $gt: now } });
    if (!tokenDoc) return res.status(400).json({ error: "Invalid or expired token" });
    res.status(200).json({ message: "Token valid", userId: tokenDoc.userId });
});

// 3. Reset password (POST)
const resetPasswordHandler = async_handler(async (req, res) => {
    const { token, password, confirmPassword } = req.body;
    if (!token || !password || !confirmPassword) {
        return res.status(400).json({ error: "Token, password, and confirmPassword are required" });
    }
    if (password !== confirmPassword) {
        return res.status(400).json({ error: "Passwords do not match" });
    }
    if (password.length < 6) {
        return res.status(400).json({ error: "Password must be at least 6 characters" });
    }
    const tokenHash = require("crypto").createHash("sha256").update(token).digest("hex");
    const now = new Date();
    const tokenDoc = await AuthPasswordResetToken.findOne({ tokenHash, usedAt: null, expiresAt: { $gt: now } });
    if (!tokenDoc) {
        return res.status(400).json({ error: "Invalid or expired token" });
    }
    // Update password in AuthAccount
    const account = await AuthAccount.findOne({ userId: tokenDoc.userId, provider: "local" });
    if (!account) {
        return res.status(404).json({ error: "Account not found" });
    }
    account.passwordHash = await hashPassword(password);
    account.passwordAlgo = "bcrypt";
    await account.save();
    // Mark token as used
    tokenDoc.usedAt = new Date();
    await tokenDoc.save();
    res.status(200).json({ message: "Password has been reset successfully" });
});

module.exports = {
    sendPasswordRestTokenEmail,
    verifyPasswordResetTokenHandler,
    resetPasswordHandler,
};