/**
 * Sanity Check Tests
 * 
 * WHY: Basic smoke tests to verify the testing infrastructure is working
 * and the project structure is correct.
 * 
 * WHAT: Tests that the test framework, mocking, and basic utilities work.
 */

import { describe, it, expect, beforeEach, jest } from '@jest/globals';
import { factories, testDb, testResponse, testAuth, testTime } from '../helpers.js';

describe('Sanity Checks - Testing Infrastructure', () => {
  describe('Test Framework', () => {
    it('should run basic assertions', () => {
      expect(true).toBe(true);
      expect(1 + 1).toBe(2);
      expect('hello').toContain('ell');
    });

    it('should support async tests', async () => {
      const promise = Promise.resolve(42);
      const result = await promise;
      expect(result).toBe(42);
    });

    it('should support jest matchers', () => {
      expect([1, 2, 3]).toHaveLength(3);
      expect({ a: 1 }).toEqual({ a: 1 });
      expect(null).toBeNull();
      expect(undefined).toBeUndefined();
      expect('test').toBeTruthy();
    });
  });

  describe('Test Factories', () => {
    it('should create student user', () => {
      const student = factories.studentUser();

      expect(student).toHaveProperty('id');
      expect(student).toHaveProperty('email');
      expect(student).toHaveProperty('password');
      expect(student.role).toBe('student');
      expect(student.status).toBe('active');
    });

    it('should create company user', () => {
      const company = factories.companyUser();

      expect(company).toHaveProperty('id');
      expect(company.role).toBe('company');
    });

    it('should create student profile', () => {
      const userId = 'user-123';
      const profile = factories.studentProfile(userId);

      expect(profile.user_id).toBe(userId);
      expect(profile).toHaveProperty('gpa');
      expect(profile).toHaveProperty('academic_program');
    });

    it('should create OJT posting', () => {
      const companyId = 'company-123';
      const posting = factories.ojtPosting(companyId);

      expect(posting.company_id).toBe(companyId);
      expect(posting).toHaveProperty('title');
      expect(posting).toHaveProperty('location');
    });

    it('should create skill', () => {
      const skill = factories.skill();

      expect(skill).toHaveProperty('skill_name');
      expect(['beginner', 'intermediate', 'advanced', 'expert']).toContain(
        skill.proficiency_level
      );
    });

    it('should create application', () => {
      const studentId = 'student-123';
      const postingId = 'posting-456';
      const app = factories.application(studentId, postingId);

      expect(app.student_id).toBe(studentId);
      expect(app.posting_id).toBe(postingId);
      expect(app.application_status).toBe('submitted');
    });

    it('should override defaults', () => {
      const student = factories.studentUser({
        email: 'custom@test.com',
        status: 'suspended',
      });

      expect(student.email).toBe('custom@test.com');
      expect(student.status).toBe('suspended');
    });

    it('should hash password correctly', async () => {
      const password = 'TestPassword123!';
      const hashed = await factories.hashPassword(password);

      expect(hashed).not.toBe(password);
      expect(hashed.length).toBeGreaterThan(password.length);
    });
  });

  describe('Test Response Helpers', () => {
    it('should assert success response', () => {
      const mockResponse = { status: 200, body: { data: 'test' } };
      expect(() =>
        testResponse.assertSuccess(mockResponse, 200)
      ).not.toThrow();
    });

    it('should assert error response', () => {
      const mockResponse = {
        status: 400,
        body: { error: 'Invalid input' },
      };
      expect(() =>
        testResponse.assertError(mockResponse, 400)
      ).not.toThrow();
    });

    it('should check for required fields', () => {
      const obj = { id: 1, name: 'Test', email: 'test@test.com' };
      expect(() =>
        testResponse.assertHasFields(obj, ['id', 'name'])
      ).not.toThrow();
    });

    it('should check missing fields', () => {
      const obj = { id: 1, name: 'Test' };
      expect(() =>
        testResponse.assertMissingFields(obj, ['email', 'phone'])
      ).not.toThrow();
    });
  });

  describe('Test Auth Helpers', () => {
    it('should generate authorization header', () => {
      const token = 'test-token-123';
      const header = testAuth.authHeader(token);

      expect(header).toHaveProperty('Authorization');
      expect(header.Authorization).toBe(token);
    });

    it('should generate role-based auth header', () => {
      const userId = 'user-123';
      const role = 'student';
      const header = testAuth.authHeaderForRole(userId, role);

      expect(header).toHaveProperty('Authorization');
    });
  });

  describe('Test Time Helpers', () => {
    it('should get current time', () => {
      const now = testTime.now();
      expect(now).toBeInstanceOf(Date);
    });

    it('should calculate future dates', () => {
      const future = testTime.daysFromNow(7);
      const now = new Date();

      expect(future.getTime()).toBeGreaterThan(now.getTime());
      const diffDays = (future.getTime() - now.getTime()) / (24 * 60 * 60 * 1000);
      expect(diffDays).toBeCloseTo(7, 0);
    });

    it('should calculate minutes from now', () => {
      const future = testTime.minutesFromNow(5);
      const now = new Date();

      expect(future.getTime()).toBeGreaterThan(now.getTime());
    });

    it('should calculate milliseconds from now', () => {
      const future = testTime.msFromNow(1000);
      const now = new Date();

      expect(future.getTime()).toBeGreaterThan(now.getTime());
      expect(future.getTime() - now.getTime()).toBeCloseTo(1000, -1);
    });
  });

  describe('Custom Jest Matchers', () => {
    it('should have custom success matcher', () => {
      const response = { status: 201, body: {} };
      expect(response).toBeSuccessful();
    });

    it('should have custom unauthorized matcher', () => {
      const response = { status: 401, body: {} };
      expect(response).toBeUnauthorized();
    });

    it('should have custom forbidden matcher', () => {
      const response = { status: 403, body: {} };
      expect(response).toBeForbidden();
    });

    it('should have custom not found matcher', () => {
      const response = { status: 404, body: {} };
      expect(response).toBeNotFound();
    });

    it('should have custom server error matcher', () => {
      const response = { status: 500, body: {} };
      expect(response).toBeServerError();
    });
  });

  describe('Environment Configuration', () => {
    it('should have test environment variables set', () => {
      expect(process.env.NODE_ENV).toBe('test');
      expect(process.env.APP_DEBUG).toBe('true');
      expect(process.env.DB_CONNECTION).toBe('sqlite');
    });

    it('should have JWT secret configured', () => {
      expect(process.env.JWT_SECRET).toBeDefined();
      expect(process.env.JWT_SECRET.length).toBeGreaterThan(20);
    });

    it('should have CORS origin configured', () => {
      expect(process.env.CORS_ORIGIN).toBeDefined();
    });
  });

  describe('Data Generation Consistency', () => {
    it('should generate unique IDs', () => {
      const id1 = factories.studentUser().id;
      const id2 = factories.studentUser().id;

      expect(id1).not.toBe(id2);
    });

    it('should generate unique emails', () => {
      const email1 = factories.studentUser().email;
      const email2 = factories.studentUser().email;

      expect(email1).not.toBe(email2);
    });

    it('should maintain valid email format', () => {
      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

      for (let i = 0; i < 10; i++) {
        const user = factories.studentUser();
        expect(emailRegex.test(user.email)).toBe(true);
      }
    });
  });
});
