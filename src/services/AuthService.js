/**
 * Authentication Service
 * 
 * WHY: Encapsulates all authentication logic (registration, login, token generation).
 * Keeps business logic separate from HTTP controllers.
 * Easier to test and reuse across the application.
 * 
 * WHAT: Handles user registration, login, password reset, token generation,
 * and other authentication-related operations.
 */

import { AppError, Logger } from '../utils/errorHandler.js';
import { config } from '../config/env.js';
import jwt from 'jsonwebtoken';

export class AuthService {
  constructor(models) {
    this.models = models;
  }

  /**
   * Register a new user
   * 
   * WHY: Validates registration data, creates user and role-specific profile,
   * and generates initial token.
   * 
   * @param {Object} data - Registration data
   * @returns {Object} User object and token
   */
  async register(data) {
    const { name, email, password, role } = data;

    // WHY early return: Fail fast if email already exists
    const existingUser = await this.models.User.findByEmail(email);
    if (existingUser) {
      throw new AppError(`Email ${email} is already registered`, 409);
    }

    // Validate role is allowed
    const allowedRoles = ['student', 'company', 'coordinator'];
    if (!allowedRoles.includes(role)) {
      throw new AppError('Invalid role. Must be student, company, or coordinator', 400);
    }

    try {
      // Create user with hashed password (done automatically by beforeCreate hook)
      const user = await this.models.User.create({
        name,
        email: email.toLowerCase(),
        password,
        role,
        status: role === 'student' ? 'active' : 'pending', // Students auto-active, others pending
      });

      // Create role-specific profile
      // WHY: Each role has different data requirements
      switch (role) {
        case 'student':
          await this.models.Student.create({
            user_id: user.id,
            profile_completeness_percentage: 0,
          });
          break;

        case 'company':
          await this.models.Company.create({
            user_id: user.id,
            accreditation_status: 'pending',
            is_approved_for_posting: false,
          });
          break;

        case 'coordinator':
          await this.models.Coordinator.create({
            user_id: user.id,
            max_students: 50,
          });
          break;
      }

      // Generate authentication token
      const token = user.generateToken();

      Logger.info('User registered successfully', {
        userId: user.id,
        email: user.email,
        role: user.role,
      });

      return {
        user: {
          id: user.id,
          name: user.name,
          email: user.email,
          role: user.role,
          status: user.status,
        },
        token,
      };
    } catch (error) {
      Logger.error('Registration failed', error, { email, role });
      throw error;
    }
  }

  /**
   * Login user with email and password
   * 
   * WHY: Validates credentials and returns token for authenticated requests.
   * Also tracks login attempt for security.
   * 
   * @param {string} email - User email
   * @param {string} password - Plaintext password to verify
   * @returns {Object} User object and token
   */
  async login(email, password) {
    // WHY trim and lowercase: Prevent case/whitespace issues
    email = email.trim().toLowerCase();

    // Find user by email
    const user = await this.models.User.findByEmail(email);
    if (!user) {
      // WHY generic message: Don't reveal if email exists (security best practice)
      throw new AppError('Invalid email or password', 401);
    }

    // Check if account is locked due to failed login attempts (SECURITY FEATURE)
    // WHY: Prevent brute-force attacks by locking after 5 failed attempts for 30 minutes
    // FRONTEND SHOULD: Show countdown timer telling user when they can try again
    if (user.status === 'locked') {
      const lockDurationMinutes = 30;
      const timeSinceLockMs = Date.now() - new Date(user.lockedUntil).getTime();
      const timeSinceLockMinutes = timeSinceLockMs / (1000 * 60);

      if (timeSinceLockMinutes < lockDurationMinutes) {
        // Account STILL locked - calculate remaining time
        const remainingMinutes = Math.ceil(lockDurationMinutes - timeSinceLockMinutes);
        Logger.warn('Login attempt on locked account', {
          email,
          remainingLockMinutes: remainingMinutes,
        });
        // FRONTEND: Show error 423 with remaining time message
        throw new AppError(
          `Account temporarily locked due to too many failed attempts. Try again in ${remainingMinutes} minutes`,
          423 // HTTP Locked status code
        );
      } else {
        // Lock period EXPIRED - auto-unlock and reset attempts
        // WHY auto-unlock: Users shouldn't need admin intervention after 30 min
        await user.update({
          status: 'active',
          failedLoginAttempts: 0,
          lockedUntil: null, // Clear lock timestamp
        });
        Logger.info('Account auto-unlocked after lockout period', { email });
      }
    }

    // Check if account is active (not pending/suspended/inactive)
    // WHY: Some accounts may be pending admin approval or suspended
    if (user.status !== 'active') {
      if (user.status === 'pending') {
        throw new AppError('Account pending approval. Please contact administrator', 403);
      }
      if (user.status === 'suspended') {
        throw new AppError('Account suspended', 403);
      }
      throw new AppError('Account inactive', 403);
    }

    // Verify password with bcrypt.compare (constant-time comparison)
    // WHY: Bcrypt uses constant-time comparison - prevents timing attacks
    // A timing attack would measure how long compare() takes to deduce password
    const passwordMatches = await user.comparePassword(password);
    if (!passwordMatches) {
      // PASSWORD INCORRECT - Increment failed attempts counter (BRUTE-FORCE PROTECTION)
      const newFailedAttempts = (user.failedLoginAttempts || 0) + 1;
      const maxFailedAttempts = 5;

      // Check if we should lock the account
      if (newFailedAttempts >= maxFailedAttempts) {
        // Lock account - prevent further login attempts for 30 minutes
        // WHY: After 5 failed attempts, there's likely a brute-force attack happening
        await user.update({
          status: 'locked',
          lockedUntil: new Date(), // Set current time when lock started
          failedLoginAttempts: newFailedAttempts,
        });

        Logger.warn('Account LOCKED - too many failed login attempts', {
          email,
          attempts: newFailedAttempts,
          lockedUntilMinutes: 30,
        });

        // FRONTEND: Show 423 error message
        throw new AppError(
          'Account locked due to too many failed attempts. Try again in 30 minutes',
          423
        );
      } else {
        // Still under limit - just increment the counter and reject login
        // FRONTEND: Show generic error (don't reveal email/password issue)
        await user.update({
          failedLoginAttempts: newFailedAttempts,
        });

        Logger.warn('Failed login attempt', {
          email,
          attemptNumber: newFailedAttempts,
          maxAttempts: maxFailedAttempts,
        });
      }

      throw new AppError('Invalid email or password', 401);
    }

    // NEW: Reset failed attempts on successful login
    if (user.failedLoginAttempts > 0) {
      await user.update({
        failedLoginAttempts: 0,
      });
    }

    // Update last login timestamp for security monitoring
    await user.update({ last_login_at: new Date() });

    // Generate token
    const token = user.generateToken();

    Logger.info('User logged in successfully', {
      userId: user.id,
      email: user.email,
      role: user.role,
    });

    return {
      user: {
        id: user.id,
        name: user.name,
        email: user.email,
        role: user.role,
        status: user.status,
      },
      token,
    };
  }

  /**
   * Validate JWT token
   * 
   * WHY: Check if a token is still valid (not expired, properly signed).
   * 
   * @param {string} token - JWT token to verify
   * @returns {Object} Decoded token payload
   */
  async validateToken(token) {
    try {
      const decoded = jwt.verify(token, config.auth.secret);
      return decoded;
    } catch (error) {
      if (error.name === 'TokenExpiredError') {
        throw new AppError('Token has expired', 401);
      }
      throw new AppError('Invalid token', 401);
    }
  }

  /**
   * Initiate password reset
   * 
   * WHY: Create a password reset token (usually emailed to user).
   * Note: This is a basic implementation; production would email this.
   * 
   * @param {string} email - Email to reset password for
   * @returns {Object} Reset token info
   */
  async forgotPassword(email) {
    email = email.toLowerCase();

    const user = await this.models.User.findByEmail(email);
    if (!user) {
      // WHY generic message: Don't reveal if email exists
      Logger.info('Password reset attempted for non-existent email', { email });
      return {
        message: 'If email exists, password reset link will be sent',
      };
    }

    // Generate reset token (expires in 1 hour)
    const resetToken = jwt.sign({ userId: user.id }, config.auth.secret, {
      expiresIn: '1h',
    });

    // NEW: Store token in database for tracking and preventing reuse
    const expiresAt = new Date(Date.now() + 60 * 60 * 1000); // 1 hour from now
    await this.models.PasswordResetToken.create({
      userId: user.id,
      token: resetToken,
      expiresAt,
      used: false,
    });

    Logger.info('Password reset requested', {
      userId: user.id,
      email: user.email,
    });

    // In production, email this token to user
    // For now, return it (don't do this in production!)
    return {
      message: 'Reset token generated',
      resetToken: config.app.debug ? resetToken : undefined,
    };
  }

  /**
   * Reset password with valid reset token
   * 
   * WHY: Verify reset token is valid and update password.
   * 
   * @param {string} resetToken - Reset token from email
   * @param {string} newPassword - New password
   * @returns {Object} Success message
   */
  async resetPassword(resetToken, newPassword) {
    try {
      // Verify reset token signature
      const decoded = jwt.verify(resetToken, config.auth.secret);

      // NEW: Check if token has already been used (prevent reuse)
      const tokenRecord = await this.models.PasswordResetToken.findOne({
        where: { token: resetToken },
      });

      if (!tokenRecord) {
        throw new AppError('Invalid reset token', 401);
      }

      if (tokenRecord.used) {
        Logger.warn('Attempted password reset token reuse', {
          userId: decoded.userId,
          usedAt: tokenRecord.usedAt,
        });
        throw new AppError('This reset link has already been used', 401);
      }

      // Check if token has expired
      if (new Date() > tokenRecord.expiresAt) {
        throw new AppError('Reset token has expired', 401);
      }

      // Find user
      const user = await this.models.User.findByPk(decoded.userId);
      if (!user) {
        throw new AppError('User not found', 404);
      }

      // Update password (will be hashed by beforeUpdate hook)
      await user.update({ password: newPassword });

      // NEW: Mark token as used to prevent reuse
      tokenRecord.used = true;
      tokenRecord.usedAt = new Date();
      await tokenRecord.save();

      Logger.info('Password reset successfully', { userId: user.id });

      return {
        message: 'Password reset successfully',
      };
    } catch (error) {
      if (error.name === 'TokenExpiredError') {
        throw new AppError('Reset token has expired', 401);
      }
      if (error instanceof AppError) {
        throw error;
      }
      Logger.error('Password reset failed', error, { token: resetToken?.substring(0, 20) });
      throw new AppError('Invalid reset token', 401);
    }
  }

  /**
   * Get current user profile with role-specific data
   * 
   * WHY: Fetch complete user info including role-specific profile.
   * 
   * @param {number} userId - User ID
   * @returns {Object} Complete user profile
   */
  async getCurrentUser(userId) {
    const user = await this.models.User.findByPk(userId);
    if (!user) {
      throw new AppError('User not found', 404);
    }

    // Get role-specific profile
    const profile = await user.getProfile();

    return {
      user: {
        id: user.id,
        name: user.name,
        email: user.email,
        role: user.role,
        status: user.status,
      },
      profile,
    };
  }

  /**
   * Update user basic info
   * 
   * WHY: Allow users to update name, password without changing role/email.
   * 
   * @param {number} userId - User ID to update
   * @param {Object} data - Updated data
   * @returns {Object} Updated user
   */
  async updateUser(userId, data) {
    const user = await this.models.User.findByPk(userId);
    if (!user) {
      throw new AppError('User not found', 404);
    }

    // Only allow certain fields to be updated
    const allowedFields = ['name'];
    const updateData = {};

    allowedFields.forEach(field => {
      if (data[field] !== undefined) {
        updateData[field] = data[field];
      }
    });

    // Special handling for password
    if (data.newPassword) {
      // WHY old password required: Prevent account takeover if device stolen
      if (!data.currentPassword) {
        throw new AppError('Current password required to change password', 400);
      }

      const passwordMatches = await user.comparePassword(data.currentPassword);
      if (!passwordMatches) {
        throw new AppError('Current password is incorrect', 401);
      }

      updateData.password = data.newPassword;
    }

    await user.update(updateData);

    Logger.info('User updated', { userId: user.id });

    return {
      id: user.id,
      name: user.name,
      email: user.email,
      role: user.role,
    };
  }

  /**
   * Change user account status (suspend/activate)
   * 
   * WHY: Admins can suspend accounts for violations.
   * 
   * @param {number} userId - User ID
   * @param {string} newStatus - New status (active, suspended, inactive)
   * @param {string} reason - Reason for status change
   * @returns {Object} Updated user
   */
  async changeUserStatus(userId, newStatus, reason = null) {
    const user = await this.models.User.findByPk(userId);
    if (!user) {
      throw new AppError('User not found', 404);
    }

    const validStatuses = ['active', 'pending', 'suspended', 'inactive'];
    if (!validStatuses.includes(newStatus)) {
      throw new AppError('Invalid status', 400);
    }

    await user.update({ status: newStatus });

    Logger.warn('User status changed', {
      userId: user.id,
      newStatus,
      reason,
    });

    return {
      id: user.id,
      status: user.status,
    };
  }
}

export default AuthService;
