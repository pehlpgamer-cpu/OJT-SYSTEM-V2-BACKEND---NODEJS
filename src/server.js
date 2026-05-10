/**
 * Main Application Server
 * 
 * WHY: Central entry point that:
 * 1. Initializes environment and database
 * 2. Configures Express app
 * 3. Registers middleware and routes
 * 4. Handles startup and graceful shutdown
 * 
 * WHAT: Express server with all the application infrastructure.
 */

import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import morgan from 'morgan';
import session from 'express-session';
import passport from 'passport';
import jwt from 'jsonwebtoken';
import sequelize from './config/database.js';
import { connectDatabase } from './config/database.js';
import { config, validateConfig } from './config/env.js';
import { errorHandler, wrap, Logger, AppError } from './utils/errorHandler.js';
import { initializeModels } from './models/index.js';
import { authMiddleware, rbacMiddleware, createRateLimiters } from './middleware/auth.js';
import {
  handleValidationErrors,
  registerValidationRules,
  loginValidationRules,
  forgotPasswordValidationRules,
  resetPasswordValidationRules,
  studentUpdateRules,
  skillValidationRules,
  matchesQueryRules,
  applicationValidationRules,
} from './middleware/validation.js';
import { initializePassport } from './config/passport.js';

// Import services
import AuthService from './services/AuthService.js';
import StudentService from './services/StudentService.js';
import MatchingService from './services/MatchingService.js';
import GoogleAuthService from './services/GoogleAuthService.js';
import { NotificationService, AuditService } from './services/NotificationService.js';

// Import routes
import createGoogleAuthRoutes from './routes/googleAuth.js';

const COMPANY_PROFILE_FIELDS = [
  'company_name',
  'industry_type',
  'company_size',
  'company_website',
  'phone',
  'address',
  'city',
  'country',
  'description',
  'logo_url',
  'tax_id',
];

const POSTING_FIELDS = [
  'title',
  'description',
  'location',
  'allow_remote',
  'duration_weeks',
  'start_date',
  'salary_range_min',
  'salary_range_max',
  'stipend',
  'min_gpa',
  'academic_program',
  'min_year_of_study',
  'positions_available',
  'application_deadline',
  'tags',
];

function toPlain(record) {
  return record?.toJSON ? record.toJSON() : record;
}

function normalizeCompanyProfilePayload(body = {}) {
  const aliases = {
    industry: 'industry_type',
    website: 'company_website',
    logo: 'logo_url',
  };
  const data = {};

  Object.entries(body).forEach(([key, value]) => {
    const field = aliases[key] || key;
    if (COMPANY_PROFILE_FIELDS.includes(field) && value !== undefined) {
      data[field] = value;
    }
  });

  if (data.company_size === '1-10' || data.company_size === '11-50') {
    data.company_size = '1-50';
  }

  return data;
}

function normalizePostingPayload(body = {}, company, { isCreate = false } = {}) {
  const data = {};

  POSTING_FIELDS.forEach((field) => {
    if (body[field] !== undefined) {
      data[field] = body[field];
    }
  });

  if (isCreate && data.duration_weeks === undefined) {
    data.duration_weeks = 12;
  }

  if (data.duration_weeks !== undefined) {
    data.duration_weeks = Number.parseInt(data.duration_weeks, 10);
  }

  if (data.positions_available !== undefined) {
    data.positions_available = Number.parseInt(data.positions_available, 10);
  }

  if (data.allow_remote !== undefined) {
    data.allow_remote = Boolean(data.allow_remote);
  }

  const status = body.posting_status || body.status || (isCreate ? 'draft' : undefined);
  if (status !== undefined) {
    const allowedStatuses = ['active', 'closed', 'draft', 'archived'];
    if (!allowedStatuses.includes(status)) {
      throw new AppError('Invalid posting status', 422);
    }

    if (status === 'active' && !company.is_approved_for_posting) {
      throw new AppError('Company accreditation is required before publishing postings', 403);
    }

    data.posting_status = status;
    if (status === 'active') {
      data.published_at = new Date();
    }
  }

  return data;
}

function formatPosting(posting) {
  const data = toPlain(posting);
  return {
    ...data,
    status: data?.posting_status,
    salary_range:
      data?.salary_range_min || data?.salary_range_max
        ? {
            min: data.salary_range_min,
            max: data.salary_range_max,
          }
        : null,
  };
}

function formatApplication(application) {
  const data = toPlain(application);
  return {
    ...data,
    status: data?.application_status,
  };
}

async function findCompanyForUser(models, userId) {
  const company = await models.Company.findOne({ where: { user_id: userId } });
  if (!company) {
    throw new AppError('Company profile not found', 404);
  }
  return company;
}

/**
 * Initialize Express application
 * 
 * WHY: Single function to set up all app configuration
 */
async function initializeApp() {
  try {
    console.log('🚀 [initializeApp] Starting application initialization...');
    
    // Validate environment variables first
    console.log('📝 [initializeApp] Validating environment configuration...');
    validateConfig();

    // Initialize all models BEFORE connecting to database
    // WHY: Models must be defined before sync() is called
    console.log('📝 [initializeApp] Initializing models...');
    const models = initializeModels(sequelize);
    console.log('✅ Models initialized');

    // Connect to database and sync models
    console.log('📝 [initializeApp] Connecting to database...');
    await connectDatabase();
    console.log('✅ Database connected and synced');

    // Create Express app
    console.log('📝 [initializeApp] Creating Express app instance...');
    const app = express();

    // Store models in app for access in routes
    app.set('models', models);

    /**
     * Security Middleware
     * 
     * WHY: Helmet adds security headers, cors handles cross-origin requests
     */
    app.use(helmet());
    app.use(cors(config.cors));

    /**
     * Request Logging
     * 
     * WHY: Track all requests for debugging and monitoring
     */
    app.use(morgan('combined', {
      stream: {
        write: (message) => Logger.info('HTTP Request', { message: message.trim() }),
      },
    }));

    /**
     * Body Parsing Middleware
     * 
     * WHY: Parse JSON request bodies
     */
    app.use(express.json({ limit: '10mb' }));
    app.use(express.urlencoded({ limit: '10mb', extended: true }));

    /**
     * Session Middleware (Required for OAuth)
     * 
     * WHY: Passport uses sessions for OAuth flow state management
     */
    console.log('📝 [initializeApp] Setting up session middleware...');
    app.use(session({
      secret: config.auth.secret,
      resave: false,
      saveUninitialized: false,
      cookie: {
        secure: config.app.env === 'production', // HTTPS only in production
        httpOnly: true, // Prevent JavaScript from accessing cookie
        sameSite: 'lax', // CSRF protection
        maxAge: 24 * 60 * 60 * 1000, // 24 hours
      },
    }));

  /**
   * Initialize Passport and Sessions
   * 
   * WHY: Set up Google OAuth strategy
   */
  initializePassport(models);
  app.use(passport.initialize());
  app.use(passport.session());

  /**
   * Initialize Rate Limiters
   * 
   * WHY: Prevent brute-force attacks
   */
  const limiters = createRateLimiters();

  /**
   * Health Check Endpoint
   * 
   * WHY: Let load balancers know if app is alive
   */
  app.get('/health', (req, res) => {
    res.json({
      status: 'ok',
      timestamp: new Date().toISOString(),
      environment: config.app.env,
    });
  });

  /**
   * API Version Endpoint
   */
  app.get('/api/version', (req, res) => {
    res.json({
      version: '2.0.0',
      name: 'OJT System V2 API',
      environment: config.app.env,
    });
  });

  /**
   * Authentication Routes
   * 
   * WHY: Public endpoints for registration and login
   */
  app.post(
    '/api/auth/register',
    limiters.auth.middleware(),
    registerValidationRules(),
    handleValidationErrors,
    wrap(async (req, res) => {
      const authService = new AuthService(models);
      const result = await authService.register(req.body);

      // Audit log
      const auditService = new AuditService(models);
      await auditService.log({
        userId: result.user.id,
        action: 'create',
        entityType: 'User',
        entityId: result.user.id,
        newValues: result.user,
        ipAddress: req.ip,
        userAgent: req.get('user-agent'),
        severity: 'high',
      });

      res.status(201).json({
        message: 'Registration successful',
        user: result.user,
        token: result.token,
      });
    })
  );

  app.post(
    '/api/auth/login',
    limiters.auth.middleware(),
    loginValidationRules(),
    handleValidationErrors,
    wrap(async (req, res) => {
      const authService = new AuthService(models);
      const result = await authService.login(req.body.email, req.body.password);

      // Audit log
      const auditService = new AuditService(models);
      await auditService.logLogin(result.user.id, req.ip, req.get('user-agent'));

      res.json({
        message: 'Login successful',
        user: result.user,
        token: result.token,
      });
    })
  );

  // Token Refresh Endpoint - Allows extending session without re-login
  app.post(
    '/api/auth/refresh',
    limiters.auth.middleware(),
    wrap(async (req, res) => {
      try {
        const authHeader = req.headers.authorization;
        if (!authHeader?.startsWith('Bearer ')) {
          throw new AppError('Missing or invalid Authorization header', 401);
        }

        const token = authHeader.slice(7);
        
        // Verify token (allow expired tokens within grace period)
        let decoded;
        try {
          decoded = jwt.verify(token, config.auth.secret, {
            ignoreExpiration: true  // Allow expired tokens for refresh
          });
        } catch (err) {
          throw new AppError('Invalid token', 401);
        }

        // Check if token expired more than 30 days ago (reject ancient tokens)
        const expiresAt = decoded.exp * 1000;
        if (Date.now() - expiresAt > 30 * 24 * 60 * 60 * 1000) {
          throw new AppError('Token too old to refresh. Please log in again.', 401);
        }

        // Get fresh user data
        const user = await models.User.findByPk(decoded.id);
        if (!user || user.status !== 'active') {
          throw new AppError('User account is not active', 403);
        }

        // Issue new token
        const newToken = user.generateToken();
        
        res.status(200).json({
          message: 'Token refreshed successfully',
          user: {
            id: user.id,
            email: user.email,
            role: user.role,
            name: user.name,
            status: user.status,
          },
          token: newToken,
          statusCode: 200,
        });
      } catch (error) {
        if (error instanceof AppError) {
          return res.status(error.statusCode).json(error.toJSON());
        }
        Logger.error('Token refresh failed', error);
        res.status(401).json({
          message: 'Token refresh failed',
          statusCode: 401,
        });
      }
    })
  );

  app.post(
    '/api/auth/forgot-password',
    limiters.passwordReset.middleware(),
    forgotPasswordValidationRules(),
    handleValidationErrors,
    wrap(async (req, res) => {
      const authService = new AuthService(models);
      const result = await authService.forgotPassword(req.body.email);

      const response = {
        message: 'If an account exists for that email, a password reset link will be sent.',
      };

      if (config.app.debug && result.resetToken) {
        response.resetToken = result.resetToken;
      }

      res.json(response);
    })
  );

  app.post(
    '/api/auth/reset-password',
    limiters.passwordReset.middleware(),
    resetPasswordValidationRules(),
    handleValidationErrors,
    wrap(async (req, res) => {
      const authService = new AuthService(models);
      await authService.resetPassword(req.body.token, req.body.password);

      res.json({
        message: 'Password reset successfully',
      });
    })
  );

  /**
   * Google OAuth Routes
   * 
   * WHY: Separate routes for Google OAuth instead of cluttering main auth
   */
  const googleAuthService = new GoogleAuthService(models);
  const googleAuthRoutes = createGoogleAuthRoutes(googleAuthService);
  app.use('/api/auth', googleAuthRoutes);

  /**
   * Protected Routes Middleware
   * 
   * WHY: All routes below this require authentication
   */
  app.use(authMiddleware);
  
  /**
   * Apply general API rate limiting to all protected routes
   */
  app.use(limiters.api.middleware());

  /**
   * Company Routes
   */
  app.get(
    '/api/company/profile',
    rbacMiddleware(['company']),
    wrap(async (req, res) => {
      const company = await findCompanyForUser(models, req.user.id);

      res.json({
        message: 'Company profile retrieved',
        profile: toPlain(company),
      });
    })
  );

  app.put(
    '/api/company/profile',
    rbacMiddleware(['company']),
    wrap(async (req, res) => {
      const company = await findCompanyForUser(models, req.user.id);
      const updateData = normalizeCompanyProfilePayload(req.body);
      await company.update(updateData);

      res.json({
        message: 'Company profile updated successfully',
        profile: toPlain(company),
      });
    })
  );

  app.get(
    '/api/company/postings',
    rbacMiddleware(['company']),
    wrap(async (req, res) => {
      const company = await findCompanyForUser(models, req.user.id);
      const postings = await models.OjtPosting.findAll({
        where: { company_id: company.id },
        order: [['createdAt', 'DESC']],
      });

      const formattedPostings = postings.map(formatPosting);
      res.json({
        message: 'Company postings retrieved',
        postings: formattedPostings,
        data: formattedPostings,
        count: formattedPostings.length,
      });
    })
  );

  app.post(
    '/api/company/postings',
    rbacMiddleware(['company']),
    wrap(async (req, res) => {
      const company = await findCompanyForUser(models, req.user.id);
      const postingData = normalizePostingPayload(req.body, company, { isCreate: true });

      if (postingData.posting_status === 'active' && !company.is_approved_for_posting) {
        throw new AppError('Company accreditation is required before publishing postings', 403);
      }

      const posting = await models.OjtPosting.create({
        ...postingData,
        company_id: company.id,
      });

      res.status(201).json({
        message: 'Posting created successfully',
        posting: formatPosting(posting),
      });
    })
  );

  app.put(
    '/api/company/postings/:id/status',
    rbacMiddleware(['company']),
    wrap(async (req, res) => {
      const company = await findCompanyForUser(models, req.user.id);
      const posting = await models.OjtPosting.findOne({
        where: {
          id: req.params.id,
          company_id: company.id,
        },
      });

      if (!posting) {
        throw new AppError('Posting not found', 404);
      }

      const updateData = normalizePostingPayload(req.body, company);
      await posting.update(updateData);

      res.json({
        message: 'Posting status updated successfully',
        posting: formatPosting(posting),
      });
    })
  );

  app.get(
    '/api/company/postings/:postingId/applications',
    rbacMiddleware(['company']),
    wrap(async (req, res) => {
      const company = await findCompanyForUser(models, req.user.id);
      const posting = await models.OjtPosting.findOne({
        where: {
          id: req.params.postingId,
          company_id: company.id,
        },
      });

      if (!posting) {
        throw new AppError('Posting not found', 404);
      }

      const applications = await models.Application.findAll({
        where: { posting_id: posting.id },
        include: [
          {
            model: models.Student,
            include: [
              {
                model: models.User,
                attributes: ['id', 'name', 'email'],
              },
            ],
          },
        ],
        order: [['applied_at', 'DESC']],
      });

      const formattedApplications = applications.map(formatApplication);
      res.json({
        message: 'Applications retrieved',
        applications: formattedApplications,
        data: formattedApplications,
        count: formattedApplications.length,
      });
    })
  );

  app.put(
    '/api/company/postings/:postingId/applications/:applicationId/status',
    rbacMiddleware(['company']),
    wrap(async (req, res) => {
      const company = await findCompanyForUser(models, req.user.id);
      const posting = await models.OjtPosting.findOne({
        where: {
          id: req.params.postingId,
          company_id: company.id,
        },
      });

      if (!posting) {
        throw new AppError('Posting not found', 404);
      }

      const application = await models.Application.findOne({
        where: {
          id: req.params.applicationId,
          posting_id: posting.id,
        },
      });

      if (!application) {
        throw new AppError('Application not found', 404);
      }

      const statusAliases = {
        accepted: 'hired',
        pending: 'submitted',
      };
      const nextStatus = statusAliases[req.body.status] || req.body.status;
      const validStatuses = ['submitted', 'under_review', 'shortlisted', 'rejected', 'hired', 'withdrawn'];

      if (!validStatuses.includes(nextStatus)) {
        throw new AppError('Invalid application status', 422);
      }

      const updateData = {
        application_status: nextStatus,
      };

      if (req.body.feedback) {
        updateData.company_feedback = req.body.feedback;
      }

      if (nextStatus === 'rejected' && req.body.feedback) {
        updateData.rejection_reason = req.body.feedback;
      }

      if (nextStatus === 'under_review') {
        updateData.reviewed_at = new Date();
      }

      if (nextStatus === 'hired') {
        updateData.hired_at = new Date();
      }

      await application.update(updateData);

      res.json({
        message: 'Application status updated successfully',
        application: formatApplication(application),
      });
    })
  );

  /**
   * Student Routes
   */
  app.get(
    '/api/students/profile',
    wrap(async (req, res) => {
      const studentService = new StudentService(models);
      const profile = await studentService.getProfile(req.user.id);

      res.json({
        message: 'Profile retrieved',
        profile,
        data: profile,
      });
    })
  );

  app.put(
    '/api/students/profile',
    studentUpdateRules(),
    handleValidationErrors,
    wrap(async (req, res) => {
      const studentService = new StudentService(models);
      const updated = await studentService.updateProfile(req.user.id, req.body);

      // Audit log
      const auditService = new AuditService(models);
      await auditService.logDataChange(
        req.user.id,
        'Student',
        updated.id,
        null,
        req.body,
        'Profile updated by student'
      );

      res.json({
        message: 'Profile updated successfully',
        profile: updated,
        data: updated,
      });
    })
  );

  app.get(
    '/api/students/skills',
    wrap(async (req, res) => {
      const studentService = new StudentService(models);
      const skills = await studentService.getSkills(req.user.id);

      res.json({
        message: 'Skills retrieved',
        skills,
        data: skills,
      });
    })
  );

  app.post(
    '/api/students/skills',
    skillValidationRules(),
    handleValidationErrors,
    wrap(async (req, res) => {
      const studentService = new StudentService(models);
      const skill = await studentService.addSkill(req.user.id, req.body);

      res.status(201).json({
        message: 'Skill added successfully',
        skill,
        data: skill,
      });
    })
  );

  /**
   * Matching Routes
   */
  app.get(
    '/api/matches',
    matchesQueryRules(),
    handleValidationErrors,
    wrap(async (req, res) => {
      const matchingService = new MatchingService(models);
      const studentService = new StudentService(models);
      
      const minScore = req.query.minScore || 60;
      const matches = await studentService.getMatchedPostings(req.user.id, minScore);

      res.json({
        message: 'Matching postings retrieved',
        data: matches,
        count: matches.length,
      });
    })
  );

  /**
   * Application Routes
   */
  app.post(
    '/api/applications',
    applicationValidationRules(),
    handleValidationErrors,
    wrap(async (req, res) => {
      const studentService = new StudentService(models);
      const application = await studentService.applyToPosting(req.user.id, req.body.posting_id, req.body);

      // Send notification
      const posting = await models.OjtPosting.findByPk(req.body.posting_id);
      const notificationService = new NotificationService(models);
      await notificationService.notifyApplicationSubmitted(req.user.id, application.id, posting.title);

      res.status(201).json({
        message: 'Application submitted successfully',
        data: application,
      });
    })
  );

  app.get(
    '/api/applications',
    wrap(async (req, res) => {
      const studentService = new StudentService(models);
      const applications = await studentService.getApplications(req.user.id, req.query);

      res.json({
        message: 'Applications retrieved',
        data: applications,
        count: applications.length,
      });
    })
  );

  /**
   * Notification Routes
   */
  app.get(
    '/api/notifications',
    wrap(async (req, res) => {
      const notificationService = new NotificationService(models);
      const page = req.query.page || 1;
      const limit = req.query.limit || 10;

      const result = await notificationService.getNotifications(req.user.id, page, limit);

      res.json({
        message: 'Notifications retrieved',
        data: result.data,
        pagination: result.pagination,
      });
    })
  );

  app.put(
    '/api/notifications/:id/read',
    wrap(async (req, res) => {
      const notificationService = new NotificationService(models);
      const notification = await notificationService.markAsRead(req.params.id);

      res.json({
        message: 'Notification marked as read',
        data: notification,
      });
    })
  );

  /**
   * Audit Log Routes (Admin Only)
   */
  app.get(
    '/api/audit-logs',
    rbacMiddleware(['admin']),
    wrap(async (req, res) => {
      const auditService = new AuditService(models);
      const logs = await models.AuditLog.findAll({
        order: [['createdAt', 'DESC']],
        limit: req.query.limit || 50,
      });

      res.json({
        message: 'Audit logs retrieved',
        data: logs,
        count: logs.length,
      });
    })
  );

  /**
   * Current User Endpoint
   */
  app.get(
    '/api/user',
    wrap(async (req, res) => {
      const user = await models.User.findByPk(req.user.id);
      const profile = await user.getProfile();

      res.json({
        message: 'User information retrieved',
        data: {
          user: {
            id: user.id,
            name: user.name,
            email: user.email,
            role: user.role,
            status: user.status,
          },
          profile,
        },
      });
    })
  );

  /**
   * 404 Handler
   * 
   * WHY: Catch undefined routes and return proper error
   */
  app.use((req, res) => {
    res.status(404).json({
      message: `Route ${req.method} ${req.path} not found`,
      statusCode: 404,
    });
  });

  /**
   * Error Handler Middleware
   * 
   * WHY: Must be last middleware - catches all errors
   */
  app.use(errorHandler);

  console.log('✅ [initializeApp] Application initialized successfully');
  return app;
  } catch (error) {
    console.error('❌ [initializeApp] Fatal error during initialization:');
    console.error('❌ [initializeApp] Error message:', error.message);
    console.error('❌ [initializeApp] Error stack:', error.stack);
    throw error;
  }
}

/**
 * Start Server
 * 
 * WHY: Separate function allows for testing without server startup
 */
async function startServer() {
  try {
    const app = await initializeApp();

    const PORT = config.app.port;
    const server = app.listen(PORT, () => {
      console.log(`
╔════════════════════════════════════════════╗
║  🚀 OJT System V2 Backend Server Running   ║
╠════════════════════════════════════════════╣
║  Environment: ${config.app.env.padEnd(30)} ║
║  Port: ${PORT.toString().padEnd(36)} ║
║  URL: ${config.app.url.padEnd(34)} ║
╚════════════════════════════════════════════╝
      `);
    });

    /**
     * Graceful Shutdown
     * 
     * WHY: Close connections cleanly on shutdown signals
     */
    const gracefulShutdown = async (signal) => {
      console.log(`\n${signal} received, shutting down gracefully...`);

      server.close(async () => {
        await sequelize.close();
        console.log('✅ Database connection closed');
        console.log('✅ Server shutdown complete');
        process.exit(0);
      });

      // Force shutdown after 10 seconds
      setTimeout(() => {
        console.error('❌ Could not close connections in time, forcefully shutting down');
        process.exit(1);
      }, 10000);
    };

    process.on('SIGTERM', () => gracefulShutdown('SIGTERM'));
    process.on('SIGINT', () => gracefulShutdown('SIGINT'));
  } catch (error) {
    console.error('❌ Failed to start server:', error.message);
    process.exit(1);
  }
}

// Export functions for testing and programmatic use
export { initializeApp, startServer };

// Start server only in local development (not on Vercel)
if (process.env.VERCEL !== '1' && import.meta.url === `file://${process.argv[1]}`) {
  startServer();
}
