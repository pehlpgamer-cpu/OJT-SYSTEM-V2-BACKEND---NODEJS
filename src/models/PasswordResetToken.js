/**
 * Password Reset Token Model
 * 
 * WHY: Track password reset tokens separately to prevent token reuse.
 * Each reset attempt gets a unique token record that's marked as used.
 * Provides audit trail for security compliance.
 * 
 * WHAT: Stores reset tokens with expiration and usage tracking.
 */

export default (sequelize, DataTypes) => {
  const PasswordResetToken = sequelize.define(
    'PasswordResetToken',
    {
      id: {
        type: DataTypes.UUID,
        defaultValue: DataTypes.UUIDV4,
        primaryKey: true,
        comment: 'Unique password reset token ID',
      },
      userId: {
        type: DataTypes.UUID,
        allowNull: false,
        references: {
          model: 'users',
          key: 'id',
        },
        onDelete: 'CASCADE',
        comment: 'User ID for which this token was generated',
      },
      token: {
        type: DataTypes.STRING(512),
        allowNull: false,
        unique: true,
        comment: 'The JWT reset token itself (hashed in production)',
      },
      used: {
        type: DataTypes.BOOLEAN,
        defaultValue: false,
        comment: 'Whether this token has already been used',
      },
      usedAt: {
        type: DataTypes.DATE,
        allowNull: true,
        comment: 'Timestamp when token was used to reset password',
      },
      expiresAt: {
        type: DataTypes.DATE,
        allowNull: false,
        comment: 'Token expiration timestamp (typically 1 hour from creation)',
      },
      createdAt: {
        type: DataTypes.DATE,
        defaultValue: DataTypes.NOW,
        comment: 'Token creation timestamp',
      },
      updatedAt: {
        type: DataTypes.DATE,
        defaultValue: DataTypes.NOW,
        comment: 'Last update timestamp',
      },
    },
    {
      tableName: 'password_reset_tokens',
      indexes: [
        {
          fields: ['userId'],
          comment: 'Find tokens by user',
        },
        {
          fields: ['token'],
          unique: true,
          comment: 'Ensure token uniqueness and fast lookup',
        },
        {
          fields: ['expiresAt'],
          comment: 'Periodic cleanup of expired tokens',
        },
        {
          fields: ['used', 'expiresAt'],
          comment: 'Find unused tokens for cleanup',
        },
      ],
      comment: 'Tracks password reset tokens with expiration and usage',
    }
  );

  /**
   * Associate with User model
   * WHY: Enables loading user data with token
   */
  PasswordResetToken.associate = (models) => {
    PasswordResetToken.belongsTo(models.User, {
      foreignKey: 'userId',
      as: 'user',
    });
  };

  /**
   * Check if token is still valid
   * 
   * WHY: Centralizes token validation logic
   */
  PasswordResetToken.prototype.isValid = function () {
    return !this.used && new Date() < this.expiresAt;
  };

  /**
   * Mark token as used
   * 
   * WHY: Prevent token reuse attacks
   */
  PasswordResetToken.prototype.markAsUsed = async function () {
    this.used = true;
    this.usedAt = new Date();
    await this.save();
  };

  return PasswordResetToken;
};
