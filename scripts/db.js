import mongoose from 'mongoose';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

dotenv.config({ path: path.resolve(__dirname, '../../.env') });

export const connectDB = async () => {
  if (mongoose.connection.readyState >= 1) {
    return;
  }

  try {
    await mongoose.connect(process.env.MONGODB_URI, {
      serverSelectionTimeoutMS: 60000, // 1 minute
      socketTimeoutMS: 90000,      // 1.5 minutes
    });
    console.log('MongoDB Connected...');
  } catch (error) {
    console.error('Database connection error:', error);
    process.exit(1);
  }
};

export const closeDB = async () => {
  try {
    await mongoose.disconnect();
    console.log('MongoDB connection closed.');
  } catch (error) {
    console.error('Error closing database connection:', error);
  }
};
