



const authService = require("../../services/authService");

// REGISTER
async function register(req, res) {
  try {
    const result = await authService.register(req.body || {});
    return res.status(result.status).json(result.body);
  } catch (err) {
    console.error("REGISTER ERROR:", err); // shows real issue in terminal

    return res.status(500).json({
      error: err.message || "Registration failed",
    });
  }
}

// LOGIN
async function login(req, res) {
  try {
    const result = await authService.login(req.body || {});
    return res.status(result.status).json(result.body);
  } catch (err) {
    console.error("LOGIN ERROR:", err); // 🔥 debugging

    return res.status(500).json({
      error: err.message || "Login failed",
    });
  }
}

// GET CURRENT USER
async function me(req, res) {
  try {
    const result = await authService.me(req.user);
    return res.status(result.status).json(result.body);
  } catch (err) {
    console.error("ME ERROR:", err);

    return res.status(500).json({
      error: "Failed to fetch user",
    });
  }
}

module.exports = {
  register,
  login,
  me,
};
