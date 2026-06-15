



const { generateAccessToken } = require("../utils/jwt");
const {
  comparePassword,
  createUser,
  getUserByEmail,
  getUserById,
} = require("./userService");

const { issueAndSendVerificationEmail } = require("./emailVerificationService");

const {
  createSessionAndRefreshToken,
} = require("../controllers/auth/authSessionRefresh.Controller");

// REGISTER

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

    let verificationEmailSent = true;

    try {
      await issueAndSendVerificationEmail(user);
    } catch (_err) {
      verificationEmailSent = false;
    }

    return {
      status: 201,
      body: {
        accessToken,
        user: {
          id: user.id,
          email: user.email,
          name: user.name,
          emailVerified: user.emailVerified,
        },
        verificationEmailSent,
      },
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

  // Get full user (role + token_version)
  const fullUser = await getUserById(user.id);

  if (!fullUser) {
    return {
      status: 404,
      body: { error: "User not found" },
    };
  }

  // Generate access token
  const accessToken = generateAccessToken(fullUser);

  // Create session + refresh token
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
      },
    },
  };
}


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
    },
  };
}

module.exports = {
  register,
  login,
  me,
};