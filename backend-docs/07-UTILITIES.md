# 07 - Utilities & Error Handling

**Version:** 2.0.0  
**Location:** `src/utils/errorHandler.js`

---

## 🛡️ AppError Class

Custom error class for consistent error handling across application.

```javascript
export class AppError extends Error {
  constructor(message, statusCode = 500, context = {}) {
    super(message);
    this.statusCode = statusCode;
    this.context = context;
    this.timestamp = new Date().toISOString();
    Error.captureStackTrace(this, this.constructor);
  }

  toJSON(includeStack = false) {
    const response = {
      message: this.message,
      statusCode: this.statusCode,
      timestamp: this.timestamp,
    };

    if (config.app.debug && includeStack) {
      response.stack = this.stack;
    }

    return response;
  }
}
```

### Usage

```javascript
// Validation error
if (!user) {
  throw new AppError('User not found', 404);
}

// Business logic error
if (user.status === 'locked') {
  throw new AppError('Account is locked', 423);
}

// With context information
if (!user.isActive) {
  throw new AppError('User account is inactive', 403, {
    userId: user.id,
    reason: user.status
  });
}
```

### HTTP Status Codes

```javascript
200  // OK - Success
201  // Created - Resource created
400  // Bad Request - Invalid input
401  // Unauthorized - Missing/invalid auth
403  // Forbidden - Insufficient permissions
404  // Not Found - Resource doesn't exist
409  // Conflict - Duplicate email, duplicate application
422  // Unprocessable Entity - Validation failed
423  // Locked - Account locked
500  // Internal Server Error - Unexpected error
```

---

## 📝 Logger Class

Structured logging for debugging and monitoring.

```javascript
export class Logger {
  static LEVELS = {
    ERROR: 'ERROR',
    WARN: 'WARN',
    INFO: 'INFO',
    DEBUG: 'DEBUG',
  };
}
```

### Logging Levels

#### error(message, error = null, meta = {})

Log errors and exceptions.

```javascript
Logger.error('Failed to save user', error, {
  userId: user.id,
  email: user.email
});

// Output: [ERROR] Failed to save user { userId: 1, email: 'john@example.com', errorMessage: '...', errorStack: '...' }
```

**When to use:**
- Uncaught exceptions
- Critical operation failures
- Database errors
- Authentication failures

---

#### warn(message, meta = {})

Log warnings about potential issues.

```javascript
Logger.warn('Failed login attempt', {
  email: 'john@example.com',
  attempts: 4,
  ipAddress: '192.168.1.1'
});

// Output: [WARN] Failed login attempt { email: 'john@example.com', attempts: 4, ... }
```

**When to use:**
- Too many failed login attempts
- Suspicious activity
- Deprecated API calls
- Resource limits approaching

---

#### info(message, meta = {})

Log general information about app flow.

```javascript
Logger.info('User registered successfully', {
  userId: user.id,
  email: user.email,
  role: user.role
});

// Output: [INFO] User registered successfully { userId: 1, email: 'john@example.com', role: 'student' }
```

**When to use:**
- Successful operations
- Important state changes
- User actions (login, registration)
- Business event completion

---

#### debug(message, meta = {})

Log detailed debugging info (development only).

```javascript
Logger.debug('User authenticated', { userId: decoded.id, email: decoded.email });

// Output (dev only): [DEBUG] User authenticated { userId: 1, email: 'john@example.com' }
```

**When to use:**
- Variable values
- Function entry/exit
- State snapshots
- Conditional branches taken

---

### Log Output Destinations

#### Console (Development)
```
[ERROR] Failed to save user { userId: 1, email: 'john@example.com' }
[WARN]  Failed login attempt { email: 'john@example.com', attempts: 4 }
[INFO]  User registered { userId: 1, email: 'john@example.com', role: 'student' }
[DEBUG] User authenticated { userId: 1 }
```

#### File (Production & Errors)
```json
{"timestamp":"2026-04-08T10:30:00Z","level":"ERROR","message":"Failed to save user","userId":1,"email":"john@example.com","errorMessage":"...","errorStack":"..."}
{"timestamp":"2026-04-08T10:31:00Z","level":"WARN","message":"Failed login attempt","email":"john@example.com","attempts":4}
```

**Log file location:** `./logs/app.log`

---

## 🔄 Error Handling Patterns

### Try-Catch in Services

```javascript
export class AuthService {
  async login(email, password) {
    try {
      // Business logic here
      const user = await this.models.User.findByEmail(email);
      if (!user) {
        throw new AppError('Invalid credentials', 401);
      }
    } catch (error) {
      Logger.error('Login failed', error, { email });
      throw error;  // Re-throw for caller to handle
    }
  }
}
```

### Try-Catch in Routes

```javascript
app.post('/api/auth/login', async (req, res, next) => {
  try {
    const result = await authService.login(
      req.body.email,
      req.body.password
    );
    res.status(200).json(result);
  } catch (error) {
    next(error);  // Pass to error handler middleware
  }
});
```

### Error Handler Middleware

```javascript
// Last middleware in the chain
app.use((error, req, res, next) => {
  // Log all errors
  if (error instanceof AppError) {
    Logger.warn(error.message, error.context);
    res.status(error.statusCode).json(error.toJSON());
  } else {
    Logger.error('Unhandled error', error);
    res.status(500).json({
      message: 'Internal server error',
      statusCode: 500,
      timestamp: new Date().toISOString()
    });
  }
});
```

---

## 🎁 Wrapper Functions

### wrap() - Error Wrapper

Wraps async route handlers to auto-catch errors.

```javascript
// Without wrap - manual try-catch needed
app.post('/api/users', async (req, res, next) => {
  try {
    const user = await User.create(req.body);
    res.status(201).json(user);
  } catch (error) {
    next(error);
  }
});

// With wrap - automatic error catching
app.post('/api/users',
  wrap(async (req, res) => {
    const user = await User.create(req.body);
    res.status(201).json(user);
  })
);
```

### Implementation

```javascript
export const wrap = (fn) => {
  return (req, res, next) => {
    Promise.resolve(fn(req, res, next)).catch(next);
  };
};
```

---

## 🧪 Testing Error Handling

### Test Custom Error

```javascript
test('AppError should format as JSON', () => {
  const error = new AppError('Invalid email', 422, { email: 'bad@' });
  
  const json = error.toJSON();
  
  expect(json.message).toBe('Invalid email');
  expect(json.statusCode).toBe(422);
  expect(json.timestamp).toBeDefined();
});
```

### Test Logger

```javascript
test('Logger.error should call console.log in debug mode', () => {
  jest.spyOn(console, 'log');
  
  Logger.error('Test error', new Error('msg'), { key: 'value' });
  
  expect(console.log).toHaveBeenCalled();
});
```

### Test Error Handling in Routes

```javascript
test('Route should catch and handle errors', async () => {
  app.get('/api/test',
    wrap(async (req, res) => {
      throw new AppError('Test error', 500);
    })
  );

  const result = await request(app).get('/api/test');
  
  expect(result.status).toBe(500);
  expect(result.body.message).toBe('Test error');
});
```

---

## 🔧 Debugging Tips

### Enable Debug Mode

```bash
# Set APP_DEBUG=true in .env
APP_DEBUG=true

# All logs will be printed to console
# Error stack traces included
# SQL queries logged
```

### View Logs

```bash
# Tail log file in real-time
tail -f ./logs/app.log

# Search for errors
grep "ERROR" ./logs/app.log

# Search for specific user
grep "userId: 1" ./logs/app.log
```

### Debug Specific Module

```javascript
// Add debug logs to specific module
console.time('operation');
// ... code ...
console.timeEnd('operation');
// Output: operation: 45.123ms
```

---

## 🐛 Common Error Messages

| Message | Cause | Solution |
|---------|-------|----------|
| "Token has expired" | JWT token older than 7 days | Re-login to get new token |
| "Invalid token" | Token corrupted or forged | Clear localStorage, re-login |
| "Too many requests" | Rate limit exceeded | Wait 15 minutes |
| "Account is locked" | 5 failed login attempts | Wait 30 minutes to unlock |
| "Email already registered" | Duplicate email | Use different email |
| "Password requirements not met" | Password too weak | Use 8+ chars, uppercase, digit, special |
| "User not found" | No user with that ID/email | Check typo in email |
| "Insufficient permissions" | User role not allowed | Check user's role |

---

## 📊 Error Tracking

### Common Error Patterns

```javascript
// Validation Errors (422)
- Email format invalid
- Password too weak
- Required field missing
- Invalid enum values

// Auth Errors (401/403)
- Missing token
- Invalid token
- Token expired
- Credentials invalid
- Account inactive

// Not Found Errors (404)
- User not found
- Application not found
- Posting not found
- Student profile not found

// Conflict Errors (409)
- Email already registered
- Duplicate application (same student + posting)

// Rate Limit Errors (429)
- Too many login attempts
- Too many requests
- Too many password resets
```

---

## 🔐 Security in Error Handling

### Never Expose Sensitive Info

```javascript
// ❌ BAD - Exposes database details
throw new Error('SQL: SELECT * FROM users WHERE email = "john@example.com"');

// ✅ GOOD - Generic error message
throw new AppError('Invalid email or password', 401);
```

### Don't Log Passwords

```javascript
// ❌ BAD - Password in logs
Logger.info('User login', { email, password });  // NEVER!

// ✅ GOOD - Only non-sensitive info
Logger.info('User login', { email });
```

### Use Status Codes Properly

```javascript
// ❌ BAD - Reveals email doesn't exist (404)
if (user not found) {
  throw new AppError('Email not registered', 404);
}

// ✅ GOOD - Generic message
if (user not found) {
  throw new AppError('Invalid email or password', 401);
}
```

---

**Next:** See [**08-SECURITY-ANALYSIS.md**](./08-SECURITY-ANALYSIS.md) for comprehensive security analysis.
