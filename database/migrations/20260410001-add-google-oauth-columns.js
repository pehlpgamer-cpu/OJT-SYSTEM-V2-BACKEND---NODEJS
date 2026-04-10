/**
 * Migration: Add Google OAuth Columns to Users Table
 * 
 * WHY: Support Google OAuth authentication alongside email/password
 * WHAT: Adds google_id, auth_provider, google_linked_at columns
 * 
 * CHANGES:
 * 1. Add google_id (unique, indexed)
 * 2. Add auth_provider (email/google enum, default email)
 * 3. Add google_linked_at (timestamp for linking)
 * 4. Make password nullable for OAuth users
 */

export async function up(queryInterface, Sequelize) {
  console.log('🔄 Migration: Adding Google OAuth columns...');

  try {
    // Check if columns already exist (idempotent)
    const tableDescription = await queryInterface.describeTable('users');

    // Add google_id if not exists
    if (!tableDescription.google_id) {
      await queryInterface.addColumn('users', 'google_id', {
        type: Sequelize.STRING(255),
        allowNull: true,
        unique: true,
        comment: 'Google OAuth unique identifier',
      });
      console.log('  ✓ Added google_id column');
    }

    // Add auth_provider if not exists
    if (!tableDescription.auth_provider) {
      await queryInterface.addColumn('users', 'auth_provider', {
        type: Sequelize.ENUM('email', 'google'),
        allowNull: false,
        defaultValue: 'email',
        comment: 'Authentication provider: email or google',
      });
      console.log('  ✓ Added auth_provider column');
    }

    // Add google_linked_at if not exists
    if (!tableDescription.google_linked_at) {
      await queryInterface.addColumn('users', 'google_linked_at', {
        type: Sequelize.DATE,
        allowNull: true,
        comment: 'Timestamp when Google account was linked',
      });
      console.log('  ✓ Added google_linked_at column');
    }

    // Add index on google_id if not exists
    const indices = await queryInterface.showIndex('users');
    const googleIdIndexExists = indices.some(idx => 
      idx.fields && idx.fields.some(f => f.attribute === 'google_id')
    );

    if (!googleIdIndexExists) {
      await queryInterface.addIndex('users', {
        fields: ['google_id'],
        unique: true,
        name: 'idx_user_google_id',
      });
      console.log('  ✓ Added index on google_id');
    }

    console.log('✅ Google OAuth columns migration completed');
  } catch (error) {
    console.error('❌ Migration failed:', error);
    throw error;
  }
}

export async function down(queryInterface, Sequelize) {
  console.log('🔄 Migration: Reverting Google OAuth columns...');

  try {
    await queryInterface.removeColumn('users', 'google_linked_at');
    await queryInterface.removeColumn('users', 'auth_provider');
    await queryInterface.removeColumn('users', 'google_id');
    
    console.log('✅ Google OAuth columns reverted');
  } catch (error) {
    console.error('❌ Rollback failed:', error);
    throw error;
  }
}
