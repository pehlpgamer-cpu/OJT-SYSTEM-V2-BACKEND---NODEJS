import { describe, it, expect, jest } from '@jest/globals';
import StudentService from '../../src/services/StudentService.js';

describe('StudentService program suspension enforcement', () => {
  it('blocks applications to postings linked to a suspended program enrollment', async () => {
    const mockTransaction = { LOCK: { UPDATE: 'UPDATE' } };
    const models = {
      sequelize: {
        transaction: jest.fn(async (callback) => callback(mockTransaction)),
      },
      Student: {
        findOne: jest.fn().mockResolvedValue({ id: 9, user_id: 3 }),
      },
      OjtPosting: {
        findByPk: jest.fn().mockResolvedValue({
          id: 12,
          posting_status: 'active',
          hasPositionsAvailable: jest.fn(() => true),
          incrementApplicationCount: jest.fn(),
        }),
      },
      ProgramPosting: {
        findAll: jest.fn().mockResolvedValue([{ id: 1, posting_id: 12 }]),
      },
      OjtProgram: {},
      ProgramStudent: {},
      Application: {
        findOne: jest.fn(),
        create: jest.fn(),
      },
    };

    const service = new StudentService(models);

    await expect(service.applyToPosting(3, 12, {
      cover_letter: 'Ready',
      resume_id: 2,
    })).rejects.toMatchObject({
      statusCode: 403,
      message: 'You are suspended from the OJT program for this posting',
    });

    expect(models.Application.create).not.toHaveBeenCalled();
  });

  it('excludes matches from suspended program postings', async () => {
    const models = {
      Student: {
        findOne: jest.fn().mockResolvedValue({ id: 9, user_id: 3 }),
      },
      ProgramStudent: {
        findAll: jest.fn().mockResolvedValue([{ program_id: 4 }]),
      },
      ProgramPosting: {
        findAll: jest.fn().mockResolvedValue([{ posting_id: 12 }]),
      },
      MatchScore: {
        findAll: jest.fn().mockResolvedValue([]),
      },
      OjtPosting: {},
    };

    const service = new StudentService(models);
    await service.getMatchedPostings(3, 70);

    const call = models.MatchScore.findAll.mock.calls[0][0];
    const notInSymbol = Object.getOwnPropertySymbols(call.where.posting_id)[0];

    expect(call.where.student_id).toBe(9);
    expect(call.where.posting_id[notInSymbol]).toEqual([12]);
  });
});
