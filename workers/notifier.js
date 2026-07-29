const { Worker } = require("bullmq");
const Redis = require("ioredis");
const redisConnection = require("./redisConfig");
const OverloadScore = require("./overloadScore.model");
const OverloadNotificationLog = require("./overloadNotificationLog.model");

// Separate Redis client for PUBLISH — BullMQ's own connection is reserved
// for queue traffic, so we open a small dedicated one for this.
const publisher = new Redis(redisConnection);

const NOTIFY_CONFIG = {
    highThreshold: 1.3,              // must match riskThresholds.high in personScoringWorker.js
    emergencyMultiplier: 1.5,        // load_score > highThreshold * this = bypass the pattern check entirely
    lookbackDays: 5,
    minBadDaysInLookback: 3,         // "3 out of last 5 days" instead of strict consecutive
    cooldownDays: 3,
    minRiskLevel: "high",            // "moderate" never notifies, only high/critical
    contributionThreshold: 0.15      // matches the same cutoff used for contributing_tasks
};

const RISK_ORDER = ["low", "moderate", "high", "critical"];
function meetsMinRisk(level) {
    return RISK_ORDER.indexOf(level) >= RISK_ORDER.indexOf(NOTIFY_CONFIG.minRiskLevel);
}

async function shouldNotify(score) {
    // 1. Emergency override — bad enough that waiting for a pattern
    //    would be irresponsible. Skips the history check entirely.
    const emergencyCutoff = NOTIFY_CONFIG.highThreshold * NOTIFY_CONFIG.emergencyMultiplier;
    if (score.load_score > emergencyCutoff) return { notify: true, reason: "emergency" };

    // 2. Sustained pattern — 3 of the last 5 daily scores were high/critical.
    //    Tolerant of one or two lighter days, unlike a strict streak.
    const recent = await OverloadScore.find({ workspaceId: score.workspaceId, userId: score.userId })
        .sort({ date: -1 })
        .limit(NOTIFY_CONFIG.lookbackDays);

    const badDays = recent.filter((d) => meetsMinRisk(d.risk_level)).length;
    if (badDays >= NOTIFY_CONFIG.minBadDaysInLookback) return { notify: true, reason: "sustained_pattern" };

    return { notify: false };
}

async function isInCooldown(workspaceId, userId, today) {
    const log = await OverloadNotificationLog.findOne({ workspaceId, userId });
    if (!log) return false;
    const daysSince = Math.floor((today - log.lastNotifiedAt) / 86400000);
    return daysSince < NOTIFY_CONFIG.cooldownDays;
}

const notifierWorker = new Worker(
    "NotificationCheckQueue",
    async (job) => {
        if (job.name !== "notification-check") return;

        const today = new Date();
        const todayStr = today.toISOString().slice(0, 10);

        const todaysScores = await OverloadScore.find({ date: todayStr });
        console.log(`Notification check: evaluating ${todaysScores.length} scores for ${todayStr}`);

        // Group by project owner so each owner gets ONE batched message,
        // not one message per overloaded person.
        const ownerBatches = {}; // ownerId -> { workspaceId, entries: [] }

        for (const score of todaysScores) {
            const decision = await shouldNotify(score);
            if (!decision.notify) continue;

            if (await isInCooldown(score.workspaceId, score.userId, today)) continue;

            const relevantOwnerIds = new Set(
                (score.contributing_tasks || [])
                    .filter((t) => t.contribution_pct >= NOTIFY_CONFIG.contributionThreshold && t.projectOwnerId)
                    .map((t) => String(t.projectOwnerId))
            );

            if (relevantOwnerIds.size === 0) continue; // no owner to route to — nothing to send

            for (const ownerId of relevantOwnerIds) {
                ownerBatches[ownerId] = ownerBatches[ownerId] || {
                    workspaceId: score.workspaceId,
                    entries: []
                };
                ownerBatches[ownerId].entries.push({
                    userId: score.userId,
                    risk_level: score.risk_level,
                    load_score: score.load_score,
                    reason: decision.reason
                });
            }

            await OverloadNotificationLog.updateOne(
                { workspaceId: score.workspaceId, userId: score.userId },
                { $set: { lastNotifiedAt: today } },
                { upsert: true }
            );
        }

        // Publish one batched notification per owner via the existing
        // ai_notifications Redis channel — aiNotification.js on the main
        // server process picks this up and calls sendNotificationToRecipients
        // with its own live `io` instance.
        let sentCount = 0;
        for (const [ownerId, batch] of Object.entries(ownerBatches)) {
            const summary = batch.entries
                .map((e) => `${e.userId} (${e.risk_level}${e.reason === "emergency" ? ", urgent" : ""})`)
                .join(", ");

            const payload = {
                workspaceId: batch.workspaceId,
                recipientUserId: ownerId,
                message:
                    batch.entries.length === 1
                        ? `Overload alert: ${summary} is at risk on your project.`
                        : `Overload alert: ${batch.entries.length} team members are at risk on your project(s) — ${summary}`,
                type: "overload_alert"
            };

            await publisher.publish("ai_notifications", JSON.stringify(payload));
            sentCount++;
        }

        console.log(`Notification check complete: ${sentCount} owner(s) notified`);
        return { ownersNotified: sentCount };
    },
    { connection: redisConnection }
);

module.exports = notifierWorker;
