import amqp from 'amqplib';
import * as dotenv from 'dotenv';
import { sendWelcomeEmail, sendOrderConfirmationEmail } from './emailService';

dotenv.config();

const RABBIT_URL = process.env.RABBIT_URL || 'amqp://guest:guest@localhost:5672';

const QUEUES = {
  USER_REGISTERED: 'user.registered',
  ORDER_CREATED: 'order.created',
};

const sleep = (ms: number) => new Promise(resolve => setTimeout(resolve, ms));

const connectWithRetry = async (retries = 15, delayMs = 3000): Promise<amqp.Connection> => {
  for (let i = 0; i < retries; i++) {
    try {
      const conn = await amqp.connect(RABBIT_URL);
      console.log('[Notification] Connected to RabbitMQ');
      return conn;
    } catch {
      console.log(`[Notification] Waiting for RabbitMQ (${i + 1}/${retries})...`);
      await sleep(delayMs);
    }
  }
  throw new Error('Could not connect to RabbitMQ after multiple attempts');
};

const startConsumer = async (): Promise<void> => {
  let connection: amqp.Connection;

  try {
    connection = await connectWithRetry();
  } catch (err) {
    console.error('[Notification] RabbitMQ unreachable — exiting');
    process.exit(1);
  }

  connection.on('error', (err) => {
    console.error('[Notification] RabbitMQ connection error:', err.message);
    setTimeout(startConsumer, 5000);
  });

  connection.on('close', () => {
    console.warn('[Notification] RabbitMQ connection closed, reconnecting...');
    setTimeout(startConsumer, 5000);
  });

  const channel = await connection.createChannel();
  channel.prefetch(5);

  await channel.assertQueue(QUEUES.USER_REGISTERED, { durable: true });
  await channel.assertQueue(QUEUES.ORDER_CREATED, { durable: true });

  channel.consume(QUEUES.USER_REGISTERED, async (msg) => {
    if (!msg) return;
    try {
      const { email, firstName } = JSON.parse(msg.content.toString());
      await sendWelcomeEmail(email, firstName);
      channel.ack(msg);
    } catch (err) {
      console.error('[Notification] Failed to process user.registered:', err);
      channel.nack(msg, false, false);
    }
  });

  channel.consume(QUEUES.ORDER_CREATED, async (msg) => {
    if (!msg) return;
    try {
      const { email, order } = JSON.parse(msg.content.toString());
      await sendOrderConfirmationEmail(email, order);
      channel.ack(msg);
    } catch (err) {
      console.error('[Notification] Failed to process order.created:', err);
      channel.nack(msg, false, false);
    }
  });

  console.log('[Notification] Service started, listening on queues:', Object.values(QUEUES));
};

startConsumer();
