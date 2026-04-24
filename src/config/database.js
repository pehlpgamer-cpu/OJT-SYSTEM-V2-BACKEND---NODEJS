/**
 * Database Configuration (Sequelize ORM)
 * 
 * WHY: Sequelize is a powerful ORM that provides:
 * 1. Protection against SQL injection (parameterized queries)
 * 2. Automatic model relationships and cascading
 * 3. Built-in migration support for schema versioning
 * 4. Transaction support for data consistency
 * 
 * WHAT: Configures Sequelize connection to SQLite database with
 * security and performance optimizations.
 */

import { Sequelize } from 'sequelize';
import { config } from './env.js';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

/**
 * Initialize Sequelize instance
 * 
 * WHY: Centralized database initialization ensures:
 * 1. Connection pooling (reuses database connections efficiently)
 * 2. Logging for debugging (see SQL queries in development)
 * 3. Consistent configuration across application
 * 
 * WHAT: Automatically detects PostgreSQL (Neon.tech) or falls back to SQLite
 */

// Determine database type based on DATABASE_URL environment variable
const hasDatabaseUrl = !!process.env.DATABASE_URL;
const isPostgres = hasDatabaseUrl && process.env.DATABASE_URL.startsWith('postgresql://');

// Configuration object - will be populated based on database type
let sequelizeConfig;

if (isPostgres) {
  // PostgreSQL configuration (Neon.tech or other providers)
  sequelizeConfig = {
    dialect: 'postgres',
    url: process.env.DATABASE_URL,
    // Connection pooling is CRITICAL for serverless environments
    // Neon recommends smaller pool sizes for serverless
    pool: {
      min: 0,
      max: process.env.DATABASE_POOL_MAX ? parseInt(process.env.DATABASE_POOL_MAX) : 2,
      idle: 10000,
      acquire: 10000,
      evict: 10000,
    },
    // SSL configuration for Neon
    dialectOptions: {
      ssl: {
        require: true,
        rejectUnauthorized: false, // Neon uses self-signed certs
      },
      keepalives: 1,
      keepalivesIdle: 30,
      connectionTimeoutMillis: 10000,
      statement_timeout: 10000,
    },
  };
  console.log('🐘 Using PostgreSQL (Neon.tech)');
  if (process.env.DEBUG) {
    console.log('   Connection URL (sanitized):', 
      process.env.DATABASE_URL.replace(/:[^:/@]+@/, ':***@'));
  }
} else {
  // SQLite configuration (local development/testing)
  const isVercelServerless = process.env.VERCEL === '1';
  
  sequelizeConfig = {
    dialect: 'sqlite',
    storage: isVercelServerless 
      ? ':memory:' 
      : (process.env.NODE_ENV === 'test' 
          ? ':memory:' 
          : path.join(__dirname, '../../database', config.database.path.split('/').pop())),
  };
  console.log('💾 Using SQLite');
}

// Add common Sequelize configuration
const sequelize = new Sequelize({
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
      console.log('⚠️  Vercel serverless detected - using in-memory database');
      console.log('ℹ️  To use persistent database, set DATABASE_URL environment variable');
      
      // Just sync schema for in-memory DB (won't persist)
      await sequelize.sync({ force: false, alter: false });
      console.log('✅ In-memory database ready for Vercel serverless');
      return sequelize;
    }

    // Test connection - if this fails, we know database is unreachable
    await sequelize.authenticate();
    console.log('✅ Database connection authenticated successfully');

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
    console.log('✅ Database models synchronized');

    return sequelize;
  } catch (error) {
    console.error('❌ Database connection error:', error.message);
    if (config.app.debug) {
      console.error('Stack:', error.stack);
    }
    
    // On Vercel serverless, warn but don't fail
    if (!process.env.DATABASE_URL && process.env.VERCEL === '1') {
      console.warn('⚠️  Continuing with in-memory database on Vercel serverless');
      return sequelize;
    }
    
    throw error; // Re-throw so deployment knows it failed
  }
}

export default sequelize;
