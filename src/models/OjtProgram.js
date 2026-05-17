/**
 * OJT Program models
 *
 * Programs are coordinator-owned cohorts that group students, companies, and
 * postings for oversight and reporting.
 */

import { DataTypes } from 'sequelize';

export const defineOjtProgram = (sequelize) => {
  const OjtProgram = sequelize.define(
    'OjtProgram',
    {
      id: {
        type: DataTypes.INTEGER,
        primaryKey: true,
        autoIncrement: true,
      },
      coordinator_id: {
        type: DataTypes.INTEGER,
        allowNull: false,
        references: {
          model: 'coordinators',
          key: 'id',
        },
        onDelete: 'CASCADE',
      },
      name: {
        type: DataTypes.STRING(255),
        allowNull: false,
      },
      description: {
        type: DataTypes.TEXT,
        allowNull: true,
      },
      start_date: {
        type: DataTypes.DATEONLY,
        allowNull: false,
      },
      end_date: {
        type: DataTypes.DATEONLY,
        allowNull: false,
      },
      minimum_gpa: {
        type: DataTypes.DECIMAL(3, 2),
        allowNull: true,
        validate: {
          min: 0,
          max: 4.0,
        },
      },
      academic_programs: {
        type: DataTypes.JSON,
        allowNull: false,
        defaultValue: [],
      },
      enrollment_enabled: {
        type: DataTypes.BOOLEAN,
        allowNull: false,
        defaultValue: true,
      },
      status: {
        type: DataTypes.ENUM('draft', 'active', 'completed', 'archived'),
        allowNull: false,
        defaultValue: 'draft',
      },
    },
    {
      indexes: [
        { fields: ['coordinator_id'] },
        { fields: ['status'] },
        { fields: ['start_date', 'end_date'] },
      ],
    }
  );

  return OjtProgram;
};

export const defineProgramStudent = (sequelize) => {
  const ProgramStudent = sequelize.define(
    'ProgramStudent',
    {
      id: {
        type: DataTypes.INTEGER,
        primaryKey: true,
        autoIncrement: true,
      },
      program_id: {
        type: DataTypes.INTEGER,
        allowNull: false,
        references: {
          model: 'ojt_programs',
          key: 'id',
        },
        onDelete: 'CASCADE',
      },
      student_id: {
        type: DataTypes.INTEGER,
        allowNull: false,
        references: {
          model: 'students',
          key: 'id',
        },
        onDelete: 'CASCADE',
      },
      status: {
        type: DataTypes.ENUM('active', 'suspended', 'completed', 'removed'),
        allowNull: false,
        defaultValue: 'active',
      },
      eligibility_status: {
        type: DataTypes.ENUM('eligible', 'ineligible', 'override'),
        allowNull: false,
        defaultValue: 'eligible',
      },
      notes: {
        type: DataTypes.TEXT,
        allowNull: true,
      },
      suspension_reason: {
        type: DataTypes.TEXT,
        allowNull: true,
      },
      override_reason: {
        type: DataTypes.TEXT,
        allowNull: true,
      },
      status_updated_at: {
        type: DataTypes.DATE,
        allowNull: true,
      },
      status_updated_by: {
        type: DataTypes.INTEGER,
        allowNull: true,
        references: {
          model: 'users',
          key: 'id',
        },
      },
    },
    {
      indexes: [
        { fields: ['program_id'] },
        { fields: ['student_id'] },
        { fields: ['status'] },
        { unique: true, fields: ['program_id', 'student_id'] },
      ],
    }
  );

  return ProgramStudent;
};

export const defineProgramCompany = (sequelize) => {
  const ProgramCompany = sequelize.define(
    'ProgramCompany',
    {
      id: {
        type: DataTypes.INTEGER,
        primaryKey: true,
        autoIncrement: true,
      },
      program_id: {
        type: DataTypes.INTEGER,
        allowNull: false,
        references: {
          model: 'ojt_programs',
          key: 'id',
        },
        onDelete: 'CASCADE',
      },
      company_id: {
        type: DataTypes.INTEGER,
        allowNull: false,
        references: {
          model: 'companies',
          key: 'id',
        },
        onDelete: 'CASCADE',
      },
      status: {
        type: DataTypes.ENUM('pending', 'approved', 'rejected', 'suspended'),
        allowNull: false,
        defaultValue: 'pending',
      },
      decision_note: {
        type: DataTypes.TEXT,
        allowNull: true,
      },
      rejection_reason: {
        type: DataTypes.TEXT,
        allowNull: true,
      },
      decided_by: {
        type: DataTypes.INTEGER,
        allowNull: true,
        references: {
          model: 'users',
          key: 'id',
        },
      },
      decided_at: {
        type: DataTypes.DATE,
        allowNull: true,
      },
    },
    {
      indexes: [
        { fields: ['program_id'] },
        { fields: ['company_id'] },
        { fields: ['status'] },
        { unique: true, fields: ['program_id', 'company_id'] },
      ],
    }
  );

  return ProgramCompany;
};

export const defineProgramPosting = (sequelize) => {
  const ProgramPosting = sequelize.define(
    'ProgramPosting',
    {
      id: {
        type: DataTypes.INTEGER,
        primaryKey: true,
        autoIncrement: true,
      },
      program_id: {
        type: DataTypes.INTEGER,
        allowNull: false,
        references: {
          model: 'ojt_programs',
          key: 'id',
        },
        onDelete: 'CASCADE',
      },
      posting_id: {
        type: DataTypes.INTEGER,
        allowNull: false,
        references: {
          model: 'ojt_postings',
          key: 'id',
        },
        onDelete: 'CASCADE',
      },
    },
    {
      indexes: [
        { fields: ['program_id'] },
        { fields: ['posting_id'] },
        { unique: true, fields: ['program_id', 'posting_id'] },
      ],
    }
  );

  return ProgramPosting;
};
