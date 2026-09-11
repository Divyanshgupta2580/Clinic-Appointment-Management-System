require('dotenv').config();
const { connectDB, closeDB } = require('../config/db');

async function testConnection() {
  console.log('Testing connection to MongoDB Atlas...');
  const uri = process.env.MONGODB_URI;
  if (!uri) {
    console.error('❌ Configuration Error: MONGODB_URI is not defined in .env');
    process.exit(1);
  }

  console.log('Target URI: [CONFIGURED IN ENVIRONMENT]');

  try {
    const conn = await connectDB();
    console.log(`✓ Connected successfully to host: ${conn.host}`);
    console.log(`✓ Database name: ${conn.name}`);
    await closeDB();
    console.log('✓ Connection closed cleanly.');
    process.exit(0);
  } catch (err) {
    console.error('❌ MongoDB connection error:', err.message);
    if (err.name) console.error('  Error Name:', err.name);
    if (err.code) console.error('  Error Code:', err.code);
    process.exit(1);
  }
}

testConnection();
