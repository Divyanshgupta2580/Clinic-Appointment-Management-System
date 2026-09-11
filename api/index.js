const app = require('../app');
const { connectDB } = require('../config/db');

/**
 * Vercel Serverless Function Handler
 * Bridges incoming serverless HTTP requests to the Express application
 * and reuses the cached Mongoose database connection pool across invocations.
 */
module.exports = async (req, res) => {
  try {
    await connectDB();
    return app(req, res);
  } catch (err) {
    console.error('[Vercel Serverless Error] Database connection failed:', err.message);
    return res.status(500).json({
      status: 'error',
      message: 'Database connection failed in serverless environment.',
    });
  }
};
