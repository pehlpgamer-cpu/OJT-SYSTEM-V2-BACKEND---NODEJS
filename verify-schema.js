/**
 * Verify Neon database schema was created successfully
 */

import dotenv from 'dotenv';
dotenv.config();

import pg from 'pg';

async function verifySchema() {
  const client = new pg.Client(process.env.DATABASE_URL);

  try {
    console.log('🔍 Verifying database schema...\n');
    
    await client.connect();

    // Get list of tables
    const result = await client.query(`
      SELECT table_name 
      FROM information_schema.tables 
      WHERE table_schema = 'public' 
      AND table_type = 'BASE TABLE'
      ORDER BY table_name
    `);

    console.log('✅ Tables in Neon database:\n');
    result.rows.forEach((row, i) => {
      console.log(`   ${i + 1}. ${row.table_name}`);
    });

    console.log(`\nTotal: ${result.rows.length} tables\n`);

    // Verify key tables exist
    const requiredTables = [
      'user', 'student', 'company', 'coordinator',
      'ojt_posting', 'application', 'skill', 'match_score'
    ];

    const tableNames = result.rows.map(r => r.table_name);
    const allExist = requiredTables.every(t => tableNames.includes(t));

    if (allExist) {
      console.log('✅ All required tables exist!');
      console.log('\n🎉 Database schema successfully deployed to Neon!\n');
    } else {
      const missing = requiredTables.filter(t => !tableNames.includes(t));
      console.log('❌ Missing tables:', missing.join(', '));
    }

    await client.end();

  } catch (error) {
    console.error('Error:', error.message);
    await client.end();
    process.exit(1);
  }
}

verifySchema();
