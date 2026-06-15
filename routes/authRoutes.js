
const express = require("express");
const authController = require("../controllers/auth/authController");
const emailVerificationController = require("../controllers/auth/emailverification.controller");
const passwordResetController = require("../controllers/auth/authPasswordReset.Controller");
const sessionRefreshController = require("../controllers/auth/authSessionRefresh.Controller");
const { authMiddleware } = require("../middleware/authMiddleware");

const router = express.Router();

router.post("/register", authController.register);
router.post("/login", authController.login);
router.get("/me", authMiddleware, authController.me);
router.post("/email-verification/send", authMiddleware, emailVerificationController.sendVerification);
router.get("/email-verification/verify", emailVerificationController.verify);

// Password reset routes
router.post("/password-reset/request", passwordResetController.sendPasswordRestTokenEmail); // send reset email
router.post("/password-reset/verify", passwordResetController.verifyPasswordResetTokenHandler); // verify token
router.post("/password-reset/reset", passwordResetController.resetPasswordHandler); // reset password


// Session and refresh token routes
router.post("/refresh-token", sessionRefreshController.refreshTokenHandler); // refresh token
router.post("/logout", authMiddleware, sessionRefreshController.logoutHandler); // logout

module.exports = router;
