const express = require("express");
const router = express.Router();
const userProfileController = require("../controllers/user/userProfile.controller");
const { authMiddleware } = require("../middleware/authMiddleware");

// Create Profile (public)
router.post("/", userProfileController.createUserProfile);

// Get Profile by ID (public – but you may want to protect it)
router.get("/:id", userProfileController.getUserById);

// 🔥 Toggle 2FA (authenticated)
router.patch("/toggle-2fa", authMiddleware, userProfileController.toggleTwoFactor);

module.exports = router;