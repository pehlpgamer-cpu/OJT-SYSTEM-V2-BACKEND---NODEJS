import { describe, it, expect } from '@jest/globals';
import { Sequelize } from 'sequelize';
import { initializeModels } from '../../src/models/index.js';

function createSequelize() {
  return new Sequelize('postgresql://user:pass@example.com:5432/ojt', {
    dialect: 'postgres',
    logging: false,
    define: {
      underscored: true,
      freezeTableName: false,
      paranoid: true,
    },
  });
}

describe('Model schema naming', () => {
  it('keeps table names and foreign key references aligned with production config', async () => {
    const sequelize = createSequelize();
    const models = initializeModels(sequelize);

    expect(models.User.tableName).toBe('users');
    expect(models.Student.tableName).toBe('students');
    expect(models.OjtPosting.tableName).toBe('ojt_postings');
    expect(models.OjtProgram.tableName).toBe('ojt_programs');
    expect(models.ProgramStudent.tableName).toBe('program_students');
    expect(models.ProgramCompany.tableName).toBe('program_companies');
    expect(models.ProgramPosting.tableName).toBe('program_postings');

    expect(models.Student.rawAttributes.user_id.references.model).toBe('users');
    expect(models.Company.rawAttributes.accreditation_verified_by.references.model).toBe('users');
    expect(models.Application.rawAttributes.student_id.references.model).toBe('students');
    expect(models.Application.rawAttributes.posting_id.references.model).toBe('ojt_postings');
    expect(models.PasswordResetToken.rawAttributes.userId.references.model).toBe('users');
    expect(models.OjtProgram.rawAttributes.coordinator_id.references.model).toBe('coordinators');
    expect(models.ProgramStudent.rawAttributes.program_id.references.model).toBe('ojt_programs');
    expect(models.ProgramStudent.rawAttributes.student_id.references.model).toBe('students');
    expect(models.ProgramStudent.rawAttributes.status_updated_by.references.model).toBe('users');
    expect(models.ProgramCompany.rawAttributes.program_id.references.model).toBe('ojt_programs');
    expect(models.ProgramCompany.rawAttributes.company_id.references.model).toBe('companies');
    expect(models.ProgramCompany.rawAttributes.decided_by.references.model).toBe('users');
    expect(models.ProgramPosting.rawAttributes.program_id.references.model).toBe('ojt_programs');
    expect(models.ProgramPosting.rawAttributes.posting_id.references.model).toBe('ojt_postings');

    expect(models.Company.rawAttributes.accreditation_decision_note).toBeDefined();
    expect(models.Company.rawAttributes.accreditation_rejection_reason).toBeDefined();
    expect(models.Company.rawAttributes.accreditation_verified_by).toBeDefined();

    await sequelize.close();
  });
});
