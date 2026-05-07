import { describe, it, expect, jest } from '@jest/globals';
import express from 'express';
import request from 'supertest';
import jwt from 'jsonwebtoken';
import { AuthService } from '../../src/services/AuthService.js';
import { authMiddleware } from '../../src/middleware/auth.js';
import createGoogleAuthRoutes from '../../src/routes/googleAuth.js';
import { config } from '../../src/config/env.js';

function createUser(overrides = {}) {
  const user = {
    id: 1,
    name: 'Test User',
    email: 'test@example.com',
    role: 'student',
    status: 'active',
    failedLoginAttempts: 0,
    lockedUntil: null,
    comparePassword: jest.fn().mockResolvedValue(true),
    update: jest.fn(async (data) => {
      Object.assign(user, data);
      return user;
    }),
    generateToken: () => jwt.sign(
      { id: user.id, email: user.email, role: user.role },
      config.auth.secret,
      { expiresIn: '1h' }
    ),
    ...overrides,
  };

  return user;
}

function createModels(overrides = {}) {
  const models = {
    sequelize: {
      transaction: jest.fn(async (callback) => callback({
        LOCK: { UPDATE: 'UPDATE' },
      })),
    },
    User: {
      findByEmail: jest.fn().mockResolvedValue(null),
      findByPk: jest.fn(),
      create: jest.fn(async (data) => createUser({
        id: 10,
        ...data,
        email: data.email,
      })),
    },
    Student: {
      create: jest.fn().mockResolvedValue({ id: 1 }),
    },
    Company: {
      create: jest.fn().mockResolvedValue({ id: 1 }),
    },
    PasswordResetToken: {
      create: jest.fn().mockResolvedValue({ id: 'token-id' }),
      findOne: jest.fn(),
    },
    ...overrides,
  };

  return models;
}

describe('Auth contract', () => {
  it('registers public student and company roles atomically', async () => {
    const models = createModels();
    const service = new AuthService(models);

    const student = await service.register({
      name: 'Student User',
      email: 'student@example.com',
      password: 'SecurePass123!',
      role: 'student',
    });

    const company = await service.register({
      name: 'Company User',
      email: 'company@example.com',
      password: 'SecurePass123!',
      role: 'company',
    });

    expect(student.user.role).toBe('student');
    expect(company.user.role).toBe('company');
    expect(models.sequelize.transaction).toHaveBeenCalledTimes(2);
    expect(models.Student.create).toHaveBeenCalledWith(
      expect.objectContaining({ user_id: 10 }),
      expect.any(Object)
    );
    expect(models.Company.create).toHaveBeenCalledWith(
      expect.objectContaining({
        user_id: 10,
        accreditation_status: 'pending',
        is_approved_for_posting: false,
      }),
      expect.any(Object)
    );
  });

  it('rejects coordinator public registration', async () => {
    const service = new AuthService(createModels());

    await expect(service.register({
      name: 'Coordinator User',
      email: 'coordinator@example.com',
      password: 'SecurePass123!',
      role: 'coordinator',
    })).rejects.toMatchObject({
      statusCode: 400,
      message: 'Invalid role. Must be student or company',
    });
  });

  it('allows company login while accreditation is pending', async () => {
    const user = createUser({
      id: 2,
      email: 'company@example.com',
      role: 'company',
      status: 'active',
    });
    const service = new AuthService(createModels({
      User: {
        findByEmail: jest.fn().mockResolvedValue(user),
      },
    }));

    const result = await service.login('company@example.com', 'SecurePass123!');

    expect(result.user.role).toBe('company');
    expect(user.comparePassword).toHaveBeenCalledWith('SecurePass123!');
  });

  it('locks the account on the fifth bad password with HTTP 423', async () => {
    const user = createUser({
      failedLoginAttempts: 4,
      comparePassword: jest.fn().mockResolvedValue(false),
    });
    const service = new AuthService(createModels({
      User: {
        findByEmail: jest.fn().mockResolvedValue(user),
      },
    }));

    await expect(service.login('test@example.com', 'WrongPassword123!')).rejects.toMatchObject({
      statusCode: 423,
    });

    expect(user.update).toHaveBeenCalledWith(expect.objectContaining({
      failedLoginAttempts: 5,
      lockedUntil: expect.any(Date),
    }));
  });

  it('stores only password reset token hashes', async () => {
    const user = createUser({ id: 3, email: 'reset@example.com' });
    const models = createModels({
      User: {
        findByEmail: jest.fn().mockResolvedValue(user),
      },
    });
    const service = new AuthService(models);

    const result = await service.forgotPassword('reset@example.com');
    const storedToken = models.PasswordResetToken.create.mock.calls[0][0].token;

    if (config.app.debug) {
      expect(result.resetToken).toContain('.');
    } else {
      expect(result.resetToken).toBeUndefined();
    }
    expect(storedToken).toMatch(/^[a-f0-9]{64}$/);
    expect(storedToken).not.toContain('.');
  });

  it('auth middleware fetches fresh DB user and denies suspended old tokens', async () => {
    const staleToken = jwt.sign(
      { id: 1, email: 'old@example.com', role: 'student', status: 'active' },
      config.auth.secret,
      { expiresIn: '1h' }
    );
    const app = express();
    app.set('models', {
      User: {
        findByPk: jest.fn().mockResolvedValue(createUser({
          status: 'suspended',
        })),
      },
    });
    app.get('/protected', authMiddleware, (req, res) => res.json({ ok: true }));

    const response = await request(app)
      .get('/protected')
      .set('Authorization', `Bearer ${staleToken}`);

    expect(response.status).toBe(403);
  });

  it('keeps Google OAuth routes unavailable by default', async () => {
    const app = express();
    app.use('/api/auth', createGoogleAuthRoutes({}));

    const response = await request(app).get('/api/auth/google/redirect');

    expect(response.status).toBe(503);
    expect(response.body.message).toBe('Google OAuth is currently unavailable');
  });
});
