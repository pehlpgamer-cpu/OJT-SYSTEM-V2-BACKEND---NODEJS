import { describe, it, expect, jest } from '@jest/globals';
import { Op } from 'sequelize';
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

  it('redacts secrets before values are stored', async () => {
    const createMock = jest.fn().mockResolvedValue({ id: 3 });
    const auditService = new AuditService({ AuditLog: { create: createMock } });

    await auditService.log({
      userId: 4,
      action: 'update',
      entityType: 'User',
      entityId: 4,
      newValues: {
        name: 'Alice Johnson',
        password: 'unsafe-value',
        session: { refreshToken: 'also-unsafe' },
      },
    });

    expect(createMock).toHaveBeenCalledWith(expect.objectContaining({
      new_values: {
        name: 'Alice Johnson',
        password: '[REDACTED]',
        session: { refreshToken: '[REDACTED]' },
      },
    }));
  });

  it('returns searched and filtered audit logs with actor and pagination metadata', async () => {
    const findAndCountAll = jest.fn().mockResolvedValue({
      count: 32,
      rows: [{
        toJSON: () => ({
          id: 12,
          action: 'update',
          user_id: 7,
          User: {
            id: 7,
            name: 'Casey Cruz',
            email: 'casey@example.com',
            role: 'coordinator',
          },
        }),
      }],
    });
    const User = {};
    const auditService = new AuditService({
      AuditLog: { findAndCountAll },
      User,
    });

    const result = await auditService.getAuditLogs({
      page: 2,
      limit: 10,
      search: '42',
      action: 'UPDATE',
      entity_type: 'Company',
      severity: 'HIGH',
      status: 'SUCCESS',
      user_role: 'COORDINATOR',
      start_date: '2026-08-01T00:00:00.000Z',
      end_date: '2026-08-06T23:59:59.999Z',
    });

    const query = findAndCountAll.mock.calls[0][0];
    expect(query.limit).toBe(10);
    expect(query.offset).toBe(10);
    expect(query.where.action).toBe('update');
    expect(query.where.severity).toBe('high');
    expect(query.where.status).toBe('success');
    expect(query.where.user_role).toBe('coordinator');
    expect(query.where.entity_type[Op.iLike]).toBe('Company');
    expect(query.where.createdAt[Op.gte]).toEqual(new Date('2026-08-01T00:00:00.000Z'));
    expect(query.where.createdAt[Op.lte]).toEqual(new Date('2026-08-06T23:59:59.999Z'));
    expect(query.where[Op.or]).toEqual(expect.arrayContaining([
      { id: 42 },
      { user_id: 42 },
      { entity_id: 42 },
    ]));
    expect(query.include[0]).toEqual(expect.objectContaining({ model: User, required: false }));
    expect(result.data[0].actor).toEqual({
      id: 7,
      name: 'Casey Cruz',
      email: 'casey@example.com',
      role: 'coordinator',
    });
    expect(result.pagination).toEqual({
      total: 32,
      page: 2,
      limit: 10,
      totalPages: 4,
      from: 11,
      to: 11,
      hasNextPage: true,
      hasPreviousPage: true,
    });
  });
});
