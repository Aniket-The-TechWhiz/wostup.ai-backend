// scheduler.js
const { Queue } = require('bullmq');
const redisConnection = require('./redisConfig');

// Create the cron queue
const cronQueue = new Queue('CronReportsQueue', { connection: redisConnection });

async function initScheduler() {
  // Run every day at 6:00 AM UTC
  const cronPattern = '0 0 6 * * *';

  await cronQueue.upsertJobScheduler(
    'daily-overload-scheduler', // Unique ID for this scheduler
    {
      pattern: cronPattern,
      tz: 'UTC' // Best practice: Always specify timezone explicitly
    },
    {
      name: 'overload-detection', // Picked up by dispatcher.js
      // No task/recipient data here — the dispatcher queries the DB
      // itself to find every (workspace, assignee) pair that needs
      // scoring, so this trigger stays empty on purpose.
      data: {}
    }
  );

  console.log('Cron job successfully scheduled!');
}

initScheduler().catch(console.error);