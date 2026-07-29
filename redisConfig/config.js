const { createClient } = require("redis");
const { createAdapter } = require("@socket.io/redis-adapter");

let redisClient = null;
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
                connectTimeout: 2000,  
                reconnectStrategy: false  
            }
        });

        const subClient = pubClient.duplicate();

        // Add manual timeout wrapper
        const connectWithTimeout = Promise.race([
            Promise.all([pubClient.connect(), subClient.connect()]),
            new Promise((_, reject) => setTimeout(() => reject(new Error("Redis connection timeout after 3s")), 3000))
        ]);

        await connectWithTimeout;
        redisClient = pubClient;
        io.adapter(createAdapter(pubClient, subClient));
        console.log("✅ Redis connected successfully");

        return { pubClient, subClient };

    } catch (err) {
        console.warn("⚠️  Redis connection failed. Running without Redis adapter. Some features may be limited.");
        console.warn("   Error:", err.message);
        return { pubClient: null, subClient: null };
    }
}

function getRedisClient() {
    return redisClient;
}
module.exports = {
    setupRedis,
    getRedisClient
};