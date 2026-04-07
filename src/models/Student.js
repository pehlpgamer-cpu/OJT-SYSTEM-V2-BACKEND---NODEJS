/**
 * Student Model
 * 
 * WHY: Extends User model with student-specific data like skills,
 * availability, and profile completion percentage. Follows the
 * separation of concerns principle.
 * 
 * WHAT: Stores student profile information, availability window,
 * and profile completion tracking.
 */

import { DataTypes } from 'sequelize';

export const defineStudent = (sequelize) => {
  const Student = sequelize.define(
    'Student',
    {
      id: {
        type: DataTypes.INTEGER,
        primaryKey: true,
        autoIncrement: true,
      },

      // Foreign Key to User
      user_id: {
        type: DataTypes.INTEGER,
        allowNull: false,
        references: {
          model: 'Users', // References the User table
          key: 'id',
        },
        onDelete: 'CASCADE', // If user deleted, delete student profile too
        comment: 'Reference to parent User record',
      },

      // Student-specific Information
      first_name: {
        type: DataTypes.STRING(100),
        allowNull: true,
        comment: 'Student first name (can differ from User.name)',
      },

      last_name: {
        type: DataTypes.STRING(100),
        allowNull: true,
        comment: 'Student last name',
      },

      phone: {
        type: DataTypes.STRING(20),
        allowNull: true,
        validate: {
          isNumeric: true,
        },
        comment: 'Contact phone number',
      },

      // Profile Information
      bio: {
        type: DataTypes.TEXT,
        allowNull: true,
        comment: 'Student bio/about section',
      },

      current_location: {
        type: DataTypes.STRING(255),
        allowNull: true,
        comment: 'Current location for matching',
      },

      preferred_location: {
        type: DataTypes.STRING(255),
        allowNull: true,
        comment: 'Preferred OJT location - used for location matching',
      },

      profile_picture_url: {
        type: DataTypes.STRING(500),
        allowNull: true,
        comment: 'URL to student profile picture',
      },

      // Availability Window
      // WHY: Companies need to know when student can work
      availability_start: {
        type: DataTypes.DATE,
        allowNull: true,
        comment: 'Date student becomes available for OJT',
      },

      availability_end: {
        type: DataTypes.DATE,
        allowNull: true,
        comment: 'Date student needs to finish OJT',
      },

      // Profile Completion Tracking
      // WHY: Motivate students to complete profiles - higher = more likely to match
      profile_completeness_percentage: {
        type: DataTypes.INTEGER,
        allowNull: false,
        defaultValue: 0,
        validate: {
          min: 0,
          max: 100,
        },
        comment: 'Profile completion percentage (0-100)',
      },

      // GPA (optional but can help with matching)
      gpa: {
        type: DataTypes.DECIMAL(3, 2),
        allowNull: true,
        validate: {
          min: 0,
          max: 4.0,
        },
        comment: 'Student GPA if available',
      },

      // Academic Program
      academic_program: {
        type: DataTypes.STRING(255),
        allowNull: true,
        comment: 'Degree program (e.g., Computer Science)',
      },

      // Year of Study
      year_of_study: {
        type: DataTypes.ENUM('1st', '2nd', '3rd', '4th', 'graduate'),
        allowNull: true,
        comment: 'Current year of academic study',
      },
    },
    {
      indexes: [
        {
          fields: ['user_id'],
        },
        {
          fields: ['preferred_location'], // Filter by location
        },
      ],
    }
  );

  /**
   * Instance method: Calculate profile completeness
   * 
   * WHY: Encourage students to complete all fields by showing
   * completion percentage. More complete = better matching.
   */
  Student.prototype.calculateProfileCompleteness = function() {
    const fields = [
      'first_name',
      'last_name',
      'phone',
      'bio',
      'current_location',
      'preferred_location',
      'profile_picture_url',
      'availability_start',
      'availability_end',
      'academic_program',
    ];

    let completedFields = 0;

    fields.forEach(field => {
      if (this[field]) {
        completedFields++;
      }
    });

    // Calculate percentage (0-100%)
    // WHY: 50% = half of tracked fields completed
    this.profile_completeness_percentage = Math.round((completedFields / fields.length) * 100);

    return this.profile_completeness_percentage;
  };

  /**
   * Instance method: Check if student is available on a date
   * 
   * WHY: Used by matching algorithm to filter students
   * available during the posting period.
   * 
   * @param {Date} startDate - Start of OJT
   * @param {Date} endDate - End of OJT
   * @returns {boolean} True if student available during period
   */
  Student.prototype.isAvailableDuring = function(startDate, endDate) {
    if (!this.availability_start || !this.availability_end) {
      return false; // Student hasn't specified availability
    }

    const availStart = new Date(this.availability_start);
    const availEnd = new Date(this.availability_end);
    const ojStart = new Date(startDate);
    const ojEnd = new Date(endDate);

    // Check for overlap: student available period must overlap with OJT period
    return availStart <= ojEnd && ojStart <= availEnd;
  };

  /**
   * Instance method: Get student's skills
   * 
   * WHY: Convenience method to fetch associated skills
   */
  Student.prototype.getSkills = async function() {
    return await sequelize.models.StudentSkill.findAll({
      where: { student_id: this.id },
    });
  };

  return Student;
};
