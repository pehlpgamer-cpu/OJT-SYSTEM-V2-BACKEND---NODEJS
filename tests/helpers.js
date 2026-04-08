/**
 * Test Utilities & Helpers
 * 
 * WHY: Centralized test helpers reduce duplication and make tests more readable.
 * These utilities handle database setup, test data creation, and common assertions.
 * 
 * WHAT: Provides factories for creating test data, database utilities, and assertion helpers.
 */

import { v4 as uuidv4 } from 'uuid';
import bcrypt from 'bcrypt';

/**
 * Test data factories
 * WHY: Factories generate consistent, valid test data without repeating creation logic
 */
export const factories = {
  /**
   * Generate a valid student user object
   */
  studentUser: (overrides = {}) => ({
    id: uuidv4(),
    name: 'Test Student',
    email: `student-${uuidv4()}@test.com`,
    password: 'TestPassword123!',
    role: 'student',
    status: 'active',
    last_login_at: new Date(),
    created_at: new Date(),
    updated_at: new Date(),
    ...overrides,
  }),

  /**
   * Generate a valid company user object
   */
  companyUser: (overrides = {}) => ({
    id: uuidv4(),
    name: 'Test Company Inc.',
    email: `company-${uuidv4()}@test.com`,
    password: 'TestPassword123!',
    role: 'company',
    status: 'active',
    last_login_at: new Date(),
    created_at: new Date(),
    updated_at: new Date(),
    ...overrides,
  }),

  /**
   * Generate a valid student profile
   */
  studentProfile: (userId, overrides = {}) => ({
    id: uuidv4(),
    user_id: userId,
    gpa: 3.5,
    academic_program: 'Computer Science',
    location_preference: 'Manila',
    preferred_schedule: 'morning',
    availability_start: new Date(),
    availability_end: new Date(Date.now() + 180 * 24 * 60 * 60 * 1000), // 6 months from now
    profile_completeness_percentage: 80,
    created_at: new Date(),
    updated_at: new Date(),
    ...overrides,
  }),

  /**
   * Generate a valid OJT posting
   */
  ojtPosting: (companyId, overrides = {}) => ({
    id: uuidv4(),
    company_id: companyId,
    title: 'Junior Software Developer',
    description: 'Exciting opportunity for junior dev',
    location: 'Manila',
    salary_min: 20000,
    salary_max: 30000,
    duration_weeks: 24,
    min_gpa: 2.75,
    academic_program: 'Computer Science',
    posting_status: 'active',
    total_positions: 2,
    filled_positions: 0,
    created_at: new Date(),
    updated_at: new Date(),
    ...overrides,
  }),

  /**
   * Generate a valid skill
   */
  skill: (overrides = {}) => ({
    id: uuidv4(),
    skill_name: 'JavaScript',
    proficiency_level: 'intermediate',
    years_of_experience: 2,
    endorsed_count: 3,
    created_at: new Date(),
    updated_at: new Date(),
    ...overrides,
  }),

  /**
   * Generate a valid posting skill
   */
  postingSkill: (postingId, overrides = {}) => ({
    id: uuidv4(),
    posting_id: postingId,
    skill_name: 'JavaScript',
    is_required: true,
    min_proficiency_level: 'intermediate',
    weight: 1.2,
    created_at: new Date(),
    updated_at: new Date(),
    ...overrides,
  }),

  /**
   * Generate a valid application
   */
  application: (studentId, postingId, overrides = {}) => ({
    id: uuidv4(),
    student_id: studentId,
    posting_id: postingId,
    application_status: 'submitted',
    cover_letter: 'I am interested in this position.',
    match_score: 85,
    company_feedback: null,
    created_at: new Date(),
    updated_at: new Date(),
    ...overrides,
  }),

  /**
   * Generate a password with consistent hash for testing
   */
  hashPassword: async (password = 'TestPassword123!') => {
    return bcrypt.hash(password, 10);
  },
};

/**
 * Database utilities for testing
 * WHY: Isolate database operations and provide consistent seeding for tests
 */
export const testDb = {
  /**
   * Create a test database connection
   */
  connection: null,

  /**
   * Initialize test database
   */
  init: async (sequelize, models) => {
    testDb.connection = sequelize;

    // Sync database in test mode (creates tables)
    await sequelize.sync({ force: false, alter: true });

    return sequelize;
  },

  /**
   * Clear all tables before each test
   */
  cleanup: async (sequelize) => {
    if (!sequelize) return;

    // Get all models
    const models = Object.values(sequelize.models);

    // Disable foreign key checks temporarily
    await sequelize.query('PRAGMA foreign_keys = OFF');

    // Truncate all tables
    for (const model of models) {
      await model.truncate({ cascade: true, force: true });
    }

    // Re-enable foreign key checks
    await sequelize.query('PRAGMA foreign_keys = ON');
  },

  /**
   * Seed test data
   */
  seed: async (models, data) => {
    const results = {};

    for (const [modelName, records] of Object.entries(data)) {
      if (Array.isArray(records)) {
        results[modelName] = await Promise.all(
          records.map((record) => models[modelName].create(record))
        );
      } else {
        results[modelName] = await models[modelName].create(records);
      }
    }

    return results;
  },
};

/**
 * Request/Response helpers
 * WHY: Simplify common test assertions and reduce boilerplate
 */
export const testResponse = {
  /**
   * Assert successful response (2xx)
   */
  assertSuccess: (response, statusCode = 200) => {
    expect(response.status).toBe(statusCode);
    expect(response.body).toBeDefined();
  },

  /**
   * Assert error response
   */
  assertError: (response, statusCode = 400, errorMessage = undefined) => {
    expect(response.status).toBe(statusCode);
    if (errorMessage) {
      expect(response.body.message || response.body.error).toContain(errorMessage);
    }
  },

  /**
   * Assert unauthorized response
   */
  assertUnauthorized: (response) => {
    testResponse.assertError(response, 401);
  },

  /**
   * Assert missing fields in response
   */
  assertHasFields: (obj, fields) => {
    fields.forEach((field) => {
      expect(obj).toHaveProperty(field);
    });
  },

  /**
   * Assert missing required fields
   */
  assertMissingFields: (obj, fields) => {
    fields.forEach((field) => {
      expect(obj).not.toHaveProperty(field);
    });
  },
};

/**
 * Authentication helpers
 * WHY: Simplify JWT token creation and authorization headers for tests
 */
export const testAuth = {
  /**
   * Create a valid JWT token for testing
   * (Note: In real tests, use the actual AuthService.generateToken)
   */
  genToken: (userId, role = 'student') => {
    // This is a placeholder - in actual tests, generate via AuthService
    return `Bearer test-token-${userId}-${role}`;
  },

  /**
   * Get authorization header
   */
  authHeader: (token) => {
    return { Authorization: token };
  },

  /**
   * Get role-based authorization headers
   */
  authHeaderForRole: (userId, role) => {
    const token = testAuth.genToken(userId, role);
    return testAuth.authHeader(token);
  },
};

/**
 * Date/Time helpers for testing
 * WHY: Consistent date handling for time-sensitive tests
 */
export const testTime = {
  /**
   * Get current timestamp
   */
  now: () => new Date(),

  /**
   * Get timestamp N days from now
   */
  daysFromNow: (days) => {
    return new Date(Date.now() + days * 24 * 60 * 60 * 1000);
  },

  /**
   * Get timestamp N minutes from now
   */
  minutesFromNow: (minutes) => {
    return new Date(Date.now() + minutes * 60 * 1000);
  },

  /**
   * Get timestamp N milliseconds from now
   */
  msFromNow: (ms) => {
    return new Date(Date.now() + ms);
  },
};

export default {
  factories,
  testDb,
  testResponse,
  testAuth,
  testTime,
};
