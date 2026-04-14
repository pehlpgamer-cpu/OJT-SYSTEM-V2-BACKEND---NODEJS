/**
 * Custom Error Handler Class
 * 
 * WHY: Having a custom error class provides:
 * 1. Consistent error responses across the API
 * 2. Built-in logging for audit trails
 * 3. Structured error information for debugging
 * 4. Security (doesn't expose internal stack traces to clients)
 */

import { config } from '../config/env.js';

// Vercel serverless detection
const isVercelServerless = process.env.VERCEL === '1';

/**
 * Custom error class for consistent error handling
 * 
 * WHY: Distinguishes between expected application errors
 * and unexpected system errors. Allows graceful handling.
 */
export class AppError extends Error {
  constructor(message, statusCode = 500, context = {}) {
    super(message);
    this.statusCode = statusCode;
    this.context = context;
    this.timestamp = new Date().toISOString();

    // Maintain proper stack trace for debugging
    Error.captureStackTrace(this, this.constructor);
  }

  /**
   * Convert error to JSON response format
   * 
   * WHY: Provides consistent response structure for frontend
   */
  toJSON(includeStack = false) {
    const response = {
      message: this.message,
      statusCode: this.statusCode,
      timestamp: this.timestamp,
    };

    // Only include stack trace in development mode
    if (config.app.debug && includeStack) {
      response.stack = this.stack;
    }

    return response;
  }
}

/**
 * Logger utility for structured logging
 * 
 * WHY: Structured logging helps with:
 * 1. Debugging - know exactly what happened and when
 * 2. Monitoring - detect patterns in errors
 * 3. Compliance - audit trail for sensitive operations
 * 4. Performance analysis - track slow requests
 */
export class Logger {
  /**
   * Log levels with severity
   * WHY: Different levels let us filter logs by importance
   */
  static LEVELS = {
    ERROR: 'ERROR',
    WARN: 'WARN',
    INFO: 'INFO',
    DEBUG: 'DEBUG',
  };

  /**
   * Internal method to format and write logs
   * 
   * WHY separate method: DRY principle - all logs go through
   * same formatting and validation
   */
  static #writeLog(level, message, meta = {}) {
    const logEntry = {
      timestamp: new Date().toISOString(),
      level,
      message,
      ...meta,
    };

    // Always log to console in development
    if (config.app.debug) {
      const color = this.#getColorForLevel(level);
      console.log(`${color}[${level}]${'\x1b[0m'}`, message, meta);
    }

    // On Vercel/production, only log errors to console (not file)
    if (!isVercelServerless && (config.app.env === 'production' || level === 'ERROR')) {
      // File logging disabled on Vercel - logs only go to console/stdout
      console.log(JSON.stringify(logEntry));
    }
  }

  /**
   * Get ANSI color code for log level
   * WHY: Makes console logs easier to read during development
   */
  static #getColorForLevel(level) {
    const colors = {
      ERROR: '\x1b[31m', // Red
      WARN: '\x1b[33m',  // Yellow
      INFO: '\x1b[36m',  // Cyan
      DEBUG: '\x1b[90m', // Gray
    };
    return colors[level] || '\x1b[0m';
  }

  /**
   * Error logging - used for exceptions and failures
   * WHY: Errors need special attention for debugging
   */
  static error(message, error = null, meta = {}) {
    const errorMeta = {
      ...meta,
      ...(error && {
        errorMessage: error.message,
        errorStack: error.stack,
      }),
    };
    this.#writeLog(this.LEVELS.ERROR, message, errorMeta);
  }

  /**
   * Warning logging - used for suspicious but handled situations
   */
  static warn(message, meta = {}) {
    this.#writeLog(this.LEVELS.WARN, message, meta);
  }

  /**
   * Info logging - normal operational events
   * WHY: Track important business events for monitoring
   */
  static info(message, meta = {}) {
    this.#writeLog(this.LEVELS.INFO, message, meta);
  }

  /**
   * Debug logging - detailed diagnostic information
   */
  static debug(message, meta = {}) {
    this.#writeLog(this.LEVELS.DEBUG, message, meta);
  }
}

/**
 * Express error handling middleware
 * 
 * WHY: Centralized error handling catches all errors
 * from routes and services, formats them consistently,
 * and prevents app crashes.
 * 
 * NOTE: Must be the LAST middleware defined (after routes)
 */
export const errorHandler = (err, req, res, next) => {
  // Log the error
  Logger.error(
    err.message,
    err,
    {
      method: req.method,
      path: req.path,
      userAgent: req.get('user-agent'),
    }
  );

  // If it's our custom AppError, use its status code
  if (err instanceof AppError) {
    return res.status(err.statusCode).json(err.toJSON(config.app.debug));
  }

  // Unknown errors - return generic 500
  const statusCode = err.statusCode || 500;
  const message = config.app.debug ? err.message : 'Internal server error';

  res.status(statusCode).json({
    message,
    statusCode,
    timestamp: new Date().toISOString(),
  });
};

/**
 * Async error wrapper for Express route handlers
 * 
 * WHY: Express doesn't catch async errors by default.
 * This wrapper ensures all errors are caught and logged.
 * 
 * USAGE: wrap(async (req, res, next) => { ... })
 */
export const wrap = (fn) => (req, res, next) => {
  return Promise.resolve(fn(req, res, next)).catch(next);
};

export default {
  AppError,
  Logger,
  errorHandler,
  wrap,
};
