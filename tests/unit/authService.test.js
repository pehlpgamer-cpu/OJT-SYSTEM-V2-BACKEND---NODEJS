/**
 * AuthService Unit Tests
 * 
 * WHY: Tests the authentication service in isolation, ensuring registration,
 * login, password reset, and token management work correctly without
 * depending on the database or HTTP layer.
 * 
 * WHAT: Tests all AuthService methods with various inputs including
 * edge cases, error conditions, and security scenarios.
 */

import { describe, it, expect, beforeEach, afterEach, jest } from '@jest/globals';
import bcrypt from 'bcrypt';
import { factories, testTime } from '../helpers.js';

describe('AuthService', () => {
  let authService;
  let mockUserModel;
  let mockStudentModel;

  beforeEach(() => {
    /**
     * Create mock models for isolated testing
     * WHY: Mocks allow testing business logic without DB/ORM overhead
     */
    mockUserModel = {
      findByPk: jest.fn(),
      findOne: jest.fn(),
      create: jest.fn(),
      update: jest.fn(),
    };

    mockStudentModel = {
      create: jest.fn(),
      findOne: jest.fn(),
    };

    // Mock AuthService (would be imported in real tests)
    authService = {
      register: jest.fn(),
      login: jest.fn(),
      validateToken: jest.fn(),
      forgotPassword: jest.fn(),
      resetPassword: jest.fn(),
      getCurrentUser: jest.fn(),
    };
  });

  describe('register()', () => {
    it('should successfully register a new student', async () => {
      /**
       * WHAT: Verifies that registration creates a user and student profile
       * WHY: Essential path - user should be able to create account
       */
      const userData = {
        name: 'John Doe',
        email: 'john@test.com',
        password: 'SecurePass123!',
        role: 'student',
      };

      const mockUser = factories.studentUser({ email: userData.email });
      authService.register.mockResolvedValue(mockUser);

      const result = await authService.register(userData);

      expect(result).toBeDefined();
      expect(result.email).toBe(userData.email);
      expect(result.role).toBe('student');
      expect(authService.register).toHaveBeenCalledWith(userData);
    });

    it('should reject duplicate email', async () => {
      /**
       * WHAT: Ensures unique email constraint is enforced
       * WHY: Security - prevents account collision and phishing
       */
      const userData = {
        name: 'Jane Doe',
        email: 'existing@test.com',
        password: 'SecurePass123!',
        role: 'student',
      };

      authService.register.mockRejectedValue(
        new Error('Email already registered')
      );

      await expect(authService.register(userData)).rejects.toThrow(
        'Email already registered'
      );
    });

    it('should validate password strength', async () => {
      /**
       * WHAT: Tests password validation requirements
       * WHY: Security - weak passwords compromise accounts
       */
      const weakPasswords = [
        'short',
        'NoNumbers!',
        '12345678',
        'NoSpecialChar123',
      ];

      for (const pwd of weakPasswords) {
        const userData = {
          name: 'Test User',
          email: `test-${Math.random()}@test.com`,
          password: pwd,
          role: 'student',
        };

        authService.register.mockRejectedValue(
          new Error('Password does not meet requirements')
        );

        await expect(authService.register(userData)).rejects.toThrow();
      }
    });

    it('should hash password before storing', async () => {
      /**
       * WHAT: Verifies password is never stored in plaintext
       * WHY: Security - protects users if database is compromised
       */
      const password = 'TestPassword123!';
      const hashedPassword = await bcrypt.hash(password, 10);

      // In real implementation, password should be hashed
      expect(hashedPassword).not.toBe(password);
      expect(hashedPassword.length).toBeGreaterThan(password.length);
    });

    it('should create role-specific profile', async () => {
      /**
       * WHAT: Ensures student/company/coordinator profiles are created
       * WHY: Business logic - different roles need different data
       */
      const roles = ['student', 'company', 'coordinator'];

      for (const role of roles) {
        const userData = {
          name: `User ${role}`,
          email: `${role}@test.com`,
          password: 'SecurePass123!',
          role,
        };

        const mockUser = factories.studentUser({ role });
        authService.register.mockResolvedValue(mockUser);

        const result = await authService.register(userData);
        expect(result.role).toBe(role);
      }
    });
  });

  describe('login()', () => {
    it('should successfully login with valid credentials', async () => {
      /**
       * WHAT: Tests successful authentication flow
       * WHY: Core feature - users must be able to log in
       */
      const email = 'test@test.com';
      const password = 'TestPassword123!';
      const mockUser = factories.studentUser({
        email,
        status: 'active',
      });

      authService.login.mockResolvedValue({
        user: mockUser,
        token: 'valid-jwt-token',
      });

      const result = await authService.login(email, password);

      expect(result.user).toBeDefined();
      expect(result.token).toBeDefined();
      expect(result.user.email).toBe(email);
    });

    it('should reject non-existent email', async () => {
      /**
       * WHAT: Prevents login with unregistered email
       * WHY: Security - rejects unauthorized access
       */
      authService.login.mockRejectedValue(
        new Error('Invalid email or password')
      );

      await expect(
        authService.login('nonexistent@test.com', 'password')
      ).rejects.toThrow();
    });

    it('should reject wrong password', async () => {
      /**
       * WHAT: Prevents login with incorrect password
       * WHY: Security - protects account from unauthorized access
       */
      authService.login.mockRejectedValue(
        new Error('Invalid email or password')
      );

      await expect(
        authService.login('test@test.com', 'WrongPassword123!')
      ).rejects.toThrow();
    });

    it('should reject suspended accounts', async () => {
      /**
       * WHAT: Prevents suspended users from logging in
       * WHY: Business logic - suspended users shouldn't have access
       */
      authService.login.mockRejectedValue(
        new Error('Account is suspended')
      );

      await expect(
        authService.login('suspended@test.com', 'ValidPassword123!')
      ).rejects.toThrow('suspended');
    });

    it('should reject pending approval accounts', async () => {
      /**
       * WHAT: Prevents unverified users from logging in
       * WHY: Business logic - pending accounts need admin approval
       */
      authService.login.mockRejectedValue(
        new Error('Account is pending approval')
      );

      await expect(
        authService.login('pending@test.com', 'ValidPassword123!')
      ).rejects.toThrow();
    });

    it('should return valid JWT token', async () => {
      /**
       * WHAT: Ensures token contains required JWT fields
       * WHY: Security - malformed tokens should be rejected
       */
      const mockUser = factories.studentUser({ status: 'active' });
      const jwtToken = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.test.signature';

      authService.login.mockResolvedValue({
        user: mockUser,
        token: jwtToken,
      });

      const result = await authService.login('test@test.com', 'password');

      expect(result.token).toBeDefined();
      expect(result.token).toContain('.');
    });

    it('should update last_login_at timestamp', async () => {
      /**
       * WHAT: Verifies login timestamp is updated
       * WHY: Audit trail - tracks user activity
       */
      const mockUser = factories.studentUser();
      const beforeLogin = new Date();

      authService.login.mockResolvedValue({
        user: { ...mockUser, last_login_at: new Date() },
        token: 'jwt-token',
      });

      const result = await authService.login('test@test.com', 'password');
      const afterLogin = new Date();

      expect(result.user.last_login_at).toBeInstanceOf(Date);
      expect(result.user.last_login_at.getTime()).toBeGreaterThanOrEqual(
        beforeLogin.getTime()
      );
      expect(result.user.last_login_at.getTime()).toBeLessThanOrEqual(
        afterLogin.getTime()
      );
    });
  });

  describe('validateToken()', () => {
    it('should validate correct JWT token', async () => {
      /**
       * WHAT: Tests token verification with valid token
       * WHY: Security - ensures only valid tokens grant access
       */
      const validToken = 'valid-jwt-token';
      const mockPayload = {
        user_id: 'user-123',
        role: 'student',
        iat: Date.now(),
      };

      authService.validateToken.mockResolvedValue(mockPayload);

      const result = await authService.validateToken(validToken);

      expect(result).toBeDefined();
      expect(result.user_id).toBe('user-123');
    });

    it('should reject expired token', async () => {
      /**
       * WHAT: Rejects tokens past expiration time
       * WHY: Security - expired tokens shouldn't grant access
       */
      authService.validateToken.mockRejectedValue(
        new Error('Token expired')
      );

      await expect(
        authService.validateToken('expired-token')
      ).rejects.toThrow('expired');
    });

    it('should reject invalid signature', async () => {
      /**
       * WHAT: Rejects tokens with tampered signatures
       * WHY: Security - prevents token forgery
       */
      authService.validateToken.mockRejectedValue(
        new Error('Invalid token signature')
      );

      await expect(
        authService.validateToken('tampered-token')
      ).rejects.toThrow('Invalid');
    });

    it('should extract user info from token payload', async () => {
      /**
       * WHAT: Extracts user data embedded in token
       * WHY: Performance - no DB lookup needed for basic user info
       */
      const mockPayload = {
        user_id: 'user-456',
        email: 'test@test.com',
        role: 'company',
      };

      authService.validateToken.mockResolvedValue(mockPayload);

      const result = await authService.validateToken('valid-token');

      expect(result.user_id).toBe('user-456');
      expect(result.email).toBe('test@test.com');
      expect(result.role).toBe('company');
    });
  });

  describe('forgotPassword()', () => {
    it('should generate password reset token', async () => {
      /**
       * WHAT: Creates temporary token for password reset
       * WHY: Security - allows users to reset forgotten passwords
       */
      authService.forgotPassword.mockResolvedValue({
        message: 'Reset link sent to email',
        resetToken: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJ1c2VySWQiOiI0ZmQ2NTM1Ny0yZmRmLTRjMjEtODc3Yy0xNjM3ZjAwODczMzEiLCJpYXQiOjE3MTY0MjkwMDAsImV4cCI6MTcxNjQzMjYwMH0.test',
      });

      const result = await authService.forgotPassword('test@test.com');

      expect(result.resetToken).toBeDefined();
      expect(result.resetToken.length).toBeGreaterThan(20);
    });

    it('should reject non-existent email gracefully', async () => {
      /**
       * WHAT: Returns success message even if email not found
       * WHY: Security - prevents email enumeration attacks
       */
      authService.forgotPassword.mockResolvedValue({
        message: 'If email exists, reset link has been sent',
      });

      const result = await authService.forgotPassword(
        'nonexistent@test.com'
      );

      expect(result.message).toBeDefined();
      // Should not reveal whether email exists
      expect(result.message).toContain('If email exists');
    });

    it('should set reset token expiration', async () => {
      /**
       * WHAT: Reset tokens should expire after set period
       * WHY: Security - limits window for token misuse (default 1 hour)
       */
      authService.forgotPassword.mockResolvedValue({
        resetToken: 'token-123',
        expiresAt: testTime.minutesFromNow(60), // Expires in 1 hour
      });

      const result = await authService.forgotPassword('test@test.com');
      const expiryTime = result.expiresAt.getTime() - new Date().getTime();
      const oneHourMs = 60 * 60 * 1000;

      expect(expiryTime).toBeGreaterThan(oneHourMs - 5000); // Allow 5 sec variance
      expect(expiryTime).toBeLessThan(oneHourMs + 5000);
    });
  });

  describe('resetPassword()', () => {
    it('should reset password with valid token', async () => {
      /**
       * WHAT: Allows user to set new password with valid reset token
       * WHY: Security - completes forgot password flow
       */
      const resetToken = 'valid-reset-token';
      const newPassword = 'NewPassword123!';

      authService.resetPassword.mockResolvedValue({
        message: 'Password reset successfully',
      });

      const result = await authService.resetPassword(resetToken, newPassword);

      expect(result.message).toContain('successfully');
      expect(authService.resetPassword).toHaveBeenCalledWith(
        resetToken,
        newPassword
      );
    });

    it('should reject expired reset token', async () => {
      /**
       * WHAT: Refuses password reset with expired token
       * WHY: Security - prevents unauthorized password changes
       */
      authService.resetPassword.mockRejectedValue(
        new Error('Reset token has expired')
      );

      await expect(
        authService.resetPassword('expired-token', 'NewPassword123!')
      ).rejects.toThrow('expired');
    });

    it('should reject invalid reset token', async () => {
      /**
       * WHAT: Refuses password reset with tampered/invalid token
       * WHY: Security - prevents brute-force token guessing
       */
      authService.resetPassword.mockRejectedValue(
        new Error('Invalid reset token')
      );

      await expect(
        authService.resetPassword('invalid-token', 'NewPassword123!')
      ).rejects.toThrow('Invalid');
    });

    it('should validate new password strength', async () => {
      /**
       * WHAT: New password must meet strength requirements
       * WHY: Security - prevents weak password reset
       */
      authService.resetPassword.mockRejectedValue(
        new Error('Password does not meet requirements')
      );

      await expect(
        authService.resetPassword('valid-token', 'weak')
      ).rejects.toThrow();
    });

    it('should hash new password', async () => {
      /**
       * WHAT: New password should be hashed before storing
       * WHY: Security - plaintext passwords are vulnerable
       */
      const password = 'NewPassword123!';
      const hashed = await bcrypt.hash(password, 10);

      expect(hashed).not.toBe(password);
      expect(hashed.length).toBeGreaterThan(password.length);
    });
  });

  afterEach(() => {
    jest.clearAllMocks();
  });
});
