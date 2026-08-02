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
    status: {
      type: String,
      enum: ["todo", "in-progress", "blocked", "waiting-review", "done"],
      required: true,
    },
    priority: {
      type: String,
      enum: ["Low", "Medium", "High", "Critical"],
      default: "Medium",
    },
    estimatedEffort: {
      type: Number,
      min: 0,
      default: null,
    },
    actualProgress: { type: Number, min: 0, max: 100, default: 0 },
    
    // Updated with ref: "User"
    assigneeUserId: { type: mongoose.Schema.Types.ObjectId, required: true, ref: "User" },
    
    // Updated with ref: "User"
    createdBy: { type: mongoose.Schema.Types.ObjectId, required: true, ref: "User" },
    
    // Updated with ref: "Project"
    projectId: { type: mongoose.Schema.Types.ObjectId, required: true, ref: "Project" },
    
    // Updated with ref: "Milestone"
    milestoneId: { type: mongoose.Schema.Types.ObjectId, default: null, ref: "Milestone" },
    
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