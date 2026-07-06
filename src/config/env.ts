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
  /**
   * AI agent configuration. The API key is intentionally optional so the
   * server boots without it; the agent endpoint returns 503 when unset.
   *
   * Uses the OpenAI SDK with an optional custom base URL so Groq, Ollama, and
   * other OpenAI-compatible providers work without code changes.
   */
  ai: {
    apiKey: process.env['OPENAI_API_KEY'] ?? '',
    baseUrl: resolveAiBaseUrl(process.env['OPENAI_API_KEY'] ?? ''),
    // llama-3.1-8b-instant is fast and reliable for tool-calling on Groq free tier.
    model: optional('OPENAI_MODEL', 'llama-3.1-8b-instant'),
    // Hard cap on tool-calling rounds per request to bound cost and prevent loops.
    maxToolRounds: parseInt(optional('AGENT_MAX_TOOL_ROUNDS', '3'), 10),
  },
};

/** Groq keys start with `gsk_`; Ollama accepts any non-empty placeholder. */
function resolveAiBaseUrl(apiKey: string): string | undefined {
  const explicit = process.env['OPENAI_BASE_URL'];
  if (explicit !== undefined && explicit !== '') {
    return explicit;
  }
  if (apiKey.startsWith('gsk_')) {
    return 'https://api.groq.com/openai/v1';
  }
  return undefined;
}

export const isProduction = env.nodeEnv === 'production';

/** True only when an AI provider key is configured. */
export const isAiConfigured = env.ai.apiKey !== '';
