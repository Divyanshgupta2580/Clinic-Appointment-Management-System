import path from 'path';
import dotenv from 'dotenv';

// Load .env from current directory, backend root, or workspace root
dotenv.config();
dotenv.config({ path: path.resolve(__dirname, '../../.env') });
dotenv.config({ path: path.resolve(__dirname, '../../../.env') });

export interface AppConfig {
  NODE_ENV: string;
  PORT: number;
  MONGODB_URI: string;
  JWT_SECRET: string;
  FRONTEND_URL: string;
}

export const config: AppConfig = {
  NODE_ENV: process.env.NODE_ENV || 'development',
  PORT: parseInt(process.env.PORT || '5000', 10),
  MONGODB_URI: process.env.MONGODB_URI || '',
  JWT_SECRET: process.env.JWT_SECRET || process.env.SESSION_SECRET || 'dev-jwt-secret-key-at-least-32-chars-long',
  FRONTEND_URL: process.env.FRONTEND_URL || 'http://localhost:3000',
};

export const validateEnv = (): void => {
  if (!config.MONGODB_URI) {
    throw new Error('[Config Error] MONGODB_URI environment variable is not defined.');
  }
  if (!config.JWT_SECRET) {
    throw new Error('[Config Error] JWT_SECRET / SESSION_SECRET is not defined.');
  }
};
