# Testing Guide - OJT System V2 Backend

**Version:** 1.0  
**Framework:** Jest 29.7.0 + Supertest 6.3.3  
**Status:** Comprehensive Test Suite Ready

---

## 📋 Table of Contents

1. [Quick Start](#quick-start)
2. [Test Structure](#test-structure)
3. [Running Tests](#running-tests)
4. [Understanding Results](#understanding-results)
5. [Writing New Tests](#writing-new-tests)
6. [Best Practices](#best-practices)
7. [Troubleshooting](#troubleshooting)

---

## 🚀 Quick Start

### Prerequisites

```bash
npm install
```

### Run All Tests

```bash
npm test
```

Expected output:
```
PASS  tests/unit/sanityChecks.test.js
PASS  tests/unit/authService.test.js
PASS  tests/unit/matchingService.test.js
PASS  tests/integration/api.test.js

Test Suites: 4 passed, 4 total
Tests:       150+ passed
Snapshots:   0 total
Time:        5-10s
Coverage:    70%+ statements
```

---

## 📁 Test Structure

```
tests/
├── setup.js                    # Jest configuration & custom matchers
├── helpers.js                  # Test factories & utilities
│
├── unit/                       # Unit tests (isolated logic)
│   ├── sanityChecks.test.js   # Testing infrastructure verification
│   ├── authService.test.js    # Authentication service tests
│   └── matchingService.test.js # Matching algorithm tests
│
└── integration/                # Integration tests (full flow)
    └── api.test.js            # API endpoint tests
```

### Test Files Explained

| File | Purpose | Test Count | Coverage |
|------|---------|------------|----------|
| `sanityChecks.test.js` | Infrastructure verification | 30+ | Helpers, matchers, env |
| `authService.test.js` | Authentication logic | 35+ | Registration, login, tokens |
| `matchingService.test.js` | Matching algorithm | 40+ | All 5 scoring components |
| `api.test.js` | HTTP endpoints | 50+ | Routes, auth, validation |

**Total Tests:** 150+  
**Estimated Run Time:** 5-10 seconds

---

## ▶️ Running Tests

### Run All Tests

```bash
npm test
```

**What it does:**
- Runs all test files
- Generates coverage report
- Detects resource leaks
- Outputs JUnit XML for CI/CD

### Run Only Unit Tests

```bash
npm run test:unit
```

**Use when:**
- Testing business logic in isolation
- Developing services
- Fast feedback loop (1-2 seconds)

### Run Only Integration Tests

```bash
npm run test:integration
```

**Use when:**
- Testing API endpoints
- Verifying HTTP behavior
- Testing complete request flow

### Run in Watch Mode

```bash
npm run test:watch
```

**Features:**
- Re-runs tests on file changes
- Shows only changed test results
- Press `q` to quit
- Great for development

**Use when:**
- Writing new tests
- Debugging failing tests
- Iterative development

### Run with Verbose Output

```bash
npm run test:verbose
```

**Shows:**
- Each test name
- Full stack traces for failures
- Detailed coverage info
- Execution time per test

---

## 📊 Understanding Results

### Success Output

```
 PASS  tests/unit/authService.test.js
  AuthService
    register()
      ✓ should successfully register a new student (15ms)
      ✓ should reject duplicate email (8ms)
      ✓ should validate password strength (5ms)
      ...
    login()
      ✓ should successfully login with valid credentials (12ms)
      ✓ should reject non-existent email (7ms)
      ...

Test Suites: 4 passed, 4 total
Tests:       150 passed, 150 total
Time:        8.234s
Coverage:    75% statements, 68% branches, 72% functions, 75% lines
```

**Interpretation:**
- ✅ All tests passed
- ⏱️ Total time is reasonable
- 📈 Coverage is above 70% threshold

### Failure Output

```
 FAIL  tests/unit/authService.test.js
  AuthService
    login()
      ✕ should reject suspended accounts (25ms)

Expected 403, received 200
      at authService.login (src/services/authService.js:45)
```

**What went wrong:**
- Test name indicates the issue
- Expected vs actual values shown
- File and line number provided
- Fix: Implement account status check in login

### Coverage Report

```
===================== Coverage Summary ======================
Statements   | Branches   | Functions  | Lines
75%  (300/400) | 68% (170/250) | 72% (72/100) | 75% (300/400)

File                          | Statements | Branches | Functions | Lines
-------------------------------|------------|----------|-----------|------
services/authService.js       | 85% | 80% | 90% | 85%
services/matchingService.js   | 90% | 85% | 95% | 92%
middleware/auth.js            | 70% | 65% | 75% | 70%
models/User.js                | 60% | 55% | 65% | 60%
```

**Reading coverage:**
- **Statements:** Lines of code executed
- **Branches:** If/else paths taken
- **Functions:** Function entry points hit
- **Lines:** Individual lines executed

**Targets:**
- 70%+ overall (MVP)
- 80%+ critical paths (services)
- 100% for security-critical code

---

## ✍️ Writing New Tests

### Test Template

```javascript
import { describe, it, expect, beforeEach, afterEach } from '@jest/globals';
import { factories, testResponse } from '../helpers.js';

describe('ComponentName', () => {
  let component;

  beforeEach(() => {
    // Setup before each test
    component = new ComponentName();
  });

  describe('methodName()', () => {
    it('should describe expected behavior', () => {
      /**
       * WHAT: Short description of what's being tested
       * WHY: Business reason or security concern
       */
      
      // Arrange
      const input = factories.createTestData();

      // Act
      const result = component.methodName(input);

      // Assert
      expect(result).toEqual(expectedValue);
    });
  });

  afterEach(() => {
    // Cleanup after each test
    jest.clearAllMocks();
  });
});
```

### Example: Testing a Service Method

```javascript
describe('StudentService', () => {
  describe('addSkill()', () => {
    it('should add skill with valid proficiency', async () => {
      /**
       * WHAT: Valid skill should be added and returned
       * WHY: Core feature - users need to add skills
       */
      
      const studentId = 'student-123';
      const skillData = {
        skill_name: 'JavaScript',
        proficiency_level: 'advanced',
      };

      const result = await StudentService.addSkill(studentId, skillData);

      expect(result).toHaveProperty('id');
      expect(result.skill_name).toBe('JavaScript');
      expect(result.proficiency_level).toBe('advanced');
    });

    it('should reject invalid proficiency level', async () => {
      /**
       * WHAT: Invalid proficiency should throw error
       * WHY: Data quality - standardize skill assessment
       */
      
      const studentId = 'student-123';
      const skillData = {
        skill_name: 'JavaScript',
        proficiency_level: 'invalid-level',
      };

      await expect(
        StudentService.addSkill(studentId, skillData)
      ).rejects.toThrow('Invalid proficiency level');
    });
  });
});
```

### Using Test Helpers

```javascript
// Create test data
const user = factories.studentUser({ email: 'custom@test.com' });
const posting = factories.ojtPosting('company-123');
const skill = factories.skill({ skill_name: 'Python' });

// Assert response
testResponse.assertSuccess(response, 200);
testResponse.assertError(response, 400, 'invalid');
testResponse.assertHasFields(obj, ['id', 'name', 'email']);

// Authentication
const header = testAuth.authHeaderForRole('user-123', 'student');

// Time calculations
const future = testTime.daysFromNow(7);
const expiry = testTime.minutesFromNow(60);
```

---

## 🎯 Best Practices

### 1. **Arrange-Act-Assert Pattern**

```javascript
it('should update student profile', async () => {
  // ARRANGE - setup test data
  const studentId = 'student-123';
  const updateData = { gpa: 3.75, program: 'CS' };

  // ACT - perform the action
  const result = await StudentService.updateProfile(studentId, updateData);

  // ASSERT - verify the result
  expect(result.gpa).toBe(3.75);
  expect(result.program).toBe('CS');
});
```

### 2. **Clear Test Names**

```javascript
// ✅ Good - describes what, why, and conditions
it('should reject login if account is suspended')
it('should return 100 score if no skills required')
it('should rate-limit after 5 failed auth attempts')

// ❌ Bad - vague, unclear
it('should work')
it('test login')
it('check', )
```

### 3. **One Assertion Focus**

```javascript
// ✅ Good - each test validates one thing
it('should calculate skill score correctly', async () => {
  const score = await service.calculateSkillScore(skills, requirements);
  expect(score).toBe(75);
});

// ❌ Bad - tests multiple unrelated things
it('should calculate and save score', async () => {
  const score = await service.calculateSkillScore(...);
  expect(score).toBe(75);
  const saved = await ScoreModel.findOne(...);
  expect(saved).toBeDefined();
  // These test different concerns
});
```

### 4. **Explain WHY in Comments**

```javascript
/**
 * WHAT: Verify GPA below requirement reduces match score
 * WHY: GPA is indicator of academic capability;
 *      lower GPA = higher risk = lower match confidence
 */
it('should penalize below-threshold GPA', async () => {
  const score = await matchingService.calculateGPAScore(2.0, 3.0);
  expect(score).toBeLessThan(100);
});
```

### 5. **Test Edge Cases**

```javascript
// Test boundaries and corner cases
it('should handle zero minimum GPA requirement', async () => {
  const score = await service.calculateGPAScore(1.5, 0);
  expect(score).toBe(100);
});

it('should handle null optional fields', async () => {
  const result = await service.process({ email: 'test@test.com', phone: null });
  expect(result).toBeDefined();
});

it('should handle empty arrays', async () => {
  const result = await service.process({ skills: [] });
  expect(result.skillScore).toBe(100);
});
```

### 6. **Use Factories for Consistency**

```javascript
// ✅ Good - reusable, consistent data
const user = factories.studentUser({ status: 'suspended' });

// ❌ Bad - hardcoded, errors repeated everywhere
const user = {
  id: 'user-123',
  name: 'Test User',
  email: 'test@test.com',
  // ... 20 more fields
};
```

### 7. **Isolate Tests**

```javascript
// ✅ Good - tests are independent
describe('AuthService', () => {
  beforeEach(() => {
    // Fresh setup before each test
    mockUserModel.reset();
  });

  it('test 1', () => { /* ... */ });
  it('test 2', () => { /* ... */ }); // Not affected by test 1
});

// ❌ Bad - test 2 depends on test 1
let userId;
it('test 1', async () => {
  const user = await service.register(...);
  userId = user.id; // Stored globally
});
it('test 2', async () => {
  await service.login(userId); // Depends on test 1 running first!
});
```

---

## 🔧 Troubleshooting

### Tests Won't Start

**Error:** `Cannot find module 'jest'`

**Fix:**
```bash
npm install
```

---

### Tests Timeout

**Error:** `Jest did not exit one second after the test finished`

**Means:** Database connection not closing, timers not cleared

**Fix:**
```javascript
// In afterEach
afterEach(async () => {
  jest.clearAllMocks();
  // Close db connection
  if (sequelize) await sequelize.close();
});
```

---

### Coverage Too Low

**Error:** `FAIL  Coverage threshold not met: 45% < 70%`

**Means:** Not enough code is tested

**Fix:**
1. Identify untested files: `npm run test:verbose | grep "0%"`
2. Write tests for those files
3. Focus on business logic, not utility functions
4. Aim for 80%+ critical services

---

### Mock Not Working

**Error:** `Expected spy to have been called`

**Means:** Mock setup incorrect or spy not configured

**Fix:**
```javascript
// ✅ Correct way
const mockFn = jest.fn().mockResolvedValue(data);
mockService.method = mockFn;
await method();
expect(mockFn).toHaveBeenCalled();

// ❌ Wrong way
mockService.method = () => data; // Function, not spy
```

---

### Async Test Hangs

**Error:** Timeout after 10s

**Means:** Promise not resolving

**Fix:**
```javascript
// ✅ Return promise
it('test', () => {
  return service.asyncMethod(); // Jest waits
});

// Or use async/await
it('test', async () => {
  await service.asyncMethod();
});

// ❌ Wrong - Jest doesn't wait
it('test', () => {
  service.asyncMethod(); // No return/await
});
```

---

### Different Behavior in Tests vs Real App

**Means:** Test environment != production

**Common causes:**
1. **Different database** - tests use in-memory SQLite
2. **Different environment vars** - tests have reduced rate limits
3. **Mocked dependencies** - real app has actual services

**Solution:**
- Review `setup.js` for test-specific config
- Use integration tests for real behavior
- Test with actual database in CI/CD

---

## 📈 Continuous Integration

### GitHub Actions Example

```yaml
name: Tests

on: [push, pull_request]

jobs:
  test:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v2
      - uses: actions/setup-node@v2
        with:
          node-version: 18
      - run: npm install
      - run: npm test
      - run: npm run test:coverage
      - uses: codecov/codecov-action@v2
```

### Check Before Commit

```bash
#!/bin/bash
# .git/hooks/pre-commit
npm run test:unit
[ $? -ne 0 ] && exit 1
npm run lint
[ $? -ne 0 ] && exit 1
```

---

## 📚 Additional Resources

### Test Files to Study

1. `tests/unit/sanityChecks.test.js` - Learn test infrastructure
2. `tests/unit/authService.test.js` - Learn service testing
3. `tests/unit/matchingService.test.js` - Learn algorithm testing
4. `tests/integration/api.test.js` - Learn API testing

### Jest Documentation

- [Jest Docs](https://jestjs.io)
- [Matchers Reference](https://jestjs.io/docs/expect)
- [Setup & Teardown](https://jestjs.io/docs/setup-teardown)

### Supertest Documentation

- [Supertest](https://github.com/visionmedia/supertest)
- [HTTP Assertions](https://github.com/visionmedia/supertest#api-reference)

---

## ✅ Test Execution Checklist

Before committing code:

- [ ] Run `npm test` - all tests pass
- [ ] Check coverage - above 70%
- [ ] No console warnings
- [ ] No memory leaks (no warnings about open handles)
- [ ] Tests complete in under 30 seconds
- [ ] New features have test coverage
- [ ] Edge cases are tested
- [ ] Security-critical code is tested

---

## 🎓 Next Steps

1. **Run your first test**
   ```bash
   npm test
   ```

2. **Study passing tests**
   - Review comments explaining WHY
   - Understand test patterns

3. **Write a test**
   - Pick an untested service method
   - Write a test using the template

4. **Fix a failing test**
   - Implement the feature to make test pass
   - Verify coverage improves

---

**Happy Testing!** 🚀

---

**Document Version:** 1.0  
**Last Updated:** April 2026  
**Status:** Complete & Ready
