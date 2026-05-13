/**
 * Database Seeder - Create default admin & coordinator accounts
 * 
 * WHY: Automates creation of initial system accounts needed for operation.
 * Creates idempotently - safe to run multiple times without duplicates.
 * 
 * WHAT: Seeds admin and coordinator accounts with secure default passwords.
 * 
 * HOW TO RUN:
 * - Locally: npm run seed
 * - With Neon: DATABASE_URL=postgresql://... npm run seed
 * - On Vercel: Add DATABASE_URL env var and run via terminal
 * 
 * Date: May 2026
 */

// MUST LOAD DOTENV FIRST before importing any modules that read env vars
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const rootDir = path.resolve(__dirname, '../../..');

// Load environment variables from .env.local first, then .env as fallback
dotenv.config({ path: path.join(rootDir, '.env.local') });
dotenv.config({ path: path.join(rootDir, '.env') });

// Use top-level await with dynamic imports AFTER dotenv is loaded
const { default: sequelize } = await import('../../config/database.js');
const { initializeModels } = await import('../../models/index.js');

/**
 * Main seed function
 */
async function seed() {
  let connectionEstablished = false;
  
  try {
    console.log('🌱 Starting database seeding...\n');
    
    // Step 1: Initialize models
    console.log('📝 Initializing models...');
    const models = initializeModels(sequelize);
    console.log('✅ Models initialized\n');

    // Step 2: Connect to database
    console.log('🔌 Connecting to database...');
    await sequelize.authenticate();
    connectionEstablished = true;
    console.log('✅ Database connection authenticated\n');

    // Step 3: Sync models (creates tables if they don't exist)
    console.log('🗂️  Synchronizing models...');
    await sequelize.sync({ alter: false });
    console.log('✅ Models synchronized\n');

    // Step 4: Create Admin Account
    console.log('👨‍💼 Creating admin account...');
    const adminEmail = 'admin@ojtsystem.com';
    const adminPassword = 'Admin@123456';  // ⚠️ Change this password in production!
    
    let admin = await models.User.findByEmail(adminEmail);
    
    if (admin) {
      console.log(`⏭️  Admin account already exists (ID: ${admin.id})\n`);
    } else {
      admin = await models.User.create({
        name: 'System Administrator',
        email: adminEmail,
        password: adminPassword,
        role: 'admin',
        status: 'active',
      });
      
      console.log('✅ Admin account created');
      console.log(`   📧 Email: ${admin.email}`);
      console.log(`   🔑 Password: ${adminPassword}`);
      console.log(`   🆔 ID: ${admin.id}\n`);
    }

    // Step 5: Create Coordinator Account
    console.log('👨‍🏫 Creating coordinator account...');
    const coordinatorEmail = 'coordinator@ojtsystem.com';
    const coordinatorPassword = 'Coordinator@123456';  // ⚠️ Change this password in production!
    
    let coordinator = await models.User.findByEmail(coordinatorEmail);
    
    if (coordinator) {
      console.log(`⏭️  Coordinator account already exists (ID: ${coordinator.id})\n`);
    } else {
      coordinator = await models.User.create({
        name: 'OJT Program Coordinator',
        email: coordinatorEmail,
        password: coordinatorPassword,
        role: 'coordinator',
        status: 'active',
      });
      
      // Create coordinator profile
      await models.Coordinator.create({
        user_id: coordinator.id,
        department: 'Academic Affairs',
        designation: 'OJT Coordinator',
        office_location: 'Admin Building, Room 101',
        phone_extension: '1001',
        students_assigned: 0,
        max_students: 50,
      });
      
      console.log('✅ Coordinator account created');
      console.log(`   📧 Email: ${coordinator.email}`);
      console.log(`   🔑 Password: ${coordinatorPassword}`);
      console.log(`   🆔 ID: ${coordinator.id}\n`);
    }

    // Step 6: Summary
    console.log('═══════════════════════════════════════════════════════');
    console.log('✨ SEEDING COMPLETE!\n');
    console.log('🔐 IMPORTANT SECURITY NOTES:');
    console.log('───────────────────────────────────────────────────────');
    console.log('1. ⚠️  Default passwords are included in this script.');
    console.log('   CHANGE THEM IMMEDIATELY in production!\n');
    console.log('2. 📧 You can now login with:');
    console.log(`   • Admin: ${adminEmail} / ${adminPassword}`);
    console.log(`   • Coordinator: ${coordinatorEmail} / ${coordinatorPassword}\n`);
    console.log('3. 🚀 Next steps:');
    console.log('   • Test login via: POST /api/auth/login');
    console.log('   • Verify JWT tokens are generated');
    console.log('   • Change passwords via admin panel or directly\n');
    console.log('═══════════════════════════════════════════════════════\n');

    process.exit(0);

  } catch (error) {
    console.error('\n❌ SEEDING FAILED!\n');
    console.error('Error Details:', error.message);
    
    if (error.stack) {
      console.error('\nStack Trace:', error.stack);
    }
    
    // Provide helpful troubleshooting
    if (!connectionEstablished) {
      console.error('\n⚠️  Database connection failed. Check:');
      console.error('   • DATABASE_URL environment variable is set');
      console.error('   • Neon credentials are correct');
      console.error('   • Network connectivity to Neon');
    }

    process.exit(1);
  } finally {
    // Close database connection
    if (connectionEstablished) {
      try {
        await sequelize.close();
        console.log('🔌 Database connection closed');
      } catch (closeError) {
        console.error('Error closing database:', closeError.message);
      }
    }
  }
}

// Run seeder
seed();
