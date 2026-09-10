require('dotenv').config();
const http = require('http');
const app = require('./app');
const { connectDB, closeDB } = require('./config/db');
const { initSocket } = require('./sockets/socket');

const PORT = process.env.PORT || 3000;

// Create HTTP server
const server = http.createServer(app);

// Initialize Socket.IO with HTTP server
initSocket(server);

// Start server after connecting to MongoDB
const startServer = async () => {
  try {
    await connectDB();

    server.listen(PORT, () => {
      console.log('====================================================');
      console.log(`🏥 MediPulse Clinic Management System`);
      console.log(`🚀 Server running on port: ${PORT}`);
      console.log(`🌐 Local URL: http://localhost:${PORT}`);
      console.log(`⚙️  Environment: ${process.env.NODE_ENV || 'development'}`);
      console.log('====================================================');
    });
  } catch (err) {
    console.error('[Server Startup Error] Could not connect to database:', err.message);
    process.exit(1);
  }
};

startServer();

// Graceful shutdown
const shutdown = async (signal) => {
  console.log(`\n[Server] Received ${signal}. Starting graceful shutdown...`);
  server.close(async () => {
    console.log('[Server] HTTP server closed.');
    await closeDB();
    process.exit(0);
  });

  // Force exit after 10s if hanging
  setTimeout(() => {
    console.error('[Server] Could not close connections in time, forcefully shutting down.');
    process.exit(1);
  }, 10000);
};

process.on('SIGTERM', () => shutdown('SIGTERM'));
process.on('SIGINT', () => shutdown('SIGINT'));
