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
    secret: process.env.JWT_SECRET || 'development-secret-key-change-in-production',
    expiresIn: process.env.JWT_EXPIRES_IN || '7d',
    bcryptRounds: parseInt(process.env.BCRYPT_ROUNDS || '10'),
  },

  // Google OAuth Configuration
  google: {
    clientId: process.env.GOOGLE_CLIENT_ID,
    clientSecret: process.env.GOOGLE_CLIENT_SECRET,
    enabled: process.env.GOOGLE_OAUTH_ENABLED === 'true',
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
    // On Vercel, allow all origins by default for testing
    origin: process.env.CORS_ORIGIN 
      ? process.env.CORS_ORIGIN.split(',').map(o => o.trim())
      : (process.env.VERCEL === '1' ? '*' : ['http://localhost:3000', 'http://localhost:5173']),
    methods: ['GET', 'POST', 'PUT', 'DELETE'],
    credentials: process.env.VERCEL === '1' ? false : true, // Can't use credentials with *
  },

  // Logging Configuration
  logging: {
    level: process.env.LOG_LEVEL || 'info',
    file: process.env.LOG_FILE || './logs/app.log', // Ignored on Vercel
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
  const isProduction = process.env.NODE_ENV === 'production' || config.app.env === 'production' || process.env.VERCEL === '1';
  const required = isProduction ? ['JWT_SECRET', 'DATABASE_URL'] : [];
  const missing = required.filter(key => !process.env[key]);

  if (missing.length > 0) {
    throw new Error(
      `Missing required environment variables: ${missing.join(', ')}. ` +
      `Please check your .env file.`
    );
  }

  if (isProduction) {
    const secret = process.env.JWT_SECRET || '';
    if (secret.length < 32 || secret === 'development-secret-key-change-in-production') {
      throw new Error('JWT_SECRET must be at least 32 characters and must not use the development default');
    }
  }

  if (config.google.enabled && (!config.google.clientId || !config.google.clientSecret)) {
    throw new Error('GOOGLE_OAUTH_ENABLED=true requires GOOGLE_CLIENT_ID and GOOGLE_CLIENT_SECRET');
  }

  console.log(`✅ Environment configuration validated for ${config.app.env} mode`);
}

export default config;
