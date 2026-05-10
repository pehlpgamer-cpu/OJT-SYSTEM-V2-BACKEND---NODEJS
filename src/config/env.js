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
  // PostgreSQL is REQUIRED - configured via DATABASE_URL
  database: {
    connection: 'postgresql',
    // DATABASE_URL must be set as an environment variable
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
    maxRequests: parseInt(process.env.RATE_LIMIT_MAX_REQUESTS || '100'), // Default general limit
    // Separate limits for different endpoint types
    maxRequestsAuth: parseInt(process.env.RATE_LIMIT_MAX_REQUESTS_AUTH || '10'), // 10 auth attempts per 15min
    maxRequestsApi: parseInt(process.env.RATE_LIMIT_MAX_REQUESTS_API || '300'), // 300 general API per 15min
    maxRequestsPasswordReset: parseInt(process.env.RATE_LIMIT_MAX_REQUESTS_PASSWORD_RESET || '3'), // 3 password reset attempts
  },

  // CORS (Cross-Origin Resource Sharing)
  cors: {
    // Support both same-origin and cross-domain deployments
    // Production (Vercel): Use explicit frontend origin
    // Development: Allow localhost variants
    origin: process.env.CORS_ORIGIN 
      ? process.env.CORS_ORIGIN.split(',').map(o => o.trim())
      : (process.env.VERCEL === '1' 
          ? ['https://ojt.netlify.app', 'https://www.ojt.netlify.app'] // Explicit for production
          : ['http://localhost:3000', 'http://localhost:5000', 'http://localhost:5173']), // Dev includes both ports
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'OPTIONS'],
    // CRITICAL: Always allow credentials for JWT-based auth to work cross-domain
    credentials: true,
    allowedHeaders: ['Content-Type', 'Authorization'],
    optionsSuccessStatus: 200,
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
  // DATABASE_URL is REQUIRED in all environments (PostgreSQL only)
  const required = ['DATABASE_URL', ...(isProduction ? ['JWT_SECRET'] : [])];
  const missing = required.filter(key => !process.env[key]);

  if (missing.length > 0) {
    throw new Error(
      `Missing required environment variables: ${missing.join(', ')}. ` +
      `DATABASE_URL must be a valid PostgreSQL connection string (postgresql://...). ` +
      `Please check your .env file.`
    );
  }
  
  // Validate DATABASE_URL format
  if (!process.env.DATABASE_URL.startsWith('postgresql://')) {
    throw new Error(
      'DATABASE_URL must be a valid PostgreSQL connection string starting with "postgresql://". '
      + 'SQLite and other database types are not supported.'
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
