

const bcryptjs = require("bcryptjs");
const mongoose = require("mongoose");
const { User, AuthAccount } = require("../models");


function normalizeEmail(email) {
  return String(email || "").trim().toLowerCase();
}

async function hashPassword(password) {
  const salt = await bcryptjs.genSalt(10);
  return bcryptjs.hash(password, salt);
}

async function comparePassword(password, hashedPassword) {
  if (!hashedPassword) return false;
  return bcryptjs.compare(password, hashedPassword);
}

// GET USER BY EMAIL (FOR LOGIN)

async function getUserByEmail(email) {
  const normalizedEmail = normalizeEmail(email);

  const userDoc = await User.findOne({
    email: normalizedEmail,
    isActive: true,
    $or: [{ deletedAt: null }, { deletedAt: { $exists: false } }],
  }).lean();

  if (!userDoc) return null;

  const accountDoc = await AuthAccount.findOne({
    userId: userDoc._id,
    provider: "local",
  }).lean();

  if (!accountDoc || !accountDoc.passwordHash) return null;

  return {
    id: userDoc._id.toString(),
    email: userDoc.email,
    name: userDoc.name,
    emailVerified: Boolean(userDoc.emailVerified),
    password: accountDoc.passwordHash,
  };
}

// GET USER BY ID

async function getUserById(id) {
  if (!mongoose.Types.ObjectId.isValid(id)) return undefined;

  const userDoc = await User.findById(id).lean();

  if (!userDoc || !userDoc.isActive || userDoc.deletedAt) return undefined;

  return {
    id: userDoc._id.toString(),
    email: userDoc.email,
    name: userDoc.name,
    emailVerified: Boolean(userDoc.emailVerified),
    role: userDoc.role || "user",
    token_version:
      typeof userDoc.token_version === "number"
        ? userDoc.token_version
        : 0,
    password: "",
  };
}


// CREATE USER (REGISTER)

async function createUser(email, name, password) {
  const normalizedEmail = normalizeEmail(email);

  const existingUser = await User.findOne({ email: normalizedEmail });
  if (existingUser) {
    throw new Error("User already exists");
  }

  const hashedPassword = await hashPassword(password);

  const safeName = String(name || "").trim() || "Team Member";
  const avatar =
    (safeName.charAt(0) || normalizedEmail.charAt(0) || "U").toUpperCase();

  const createdUser = await User.create({
    name: safeName,
    email: normalizedEmail,
    avatar,
    password_hash: hashedPassword, 
    skills: [],
    isActive: true,
  });

  await AuthAccount.create({
    userId: createdUser._id,
    provider: "local",
    providerAccountId: normalizedEmail,
    passwordHash: hashedPassword,
    passwordAlgo: "bcrypt",
  });

  return {
    id: createdUser._id.toString(),
    email: createdUser.email,
    name: createdUser.name,
    emailVerified: Boolean(createdUser.emailVerified),
    password: hashedPassword,
  };
}

// CHANGE PASSWORD (WITH TOKEN INVALIDATION)

async function changePassword(userId, oldPassword, newPassword) {
  if (!mongoose.Types.ObjectId.isValid(userId)) {
    throw new Error("Invalid user ID");
  }

  const userDoc = await User.findById(userId);
  if (!userDoc || !userDoc.isActive || userDoc.deletedAt) {
    throw new Error("User not found");
  }

  const account = await AuthAccount.findOne({
    userId: userDoc._id,
    provider: "local",
  });

  if (!account || !account.passwordHash) {
    throw new Error("Auth account not found");
  }

  // verify old password
  const isMatch = await comparePassword(oldPassword, account.passwordHash);
  if (!isMatch) {
    throw new Error("Incorrect old password");
  }

  // hash new password
  const newHashedPassword = await hashPassword(newPassword);

  // update password
  account.passwordHash = newHashedPassword;
  await account.save();

  // 🔥 invalidate all JWT tokens
  await User.updateOne(
    { _id: userId },
    { $inc: { token_version: 1 } }
  );

  return { message: "Password updated successfully" };
}

// GET ALL USERS

async function getAllUsers() {
  const userDocs = await User.find({
    isActive: true,
    $or: [{ deletedAt: null }, { deletedAt: { $exists: false } }],
  }).lean();

  return userDocs.map((userDoc) => ({
    id: userDoc._id.toString(),
    email: userDoc.email,
    name: userDoc.name,
    emailVerified: Boolean(userDoc.emailVerified),
    password: "",
  }));
}


module.exports = {
  hashPassword,
  comparePassword,
  getUserByEmail,
  getUserById,
  createUser,
  getAllUsers,
  changePassword,
};