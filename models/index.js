function safeRequire(path, exportName) {
  try {
    return require(path);
  } catch (error) {
    if (error && error.code === "MODULE_NOT_FOUND") {
      console.warn(`Optional model missing: ${exportName}`);
      return null;
    }

    throw error;
  }
}

module.exports = {
  User: require("./users.model"),
  Workspace: require("./workspaces.model"),
  WorkspaceMember: require("./workspaceMembers.model"),
  Project: require("./projects.model"),
  Milestone: require("./milestones.model"),
  Task: require("./tasks.model"),
  Update: require("./updates.model"),
  Activity: require("./activities.model"),
  Notification: require("./notifications.model"),
  AiSuggestion: safeRequire("./ai_suggestions.model", "AiSuggestion"),
  AiAction: safeRequire("./ai_actions.model", "AiAction"),
  AiAnalysis: safeRequire("./ai_analysis.model", "AiAnalysis"),
  AiContextSnapshot: safeRequire("./ai_context_snapshots.model", "AiContextSnapshot"),
  AiExecutionLog: safeRequire("./ai_execution_logs.model", "AiExecutionLog"),
  AiRiskReport: safeRequire("./ai_risk_reports.model", "AiRiskReport"),
  AuthAccount: require("./authAccounts.model"),
  AuthSession: require("./authSessions.model"),
  AuthRefreshToken: require("./authRefreshTokens.model"),
  AuthPasswordResetToken: require("./authPasswordResetTokens.model"),
  AuthEmailVerificationToken: require("./authEmailVerificationTokens.model"),
  FailedQueueJob: require("./failedQueueJobs.model"),
};
