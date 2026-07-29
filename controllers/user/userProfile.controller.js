const userService = require("../../services/userProfileService.js");

// Create User Profile
async function createUserProfile(req, res) {
  try {
    const { name, email, avatar, roleTitle, skills, shortbio } = req.body;

    const user = await userService.createUserProfile({
      name,
      email,
      avatar,
      roleTitle,
      skills,
      shortbio,
    });

    return res.status(201).json({
      success: true,
      message: "User profile created successfully.",
      data: user,
    });
  } catch (error) {
    console.error(error);
    return res.status(400).json({
      success: false,
      message: error.message,
      errors: error.errors,
      stack: error.stack,
    });
  }
}

// Get User By ID
async function getUserById(req, res) {
  try {
    const { id } = req.params;
    const user = await userService.getUserById(id);

    if (!user) {
      return res.status(404).json({
        success: false,
        message: "User not found.",
      });
    }

    return res.json({
      success: true,
      data: user,
    });
  } catch (error) {
    console.error(error);
    return res.status(400).json({
      success: false,
      message: error.message,
      errors: error.errors,
      stack: error.stack,
    });
  }
}

// 🔥 NEW: Toggle 2FA for the authenticated user
async function toggleTwoFactor(req, res) {
  try {
    const userId = req.user.id; // from authMiddleware
    const { enabled } = req.body;

    if (typeof enabled !== "boolean") {
      return res.status(400).json({
        success: false,
        message: "enabled must be a boolean",
      });
    }

    const updatedUser = await userService.updateUser(userId, {
      twoFactorEnabled: enabled,
    });

    if (!updatedUser) {
      return res.status(404).json({
        success: false,
        message: "User not found",
      });
    }

    return res.status(200).json({
      success: true,
      message: `Two-factor authentication ${enabled ? 'enabled' : 'disabled'} successfully.`,
      data: {
        twoFactorEnabled: updatedUser.twoFactorEnabled,
      },
    });
  } catch (error) {
    console.error(error);
    return res.status(500).json({
      success: false,
      message: error.message,
    });
  }
}

module.exports = {
  createUserProfile,
  getUserById,
  toggleTwoFactor, // export new method
};