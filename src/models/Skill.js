/**
 * StudentSkill Model
 * 
 * WHY: Junction table for many-to-many relationship between
 * Students and Skills. Tracks proficiency level and experience.
 * 
 * WHAT: Student's individual skills with proficiency tracking.
 */

import { DataTypes } from 'sequelize';

export const defineStudentSkill = (sequelize) => {
  const StudentSkill = sequelize.define(
    'StudentSkill',
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
        comment: 'Student who has this skill',
      },

      // Skill Name (denormalized for easier searching)
      // WHY denormalize: Faster queries, no need to join with Skills table
      skill_name: {
        type: DataTypes.STRING(100),
        allowNull: false,
        comment: 'Name of the skill (e.g., Java, Python, SQL)',
      },

      // Proficiency Level
      // WHY enum: Restricts to valid levels for consistency
      proficiency_level: {
        type: DataTypes.ENUM('beginner', 'intermediate', 'advanced', 'expert'),
        allowNull: false,
        defaultValue: 'beginner',
        comment: 'How proficient is student in this skill?',
      },

      // Years of Experience
      years_of_experience: {
        type: DataTypes.DECIMAL(3, 1),
        allowNull: true,
        validate: {
          min: 0,
          max: 50,
        },
        comment: 'Years of practical experience with this skill',
      },

      // When skill was added
      endorsed_count: {
        type: DataTypes.INTEGER,
        allowNull: false,
        defaultValue: 0,
        validate: {
          min: 0,
        },
        comment: 'Number of endorsements/confirmations from others',
      },
    },
    {
      indexes: [
        {
          fields: ['student_id'],
        },
        {
          fields: ['skill_name'],
        },
        {
          fields: ['proficiency_level'],
        },
      ],
    }
  );

  /**
   * Instance method: Update proficiency
   */
  StudentSkill.prototype.updateProficiency = async function(newLevel) {
    const validLevels = ['beginner', 'intermediate', 'advanced', 'expert'];
    if (!validLevels.includes(newLevel)) {
      throw new Error('Invalid proficiency level');
    }
    this.proficiency_level = newLevel;
    return await this.save();
  };

  /**
   * Instance method: Endorse skill (confirmation)
   * WHY: Build trust in skills through endorsements
   */
  StudentSkill.prototype.addEndorsement = async function() {
    this.endorsed_count += 1;
    return await this.save();
  };

  return StudentSkill;
};

/**
 * PostingSkill Model
 * 
 * WHY: Skills required/preferred for a job posting.
 * Used by matching algorithm to calculate skill compatibility.
 * 
 * WHAT: Individual skill requirement for a job posting.
 */
export const definePostingSkill = (sequelize) => {
  const PostingSkill = sequelize.define(
    'PostingSkill',
    {
      id: {
        type: DataTypes.INTEGER,
        primaryKey: true,
        autoIncrement: true,
      },

      posting_id: {
        type: DataTypes.INTEGER,
        allowNull: false,
        references: {
          model: 'OjtPostings',
          key: 'id',
        },
        onDelete: 'CASCADE',
        comment: 'Job posting requiring this skill',
      },

      // Skill Name
      skill_name: {
        type: DataTypes.STRING(100),
        allowNull: false,
        comment: 'Required skill name',
      },

      // Required vs Preferred
      // WHY: Matching algorithm weights required skills higher
      is_required: {
        type: DataTypes.BOOLEAN,
        allowNull: false,
        defaultValue: false,
        comment: 'Is this skill mandatory or just preferred?',
      },

      // Minimum Proficiency Expected
      min_proficiency_level: {
        type: DataTypes.ENUM('beginner', 'intermediate', 'advanced', 'expert'),
        allowNull: true,
        comment: 'Minimum proficiency acceptable',
      },

      // Weight in Scoring
      // WHY: Different skills can have different importance
      weight: {
        type: DataTypes.DECIMAL(3, 2),
        allowNull: false,
        defaultValue: 1.00,
        validate: {
          min: 0,
          max: 2,
        },
        comment: 'Weight in scoring (1.0 = normal, 2.0 = double importance)',
      },

      description: {
        type: DataTypes.TEXT,
        allowNull: true,
        comment: 'Why this skill is needed',
      },
    },
    {
      indexes: [
        {
          fields: ['posting_id'],
        },
        {
          fields: ['skill_name'],
        },
      ],
    }
  );

  return PostingSkill;
};
