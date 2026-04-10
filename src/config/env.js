/**
 * Environment Configuration
 * 
 * WHY: Centralize all environment variables in one place for easy access,
 * validation, and management. This follows the 12-factor app methodology.
 * 
 * WHAT: Loads environment variables from .env file and provides them
 * with defaults, validating critical values.
 */

import dotenv from 'dotenv';

// Load environment variables from .env file
dotenv.config();

/**
 * Environment configuration object
 * 
 * WHY: Use an object instead of accessing process.env directly throughout
 * the code because:
 * 1. Single source of truth - easier to change later
 * 2. Type safety - can validate values upfront
 * 3. Centralized defaults - application won't crash if env vars are missing
 */
export const config = {
  // General Application Settings
  app: {
    name: process.env.APP_NAME || 'OJT System V2',
    env: process.env.APP_ENV || 'development',
    debug: process.env.APP_DEBUG === 'true',
    port: parseInt(process.env.APP_PORT || '5000'),
    url: process.env.APP_URL || 'http://localhost:5000',
  },

  // Database Configuration
  database: {
    connection: process.env.DB_CONNECTION || 'sqlite',
    path: process.env.DB_PATH || './database/ojt_system.db',
  },

  // Authentication (JWT)
  auth: {
    secret: process.env.JWT_SECRET,
    expiresIn: process.env.JWT_EXPIRES_IN || '7d',
    bcryptRounds: parseInt(process.env.BCRYPT_ROUNDS || '10'),
  },

  // Google OAuth Configuration
  google: {
    clientId: process.env.GOOGLE_CLIENT_ID,
    clientSecret: process.env.GOOGLE_CLIENT_SECRET,
    devCallbackUrl: process.env.GOOGLE_DEV_CALLBACK_URL || 'http://localhost:5000/api/auth/google/callback',
    prodCallbackUrl: process.env.GOOGLE_PROD_CALLBACK_URL || process.env.APP_URL + '/api/auth/google/callback',
  },

  // Rate Limiting (Security - prevent brute force attacks)
  rateLimit: {
    windowMs: parseInt(process.env.RATE_LIMIT_WINDOW_MS || '900000'), // 15 minutes
    maxRequests: parseInt(process.env.RATE_LIMIT_MAX_REQUESTS || '100'),
  },

  // CORS (Cross-Origin Resource Sharing)
  cors: {
    origin: (process.env.CORS_ORIGIN || 'http://localhost:3000').split(','),
    methods: ['GET', 'POST', 'PUT', 'DELETE'],
    credentials: true,
  },

  // Logging Configuration
  logging: {
    level: process.env.LOG_LEVEL || 'info',
    file: process.env.LOG_FILE || './logs/app.log',
  },
};

/**
 * Validate critical environment variables
 * 
 * WHY: Fail fast during startup rather than hours later during
 * a critical operation. This prevents silent failures and makes
 * debugging easier.
 */
export function validateConfig() {
  const required = ['JWT_SECRET'];
  const missing = required.filter(key => !process.env[key]);

  if (missing.length > 0) {
    throw new Error(
      `Missing required environment variables: ${missing.join(', ')}. ` +
      `Please check your .env file.`
    );
  }

  console.log(`✅ Environment configuration validated for ${config.app.env} mode`);
}

export default config;
