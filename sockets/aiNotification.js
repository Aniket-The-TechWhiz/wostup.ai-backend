const { sendNotificationToRecipients } = require("../services/notificationDispatchService");

module.exports = async (io, pubClient) => {
	if (!pubClient) {
		console.warn("AI notification subscriber skipped: pubClient not provided.");
		return null;
	}
	
	const subClient = pubClient.duplicate();

	subClient.on("error", (err) => {
		console.error("⚠️ AI Notification SubClient Error:", err.message);
	});

	await subClient.connect();

	await subClient.subscribe("ai_notifications", async (message) => {
		try {
			const payload = JSON.parse(message);
			await sendNotificationToRecipients(io, payload);
		} catch (err) {
			console.error("ai_notifications handler error", err && err.message ? err.message : err);
		}
	});

	console.log("AI notification subscriber connected.");
	return subClient;
};