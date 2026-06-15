const mongoose = require("mongoose");

const authSessionSchema = new mongoose.Schema(
  {
    userId: { type: mongoose.Schema.Types.ObjectId, required: true },
    sessionToken: { type: String, required: true, minlength: 32, maxlength: 512 },
    ipAddress: { type: String, default: null, maxlength: 64 },
    userAgent: { type: String, default: null, maxlength: 1024 },
    expiresAt: { type: Date, required: true },
    revokedAt: { type: Date, default: null },
    createdAt: { type: Date, required: true, default: Date.now },
  },
  {
    collection: "auth_sessions",
    versionKey: false,
    timestamps: false,
  }
);

authSessionSchema.index({ sessionToken: 1 }, { unique: true });
authSessionSchema.index({ userId: 1, expiresAt: 1 });

module.exports = mongoose.models.AuthSession || mongoose.model("AuthSession", authSessionSchema);
