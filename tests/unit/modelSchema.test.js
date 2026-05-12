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

    expect(models.Student.rawAttributes.user_id.references.model).toBe('users');
    expect(models.Application.rawAttributes.student_id.references.model).toBe('students');
    expect(models.Application.rawAttributes.posting_id.references.model).toBe('ojt_postings');
    expect(models.PasswordResetToken.rawAttributes.userId.references.model).toBe('users');

    await sequelize.close();
  });
});
