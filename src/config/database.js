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
 */
const sequelize = new Sequelize({
  // Use in-memory SQLite for tests, file-based for development/production
  dialect: 'sqlite',
  
  // Path to database file - use :memory: for tests
  storage: process.env.NODE_ENV === 'test' ? ':memory:' : path.join(__dirname, '../../database', config.database.path.split('/').pop()),
  
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
    throw error; // Re-throw so test knows it failed
  }
}

export default sequelize;
