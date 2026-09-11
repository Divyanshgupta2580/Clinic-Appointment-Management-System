require('dotenv').config();
const { connectDB, closeDB } = require('../config/db');

async function testConnection() {
  console.log('[Test] Testing connection to MongoDB Atlas...');
  const uri = process.env.MONGODB_URI;
  if (!uri) {
    console.error('[Error] Configuration Error: MONGODB_URI is not defined in environment');
    process.exit(1);
  }

  console.log('[Config] Target URI: [CONFIGURED IN ENVIRONMENT]');

  try {
    const conn = await connectDB();
    console.log(`[PASS] Connected successfully to host: ${conn.host}`);
    console.log(`[PASS] Database name: ${conn.name}`);
    await closeDB();
    console.log('[PASS] Connection closed cleanly.');
    process.exit(0);
  } catch (err) {
    console.error('[FAIL] MongoDB connection error:', err.message);
    if (err.name) console.error('  Error Name:', err.name);
    if (err.code) console.error('  Error Code:', err.code);
    process.exit(1);
  }
}

testConnection();
