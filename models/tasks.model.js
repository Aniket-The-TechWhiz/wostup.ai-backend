const mongoose = require("mongoose");

const commentSchema = new mongoose.Schema(
  {
    authorUserId: { type: mongoose.Schema.Types.ObjectId, required: true },
    authorName: { type: String, required: true, trim: true, minlength: 1, maxlength: 120 },
    content: { type: String, required: true, minlength: 1, maxlength: 4000 },
    timestamp: { type: Date, required: true, default: Date.now },
  },
  {
    _id: true,
    id: false,
  }
);

const taskSchema = new mongoose.Schema(
  {
    workspaceId: { type: mongoose.Schema.Types.ObjectId, required: true },
    title: { type: String, required: true, trim: true, minlength: 1, maxlength: 240 },
    description: { type: String, required: true, maxlength: 4000 },

    // Extended to include blocked / waiting-review — used by the overload
    // calculator to discount tasks that aren't actively being worked on.
    status: {
      type: String,
      enum: ["todo", "in-progress", "blocked", "waiting-review", "done"],
      required: true,
    },

    // Drives the priorityMultiplier in the overload weight formula
    // (Low=1.0, Medium=1.5, High=2.0, Critical=3.0).
    priority: {
      type: String,
      enum: ["Low", "Medium", "High", "Critical"],
      default: "Medium",
    },

    // Base hours for the overload weight formula. Nullable on purpose —
    // personScoringWorker.js logs a warning and skips (weight = 0) rather
    // than guessing, so untracked effort doesn't silently distort the
    // load_score.
    estimatedEffort: {
      type: Number,
      min: 0,
      default: null,
    },

    actualProgress: { type: Number, min: 0, max: 100, default: 0 },
    assigneeUserId: { type: mongoose.Schema.Types.ObjectId, required: true },
    createdBy: { type: mongoose.Schema.Types.ObjectId, required: true },
    projectId: { type: mongoose.Schema.Types.ObjectId, required: true },
    milestoneId: { type: mongoose.Schema.Types.ObjectId, default: null },
    dependency: { type: [mongoose.Schema.Types.ObjectId], default: [] },
    dueDate: { type: Date, required: true },
    comments: { type: [commentSchema], default: [] },
    deletedAt: { type: Date, default: null },
  },
  {
    collection: "tasks",
    timestamps: true,
  }
);

taskSchema.index({ workspaceId: 1, status: 1, dueDate: 1 });
taskSchema.index({ workspaceId: 1, assigneeUserId: 1, status: 1 });
taskSchema.index({ workspaceId: 1, projectId: 1, milestoneId: 1 });
taskSchema.index({ workspaceId: 1, title: "text", description: "text" });

module.exports = mongoose.models.Task || mongoose.model("Task", taskSchema);