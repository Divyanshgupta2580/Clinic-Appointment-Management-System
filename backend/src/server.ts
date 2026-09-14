import http from 'http';
import { createApp } from './app';
import { connectDB, closeDB } from './config/database';
import { config, validateEnv } from './config/env';
import { initSocketServer } from './sockets/socketServer';

const startServer = async (): Promise<void> => {
  try {
    // Validate required environment variables
    validateEnv();

    // Connect to MongoDB Atlas
    await connectDB();

    const app = createApp();
    const server = http.createServer(app);

    // Initialize Socket.IO real-time engine
    initSocketServer(server);

    const PORT = config.PORT;

    server.listen(PORT, '0.0.0.0', () => {
      console.log('====================================================');
      console.log('MediPulse Clinic - Backend Service');
      console.log(`Server listening on: 0.0.0.0:${PORT}`);
      console.log(`Environment: ${config.NODE_ENV}`);
      console.log(`Frontend URL: ${config.FRONTEND_URL}`);
      console.log('====================================================');
    });

    // Graceful process shutdown
    const shutdown = async (signal: string) => {
      console.log(`\n[Server] Received ${signal}. Starting graceful shutdown...`);
      server.close(async () => {
        console.log('[Server] HTTP and WebSocket server closed.');
        await closeDB();
        process.exit(0);
      });

      setTimeout(() => {
        console.error('[Server] Forced shutdown after timeout.');
        process.exit(1);
      }, 10000);
    };

    process.on('SIGTERM', () => shutdown('SIGTERM'));
    process.on('SIGINT', () => shutdown('SIGINT'));
  } catch (err: any) {
    console.error('[Server Startup Error]:', err.message);
    process.exit(1);
  }
};

startServer();
