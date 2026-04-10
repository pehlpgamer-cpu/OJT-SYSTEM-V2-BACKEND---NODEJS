/**
 * Google OAuth Routes
 * 
 * WHY: Separate routes for Google OAuth flow from general auth routes
 * WHAT: Handles OAuth redirects, callbacks, linking, and unlinking
 */

import express from 'express';
import passport from 'passport';
import { config } from '../config/env.js';
import { authMiddleware } from '../middleware/auth.js';
import { AppError, Logger, wrap } from '../utils/errorHandler.js';

export function createGoogleAuthRoutes(googleAuthService) {
  const router = express.Router();

  /**
   * Step 1: Redirect to Google OAuth
   * 
   * WHY: Frontend calls this to initiate Google login/signup flow
   * Client needs to store role choice from query parameter
   * 
   * GET /api/auth/google/redirect?role=student&linking=false
   */
  router.get('/google/redirect', (req, res) => {
    try {
      const { role = 'student', linking = 'false' } = req.query;

      // Validate role
      const validRoles = ['student', 'company', 'coordinator'];
      if (!validRoles.includes(role)) {
        Logger.warn('Invalid role in Google redirect', { role });
        return res.status(400).json({
          message: 'Invalid role',
          statusCode: 400,
        });
      }

      // Store role and linking intent in session for callback
      req.session = req.session || {};
      req.session.oauthRole = role;
      req.session.oauthLinking = linking === 'true';

      Logger.info('Google OAuth redirect initiated', { role, linking });

      // Determine callback URL based on environment
      const callbackUrl = config.app.env === 'production'
        ? config.google.prodCallbackUrl
        : config.google.devCallbackUrl;

      // Passport authenticate with Google strategy
      // Scopes: profile (name, picture), email
      passport.authenticate('google', {
        scope: ['profile', 'email'],
        callbackURL: callbackUrl,
        prompt: 'select_account', // Allow user to select Google account
      })(req, res);
    } catch (error) {
      Logger.error('Google redirect failed', error);
      res.status(500).json({
        message: 'OAuth initialization failed',
        statusCode: 500,
      });
    }
  });

  /**
   * Step 2: Google OAuth Callback
   * 
   * WHY: Google calls this after user authorizes the app
   * This is handled by Passport, then we generate JWT
   * 
   * GET /api/auth/google/callback
   */
  router.get('/google/callback', (req, res, next) => {
    // Determine callback URL based on environment
    const callbackUrl = config.app.env === 'production'
      ? config.google.prodCallbackUrl
      : config.google.devCallbackUrl;

    passport.authenticate('google', {
      callbackURL: callbackUrl,
      failureRedirect: '/login?error=auth_failed',
    }, wrap(async (err, user, info) => {
      try {
        // Handle linking scenario
        if (info && info.requiresLinking) {
          Logger.info('Linking confirmation needed', { 
            existingUserId: info.existingUserId,
            googleEmail: info.googleProfile.email,
          });

          // Store in session for confirmation endpoint
          req.session = req.session || {};
          req.session.pendingLinking = {
            existingUserId: info.existingUserId,
            googleProfile: info.googleProfile,
          };

          // Return prompt for user to confirm linking
          return res.json({
            requiresLinking: true,
            message: 'Email already registered. Please confirm linking Google account.',
            existingUserId: info.existingUserId,
            googleEmail: info.googleProfile.email,
            statusCode: 200,
          });
        }

        // Authentication error
        if (err || !user) {
          Logger.warn('Google OAuth failed', err, { info });
          return res.status(401).json({
            message: info?.message || 'Google authentication failed',
            statusCode: 401,
          });
        }

        // Get role from session or default
        const role = (req.session?.oauthRole) || 'student';

        // Update user role if not student (first login only)
        if (role !== 'student' && user.role === 'student') {
          await user.update({ role });
          Logger.info('User role set from OAuth', { userId: user.id, role });
        }

        // Generate token
        const token = user.generateToken();
        const formattedUser = {
          id: user.id,
          name: user.name,
          email: user.email,
          role: user.role,
          status: user.status,
          auth_provider: user.auth_provider,
        };

        Logger.info('Google OAuth callback successful', {
          userId: user.id,
          email: user.email,
          role: user.role,
        });

        // Return success response
        res.json({
          user: formattedUser,
          token,
          statusCode: 200,
        });
      } catch (error) {
        Logger.error('Google callback processing failed', error);
        res.status(500).json({
          message: 'OAuth callback processing failed',
          statusCode: 500,
        });
      }
    }))(req, res, next);
  });

  /**
   * Confirm Account Linking
   * 
   * WHY: User explicitly confirms they want their existing account linked to Google
   * 
   * POST /api/auth/google/confirm-linking
   * Body: { googleId, email, password }  // password for security verification
   * 
   * Response: User object + token (same as successful login)
   */
  router.post(
    '/google/confirm-linking',
    wrap(async (req, res) => {
      const { userId, googleId, email } = req.body;

      // Validate required fields
      if (!userId || !googleId || !email) {
        return res.status(400).json({
          message: 'Missing required fields: userId, googleId, email',
          statusCode: 400,
        });
      }

      // Link the Google account
      const result = await googleAuthService.confirmAccountLinking(userId, googleId, email);

      res.status(200).json({
        ...result,
        statusCode: 200,
      });
    })
  );

  /**
   * Link Google Account (for already logged-in users)
   * 
   * WHY: Existing users can add Google OAuth to their account
   * 
   * POST /api/auth/google/link
   * Headers: Authorization: Bearer <token>
   * Body: { googleId, email, name }
   * 
   * Response: User + token
   */
  router.post(
    '/google/link',
    authMiddleware,
    wrap(async (req, res) => {
      const userId = req.user.id;
      const { googleId, email } = req.body;

      if (!googleId || !email) {
        return res.status(400).json({
          message: 'Missing required fields: googleId, email',
          statusCode: 400,
        });
      }

      // Link Google account
      const result = await googleAuthService.confirmAccountLinking(userId, googleId, email);

      Logger.info('Google account linked by authenticated user', { userId, googleId });

      res.status(200).json({
        ...result,
        statusCode: 200,
      });
    })
  );

  /**
   * Unlink Google Account
   * 
   * WHY: User wants to stop using Google OAuth
   * 
   * DELETE /api/auth/google/unlink
   * Headers: Authorization: Bearer <token>
   * 
   * Response: User object
   */
  router.delete(
    '/google/unlink',
    authMiddleware,
    wrap(async (req, res) => {
      const userId = req.user.id;

      const result = await googleAuthService.unlinkGoogleAccount(userId);

      Logger.info('Google account unlinked', { userId });

      res.status(200).json({
        ...result,
        statusCode: 200,
      });
    })
  );

  /**
   * Check Google Auth Status
   * 
   * WHY: Frontend needs to know if user has Google linked
   * 
   * GET /api/auth/google/status
   * Headers: Authorization: Bearer <token>
   * 
   * Response: { google_linked: boolean }
   */
  router.get(
    '/google/status',
    authMiddleware,
    wrap(async (req, res) => {
      const userId = req.user.id;
      const user = await req.app.get('models').User.findByPk(userId);

      res.status(200).json({
        google_linked: !!user?.google_id,
        auth_provider: user?.auth_provider,
        statusCode: 200,
      });
    })
  );

  return router;
}

export default createGoogleAuthRoutes;
