import { describe, it, expect, jest } from '@jest/globals';
import { AuditService } from '../../src/services/NotificationService.js';

describe('AuditService', () => {
  it('uses a descriptive reason for login events', async () => {
    const createMock = jest.fn().mockResolvedValue({ id: 1 });
    const auditService = new AuditService({
      AuditLog: { create: createMock },
      User: {
        findByPk: jest.fn().mockResolvedValue({ id: 4, name: 'Alice Johnson', email: 'alice@example.com' }),
      },
    });

    await auditService.logLogin(4, '127.0.0.1', 'Mozilla/5.0');

    expect(createMock).toHaveBeenCalledWith(expect.objectContaining({
      reason: 'Alice Johnson logged in',
    }));
  });

  it('uses a descriptive reason for entity updates', async () => {
    const createMock = jest.fn().mockResolvedValue({ id: 2 });
    const auditService = new AuditService({
      AuditLog: { create: createMock },
      Company: {
        findByPk: jest.fn().mockResolvedValue({ id: 36, company_name: 'Acme Labs' }),
      },
    });

    await auditService.logDataChange(7, 'Company', 36, null, { company_name: 'Acme Labs' }, null);

    expect(createMock).toHaveBeenCalledWith(expect.objectContaining({
      reason: 'Company Acme Labs updated',
    }));
  });
});
