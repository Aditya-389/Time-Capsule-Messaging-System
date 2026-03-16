import "dotenv/config"
import { mkdir, appendFile } from "node:fs/promises";
import path from "node:path";
import { Queue, Worker } from "bullmq";
import prisma from "../config/prismaClient.js";
import {
  queueConnection,
  workerConnection,
  queueName
} from "../config/redis.js";

const LOG_DIRECTORY = path.join(process.cwd(), "logs");
const DELIVERY_LOG_FILE = path.join(LOG_DIRECTORY, "deliveries.log");
const DELIVERY_JOB_NAME = "deliver-message";

const messageQueue = new Queue(queueName, {
  connection: queueConnection,
  defaultJobOptions: {
    removeOnComplete: 1000,
    removeOnFail: false
  }
});

let messageWorker;

const ensureRedisConnected = async (connection) => {
  if (connection.status === "ready" || connection.status === "connect") {
    return;
  }

  if (connection.status === "wait") {
    await connection.connect();
    return;
  }

  if (connection.status === "connecting") {
    await new Promise((resolve, reject) => {
      connection.once("ready", resolve);
      connection.once("error", reject);
    });
    return;
  }

  await connection.connect();
};

const toApiMessage = (message) => ({
  id: message.id,
  recipient_email: message.recipientEmail,
  message: message.message,
  deliver_at: message.deliverAt,
  status: message.status.toLowerCase(),
  created_at: message.createdAt,
  delivered_at: message.deliveredAt
});

const writeDeliveryLog = async (messageId, recipientEmail, deliveredAt) => {
  await mkdir(LOG_DIRECTORY, { recursive: true });
  await appendFile(
    DELIVERY_LOG_FILE,
    `[${deliveredAt.toISOString()}] Delivered message ${messageId} to ${recipientEmail}\n`
  );
};

const getDeliveryDelay = (deliverAt) => Math.max(deliverAt.getTime() - Date.now(), 0);

const ensureDeliveryJob = async (message) => {
  const existingJob = await messageQueue.getJob(message.id);

  if (existingJob) {
    return existingJob;
  }

  return messageQueue.add(
    DELIVERY_JOB_NAME,
    {
      messageId: message.id
    },
    {
      jobId: message.id,
      delay: getDeliveryDelay(message.deliverAt),
      attempts: 3,
      backoff: {
        type: "exponential",
        delay: 5000
      }
    }
  );
};

export const createMessage = async ({ userId, recipientEmail, message, deliverAt }) => {
  const createdMessage = await prisma.message.create({
    data: {
      userId,
      recipientEmail,
      message,
      deliverAt
    }
  });

  try {
    await ensureDeliveryJob(createdMessage);
  } catch (error) {
    await prisma.message.delete({
      where: { id: createdMessage.id }
    });
    throw error;
  }

  return toApiMessage(createdMessage);
};

export const getMessagesByUserId = async (userId) => {
  const messages = await prisma.message.findMany({
    where: { userId },
    orderBy: {
      createdAt: "desc"
    }
  });

  return messages.map(toApiMessage);
};

export const processQueuedMessageDelivery = async (messageId) => {
  const message = await prisma.message.findUnique({
    where: {
      id: messageId
    },
    select: {
      id: true,
      recipientEmail: true,
      deliverAt: true,
      status: true
    }
  });

  if (!message || message.status !== "PENDING") {
    return false;
  }

  if (message.deliverAt.getTime() > Date.now()) {
    await ensureDeliveryJob({
      id: message.id,
      deliverAt: message.deliverAt
    });
    return false;
  }

  const deliveredAt = new Date();
  const updateResult = await prisma.message.updateMany({
    where: {
      id: message.id,
      status: "PENDING"
    },
    data: {
      status: "DELIVERED",
      deliveredAt
    }
  });

  if (updateResult.count === 0) {
    return false;
  }

  await writeDeliveryLog(message.id, message.recipientEmail, deliveredAt);
  return true;
};

export const syncPendingMessagesToQueue = async () => {
  const pendingMessages = await prisma.message.findMany({
    where: {
      status: "PENDING"
    },
    select: {
      id: true,
      deliverAt: true
    }
  });

  for (const pendingMessage of pendingMessages) {
    await ensureDeliveryJob(pendingMessage);
  }

  return pendingMessages.length;
};

export const startMessageDeliveryWorker = async () => {
  await Promise.all([
    ensureRedisConnected(queueConnection),
    ensureRedisConnected(workerConnection)
  ]);

  if (!messageWorker) {
    messageWorker = new Worker(
      queueName,
      async (job) => processQueuedMessageDelivery(job.data.messageId),
      {
        connection: workerConnection,
        concurrency: 10
      }
    );

    messageWorker.on("failed", (job, error) => {
      console.error(
        `Message delivery job failed${job ? ` (${job.id})` : ""}:`,
        error.message
      );
    });
  }

  await syncPendingMessagesToQueue();

  return {
    queue: messageQueue,
    worker: messageWorker
  };
};

export const stopMessageDeliveryWorker = async () => {
  await Promise.all([
    messageWorker?.close(),
    messageQueue.close(),
    queueConnection.quit(),
    workerConnection.quit()
  ]);
};
