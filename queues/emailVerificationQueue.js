const { Queue } = require("bullmq");
const IORedis = require("ioredis");

const queueName = "email-verification";
const redisUrl = process.env.REDIS_URL || "redis://127.0.0.1:6379";

const connection = new IORedis(redisUrl, {
  maxRetriesPerRequest: null,
});

connection.on("error", (err) => {
  console.error("⚠️ IORedis Queue Connection Error:", err.message);
});

const emailVerificationQueue = new Queue(queueName, {
  connection,
  defaultJobOptions: {
    attempts: 3,
    backoff: {
      type: "exponential",
      delay: 1000,
    },
    removeOnComplete: true,
    removeOnFail: 1000,
  },
});

async function enqueueVerificationEmail(jobData) {
  return emailVerificationQueue.add("send-verification-email", jobData);
}

module.exports = {
  queueName,
  enqueueVerificationEmail,
  emailVerificationQueue,
};