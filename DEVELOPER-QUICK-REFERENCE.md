# OJT System V2 - Developer Quick Reference

**Last Updated**: April 2026 | **Version**: 2.0.0

---

## 🚀 Quick Start

```bash
# Clone repository
git clone <repo-url>
cd OJT-SYSTEM-V2-BACKEND

# Install dependencies
npm install

# Setup environment
cp .env.example .env
# Edit .env with your configuration

# Run migrations/seed database
npm run seed

# Start development server
npm run dev

# Run tests
npm test
npm run test:watch
npm run test:integration
```

---

## 📁 Project Structure

```
src/
├── config/            # Environment & database config
│   ├── env.js        # Loads and validates environment variables
│   └── database.js   # Sequelize initialization
│
├── models/           # Database models (10 total)
│   └── User, Student, Company, OjtPosting, Skill, Application, etc.
│
├── services/         # Business logic (4 core services)
│   ├── AuthService.js
│   ├── StudentService.js
│   ├── MatchingService.js
│   └── NotificationService.js
│
├── middleware/       # Express middleware
│   ├── auth.js      # JWT validation & RBAC
│   └── validation.js # Input validation
│
├── utils/
│   └── errorHandler.js # Custom error classes & logging
│
└── server.js         # Main Express app setup
```

---

## 🔑 Key Concepts

### Authentication Flow
```
Request → Extract JWT → Verify Signature → Extract Claims → Attach to req.user
```

**Usage in routes:**
```javascript
// Protect route with authentication
app.get('/api/profile', authMiddleware, (req, res) => {
  // req.user = { id, email, role, status }
});

// Add role-based access control
app.post('/api/admin/users', authMiddleware, rbacMiddleware(['admin']), handler);
```

### Matching Algorithm
```
Score = (40% × Skill Match) + (20% × Location) + (20% × Availability) 
        + (10% × GPA) + (10% × Endorsements)
```

**Weights configured in:**
- `src/models/Matching.js` → `MatchingRule` model
- Adjustable per deployment via `MatchingService`

### Error Handling
```javascript
// Throw custom error in services
throw new AppError('User not found', 404, { userId: 123 });

// Caught by errorHandler middleware
// Returns: { message, statusCode, timestamp, stack (dev only) }
```

---

## 📝 Common Tasks

### Add a New Endpoint

**Step 1: Create route in server.js**
```javascript
// In server.js (after models initialization)
app.post('/api/resource', authMiddleware, rbacMiddleware(['admin']), async (req, res, next) => {
  try {
    const result = await ResourceService.create(req.body);
    res.status(201).json(result);
  } catch (error) {
    next(error);
  }
});
```

**Step 2: Add corresponding service method**
```javascript
// In services/ResourceService.js
static async create(data) {
  const resource = await Resource.create(data);
  Logger.info('Resource created', { id: resource.id });
  return resource;
}
```

**Step 3: Add to tests**
```javascript
describe('POST /api/resource', () => {
  it('should create resource', async () => {
    const response = await request(app)
      .post('/api/resource')
      .set('Authorization', `Bearer ${token}`)
      .send({ name: 'Test' });
    
    expect(response.status).toBe(201);
    expect(response.body).toHaveProperty('id');
  });
});
```

### Add a Validation Rule

```javascript
// In middleware/validation.js
import { body, validationResult } from 'express-validator';

// Create validator chain
export const validateCreateResource = [
  body('name')
    .trim()
    .notEmpty().withMessage('Name is required')
    .isLength({ max: 100 }).withMessage('Name too long'),
  body('email')
    .isEmail().withMessage('Invalid email'),
  handleValidationErrors, // Middleware that checks results
];

// Use in route
app.post('/api/resource', validateCreateResource, handler);
```

### Query Database

**Single record:**
```javascript
const student = await Student.findByPk(studentId);
const user = await User.findOne({ where: { email } });
```

**Multiple records with relations:**
```javascript
const students = await Student.findAll({
  include: ['skills', 'applications'],
  where: { status: 'active' },
  limit: 10,
  offset: 0,
});
```

**Aggregation:**
```javascript
const count = await Application.count({ where: { status: 'submitted' } });
const grouped = await Application.findAll({
  attributes: ['status', [sequelize.fn('COUNT', sequelize.col('id')), 'count']],
  group: ['status'],
});
```

### Add Error Logging

```javascript
import { Logger, AppError } from '../utils/errorHandler.js';

// Log at different levels
Logger.error('Critical issue', error, { userId: 123 });
Logger.warn('Unusual behavior', { event: 'duplicate_login' });
Logger.info('Successful operation', { action: 'user_created', userId: 456 });
Logger.debug('Debug info', { query: '' });
```

---

## 🧪 Testing Guide

### Run All Tests
```bash
npm test                    # All tests with coverage
npm run test:watch         # Watch mode for TDD
npm run test:unit          # Only unit tests
npm run test:integration   # Only integration tests
npm run test:verbose       # Detailed output
```

### Write Unit Test
```javascript
import AuthService from '../src/services/AuthService.js';

describe('AuthService.register', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('should create user with valid data', async () => {
    const result = await AuthService.register(
      'test@example.com',
      'password123',
      'student'
    );

    expect(result).toHaveProperty('id');
    expect(result.email).toBe('test@example.com');
    expect(result.role).toBe('student');
  });

  it('should reject duplicate emails', async () => {
    // First registration succeeds
    await AuthService.register('test@example.com', 'pwd', 'student');
    
    // Second registration fails
    await expect(
      AuthService.register('test@example.com', 'pwd', 'student')
    ).rejects.toThrow('already registered');
  });
});
```

### Write Integration Test
```javascript
import request from 'supertest';
import app from '../src/server.js';

describe('POST /api/auth/register', () => {
  it('should register new user', async () => {
    const response = await request(app)
      .post('/api/auth/register')
      .send({
        email: 'new@example.com',
        password: 'secure_password_123',
        role: 'student',
      });

    expect(response.status).toBe(201);
    expect(response.body).toHaveProperty('token');
  });

  it('should reject invalid data', async () => {
    const response = await request(app)
      .post('/api/auth/register')
      .send({ email: 'invalid', password: 'short' });

    expect(response.status).toBe(400);
  });
});
```

---

## 🔐 Security Checklist

Before committing code:

- [ ] No hardcoded secrets or passwords
- [ ] Input validated with express-validator
- [ ] Database queries use Sequelize (no string concatenation)
- [ ] Error messages don't expose internals
- [ ] Authentication check on protected routes
- [ ] Role validation on admin routes
- [ ] No console.log in production code (use Logger)
- [ ] Tests passing locally

---

## 🚨 Common Issues & Solutions

### Issue: "TokenExpiredError"
**Cause**: JWT token has expired  
**Solution**: User needs to login again or use refresh token

### Issue: "User not authenticated"
**Cause**: Missing or invalid Authorization header  
**Solution**: Send request with `Authorization: Bearer <token>`

### Issue: "Validation failed: email must be unique"
**Cause**: Email already exists in database  
**Solution**: Use different email or recover existing account

### Issue: "Database connection failed"
**Cause**: PostgreSQL/SQLite not running or wrong credentials  
**Solution**: Check `.env` file, ensure DB is running, verify credentials

### Issue: Tests fail with "Cannot find module"
**Cause**: Node modules not installed  
**Solution**: Run `npm install`

### Issue: Slow API responses
**Cause**: N+1 queries or missing indexes  
**Solution**: Check query logs, add `include:` to Sequelize finds, add DB indexes

---

## 📊 Database Migrations

### Create New Migration
```bash
npx sequelize-cli migration:generate --name add-new-column
```

**Edit migration file:**
```javascript
module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.addColumn('students', 'newField', {
      type: Sequelize.STRING,
      allowNull: true,
    });
  },

  async down(queryInterface, Sequelize) {
    await queryInterface.removeColumn('students', 'newField');
  },
};
```

### Run Migrations
```bash
npx sequelize-cli db:migrate        # Up
npx sequelize-cli db:migrate:undo   # Down (last)
npx sequelize-cli db:seed:all       # Run seeders
```

---

## 📈 Performance Monitoring

### Enable Query Logging
```javascript
// In config/database.js
const sequelize = new Sequelize({
  logging: console.log, // Log all queries
  // Or: logging: (msg) => Logger.debug(msg),
});
```

### Check Slow Queries
```bash
# Examine logs directory
tail -f logs/error.log
tail -f logs/info.log
```

### Profile CPU Usage
```bash
node --inspect src/server.js
# Then open chrome://inspect in Chrome DevTools
```

---

## 🔄 Git Workflow

```bash
# Create feature branch
git checkout -b feature/add-matching-algorithm

# Make changes and commit
git add .
git commit -m "feat: improve matching algorithm weights"

# Push and create PR
git push origin feature/add-matching-algorithm

# PR process:
# 1. Code review
# 2. Tests passing
# 3. Merge to develop
# 4. Test in staging
# 5. Release to production
```

---

## 📞 Important Contacts & Resources

- **Documentation**: See `docs/` directory
- **Codebase Analysis**: `CODEBASE-ANALYSIS.md`
- **API Reference**: `docs/API-REFERENCE-GUIDE.md`
- **Database Schema**: `docs/DATABASE-SCHEMA-DOCUMENTATION.md`
- **Architecture**: `docs/SYSTEM-ARCHITECTURE.md`

---

## 🎯 Development Tips

1. **Use Postman** for API testing (import from docs)
2. **Set debug mode** in `.env`: `APP_DEBUG=true`
3. **Watch logs** while developing: `tail -f logs/error.log`
4. **Use VS Code** debugger with `--inspect` flag
5. **Keep `.env.example` updated** when adding new variables
6. **Comment complex logic** - explain WHY, not WHAT
7. **Write tests first** (TDD approach) for critical features

---

**Quick Links:**
- [Sequelize Docs](https://sequelize.org/)
- [Express.js Docs](https://expressjs.com/)
- [JWT Introduction](https://jwt.io/introduction)
- [OWASP Security](https://owasp.org/)

Generated: April 2026
