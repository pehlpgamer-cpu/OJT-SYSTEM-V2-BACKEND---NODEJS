/**
 * Jest Configuration for OJT System V2 Backend
 * 
 * WHY: Jest is configured to handle ES modules, provide verbose output,
 * set appropriate timeouts for async operations, and generate coverage reports.
 * 
 * This configuration ensures:
 * - ES module support (matches our package.json "type": "module")
 * - Proper test environment (node)
 * - Clear console output during testing
 * - Coverage reports for quality metrics
 * - Proper timeout for database operations
 */

module.exports = {
  // Use Node.js environment
  testEnvironment: 'node',

  // Test file patterns to match
  testMatch: [
    '**/tests/**/__tests__/**/*.js',
    '**/tests/**/?(*.)+(spec|test).js',
  ],

  // Module name mapper for path aliases (if needed)
  moduleNameMapper: {
    '^@/(.*)$': '<rootDir>/src/$1',
    '^@tests/(.*)$': '<rootDir>/tests/$1',
  },

  // Coverage configuration
  collectCoverageFrom: [
    'src/**/*.js',
    '!src/server.js', // Exclude main server file
    '!src/config/**', // Exclude config files
  ],

  // Coverage thresholds - set low for MVP, can be incremented
  coverageThreshold: {
    global: {
      branches: 0,
      functions: 0,
      lines: 0,
      statements: 0,
    },
  },

  // Timeout for async operations
  testTimeout: 10000,

  // Verbose output
  verbose: true,

  // Display individual test results
  reporters: [
    'default',
  ],

  // Setup files
  setupFilesAfterEnv: ['<rootDir>/tests/setup.js'],

  // Transform files
  transform: {},

  // Ignore node_modules except uuid
  transformIgnorePatterns: [
    'node_modules/(?!(uuid)/)',
  ],
};


