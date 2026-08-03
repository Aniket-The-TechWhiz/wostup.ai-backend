const { Worker } = require("bullmq");
const IORedis = require("ioredis");
const { Task, Suggestion } = require("../models"); 

const redisUrl = process.env.REDIS_URL || "redis://127.0.0.1:6379";
const connection = new IORedis(redisUrl, { maxRetriesPerRequest: null });

const stuckTaskWorker = new Worker(
  "STUCK_TASK_WORKER",
  async (job) => {
    const { taskId, expectedStatus } = job.data;
    const task = await Task.findById(taskId);

    if (!task) return;

    // Check if task is still in the problematic status
    if (task.status === expectedStatus && ["blocked", "waiting-review"].includes(task.status)) {
      const now = new Date();
      const statusEntered = task.statusEnteredAt || task.updatedAt;
      const dwellHours = Math.round((now - new Date(statusEntered)) / (1000 * 60 * 60));

      // Insert alert into Suggestions collection
      await Suggestion.create({
        workspaceId: task.workspaceId,
        projectId: task.projectId,
        risk_category: "Stuck Task",
        risk_score: 100, // arbitrary high score for stuck tasks
        confidence: 1.0,
        scope: { type: "task", id: task._id },
        phrased_text: `Task "${task.title}" has been stuck in '${task.status}' state for ${dwellHours} hours.`,
        details: {
          status: task.status,
          dwellHours,
          dueDate: task.dueDate,
        },
        status: "active",
        model_version: "stuck_detector_v1",
      });

      // Optional: trigger notification to manager/assignee
      console.log(`[STUCK TASK DETECTED] Task ID: ${task._id} | Status: ${task.status}`);
    }
  },
  { connection }
);

module.exports = stuckTaskWorker;