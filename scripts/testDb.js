require('dotenv').config();
const { connectDB, closeDB } = require('../config/db');

async function testConnection() {
  console.log('Testing connection to MongoDB...');
  console.log('URI:', process.env.MONGODB_URI);
  try {
    const conn = await connectDB();
    console.log('MongoDB connected successfully!');
    await closeDB();
    process.exit(0);
  } catch (err) {
    console.error('MongoDB connection error:', err.message);
    process.exit(1);
  }
}

testConnection();
