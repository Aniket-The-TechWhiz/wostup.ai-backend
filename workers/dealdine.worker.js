require('dotenv').config();

const { Worker } = require('bullmq');
const IORedis = require('ioredis');

const redisUrl = process.env.REDIS_URL || 'redis://127.0.0.1:6379';
const redisOpts = { maxRetriesPerRequest: null };

const pubClient = new IORedis(redisUrl, redisOpts);
const connection = new IORedis(redisUrl, redisOpts);

const brevo = require('@getbrevo/brevo');

// Create API instance if SDK exposes the constructor; otherwise we'll fallback to REST.
const TransactionalEmailsApi = brevo && (brevo.TransactionalEmailsApi || (brevo.default && brevo.default.TransactionalEmailsApi));
const ApiKeys = brevo && (brevo.TransactionalEmailsApiApiKeys || (brevo.default && brevo.default.TransactionalEmailsApiApiKeys));

let apiInstance = null;
if (TransactionalEmailsApi) {
    try {
        apiInstance = new TransactionalEmailsApi();
        if (ApiKeys && process.env.BREVO_API_KEY) {
            apiInstance.setApiKey(ApiKeys.apiKey, process.env.BREVO_API_KEY);
        }
    } catch (err) {
        console.warn('Could not construct Brevo SDK API instance, will use REST fallback:', err && err.message);
        apiInstance = null;
    }
} else {
    console.warn('Brevo SDK does not expose TransactionalEmailsApi constructor; REST fallback will be used.');
}

async function sendTransactionalEmail(payload) {
    if (apiInstance && typeof apiInstance.sendTransacEmail === 'function') {
        return apiInstance.sendTransacEmail(payload);
    }

    if (!process.env.BREVO_API_KEY) {
        throw new Error('BREVO_API_KEY not set');
    }

    // Use fetch (Node 18+) to call Brevo REST API directly
    const resp = await fetch('https://api.brevo.com/v3/smtp/email', {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
            'api-key': process.env.BREVO_API_KEY
        },
        body: JSON.stringify(payload)
    });

    const json = await resp.json().catch(() => null);
    if (!resp.ok) {
        const err = new Error(`Brevo REST error (status ${resp.status})`);
        err.details = json;
        throw err;
    }
    return json;
}


async function getData() {
  const url = "ws://localhost:8000/ws/project-planner";
  try {
    const response = await fetch(url);
    if (!response.ok) {
      throw new Error(`Response status: ${response.status}`);
    }

    const result = await response.json();
    console.log(result);
  } catch (error) {
    console.error(error.message);
  }
}

async function isUserOnlineInWorkspace(userId, workspaceId) {
    const res = await pubClient.sismember(`workspace:${workspaceId}:online_users`, userId);
    return Boolean(res);
}

const worker = new Worker(
    'DEADLINE_WORKER',
    async job => {
        if (job.name === 'task') {
            const { taskId, workspaceId, assigneeUserId, userId } = job.data || {};

            console.log('DEADLINE_WORKER received job:', { name: job.name, data: job.data });

            const online = await isUserOnlineInWorkspace(assigneeUserId, workspaceId);
            console.log(`task ${taskId} assignee ${assigneeUserId} online?`, online);
            console.log("hiii")
            if (!process.env.BREVO_API_KEY) {
                console.error('BREVO_API_KEY is not set. Cannot send transactional email.');
                return;
            }

            try {
                console.log('sending transactional email for task', taskId);
                const resp = await sendTransactionalEmail({
                    sender: {
                        email: 'notify@wostup.com',
                        name: 'wostup'
                    },
                    to: [ { email: 'sanchitskumbhar@gmail.com' } ],
                    subject: 'Task deadline notification',
                    htmlContent: `
                        <p>Your task is nearing its deadline.</p>
                        <p><a href="https://yourapp.com/tasks/${taskId}">View task</a></p>
                    `
                });
                console.log('brevo sendTransacEmail response:', resp && typeof resp === 'object' ? JSON.stringify(resp) : resp);
            } catch (err) {
                console.error('Error sending transactional email:', err && err.message ? err.message : err);
                if (err && err.details) {
                    console.error('Brevo error details:', JSON.stringify(err.details));
                }
            }
/*
            if (workspaceId && assigneeUserId) {
                const notificationPayload = {
                    workspaceId,
                    recipientUserId: assigneeUserId,
                    message: `AI: Task ${taskId} is nearing its deadline.`,
                    type: "ai"
                };

                try {
                    await pubClient.publish("ai_notifications", JSON.stringify(notificationPayload));
                } catch (err) {
                    console.error("Failed to publish AI notification", err && err.message ? err.message : err);
                }
            }
                */

            const suggestion=fetch()
            
            }
        }
    ,
    { connection }
);

module.exports = worker;