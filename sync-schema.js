/**
 * Database Schema Sync Script
 * 
 * WHY: Standalone script to sync database schema without starting the server.
 * Useful for:
 * - Initial schema setup on Neon.tech
 * - CI/CD pipelines
 * - Production deployments
 * - Database migrations without server downtime
 * 
 * USAGE:
 * DATABASE_URL=postgresql://... node sync-schema.js
 */

import dotenv from 'dotenv';
dotenv.config();

// Override NODE_ENV to prevent issues with test database config
if (!process.env.NODE_ENV) {
  process.env.NODE_ENV = 'production';
}

import pg from 'pg';
import { Sequelize } from 'sequelize';
import { initializeModels } from './src/models/index.js';

async function syncSchema() {
  let sequelize = null;
  
  try {
    console.log('═══════════════════════════════════════════════════════════');
    console.log('🗄️  Database Schema Sync Tool');
    console.log('═══════════════════════════════════════════════════════════');
    console.log();

    // Validate DATABASE_URL
    if (!process.env.DATABASE_URL && process.env.NODE_ENV !== 'test') {
      console.warn('⚠️  DATABASE_URL not set');
      console.log('📝 Using SQLite (local development)');
    }

    // Create fresh Sequelize instance
    console.log('🔄 Step 1: Creating Sequelize instance...');
    if (process.env.DATABASE_URL && process.env.DATABASE_URL.startsWith('postgresql://')) {
      // PostgreSQL
      sequelize = new Sequelize(process.env.DATABASE_URL, {
        dialect: 'postgres',
        logging: false,
        pool: {
          min: 0,
          max: 1,
          idle: 5000,
          acquire: 60000,
          evict: 10000,
        },
        dialectOptions: {
          ssl: {
            require: true,
            rejectUnauthorized: false,
          },
          keepalives: 1,
          keepalivesIdle: 30,
          connectionTimeoutMillis: 60000,
          statement_timeout: 60000,
        },
      });
      console.log('✅ Sequelize instance created (PostgreSQL)');
    } else {
      // SQLite
      const path = require('path');
      sequelize = new Sequelize({
        dialect: 'sqlite',
        storage: ':memory:',
        logging: false,
      });
      console.log('✅ Sequelize instance created (SQLite)');
    }
    console.log();

    // Initialize models
    console.log('🔄 Step 2: Initializing models...');
    initializeModels(sequelize);
    console.log('✅ Models initialized');
    console.log();

    // Connect to database
    console.log('🔄 Step 3: Connecting to database...');
    await sequelize.authenticate();
    console.log('✅ Connected to database');
    
    // Determine database type
    const dialect = sequelize.options.dialect;
    if (dialect === 'postgres') {
      console.log('   🐘 PostgreSQL (Neon.tech)');
      
      // Create public schema if it doesn't exist (for fresh Neon databases)
      console.log();
      console.log('🔄 Step 3b: Ensuring public schema exists...');
      await sequelize.query('CREATE SCHEMA IF NOT EXISTS public');
      console.log('✅ Public schema ready');
    } else if (dialect === 'sqlite') {
      console.log('   💾 SQLite');
    }
    console.log();

    // Sync schema
    console.log('🔄 Step 4: Syncing schema...');
    
    // For PostgreSQL, use force: true to ensure clean creation
    let syncOptions = { force: false };
    
    if (dialect === 'postgres') {
      try {
        const result = await sequelize.query(`
          SELECT COUNT(*) as table_count 
          FROM information_schema.tables 
          WHERE table_schema = 'public' 
          AND table_type = 'BASE TABLE'
          AND table_name IN ('users', 'students', 'companies', 'coordinators', 'ojt_postings')
        `);
        
        const appTableCount = parseInt(result[0][0]?.table_count || 0);
        
        if (appTableCount === 0) {
          console.log('   📋 Fresh database detected');
          console.log('   🔄 Dropping existing tables...');
          
          // Drop all tables safely with CASCADE
          await sequelize.query(`
            DROP TABLE IF EXISTS 
              otj_progress,
              matching_rule,
              match_score,
              notification,
              audit_log,
              message,
              password_reset_token,
              skill,
              application_skill,
              student_skill,
              resume,
              application,
              ojt_posting,
              coordinator,
              company,
              student,
              "user"
            CASCADE
          `);
          
          console.log('   ✅ Tables dropped');
          syncOptions = { force: true };
        }
      } catch (err) {
        console.log('   ⚠️  Cleanup note:', err.message);
        syncOptions = { force: true };
      }
    }
    
    console.log('   🔄 Creating tables with force mode...');
    await sequelize.sync(syncOptions);
    console.log('✅ Schema synced successfully');
    console.log();

    // List tables
    console.log('🔄 Step 5: Verifying tables...');
    const models = sequelize.models;
    console.log(`   Found ${Object.keys(models).length} models:`);
    Object.keys(models).forEach(modelName => {
      const model = models[modelName];
      console.log(`   ✓ ${model.tableName}`);
    });
    console.log();

    // Connection info
    if (dialect === 'postgres') {
      console.log('📊 PostgreSQL Connection Info:');
      const host = sequelize.options.host || 'via CONNECTION_URL';
      console.log(`   Host: ${host}`);
      console.log(`   Database: ${sequelize.options.database || 'N/A'}`);
      console.log();
    }

    // Success message
    console.log('═══════════════════════════════════════════════════════════');
    console.log('✅ Schema sync completed successfully!');
    console.log('═══════════════════════════════════════════════════════════');
    console.log();

    // Cleanup
    await sequelize.close();
    process.exit(0);

  } catch (error) {
    console.error();
    console.error('═══════════════════════════════════════════════════════════');
    console.error('❌ Schema sync failed!');
    console.error('═══════════════════════════════════════════════════════════');
    console.error();
    
    // Log full error object for debugging
    console.error('Error Details:');
    console.error('  Message:', error.message || '(no message)');
    console.error('  Code:', error.code || '(no code)');
    console.error('  Name:', error.name || '(no name)');
    
    if (error.original) {
      console.error('  Original Error:', error.original.message);
    }
    console.error();

    // Provide helpful troubleshooting
    if (error.message?.includes('ECONNREFUSED') || error.code === 'ECONNREFUSED') {
      console.error('💡 Troubleshooting:');
      console.error('   1. Check DATABASE_URL is set correctly');
      console.error('   2. Ensure database is accessible');
      console.error('   3. For Neon: use Pooler connection, not Direct');
      console.error('   4. Try: psql "your-connection-string" to test connection');
    } else if (error.message?.includes('SSL') || error.code?.includes('SSL')) {
      console.error('💡 Troubleshooting:');
      console.error('   1. Ensure ?sslmode=require in connection string');
      console.error('   2. Check SSL certificate is valid');
    } else if (error.message?.includes('authentication') || error.code?.includes('auth')) {
      console.error('💡 Troubleshooting:');
      console.error('   1. Check username and password in DATABASE_URL');
      console.error('   2. Ensure special characters are URL-encoded');
      console.error('   3. Verify credentials are correct in Neon dashboard');
    } else if (error.message?.includes('SQLITE_ERROR')) {
      console.error('💡 Troubleshooting:');
      console.error('   1. DATABASE_URL environment variable not set');
      console.error('   2. Script is using SQLite instead of PostgreSQL');
      console.error('   3. Try: $env:DATABASE_URL="your-connection-string"; npm run db:sync');
    }

    console.error();
    console.error('Connection Info:');
    console.error('  DATABASE_URL set:', !!process.env.DATABASE_URL);
    if (process.env.DATABASE_URL) {
      const url = process.env.DATABASE_URL;
      const sanitized = url.replace(/:[^:/@]+@/, ':***@');
      console.error('  URL (sanitized):', sanitized);
    }
    console.error();

    if (process.env.DEBUG) {
      console.error('Stack trace:');
      console.error(error.stack);
    }
    console.error();

    process.exit(1);
  }
}

// Run the sync
syncSchema();
