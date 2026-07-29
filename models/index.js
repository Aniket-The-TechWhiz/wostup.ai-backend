module.exports = {
  UserProfile: require("./usersProfile.model"),
  AuthOtp: require("./authOtp.model"),
  

  Workspace: require("./workspaces.model"),
  WorkspaceMember: require("./workspaceMembers.model"),
  Project: require("./projects.model"),
  Milestone: require("./milestones.model"),
  Task: require("./tasks.model"),
  Update: require("./updates.model"),
  Activity: require("./activities.model"),
  Notification: require("./notifications.model"),

  AuthAccount: require("./authAccounts.model"),
  AuthSession: require("./authSessions.model"),
  AuthRefreshToken: require("./authRefreshTokens.model"),
  AuthPasswordResetToken: require("./authPasswordResetTokens.model"),
  AuthEmailVerificationToken: require("./authEmailVerificationTokens.model"),
  SecurityLog: require("./securityLogs.model"),
};