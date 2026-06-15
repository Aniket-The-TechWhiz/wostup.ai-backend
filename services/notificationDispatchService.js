const { createNotificationService } = require("./notificationService");
const { WorkspaceMember } = require("../models/index");

async function sendNotificationToRecipients(io, payload) {
    const { workspaceId, recipientUserId, recipientUserIds, message, type } = payload || {};
    const recipients = [];

    if (Array.isArray(recipientUserIds)) recipients.push(...recipientUserIds);
    if (recipientUserId) recipients.push(recipientUserId);

    if (!workspaceId || recipients.length === 0) {
        return { statuscode: 400, message: "workspaceId and recipient are required" };
    }

    const results = [];

    for (const rid of recipients) {
        const member = await WorkspaceMember.findOne({ workspaceId, userId: rid });
        if (!member) {
            const msg = `Recipient ${rid} is not a member of workspace ${workspaceId}`;
            results.push({ statuscode: 400, message: msg });
            continue;
        }

        const res = await createNotificationService(workspaceId, rid, message, type);
        results.push(res);

        if (io && res.statuscode === 201) {
            const notification = res.data;
            const sockets = await io.in(`user:${rid}`).fetchSockets();
            const target = sockets.filter(s => s.rooms.has(`workspace:${workspaceId}`));

            target.forEach(s => s.emit("notification", notification));
        }
    }

    return { statuscode: 200, results };
}

module.exports = { sendNotificationToRecipients };
