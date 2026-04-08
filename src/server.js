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
import sequelize from './config/database.js';
import { connectDatabase } from './config/database.js';
import { config, validateConfig } from './config/env.js';
import { errorHandler, wrap, Logger, AppError } from './utils/errorHandler.js';
import { initializeModels } from './models/index.js';
import { authMiddleware, rbacMiddleware, createRateLimiters } from './middleware/auth.js';
import { handleValidationErrors } from './middleware/validation.js';

// Import services
import AuthService from './services/AuthService.js';
import StudentService from './services/StudentService.js';
import MatchingService from './services/MatchingService.js';
import { NotificationService, AuditService } from './services/NotificationService.js';

// Import routes (will create next)
// import authRoutes from './routes/auth.js';
// import studentRoutes from './routes/student.js';

/**
 * Initialize Express application
 * 
 * WHY: Single function to set up all app configuration
 */
async function initializeApp() {
  // Validate environment variables first
  validateConfig();

  // Initialize all models BEFORE connecting to database
  // WHY: Models must be defined before sync() is called
  const models = initializeModels(sequelize);
  console.log('✅ Models initialized');

  // Connect to database and sync models
  await connectDatabase();
  console.log('✅ Database connected and synced');

  // Create Express app
  const app = express();

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

  /**
   * Protected Routes Middleware
   * 
   * WHY: All routes below this require authentication
   */
  app.use(authMiddleware);

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
        data: profile,
      });
    })
  );

  app.put(
    '/api/students/profile',
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
        data: skills,
      });
    })
  );

  app.post(
    '/api/students/skills',
    wrap(async (req, res) => {
      const studentService = new StudentService(models);
      const skill = await studentService.addSkill(req.user.id, req.body);

      res.status(201).json({
        message: 'Skill added successfully',
        data: skill,
      });
    })
  );

  /**
   * Matching Routes
   */
  app.get(
    '/api/matches',
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

  return app;
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

// Start server if this is the main module
if (import.meta.url === `file://${process.argv[1]}`) {
  startServer();
}
