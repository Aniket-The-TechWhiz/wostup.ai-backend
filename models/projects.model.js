const mongoose = require("mongoose");

const projectSchema = new mongoose.Schema(
  {
    workspaceId: { type: mongoose.Schema.Types.ObjectId, required: true },
    name: { type: String, required: true, trim: true, minlength: 1, maxlength: 180 },
    ownerUserId: { type: mongoose.Schema.Types.ObjectId, required: true },
    createdBy: { type: mongoose.Schema.Types.ObjectId, required: true },
    status: { type: String, enum: ["active", "completed", "on-hold"], required: true },
    description: { type: String, required: true, maxlength: 2000 },
    progress: { type: Number, required: true, min: 0, max: 100 },
    dueDate: { type: Date, required: true },
    deletedAt: { type: Date, default: null },
    LOGS:{
    AISummary: { type: String, default: "" },
    ExecutionSummary: [{ type: String, default: "" }],
    Suggestions: [{ type: String, default: "" }],
    RiskAssessment: [{ type: String, default: "" }],
    }
  },
  {
    collection: "projects",
    timestamps: true,
  }
);

projectSchema.index({ workspaceId: 1, status: 1, updatedAt: -1 });
projectSchema.index({ workspaceId: 1, ownerUserId: 1 });
projectSchema.index({ workspaceId: 1, dueDate: 1 });

module.exports = mongoose.models.Project || mongoose.model("Project", projectSchema);
