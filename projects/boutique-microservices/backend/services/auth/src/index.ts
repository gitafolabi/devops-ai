import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import rateLimit from 'express-rate-limit';
import * as dotenv from 'dotenv';
import { authRoutes } from './routes/auth';
import { connectDB } from './database/connection';
import { metricsMiddleware, setupMetrics } from './metrics';
import { initRabbitMQ } from './rabbitmq';

dotenv.config();

const app = express();
const PORT = process.env.PORT || 3002;

app.use(helmet());
app.use(cors());
app.use(express.json({ limit: '10kb' }));

setupMetrics(app, { serviceName: 'auth', serviceVersion: '1.0.0' });

app.use(metricsMiddleware);

const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 20,
  standardHeaders: true,
  legacyHeaders: false,
  message: { message: 'Too many requests from this IP, please try again in 15 minutes' },
});

app.use('/login', authLimiter);
app.use('/register', authLimiter);

app.use('', authRoutes);

app.use((err: any, req: express.Request, res: express.Response, next: express.NextFunction) => {
  console.error(err.stack);
  res.status(500).json({ error: 'Internal server error' });
});

const startServer = async () => {
  try {
    await connectDB();
    const RABBIT_URL = process.env.RABBIT_URL || 'amqp://guest:guest@localhost:5672';
    initRabbitMQ(RABBIT_URL); // non-blocking — service starts even if RabbitMQ is unavailable
    app.listen(PORT, () => {
      console.log(`Auth service running on port ${PORT}`);
    });
  } catch (error) {
    console.error('Failed to start auth service:', error);
    process.exit(1);
  }
};

startServer();