const express = require("express");
const authController = require("../controllers/auth/authController");
const emailVerificationController = require("../controllers/auth/emailverification.controller");
const passwordResetController = require("../controllers/auth/authPasswordReset.Controller");
const sessionRefreshController = require("../controllers/auth/authSessionRefresh.Controller");
const { authMiddleware } = require("../middleware/authMiddleware");
const passwordResetRateLimiter = require("../middleware/passwordResetRateLimiter");

const router = express.Router();

router.post("/register", authController.register);
router.post("/login", authController.login);
router.get("/me", authMiddleware, authController.me);

// 🔥 NEW: OTP verification endpoint
router.post("/verify-otp", authController.verifyOtp);

router.post("/email-verification/send", authMiddleware, emailVerificationController.sendVerification);
router.get("/email-verification/verify", emailVerificationController.verify);

router.post(
  "/password-reset/request",
  passwordResetRateLimiter,
  passwordResetController.sendPasswordRestTokenEmail
);
router.post("/password-reset/verify", passwordResetController.verifyPasswordResetTokenHandler);
router.post("/password-reset/reset", passwordResetController.resetPasswordHandler);

router.post("/refresh-token", sessionRefreshController.refreshTokenHandler);
router.post("/logout", authMiddleware, sessionRefreshController.logoutHandler);

module.exports = router;