const mongoose = require('mongoose');

async function connectDB() {
  try {
    const uri = process.env.MONGO_URI;
    if (!uri) {
      console.warn('[db] MONGO_URI is not set — the API will start but database calls will fail until it is configured.');
      return;
    }
    await mongoose.connect(uri);
    console.log('[db] MongoDB Atlas connected');
  } catch (err) {
    console.error('[db] MongoDB connection error:', err.message);
    process.exit(1);
  }
}

module.exports = connectDB;
