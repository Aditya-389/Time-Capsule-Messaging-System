import "dotenv/config";
import IORedis from "ioredis";

const globalForRedis = globalThis;

const redisUrl = process.env.REDIS_URL || "redis://127.0.0.1:6379";
const queueName = process.env.BULLMQ_QUEUE_NAME || "message-delivery";

const createRedisConnection = () =>
  new IORedis(redisUrl, {
    lazyConnect: true,
    maxRetriesPerRequest: null
  });

export const queueConnection =
  globalForRedis.messageQueueConnection || createRedisConnection();

export const workerConnection =
  globalForRedis.messageWorkerConnection || createRedisConnection();

queueConnection.on("error", (error) => {
  console.error("Redis queue connection error:", error.message);
});

workerConnection.on("error", (error) => {
  console.error("Redis worker connection error:", error.message);
});

if (process.env.NODE_ENV !== "production") {
  globalForRedis.messageQueueConnection = queueConnection;
  globalForRedis.messageWorkerConnection = workerConnection;
}

export { redisUrl, queueName };
