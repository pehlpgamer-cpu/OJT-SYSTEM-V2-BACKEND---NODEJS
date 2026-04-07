/**
 * Application Model - Student Applications
 * 
 * WHY: Records when a student applies for a job posting.
 * Tracks application status and communication.
 * 
 * WHAT: Student applications with status and progress tracking.
 */

import { DataTypes } from 'sequelize';

export const defineApplication = (sequelize) => {
  const Application = sequelize.define(
    'Application',
    {
      id: {
        type: DataTypes.INTEGER,
        primaryKey: true,
        autoIncrement: true,
      },

      // Foreign Keys
      student_id: {
        type: DataTypes.INTEGER,
        allowNull: false,
        references: {
          model: 'Students',
          key: 'id',
        },
        onDelete: 'CASCADE',
        comment: 'Student applying',
      },

      posting_id: {
        type: DataTypes.INTEGER,
        allowNull: false,
        references: {
          model: 'OjtPostings',
          key: 'id',
        },
        onDelete: 'CASCADE',
        comment: 'Job posting applied for',
      },

      resume_id: {
        type: DataTypes.INTEGER,
        allowNull: true,
        references: {
          model: 'Resumes',
          key: 'id',
        },
        comment: 'Resume submitted with application',
      },

      // Application Details
      application_status: {
        type: DataTypes.ENUM('submitted', 'under_review', 'shortlisted', 'rejected', 'hired', 'withdrawn'),
        allowNull: false,
        defaultValue: 'submitted',
        comment: 'Current status of application',
      },

      cover_letter: {
        type: DataTypes.TEXT,
        allowNull: true,
        comment: 'Why student wants this position',
      },

      match_score: {
        type: DataTypes.DECIMAL(5, 2),
        allowNull: true,
        validate: {
          min: 0,
          max: 100,
        },
        comment: 'Compatibility score (0-100)',
      },

      // Feedback
      company_feedback: {
        type: DataTypes.TEXT,
        allowNull: true,
        comment: 'Company feedback on application',
      },

      rejection_reason: {
        type: DataTypes.STRING(255),
        allowNull: true,
        comment: 'Why student was rejected',
      },

      // Timestamps
      applied_at: {
        type: DataTypes.DATE,
        allowNull: false,
        defaultValue: DataTypes.NOW,
        comment: 'When student applied',
      },

      reviewed_at: {
        type: DataTypes.DATE,
        allowNull: true,
        comment: 'When company reviewed application',
      },

      // Status Updates
      interviewed_at: {
        type: DataTypes.DATE,
        allowNull: true,
        comment: 'When student was interviewed',
      },

      hired_at: {
        type: DataTypes.DATE,
        allowNull: true,
        comment: 'When student was hired',
      },

      // Additional Info
      notes: {
        type: DataTypes.TEXT,
        allowNull: true,
        comment: 'Internal notes about application',
      },
    },
    {
      indexes: [
        {
          fields: ['student_id'],
        },
        {
          fields: ['posting_id'],
        },
        {
          fields: ['application_status'],
        },
        {
          fields: ['applied_at'],
        },
        {
          unique: true,
          fields: ['student_id', 'posting_id'], // Prevent duplicate applications
        },
      ],
    }
  );

  /**
   * Instance method: Update status
   */
  Application.prototype.updateStatus = async function(newStatus, reason = null) {
    const validStatuses = ['submitted', 'under_review', 'shortlisted', 'rejected', 'hired', 'withdrawn'];
    if (!validStatuses.includes(newStatus)) {
      throw new Error('Invalid application status');
    }

    this.application_status = newStatus;

    // Track status-specific timestamps
    if (newStatus === 'rejected') {
      this.rejection_reason = reason;
    } else if (newStatus === 'hired') {
      this.hired_at = new Date();
    } else if (newStatus === 'under_review') {
      this.reviewed_at = new Date();
    }

    return await this.save();
  };

  /**
   * Instance method: Set interview date
   */
  Application.prototype.scheduleInterview = async function(interviewDate) {
    this.interviewed_at = interviewDate;
    return await this.save();
  };

  /**
   * Instance method: Withdraw application
   * WHY: Student changed their mind
   */
  Application.prototype.withdraw = async function() {
    return await this.updateStatus('withdrawn');
  };

  return Application;
};

/**
 * Resume Model
 * 
 * WHY: Store student resumes. Track which is the active resume.
 * Used when applying to jobs.
 * 
 * WHAT: Student resume files and metadata.
 */
export const defineResume = (sequelize) => {
  const Resume = sequelize.define(
    'Resume',
    {
      id: {
        type: DataTypes.INTEGER,
        primaryKey: true,
        autoIncrement: true,
      },

      student_id: {
        type: DataTypes.INTEGER,
        allowNull: false,
        references: {
          model: 'Students',
          key: 'id',
        },
        onDelete: 'CASCADE',
      },

      // File Information
      file_name: {
        type: DataTypes.STRING(255),
        allowNull: false,
        comment: 'Original filename',
      },

      file_path: {
        type: DataTypes.STRING(500),
        allowNull: false,
        comment: 'Path to resume file',
      },

      file_size_bytes: {
        type: DataTypes.INTEGER,
        allowNull: true,
        comment: 'File size in bytes',
      },

      // Resume Metadata
      title: {
        type: DataTypes.STRING(255),
        allowNull: true,
        comment: 'Resume title (e.g., "Updated Resume 2024")',
      },

      is_active: {
        type: DataTypes.BOOLEAN,
        allowNull: false,
        defaultValue: false,
        comment: 'Is this the active resume used for applications?',
      },

      uploaded_at: {
        type: DataTypes.DATE,
        allowNull: false,
        defaultValue: DataTypes.NOW,
      },

      // Download tracking
      download_count: {
        type: DataTypes.INTEGER,
        allowNull: false,
        defaultValue: 0,
        comment: 'How many times companies downloaded',
      },
    },
    {
      indexes: [
        {
          fields: ['student_id'],
        },
        {
          fields: ['is_active'],
        },
      ],
    }
  );

  /**
   * Instance method: Set as active resume
   *
   * WHY: Only one resume should be active at a time
   */
  Resume.prototype.setAsActive = async function() {
    // Deactivate all other resumes for this student
    await sequelize.models.Resume.update(
      { is_active: false },
      { where: { student_id: this.student_id } }
    );

    // Set this one as active
    this.is_active = true;
    return await this.save();
  };

  /**
   * Instance method: Record download
   */
  Resume.prototype.recordDownload = async function() {
    this.download_count += 1;
    return await this.save();
  };

  return Resume;
};
