/**
 * Database Configuration (Sequelize ORM)
 * 
 * WHY: Sequelize is a powerful ORM that provides:
 * 1. Protection against SQL injection (parameterized queries)
 * 2. Automatic model relationships and cascading
 * 3. Built-in migration support for schema versioning
 * 4. Transaction support for data consistency
 * 
 * WHAT: Configures PostgreSQL connection with proper pooling and SSL
 * NOTE: PostgreSQL is REQUIRED. SQLite is not supported.
 */

import { Sequelize } from 'sequelize';
import { config } from './env.js';

/**
 * Initialize Sequelize instance
 * 
 * WHY: Centralized database initialization ensures:
 * 1. Connection pooling (reuses database connections efficiently)
 * 2. Logging for debugging (see SQL queries in development)
 * 3. Consistent configuration across application
 * 
 * WHAT: Configures PostgreSQL connection with proper pooling and SSL
 */

// PostgreSQL is REQUIRED - validate DATABASE_URL is set
if (!process.env.DATABASE_URL) {
  throw new Error(
    'DATABASE_URL environment variable is REQUIRED and must not be empty. '
    + 'PostgreSQL is the only supported database. '
    + 'Example: postgresql://user:password@host:5432/database'
  );
}

if (!process.env.DATABASE_URL.startsWith('postgresql://')) {
  throw new Error(
    'DATABASE_URL must be a valid PostgreSQL connection string starting with "postgresql://". '
    + 'SQLite and other database types are not supported.'
  );
}

// PostgreSQL configuration (Neon pooler endpoint + pg driver)
// WHY: Neon pooler accepts standard pg connections via TCP
// DATABASE_URL already points to pooler: ep-*-pooler.neon.tech
const sequelizeConfig = {
  dialect: 'postgres',
  url: process.env.DATABASE_URL,
  // Connection pool - critical for serverless
  pool: {
    min: 0,
    max: 3, // Neon free tier: 20 conn total, reserve 2/3 for app
    acquire: 30000,
    idle: 10000,
    evict: 30000,
  },
  dialectOptions: {
    ssl: {
      require: true,
      rejectUnauthorized: false, // Neon certs
    },
  },
};
console.log('[database] 🐘 PostgreSQL (Neon Pooler + pg): Configured');
if (process.env.DEBUG) {
  console.log('[database] URL (sanitized):', 
    process.env.DATABASE_URL.replace(/:[^:/@]+@/, ':***@'));
}

// Add common Sequelize configuration
let sequelize;
try {
  sequelize = new Sequelize({
    ...sequelizeConfig,
    
    /**
     * WHY logging: In development, logging SQL queries helps debug issues.
     * In production, disable logging to reduce overhead.
     */
    logging: config.app.debug && process.env.NODE_ENV !== 'test' ? console.log : false,
    
    /**
     * WHY timestamps: Automatically adds createdAt/updatedAt to all models.
     * Useful for audit trails and understanding when records changed.
     */
    timestamps: true,
    
    // Prevent deletion of records when foreign key constraint is violated
    define: {
      underscored: true, // Convert camelCase to snake_case in database
      freezeTableName: false, // Allow Sequelize to pluralize table names
      paranoid: true, // Soft deletes - don't actually delete, just mark as deleted
    },
  });
} catch (error) {
  console.error('[database] ❌ Init failed:', error.message);
  throw error;
}

/**
 * Connect to database and sync models
 * 
 * WHY separate function: Allows testing and allows the app to
 * handle connection failures gracefully.
 * 
 * WHAT: Authenticates connection and syncs all model definitions
 * with the database schema.
 */
export async function connectDatabase() {
  try {
    const isVercelServerless = !process.env.DATABASE_URL && process.env.VERCEL === '1';
    
    // Skip database operations on Vercel serverless without DATABASE_URL
    if (isVercelServerless) {
      if (process.env.NODE_ENV === 'production' || process.env.APP_ENV === 'production') {
        throw new Error('DATABASE_URL is required for production Vercel deployments');
      }

      console.log('[database] ⚠️  Vercel serverless - in-memory mode');
      
      // Just sync schema for in-memory DB (won't persist)
      await sequelize.sync({ force: false, alter: false });
      console.log('[database] ✅ In-memory ready');
      return sequelize;
    }

    // Test connection - if this fails, we know database is unreachable
    await sequelize.authenticate();
    console.log('[database] ✅ Authenticated');

    // Sync all models with database
    // WHY force and alter settings:
    // - Test: force=true (recreate all), alter=false (don't try to migrate)
    // - Debug/Dev: force=false, alter=true (safe schema updates)
    // - Prod: force=false, alter=false (use migrations)
    const isTest = process.env.NODE_ENV === 'test';
    const isDebug = config.app.debug && !isTest;
    
    await sequelize.sync({ 
      alter: isDebug,      // Allow schema changes in development
      force: isTest        // Recreate all tables for each test
    });
    console.log('[database] ✅ Models synced');

    return sequelize;
  } catch (error) {
    console.error('[database] ❌ Connection failed:', error.message, '| Code:', error.code);
    if (config.app.debug) {
      console.error('[database] Stack:', error.stack);
    }
    
    // On Vercel serverless, warn but don't fail
    if (!process.env.DATABASE_URL && process.env.VERCEL === '1') {
      if (process.env.NODE_ENV === 'production' || process.env.APP_ENV === 'production') {
        throw error;
      }
      console.warn('[database] ⚠️  Fallback to in-memory mode');
      return sequelize;
    }
    
    throw error; // Re-throw so deployment knows it failed
  }
}

// Export DataTypes for model definitions
export const DataTypes = sequelize.DataTypes;

export default sequelize;
