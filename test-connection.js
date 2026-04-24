/**
 * Simple PostgreSQL Connection Test
 * Diagnoses connection issues without Sequelize overhead
 */

import pg from 'pg';

const connectionString = process.env.DATABASE_URL;

if (!connectionString) {
  console.error('❌ DATABASE_URL environment variable not set');
  process.exit(1);
}

console.log('Testing PostgreSQL connection...');
console.log('URL (sanitized):', connectionString.replace(/:[^:/@]+@/, ':***@'));
console.log();

const client = new pg.Client({
  connectionString: connectionString,
  ssl: {
    rejectUnauthorized: false,
  },
  connectionTimeoutMillis: 10000,
  statement_timeout: 10000,
});

client.on('error', (err) => {
  console.error('❌ Connection error:', err.message);
  console.error('Code:', err.code);
  if (err.code === 'ECONNREFUSED') {
    console.error('\n💡 The connection was refused. Possible causes:');
    console.error('   1. Neon database might be suspended (auto-paused after 5 min)');
    console.error('   2. Network connectivity issue');
    console.error('   3. Connection string is incorrect');
    console.error('   4. Firewall blocking the connection');
  } else if (err.code === 'ENOTFOUND') {
    console.error('\n💡 Hostname not found. Check your connection string.');
  }
  process.exit(1);
});

try {
  console.log('Connecting...');
  await client.connect();
  
  console.log('✅ Connected successfully!');
  
  // Test query
  const result = await client.query('SELECT NOW()');
  console.log('✅ Query executed successfully');
  console.log('   Current timestamp:', result.rows[0].now);
  
  // Get database info
  const dbInfo = await client.query(`
    SELECT datname as database, 
           usename as owner, 
           pg_database.datcreated as created
    FROM pg_database
    WHERE datname = current_database()
  `);
  console.log('✅ Database info:');
  console.log('   Database:', dbInfo.rows[0].database);
  console.log('   Owner:', dbInfo.rows[0].owner);
  
  await client.end();
  console.log('\n✅ Connection test passed!');
  process.exit(0);
  
} catch (err) {
  console.error('❌ Error during connection:', err.message);
  console.error(err);
  process.exit(1);
}
