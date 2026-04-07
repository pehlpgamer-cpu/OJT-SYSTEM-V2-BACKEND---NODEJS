/**
 * Notification Service
 * 
 * WHY: Centralized notification management. Send notifications
 * for important events (applications, matches, approvals, etc).
 * 
 * WHAT: Create, retrieve, and manage user notifications.
 */

import { Logger } from '../utils/errorHandler.js';

export class NotificationService {
  constructor(models) {
    this.models = models;
  }

  /**
   * Create and send notification to user
   * 
   * WHY: Notify users about important events in the system.
   * 
   * @param {number} userId - User to notify
   * @param {Object} data - Notification data
   * @returns {Object} Created notification
   */
  async notify(userId, data) {
    const {
      title,
      message,
      type, // 'application_submitted', 'application_accepted', etc.
      entityType,
      entityId,
      priority = 'normal',
      actionUrl = null,
    } = data;

    try {
      const notification = await this.models.Notification.createAndNotify(userId, {
        title,
        message,
        type,
        entityType,
        entityId,
        priority,
        actionUrl,
      });

      Logger.info('Notification created', {
        userId,
        notificationType: type,
        notificationId: notification.id,
      });

      return notification;
    } catch (error) {
      Logger.error('Failed to create notification', error, {
        userId,
        type,
      });
      throw error;
    }
  }

  /**
   * Get unread notifications for user
   * 
   * WHY: Show users what requires their attention.
   * 
   * @param {number} userId - User ID
   * @param {number} limit - Max notifications
   * @returns {Array} Unread notifications
   */
  async getUnreadNotifications(userId, limit = 10) {
    const notifications = await this.models.Notification.findAll({
      where: {
        user_id: userId,
        is_read: false,
      },
      order: [['priority', 'DESC'], ['createdAt', 'DESC']],
      limit,
    });

    return notifications;
  }

  /**
   * Get all notifications for user (paginated)
   * 
   * WHY: Show notification history.
   * 
   * @param {number} userId - User ID
   * @param {number} page - Page number
   * @param {number} limit - Items per page
   * @returns {Object} Paginated notifications
   */
  async getNotifications(userId, page = 1, limit = 10) {
    const offset = (page - 1) * limit;

    const { count, rows } = await this.models.Notification.findAndCountAll({
      where: { user_id: userId },
      order: [['createdAt', 'DESC']],
      offset,
      limit,
    });

    return {
      data: rows,
      pagination: {
        total: count,
        page,
        limit,
        totalPages: Math.ceil(count / limit),
      },
    };
  }

  /**
   * Mark notification as read
   * 
   * WHY: Track which notifications user has viewed.
   * 
   * @param {number} notificationId - Notification ID
   * @returns {Object} Updated notification
   */
  async markAsRead(notificationId) {
    const notification = await this.models.Notification.findByPk(notificationId);
    if (!notification) {
      throw new Error('Notification not found');
    }

    return await notification.markAsRead();
  }

  /**
   * Mark all notifications as read for user
   * 
   * WHY: Quick "mark all read" action.
   * 
   * @param {number} userId - User ID
   * @returns {Object} Update result
   */
  async markAllAsRead(userId) {
    return await this.models.Notification.update(
      {
        is_read: true,
        read_at: new Date(),
      },
      {
        where: {
          user_id: userId,
          is_read: false,
        },
      }
    );
  }

  /**
   * Delete notification
   * 
   * WHY: Clean up old notifications.
   * 
   * @param {number} notificationId - Notification ID
   * @returns {boolean} Success
   */
  async deleteNotification(notificationId) {
    const deleted = await this.models.Notification.destroy({
      where: { id: notificationId },
    });

    return deleted > 0;
  }

  /**
   * Get unread notification count for user
   * 
   * WHY: Show badge on UI indicating new notifications.
   * 
   * @param {number} userId - User ID
   * @returns {number} Count of unread
   */
  async getUnreadCount(userId) {
    return await this.models.Notification.count({
      where: {
        user_id: userId,
        is_read: false,
      },
    });
  }

  /**
   * Send notification stream of important events
   * 
   * WHY: Predefined notifications for common events.
   */

  async notifyApplicationSubmitted(userId, applicationId, postingTitle) {
    return await this.notify(userId, {
      title: 'Application Submitted',
      message: `Your application for ${postingTitle} has been submitted successfully!`,
      type: 'application_submitted',
      entityType: 'Application',
      entityId: applicationId,
      priority: 'normal',
      actionUrl: `/applications/${applicationId}`,
    });
  }

  async notifyApplicationReviewed(userId, applicationId, postingTitle, status) {
    const statusText = status === 'shortlisted' ? 'Shortlisted' : 'Reviewed';
    return await this.notify(userId, {
      title: `Application ${statusText}`,
      message: `Your application for ${postingTitle} has been ${statusText}!`,
      type: 'application_reviewed',
      entityType: 'Application',
      entityId: applicationId,
      priority: 'high',
      actionUrl: `/applications/${applicationId}`,
    });
  }

  async notifyApplicationAccepted(userId, applicationId, postingTitle) {
    return await this.notify(userId, {
      title: 'Application Accepted!',
      message: `Congratulations! You have been accepted for ${postingTitle}. Check details and next steps.`,
      type: 'application_accepted',
      entityType: 'Application',
      entityId: applicationId,
      priority: 'urgent',
      actionUrl: `/applications/${applicationId}`,
    });
  }

  async notifyApplicationRejected(userId, applicationId, postingTitle) {
    return await this.notify(userId, {
      title: 'Application Status Update',
      message: `We regret to inform you that your application for ${postingTitle} was not selected. Try other postings!`,
      type: 'application_rejected',
      entityType: 'Application',
      entityId: applicationId,
      priority: 'normal',
      actionUrl: `/applications/${applicationId}`,
    });
  }

  async notifyNewMatches(userId, postingCount) {
    return await this.notify(userId, {
      title: `${postingCount} New Matching Jobs Found`,
      message: `Check out ${postingCount} job postings that match your profile and skills!`,
      type: 'new_match',
      priority: 'normal',
      actionUrl: `/matches`,
    });
  }

  async notifyAccountApproved(userId) {
    return await this.notify(userId, {
      title: 'Account Approved',
      message: 'Your account has been approved! You can now access all features.',
      type: 'account_update',
      priority: 'high',
    });
  }
}

/**
 * Audit Service
 * 
 * WHY: Log sensitive operations for security audit trails.
 * Required for compliance and debugging. WHY: Helps identify unauthorized access,
 * data changes, and system issues.
 * 
 * WHAT: Log all create, update, delete operations on sensitive models.
 */
export class AuditService {
  constructor(models) {
    this.models = models;
  }

  /**
   * Log an action to audit trail
   * 
   * WHY: Centralized method for all audit logging.
   * 
   * @param {Object} data - Audit log data
   * @returns {Object} Created audit log
   */
  async log(data) {
    const {
      userId,
      userRole,
      entityType,
      entityId,
      action,
      oldValues = null,
      newValues = null,
      ipAddress,
      userAgent,
      reason = null,
      severity = 'medium',
      status = 'success',
      errorMessage = null,
    } = data;

    try {
      const auditLog = await this.models.AuditLog.create({
        user_id: userId,
        user_role: userRole,
        entity_type: entityType,
        entity_id: entityId,
        action,
        old_values: oldValues,
        new_values: newValues,
        ip_address: ipAddress,
        user_agent: userAgent,
        reason,
        severity,
        status,
        error_message: errorMessage,
      });

      // Log critical actions to file
      if (severity === 'critical' || severity === 'high') {
        Logger.warn(`AUDIT: ${action} on ${entityType}#${entityId}`, {
          userId,
          severity,
          reason,
        });
      }

      return auditLog;
    } catch (error) {
      Logger.error('Failed to create audit log', error);
      // Don't throw - audit logging shouldn't break normal operations
      return null;
    }
  }

  /**
   * Log user login
   */
  async logLogin(userId, ipAddress, userAgent) {
    return await this.log({
      userId,
      action: 'login',
      entityType: 'User',
      entityId: userId,
      ipAddress,
      userAgent,
      severity: 'high',
    });
  }

  /**
   * Log user logout
   */
  async logLogout(userId, ipAddress) {
    return await this.log({
      userId,
      action: 'logout',
      entityType: 'User',
      entityId: userId,
      ipAddress,
      severity: 'medium',
    });
  }

  /**
   * Log data change
   */
  async logDataChange(userId, entityType, entityId, oldValues, newValues, reason) {
    return await this.log({
      userId,
      action: 'update',
      entityType,
      entityId,
      oldValues,
      newValues,
      reason,
      severity: 'medium',
    });
  }

  /**
   * Log record deletion
   */
  async logDelete(userId, entityType, entityId, reason) {
    return await this.log({
      userId,
      action: 'delete',
      entityType,
      entityId,
      reason,
      severity: 'high',
    });
  }

  /**
   * Get audit logs for entity
   * 
   * WHY: View change history for debugging/compliance.
   * 
   * @param {string} entityType - Type of entity
   * @param {number} entityId - Entity ID
   * @returns {Array} Audit logs
   */
  async getEntityHistory(entityType, entityId) {
    return await this.models.AuditLog.findAll({
      where: {
        entity_type: entityType,
        entity_id: entityId,
      },
      order: [['createdAt', 'DESC']],
    });
  }

  /**
   * Get user's actions
   * 
   * WHY: See what actions a user performed.
   * 
   * @param {number} userId - User ID
   * @param {number} limit - Max records
   * @returns {Array} User's audit logs
   */
  async getUserActions(userId, limit = 50) {
    return await this.models.AuditLog.findAll({
      where: { user_id: userId },
      order: [['createdAt', 'DESC']],
      limit,
    });
  }

  /**
   * Get high-severity audit logs
   * 
   * WHY: Monitor suspicious activities.
   * 
   * @param {number} limitDays - Last N days
   * @returns {Array} Critical audit logs
   */
  async getHighSeverityLogs(limitDays = 7) {
    const since = new Date();
    since.setDate(since.getDate() - limitDays);

    return await this.models.AuditLog.findAll({
      where: {
        severity: ['high', 'critical'],
        createdAt: {
          [this.models.sequelize.Op.gte]: since,
        },
      },
      order: [['createdAt', 'DESC']],
    });
  }

  /**
   * Generate audit report
   * 
   * WHY: Compliance reporting.
   * 
   * @param {Date} startDate - Report start date
   * @param {Date} endDate - Report end date
   * @returns {Object} Audit report
   */
  async generateReport(startDate, endDate) {
    const logs = await this.models.AuditLog.findAll({
      where: {
        createdAt: {
          [this.models.sequelize.Op.between]: [startDate, endDate],
        },
      },
      order: [['createdAt', 'DESC']],
    });

    // Analyze logs
    const summary = {
      total: logs.length,
      byAction: {},
      bySeverity: {},
      byEntityType: {},
      failedOperations: logs.filter(l => l.status === 'failed').length,
    };

    logs.forEach(log => {
      summary.byAction[log.action] = (summary.byAction[log.action] || 0) + 1;
      summary.bySeverity[log.severity] = (summary.bySeverity[log.severity] || 0) + 1;
      summary.byEntityType[log.entity_type] = (summary.byEntityType[log.entity_type] || 0) + 1;
    });

    return {
      startDate,
      endDate,
      summary,
      logs,
    };
  }
}

export default { NotificationService, AuditService };
