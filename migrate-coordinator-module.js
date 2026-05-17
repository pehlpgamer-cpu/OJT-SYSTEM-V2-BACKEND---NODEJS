/**
 * Non-destructive coordinator module migration.
 *
 * Adds OJT program tables and company accreditation decision columns.
 * Safe to run multiple times. Does not drop or overwrite existing data.
 */

import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';
import pg from 'pg';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

dotenv.config({ path: path.join(__dirname, '.env.local') });
dotenv.config({ path: path.join(__dirname, '.env') });

if (!process.env.DATABASE_URL) {
  throw new Error('DATABASE_URL is required. Set it in .env.local or .env before running db:migrate:coordinator.');
}

const client = new pg.Client(process.env.DATABASE_URL);

async function ensureEnum(typeName, values) {
  const quotedValues = values.map(value => `'${value}'`).join(', ');
  await client.query(`
    DO $$
    BEGIN
      IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = '${typeName}') THEN
        CREATE TYPE ${typeName} AS ENUM (${quotedValues});
      END IF;
    END $$;
  `);
}

async function migrate() {
  try {
    console.log('Coordinator module migration starting...');
    await client.connect();

    await ensureEnum('enum_ojt_programs_status', ['draft', 'active', 'completed', 'archived']);
    await ensureEnum('enum_program_students_status', ['active', 'suspended', 'completed', 'removed']);
    await ensureEnum('enum_program_students_eligibility_status', ['eligible', 'ineligible', 'override']);
    await ensureEnum('enum_program_companies_status', ['pending', 'approved', 'rejected', 'suspended']);

    await client.query(`
      ALTER TABLE companies
        ADD COLUMN IF NOT EXISTS accreditation_decision_note TEXT,
        ADD COLUMN IF NOT EXISTS accreditation_rejection_reason TEXT,
        ADD COLUMN IF NOT EXISTS accreditation_verified_by INTEGER REFERENCES users(id)
    `);

    await client.query(`
      CREATE TABLE IF NOT EXISTS ojt_programs (
        id SERIAL PRIMARY KEY,
        coordinator_id INTEGER NOT NULL REFERENCES coordinators(id) ON DELETE CASCADE,
        name VARCHAR(255) NOT NULL,
        description TEXT,
        start_date DATE NOT NULL,
        end_date DATE NOT NULL,
        minimum_gpa DECIMAL(3,2),
        academic_programs JSONB NOT NULL DEFAULT '[]'::jsonb,
        enrollment_enabled BOOLEAN NOT NULL DEFAULT TRUE,
        status enum_ojt_programs_status NOT NULL DEFAULT 'draft',
        created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
        updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
        deleted_at TIMESTAMP WITH TIME ZONE
      )
    `);

    await client.query(`
      CREATE TABLE IF NOT EXISTS program_students (
        id SERIAL PRIMARY KEY,
        program_id INTEGER NOT NULL REFERENCES ojt_programs(id) ON DELETE CASCADE,
        student_id INTEGER NOT NULL REFERENCES students(id) ON DELETE CASCADE,
        status enum_program_students_status NOT NULL DEFAULT 'active',
        eligibility_status enum_program_students_eligibility_status NOT NULL DEFAULT 'eligible',
        notes TEXT,
        suspension_reason TEXT,
        override_reason TEXT,
        status_updated_at TIMESTAMP WITH TIME ZONE,
        status_updated_by INTEGER REFERENCES users(id),
        created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
        updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
        deleted_at TIMESTAMP WITH TIME ZONE,
        CONSTRAINT program_students_program_student_unique UNIQUE (program_id, student_id)
      )
    `);

    await client.query(`
      CREATE TABLE IF NOT EXISTS program_companies (
        id SERIAL PRIMARY KEY,
        program_id INTEGER NOT NULL REFERENCES ojt_programs(id) ON DELETE CASCADE,
        company_id INTEGER NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
        status enum_program_companies_status NOT NULL DEFAULT 'pending',
        decision_note TEXT,
        rejection_reason TEXT,
        decided_by INTEGER REFERENCES users(id),
        decided_at TIMESTAMP WITH TIME ZONE,
        created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
        updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
        deleted_at TIMESTAMP WITH TIME ZONE,
        CONSTRAINT program_companies_program_company_unique UNIQUE (program_id, company_id)
      )
    `);

    await client.query(`
      CREATE TABLE IF NOT EXISTS program_postings (
        id SERIAL PRIMARY KEY,
        program_id INTEGER NOT NULL REFERENCES ojt_programs(id) ON DELETE CASCADE,
        posting_id INTEGER NOT NULL REFERENCES ojt_postings(id) ON DELETE CASCADE,
        created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
        updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
        deleted_at TIMESTAMP WITH TIME ZONE,
        CONSTRAINT program_postings_program_posting_unique UNIQUE (program_id, posting_id)
      )
    `);

    const indexes = [
      'CREATE INDEX IF NOT EXISTS idx_ojt_programs_coordinator_id ON ojt_programs(coordinator_id)',
      'CREATE INDEX IF NOT EXISTS idx_ojt_programs_status ON ojt_programs(status)',
      'CREATE INDEX IF NOT EXISTS idx_program_students_program_id ON program_students(program_id)',
      'CREATE INDEX IF NOT EXISTS idx_program_students_student_id ON program_students(student_id)',
      'CREATE INDEX IF NOT EXISTS idx_program_students_status ON program_students(status)',
      'CREATE INDEX IF NOT EXISTS idx_program_companies_program_id ON program_companies(program_id)',
      'CREATE INDEX IF NOT EXISTS idx_program_companies_company_id ON program_companies(company_id)',
      'CREATE INDEX IF NOT EXISTS idx_program_companies_status ON program_companies(status)',
      'CREATE INDEX IF NOT EXISTS idx_program_postings_program_id ON program_postings(program_id)',
      'CREATE INDEX IF NOT EXISTS idx_program_postings_posting_id ON program_postings(posting_id)',
      'CREATE INDEX IF NOT EXISTS idx_companies_accreditation_verified_by ON companies(accreditation_verified_by)',
    ];

    for (const statement of indexes) {
      await client.query(statement);
    }

    console.log('Coordinator module migration complete.');
  } catch (error) {
    console.error('Coordinator module migration failed:', error.message);
    throw error;
  } finally {
    await client.end();
  }
}

migrate();
