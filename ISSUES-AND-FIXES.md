# OJT System V2 - Issues Found & Fixes Required

**Analysis Date**: April 2026 | **Version**: 2.0.0 | **Status**: 5 Issues Identified

---

## Critical Issues (Fix Immediately)

### Issue #1: Inconsistent Error Handling in MatchingService ⚠️ CRITICAL

**Location**: `src/services/MatchingService.js:39`  
**Severity**: High  
**Impact**: Breaks error handling consistency, API response format broken

**Current Code:**
```javascript
// Line 39 in MatchingService.js
throw new Error('Student not found');
```

**Problem:**
- Uses generic `Error` instead of `AppError`
- Will not have statusCode, timestamp, or context
- Error handler treats it as 500 instead of 404
- Breaks API response format consistency

**Expected Error Response (broken):**
```javascript
// What API returns with generic Error:
{
  message: "Error: Student not found", // Ugly format
  statusCode: 500,  // Wrong! Should be 404
  stack: "..."      // Shouldn't show stack to client
}
```

**Correct Error Response (with AppError):**
```javascript
// What should be returned:
{
  message: "Student not found",
  statusCode: 404,  // Correct
  timestamp: "2026-04-15T10:30:00Z"
}
```

**Fix:**
```javascript
// Line 39 - Change from:
throw new Error('Student not found');

// To:
throw new AppError('Student not found', 404, { studentId });
```

**Affected Method:** `calculateMatchScore(studentId, postingId)`

**Test Case:**
```javascript
describe('MatchingService.calculateMatchScore', () => {
  it('should throw AppError with 404 for missing student', async () => {
    await expect(
      MatchingService.calculateMatchScore('nonexistent-id', 'posting-123')
    ).rejects.toThrow(AppError);
    
    try {
      await MatchingService.calculateMatchScore('bad-id', 'bad-posting');
    } catch (error) {
      expect(error.statusCode).toBe(404);
      expect(error.message).toBe('Student not found');
    }
  });
});
```

---

### Issue #2: Race Condition in Application Submission ⚠️ CRITICAL

**Location**: `src/services/StudentService.js:220-250` (applyToPosting method)  
**Severity**: High  
**Impact**: More students can apply than positions available

**Current Code:**
```javascript
// Check if positions available
const posting = await OjtPosting.findByPk(postingId);
if (posting.currentApplicants >= posting.positions) {  // Check
  throw new AppError('All positions filled', 409);
}

// Create application
const application = await Application.create({  // Act
  studentId,
  postingId,
  status: 'submitted'
});
```

**Problem:**
- **Check-Then-Act (TOCTOU) Race Condition**
- Two concurrent requests can both pass the "positions available" check
- Both create applications, exceeding position limit
- Example:
  ```
  Position limit: 10
  Current applications: 9
  
  Request A arrives → Check passes (9 < 10) → [PAUSE]
  Request B arrives → Check passes (9 < 10) → Application created (now 10) → [RESUME]
  Request A resumes → Application created (now 11) ← EXCEEDS LIMIT!
  ```

**Fix Option 1: Database-Level Constraint (Best)**
```sql
-- Add CHECK constraint at database level
ALTER TABLE applications
ADD CONSTRAINT check_position_limit
CHECK (
  SELECT COUNT(*) FROM applications 
  WHERE postingId = ? AND status = 'submitted'
) <= (SELECT positions FROM ojt_postings WHERE id = ?);
```

**Fix Option 2: Database Transaction (Good)**
```javascript
// In StudentService.js
static async applyToPosting(studentId, postingId) {
  // Use transaction to ensure atomicity
  return await sequelize.transaction(async (transaction) => {
    // Lock the posting row for update
    const posting = await OjtPosting.findByPk(postingId, {
      transaction,
      lock: transaction.LOCK.UPDATE // Prevents concurrent access
    });

    if (!posting) {
      throw new AppError('Job posting not found', 404);
    }

    // Count current applications within SAME transaction
    const applicationCount = await Application.count({
      where: { postingId, status: 'submitted' },
      transaction
    });

    if (applicationCount >= posting.positions) {
      throw new AppError('All positions for this posting have been filled', 409);
    }

    // Check duplicate within transaction
    const existing = await Application.findOne({
      where: { studentId, postingId },
      transaction
    });

    if (existing && existing.status === 'submitted') {
      throw new AppError('You have already applied to this posting', 409);
    }

    // Create application - happens within transaction
    return await Application.create({
      studentId,
      postingId,
      status: 'submitted',
      appliedAt: new Date()
    }, { transaction });
  });
}
```

**Fix Option 3: Optimistic Locking (Advanced)**
```javascript
// Add version column to OjtPosting
await sequelize.query(
  'ALTER TABLE ojt_postings ADD COLUMN version INT DEFAULT 0'
);

// In application creation:
const result = await OjtPosting.update(
  { currentApplicants: currentApplicants + 1, version: version + 1 },
  { 
    where: { 
      id: postingId, 
      version: version  // Only update if version matches
    }
  }
);

if (result[0] === 0) {
  // Version mismatch - someone else updated it
  throw new AppError('Job posting was modified, please try again', 409);
}
```

**Recommended:** Use Option 2 (Database Transaction) for balance of safety and simplicity.

---

### Issue #3: Password Reset Token Can Be Reused ⚠️ HIGH

**Location**: `src/services/AuthService.js:240-270` (resetPasswordConfirm method)  
**Severity**: High  
**Impact**: Account takeover vulnerability

**Current Code:**
```javascript
static async resetPasswordConfirm(resetToken, newPassword) {
  try {
    const decoded = jwt.verify(resetToken, config.auth.secret);
    // ...
    const user = await User.findByPk(decoded.userId);
    // Update password but don't invalidate token
    user.password = await bcrypt.hash(newPassword, 10);
    await user.save();
  }
}
```

**Problem:**
- Token is NOT invalidated after use
- Same token can reset password multiple times
- Attacker with leaked token can repeatedly change password
- No way to track if token was already used

**Scenario:**
```
1. User requests password reset → Token generated (valid for 24 hours)
2. User receives email with reset link
3. Attacker intercepts email/link
4. Day 1: Attacker uses token → Changes password to "hacker123"
5. Day 2: Attacker uses SAME token again → User locked out
6. Day 3: Attacker still has valid token...
```

**Fix: Add Token Invalidation**

**Step 1: Create PasswordResetToken model** (if not exists)
```javascript
// src/models/PasswordResetToken.js
export default (sequelize, DataTypes) => {
  const PasswordResetToken = sequelize.define('PasswordResetToken', {
    id: {
      type: DataTypes.UUID,
      defaultValue: DataTypes.UUIDV4,
      primaryKey: true,
    },
    userId: {
      type: DataTypes.UUID,
      allowNull: false,
      references: { model: 'users', key: 'id' },
      onDelete: 'CASCADE'
    },
    token: {
      type: DataTypes.STRING,
      allowNull: false,
      unique: true
    },
    used: {
      type: DataTypes.BOOLEAN,
      defaultValue: false,  // NEW: Track if token was used
    },
    usedAt: {
      type: DataTypes.DATE,
      allowNull: true,  // NEW: When was it used
    },
    expiresAt: {
      type: DataTypes.DATE,
      allowNull: false,
    },
  });
  return PasswordResetToken;
};
```

**Step 2: Update resetPasswordConfirm method**
```javascript
static async resetPasswordConfirm(resetToken, newPassword) {
  try {
    // Verify token signature
    const decoded = jwt.verify(resetToken, config.auth.secret);
    
    // NEW: Check if token has already been used
    const tokenRecord = await PasswordResetToken.findOne({
      where: { token: resetToken }
    });

    if (!tokenRecord) {
      throw new AppError('Invalid reset token', 401);
    }

    if (tokenRecord.used) {
      Logger.warn('Attempted token reuse', { 
        userId: decoded.userId 
      });
      throw new AppError('This reset link has already been used', 401);
    }

    if (new Date() > tokenRecord.expiresAt) {
      throw new AppError('Reset token has expired', 401);
    }

    // Find user
    const user = await User.findByPk(decoded.userId);
    if (!user) {
      throw new AppError('User not found', 404);
    }

    // Update password
    user.password = await bcrypt.hash(newPassword, 10);
    await user.save();

    // NEW: Mark token as used
    await PasswordResetToken.update(
      { used: true, usedAt: new Date() },
      { where: { token: resetToken } }
    );

    Logger.info('Password reset successful', { userId: user.id });
    return { message: 'Password reset successful' };

  } catch (error) {
    if (error instanceof AppError) throw error;
    Logger.error('Password reset failed', error, { resetToken: resetToken.substring(0, 20) });
    throw new AppError('Invalid reset token', 401);
  }
}
```

**Step 3: Add cleanup job** (Remove expired tokens)
```javascript
// src/jobs/cleanupExpiredTokens.js
import PasswordResetToken from '../models/PasswordResetToken.js';

export async function cleanupExpiredTokens() {
  const deleted = await PasswordResetToken.destroy({
    where: {
      expiresAt: { [Op.lt]: new Date() },
      used: true
    }
  });
  Logger.info('Cleanup: Deleted expired tokens', { count: deleted });
}

// Run every hour
setInterval(cleanupExpiredTokens, 60 * 60 * 1000);
```

**Test Case:**
```javascript
describe('AuthService.resetPasswordConfirm', () => {
  it('should prevent token reuse', async () => {
    const token = 'reset-token-123';
    
    // First use succeeds
    await AuthService.resetPasswordConfirm(token, 'newPassword123');
    
    // Second use fails
    await expect(
      AuthService.resetPasswordConfirm(token, 'anotherPassword')
    ).rejects.toThrow('already been used');
  });
});
```

---

## High Priority Issues

### Issue #4: No Account Lockout After Failed Attempts 🔒 HIGH

**Location**: `src/services/AuthService.js:115-150` (login method)  
**Severity**: Medium-High  
**Impact**: Brute force password attacks possible

**Current Code:**
```javascript
static async login(email, password) {
  // ...
  const passwordMatch = await bcrypt.compare(password, user.password);
  
  if (!passwordMatch) {
    throw new AppError('Invalid email or password', 401);
  }
  // Just rejects, no tracking of attempts
}
```

**Problem:**
- Rate limiting slows attacks but doesn't block them
- Attacker can systematically try passwords
- No way to lock account after N failures

**Recommended Fix:**
```javascript
static async login(email, password) {
  try {
    const user = await User.findOne({ where: { email } });

    if (!user) {
      throw new AppError('Invalid email or password', 401);
    }

    // NEW: Check if account is locked
    if (user.status === 'locked') {
      const lockDurationMinutes = 30;
      const timeSinceLock = (Date.now() - user.lockedUntil) / (1000 * 60);
      
      if (timeSinceLock < lockDurationMinutes) {
        throw new AppError(
          `Account locked. Try again in ${Math.ceil(lockDurationMinutes - timeSinceLock)} minutes`,
          403
        );
      } else {
        // Lock expired, unlock account
        user.status = 'active';
        user.failedLoginAttempts = 0;
        await user.save();
      }
    }

    const passwordMatch = await bcrypt.compare(password, user.password);

    if (!passwordMatch) {
      // NEW: Increment failed attempts
      user.failedLoginAttempts = (user.failedLoginAttempts || 0) + 1;
      
      if (user.failedLoginAttempts >= 5) {
        // NEW: Lock account after 5 failed attempts
        user.status = 'locked';
        user.lockedUntil = new Date();
        Logger.warn('Account locked due to failed login attempts', { email });
      }
      
      await user.save();
      throw new AppError('Invalid email or password', 401);
    }

    // NEW: Reset failed attempts on successful login
    if (user.failedLoginAttempts > 0) {
      user.failedLoginAttempts = 0;
      await user.save();
    }

    // Continue with JWT generation...
    const token = jwt.sign(
      { id: user.id, email: user.email, role: user.role },
      config.auth.secret,
      { expiresIn: config.auth.expiryTime }
    );

    return { user, token };

  } catch (error) {
    if (error instanceof AppError) throw error;
    Logger.error('Login failed', error, { email });
    throw new AppError('Invalid email or password', 401);
  }
}
```

**Database Changes:**
```sql
ALTER TABLE users ADD COLUMN failedLoginAttempts INT DEFAULT 0;
ALTER TABLE users ADD COLUMN lockedUntil DATETIME;
```

---

### Issue #5: Missing Database Indexes 📊 MEDIUM

**Location**: Database schema  
**Severity**: Medium  
**Impact**: Slow queries, poor performance with large datasets

**Current State:**
- No indexes defined
- Queries on `email`, `userId`, `postingId`, `status` are full table scans

**Common Queries That Need Indexes:**
```sql
-- 1. User lookup by email (Auth)
SELECT * FROM users WHERE email = '...';
-- Add index:
CREATE INDEX idx_users_email ON users(email);

-- 2. Student applications
SELECT * FROM applications WHERE studentId = '...';
CREATE INDEX idx_applications_studentId ON applications(studentId);

-- 3. Job postings by company
SELECT * FROM ojt_postings WHERE companyId = '...';
CREATE INDEX idx_ojt_postings_companyId ON ojt_postings(companyId);

-- 4. Applications by status
SELECT * FROM applications WHERE status = 'submitted';
CREATE INDEX idx_applications_status ON applications(status);

-- 5. Audit logs by user
SELECT * FROM audit_logs WHERE userId = '...';
CREATE INDEX idx_audit_logs_userId ON audit_logs(userId);

-- 6. Composite index for unique constraint
CREATE UNIQUE INDEX idx_applications_unique 
  ON applications(studentId, postingId)
  WHERE status = 'submitted';

-- 7. Notification queries
CREATE INDEX idx_notifications_userId_read 
  ON notifications(userId, read);
```

**Fix: Create Migration** 
```bash
npx sequelize-cli migration:generate --name add-database-indexes
```

```javascript
// migrations/[timestamp]-add-database-indexes.js
module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.addIndex('users', ['email'], { 
      name: 'idx_users_email' 
    });
    
    await queryInterface.addIndex('applications', ['studentId'], {
      name: 'idx_applications_studentId'
    });
    
    await queryInterface.addIndex('ojt_postings', ['companyId'], {
      name: 'idx_ojt_postings_companyId'
    });
    
    await queryInterface.addIndex('applications', ['status'], {
      name: 'idx_applications_status'
    });
    
    // ... add others
  },

  async down(queryInterface, Sequelize) {
    await queryInterface.removeIndex('users', 'idx_users_email');
    // ... remove others
  },
};
```

**Run migration:**
```bash
npm run db:migrate
```

---

## Summary Table

| Issue | Type | Severity | File | Fix Time | Impact |
|-------|------|----------|------|----------|--------|
| #1: Wrong Error Type | Bug | 🔴 Critical | MatchingService.js:39 | 5 min | Breaking API format |
| #2: Race Condition | Logic | 🔴 Critical | StudentService.js:220 | 30 min | Data integrity |
| #3: Token Reuse | Security | 🔴 Critical | AuthService.js:240 | 45 min | Account takeover |
| #4: No Account Lockout | Security | 🟠 High | AuthService.js:115 | 20 min | Brute force attacks |
| #5: Missing Indexes | Performance | 🟡 Medium | Database schema | 15 min | Slow queries |

---

## Testing Checklist

After fixes are applied, verify with:

```bash
# Run all tests
npm test

# Check specific fixes
npm run test:unit -- AuthService
npm run test:unit -- MatchingService
npm run test:unit -- StudentService

# Integration tests
npm run test:integration

# Manual testing
npm run dev
# Then use Postman to test:
# - Password reset flow (verify token invalidation)
# - Multiple concurrent applications (verify position limit)
# - Failed login attempts (verify account locking)
```

---

## Priority Roadmap

**Week 1 (Critical Fixes):**
- [ ] Fix #1: Error handling consistency
- [ ] Fix #2: Race condition with transaction
- [ ] Fix #3: Token invalidation

**Week 2 (Security Hardening):**
- [ ] Fix #4: Account lockout mechanism
- [ ] Add 2FA support
- [ ] Implement password expiration

**Week 3 (Performance):**
- [ ] Fix #5: Add database indexes
- [ ] Implement caching layer
- [ ] Add query monitoring

---

**Generated**: April 2026  
**Status**: Ready for implementation  
**Review by**: Team Lead before deploying
