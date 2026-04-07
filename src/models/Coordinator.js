/**
 * Coordinator Model
 * 
 * WHY: Academic supervisors who monitor student progress.
 * Different from students and companies, they have oversight
 * responsibilities.
 * 
 * WHAT: Coordinator profile and assignment information.
 */

import { DataTypes } from 'sequelize';

export const defineCoordinator = (sequelize) => {
  const Coordinator = sequelize.define(
    'Coordinator',
    {
      id: {
        type: DataTypes.INTEGER,
        primaryKey: true,
        autoIncrement: true,
      },

      user_id: {
        type: DataTypes.INTEGER,
        allowNull: false,
        references: {
          model: 'Users',
          key: 'id',
        },
        onDelete: 'CASCADE',
      },

      // Coordinator Details
      department: {
        type: DataTypes.STRING(100),
        allowNull: true,
        comment: 'Academic department',
      },

      designation: {
        type: DataTypes.STRING(100),
        allowNull: true,
        comment: 'Job title/designation',
      },

      office_location: {
        type: DataTypes.STRING(255),
        allowNull: true,
        comment: 'Office location',
      },

      phone_extension: {
        type: DataTypes.STRING(10),
        allowNull: true,
        comment: 'Office phone extension',
      },

      // Responsibilities
      students_assigned: {
        type: DataTypes.INTEGER,
        allowNull: false,
        defaultValue: 0,
        validate: {
          min: 0,
        },
        comment: 'Number of students assigned to this coordinator',
      },

      max_students: {
        type: DataTypes.INTEGER,
        allowNull: false,
        defaultValue: 50,
        validate: {
          min: 1,
        },
        comment: 'Maximum students can be assigned',
      },

      // Specialization
      specialization_area: {
        type: DataTypes.STRING(255),
        allowNull: true,
        comment: 'Area of specialization/expertise',
      },

      bio: {
        type: DataTypes.TEXT,
        allowNull: true,
        comment: 'Coordinator bio',
      },
    },
    {
      indexes: [
        {
          fields: ['user_id'],
        },
        {
          fields: ['department'],
        },
      ],
    }
  );

  /**
   * Get students under this coordinator
   * 
   * WHY: Coordinators need to see their assigned students
   */
  Coordinator.prototype.getAssignedStudents = async function() {
    return await sequelize.models.Student.findAll({
      where: {
        coordinator_id: this.id,
      },
    });
  };

  return Coordinator;
};
