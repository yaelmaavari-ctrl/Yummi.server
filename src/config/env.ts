import dotenv from 'dotenv';
import path from 'path';

// Resolve .env relative to the project root regardless of working directory.
dotenv.config({ path: path.resolve(__dirname, '..', '..', '.env') });

/**
 * Reads a required environment variable, throwing if it is missing.
 */
function required(key: string): string {
  const value = process.env[key];
  if (value === undefined || value === '') {
    throw new Error(`Missing required environment variable: ${key}`);
  }
  return value;
}

/**
 * Reads an optional environment variable with a fallback default.
 */
function optional(key: string, fallback: string): string {
  const value = process.env[key];
  return value === undefined || value === '' ? fallback : value;
}

export const env = {
  nodeEnv: optional('NODE_ENV', 'development'),
  port: parseInt(optional('PORT', '5000'), 10),
  mongoUri: required('MONGO_URI'),
  jwt: {
    secret: required('JWT_SECRET'),
    expiresIn: optional('JWT_EXPIRES_IN', '7d'),
  },
  clientUrl: optional('CLIENT_URL', 'http://localhost:4200'),
};

export const isProduction = env.nodeEnv === 'production';
