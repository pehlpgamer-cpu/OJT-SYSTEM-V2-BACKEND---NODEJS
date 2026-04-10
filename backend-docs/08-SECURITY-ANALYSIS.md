# 08 - Security Analysis & OWASP Compliance

**Version:** 2.0.0  
**Security Standard:** OWASP Top 10 2021

---

## 🔐 OWASP Top 10 Compliance

### 1. Broken Access Control

**Risk:** Unauthorized access to resources  
**Mitigation:**

✅ **Implemented:**
- JWT authentication on all protected endpoints
- Role-Based Access Control (RBAC) middleware
- Resource ownership validation (users can only access their own data)
- Principle of least privilege (role-based)

```javascript
// Verify user owns the resource
const student = await Student.findOne({
  where: { user_id: req.user.id }
});
if (!student) throw new AppError('Access denied', 403);
```

---

### 2. Cryptographic Failures

**Risk:** Sensitive data exposure, weak encryption  
**Mitigation:**

✅ **Implemented:**
- Passwords hashed with bcrypt (10 rounds)
- JWT tokens with HS256 signing
- No plaintext passwords stored
- Secure token generation (UUID)
- Tokens expire after 7 days

```javascript
// Password hashing
const hashedPassword = await bcrypt.hash(plaintext, bcryptRounds);

// Token signing
const token = jwt.sign(data, JWT_SECRET, { expiresIn: '7d' });
```

**Recommendation:**
- Use HTTPS in production (enforce SSL/TLS)
- Consider adding encryption for sensitive fields (PII)

---

### 3. Injection

**Risk:** SQL injection, command injection, XSS  
**Mitigation:**

✅ **Implemented:**
- Sequelize ORM prevents SQL injection (parameterized queries)
- express-validator sanitizes/validates all inputs
- No direct SQL queries anywhere
- Helmet.js security headers

```javascript
// ✅ Safe - Sequelize parameterizes
await User.findOne({ where: { email: userInput } });

// ❌ Would be unsafe - but not done
await sequelize.query(`SELECT * FROM users WHERE email = '${userInput}'`);
```

**Input Validation:**
```javascript
body('name').matches(/^[a-zA-Z\s'-]+$/),
body('email').isEmail(),
body('phone').isMobilePhone()
```

---

### 4. Insecure Design

**Risk:** Missing security controls, poor threat modeling  
**Mitigation:**

✅ **Implemented:**
- Account lockout after 5 failed login attempts
- Password strength requirements enforced
- Email verification workflow
- Rate limiting on endpoints
- Audit logging for sensitive operations
- Input validation on all endpoints
- Error messages don't reveal information

```javascript
// Account lockout
if (failedAttempts >= 5) {
  user.status = 'locked';
  user.lockedUntil = new Date();
}

// Generic error messages
throw new AppError('Invalid email or password', 401);  // ✅ Safe
throw new AppError('User not found', 404);  // ❌ Would reveal info
```

---

### 5. Security Misconfiguration

**Risk:** Default credentials, exposed configs, unnecessary services  
**Mitigation:**

✅ **Implemented:**
- No default/hardcoded credentials
- Environment variables for sensitive config
- Helmet.js security headers (CSP, X-Frame-Options, etc)
- CORS properly configured (whitelist origins)
- DEBUG mode disabled in production

```javascript
// Security headers automatically set by Helmet
app.use(helmet());
// Sets: X-Frame-Options, X-Content-Type-Options, Strict-Transport-Security, etc

// Environment-based config
console.log(`App running in ${config.app.env} mode`);
if (config.app.env !== 'production') {
  config.logging = true;
}
```

---

### 6. Vulnerable and Outdated Components

**Risk:** Using packages with known vulnerabilities  
**Mitigation:**

✅ **Implemented:**
- Regular dependency updates (npm outdated)
- Only essential packages used (KISS principle)
- No unused dependencies
- Package versions pinned for reproducibility

**Recommended:**
```bash
# Regular audits
npm audit
npm audit fix

# Check outdated packages
npm outdated
```

---

### 7. Authentication Failures

**Risk:** Weak authentication, brute-force attacks  
**Mitigation:**

✅ **Implemented:**
- Passwords hashed with bcrypt (not plain)
- Account lockout (5 attempts, 30 minutes)
- Login attempts tracked
- Failed login attempts logged
- Password strength enforced (8 chars, upper, digit, special)
- Tokens expire (7 days)

```javascript
// Password requirements
body('password')
  .isLength({ min: 8 })
  .matches(/[A-Z]/)
  .matches(/[0-9]/)
  .matches(/[!@#$%^&*]/);

// Failed attempt tracking
const maxAttempts = 5;
if (failedAttempts >= maxAttempts) {
  account.lock();
}
```

---

### 8. Data Integrity Failures

**Risk:** Unauthorized modifications, tampering  
**Mitigation:**

✅ **Implemented:**
- JWT tokens signed (can't be tampered)
- Audit logging for changes
- Foreign key constraints enforce data integrity
- Soft deletes preserve history
- timestamps on all records

```javascript
// Audit logging
await AuditLog.create({
  user_id: req.user.id,
  entity_type: 'Application',
  action: 'update',
  old_values: oldApplicationState,
  new_values: newApplicationState
});

// Foreign keys enforce referential integrity
User.hasOne(Student, { onDelete: 'CASCADE' });
```

---

### 9. Logging & Monitoring Failures

**Risk:** Attacks undetected, forensic analysis impossible  
**Mitigation:**

✅ **Implemented:**
- Comprehensive audit logging
- Security events logged (login, logout, changes)
- Errors logged with context
- Logs persist to file
- Structured logging format

```javascript
// Security events logged
Logger.warn('Failed login attempt', {
  email: email,
  attempts: failedCount,
  ipAddress: req.ip,
  severity: 'high'
});

// Changes tracked
Logger.info('Application status updated', {
  applicationId: app.id,
  oldStatus: 'submitted',
  newStatus: 'hired',
  userId: req.user.id
});
```

---

### 10. SSRF (Server-Side Request Forgery)

**Risk:** Application makes requests to internal systems  
**Mitigation:**

✅ **Implemented:**
- No file uploads (no image upload endpoints)
- No external API calls to user-controlled URLs
- Database on localhost (not accessible externally)
- Whitelist approach for any external requests

---

## 🛡️ Additional Security Measures

### Rate Limiting

```javascript
const rateLimit = {
  windowMs: 15 * 60 * 1000,     // 15 minutes
  maxRequests: 100,              // 100 requests

  // Stricter for login
  login: {
    maxRequests: 5,              // 5 attempts
    reason: 'brute-force protection'
  }
};

// Applied globally
app.use(limiters.general);

// Stricter on sensitive endpoints
app.post('/api/auth/login', limiters.login, ...);
```

### CORS Security

```javascript
const corsOptions = {
  origin: ['http://localhost:3000', 'https://example.com'],  // Whitelist
  methods: ['GET', 'POST', 'PUT', 'DELETE'],
  credentials: true,
  maxAge: 3600
};

app.use(cors(corsOptions));
```

### SQL Injection Prevention

```javascript
// ✅ SAFE - Sequelize ORM
const user = await User.findOne({
  where: { email: userInput }  // Parameterized
});

// ❌ UNSAFE (not used)
await sequelize.query(
  `SELECT * FROM users WHERE email='${userInput}'`  // String interpolation
);
```

### XSS Prevention

```javascript
// Input validation removes XSS
body('bio')
  .trim()
  .escape()           // Escapes HTML
  .isLength({ max: 1000 });

// Helmet CSP headers
app.use(helmet.contentSecurityPolicy({
  directives: {
    scriptSrc: ["'self'"],  // Only scripts from same origin
  }
}));
```

---

## 🔍 Security Testing

### Test Account Lockout

```javascript
test('Account locks after 5 failed login attempts', async () => {
  for (let i = 0; i < 5; i++) {
    await authService.login(email, 'wrongPassword');
  }

  const user = await User.findByEmail(email);
  expect(user.status).toBe('locked');
  expect(user.lockedUntil).toBeDefined();
});
```

### Test Password Strength

```javascript
test('Weak password rejected', async () => {
  const weakPasswords = [
    '123',              // Too short
    'NoNumbers!',       // No number
    'nonumbers123!',    // No uppercase
    'NoSpecial123',     // No special char
  ];

  for (const pwd of weakPasswords) {
    await expect(
      authService.register({ ..., password: pwd })
    ).rejects.toThrow('Password requirements not met');
  }
});
```

### Test RBAC

```javascript
test('Non-admin cannot access admin endpoint', async () => {
  const studentToken = generateToken({ role: 'student' });

  const result = await request(app)
    .delete('/api/admin/users/1')
    .set('Authorization', `Bearer ${studentToken}`);

  expect(result.status).toBe(403);
  expect(result.body.message).toBe('Insufficient permissions');
});
```

---

## 🚨 Security Checklist

Production Deployment:

- [ ] Set `APP_ENV=production` in .env
- [ ] Set `APP_DEBUG=false` in .env
- [ ] Set strong `JWT_SECRET` (min 32 characters)
- [ ] Set `JWT_EXPIRES_IN` to reasonable value
- [ ] Configure `CORS_ORIGIN` to only trusted domains
- [ ] Enable HTTPS/SSL (not in code, use reverse proxy)
- [ ] Set up log rotation (logs grow large)
- [ ] Regular database backups
- [ ] Monitor failed login attempts
- [ ] Review audit logs regularly
- [ ] Keep dependencies updated
- [ ] Run `npm audit fix`
- [ ] Test authentication flows
- [ ] Test RBAC for all role types
- [ ] Verify rate limiting active
- [ ] Verify error messages don't leak info

---

## 📝 Security Policy

### Password Policy

- Minimum 8 characters
- At least 1 uppercase letter
- At least 1 digit
- At least 1 special character (!@#$%^&*)
- Must not be same as email
- Regular password changes recommended

### Session Policy

- JWT tokens valid for 7 days
- Token expires after 7 days of inactivity
- Re-login required after expiration
- No session sharing between devices

### Account Lockout Policy

- Account locks after 5 failed login attempts
- Locked for 30 minutes
- Attempts reset on successful login
- Admin can manually unlock

### Audit Logging

- All sensitive operations logged
- Logs retained for 90 days
- Errors logged with full context
- Failed auth attempts always logged
- Data changes tracked (old/new values)

---

## 🔗 Security Resources

- [OWASP Top 10 2021](https://owasp.org/Top10/)
- [OWASP Cheat Sheets](https://cheatsheetseries.owasp.org/)
- [NIST Password Guidelines](https://pages.nist.gov/800-63-3/)
- [JWT Best Practices](https://tools.ietf.org/html/rfc7519)

---

**Next:** See [**09-TESTING-GUIDE.md**](./09-TESTING-GUIDE.md) for testing documentation.
