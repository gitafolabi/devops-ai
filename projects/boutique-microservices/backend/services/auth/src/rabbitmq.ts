import amqp from 'amqplib';

let channel: amqp.Channel | null = null;

export const initRabbitMQ = async (url: string): Promise<void> => {
  const MAX_RETRIES = 5;
  for (let i = 0; i < MAX_RETRIES; i++) {
    try {
      const connection = await amqp.connect(url);
      channel = await connection.createChannel();
      connection.on('error', () => { channel = null; });
      connection.on('close', () => { channel = null; });
      console.log('[Auth] RabbitMQ connected');
      return;
    } catch {
      await new Promise(r => setTimeout(r, 2000 * (i + 1)));
    }
  }
  console.warn('[Auth] RabbitMQ unavailable — events will be skipped');
};

export const publishEvent = async (queue: string, data: object): Promise<void> => {
  if (!channel) return;
  try {
    await channel.assertQueue(queue, { durable: true });
    channel.sendToQueue(queue, Buffer.from(JSON.stringify(data)), { persistent: true });
  } catch (err) {
    console.error('[Auth] Failed to publish event:', err);
  }
};
