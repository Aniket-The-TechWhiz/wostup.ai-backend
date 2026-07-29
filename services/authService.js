const {
  generateAccessToken,
  generateTemporaryToken,
  verifyTemporaryToken,
} = require("../utils/jwt");
const {
  comparePassword,
  createUser,
  getUserByEmail,
  getUserById,
  updateUser,
} = require("./userProfileService");

const { issueAndSendVerificationEmail } = require("./emailVerificationService");
const { createSessionAndRefreshToken } = require("../controllers/auth/authSessionRefresh.Controller");
const { createOTP, verifyOTP } = require("./otpService");

// REGISTER (unchanged)
async function register({ email, password, confirmPassword }) {
  if (!email || !password || !confirmPassword) {
    return {
      status: 400,
      body: { error: "Email, password, and confirmPassword are required" },
    };
  }

  if (password !== confirmPassword) {
    return {
      status: 400,
      body: { error: "Passwords do not match" },
    };
  }

  if (password.length < 6) {
    return {
      status: 400,
      body: { error: "Password must be at least 6 characters" },
    };
  }

  const name = String(email).split("@")[0] || "Team Member";

  try {
    const user = await createUser(email, name, password);
    const accessToken = generateAccessToken(user);

    let verificationEmailQueued = true;
    let verificationResult = null;

    let verificationEmailSent = true;
    try {
      verificationResult = await issueAndQueueVerificationEmail(user);
      verificationEmailQueued = Boolean(verificationResult.queued);
    } catch (_err) {
      verificationEmailQueued = false;
    }

    const body = {
      accessToken,
      user: {
        id: user.id,
        email: user.email,
        name: user.name,
        emailVerified: user.emailVerified,
      },
      verificationEmailQueued,
    };

    const isDevMode = process.env.NODE_ENV === "dev" || process.env.NODE_ENV === "development";
    if (isDevMode && verificationResult) {
      body.verificationToken = verificationResult.rawToken;
      body.verificationTokenExpiresAt = verificationResult.expiresAt;
      body.verificationUrl = verificationResult.verificationUrl;
    }

    return {
      status: 201,
      body,
    };
  } catch (error) {
    if (error.message === "User already exists") {
      return {
        status: 400,
        body: { error: "Email already registered" },
      };
    }
    return {
      status: 500,
      body: { error: "Registration failed" },
    };
  }
}

// LOGIN with 2FA support
async function login({ email, password }, req) {
  if (!email || !password) {
    return {
      status: 400,
      body: { error: "Email and password are required" },
    };
  }

  // Get user + hashed password (from AuthAccount)
  const user = await getUserByEmail(email);
  if (!user) {
    return {
      status: 401,
      body: { error: "Invalid email or password" },
    };
  }

  // Compare password
  const isPasswordValid = await comparePassword(password, user.password);
  if (!isPasswordValid) {
    return {
      status: 401,
      body: { error: "Invalid email or password" },
    };
  }

  // Get full user (role + token_version + twoFactorEnabled)
  const fullUser = await getUserById(user.id);
  if (!fullUser) {
    return {
      status: 404,
      body: { error: "User not found" },
    };
  }

  // --- 2FA CHECK ---
  if (fullUser.twoFactorEnabled) {
    // Generate and send OTP
    try {
      await createOTP(fullUser); // creates OTP and sends email
    } catch (otpErr) {
      console.error("Failed to send OTP:", otpErr);
      return {
        status: 500,
        body: { error: "Failed to send OTP. Please try again." },
      };
    }

    // Return temporary token (valid 5 min)
    const tempToken = generateTemporaryToken(fullUser.id);
    return {
      status: 200,
      body: {
        requiresOtp: true,
        tempToken,
        message: "OTP sent to your email. Please verify.",
      },
    };
  }

  // --- NO 2FA: proceed as usual ---
  const accessToken = generateAccessToken(fullUser);
  const { refreshToken } = await createSessionAndRefreshToken(
    fullUser.id,
    req?.ip,
    req?.headers?.["user-agent"]
  );

  return {
    status: 200,
    body: {
      accessToken,
      refreshToken,
      user: {
        id: fullUser.id,
        email: fullUser.email,
        name: fullUser.name,
        emailVerified: fullUser.emailVerified,
        twoFactorEnabled: fullUser.twoFactorEnabled,
      },
    },
  };
}

// 🔥 NEW: Verify OTP and issue final tokens
async function verifyOtp({ tempToken, otp }, req) {
  if (!tempToken || !otp) {
    return {
      status: 400,
      body: { error: "tempToken and otp are required" },
    };
  }

  // Validate temp token
  const decoded = verifyTemporaryToken(tempToken);
  if (!decoded) {
    return {
      status: 401,
      body: { error: "Invalid or expired temporary token" },
    };
  }

  const userId = decoded.sub;
  const user = await getUserById(userId);
  if (!user) {
    return {
      status: 404,
      body: { error: "User not found" },
    };
  }

  // Verify OTP
  const isValid = await verifyOTP(userId, otp);
  if (!isValid) {
    return {
      status: 401,
      body: { error: "Invalid or expired OTP" },
    };
  }

  // OTP is valid – issue access and refresh tokens
  const accessToken = generateAccessToken(user);
  const { refreshToken } = await createSessionAndRefreshToken(
    user.id,
    req?.ip,
    req?.headers?.["user-agent"]
  );

  return {
    status: 200,
    body: {
      accessToken,
      refreshToken,
      user: {
        id: user.id,
        email: user.email,
        name: user.name,
        emailVerified: user.emailVerified,
        twoFactorEnabled: user.twoFactorEnabled,
      },
    },
  };
}

// ME (unchanged)
async function me(auth) {
  const userId = auth && (auth.userId || auth.id);
  if (!userId) {
    return {
      status: 401,
      body: { error: "Not authenticated" },
    };
  }

  const user = await getUserById(userId);
  if (!user) {
    return {
      status: 404,
      body: { error: "User not found" },
    };
  }

  return {
    status: 200,
    body: {
      id: user.id,
      email: user.email,
      name: user.name,
      emailVerified: user.emailVerified,
      twoFactorEnabled: user.twoFactorEnabled,
    },
  };
}

module.exports = {
  register,
  login,
  me,
  verifyOtp, // export new function
};