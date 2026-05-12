import { describe, it, expect, jest, beforeEach, afterEach } from '@jest/globals';

const TEST_DATABASE_URL = 'postgresql://neon_user:secret@ep-test-pooler.neon.tech/neondb?sslmode=require';

describe('Database configuration', () => {
  const originalEnv = process.env;

  beforeEach(() => {
    jest.resetModules();
    process.env = {
      ...originalEnv,
      APP_DEBUG: 'false',
      APP_ENV: 'production',
      DATABASE_URL: TEST_DATABASE_URL,
      JWT_SECRET: 'test-production-secret-key-1234567890',
      NODE_ENV: 'production',
    };
  });

  afterEach(() => {
    process.env = originalEnv;
    jest.resetModules();
  });

  async function importDatabaseWithMockedSequelize() {
    const mockPg = { Client: jest.fn() };
    const sequelizeInstance = {
      DataTypes: {},
      authenticate: jest.fn(),
      sync: jest.fn(),
    };
    const mockSequelize = jest.fn(() => sequelizeInstance);

    await jest.unstable_mockModule('pg', () => ({
      default: mockPg,
    }));

    await jest.unstable_mockModule('sequelize', () => ({
      Sequelize: mockSequelize,
    }));

    const databaseModule = await import('../../src/config/database.js');

    return {
      databaseModule,
      mockPg,
      mockSequelize,
      sequelizeInstance,
    };
  }

  it('passes DATABASE_URL as the Sequelize connection string', async () => {
    const { mockPg, mockSequelize } = await importDatabaseWithMockedSequelize();

    expect(mockSequelize).toHaveBeenCalledTimes(1);

    const [connectionString, options] = mockSequelize.mock.calls[0];

    expect(connectionString).toBe(TEST_DATABASE_URL);
    expect(options).not.toHaveProperty('url');
    expect(options).toEqual(expect.objectContaining({
      dialect: 'postgres',
      dialectModule: mockPg,
      logging: false,
      pool: expect.objectContaining({
        min: 0,
        max: 3,
      }),
      dialectOptions: expect.objectContaining({
        ssl: expect.objectContaining({
          require: true,
          rejectUnauthorized: false,
        }),
      }),
    }));
  });

  it('does not run schema sync during production startup', async () => {
    const { databaseModule, sequelizeInstance } = await importDatabaseWithMockedSequelize();

    await databaseModule.connectDatabase();

    expect(sequelizeInstance.authenticate).toHaveBeenCalledTimes(1);
    expect(sequelizeInstance.sync).not.toHaveBeenCalled();
  });
});
