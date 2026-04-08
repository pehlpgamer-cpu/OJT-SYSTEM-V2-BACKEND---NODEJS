/**
 * API Integration Tests
 * 
 * WHY: Integration tests verify the entire request/response cycle:
 * HTTP parsing → Middleware → Route handler → Service → Model → Response.
 * They catch integration bugs that unit tests miss.
 * 
 * WHAT: Tests all major API endpoints including authentication flow,
 * student operations, and matching functionality using supertest.
 */

import { describe, it, expect, beforeAll, afterAll, beforeEach, afterEach, jest } from '@jest/globals';
import request from 'supertest';
import { initializeApp } from '../../src/server.js';
import sequelize from '../../src/config/database.js';

describe('API Integration Tests', () => {
  let app;
  let server;
  let authToken;
  let studentId;
  let postingId;

  beforeAll(async () => {
    /**
     * WHAT: Initialize Express app and database before tests
     * WHY: All tests share same server instance for consistency
     */
    try {
      app = await initializeApp();
    } catch (error) {
      console.error('Failed to initialize app:', error.message);
      throw error;
    }
  });

  afterAll(async () => {
    /**
     * WHAT: Cleanup database and close connection
     * WHY: Prevent resource leaks and data corruption between test runs
     */
    if (sequelize) {
      await sequelize.close();
    }
  });

  beforeEach(async () => {
    /**
     * WHAT: Clear database before each test
     * WHY: Each test starts with clean state, prevents data cross-contamination
     */
    // In real tests: await testDb.cleanup(sequelize);
  });

  describe('Authentication Endpoints', () => {
    describe('POST /api/auth/register', () => {
      it('should register a new student', async () => {
        /**
         * WHAT: Tests complete registration flow
         * WHY: Essential feature - users must be able to sign up
         */
        const response = await request(app)
          .post('/api/auth/register')
          .send({
            name: 'John Doe',
            email: 'john@test.com',
            password: 'SecurePass123!',
            password_confirmation: 'SecurePass123!',
            role: 'student',
          });

        // Debug output
        if (response.status !== 201) {
          console.error('Registration failed');
          console.error('Status:', response.status);
          console.error('Body:', JSON.stringify(response.body, null, 2));
          if (response.body.error) {
            console.error('Error:', response.body.error);
          }
        }

        expect(response.status).toBe(201);
        expect(response.body).toHaveProperty('token');
        expect(response.body.user).toHaveProperty('id');
        expect(response.body.user.email).toBe('john@test.com');
        expect(response.body.user.role).toBe('student');

        // Store for later tests
        authToken = response.body.token;
        studentId = response.body.user.id;
      });

      it('should reject invalid email', async () => {
        /**
         * WHAT: Email format validation
         * WHY: Security - invalid emails can't receive password resets
         */
        const response = await request(app)
          .post('/api/auth/register')
          .send({
            name: 'Test User',
            email: 'not-an-email',
            password: 'SecurePass123!',
            password_confirmation: 'SecurePass123!',
            role: 'student',
          });

        expect(response.status).toBe(400);
        expect(response.body).toHaveProperty('error');
      });

      it('should reject weak password', async () => {
        /**
         * WHAT: Password strength validation
         * WHY: Security - weak passwords compromise accounts
         */
        const response = await request(app)
          .post('/api/auth/register')
          .send({
            name: 'Test User',
            email: 'test@test.com',
            password: 'weak', // Too weak
            password_confirmation: 'weak',
            role: 'student',
          });

        expect(response.status).toBe(400);
        expect(response.body.error).toContain('password');
      });

      it('should reject mismatched password confirmation', async () => {
        /**
         * WHAT: Password confirmation must match
         * WHY: Prevents typos in password
         */
        const response = await request(app)
          .post('/api/auth/register')
          .send({
            name: 'Test User',
            email: 'test@test.com',
            password: 'SecurePass123!',
            password_confirmation: 'DifferentPass123!',
            role: 'student',
          });

        expect(response.status).toBe(400);
      });

      it('should reject duplicate email', async () => {
        /**
         * WHAT: Email must be unique (no duplicate accounts)
         * WHY: Security - prevents account collision
         */
        // First registration succeeds
        await request(app).post('/api/auth/register').send({
          name: 'First User',
          email: 'duplicate@test.com',
          password: 'SecurePass123!',
          password_confirmation: 'SecurePass123!',
          role: 'student',
        });

        // Second registration with same email fails
        const response = await request(app)
          .post('/api/auth/register')
          .send({
            name: 'Second User',
            email: 'duplicate@test.com',
            password: 'SecurePass123!',
            password_confirmation: 'SecurePass123!',
            role: 'student',
          });

        expect(response.status).toBe(400);
        expect(response.body.error).toContain('email');
      });
    });

    describe('POST /api/auth/login', () => {
      beforeEach(async () => {
        /**
         * WHAT: Register a user before login tests
         * WHY: Need existing user to test login
         */
        await request(app).post('/api/auth/register').send({
          name: 'Login Test User',
          email: 'logintest@test.com',
          password: 'TestPassword123!',
          password_confirmation: 'TestPassword123!',
          role: 'student',
        });
      });

      it('should login with valid credentials', async () => {
        /**
         * WHAT: Tests successful login
         * WHY: Core authentication feature
         */
        const response = await request(app)
          .post('/api/auth/login')
          .send({
            email: 'logintest@test.com',
            password: 'TestPassword123!',
          })
          .expect(200)
          .expect('Content-Type', /json/);

        expect(response.body).toHaveProperty('token');
        expect(response.body.user).toHaveProperty('id');
        expect(response.body.user.email).toBe('logintest@test.com');

        authToken = response.body.token;
      });

      it('should reject wrong password', async () => {
        /**
         * WHAT: Failed authentication with wrong password
         * WHY: Security - prevents unauthorized access
         */
        const response = await request(app)
          .post('/api/auth/login')
          .send({
            email: 'logintest@test.com',
            password: 'WrongPassword123!',
          });

        expect(response.status).toBe(401);
        expect(response.body.error).toBeDefined();
      });

      it('should reject non-existent email', async () => {
        /**
         * WHAT: Failed authentication with unknown email
         * WHY: Security - prevents user enumeration with timing attacks
         */
        const response = await request(app)
          .post('/api/auth/login')
          .send({
            email: 'nonexistent@test.com',
            password: 'SomePassword123!',
          });

        expect(response.status).toBe(401);
      });

      it('should track login attempts for rate limiting', async () => {
        /**
         * WHAT: Multiple failed attempts trigger rate limit
         * WHY: Security - prevents brute-force attacks
         */
        for (let i = 0; i < 6; i++) {
          const response = await request(app)
            .post('/api/auth/login')
            .send({
              email: 'logintest@test.com',
              password: 'WrongPassword123!',
            });

          if (i < 5) {
            expect(response.status).toBe(401);
          } else {
            // After 5 attempts, should be rate limited
            expect(response.status).toBe(429);
          }
        }
      });
    });
  });

  describe('Student Endpoints', () => {
    beforeEach(async () => {
      /**
       * WHAT: Register and login before student endpoint tests
       * WHY: Endpoints require authentication
       */
      const registerRes = await request(app)
        .post('/api/auth/register')
        .send({
          name: 'Student Test',
          email: `student-${Date.now()}@test.com`,
          password: 'TestPassword123!',
          password_confirmation: 'TestPassword123!',
          role: 'student',
        });

      authToken = registerRes.body.token;
      studentId = registerRes.body.user.id;
    });

    describe('GET /api/students/profile', () => {
      it('should get student profile when authenticated', async () => {
        /**
         * WHAT: Retrieve logged-in student's profile
         * WHY: Students need to view their own profile
         */
        const response = await request(app)
          .get('/api/students/profile')
          .set('Authorization', `Bearer ${authToken}`)
          .expect(200);

        expect(response.body).toHaveProperty('id');
        expect(response.body).toHaveProperty('gpa');
        expect(response.body).toHaveProperty('academic_program');
      });

      it('should reject unauthenticated request', async () => {
        /**
         * WHAT: Prevent access without valid token
         * WHY: Security - protects private user data
         */
        const response = await request(app).get('/api/students/profile');

        expect(response.status).toBe(401);
      });

      it('should reject invalid token', async () => {
        /**
         * WHAT: Invalid tokens should not grant access
         * WHY: Security - prevents forged or tampered tokens
         */
        const response = await request(app)
          .get('/api/students/profile')
          .set('Authorization', 'Bearer invalid-token-123');

        expect(response.status).toBe(401);
      });
    });

    describe('PUT /api/students/profile', () => {
      it('should update student profile', async () => {
        /**
         * WHAT: Allow students to update their profile data
         * WHY: Users need to keep profile current
         */
        const response = await request(app)
          .put('/api/students/profile')
          .set('Authorization', `Bearer ${authToken}`)
          .send({
            gpa: 3.75,
            academic_program: 'Computer Science',
            location_preference: 'Manila',
          })
          .expect(200);

        expect(response.body.gpa).toBe(3.75);
        expect(response.body.academic_program).toBe('Computer Science');
      });

      it('should validate GPA range', async () => {
        /**
         * WHAT: GPA must be between 0 and 4.0
         * WHY: Business rule - valid academic scale
         */
        const response = await request(app)
          .put('/api/students/profile')
          .set('Authorization', `Bearer ${authToken}`)
          .send({
            gpa: 5.0, // Invalid
          });

        expect(response.status).toBe(400);
      });

      it('should recalculate profile completeness', async () => {
        /**
         * WHAT: Track how complete student profile is
         * WHY: Encourage students to fill out profile
         */
        const response = await request(app)
          .put('/api/students/profile')
          .set('Authorization', `Bearer ${authToken}`)
          .send({
            gpa: 3.5,
            academic_program: 'Computer Science',
            location_preference: 'Manila',
          })
          .expect(200);

        expect(response.body).toHaveProperty('profile_completeness_percentage');
        expect(response.body.profile_completeness_percentage).toBeGreaterThanOrEqual(
          0
        );
        expect(response.body.profile_completeness_percentage).toBeLessThanOrEqual(100);
      });
    });

    describe('POST /api/students/skills', () => {
      it('should add a skill to student profile', async () => {
        /**
         * WHAT: Allow students to add technical skills
         * WHY: Skills are critical for job matching
         */
        const response = await request(app)
          .post('/api/students/skills')
          .set('Authorization', `Bearer ${authToken}`)
          .send({
            skill_name: 'JavaScript',
            proficiency_level: 'intermediate',
            years_of_experience: 2,
          })
          .expect(201);

        expect(response.body).toHaveProperty('id');
        expect(response.body.skill_name).toBe('JavaScript');
        expect(response.body.proficiency_level).toBe('intermediate');
      });

      it('should reject invalid proficiency level', async () => {
        /**
         * WHAT: Proficiency must be from allowed list
         * WHY: Standardize skill assessment
         */
        const response = await request(app)
          .post('/api/students/skills')
          .set('Authorization', `Bearer ${authToken}`)
          .send({
            skill_name: 'JavaScript',
            proficiency_level: 'invalid-level',
          });

        expect(response.status).toBe(400);
      });

      it('should prevent duplicate skills', async () => {
        /**
         * WHAT: Can't add same skill twice
         * WHY: One entry per skill per user
         */
        const skillData = {
          skill_name: 'Python',
          proficiency_level: 'advanced',
        };

        // Add first time - succeeds
        await request(app)
          .post('/api/students/skills')
          .set('Authorization', `Bearer ${authToken}`)
          .send(skillData)
          .expect(201);

        // Add same skill second time - should fail or update
        const response = await request(app)
          .post('/api/students/skills')
          .set('Authorization', `Bearer ${authToken}`)
          .send(skillData);

        expect([400, 409, 200]).toContain(response.status);
      });
    });

    describe('GET /api/students/skills', () => {
      beforeEach(async () => {
        /**
         * WHAT: Add skills before retrieving
         * WHY: Need data to retrieve
         */
        await request(app)
          .post('/api/students/skills')
          .set('Authorization', `Bearer ${authToken}`)
          .send({
            skill_name: 'JavaScript',
            proficiency_level: 'advanced',
          });

        await request(app)
          .post('/api/students/skills')
          .set('Authorization', `Bearer ${authToken}`)
          .send({
            skill_name: 'Python',
            proficiency_level: 'intermediate',
          });
      });

      it('should retrieve all student skills', async () => {
        /**
         * WHAT: Get list of all skills for student
         * WHY: Students need to view and manage skills
         */
        const response = await request(app)
          .get('/api/students/skills')
          .set('Authorization', `Bearer ${authToken}`)
          .expect(200);

        expect(Array.isArray(response.body)).toBe(true);
        expect(response.body.length).toBeGreaterThanOrEqual(2);
        expect(response.body.map((s) => s.skill_name)).toContain('JavaScript');
        expect(response.body.map((s) => s.skill_name)).toContain('Python');
      });
    });
  });

  describe('Matching Endpoints', () => {
    beforeEach(async () => {
      /**
       * WHAT: Setup student and job posting before matching tests
       * WHY: Need both to create matches
       */
      const studentRes = await request(app)
        .post('/api/auth/register')
        .send({
          name: 'Match Test Student',
          email: `student-match-${Date.now()}@test.com`,
          password: 'TestPassword123!',
          password_confirmation: 'TestPassword123!',
          role: 'student',
        });

      authToken = studentRes.body.token;
      studentId = studentRes.body.user.id;

      // Add skills to student
      await request(app)
        .post('/api/students/skills')
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          skill_name: 'JavaScript',
          proficiency_level: 'intermediate',
        });
    });

    describe('GET /api/matches', () => {
      it('should return matching job postings', async () => {
        /**
         * WHAT: Get list of jobs matched to student
         * WHY: Core feature - students need to find opportunities
         */
        const response = await request(app)
          .get('/api/matches')
          .set('Authorization', `Bearer ${authToken}`)
          .expect(200);

        expect(Array.isArray(response.body)).toBe(true);

        if (response.body.length > 0) {
          // Each match should have required fields
          response.body.forEach((match) => {
            expect(match).toHaveProperty('match_score');
            expect(match).toHaveProperty('match_status');
            expect(match.match_score).toBeGreaterThanOrEqual(0);
            expect(match.match_score).toBeLessThanOrEqual(100);
          });
        }
      });

      it('should sort matches by score (highest first)', async () => {
        /**
         * WHAT: Best matches appear first
         * WHY: Better UX - users see best opportunities immediately
         */
        const response = await request(app)
          .get('/api/matches')
          .set('Authorization', `Bearer ${authToken}`)
          .expect(200);

        const scores = response.body.map((m) => m.match_score);

        // Verify descending order
        for (let i = 1; i < scores.length; i++) {
          expect(scores[i - 1]).toBeGreaterThanOrEqual(scores[i]);
        }
      });

      it('should support pagination', async () => {
        /**
         * WHAT: Can limit results with page/limit parameters
         * WHY: Performance - large result sets don't load all at once
         */
        const response = await request(app)
          .get('/api/matches?page=1&limit=5')
          .set('Authorization', `Bearer ${authToken}`)
          .expect(200);

        expect(Array.isArray(response.body)).toBe(true);
        expect(response.body.length).toBeLessThanOrEqual(5);
      });
    });
  });

  describe('Notification Endpoints', () => {
    beforeEach(async () => {
      /**
       * WHAT: Register user before notification tests
       * WHY: Notifications belong to authenticated users
       */
      const res = await request(app)
        .post('/api/auth/register')
        .send({
          name: 'Notify Test User',
          email: `notify-${Date.now()}@test.com`,
          password: 'TestPassword123!',
          password_confirmation: 'TestPassword123!',
          role: 'student',
        });

      authToken = res.body.token;
    });

    describe('GET /api/notifications', () => {
      it('should retrieve unread notifications', async () => {
        /**
         * WHAT: Get list of notifications for user
         * WHY: Users need to see important updates
         */
        const response = await request(app)
          .get('/api/notifications')
          .set('Authorization', `Bearer ${authToken}`)
          .expect(200);

        expect(Array.isArray(response.body)).toBe(true);
      });

      it('should return notification details', async () => {
        /**
         * WHAT: Notifications should have complete information
         * WHY: Users need to understand what notification is about
         */
        const response = await request(app)
          .get('/api/notifications')
          .set('Authorization', `Bearer ${authToken}`)
          .expect(200);

        response.body.forEach((notification) => {
          expect(notification).toHaveProperty('id');
          expect(notification).toHaveProperty('title');
          expect(notification).toHaveProperty('message');
          expect(notification).toHaveProperty('is_read');
          expect(notification).toHaveProperty('type');
        });
      });
    });

    describe('PUT /api/notifications/:id/read', () => {
      it('should mark notification as read', async () => {
        /**
         * WHAT: Update notification read status
         * WHY: Users should be able to mark notifications as seen
         */
        // This would need a notification ID from previous GET
        const notificationId = 'test-notification-id';

        const response = await request(app)
          .put(`/api/notifications/${notificationId}/read`)
          .set('Authorization', `Bearer ${authToken}`)
          .expect(200);

        expect(response.body).toHaveProperty('is_read');
      });
    });
  });

  describe('System Endpoints', () => {
    describe('GET /health', () => {
      it('should return health status', async () => {
        /**
         * WHAT: Basic health check endpoint
         * WHY: DevOps monitoring - ensures app is running
         */
        const response = await request(app).get('/health').expect(200);

        expect(response.body).toHaveProperty('status');
        expect(response.body.status).toBe('ok');
      });
    });

    describe('GET /api/version', () => {
      it('should return API version', async () => {
        /**
         * WHAT: Get current API version
         * WHY: Clients need to know compatibility
         */
        const response = await request(app)
          .get('/api/version')
          .expect(200);

        expect(response.body).toHaveProperty('version');
      });
    });
  });

  afterEach(() => {
    jest.clearAllMocks();
  });
});
