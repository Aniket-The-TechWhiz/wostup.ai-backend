const mongoose = require("mongoose");

const notificationSchema = new mongoose.Schema(
  {
    workspaceId: { type: mongoose.Schema.Types.ObjectId, required: true },
    recipientUserId: { type: mongoose.Schema.Types.ObjectId, required: true },
    message: { type: String, required: true, minlength: 1, maxlength: 400 },
    timestamp: { type: Date, required: true, default: Date.now },
    read: { type: Boolean, required: true, default: false },
    type: { type: String, enum: ["task", "milestone", "comment"], required: true },
  },
  {
    collection: "notifications",
    versionKey: false,
  }
);

notificationSchema.index({ workspaceId: 1, recipientUserId: 1, read: 1, timestamp: -1 });

module.exports = mongoose.models.Notification || mongoose.model("Notification", notificationSchema);
