import { describe, it, expect, jest } from '@jest/globals';
import CoordinatorService from '../../src/services/CoordinatorService.js';

function createService(models = {}) {
  const service = new CoordinatorService({
    Coordinator: { findOne: jest.fn() },
    OjtProgram: { create: jest.fn(), findByPk: jest.fn() },
    ProgramCompany: { update: jest.fn() },
    Company: { findByPk: jest.fn() },
    ...models,
  });

  service.auditService = {
    log: jest.fn(),
    logDataChange: jest.fn(),
  };
  service.notificationService = {
    notify: jest.fn(),
  };

  return service;
}

describe('CoordinatorService', () => {
  it('approves company accreditation, posting rights, notification, and audit', async () => {
    const company = {
      id: 5,
      user_id: 44,
      accreditation_status: 'pending',
      is_approved_for_posting: false,
      toJSON: () => ({ id: 5, accreditation_status: company.accreditation_status }),
      update: jest.fn(async (data) => {
        Object.assign(company, data);
        return company;
      }),
    };
    const service = createService({
      Company: { findByPk: jest.fn().mockResolvedValue(company) },
      ProgramCompany: { update: jest.fn().mockResolvedValue([1]) },
    });

    const result = await service.updateCompanyAccreditation(
      5,
      { id: 7, role: 'coordinator' },
      { status: 'approved', note: 'Docs valid' }
    );

    expect(result.accreditation_status).toBe('approved');
    expect(result.is_approved_for_posting).toBe(true);
    expect(company.update).toHaveBeenCalledWith(expect.objectContaining({
      accreditation_status: 'approved',
      accreditation_decision_note: 'Docs valid',
      accreditation_rejection_reason: null,
      accreditation_verified_by: 7,
      is_approved_for_posting: true,
    }));
    expect(service.notificationService.notify).toHaveBeenCalledWith(44, expect.objectContaining({
      title: 'Company Approved',
      type: 'account_update',
    }));
    expect(service.auditService.logDataChange).toHaveBeenCalledWith(
      7,
      'Company',
      5,
      expect.any(Object),
      expect.any(Object),
      'Company accreditation approved',
      { userRole: 'coordinator' }
    );
  });

  it('requires rejection reason before rejecting a company', async () => {
    const service = createService();

    await expect(service.updateCompanyAccreditation(
      5,
      { id: 7, role: 'coordinator' },
      { status: 'rejected' }
    )).rejects.toMatchObject({
      statusCode: 422,
      message: 'Rejection reason is required',
    });
  });

  it('exports placement reports as escaped CSV', () => {
    const service = createService();

    const csv = service.placementReportToCsv({
      rows: [
        {
          application_id: 1,
          student_name: 'Jane, Doe',
          student_email: 'jane@example.com',
          academic_program: 'BSIT',
          company_name: 'ACME "Labs"',
          posting_title: 'QA Intern',
          status: 'hired',
          match_score: 91,
          applied_at: '2026-06-01',
          hired_at: '2026-06-10',
        },
      ],
    });

    expect(csv).toContain('"Jane, Doe"');
    expect(csv).toContain('"ACME ""Labs"""');
  });
});
