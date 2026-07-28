const { createClient } = require("redis");
const { createAdapter } = require("@socket.io/redis-adapter");

async function setupRedis(io) {
    const redisUrl = process.env.REDIS_URL;
    
    if (!redisUrl) {
        console.warn("⚠️  REDIS_URL not set. Running without Redis adapter. Some features may be limited.");
        return { pubClient: null, subClient: null };
    }

    try {
        const pubClient = createClient({
            url: redisUrl,
            socket: {
                connectTimeout: 5000,
                reconnectStrategy: (retries) => Math.min(retries * 100, 3000),
            }
        });

        pubClient.on("error", (err) => {
            console.error("⚠️ Redis PubClient Error:", err.message);
        });

        const subClient = pubClient.duplicate();

        subClient.on("error", (err) => {
            console.error("⚠️ Redis SubClient Error:", err.message);
        });

        // Add manual timeout wrapper
        const connectWithTimeout = Promise.race([
            Promise.all([pubClient.connect(), subClient.connect()]),
            new Promise((_, reject) => setTimeout(() => reject(new Error("Redis connection timeout after 3s")), 3000))
        ]);

        await connectWithTimeout;

        io.adapter(createAdapter(pubClient, subClient));
        console.log("✅ Redis connected successfully");

        return { pubClient, subClient };
    } catch (err) {
        console.warn("⚠️  Redis connection failed. Running without Redis adapter. Some features may be limited.");
        console.warn("   Error:", err.message);
        return { pubClient: null, subClient: null };
    }
}

module.exports = setupRedis;