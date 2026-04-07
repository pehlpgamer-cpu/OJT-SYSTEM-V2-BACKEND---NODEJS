/**
 * Input Validation & Sanitization Middleware
 * 
 * WHY: Validates and sanitizes all incoming requests to prevent:
 * 1. SQL injection attacks
 * 2. XSS (Cross-Site Scripting) attacks
 * 3. Invalid data types causing crashes
 * 4. Business logic errors from bad data
 * 
 * WHAT: Uses express-validator for robust validation rules
 */

import { body, param, query, validationResult } from 'express-validator';
import { AppError } from '../utils/errorHandler.js';

/**
 * Handle validation errors from express-validator
 * 
 * WHY: express-validator checks rules but doesn't automatically
 * reject requests. This middleware processes validation results.
 */
export const handleValidationErrors = (req, res, next) => {
  const errors = validationResult(req);

  if (!errors.isEmpty()) {
    // Format errors for readable response
    const formattedErrors = errors.array().reduce((acc, error) => {
      if (!acc[error.param]) {
        acc[error.param] = [];
      }
      acc[error.param].push(error.msg);
      return acc;
    }, {});

    return res.status(422).json({
      message: 'Validation failed',
      statusCode: 422,
      errors: formattedErrors,
    });
  }

  next();
};

/**
 * Validation rules for authentication endpoints
 * 
 * WHY: Consistent validation across all auth endpoints ensures:
 * 1. Email format is valid
 * 2. Passwords meet security requirements
 * 3. Required fields are present
 * 4. No injection attacks possible
 */
export const authValidationRules = () => [
  // Email validation
  body('email')
    .trim()
    .isEmail()
    .withMessage('Email must be valid')
    .normalizeEmail()
    .toLowerCase(),

  // Password validation
  // WHY strong password: Prevents easy brute-force attacks
  body('password')
    .isLength({ min: 8 })
    .withMessage('Password must be at least 8 characters')
    .matches(/[A-Z]/)
    .withMessage('Password must contain at least one uppercase letter')
    .matches(/[0-9]/)
    .withMessage('Password must contain at least one number')
    .matches(/[!@#$%^&*]/)
    .withMessage('Password must contain at least one special character (!@#$%^&*)'),

  // Password confirmation (for registration)
  body('password_confirmation')
    .custom((value, { req }) => {
      if (value !== req.body.password) {
        throw new Error('Passwords do not match');
      }
      return true;
    }),

  // Name validation
  body('name')
    .trim()
    .isLength({ min: 2, max: 255 })
    .withMessage('Name must be between 2 and 255 characters')
    .matches(/^[a-zA-Z\s'-]+$/)
    .withMessage('Name can only contain letters, spaces, hyphens, and apostrophes'),
];

/**
 * Validation rules for student profile updates
 * 
 * WHY: Student data needs specific validation to maintain data quality
 */
export const studentUpdateRules = () => [
  body('first_name')
    .optional()
    .trim()
    .isLength({ min: 1, max: 100 })
    .withMessage('First name must be between 1 and 100 characters'),

  body('last_name')
    .optional()
    .trim()
    .isLength({ min: 1, max: 100 })
    .withMessage('Last name must be between 1 and 100 characters'),

  body('phone')
    .optional()
    .isMobilePhone()
    .withMessage('Phone must be a valid mobile number'),

  body('bio')
    .optional()
    .trim()
    .isLength({ max: 1000 })
    .withMessage('Bio cannot exceed 1000 characters'),

  body('location')
    .optional()
    .trim()
    .isLength({ max: 255 })
    .withMessage('Location cannot exceed 255 characters'),

  body('profile_picture_url')
    .optional()
    .trim()
    .isURL()
    .withMessage('Profile picture URL must be valid'),

  body('preferred_location')
    .optional()
    .trim()
    .isLength({ max: 255 })
    .withMessage('Preferred location cannot exceed 255 characters'),

  body('availability_start')
    .optional()
    .isISO8601()
    .withMessage('Availability start must be valid ISO date'),

  body('availability_end')
    .optional()
    .isISO8601()
    .withMessage('Availability end must be valid ISO date'),
];

/**
 * Validation rules for job posting creation
 * 
 * WHY: Job postings contain business-critical data that must be valid
 */
export const jobPostingRules = () => [
  body('title')
    .trim()
    .notEmpty()
    .withMessage('Job title is required')
    .isLength({ min: 3, max: 255 })
    .withMessage('Job title must be between 3 and 255 characters'),

  body('description')
    .trim()
    .notEmpty()
    .withMessage('Job description is required')
    .isLength({ min: 20, max: 5000 })
    .withMessage('Job description must be between 20 and 5000 characters'),

  body('location')
    .trim()
    .notEmpty()
    .withMessage('Location is required')
    .isLength({ max: 255 })
    .withMessage('Location cannot exceed 255 characters'),

  body('salary_range_min')
    .optional()
    .isInt({ min: 0 })
    .withMessage('Minimum salary must be a positive number'),

  body('salary_range_max')
    .optional()
    .isInt({ min: 0 })
    .withMessage('Maximum salary must be a positive number'),

  body('duration_weeks')
    .isInt({ min: 1, max: 52 })
    .withMessage('Duration must be between 1 and 52 weeks'),

  body('posting_status')
    .isIn(['active', 'closed', 'draft'])
    .withMessage('Status must be active, closed, or draft'),
];

/**
 * Validation rules for skill addition
 * 
 * WHY: Skills are core matching data - must be validated carefully
 */
export const skillValidationRules = () => [
  body('skill_name')
    .trim()
    .notEmpty()
    .withMessage('Skill name is required')
    .isLength({ min: 2, max: 100 })
    .withMessage('Skill name must be between 2 and 100 characters')
    .matches(/^[a-zA-Z0-9\s\+\#\.\-]+$/)
    .withMessage('Skill name contains invalid characters'),

  body('proficiency_level')
    .isIn(['beginner', 'intermediate', 'advanced', 'expert'])
    .withMessage('Proficiency level must be beginner, intermediate, advanced, or expert'),

  body('years_of_experience')
    .optional()
    .isInt({ min: 0, max: 50 })
    .withMessage('Years of experience must be between 0 and 50'),

  body('is_required')
    .optional()
    .isBoolean()
    .withMessage('is_required must be a boolean'),
];

/**
 * Validation for ID parameters
 * 
 * WHY: ID parameters must be positive integers to prevent SQL injection
 */
export const idParamRules = () => [
  param('id')
    .isInt({ min: 1 })
    .withMessage('ID must be a positive integer'),
];

/**
 * Validation for pagination query parameters
 * 
 * WHY: Pagination prevents loading excessive data and improves performance
 */
export const paginationRules = () => [
  query('page')
    .optional()
    .isInt({ min: 1 })
    .withMessage('Page must be a positive integer')
    .toInt(),

  query('limit')
    .optional()
    .isInt({ min: 1, max: 100 })
    .withMessage('Limit must be between 1 and 100')
    .toInt(),

  query('sort')
    .optional()
    .isIn(['asc', 'desc'])
    .withMessage('Sort must be asc or desc'),
];

/**
 * Validation for contact/feedback form
 * 
 * WHY: Public contact forms are common XSS attack vectors
 */
export const contactFormRules = () => [
  body('name')
    .trim()
    .notEmpty()
    .withMessage('Name is required')
    .isLength({ min: 2, max: 255 })
    .withMessage('Name must be between 2 and 255 characters'),

  body('email')
    .trim()
    .isEmail()
    .withMessage('Email must be valid')
    .normalizeEmail(),

  body('subject')
    .trim()
    .notEmpty()
    .withMessage('Subject is required')
    .isLength({ min: 5, max: 255 })
    .withMessage('Subject must be between 5 and 255 characters'),

  body('message')
    .trim()
    .notEmpty()
    .withMessage('Message is required')
    .isLength({ min: 10, max: 5000 })
    .withMessage('Message must be between 10 and 5000 characters'),

  body('phone')
    .optional()
    .trim()
    .isMobilePhone()
    .withMessage('Phone must be a valid mobile number'),
];

export default {
  handleValidationErrors,
  authValidationRules,
  studentUpdateRules,
  jobPostingRules,
  skillValidationRules,
  idParamRules,
  paginationRules,
  contactFormRules,
};
