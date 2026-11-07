const mongoose = require('mongoose');

/**
 * connectDB — connects to MongoDB. Throws on failure (MongoDB is required).
 * No JSON file fallback.
 */
const connectDB = async () => {
  const uri = process.env.MONGODB_URI || 'mongodb://127.0.0.1:27017/smart_cane';
  try {
    const conn = await mongoose.connect(uri, {
      serverSelectionTimeoutMS: 5000
    });
    console.log(`[MongoDB] Connected to database: ${conn.connection.host}`);
  } catch (err) {
    console.error(`[MongoDB] Connection failed: ${err.message}`);
    throw err;
  }
};

const getDBStatus = () => ({
  mode: 'mongodb',
  connected: mongoose.connection.readyState === 1
});

module.exports = { connectDB, getDBStatus };
