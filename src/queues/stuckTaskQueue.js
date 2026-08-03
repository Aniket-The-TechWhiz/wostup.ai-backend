const { Queue } = require("bullmq");
const IORedis = require("ioredis");

const redisUrl = process.env.REDIS_URL || "redis://127.0.0.1:6379";
const connection = new IORedis(redisUrl, { maxRetriesPerRequest: null });

const stuckTaskQueue = new Queue("STUCK_TASK_WORKER", { connection });

/**
 * Schedules or cancels a stuck detection job for a task.
 * - If task status is 'blocked' or 'waiting-review', schedules a delayed job.
 * - Otherwise, removes any existing job for that task.
 */
async function scheduleStuckCheck(task) {
  const jobId = `stuck-check-${task._id}`;

  // If status is not review or blocked, remove existing delayed job
  if (!["blocked", "waiting-review"].includes(task.status)) {
    const existingJob = await stuckTaskQueue.getJob(jobId);
    if (existingJob) await existingJob.remove();
    return;
  }

  const now = Date.now();
  const due = new Date(task.dueDate).getTime();
  const remainingMs = due - now;

  let delayMs;
  if (remainingMs <= 0) {
    // Fallback if already overdue: 12 hours
    delayMs = 12 * 60 * 60 * 1000;
  } else {
    // Mean time formula: 50% of remaining buffer
    delayMs = Math.round(remainingMs * 0.5);
    // Min floor 1 hour, Max cap 7 days
    delayMs = Math.max(delayMs, 60 * 60 * 1000);
    delayMs = Math.min(delayMs, 7 * 24 * 60 * 60 * 1000);
  }

  // Upsert delayed job using deterministic jobId
  await stuckTaskQueue.add(
    "check-stuck",
    { taskId: task._id, expectedStatus: task.status },
    { delay: delayMs, jobId, removeOnComplete: true, removeOnFail: false }
  );
}

module.exports = { stuckTaskQueue, scheduleStuckCheck };