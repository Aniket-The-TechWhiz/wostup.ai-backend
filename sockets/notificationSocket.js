const { markNotificationAsReadService, deleteNotificationService } = require("../services/notificationService");
const { sendNotificationToRecipients } = require("../services/notificationDispatchService");

/**
 * NOTE ON SCALING: this file does NOT need queue conversion. Every handler
 * here runs once, in direct response to one specific socket action from
 * one specific client — there's no broadcast/duplication risk the way
 * aiNotification.js had (that one processed the SAME message on every
 * server instance; this only ever runs once, on whichever single instance
 * that socket happens to be connected to). Queuing these would only add
 * latency and break the synchronous callback contract clients rely on
 * (e.g. getting the created notification back immediately).
 *
 * BUG FIXED: mark_notification_read / delete_notification previously
 * emitted to every socket in `user:${recipientUserId}` with no workspace
 * filtering — unlike notificationDispatchService.js, which correctly
 * scopes emits to sockets that are also in `workspace:${workspaceId}`.
 * A user with multiple workspace tabs open would get read/delete events
 * pushed to tabs for workspaces the notification has nothing to do with.
 * Fixed below for mark_notification_read (the updated doc's workspaceId
 * is available). delete_notification still can't be scoped the same way
 * until deleteNotificationService is updated to return the deleted
 * document (currently it only returns a success message) — flagged below.
 */

module.exports = (io, pubClient) => {
    io.on("connection", (socket) => {
        // expecting client to join via workspacePresence 'join' event first

        socket.on("send_notification", async (payload, callback) => {
            // payload: { workspaceId, recipientUserId OR recipientUserIds[], message, type }
            try {
                if (!payload || !payload.workspaceId || (!payload.recipientUserId && !payload.recipientUserIds)) {
                    const err = { statuscode: 400, message: "workspaceId and a recipient are required" };
                    if (typeof callback === "function") return callback(err);
                    return;
                }

                const res = await sendNotificationToRecipients(io, payload);
                if (typeof callback === "function") callback(res);
            } catch (err) {
                console.error("send_notification error", err);
                if (typeof callback === "function") callback({ statuscode: 500, message: err.message });
            }
        });

        socket.on("mark_notification_read", async ({ notificationId, recipientUserId }, callback) => {
            try {
                if (!notificationId || !recipientUserId) {
                    const err = { statuscode: 400, message: "notificationId and recipientUserId are required" };
                    if (typeof callback === "function") return callback(err);
                    return;
                }

                const res = await markNotificationAsReadService(notificationId, recipientUserId);
                if (res.statuscode === 200) {
                    const workspaceId = res.data?.workspaceId;
                    const sockets = await io.in(`user:${recipientUserId}`).fetchSockets();
                    // Scope to the notification's own workspace room, same
                    // pattern notificationDispatchService.js already uses —
                    // avoids pushing this update into unrelated workspace tabs.
                    const target = workspaceId
                        ? sockets.filter((s) => s.rooms.has(`workspace:${workspaceId}`))
                        : sockets;
                    target.forEach((s) => s.emit("notification_updated", res.data));
                }
                if (typeof callback === "function") callback(res);
            } catch (err) {
                console.error("mark_notification_read error", err);
                if (typeof callback === "function") callback({ statuscode: 500, message: err.message });
            }
        });

        socket.on("delete_notification", async ({ notificationId, recipientUserId }, callback) => {
            try {
                if (!notificationId || !recipientUserId) {
                    const err = { statuscode: 400, message: "notificationId and recipientUserId are required" };
                    if (typeof callback === "function") return callback(err);
                    return;
                }

                const res = await deleteNotificationService(notificationId, recipientUserId);
                if (res.statuscode === 200) {
                    // TODO: same workspace-scoping fix as mark_notification_read
                    // above, once deleteNotificationService returns the deleted
                    // doc's workspaceId instead of just a message string.
                    const sockets = await io.in(`user:${recipientUserId}`).fetchSockets();
                    sockets.forEach((s) => s.emit("notification_deleted", { notificationId }));
                }
                if (typeof callback === "function") callback(res);
            } catch (err) {
                console.error("delete_notification error", err);
                if (typeof callback === "function") callback({ statuscode: 500, message: err.message });
            }
        });
    });
};