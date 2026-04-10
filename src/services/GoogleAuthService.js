/**
 * Google Authentication Service
 * 
 * WHY: Encapsulates all Google OAuth business logic (authentication,
 * account linking, unlinking). Separate from HTTP layer.
 * 
 * WHAT: Handles Google account verification, linking, unlinking,
 * and linking confirmation flows.
 */

import { AppError, Logger } from '../utils/errorHandler.js';

export class GoogleAuthService {
  constructor(models) {
    this.models = models;
  }

  /**
   * Authenticate user via Google OAuth
   * 
   * WHY: Centralize OAuth login/signup logic for reusability
   * 
   * @param {Object} googleProfile - Profile from Passport strategy
   * @returns {Object} User and token
   */
  async authenticateWithGoogle(googleProfile) {
    // Check if user already has Google OAuth
    let user = await this.models.User.findByGoogleId(googleProfile.id);

    if (user) {
      Logger.info('Google user authenticated (existing)', { userId: user.id });
      return {
        user: this._formatUser(user),
        token: user.generateToken(),
      };
    }

    // Check if email exists (duplicate)
    const existingUser = await this.models.User.findByEmail(googleProfile.email);

    if (existingUser) {
      // Email exists - return special response for linking confirmation
      Logger.info('Email exists - requires linking confirmation', { 
        existingUserId: existingUser.id,
        email: googleProfile.email,
      });

      return {
        requiresLinking: true,
        existingUserId: existingUser.id,
        googleProfile: {
          googleId: googleProfile.id,
          email: googleProfile.email,
          name: googleProfile.name,
          profilePicture: googleProfile.picture,
        },
      };
    }

    // New user - create account
    const newUser = await this._createGoogleUser(googleProfile);
    
    Logger.info('New user created via Google', { userId: newUser.id, email: newUser.email });

    return {
      user: this._formatUser(newUser),
      token: newUser.generateToken(),
    };
  }

  /**
   * Create new Google user with profile
   * 
   * WHY: Separate method for testability and clarity
   * 
   * @private
   */
  async _createGoogleUser(googleProfile) {
    try {
      const user = await this.models.User.create({
        name: googleProfile.name,
        email: googleProfile.email.toLowerCase(),
        password: null, // No password for Google OAuth
        google_id: googleProfile.id,
        auth_provider: 'google',
        email_verified_at: new Date(), // Auto-verify Google emails
        status: 'active', // Auto-activate Google users
      });

      // Create student profile by default
      // WHY: Users can change role during signup if needed
      await this.models.Student.create({
        user_id: user.id,
        profile_completeness_percentage: 10, // Name + email
      });

      Logger.info('Google user account created', { userId: user.id });

      return user;
    } catch (error) {
      Logger.error('Failed to create Google user', error);
      throw error;
    }
  }

  /**
   * Request account linking
   * 
   * WHY: When email exists, user must confirm they want to link Google to existing account
   * 
   * @param {number} userId - User ID requesting link
   * @param {Object} googleProfile - Google profile data
   * @returns {Object} Linking request confirmation
   */
  async requestAccountLinking(userId, googleProfile) {
    const user = await this.models.User.findByPk(userId);

    if (!user) {
      throw new AppError('User not found', 404);
    }

    // Security: Verify email matches
    if (user.email.toLowerCase() !== googleProfile.email.toLowerCase()) {
      Logger.warn('Email mismatch in linking request', {
        userId,
        existingEmail: user.email,
        googleEmail: googleProfile.email,
      });
      throw new AppError('Email does not match existing account', 400);
    }

    // Security: User must have password to unlink later if needed
    if (!user.password) {
      Logger.warn('Cannot link Google to passwordless account', { userId });
      throw new AppError(
        'Your account has no password. Set a password before linking Google.',
        400
      );
    }

    Logger.info('Account linking requested', {
      userId,
      googleId: googleProfile.id,
      email: user.email,
    });

    return {
      message: 'Please confirm linking Google account',
      requiresConfirmation: true,
      userId,
    };
  }

  /**
   * Confirm account linking
   * 
   * WHY: User confirms they want to link Google to their existing email account
   * 
   * @param {number} userId - User ID to link
   * @param {string} googleId - Google ID from OAuth
   * @param {string} email - Email to verify
   * @returns {Object} Updated user with token
   */
  async confirmAccountLinking(userId, googleId, email) {
    const user = await this.models.User.findByPk(userId);

    if (!user) {
      throw new AppError('User not found', 404);
    }

    // Verify email matches
    if (user.email.toLowerCase() !== email.toLowerCase()) {
      throw new AppError('Email mismatch', 400);
    }

    // Check if Google ID already linked to another user
    const googleUser = await this.models.User.findByGoogleId(googleId);
    if (googleUser && googleUser.id !== userId) {
      throw new AppError('Google account already linked to another user', 409);
    }

    // Link Google account
    await user.update({
      google_id: googleId,
      google_linked_at: new Date(),
      email_verified_at: new Date(), // Verify email via Google
    });

    Logger.info('Google account linked', { userId, googleId });

    return {
      user: this._formatUser(user),
      token: user.generateToken(),
      message: 'Google account linked successfully',
    };
  }

  /**
   * Unlink Google account from user
   * 
   * WHY: User may want to stop using Google OAuth
   * 
   * @param {number} userId - User ID
   * @returns {Object} Updated user
   */
  async unlinkGoogleAccount(userId) {
    const user = await this.models.User.findByPk(userId);

    if (!user) {
      throw new AppError('User not found', 404);
    }

    // Security: User must have password to unlink (can't leave account unsecured)
    if (!user.password) {
      throw new AppError(
        'Set a password before unlinking Google. You need another auth method.',
        400
      );
    }

    // Security: User must have at least email auth provider
    if (user.google_id && user.password) {
      await user.update({
        google_id: null,
        google_linked_at: null,
      });

      Logger.info('Google account unlinked', { userId });

      return {
        user: this._formatUser(user),
        message: 'Google account unlinked successfully',
      };
    }

    throw new AppError('Cannot unlink - no other authentication method available', 400);
  }

  /**
   * Check if Google account exists
   * 
   * @param {string} googleId - Google ID
   * @returns {Promise<boolean>}
   */
  async googleAccountExists(googleId) {
    const user = await this.models.User.findByGoogleId(googleId);
    return !!user;
  }

  /**
   * Get user by Google ID (for login)
   * 
   * @param {string} googleId - Google ID
   * @returns {Promise<Object>} User with token
   */
  async getUserByGoogleId(googleId) {
    const user = await this.models.User.findByGoogleId(googleId);

    if (!user) {
      throw new AppError('User not found', 404);
    }

    return {
      user: this._formatUser(user),
      token: user.generateToken(),
    };
  }

  /**
   * Format user response
   * 
   * WHY: Don't expose sensitive fields like password, google_id to API response
   * 
   * @private
   */
  _formatUser(user) {
    return {
      id: user.id,
      name: user.name,
      email: user.email,
      role: user.role,
      status: user.status,
      auth_provider: user.auth_provider,
      google_linked: !!user.google_id,
    };
  }
}

export default GoogleAuthService;
