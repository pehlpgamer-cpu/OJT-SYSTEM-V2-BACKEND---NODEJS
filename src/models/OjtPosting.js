/**
 * OjtPosting Model - Job Postings
 * 
 * WHY: Core job posting table. Companies create postings that
 * students apply to. This is the matching engine's primary data source.
 * 
 * WHAT: Complete job posting information with requirements and status tracking.
 */

import { DataTypes } from 'sequelize';

export const defineOjtPosting = (sequelize) => {
  const OjtPosting = sequelize.define(
    'OjtPosting',
    {
      id: {
        type: DataTypes.INTEGER,
        primaryKey: true,
        autoIncrement: true,
      },

      // Foreign Key
      company_id: {
        type: DataTypes.INTEGER,
        allowNull: false,
        references: {
          model: 'Companies',
          key: 'id',
        },
        onDelete: 'CASCADE',
        comment: 'Company posting this opportunity',
      },

      // Basic Information
      title: {
        type: DataTypes.STRING(255),
        allowNull: false,
        comment: 'Job title (e.g., Junior Developer)',
      },

      description: {
        type: DataTypes.TEXT,
        allowNull: false,
        comment: 'Detailed job description and responsibilities',
      },

      // Location
      location: {
        type: DataTypes.STRING(255),
        allowNull: false,
        comment: 'Job location - used for location matching',
      },

      allow_remote: {
        type: DataTypes.BOOLEAN,
        allowNull: false,
        defaultValue: false,
        comment: 'Can position be done remotely?',
      },

      // Duration
      // WHY: Matching algorithm uses this for availability matching
      duration_weeks: {
        type: DataTypes.INTEGER,
        allowNull: false,
        validate: {
          min: 1,
          max: 52,
        },
        comment: 'Duration of OJT in weeks',
      },

      start_date: {
        type: DataTypes.DATE,
        allowNull: true,
        comment: 'Preferred start date',
      },

      // Salary/Compensation
      salary_range_min: {
        type: DataTypes.DECIMAL(12, 2),
        allowNull: true,
        validate: {
          min: 0,
        },
        comment: 'Minimum monthly salary',
      },

      salary_range_max: {
        type: DataTypes.DECIMAL(12, 2),
        allowNull: true,
        validate: {
          min: 0,
        },
        comment: 'Maximum monthly salary',
      },

      stipend: {
        type: DataTypes.BOOLEAN,
        allowNull: false,
        defaultValue: false,
        comment: 'Is there a stipend/allowance?',
      },

      // Requirements
      min_gpa: {
        type: DataTypes.DECIMAL(3, 2),
        allowNull: true,
        validate: {
          min: 0,
          max: 4.0,
        },
        comment: 'Minimum GPA requirement if any',
      },

      academic_program: {
        type: DataTypes.STRING(255),
        allowNull: true,
        comment: 'Required academic program (e.g., Computer Science)',
      },

      min_year_of_study: {
        type: DataTypes.ENUM('1st', '2nd', '3rd', '4th', 'graduate', 'any'),
        allowNull: false,
        defaultValue: 'any',
        comment: 'Minimum year of study required',
      },

      // Status Tracking
      // WHY: Control posting visibility and application status
      posting_status: {
        type: DataTypes.ENUM('active', 'closed', 'draft', 'archived'),
        allowNull: false,
        defaultValue: 'draft',
        comment: 'Current status: can students apply?',
      },

      positions_available: {
        type: DataTypes.INTEGER,
        allowNull: false,
        defaultValue: 1,
        validate: {
          min: 1,
        },
        comment: 'Number of positions available',
      },

      positions_filled: {
        type: DataTypes.INTEGER,
        allowNull: false,
        defaultValue: 0,
        validate: {
          min: 0,
        },
        comment: 'Number of positions already filled',
      },

      // Additional Info
      number_of_applications: {
        type: DataTypes.INTEGER,
        allowNull: false,
        defaultValue: 0,
        comment: 'Total applications received',
      },

      published_at: {
        type: DataTypes.DATE,
        allowNull: true,
        comment: 'When posting went public',
      },

      application_deadline: {
        type: DataTypes.DATE,
        allowNull: true,
        comment: 'Last day to apply',
      },

      // SEO/Tags
      tags: {
        type: DataTypes.JSON,
        allowNull: true,
        defaultValue: [],
        comment: 'Tags for searching (e.g., [\"full-stack\", \"startup\"])',
      },
    },
    {
      indexes: [
        {
          fields: ['company_id'],
        },
        {
          fields: ['posting_status'],
        },
        {
          fields: ['location'],
        },
        {
          fields: ['academic_program'],
        },
      ],
    }
  );

  /**
   * Instance method: Publish posting
   * 
   * WHY: Makes posting visible to students and opens for applications
   */
  OjtPosting.prototype.publish = async function() {
    this.posting_status = 'active';
    this.published_at = new Date();
    return await this.save();
  };

  /**
   * Instance method: Close posting
   * 
   * WHY: Stop accepting new applications
   */
  OjtPosting.prototype.close = async function() {
    this.posting_status = 'closed';
    return await this.save();
  };

  /**
   * Instance method: Check if positions available
   * 
   * WHY: Determine if posting is full
   * @returns {boolean} True if spots remain
   */
  OjtPosting.prototype.hasPositionsAvailable = function() {
    return this.positions_filled < this.positions_available;
  };

  /**
   * Instance method: Increment application count
   * 
   * WHY: Track applications for analytics
   */
  OjtPosting.prototype.incrementApplicationCount = async function() {
    this.number_of_applications += 1;
    return await this.save();
  };

  /**
   * Instance method: Mark position as filled
   * 
   * WHY: When student hired for this position
   */
  OjtPosting.prototype.fillPosition = async function() {
    if (this.hasPositionsAvailable()) {
      this.positions_filled += 1;
      if (this.positions_filled >= this.positions_available) {
        this.posting_status = 'closed';
      }
      return await this.save();
    }
    throw new Error('All positions already filled');
  };

  /**
   * Instance method: Get required skills for this posting
   * 
   * WHY: Used by matching algorithm to check student skills
   */
  OjtPosting.prototype.getRequiredSkills = async function() {
    return await sequelize.models.PostingSkill.findAll({
      where: {
        posting_id: this.id,
        is_required: true,
      },
    });
  };

  /**
   * Instance method: Get all skills (required and preferred)
   */
  OjtPosting.prototype.getAllSkills = async function() {
    return await sequelize.models.PostingSkill.findAll({
      where: {
        posting_id: this.id,
      },
    });
  };

  return OjtPosting;
};
