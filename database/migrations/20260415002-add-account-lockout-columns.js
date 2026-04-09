/**
 * Migration: Add account lockout columns to users table
 * 
 * WHY: Track failed login attempts and account lock status
 * to implement account lockout mechanism after N failed attempts.
 * 
 * Date: April 2026
 */

module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.addColumn('users', 'failedLoginAttempts', {
      type: Sequelize.INTEGER,
      defaultValue: 0,
      allowNull: false,
      comment: 'Count of failed login attempts',
    });

    await queryInterface.addColumn('users', 'lockedUntil', {
      type: Sequelize.DATE,
      allowNull: true,
      comment: 'Timestamp when account was locked',
    });
  },

  async down(queryInterface, Sequelize) {
    await queryInterface.removeColumn('users', 'failedLoginAttempts');
    await queryInterface.removeColumn('users', 'lockedUntil');
  },
};
