import { describe, it, expect } from '@jest/globals';
import express from 'express';
import request from 'supertest';
import { body } from 'express-validator';
import { handleValidationErrors } from '../../src/middleware/validation.js';

describe('Validation middleware', () => {
  it('groups express-validator v7 errors by field path', async () => {
    const app = express();

    app.use(express.json());
    app.post(
      '/validate',
      body('name')
        .trim()
        .isLength({ min: 2 })
        .withMessage('Name must be between 2 and 255 characters'),
      body('password_confirmation')
        .custom((value, { req }) => {
          if (value !== req.body.password) {
            throw new Error('Passwords do not match');
          }
          return true;
        }),
      handleValidationErrors,
      (req, res) => res.json({ ok: true })
    );

    const response = await request(app)
      .post('/validate')
      .send({
        name: '',
        password: 'ValidPass123!',
        password_confirmation: 'DifferentPass123!',
      });

    expect(response.status).toBe(422);
    expect(response.body.errors).toHaveProperty('name');
    expect(response.body.errors).toHaveProperty('password_confirmation');
    expect(response.body.errors).not.toHaveProperty('undefined');
  });
});
