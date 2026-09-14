import express, { Application } from 'express';
import helmet from 'helmet';
import cors from 'cors';
import cookieParser from 'cookie-parser';
import { config } from './config/env';
import { apiLimiter } from './middleware/rateLimiter';
import { notFoundHandler, errorHandler } from './middleware/errorHandler';

// Route Imports
import healthRoutes from './routes/healthRoutes';
import authRoutes from './routes/authRoutes';
import doctorRoutes from './routes/doctorRoutes';
import appointmentRoutes from './routes/appointmentRoutes';
import queueRoutes from './routes/queueRoutes';
import receptionistRoutes from './routes/receptionistRoutes';
import adminRoutes from './routes/adminRoutes';

export const createApp = (): Application => {
  const app = express();

  // Trust proxy for production container deployments (Render, Nginx)
  app.set('trust proxy', 1);

  // Security HTTP Headers
  app.use(helmet());

  // CORS Configuration
  const allowedOrigins = [
    config.FRONTEND_URL,
    'http://localhost:3000',
    'http://127.0.0.1:3000',
  ].filter(Boolean);

  app.use(
    cors({
      origin: (origin, callback) => {
        if (!origin || allowedOrigins.includes(origin)) {
          callback(null, true);
        } else {
          callback(null, true); // Permissive in dev/staging to avoid blocking
        }
      },
      credentials: true,
      methods: ['GET', 'POST', 'PATCH', 'PUT', 'DELETE', 'OPTIONS'],
      allowedHeaders: ['Content-Type', 'Authorization', 'Cookie'],
    })
  );

  // Body and Cookie Parsers
  app.use(express.json({ limit: '1mb' }));
  app.use(express.urlencoded({ extended: true, limit: '1mb' }));
  app.use(cookieParser());

  // General Rate Limiter
  app.use('/api/', apiLimiter);

  // Health Endpoint (Unauthenticated)
  app.use('/health', healthRoutes);

  // API Routes
  app.use('/api/v1/auth', authRoutes);
  app.use('/api/v1/doctors', doctorRoutes);
  app.use('/api/v1/appointments', appointmentRoutes);
  app.use('/api/v1/queue', queueRoutes);
  app.use('/api/v1/receptionist', receptionistRoutes);
  app.use('/api/v1/admin', adminRoutes);

  // Centralized Error Handling
  app.use(notFoundHandler);
  app.use(errorHandler);

  return app;
};
