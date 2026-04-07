/**
 * MatchScore Model
 * 
 * WHY: Pre-calculates and caches match scores between students and postings.
 * Matching algorithm is expensive - caching improves performance.
 * 
 * WHAT: Stores compatibility scores and breakdown of score components.
 */

import { DataTypes } from 'sequelize';

export const defineMatchScore = (sequelize) => {
  const MatchScore = sequelize.define(
    'MatchScore',
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
        comment: 'Student being matched',
      },

      posting_id: {
        type: DataTypes.INTEGER,
        allowNull: false,
        references: {
          model: 'OjtPostings',
          key: 'id',
        },
        onDelete: 'CASCADE',
        comment: 'Job posting being matched',
      },

      // Overall Score (0-100)
      overall_score: {
        type: DataTypes.DECIMAL(5, 2),
        allowNull: false,
        validate: {
          min: 0,
          max: 100,
        },
        comment: 'Final compatibility score (0-100)',
      },

      // Score Components (used for transparency)
      // WHY breakdown: Help students understand why they matched
      skill_score: {
        type: DataTypes.DECIMAL(5, 2),
        allowNull: false,
        defaultValue: 0,
        validate: {
          min: 0,
          max: 100,
        },
        comment: 'Skill match percentage (0-100)',
      },

      location_score: {
        type: DataTypes.DECIMAL(5, 2),
        allowNull: false,
        defaultValue: 0,
        validate: {
          min: 0,
          max: 100,
        },
        comment: 'Location match percentage (0-100)',
      },

      availability_score: {
        type: DataTypes.DECIMAL(5, 2),
        allowNull: false,
        defaultValue: 0,
        validate: {
          min: 0,
          max: 100,
        },
        comment: 'Availability match percentage (0-100)',
      },

      gpa_score: {
        type: DataTypes.DECIMAL(5, 2),
        allowNull: false,
        defaultValue: 0,
        validate: {
          min: 0,
          max: 100,
        },
        comment: 'GPA fit score',
      },

      academic_program_score: {
        type: DataTypes.DECIMAL(5, 2),
        allowNull: false,
        defaultValue: 0,
        validate: {
          min: 0,
          max: 100,
        },
        comment: 'Academic program alignment score',
      },

      // Metadata
      match_status: {
        type: DataTypes.ENUM('highly_compatible', 'compatible', 'moderately_compatible', 'weak_match', 'not_compatible'),
        allowNull: false,
        defaultValue: 'compatible',
        comment: 'Qualitative assessment of match',
      },

      // Caching
      calculated_at: {
        type: DataTypes.DATE,
        allowNull: false,
        defaultValue: DataTypes.NOW,
        comment: 'When this score was calculated',
      },

      // Ranking
      match_rank: {
        type: DataTypes.INTEGER,
        allowNull: true,
        comment: 'Rank of this match (1st, 2nd, etc) among postings for student',
      },

      // Recommendation Reason
      recommendation_reason: {
        type: DataTypes.TEXT,
        allowNull: true,
        comment: 'Why this posting is recommended to student',
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
          fields: ['overall_score'], // For sorting matches
        },
        {
          fields: ['match_status'],
        },
        {
          unique: true,
          fields: ['student_id', 'posting_id'],
        },
      ],
    }
  );

  /**
   * Instance method: Get readable match status
   */
  MatchScore.prototype.getMatchStatusDescription = function() {
    const descriptions = {
      highly_compatible: 'Excellent match! High chance of success',
      compatible: 'Good match. You meet most requirements',
      moderately_compatible: 'Possible fit, but some skill gaps exist',
      weak_match: 'Significant skill gaps. Consider developing new skills',
      not_compatible: 'Not a good fit at this time. Try other postings',
    };
    return descriptions[this.match_status] || 'No description available';
  };

  return MatchScore;
};

/**
 * MatchingRule Model
 * 
 * WHY: Admin can configure matching algorithm weights.
 * Different institutions may value skills/location/availability differently.
 * 
 * WHAT: Configuration parameters for the matching algorithm.
 */
export const defineMatchingRule = (sequelize) => {
  const MatchingRule = sequelize.define(
    'MatchingRule',
    {
      id: {
        type: DataTypes.INTEGER,
        primaryKey: true,
        autoIncrement: true,
      },

      // Weights for different match components (sum should be 100)
      skill_weight: {
        type: DataTypes.INTEGER,
        allowNull: false,
        defaultValue: 40,
        validate: {
          min: 0,
          max: 100,
        },
        comment: 'Weight for skill matching (default: 40%)',
      },

      location_weight: {
        type: DataTypes.INTEGER,
        allowNull: false,
        defaultValue: 20,
        validate: {
          min: 0,
          max: 100,
        },
        comment: 'Weight for location matching (default: 20%)',
      },

      availability_weight: {
        type: DataTypes.INTEGER,
        allowNull: false,
        defaultValue: 20,
        validate: {
          min: 0,
          max: 100,
        },
        comment: 'Weight for availability matching (default: 20%)',
      },

      gpa_weight: {
        type: DataTypes.INTEGER,
        allowNull: false,
        defaultValue: 10,
        validate: {
          min: 0,
          max: 100,
        },
        comment: 'Weight for GPA matching (default: 10%)',
      },

      academic_program_weight: {
        type: DataTypes.INTEGER,
        allowNull: false,
        defaultValue: 10,
        validate: {
          min: 0,
          max: 100,
        },
        comment: 'Weight for program matching (default: 10%)',
      },

      // Thresholds
      minimum_match_score: {
        type: DataTypes.INTEGER,
        allowNull: false,
        defaultValue: 60,
        validate: {
          min: 0,
          max: 100,
        },
        comment: 'Minimum score for recommendation (default: 60%)',
      },

      // Preferences
      prioritize_required_skills: {
        type: DataTypes.BOOLEAN,
        allowNull: false,
        defaultValue: true,
        comment: 'Must have ALL required skills?',
      },

      allow_remote_flexibility: {
        type: DataTypes.BOOLEAN,
        allowNull: false,
        defaultValue: true,
        comment: 'Increase score for remote-capable postings?',
      },

      // Last Updated
      updated_by: {
        type: DataTypes.INTEGER,
        allowNull: true,
        comment: 'Admin user ID who last updated',
      },

      updated_reason: {
        type: DataTypes.STRING(500),
        allowNull: true,
        comment: 'Why rules were updated',
      },
    }
  );

  /**
   * Class method: Get current active rules
   */
  MatchingRule.getCurrentRules = async function() {
    // In production, might have multiple rule sets, return the active one
    return await this.findOne({
      order: [['updatedAt', 'DESC']],
    });
  };

  /**
   * Instance method: Validate weights sum to 100
   */
  MatchingRule.prototype.validateWeights = function() {
    const totalWeight =
      this.skill_weight +
      this.location_weight +
      this.availability_weight +
      this.gpa_weight +
      this.academic_program_weight;

    if (totalWeight !== 100) {
      throw new Error(`Weights must sum to 100, got ${totalWeight}`);
    }
  };

  return MatchingRule;
};

/**
 * OjtProgress Model
 * 
 * WHY: Track student's progress during their OJT.
 * Coordinators monitor completion and performance.
 * 
 * WHAT: Progress tracking for ongoing OJT placements.
 */
export const defineOjtProgress = (sequelize) => {
  const OjtProgress = sequelize.define(
    'OjtProgress',
    {
      id: {
        type: DataTypes.INTEGER,
        primaryKey: true,
        autoIncrement: true,
      },

      // Foreign Keys
      application_id: {
        type: DataTypes.INTEGER,
        allowNull: false,
        references: {
          model: 'Applications',
          key: 'id',
        },
        onDelete: 'CASCADE',
        comment: 'The accepted application',
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

      coordinator_id: {
        type: DataTypes.INTEGER,
        allowNull: true,
        references: {
          model: 'Coordinators',
          key: 'id',
        },
        comment: 'Assigned coordinator overseeing progress',
      },

      // Progress Tracking
      start_date: {
        type: DataTypes.DATE,
        allowNull: false,
        comment: 'When OJT started',
      },

      end_date: {
        type: DataTypes.DATE,
        allowNull: true,
        comment: 'When OJT ended (actual, not planned)',
      },

      hours_completed: {
        type: DataTypes.INTEGER,
        allowNull: false,
        defaultValue: 0,
        validate: {
          min: 0,
        },
        comment: 'Total training hours completed',
      },

      total_hours_required: {
        type: DataTypes.INTEGER,
        allowNull: false,
        validate: {
          min: 1,
        },
        comment: 'Total training hours required',
      },

      completion_percentage: {
        type: DataTypes.INTEGER,
        allowNull: false,
        defaultValue: 0,
        validate: {
          min: 0,
          max: 100,
        },
        comment: 'Percentage of OJT completed',
      },

      // Performance
      company_rating: {
        type: DataTypes.DECIMAL(3, 2),
        allowNull: true,
        validate: {
          min: 1,
          max: 5,
        },
        comment: 'Company rating of student (1-5 stars)',
      },

      performance_notes: {
        type: DataTypes.TEXT,
        allowNull: true,
        comment: 'Feedback notes from company',
      },

      // Status
      progress_status: {
        type: DataTypes.ENUM('in_progress', 'completed', 'failed', 'dropped'),
        allowNull: false,
        defaultValue: 'in_progress',
        comment: 'Current status of OJT',
      },

      final_report: {
        type: DataTypes.TEXT,
        allowNull: true,
        comment: 'Final report on completion',
      },
    },
    {
      indexes: [
        {
          fields: ['student_id'],
        },
        {
          fields: ['application_id'],
        },
        {
          fields: ['progress_status'],
        },
      ],
    }
  );

  /**
   * Instance method: Update completion percentage
   */
  OjtProgress.prototype.updateCompletion = async function(hoursCompleted) {
    this.hours_completed = hoursCompleted;
    this.completion_percentage = Math.round((hoursCompleted / this.total_hours_required) * 100);

    if (this.completion_percentage >= 100) {
      this.progress_status = 'completed';
      this.end_date = new Date();
    }

    return await this.save();
  };

  return OjtProgress;
};
