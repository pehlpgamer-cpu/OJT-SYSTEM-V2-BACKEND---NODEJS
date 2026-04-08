/**
 * AuditLog Model
 * 
 * WHY: Compliance and security. Log all sensitive operations
 * (create, update, delete) for audit trails. Essential for
 * detecting unauthorized access and troubleshooting.
 * 
 * WHAT: Records of all sensitive database changes.
 */

import { DataTypes } from 'sequelize';

export const defineAuditLog = (sequelize) => {
  const AuditLog = sequelize.define(
    'AuditLog',
    {
      id: {
        type: DataTypes.INTEGER,
        primaryKey: true,
        autoIncrement: true,
      },

      // Who made the change
      user_id: {
        type: DataTypes.INTEGER,
        allowNull: true,
        references: {
          model: 'Users',
          key: 'id',
        },
        comment: 'User who made the change (null for system actions)',
      },

      user_role: {
        type: DataTypes.STRING(50),
        allowNull: true,
        comment: 'Role of user at time of action',
      },

      // What changed
      entity_type: {
        type: DataTypes.STRING(100),
        allowNull: false,
        comment: 'Table/model affected (e.g., "User", "Application")',
      },

      entity_id: {
        type: DataTypes.INTEGER,
        allowNull: false,
        comment: 'ID of record that changed',
      },

      action: {
        type: DataTypes.ENUM('create', 'update', 'delete', 'login', 'logout', 'view'),
        allowNull: false,
        comment: 'Type of action performed',
      },

      // Before and After Data
      old_values: {
        type: DataTypes.JSON,
        allowNull: true,
        comment: 'Previous values (useful for update audit)',
      },

      new_values: {
        type: DataTypes.JSON,
        allowNull: true,
        comment: 'New values after change',
      },

      // Context Information
      ip_address: {
        type: DataTypes.STRING(50),
        allowNull: true,
        comment: 'IP address of requester',
      },

      user_agent: {
        type: DataTypes.TEXT,
        allowNull: true,
        comment: 'Browser/client user-agent string',
      },

      reason: {
        type: DataTypes.TEXT,
        allowNull: true,
        comment: 'Why this action was taken',
      },

      // Severity
      severity: {
        type: DataTypes.ENUM('low', 'medium', 'high', 'critical'),
        allowNull: false,
        defaultValue: 'medium',
        comment: 'How important is this action?',
      },

      status: {
        type: DataTypes.ENUM('success', 'failed', 'pending'),
        allowNull: false,
        defaultValue: 'success',
        comment: 'Did the action succeed?',
      },

      error_message: {
        type: DataTypes.TEXT,
        allowNull: true,
        comment: 'Error details if action failed',
      },
    },
    {
      indexes: [
        {
          fields: ['user_id'],
        },
        {
          fields: ['entity_type'],
        },
        {
          fields: ['entity_id'],
        },
        {
          fields: ['action'],
        },
        {
          fields: ['severity'],
        },
        // Note: createdAt index removed - Sequelize handles timestamps differently in SQLite
        {
          fields: ['user_id', 'action', 'entity_type'],
        },
      ],
    }
  );

  return AuditLog;
};

/**
 * Notification Model
 * 
 * WHY: In-app messaging system for important events.
 * Students/Companies get notified about applications, matches, etc.
 * 
 * WHAT: In-app notifications (not emails, not SMSs - just DB records).
 */
export const defineNotification = (sequelize) => {
  const Notification = sequelize.define(
    'Notification',
    {
      id: {
        type: DataTypes.INTEGER,
        primaryKey: true,
        autoIncrement: true,
      },

      // Recipient
      user_id: {
        type: DataTypes.INTEGER,
        allowNull: false,
        references: {
          model: 'Users',
          key: 'id',
        },
        onDelete: 'CASCADE',
        comment: 'User who receives notification',
      },

      // Notification Content
      title: {
        type: DataTypes.STRING(200),
        allowNull: false,
        comment: 'Notification title/heading',
      },

      message: {
        type: DataTypes.TEXT,
        allowNull: false,
        comment: 'Full notification message',
      },

      // Classification
      notification_type: {
        type: DataTypes.ENUM(
          'application_submitted',
          'application_reviewed',
          'application_accepted',
          'application_rejected',
          'new_match',
          'profile_viewed',
          'message_received',
          'account_update',
          'system_alert',
          'reminder'
        ),
        allowNull: false,
        comment: 'Type of notification for categorization',
      },

      // Link to Related Entity
      related_entity_type: {
        type: DataTypes.STRING(100),
        allowNull: true,
        comment: 'What entity is this notification about? (Application, User, etc)',
      },

      related_entity_id: {
        type: DataTypes.INTEGER,
        allowNull: true,
        comment: 'ID of that entity',
      },

      // Status
      is_read: {
        type: DataTypes.BOOLEAN,
        allowNull: false,
        defaultValue: false,
        comment: 'Has user read this notification?',
      },

      read_at: {
        type: DataTypes.DATE,
        allowNull: true,
        comment: 'When user read this',
      },

      // Priority
      priority: {
        type: DataTypes.ENUM('low', 'normal', 'high', 'urgent'),
        allowNull: false,
        defaultValue: 'normal',
        comment: 'How important is this notification?',
      },

      // Persistence
      expires_at: {
        type: DataTypes.DATE,
        allowNull: true,
        comment: 'When to delete this notification (for cleanup)',
      },

      action_url: {
        type: DataTypes.STRING(500),
        allowNull: true,
        comment: 'URL to click on notification',
      },
    },
    {
      indexes: [
        {
          fields: ['user_id'],
        },
        {
          fields: ['is_read'],
        },
        {
          fields: ['notification_type'],
        },
        {
          fields: ['priority'],
        },
        // Note: createdAt index removed - Sequelize handles timestamps automatically
        {
          fields: ['user_id', 'is_read'], // Get unread notifications for user
        },
      ],
    }
  );

  /**
   * Instance method: Mark as read
   */
  Notification.prototype.markAsRead = async function() {
    this.is_read = true;
    this.read_at = new Date();
    return await this.save();
  };

  /**
   * Class method: Create and send notification
   * 
   * WHY: Encapsulate notification creation logic
   */
  Notification.createAndNotify = async function(userId, data) {
    return await this.create({
      user_id: userId,
      title: data.title,
      message: data.message,
      notification_type: data.type,
      related_entity_type: data.entityType,
      related_entity_id: data.entityId,
      priority: data.priority || 'normal',
      action_url: data.actionUrl,
    });
  };

  return Notification;
};

/**
 * Message Model
 * 
 * WHY: Direct messaging between users (students, companies, coordinators).
 *
 * WHAT: Conversation/message records for in-app chat.
 */
export const defineMessage = (sequelize) => {
  const Message = sequelize.define(
    'Message',
    {
      id: {
        type: DataTypes.INTEGER,
        primaryKey: true,
        autoIncrement: true,
      },

      // Participants
      sender_id: {
        type: DataTypes.INTEGER,
        allowNull: false,
        references: {
          model: 'Users',
          key: 'id',
        },
        onDelete: 'CASCADE',
        comment: 'User sending message',
      },

      recipient_id: {
        type: DataTypes.INTEGER,
        allowNull: false,
        references: {
          model: 'Users',
          key: 'id',
        },
        onDelete: 'CASCADE',
        comment: 'User receiving message',
      },

      // Context (optional)
      related_entity_type: {
        type: DataTypes.STRING(100),
        allowNull: true,
        comment: 'What is this about? (Application, Posting, etc)',
      },

      related_entity_id: {
        type: DataTypes.INTEGER,
        allowNull: true,
        comment: 'ID of related entity',
      },

      // Message Content
      subject: {
        type: DataTypes.STRING(255),
        allowNull: true,
        comment: 'Message subject (for threads)',
      },

      body: {
        type: DataTypes.TEXT,
        allowNull: false,
        comment: 'Message content',
      },

      // Status
      is_read: {
        type: DataTypes.BOOLEAN,
        allowNull: false,
        defaultValue: false,
      },

      read_at: {
        type: DataTypes.DATE,
        allowNull: true,
      },
    },
    {
      indexes: [
        {
          fields: ['sender_id'],
        },
        {
          fields: ['recipient_id'],
        },
        {
          fields: ['is_read'],
        },
        // Note: createdAt index removed - Sequelize handles timestamps automatically
        {
          fields: ['sender_id', 'recipient_id'], // Get conversation thread
        },
      ],
    }
  );

  /**
   * Instance method: Mark as read
   */
  Message.prototype.markAsRead = async function() {
    this.is_read = true;
    this.read_at = new Date();
    return await this.save();
  };

  return Message;
};
