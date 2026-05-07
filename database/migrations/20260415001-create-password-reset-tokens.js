/**
 * Migration: Add PasswordResetToken table
 * 
 * WHY: Store password reset tokens with expiration and usage tracking
 * to prevent token reuse attacks.
 * 
 * Date: April 2026
 */

module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.createTable('password_reset_tokens', {
      id: {
        type: Sequelize.UUID,
        defaultValue: Sequelize.UUIDV4,
        primaryKey: true,
      },
      user_id: {
        type: Sequelize.INTEGER,
        allowNull: false,
        references: {
          model: 'Users',
          key: 'id',
        },
        onDelete: 'CASCADE',
      },
      token: {
        type: Sequelize.STRING(128),
        allowNull: false,
        unique: true,
      },
      used: {
        type: Sequelize.BOOLEAN,
        defaultValue: false,
      },
      used_at: {
        type: Sequelize.DATE,
        allowNull: true,
      },
      expires_at: {
        type: Sequelize.DATE,
        allowNull: false,
      },
      created_at: {
        type: Sequelize.DATE,
        defaultValue: Sequelize.NOW,
      },
      updated_at: {
        type: Sequelize.DATE,
        defaultValue: Sequelize.NOW,
      },
    });

    // Add indexes for performance
    await queryInterface.addIndex('password_reset_tokens', ['user_id']);
    await queryInterface.addIndex('password_reset_tokens', ['token']);
    await queryInterface.addIndex('password_reset_tokens', ['expires_at']);
  },

  async down(queryInterface, Sequelize) {
    await queryInterface.dropTable('password_reset_tokens');
  },
};
