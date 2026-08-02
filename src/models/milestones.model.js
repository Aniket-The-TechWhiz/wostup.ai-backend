const mongoose = require("mongoose");

const milestoneSchema = new mongoose.Schema(
  {
    workspaceId: { type: mongoose.Schema.Types.ObjectId, required: true },
    projectId: { type: mongoose.Schema.Types.ObjectId, required: true },
    createdBy: { type: mongoose.Schema.Types.ObjectId, required: true },
    name: { type: String, required: true, trim: true, minlength: 1, maxlength: 180 },
    description: { type: String, required: true, maxlength: 2000 },
    dueDate: { type: Date, required: true },
    completionPercentage: { type: Number, required: true, min: 0, max: 100 },
    deletedAt: { type: Date, default: null },
  },
  {
    collection: "milestones",
    timestamps: true,
  }
);

milestoneSchema.index({ workspaceId: 1, projectId: 1, dueDate: 1 });

module.exports = mongoose.models.Milestone || mongoose.model("Milestone", milestoneSchema);
