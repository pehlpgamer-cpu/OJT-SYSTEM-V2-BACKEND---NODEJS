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
        type: DataTypes.INTEGER,
        field: 'user_id',
        allowNull: false,
        references: {
          model: 'Users',
          key: 'id',
        },
        onDelete: 'CASCADE',
        comment: 'User ID for which this token was generated',
      },
      token: {
        type: DataTypes.STRING(128),
        allowNull: false,
        unique: true,
        comment: 'SHA-256 hash of the reset token',
      },
      used: {
        type: DataTypes.BOOLEAN,
        defaultValue: false,
        comment: 'Whether this token has already been used',
      },
      usedAt: {
        type: DataTypes.DATE,
        field: 'used_at',
        allowNull: true,
        comment: 'Timestamp when token was used to reset password',
      },
      expiresAt: {
        type: DataTypes.DATE,
        field: 'expires_at',
        allowNull: false,
        comment: 'Token expiration timestamp (typically 1 hour from creation)',
      },
      createdAt: {
        type: DataTypes.DATE,
        field: 'created_at',
        defaultValue: DataTypes.NOW,
        comment: 'Token creation timestamp',
      },
      updatedAt: {
        type: DataTypes.DATE,
        field: 'updated_at',
        defaultValue: DataTypes.NOW,
        comment: 'Last update timestamp',
      },
    },
    {
      tableName: 'password_reset_tokens',
      indexes: [
        {
          fields: ['user_id'],
          comment: 'Find tokens by user',
        },
        {
          fields: ['token'],
          unique: true,
          comment: 'Ensure token uniqueness and fast lookup',
        },
        {
          fields: ['expires_at'],
          comment: 'Periodic cleanup of expired tokens',
        },
        {
          fields: ['used', 'expires_at'],
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
      foreignKey: { name: 'userId', field: 'user_id' },
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
