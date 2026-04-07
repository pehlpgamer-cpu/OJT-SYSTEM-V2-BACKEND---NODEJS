/**
 * Company Model
 * 
 * WHY: Stores company-specific information for job posting and hiring.
 * Separate table from User allows role-specific data without cluttering
 * the User table.
 * 
 * WHAT: Company profile, accreditation status, and general information.
 */

import { DataTypes } from 'sequelize';

export const defineCompany = (sequelize) => {
  const Company = sequelize.define(
    'Company',
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
          model: 'Users',
          key: 'id',
        },
        onDelete: 'CASCADE',
        comment: 'Reference to parent User record',
      },

      // Company Information
      company_name: {
        type: DataTypes.STRING(255),
        allowNull: true,
        comment: 'Official company name',
      },

      industry_type: {
        type: DataTypes.STRING(100),
        allowNull: true,
        comment: 'Industry/sector (e.g., Technology, Finance)',
      },

      company_size: {
        type: DataTypes.ENUM('1-50', '51-200', '201-500', '500+'),
        allowNull: true,
        comment: 'Approximate number of employees',
      },

      company_website: {
        type: DataTypes.STRING(500),
        allowNull: true,
        validate: {
          isUrl: true,
        },
        comment: 'URL to company website',
      },

      // Contact Information
      phone: {
        type: DataTypes.STRING(20),
        allowNull: true,
        comment: 'Company phone number',
      },

      address: {
        type: DataTypes.STRING(500),
        allowNull: true,
        comment: 'Company headquarters address',
      },

      city: {
        type: DataTypes.STRING(100),
        allowNull: true,
        comment: 'City where company is located',
      },

      country: {
        type: DataTypes.STRING(100),
        allowNull: true,
        comment: 'Country of operation',
      },

      // Business Profile
      description: {
        type: DataTypes.TEXT,
        allowNull: true,
        comment: 'Company description/about',
      },

      logo_url: {
        type: DataTypes.STRING(500),
        allowNull: true,
        comment: 'URL to company logo',
      },

      // Accreditation/Verification
      // WHY: Companies must be verified before posting jobs (prevent spam)
      accreditation_status: {
        type: DataTypes.ENUM('pending', 'approved', 'rejected', 'suspended'),
        allowNull: false,
        defaultValue: 'pending',
        comment: 'Verification status for posting privileges',
      },

      accreditation_verified_at: {
        type: DataTypes.DATE,
        allowNull: true,
        comment: 'When company was accredited',
      },

      // Rating and Feedback
      average_rating: {
        type: DataTypes.DECIMAL(3, 2),
        allowNull: false,
        defaultValue: 0.00,
        validate: {
          min: 0,
          max: 5,
        },
        comment: 'Average student rating (0-5 stars)',
      },

      total_ratings: {
        type: DataTypes.INTEGER,
        allowNull: false,
        defaultValue: 0,
        validate: {
          min: 0,
        },
        comment: 'Number of ratings received',
      },

      // Compliance
      tax_id: {
        type: DataTypes.STRING(50),
        allowNull: true,
        comment: 'Tax identification number for compliance',
      },

      is_approved_for_posting: {
        type: DataTypes.BOOLEAN,
        allowNull: false,
        defaultValue: false,
        comment: 'Can this company post job openings?',
      },
    },
    {
      indexes: [
        {
          fields: ['user_id'],
        },
        {
          fields: ['accreditation_status'],
        },
        {
          fields: ['city'],
        },
      ],
    }
  );

  /**
   * Instance method: Approve company for posting
   * 
   * WHY: Admin needs a clean method to approve companies.
   * Encapsulates the logic in one place.
   */
  Company.prototype.approve = async function(verifiedBy = null) {
    this.accreditation_status = 'approved';
    this.is_approved_for_posting = true;
    this.accreditation_verified_at = new Date();
    return await this.save();
  };

  /**
   * Instance method: Suspend company
   * 
   * WHY: Handle violations/complaints by suspending posting privileges
   */
  Company.prototype.suspend = async function() {
    this.accreditation_status = 'suspended';
    this.is_approved_for_posting = false;
    return await this.save();
  };

  /**
   * Instance method: Update company rating
   * 
   * WHY: Recalculate average rating when new feedback arrives
   * 
   * @param {number} newRating - New rating to include (1-5)
   */
  Company.prototype.updateRating = async function(newRating) {
    if (newRating < 1 || newRating > 5) {
      throw new Error('Rating must be between 1 and 5');
    }

    // Calculate new average
    const total = this.average_rating * this.total_ratings;
    const newAverage = (total + newRating) / (this.total_ratings + 1);

    this.average_rating = Math.round(newAverage * 100) / 100; // Round to 2 decimals
    this.total_ratings += 1;

    return await this.save();
  };

  /**
   * Instance method: Get company's active job postings
   * 
   * WHY: Convenience method for fetching company's open positions
   */
  Company.prototype.getActivePostings = async function() {
    return await sequelize.models.OjtPosting.findAll({
      where: {
        company_id: this.id,
        posting_status: 'active',
      },
    });
  };

  /**
   * Instance method: Get all applications for company postings
   * 
   * WHY: Helps company view all student applications at once
   */
  Company.prototype.getAllApplications = async function() {
    return await sequelize.models.Application.findAll({
      include: [
        {
          model: sequelize.models.OjtPosting,
          where: { company_id: this.id },
        },
      ],
    });
  };

  return Company;
};
