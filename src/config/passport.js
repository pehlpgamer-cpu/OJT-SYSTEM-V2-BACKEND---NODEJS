/**
 * Passport Configuration
 * 
 * WHY: Centralize OAuth strategy configuration for Google authentication
 * WHAT: Sets up Google OAuth 2.0 strategy with callback handling
 */

import passport from 'passport';
import { Strategy as GoogleStrategy } from 'passport-google-oauth20';
import { config } from '../config/env.js';
import { Logger, AppError } from '../utils/errorHandler.js';

/**
 * Initialize Passport with Google OAuth strategy
 * 
 * @param {Object} models - Sequelize models
 */
export function initializePassport(models) {
  // Google OAuth Strategy Configuration
  passport.use(
    new GoogleStrategy(
      {
        clientID: config.google.clientId,
        clientSecret: config.google.clientSecret,
        // NOTE: callbackURL will be set dynamically based on environment
        // See googleRoutes.js for actual callback URLs
      },
      // Verification callback - called when Google authentication succeeds
      async (accessToken, refreshToken, profile, done) => {
        try {
          // WHY: Early return prevents deep nesting
          if (!profile || !profile.emails || !profile.emails[0]) {
            Logger.error('Google profile missing email', { profile });
            return done(null, false, { message: 'Email not provided by Google' });
          }

          const googleId = profile.id;
          const email = profile.emails[0].value.toLowerCase();
          const name = profile.displayName || `${profile.given_name || ''} ${profile.family_name || ''}`.trim();
          const profilePicture = profile.photos?.[0]?.value;

          Logger.info('Google OAuth verification started', { googleId, email });

          // Check if user already has Google OAuth linked
          let user = await models.User.findByGoogleId(googleId);

          if (user) {
            // User already authenticated with this Google account before
            Logger.info('Google user found (existing OAuth)', { userId: user.id, email });
            return done(null, user);
          }

          // Check if email already exists (potential account linking)
          const existingEmailUser = await models.User.findByEmail(email);

          if (existingEmailUser) {
            // Email exists - could be linking scenario
            // Return special flag for frontend to confirm linking
            Logger.info('Email already exists - potential account linking', { 
              existingUserId: existingEmailUser.id, 
              googleEmail: email 
            });

            return done(null, false, {
              message: 'Email already registered',
              requiresLinking: true,
              existingUserId: existingEmailUser.id,
              googleProfile: {
                googleId,
                email,
                name,
                profilePicture,
              },
            });
          }

          // New user - create account
          Logger.info('Creating new user via Google OAuth', { email, name });

          const newUser = await models.User.create({
            name,
            email,
            password: null, // No password for Google OAuth users
            google_id: googleId,
            auth_provider: 'google',
            email_verified_at: new Date(), // Auto-verify Google emails
            status: 'active', // Auto-activate Google users
          });

          // Create role-specific profile (defaults to student)
          await models.Student.create({
            user_id: newUser.id,
            profile_completeness_percentage: 10, // Name and email complete
          });

          Logger.info('New user created via Google OAuth', { 
            userId: newUser.id, 
            email, 
            role: newUser.role 
          });

          return done(null, newUser);
        } catch (error) {
          Logger.error('Google OAuth verification failed', error, { profile });
          return done(error);
        }
      }
    )
  );

  // Serialize user for session
  // WHY: Store only ID in session, retrieve full user on each request
  passport.serializeUser((user, done) => {
    done(null, user.id);
  });

  // Deserialize user from session
  // WHY: Retrieve full user object from database using stored ID
  passport.deserializeUser(async (userId, done) => {
    try {
      const user = await models.User.findByPk(userId);
      done(null, user);
    } catch (error) {
      Logger.error('Passport deserialization failed', error, { userId });
      done(error);
    }
  });
}

export default passport;
