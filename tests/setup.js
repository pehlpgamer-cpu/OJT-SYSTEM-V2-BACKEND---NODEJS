/**
 * Jest Setup File
 * 
 * WHY: This file runs before any tests. It sets up the test environment,
 * initializes mocks, and configures database for testing.
 * 
 * WHAT: Configures environment variables and test-specific settings
 * for isolated test execution without affecting production.
 */

import { jest } from '@jest/globals';
process.env.NODE_ENV = 'test';
process.env.APP_DEBUG = 'true';
process.env.DB_CONNECTION = 'sqlite';
process.env.DB_HOST = ':memory:'; // In-memory database for tests
process.env.DB_DATABASE = ':memory:';
process.env.JWT_SECRET = 'test-secret-key-12345678901234';
process.env.JWT_EXPIRATION_HOURS = 7;
process.env.CORS_ORIGIN = 'http://localhost:3000';
process.env.LOG_LEVEL = 'error'; // Reduce log noise during tests
process.env.RATE_LIMIT_AUTH_MAX = 100; // Relax rate limits for testing
process.env.RATE_LIMIT_API_MAX = 1000;

/**
 * Extend Jest matchers with custom assertions
 * These helpers make test code more readable
 */
expect.extend({
  /**
   * Check if response has successful status (2xx)
   */
  toBeSuccessful(response) {
    const success = response.status >= 200 && response.status < 300;
    return {
      pass: success,
      message: () => `Expected status ${response.status} to be 2xx successful`,
    };
  },

  /**
   * Check if response is unauthorized (401)
   */
  toBeUnauthorized(response) {
    const pass = response.status === 401;
    return {
      pass,
      message: () => `Expected status ${response.status} to be 401 Unauthorized`,
    };
  },

  /**
   * Check if response is forbidden (403)
   */
  toBeForbidden(response) {
    const pass = response.status === 403;
    return {
      pass,
      message: () => `Expected status ${response.status} to be 403 Forbidden`,
    };
  },

  /**
   * Check if response is not found (404)
   */
  toBeNotFound(response) {
    const pass = response.status === 404;
    return {
      pass,
      message: () => `Expected status ${response.status} to be 404 Not Found`,
    };
  },

  /**
   * Check if response is server error (5xx)
   */
  toBeServerError(response) {
    const pass = response.status >= 500 && response.status < 600;
    return {
      pass,
      message: () => `Expected status ${response.status} to be 5xx server error`,
    };
  },
});

// Global test timeout
jest.setTimeout(10000);


// Suppress console output during tests (unless explicitly needed)
global.console = {
  ...console,
  log: jest.fn(),
  debug: jest.fn(),
  info: jest.fn(),
};

