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
          idle: 3000,
          acquire: 30000,
          evict: 10000,
        },
        dialectOptions: {
          ssl: {
            require: true,
            rejectUnauthorized: false,
          },
          keepalives: 1,
          keepalivesIdle: 5,
          connectionTimeoutMillis: 15000,
          statement_timeout: 15000,
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
    } else if (dialect === 'sqlite') {
      console.log('   💾 SQLite');
    }
    console.log();

    // Sync schema
    console.log('🔄 Step 4: Syncing schema...');
    console.log('   (This will create tables but NOT drop existing ones)');
    await sequelize.sync({ 
      alter: false,  // Don't modify existing columns
      force: false   // Don't drop existing tables
    });
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
