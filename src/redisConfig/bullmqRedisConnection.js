/**
 * Connection options for BullMQ (ioredis-compatible).
 *
 * This is intentionally SEPARATE from redisConfig/config.js — that file
 * exports an async setupRedis(io) function built for the Socket.IO
 * Redis adapter (using the `redis` npm package's createClient). BullMQ
 * needs a plain connection object or connection string instead, so it
 * can't reuse that file directly, even though both ultimately point at
 * the same Redis instance.
 *
 * Reuses the same REDIS_URL env var as redisConfig/config.js so you're
 * not maintaining two separate Redis endpoints in your env file.
 */
module.exports = process.env.REDIS_URL || {
    host: process.env.REDIS_HOST || "127.0.0.1",
    port: process.env.REDIS_PORT || 6379,
};