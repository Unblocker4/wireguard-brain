import mongoose from 'mongoose';

const connectDB = async () => {
  try {
    const conn = await mongoose.connect(process.env.MONGODB_URI);
    console.log(`[INFO] Successfully connected to MongoDB Atlas: ${conn.connection.host}`);
  } catch (err) {
    console.error('[FATAL] MongoDB connection error:', err.message);
    // Let server.js handle exiting
    throw new Error('Failed to connect to DB');
  }
};

export default connectDB;