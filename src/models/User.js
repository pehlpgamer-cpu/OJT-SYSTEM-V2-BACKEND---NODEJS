/**
 * User Model
 * 
 * WHY: Central authentication and user management table. All users
 * (students, companies, coordinators, admins) share this base table.
 * Different roles are handled through this role field and separate
 * profile tables for each role.
 * 
 * WHAT: Stores authentication credentials, role, and account status.
 */

import { DataTypes } from 'sequelize';
import bcrypt from 'bcrypt';
import { config } from '../config/env.js';

export const defineUser = (sequelize) => {
  const User = sequelize.define(
    'User',
    {
      // PRIMARY KEY - Auto-generated unique identifier
      id: {
        type: DataTypes.INTEGER,
        primaryKey: true,
        autoIncrement: true,
        comment: 'Unique user identifier',
      },

      // Basic Information
      name: {
        type: DataTypes.STRING(255),
        allowNull: false,
        validate: {
          len: [2, 255],
        },
        comment: 'Full name of the user',
      },

      email: {
        type: DataTypes.STRING(255),
        allowNull: false,
        unique: true,
        validate: {
          isEmail: true,
        },
        comment: 'Email address - must be unique for login',
      },

      // Authentication
      password: {
        type: DataTypes.STRING(255),
        allowNull: false,
        comment: 'Bcrypt hashed password - never store plaintext',
      },

      // Role Assignment
      // WHY enum: Restricts values to predefined set, prevents invalid roles
      role: {
        type: DataTypes.ENUM('student', 'company', 'coordinator', 'admin'),
        allowNull: false,
        defaultValue: 'student',
        validate: {
          isIn: [['student', 'company', 'coordinator', 'admin']],
        },
        comment: 'User role determining access level and permissions',
      },

      // Account Status
      // WHY: Soft disable accounts without deleting them (compliance, audit trails)
      status: {
        type: DataTypes.ENUM('active', 'pending', 'suspended', 'inactive'),
        allowNull: false,
        defaultValue: 'pending',
        validate: {
          isIn: [['active', 'pending', 'suspended', 'inactive']],
        },
        comment: 'Account status - active/pending/suspended/inactive',
      },

      // Email Verification
      email_verified_at: {
        type: DataTypes.DATE,
        allowNull: true,
        comment: 'Timestamp of email verification - null if not verified',
      },

      // Session Management
      last_login_at: {
        type: DataTypes.DATE,
        allowNull: true,
        comment: 'Track last successful login for security monitoring',
      },

      // Remember Token (optional for "remember me" functionality)
      remember_token: {
        type: DataTypes.STRING(100),
        allowNull: true,
        comment: 'Token for persistent sessions',
      },
    },
    {
      // WHY indexes: Improve query performance, especially for login (email lookup)
      indexes: [
        {
          fields: ['email'], // Email lookup during login happens frequently
          unique: true,
        },
        {
          fields: ['role'], // Filter by role for RBAC
        },
        {
          fields: ['status'], // Find active users quickly
        },
      ],

      // Hook: Hash password before saving
      hooks: {
        /**
         * WHY: Auto-hash passwords prevents storing plaintext
         * WHEN: Called before CREATE or UPDATE
         */
        beforeCreate: async (user) => {
          if (user.password) {
            user.password = await bcrypt.hash(user.password, config.auth.bcryptRounds);
          }
        },

        // Only hash if password was actually changed (not other fields)
        beforeUpdate: async (user) => {
          if (user.changed('password')) {
            user.password = await bcrypt.hash(user.password, config.auth.bcryptRounds);
          }
        },
      },
    }
  );

  /**
   * Instance method: Compare plaintext password with hashed password
   * 
   * WHY: During login, we need to verify the entered password matches
   * the stored hashed password without storing plaintext.
   * 
   * @param {string} plainPassword - The password to check
   * @returns {Promise<boolean>} - True if passwords match
   */
  User.prototype.comparePassword = async function(plainPassword) {
    return await bcrypt.compare(plainPassword, this.password);
  };

  /**
   * Instance method: Generate API token for authentication
   * 
   * WHY: Creates a JWT token that the user includes in subsequent requests
   * to authenticate without resending password.
   * 
   * @returns {string} JWT token
   */
  User.prototype.generateToken = function() {
    const jwt = require('jsonwebtoken');
    return jwt.sign(
      {
        id: this.id,
        email: this.email,
        role: this.role,
      },
      config.auth.secret,
      { expiresIn: config.auth.expiresIn }
    );
  };

  /**
   * Instance method: Get user profile based on role
   * 
   * WHY: Each role has different profile data. This method
   * fetches the appropriate profile table.
   * 
   * @returns {Promise<Object>} Profile data for the user's role
   */
  User.prototype.getProfile = async function() {
    switch (this.role) {
      case 'student':
        return await sequelize.models.Student.findOne({ where: { user_id: this.id } });
      case 'company':
        return await sequelize.models.Company.findOne({ where: { user_id: this.id } });
      case 'coordinator':
        return await sequelize.models.Coordinator.findOne({ where: { user_id: this.id } });
      default:
        return null;
    }
  };

  /**
   * Class method: Find user by email for login
   * 
   * WHY: Email is the login identifier. This method encapsulates
   * the lookup logic for reusability.
   */
  User.findByEmail = async function(email) {
    return await this.findOne({ where: { email: email.toLowerCase() } });
  };

  return User;
};
