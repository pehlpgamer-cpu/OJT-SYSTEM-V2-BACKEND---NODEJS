# 09 - Testing Guide & Test Cases

**Version:** 2.0.0  
**Framework:** Jest 29 + Supertest 6.3  
**Current Coverage:** 70%+ statements

---

## 🧪 Testing Overview

### Test Structure

```
tests/
├── setup.js                   # Jest config, custom matchers
├── helpers.js                 # Test factories, utilities
├── unit/                      # Unit tests (isolated logic)
│   ├── sanityChecks.test.js  # Infrastructure tests
│   ├── authService.test.js   # Auth logic
│   └── matchingService.test.js # Matching algorithm
└── integration/              # Integration tests (full flow)
    └── api.test.js          # API endpoint tests
```

### Test Statistics

| Metric | Value |
|--------|-------|
| **Total Tests** | 150+ |
| **Test Suites** | 4 |
| **Coverage** | 70%+ statements |
| **Run Time** | 5-10 seconds |
| **Node Version** | 18+ |

---

## 🚀 Running Tests

### All Tests

```bash
npm test
```

**What it runs:**
- All tests in tests/ directory
- Coverage report generated
- Open handles detection
- JUnit XML output (for CI/CD)

---

### Watch Mode (Development)

```bash
npm run test:watch
```

**Features:**
- Re-runs tests on file change
- Interactive menu
- Press 'a' to run all tests
- Press 'p' to filter by filename
- Press 'q' to quit

---

### Unit Tests Only

```bash
npm run test:unit
```

**Runs:**
- `tests/unit/*.test.js`
- Good for TDD workflow
- Faster feedback loop

---

### Integration Tests Only

```bash
npm run test:integration
```

**Runs:**
- `tests/integration/*.test.js`
- Tests full request/response cycle
- Uses real database (in-memory SQLite)

---

### Verbose Output

```bash
npm run test:verbose
```

Shows every test name + result.

---

## 📋 Test Suites

### 1. Sanity Checks (30+ tests)

**File:** `tests/unit/sanityChecks.test.js`

Tests basic infrastructure:

```javascript
describe('Environment Setup', () => {
  test('NODE_ENV is set to test', () => {
    expect(process.env.NODE_ENV).toBe('test');
  });

  test('Database connected', async () => {
    const connection = await sequelize.authenticate();
    expect(connection).toBeDefined();
  });
});

describe('Test Helpers', () => {
  test('createTestUser creates user', async () => {
    const user = await createTestUser();
    expect(user.id).toBeDefined();
    expect(user.email).toBeDefined();
  });

  test('createTestStudent creates student', async () => {
    const student = await createTestStudent();
    expect(student.user_id).toBeDefined();
  });
});
```

---

### 2. Auth Service Tests (35+ tests)

**File:** `tests/unit/authService.test.js`

Tests authentication logic:

```javascript
describe('AuthService.register()', () => {
  test('Should register new user successfully', async () => {
    const result = await authService.register({
      name: 'John Doe',
      email: 'john@example.com',
      password: 'SecurePass123!',
      role: 'student'
    });

    expect(result.user.id).toBeDefined();
    expect(result.token).toBeDefined();
    expect(result.user.email).toBe('john@example.com');
  });

  test('Should reject duplicate email', async () => {
    await authService.register({
      name: 'John',
      email: 'john@example.com',
      password: 'SecurePass123!',
      role: 'student'
    });

    await expect(
      authService.register({
        name: 'Jane',
        email: 'john@example.com',
        password: 'SecurePass123!',
        role: 'company'
      })
    ).rejects.toThrow('Email already registered');
  });

  test('Should create role-specific profile', async () => {
    const result = await authService.register({
      name: 'Student User',
      email: 'student@example.com',
      password: 'SecurePass123!',
      role: 'student'
    });

    const student = await Student.findOne({
      where: { user_id: result.user.id }
    });

    expect(student).toBeDefined();
    expect(student.profile_completeness_percentage).toBe(0);
  });
});

describe('AuthService.login()', () => {
  beforeEach(async () => {
    await createTestUser({
      email: 'john@example.com',
      password: 'SecurePass123!'
    });
  });

  test('Should login with valid credentials', async () => {
    const result = await authService.login('john@example.com', 'SecurePass123!');

    expect(result.user.email).toBe('john@example.com');
    expect(result.token).toBeDefined();
  });

  test('Should reject invalid password', async () => {
    await expect(
      authService.login('john@example.com', 'WrongPassword123!')
    ).rejects.toThrow('Invalid email or password');
  });

  test('Should track failed login attempts', async () => {
    for (let i = 0; i < 5; i++) {
      try {
        await authService.login('john@example.com', 'WrongPassword123!');
      } catch (e) {
        // Expected to fail
      }
    }

    const user = await User.findByEmail('john@example.com');
    expect(user.status).toBe('locked');
  });

  test('Should lock account after 5 failed attempts', async () => {
    for (let i = 0; i < 5; i++) {
      try {
        await authService.login('john@example.com', 'WrongPass!');
      } catch (e) {}
    }

    const user = await User.findByEmail('john@example.com');
    expect(user.lockedUntil).toBeDefined();
  });
});
```

---

### 3. Matching Service Tests (40+ tests)

**File:** `tests/unit/matchingService.test.js`

Tests matching algorithm:

```javascript
describe('MatchingService.calculateScore()', () => {
  let student, posting;

  beforeEach(async () => {
    student = await createTestStudent({
      gpa: 3.8,
      preferred_location: 'San Francisco',
      availability_start: new Date('2026-06-01'),
      availability_end: new Date('2026-08-31')
    });

    await student.addSkill({
      skill_name: 'Java',
      proficiency_level: 'advanced',
      years_of_experience: 3
    });

    posting = await createTestPosting({
      location: 'San Francisco',
      min_gpa: 3.0,
      duration_weeks: 12,
      academic_program: 'Computer Science'
    });

    await posting.addSkill({
      skill_name: 'Java',
      proficiency_level: 'advanced',
      is_required: true
    });
  });

  test('Should calculate skill score correctly', async () => {
    const score = await matchingService.calculateScore(student, posting);
    
    expect(score.skill_score).toBe(100);  // Exact match
  });

  test('Should calculate location score (exact match)', async () => {
    const score = await matchingService.calculateScore(student, posting);
    
    expect(score.location_score).toBe(100);
  });

  test('Should calculate availability score', async () => {
    const score = await matchingService.calculateScore(student, posting);
    
    expect(score.availability_score).toBe(100);
  });

  test('Should calculate GPA score', async () => {
    const score = await matchingService.calculateScore(student, posting);
    
    expect(score.gpa_score).toBe(100);  // Meets requirement
  });

  test('Should calculate overall score correctly', async () => {
    const score = await matchingService.calculateScore(student, posting);
    
    // Overall = 0.40*skill + 0.20*location + 0.20*availability + 0.10*gpa + 0.10*program
    expect(score.overall_score).toBeGreaterThan(80);
  });

  test('Should classify highly compatible match', async () => {
    const score = await matchingService.calculateScore(student, posting);
    
    expect(score.match_status).toBe('highly_compatible');
  });

  test('Should handle partial skill match', async () => {
    // Student has Java but only at beginner level
    const studentPartial = await createTestStudent();
    await studentPartial.addSkill({
      skill_name: 'Java',
      proficiency_level: 'beginner'
    });

    const score = await matchingService.calculateScore(studentPartial, posting);
    
    expect(score.skill_score).toBeLessThan(100);
  });

  test('Should handle missing skills', async () => {
    const studentNoSkills = await createTestStudent();
    
    const score = await matchingService.calculateScore(studentNoSkills, posting);
    
    expect(score.skill_score).toBe(0);
  });
});

describe('MatchingService.calculateForStudent()', () => {
  test('Should return all matches sorted by score DESC', async () => {
    const student = await createTestStudent();
    
    // Create multiple postings with different match quality
    const posting1 = await createTestPosting();  // High match
    const posting2 = await createTestPosting();  // Medium match
    const posting3 = await createTestPosting();  // Low match

    const matches = await matchingService.calculateForStudent(student.id);

    expect(matches.length).toBe(3);
    expect(matches[0].overall_score).toBeGreaterThanOrEqual(matches[1].overall_score);
  });
});
```

---

### 4. Integration Tests (50+ tests)

**File:** `tests/integration/api.test.js`

Tests HTTP endpoints:

```javascript
describe('POST /api/auth/register', () => {
  test('Should register new user', async () => {
    const res = await request(app)
      .post('/api/auth/register')
      .send({
        name: 'John Doe',
        email: 'john@example.com',
        password: 'SecurePass123!',
        password_confirmation: 'SecurePass123!',
        role: 'student'
      });

    expect(res.status).toBe(201);
    expect(res.body.user.email).toBe('john@example.com');
    expect(res.body.token).toBeDefined();
  });

  test('Should validate email format', async () => {
    const res = await request(app)
      .post('/api/auth/register')
      .send({
        name: 'John Doe',
        email: 'invalid-email',
        password: 'SecurePass123!',
        password_confirmation: 'SecurePass123!',
        role: 'student'
      });

    expect(res.status).toBe(422);
    expect(res.body.errors.email).toBeDefined();
  });
});

describe('POST /api/auth/login', () => {
  beforeEach(async () => {
    await createTestUser({
      email: 'john@example.com',
      password: 'SecurePass123!'
    });
  });

  test('Should login successfully', async () => {
    const res = await request(app)
      .post('/api/auth/login')
      .send({
        email: 'john@example.com',
        password: 'SecurePass123!'
      });

    expect(res.status).toBe(200);
    expect(res.body.token).toBeDefined();
  });
});

describe('GET /api/student/profile', () => {
  test('Should require authentication', async () => {
    const res = await request(app)
      .get('/api/student/profile');

    expect(res.status).toBe(401);
  });

  test('Should return student profile', async () => {
    const user = await createTestUser({ role: 'student' });
    const token = user.generateToken();

    const res = await request(app)
      .get('/api/student/profile')
      .set('Authorization', `Bearer ${token}`);

    expect(res.status).toBe(200);
    expect(res.body.student).toBeDefined();
  });
});

describe('GET /api/student/matches', () => {
  test('Should return matches', async () => {
    const user = await createTestUser({ role: 'student' });
    const token = user.generateToken();

    const res = await request(app)
      .get('/api/student/matches')
      .set('Authorization', `Bearer ${token}`);

    expect(res.status).toBe(200);
    expect(Array.isArray(res.body.matches)).toBe(true);
  });

  test('Should support pagination', async () => {
    const user = await createTestUser({ role: 'student' });
    const token = user.generateToken();

    const res = await request(app)
      .get('/api/student/matches?limit=10&offset=0')
      .set('Authorization', `Bearer ${token}`);

    expect(res.body.pagination).toBeDefined();
    expect(res.body.pagination.limit).toBe(10);
  });
});
```

---

## 📝 Test Helpers

**File:** `tests/helpers.js`

```javascript
// Create test user
export async function createTestUser(overrides = {}) {
  return User.create({
    name: 'Test User',
    email: `test-${Date.now()}@example.com`,
    password: 'TestPass123!',
    role: 'student',
    ...overrides
  });
}

// Create test student
export async function createTestStudent(overrides = {}) {
  const user = await createTestUser({ role: 'student', ...overrides });
  const student = await Student.create({
    user_id: user.id,
    ...overrides
  });
  return student;
}

// Create test posting
export async function createTestPosting(overrides = {}) {
  const company = await Company.create({
    user_id: (await createTestUser({ role: 'company' })).id,
    company_name: 'Test Company',
    ...overrides
  });

  return OjtPosting.create({
    company_id: company.id,
    title: 'Test Position',
    description: 'Test job description',
    location: 'Test City',
    duration_weeks: 12,
    ...overrides
  });
}

// Generate JWT token
export function generateToken(user = {}) {
  return jwt.sign(
    { id: 1, email: 'test@example.com', role: 'student', ...user },
    config.auth.secret,
    { expiresIn: '7d' }
  );
}
```

---

## 🏆 Coverage Goals by Component

| Component | Target | Current |
|-----------|--------|---------|
| Services | 90% | 85% |
| Models | 80% | 75% |
| Middleware | 85% | 80% |
| Utils | 95% | 92% |
| **Overall** | **80%** | **70%** |

---

## ⚙️ Test Configuration

**File:** `jest.config.cjs`

```javascript
module.exports = {
  testEnvironment: 'node',
  transform: {},
  collectCoverageFrom: [
    'src/**/*.js',
    '!src/server.js'  // Skip server entry
  ],
  coverageThresholds: {
    global: {
      statements: 70,
      lines: 70,
      functions: 70
    }
  }
};
```

---

## 🚨 Common Test Failures

| Error | Cause | Solution |
|-------|-------|----------|
| "Timeout" | Test taking too long | Increase timeout: `jest.setTimeout(10000)` |
| "Connection refused" | DB not available | Ensure `NODE_ENV=test` |
| "Port already in use" | Server still running | Kill process or change port |
| "Token invalid" | Wrong secret | Use same secret in tests |
| "Cannot find module" | Import path wrong | Check relative paths |

---

## ✅ Best Practices

1. **Use Factories** - Reduce boilerplate with test helpers
2. **Isolate Tests** - Each test independent (beforeEach cleanup)
3. **Meaningful Names** - Test name describes what it tests
4. **One Assert** - Ideally one assertion per test
5. **Cover Happy & Sad** - Test success and error paths
6. **Mock External Deps** - Don't call real APIs in tests

---

**Next:** See [**10-TROUBLESHOOTING.md**](./10-TROUBLESHOOTING.md) for common issues and solutions.
