const { markNotificationAsReadService, deleteNotificationService } = require("../services/notificationService");
const { sendNotificationToRecipients } = require("../services/notificationDispatchService");

module.exports = (io, pubClient) => {
    io.on("connection", (socket) => {
        // expecting client to join via workspacePresence 'join' event first

        socket.on("send_notification", async (payload, callback) => {
            // payload: { workspaceId, recipientUserId OR recipientUserIds[], message, type }
            try {
                const res = await sendNotificationToRecipients(io, payload);
                if (typeof callback === "function") callback(res);
            } catch (err) {
                console.error("send_notification error", err);
                if (typeof callback === "function") callback({ statuscode: 500, message: err.message });
            }
        });

        socket.on("mark_notification_read", async ({ notificationId, recipientUserId }, callback) => {
            try {
                const res = await markNotificationAsReadService(notificationId, recipientUserId);
                if (res.statuscode === 200) {
                    // emit update to recipient sockets in same workspace(s)
                    const sockets = await io.in(`user:${recipientUserId}`).fetchSockets();
                    sockets.forEach(s => s.emit("notification_updated", res.data));
                }
                if (typeof callback === "function") callback(res);
            } catch (err) {
                console.error("mark_notification_read error", err);
                if (typeof callback === "function") callback({ statuscode: 500, message: err.message });
            }
        });

        socket.on("delete_notification", async ({ notificationId, recipientUserId }, callback) => {
            try {
                const res = await deleteNotificationService(notificationId, recipientUserId);
                if (res.statuscode === 200) {
                    const sockets = await io.in(`user:${recipientUserId}`).fetchSockets();
                    sockets.forEach(s => s.emit("notification_deleted", { notificationId }));
                }
                if (typeof callback === "function") callback(res);
            } catch (err) {
                console.error("delete_notification error", err);
                if (typeof callback === "function") callback({ statuscode: 500, message: err.message });
            }
        });
    });
};
