/**
 * Database Models Index & Initialization
 * 
 * WHY: Central place to initialize all models and define their relationships.
 * Relationships define how data is joined and cascaded.
 * 
 * WHAT: Exports all models and sets up associations between them.
 */

import { defineUser } from './User.js';
import { defineStudent } from './Student.js';
import { defineCompany } from './Company.js';
import { defineCoordinator } from './Coordinator.js';
import { defineOjtPosting } from './OjtPosting.js';
import { defineStudentSkill, definePostingSkill } from './Skill.js';
import { defineApplication, defineResume } from './Application.js';
import { defineMatchScore, defineMatchingRule, defineOjtProgress } from './Matching.js';
import { defineAuditLog, defineNotification, defineMessage } from './Audit.js';
import PasswordResetToken from './PasswordResetToken.js';

/**
 * Initialize all database models
 * 
 * WHY: Separate function allows loading models on demand
 * and testing without initializing everything.
 * 
 * @param {Sequelize} sequelize - Sequelize instance
 * @returns {Object} Object containing all models
 */
export function initializeModels(sequelize) {
  // Define each model
  // WHY: Define before relationships since relationships reference models
  const User = defineUser(sequelize);
  const Student = defineStudent(sequelize);
  const Company = defineCompany(sequelize);
  const Coordinator = defineCoordinator(sequelize);
  const OjtPosting = defineOjtPosting(sequelize);
  const StudentSkill = defineStudentSkill(sequelize);
  const PostingSkill = definePostingSkill(sequelize);
  const Application = defineApplication(sequelize);
  const Resume = defineResume(sequelize);
  const MatchScore = defineMatchScore(sequelize);
  const MatchingRule = defineMatchingRule(sequelize);
  const OjtProgress = defineOjtProgress(sequelize);
  const AuditLog = defineAuditLog(sequelize);
  const Notification = defineNotification(sequelize);
  const Message = defineMessage(sequelize);
  const PasswordResetTokenModel = PasswordResetToken(sequelize, sequelize.Sequelize.DataTypes);

  // ========================================
  // Define Model Relationships (Associations)
  // ========================================
  // WHY: Define relationships AFTER all models are created

  /**
   * USER RELATIONSHIPS
   * One User can have one Student/Company/Coordinator profile
   * depending on role
   */
  User.hasOne(Student, {
    foreignKey: 'user_id',
    onDelete: 'CASCADE',
  });
  Student.belongsTo(User, {
    foreignKey: 'user_id',
  });

  User.hasOne(Company, {
    foreignKey: 'user_id',
    onDelete: 'CASCADE',
  });
  Company.belongsTo(User, {
    foreignKey: 'user_id',
  });

  User.hasOne(Coordinator, {
    foreignKey: 'user_id',
    onDelete: 'CASCADE',
  });
  Coordinator.belongsTo(User, {
    foreignKey: 'user_id',
  });

  User.hasMany(PasswordResetTokenModel, {
    foreignKey: 'userId',
    onDelete: 'CASCADE',
    as: 'passwordResetTokens',
  });
  PasswordResetTokenModel.belongsTo(User, {
    foreignKey: 'userId',
  });

  /**
   * STUDENT RELATIONSHIPS
   */
  Student.hasMany(StudentSkill, {
    foreignKey: 'student_id',
    onDelete: 'CASCADE',
    as: 'skills',
  });
  StudentSkill.belongsTo(Student, {
    foreignKey: 'student_id',
  });

  Student.hasMany(Application, {
    foreignKey: 'student_id',
    onDelete: 'CASCADE',
    as: 'applications',
  });
  Application.belongsTo(Student, {
    foreignKey: 'student_id',
  });

  Student.hasMany(Resume, {
    foreignKey: 'student_id',
    onDelete: 'CASCADE',
    as: 'resumes',
  });
  Resume.belongsTo(Student, {
    foreignKey: 'student_id',
  });

  Student.hasMany(MatchScore, {
    foreignKey: 'student_id',
    onDelete: 'CASCADE',
    as: 'matchScores',
  });
  MatchScore.belongsTo(Student, {
    foreignKey: 'student_id',
  });

  Student.hasMany(OjtProgress, {
    foreignKey: 'student_id',
    onDelete: 'CASCADE',
    as: 'ojtProgress',
  });
  OjtProgress.belongsTo(Student, {
    foreignKey: 'student_id',
  });

  /**
   * COMPANY RELATIONSHIPS
   */
  Company.hasMany(OjtPosting, {
    foreignKey: 'company_id',
    onDelete: 'CASCADE',
    as: 'postings',
  });
  OjtPosting.belongsTo(Company, {
    foreignKey: 'company_id',
  });

  /**
   * COORDINATOR RELATIONSHIPS
   */
  Coordinator.hasMany(OjtProgress, {
    foreignKey: 'coordinator_id',
    as: 'ojtProgressAssignments',
  });
  OjtProgress.belongsTo(Coordinator, {
    foreignKey: 'coordinator_id',
  });

  /**
   * JOB POSTING RELATIONSHIPS
   */
  OjtPosting.hasMany(PostingSkill, {
    foreignKey: 'posting_id',
    onDelete: 'CASCADE',
    as: 'requiredSkills',
  });
  PostingSkill.belongsTo(OjtPosting, {
    foreignKey: 'posting_id',
  });

  OjtPosting.hasMany(Application, {
    foreignKey: 'posting_id',
    onDelete: 'CASCADE',
    as: 'applications',
  });
  Application.belongsTo(OjtPosting, {
    foreignKey: 'posting_id',
  });

  OjtPosting.hasMany(MatchScore, {
    foreignKey: 'posting_id',
    onDelete: 'CASCADE',
    as: 'matchScores',
  });
  MatchScore.belongsTo(OjtPosting, {
    foreignKey: 'posting_id',
  });

  /**
   * APPLICATION RELATIONSHIPS
   */
  Application.belongsTo(Resume, {
    foreignKey: 'resume_id',
  });
  Resume.hasMany(Application, {
    foreignKey: 'resume_id',
  });

  Application.hasOne(OjtProgress, {
    foreignKey: 'application_id',
    onDelete: 'CASCADE',
  });
  OjtProgress.belongsTo(Application, {
    foreignKey: 'application_id',
  });

  /**
   * COMMUNICATION RELATIONSHIPS
   */
  User.hasMany(Notification, {
    foreignKey: 'user_id',
    onDelete: 'CASCADE',
    as: 'notifications',
  });
  Notification.belongsTo(User, {
    foreignKey: 'user_id',
  });

  User.hasMany(Message, {
    foreignKey: 'sender_id',
    onDelete: 'CASCADE',
    as: 'sentMessages',
  });
  User.hasMany(Message, {
    foreignKey: 'recipient_id',
    onDelete: 'CASCADE',
    as: 'receivedMessages',
  });
  Message.belongsTo(User, {
    foreignKey: 'sender_id',
    as: 'sender',
  });
  Message.belongsTo(User, {
    foreignKey: 'recipient_id',
    as: 'recipient',
  });

  /**
   * AUDIT LOG RELATIONSHIPS
   */
  User.hasMany(AuditLog, {
    foreignKey: 'user_id',
    onDelete: 'SET NULL',
    as: 'auditLogs',
  });
  AuditLog.belongsTo(User, {
    foreignKey: 'user_id',
  });

  /**
   * MATCHING RELATIONSHIPS
   */
  // MatchingRule - typically just one global set of rules
  // No foreign key needed, it's configuration

  // Export all models as an object
  return {
    User,
    Student,
    Company,
    Coordinator,
    OjtPosting,
    StudentSkill,
    PostingSkill,
    Application,
    Resume,
    MatchScore,
    MatchingRule,
    OjtProgress,
    AuditLog,
    Notification,
    Message,
    PasswordResetToken,
    sequelize,
  };
}

export default {
  initializeModels,
};
