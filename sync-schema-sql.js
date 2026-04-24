/**
 * Database Schema Sync Script (SQL-based)
 * 
 * Uses raw SQL to create schema, avoiding Sequelize sync issues with fresh databases
 */

import dotenv from 'dotenv';
dotenv.config();

import pg from 'pg';

if (!process.env.NODE_ENV) {
  process.env.NODE_ENV = 'production';
}

async function syncSchema() {
  const client = new pg.Client(process.env.DATABASE_URL);

  try {
    console.log('═══════════════════════════════════════════════════════════');
    console.log('🗄️  Database Schema Sync Tool (SQL Mode)');
    console.log('═══════════════════════════════════════════════════════════');
    console.log();

    console.log('🔄 Step 1: Connecting to database...');
    await client.connect();
    console.log('✅ Connected to PostgreSQL (Neon.tech)');
    console.log();

    console.log('🔄 Step 2: Ensuring public schema exists...');
    await client.query('CREATE SCHEMA IF NOT EXISTS public');
    console.log('✅ Public schema ready');
    console.log();

    console.log('🔄 Step 3: Dropping existing tables (if any)...');
    await client.query(`
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
    console.log('✅ Cleaned up existing tables');
    console.log();

    console.log('🔄 Step 4: Creating tables...');

    // Create users table
    await client.query(`
      CREATE TABLE IF NOT EXISTS "user" (
        id SERIAL PRIMARY KEY,
        name VARCHAR(255) NOT NULL,
        email VARCHAR(255) NOT NULL UNIQUE,
        password VARCHAR(255),
        role VARCHAR(20) DEFAULT 'student' CHECK (role IN ('student', 'company', 'coordinator', 'admin')),
        status VARCHAR(20) DEFAULT 'pending' CHECK (status IN ('active', 'pending', 'suspended', 'inactive')),
        email_verified_at TIMESTAMP,
        last_login_at TIMESTAMP,
        remember_token VARCHAR(100),
        phone_number VARCHAR(20),
        profile_picture_url VARCHAR(500),
        google_id VARCHAR(255),
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `);
    console.log('   ✓ users table');

    // Create students table
    await client.query(`
      CREATE TABLE IF NOT EXISTS student (
        id SERIAL PRIMARY KEY,
        user_id INTEGER NOT NULL UNIQUE REFERENCES "user"(id) ON DELETE CASCADE,
        student_id_number VARCHAR(50) UNIQUE,
        first_name VARCHAR(255),
        last_name VARCHAR(255),
        contact_number VARCHAR(20),
        address TEXT,
        city VARCHAR(100),
        university VARCHAR(255),
        degree_program VARCHAR(255),
        year_level INTEGER,
        bio TEXT,
        portfolio_url VARCHAR(500),
        resume_url VARCHAR(500),
        gpa DECIMAL(3,2),
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `);
    console.log('   ✓ students table');

    // Create companies table
    await client.query(`
      CREATE TABLE IF NOT EXISTS company (
        id SERIAL PRIMARY KEY,
        user_id INTEGER NOT NULL UNIQUE REFERENCES "user"(id) ON DELETE CASCADE,
        company_name VARCHAR(255) NOT NULL,
        industry VARCHAR(100),
        website VARCHAR(500),
        contact_person VARCHAR(255),
        contact_email VARCHAR(255),
        contact_phone VARCHAR(20),
        address TEXT,
        city VARCHAR(100),
        country VARCHAR(100),
        company_size VARCHAR(50),
        description TEXT,
        logo_url VARCHAR(500),
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `);
    console.log('   ✓ companies table');

    // Create coordinators table
    await client.query(`
      CREATE TABLE IF NOT EXISTS coordinator (
        id SERIAL PRIMARY KEY,
        user_id INTEGER NOT NULL UNIQUE REFERENCES "user"(id) ON DELETE CASCADE,
        first_name VARCHAR(255),
        last_name VARCHAR(255),
        contact_number VARCHAR(20),
        department VARCHAR(255),
        university VARCHAR(255),
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `);
    console.log('   ✓ coordinators table');

    // Create skills table
    await client.query(`
      CREATE TABLE IF NOT EXISTS skill (
        id SERIAL PRIMARY KEY,
        skill_name VARCHAR(100) NOT NULL UNIQUE,
        category VARCHAR(100),
        description TEXT,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `);
    console.log('   ✓ skills table');

    // Create student_skills junction
    await client.query(`
      CREATE TABLE IF NOT EXISTS student_skill (
        id SERIAL PRIMARY KEY,
        student_id INTEGER NOT NULL REFERENCES student(id) ON DELETE CASCADE,
        skill_id INTEGER NOT NULL REFERENCES skill(id) ON DELETE CASCADE,
        proficiency_level VARCHAR(50),
        years_of_experience DECIMAL(3,1),
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        UNIQUE(student_id, skill_id)
      )
    `);
    console.log('   ✓ student_skills table');

    // Create ojt_postings table
    await client.query(`
      CREATE TABLE IF NOT EXISTS ojt_posting (
        id SERIAL PRIMARY KEY,
        company_id INTEGER NOT NULL REFERENCES company(id) ON DELETE CASCADE,
        position_title VARCHAR(255) NOT NULL,
        description TEXT,
        requirements TEXT,
        benefits TEXT,
        salary_range VARCHAR(100),
        duration_months INTEGER,
        start_date DATE,
        end_date DATE,
        location VARCHAR(255),
        status VARCHAR(50) DEFAULT 'active' CHECK (status IN ('active', 'closed', 'filled')),
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `);
    console.log('   ✓ ojt_postings table');

    // Create posting_skills junction
    await client.query(`
      CREATE TABLE IF NOT EXISTS application_skill (
        id SERIAL PRIMARY KEY,
        posting_id INTEGER NOT NULL REFERENCES ojt_posting(id) ON DELETE CASCADE,
        skill_id INTEGER NOT NULL REFERENCES skill(id) ON DELETE CASCADE,
        required BOOLEAN DEFAULT TRUE,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        UNIQUE(posting_id, skill_id)
      )
    `);
    console.log('   ✓ application_skills table');

    // Create resumes table
    await client.query(`
      CREATE TABLE IF NOT EXISTS resume (
        id SERIAL PRIMARY KEY,
        student_id INTEGER NOT NULL REFERENCES student(id) ON DELETE CASCADE,
        file_name VARCHAR(255),
        file_url VARCHAR(500),
        is_primary BOOLEAN DEFAULT FALSE,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `);
    console.log('   ✓ resumes table');

    // Create applications table
    await client.query(`
      CREATE TABLE IF NOT EXISTS application (
        id SERIAL PRIMARY KEY,
        student_id INTEGER NOT NULL REFERENCES student(id) ON DELETE CASCADE,
        posting_id INTEGER NOT NULL REFERENCES ojt_posting(id) ON DELETE CASCADE,
        resume_id INTEGER REFERENCES resume(id) ON DELETE SET NULL,
        status VARCHAR(50) DEFAULT 'pending' CHECK (status IN ('pending', 'accepted', 'rejected', 'withdrawn')),
        cover_letter TEXT,
        applied_date TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        response_date TIMESTAMP,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        UNIQUE(student_id, posting_id)
      )
    `);
    console.log('   ✓ applications table');

    // Create matching_rules table
    await client.query(`
      CREATE TABLE IF NOT EXISTS matching_rule (
        id SERIAL PRIMARY KEY,
        rule_name VARCHAR(255) NOT NULL,
        rule_type VARCHAR(50),
        weight DECIMAL(5,2) DEFAULT 1.0,
        is_active BOOLEAN DEFAULT TRUE,
        description TEXT,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `);
    console.log('   ✓ matching_rules table');

    // Create match_scores table
    await client.query(`
      CREATE TABLE IF NOT EXISTS match_score (
        id SERIAL PRIMARY KEY,
        student_id INTEGER NOT NULL REFERENCES student(id) ON DELETE CASCADE,
        posting_id INTEGER NOT NULL REFERENCES ojt_posting(id) ON DELETE CASCADE,
        total_score DECIMAL(5,2),
        skill_match DECIMAL(5,2),
        experience_match DECIMAL(5,2),
        gpa_match DECIMAL(5,2),
        calculated_at TIMESTAMP,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        UNIQUE(student_id, posting_id)
      )
    `);
    console.log('   ✓ match_scores table');

    // Create ojt_progress table
    await client.query(`
      CREATE TABLE IF NOT EXISTS otj_progress (
        id SERIAL PRIMARY KEY,
        student_id INTEGER NOT NULL REFERENCES student(id) ON DELETE CASCADE,
        posting_id INTEGER NOT NULL REFERENCES ojt_posting(id) ON DELETE CASCADE,
        coordinator_id INTEGER REFERENCES coordinator(id) ON DELETE SET NULL,
        status VARCHAR(50) DEFAULT 'ongoing' CHECK (status IN ('pending', 'ongoing', 'completed', 'paused', 'cancelled')),
        start_date DATE,
        end_date DATE,
        hours_completed INTEGER DEFAULT 0,
        evaluation_score DECIMAL(5,2),
        supervisor_comment TEXT,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `);
    console.log('   ✓ otj_progress table');

    // Create audit_logs table
    await client.query(`
      CREATE TABLE IF NOT EXISTS audit_log (
        id SERIAL PRIMARY KEY,
        user_id INTEGER REFERENCES "user"(id) ON DELETE SET NULL,
        action VARCHAR(100),
        table_name VARCHAR(50),
        record_id INTEGER,
        changes JSONB,
        ip_address VARCHAR(45),
        user_agent TEXT,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `);
    console.log('   ✓ audit_logs table');

    // Create notifications table
    await client.query(`
      CREATE TABLE IF NOT EXISTS notification (
        id SERIAL PRIMARY KEY,
        user_id INTEGER NOT NULL REFERENCES "user"(id) ON DELETE CASCADE,
        title VARCHAR(255),
        message TEXT,
        type VARCHAR(50),
        read_at TIMESTAMP,
        action_url VARCHAR(500),
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `);
    console.log('   ✓ notifications table');

    // Create messages table
    await client.query(`
      CREATE TABLE IF NOT EXISTS message (
        id SERIAL PRIMARY KEY,
        sender_id INTEGER NOT NULL REFERENCES "user"(id) ON DELETE CASCADE,
        recipient_id INTEGER NOT NULL REFERENCES "user"(id) ON DELETE CASCADE,
        subject VARCHAR(255),
        body TEXT,
        read_at TIMESTAMP,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `);
    console.log('   ✓ messages table');

    // Create password_reset_tokens table
    await client.query(`
      CREATE TABLE IF NOT EXISTS password_reset_token (
        id SERIAL PRIMARY KEY,
        "userId" INTEGER NOT NULL REFERENCES "user"(id) ON DELETE CASCADE,
        token VARCHAR(255) NOT NULL UNIQUE,
        expires_at TIMESTAMP NOT NULL,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `);
    console.log('   ✓ password_reset_tokens table');

    console.log();
    console.log('🔄 Step 5: Creating indexes...');
    
    // Create indexes for frequently queried columns
    await client.query('CREATE INDEX idx_user_email ON "user"(email)');
    await client.query('CREATE INDEX idx_student_user_id ON student(user_id)');
    await client.query('CREATE INDEX idx_company_user_id ON company(user_id)');
    await client.query('CREATE INDEX idx_application_student_id ON application(student_id)');
    await client.query('CREATE INDEX idx_application_posting_id ON application(posting_id)');
    await client.query('CREATE INDEX idx_match_score_student_id ON match_score(student_id)');
    await client.query('CREATE INDEX idx_match_score_posting_id ON match_score(posting_id)');
    await client.query('CREATE INDEX idx_ojt_progress_student_id ON otj_progress(student_id)');
    
    console.log('✅ Indexes created');
    console.log();

    console.log('═══════════════════════════════════════════════════════════');
    console.log('✅ Schema sync completed successfully!');
    console.log('═══════════════════════════════════════════════════════════');
    console.log();

    await client.end();
    process.exit(0);

  } catch (error) {
    console.error();
    console.error('═══════════════════════════════════════════════════════════');
    console.error('❌ Schema sync failed!');
    console.error('═══════════════════════════════════════════════════════════');
    console.error();
    console.error('Error Details:');
    console.error('  Message:', error.message || '(no message)');
    console.error('  Code:', error.code || '(no code)');
    console.error();

    if (error.code === 'ECONNREFUSED') {
      console.error('💡 Connection Error:');
      console.error('   1. Check DATABASE_URL is set correctly');
      console.error('   2. Ensure Neon database is accessible');
      console.error('   3. Use Pooler connection, not Direct');
    } else if (error.message?.includes('syntax')) {
      console.error('💡 SQL Syntax Error - Check SQL statements');
    }

    if (process.env.DEBUG) {
      console.error('Stack trace:', error.stack);
    }

    await client.end();
    process.exit(1);
  }
}

syncSchema();
