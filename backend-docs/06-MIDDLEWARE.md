# 06 - Middleware Documentation

**Version:** 2.0.0  
**Location:** `src/middleware/`

---

## 🔐 Middleware Architecture

Middleware processes HTTP requests in order (middleware stack):

```
Request
  ↓
Helmet (security headers)
  ↓
CORS (cross-origin)
  ↓
express.json() (body parsing)
  ↓
Morgan (logging)
  ↓
authMiddleware (JWT verification)
  ↓
rbacMiddleware (role checking)
  ↓
handleValidationErrors (validation)
  ↓
Route Handler
  ↓
Response
```

---

## 🔐 Authentication Middleware

**File:** `src/middleware/auth.js`

### authMiddleware

Verifies JWT token and attaches decoded user to `req.user`.

```javascript
export const authMiddleware = (req, res, next) => {
  try {
    // 1. Extract token from Authorization header
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      throw new AppError('Missing or invalid Authorization header', 401);
    }

    // 2. Remove "Bearer " prefix
    const token = authHeader.slice(7);

    // 3. Verify token signature and expiration
    const decoded = jwt.verify(token, config.auth.secret);

    // 4. Attach user data to request
    req.user = decoded;  // { id, email, role, iat, exp }

    Logger.debug('User authenticated', { userId: decoded.id });

    next();
  } catch (error) {
    if (error.name === 'TokenExpiredError') {
      return res.status(401).json({
        message: 'Token has expired',
        statusCode: 401,
      });
    }

    if (error.name === 'JsonWebTokenError') {
      return res.status(401).json({
        message: 'Invalid token',
        statusCode: 401,
      });
    }

    // Forward if AppError
    if (error instanceof AppError) {
      return res.status(error.statusCode).json(error.toJSON());
    }

    res.status(401).json({
      message: 'Authentication failed',
      statusCode: 401,
    });
  }
};
```

**Usage:**
```javascript
// Protect route - requires authentication
app.get('/api/student/profile',
  authMiddleware,  // Added to middleware stack
  studentController.getProfile
);
```

**Token Structure:**
```javascript
{
  id: 1,
  email: 'john@example.com',
  role: 'student',
  iat: 1712600123,      // Issued at (seconds since epoch)
  exp: 1713205123       // Expiration (seconds since epoch)
}
```

---

### rbacMiddleware

Role-Based Access Control - Check if user has required role.

```javascript
export const rbacMiddleware = (allowedRoles = []) => {
  return (req, res, next) => {
    // 1. authMiddleware should have run first
    if (!req.user) {
      return res.status(401).json({
        message: 'User not authenticated',
        statusCode: 401,
      });
    }

    // 2. If no roles specified, allow any authenticated user
    if (allowedRoles.length === 0) {
      return next();
    }

    // 3. Check if user's role is in allowed list
    if (!allowedRoles.includes(req.user.role)) {
      Logger.warn('Unauthorized access attempt', {
        userId: req.user.id,
        userRole: req.user.role,
        requiredRoles: allowedRoles,
        path: req.path,
      });

      return res.status(403).json({
        message: 'Insufficient permissions',
        statusCode: 403,
      });
    }

    next();
  };
};
```

**Usage:**
```javascript
// 1. Only students can access
app.get('/api/student/profile',
  authMiddleware,
  rbacMiddleware(['student']),
  studentController.getProfile
);

// 2. Admin or coordinator can access
app.put('/api/admin/applications/:id/status',
  authMiddleware,
  rbacMiddleware(['admin', 'coordinator']),
  adminController.updateApplicationStatus
);

// 3. Anyone authenticated can access
app.get('/api/user/profile',
  authMiddleware,
  userController.getProfile
);
```

**Roles:**
- `student` - Student user
- `company` - Company recruiter
- `coordinator` - Faculty coordinator
- `admin` - System administrator

---

### createRateLimiters

Create rate limiters to prevent brute-force attacks.

```javascript
export const createRateLimiters = () => {
  const windowMs = config.rateLimit.windowMs;   // 15 minutes
  const maxRequests = config.rateLimit.maxRequests;  // 100

  return {
    // General rate limiter
    general: rateLimit({
      windowMs,
      maxRequests,
      message: 'Too many requests, please try again later',
      standardHeaders: true,
      legacyHeaders: false,
    }),

    // Stricter limit for login (prevent brute-force)
    login: rateLimit({
      windowMs: 15 * 60 * 1000,  // 15 minutes
      maxRequests: 5,             // Max 5 attempts
      message: 'Too many login attempts, please try again later',
    }),

    // Stricter limit for password reset
    resetPassword: rateLimit({
      windowMs: 60 * 60 * 1000,  // 1 hour
      maxRequests: 3,             // Max 3 attempts
      message: 'Too many password reset attempts',
    }),
  };
};
```

**Usage:**
```javascript
const limiters = createRateLimiters();

// Apply general rate limit to all routes
app.use(limiters.general);

// Apply stricter login limit
app.post('/api/auth/login',
  limiters.login,
  authController.login
);

// Apply stricter password reset limit
app.post('/api/auth/reset-password',
  limiters.resetPassword,
  authController.resetPassword
);
```

---

## ✅ Validation Middleware

**File:** `src/middleware/validation.js`

### handleValidationErrors

Process validation results from express-validator.

```javascript
export const handleValidationErrors = (req, res, next) => {
  const errors = validationResult(req);

  if (!errors.isEmpty()) {
    // Format errors into readable structure
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
```

**Response Format:**
```javascript
{
  "message": "Validation failed",
  "statusCode": 422,
  "errors": {
    "email": ["Email must be valid"],
    "password": [
      "Password must be at least 8 characters",
      "Password must contain at least one uppercase letter"
    ],
    "name": ["Name must be between 2 and 255 characters"]
  }
}
```

---

### authValidationRules

Validation rules for authentication endpoints.

```javascript
export const authValidationRules = () => [
  // Email validation
  body('email')
    .trim()
    .isEmail()
    .withMessage('Email must be valid')
    .normalizeEmail()
    .toLowerCase(),

  // Password validation
  body('password')
    .isLength({ min: 8 })
    .withMessage('Password must be at least 8 characters')
    .matches(/[A-Z]/)
    .withMessage('Password must contain at least one uppercase letter')
    .matches(/[0-9]/)
    .withMessage('Password must contain at least one number')
    .matches(/[!@#$%^&*]/)
    .withMessage('Password must contain at least one special character (!@#$%^&*)'),

  // Password confirmation (only in registration)
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
```

**Usage:**
```javascript
app.post('/api/auth/register',
  ...authValidationRules(),  // Spread the array
  handleValidationErrors,    // Process validation
  authController.register
);
```

---

### studentUpdateRules

Validation rules for student profile updates.

```javascript
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

  body('preferred_location')
    .optional()
    .trim()
    .isLength({ max: 255 })
    .withMessage('Preferred location cannot exceed 255 characters'),

  body('gpa')
    .optional()
    .isFloat({ min: 0, max: 4.0 })
    .withMessage('GPA must be between 0 and 4.0'),

  body('availability_start')
    .optional()
    .isISO8601()
    .withMessage('Availability start must be valid ISO 8601 date'),

  body('availability_end')
    .optional()
    .isISO8601()
    .withMessage('Availability end must be valid ISO 8601 date'),
];
```

---

## 📝 Custom Validators

### Email Uniqueness Check

```javascript
body('email')
  .isEmail()
  .withMessage('Email must be valid')
  .custom(async (email) => {
    const existingUser = await User.findOne({ where: { email } });
    if (existingUser) {
      throw new Error('Email already in use');
    }
  }),
```

### Cross-field Validation

```javascript
// Password confirmation must match password
body('password_confirmation').custom((value, { req }) => {
  if (value !== req.body.password) {
    throw new Error('Passwords do not match');
  }
  return true;
}),
```

### Custom Async Validator

```javascript
// Check if user exists (async)
param('userId')
  .custom(async (value) => {
    const user = await User.findByPk(value);
    if (!user) {
      throw new Error('User not found');
    }
  }),
```

---

## 🔄 Middleware Order

Order matters! Middleware executes sequentially:

```javascript
// CORRECT ORDER
app.use(helmet());                    // 1. Security
app.use(cors());                      // 2. CORS
app.use(express.json());              // 3. Parse JSON
app.use(morgan('combined'));          // 4. Log requests
app.use(authMiddleware);              // 5. Auth BEFORE rbac
app.use(rbacMiddleware());            // 6. RBAC AFTER auth
app.use(handleValidationErrors);      // 7. Validation BEFORE routes
app.post('/api/auth/register',
  ...authValidationRules(),
  handleValidationErrors,
  authController.register
);
```

### Why Order Matters

```javascript
// ❌ WRONG - authMiddleware checks req.user but it hasn't been set yet
app.use(rbacMiddleware(['student']));
app.use(authMiddleware);

// ✅ CORRECT - authMiddleware runs first, sets req.user
app.use(authMiddleware);
app.use(rbacMiddleware(['student']));
```

---

## 🚫 Error Handling in Middleware

Errors in middleware caught by error handler:

```javascript
// Middleware can throw AppError
export const requireAdmin = (req, res, next) => {
  if (req.user?.role !== 'admin') {
    // Express catches this and passes to error handler
    throw new AppError('Admin access required', 403);
  }
  next();
};
```

---

## 🧪 Testing Middleware

### Test authMiddleware

```javascript
test('authMiddleware should set req.user for valid token', () => {
  const mockToken = jwt.sign(
    { id: 1, email: 'test@example.com', role: 'student' },
    config.auth.secret
  );

  const req = {
    headers: { authorization: `Bearer ${mockToken}` }
  };
  const res = {};
  const next = jest.fn();

  authMiddleware(req, res, next);

  expect(req.user).toBeDefined();
  expect(req.user.id).toBe(1);
  expect(next).toHaveBeenCalled();
});

test('authMiddleware should reject missing token', () => {
  const req = { headers: {} };
  const res = { status: jest.fn().mockReturnThis(), json: jest.fn() };
  const next = jest.fn();

  authMiddleware(req, res, next);

  expect(res.status).toHaveBeenCalledWith(401);
  expect(next).not.toHaveBeenCalled();
});
```

---

**Next:** See [**07-UTILITIES.md**](./07-UTILITIES.md) for utility functions documentation.
