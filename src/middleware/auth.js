/**
 * Authentication Middleware
 * 
 * WHY: Validates JWT tokens and attaches user information to requests.
 * This ensures only authenticated users can access protected routes.
 * 
 * WHAT: Checks Authorization header for Bearer token, verifies signature,
 * and attaches decoded user data to req.user.
 */

import jwt from 'jsonwebtoken';
import { config } from '../config/env.js';
import { AppError, Logger } from '../utils/errorHandler.js';

/**
 * Verify JWT token and extract user information
 * 
 * WHY: Centralized token verification ensures consistent security
 * and makes it easy to change verification logic in one place.
 */
export const authMiddleware = (req, res, next) => {
  try {
    // Extract token from Authorization header
    // Expected format: "Bearer eyJhbGc..."
    const authHeader = req.headers.authorization;

    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      throw new AppError('Missing or invalid Authorization header', 401);
    }

    // Remove "Bearer " prefix (7 characters) to get the actual token
    const token = authHeader.slice(7);

    // Verify token signature and expiration
    // WHY: jwt.verify() throws if token is invalid, expired, or tampered with
    const decoded = jwt.verify(token, config.auth.secret);

    // WHY attach to req: Makes user data available to all downstream handlers
    // without needing to pass it as function parameters
    req.user = decoded;

    Logger.debug('User authenticated', { userId: decoded.id, email: decoded.email });

    next();
  } catch (error) {
    // Token verification failed
    if (error.name === 'TokenExpiredError') {
      Logger.warn('Expired token attempt', { error: error.message });
      return res.status(401).json({
        message: 'Token has expired',
        statusCode: 401,
      });
    }

    if (error.name === 'JsonWebTokenError') {
      Logger.warn('Invalid token attempt', { error: error.message });
      return res.status(401).json({
        message: 'Invalid token',
        statusCode: 401,
      });
    }

    // If it's our AppError, forward it
    if (error instanceof AppError) {
      return res.status(error.statusCode).json(error.toJSON());
    }

    // Unknown error
    res.status(401).json({
      message: 'Authentication failed',
      statusCode: 401,
    });
  }
};

/**
 * Role-Based Access Control Middleware
 * 
 * WHY: Ensures users only access endpoints they have permission for.
 * Different roles (student, company, admin) have different capabilities.
 * 
 * USAGE: rbacMiddleware(['admin', 'coordinator'])
 * (allows only users with admin or coordinator role)
 */
export const rbacMiddleware = (allowedRoles = []) => {
  return (req, res, next) => {
    // Auth middleware should run first to populate req.user
    if (!req.user) {
      return res.status(401).json({
        message: 'User not authenticated',
        statusCode: 401,
      });
    }

    // If no roles specified, allow anyone authenticated
    if (allowedRoles.length === 0) {
      return next();
    }

    // Check if user's role is in the allowed list
    if (!allowedRoles.includes(req.user.role)) {
      Logger.warn('Unauthorized access attempt', {
        userId: req.user.id,
        userRole: req.user.role,
        requiredRoles: allowedRoles,
        path: req.path,
      });

      return res.status(403).json({
        message: `Forbidden. Required role: ${allowedRoles.join(', ')}`,
        statusCode: 403,
      });
    }

    next();
  };
};

/**
 * Rate Limiting Middleware
 * 
 * WHY: Prevents brute force attacks and DoS attacks by limiting
 * requests per IP address. Critical for security.
 * 
 * WHAT: Tracks requests by IP and rejects if limit exceeded.
 */
export class RateLimiter {
  constructor(windowMs, maxRequests) {
    this.windowMs = windowMs;
    this.maxRequests = maxRequests;
    this.requests = new Map(); // IP -> Array of timestamps
  }

  /**
   * Get IP address from request
   * WHY: Handles proxy setups and gets the real client IP
   */
  getClientIp(req) {
    return (
      req.headers['x-forwarded-for']?.split(',')[0] ||
      req.headers['x-real-ip'] ||
      req.connection.remoteAddress ||
      req.ip
    );
  }

  /**
   * Express middleware function
   */
  middleware() {
    return (req, res, next) => {
      const ip = this.getClientIp(req);
      const now = Date.now();

      // Initialize IP tracking if first request
      if (!this.requests.has(ip)) {
        this.requests.set(ip, []);
      }

      // Get all timestamps for this IP
      const timestamps = this.requests.get(ip);

      // Remove timestamps outside of window (older than windowMs)
      const validTimestamps = timestamps.filter(ts => now - ts < this.windowMs);

      // Check if limit exceeded
      if (validTimestamps.length >= this.maxRequests) {
        Logger.warn('Rate limit exceeded', {
          ip,
          requests: validTimestamps.length,
          limit: this.maxRequests,
        });

        return res.status(429).json({
          message: 'Too many requests, please try again later',
          statusCode: 429,
          retryAfter: Math.ceil(this.windowMs / 1000),
        });
      }

      // Add current request timestamp
      validTimestamps.push(now);
      this.requests.set(ip, validTimestamps);

      next();
    };
  }
}

/**
 * Initialize rate limiters for different endpoints
 * WHY: Different endpoints need different limits
 * Authentication endpoints need more strict limits (brute force protection)
 */
export const createRateLimiters = () => {
  return {
    // Auth endpoints: 5 attempts per 15 minutes
    auth: new RateLimiter(
      config.rateLimit.windowMs,
      Math.floor(config.rateLimit.maxRequests / 20) // More restrictive
    ),

    // General endpoints: normal limit
    general: new RateLimiter(
      config.rateLimit.windowMs,
      config.rateLimit.maxRequests
    ),

    // API endpoints: 100 per 15 minutes
    api: new RateLimiter(config.rateLimit.windowMs, 100),
  };
};
