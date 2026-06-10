import mongoose from 'mongoose';
import { env } from './env';

/**
 * Connects to MongoDB Atlas using Mongoose.
 * Exits the process on initial connection failure.
 */
export async function connectDB(): Promise<void> {
  try {
    mongoose.set('strictQuery', true);
    await mongoose.connect(env.mongoUri);
    console.log('[db] Connected to MongoDB');
  } catch (error) {
    console.error('[db] MongoDB connection error:', error);
    process.exit(1);
  }

  mongoose.connection.on('disconnected', () => {
    console.warn('[db] MongoDB disconnected');
  });

  mongoose.connection.on('error', (err) => {
    console.error('[db] MongoDB error:', err);
  });
}

/**
 * Gracefully closes the Mongoose connection.
 */
export async function disconnectDB(): Promise<void> {
  await mongoose.connection.close();
  console.log('[db] MongoDB connection closed');
}
