# 10 - Troubleshooting & Maintenance Guide

**Version:** 2.0.0

---

## 🔧 Common Issues & Solutions

### Issue 1: Database Connection Error

**Error Message:**
```
❌ Database connection error: SQLITE_CANTOPEN
```

**Causes:**
- Database file permission denied
- Database directory doesn't exist
- Corrupted database file

**Solutions:**

```bash
# 1. Check if database directory exists
ls -la database/

# 2. Create directory if missing
mkdir -p database

# 3. Fix permissions
chmod 755 database
chmod 644 database/ojt_system.db

# 4. Delete corrupted database and restart (will recreate)
rm database/ojt_system.db
npm run dev

# 5. Check .env DB_PATH is correct
grep DB_PATH .env
```

---

### Issue 2: JWT_SECRET Not Set

**Error Message:**
```
Error: Missing required environment variables: JWT_SECRET
```

**Causes:**
- `.env` file missing
- JWT_SECRET not in `.env`
- Wrong environment variable name

**Solutions:**

```bash
# 1. Create .env from template
cp .env.example .env

# 2. Set JWT_SECRET (must be 32+ characters)
JWT_SECRET=your-super-secret-key-at-least-32-characters-long

# 3. Verify it's set
grep JWT_SECRET .env

# 4. Restart app
npm run dev
```

---

### Issue 3: Port Already in Use

**Error Message:**
```
Error: listen EADDRINUSE :::5000
```

**Causes:**
- Another process using port 5000
- App didn't shut down cleanly
- Multiple app instances running

**Solutions:**

```bash
# 1. Kill process on port 5000 (macOS/Linux)
lsof -ti:5000 | xargs kill -9

# 2. Windows: Find and kill process
netstat -ano | findstr :5000
taskkill /PID <PID> /F

# 3. Change port in .env
APP_PORT=5001

# 4. Restart
npm run dev
```

---

### Issue 4: Authentication Token Errors

**Error Message:**
```
401 Invalid token
```

**Causes:**
- Token expired (7 days old)
- Token corrupted
- Using token from different app/key
- Wrong Authorization header format

**Solutions:**

```javascript
// Check token format
// ✅ CORRECT
headers: { Authorization: 'Bearer eyJhbGc...' }

// ❌ WRONG  
headers: { Authorization: 'Bearer

: eyJhbGc...' }

// Re-login to get new token
POST /api/auth/login
{
  "email": "user@example.com",
  "password": "SecurePass123!"
}
```

---

### Issue 5: Tests Failing

**Error Message:**
```
FAIL  tests/unit/authService.test.js
```

**Causes:**
- NODE_ENV not set to 'test'
- Database in bad state
- Import paths wrong
- Dependencies not installed

**Solutions:**

```bash
# 1. Ensure NODE_ENV=test
echo "NODE_ENV=test"

# 2. Install dependencies
npm install

# 3. Clean test database
rm database/ojt_system.db

# 4. Run tests with verbose output
npm run test:verbose

# 5. Run single test file
npm test -- tests/unit/authService.test.js

# 6. Debug specific test
test.only('should do X', () => { ... })
npm test
```

---

### Issue 6: Account Locked After Failed Logins

**Error Message:**
```
423 Account is temporarily locked. Try again in 30 minutes
```

**Cause:**
- 5 failed login attempts

**Solutions:**

```javascript
// Wait 30 minutes OR

// Admin/Database reset (direct)
UPDATE users SET 
  status = 'active', 
  failedLoginAttempts = 0,
  lockedUntil = NULL
WHERE email = 'user@example.com';

// Check lock status
SELECT email, status, lockedUntil, failedLoginAttempts 
FROM users 
WHERE email = 'user@example.com';
```

---

### Issue 7: Validation Errors on Request

**Error Message:**
```
422 Validation failed
```

**Causes:**
- Email format invalid
- Password too weak
- Required field missing
- Invalid enum value

**Solutions:**

```bash
# Check error response for details
{
  "message": "Validation failed",
  "statusCode": 422,
  "errors": {
    "email": ["Email must be valid"],
    "password": [
      "Password must be at least 8 characters",
      "Password must contain at least one uppercase letter"
    ]
  }
}

# Fix each validation error

# Password must:
# - Be 8+ characters
# - Have uppercase letter
# - Have a digit
# - Have special character (!@#$%^&*)

# Example: SecurePass123!
```

---

### Issue 8: Cannot Create Duplicate Application

**Error Message:**
```
409 Student cannot apply to same posting twice
```

**Cause:**
- Student already applied to this posting

**Solution:**
```javascript
// This is intentional - prevent duplicate applications
// Solution: Apply to different posting or
// Admin can delete the application (if needed)

DELETE FROM applications 
WHERE student_id = ? AND posting_id = ?;
```

---

## 🔍 Debugging Techniques

### Enable Debug Mode

```bash
# In .env
APP_DEBUG=true

# Shows:
# - All SQL queries
# - HTTP request logs
# - Stack traces on errors
# - Detailed console output
```

### View Application Logs

```bash
# Real-time log tail
tail -f logs/app.log

# Search for errors
grep ERROR logs/app.log

# Search for user activity
grep "userId: 1" logs/app.log

# Search by date
grep "2026-04-08" logs/app.log
```

### Database Query Debugging

```bash
# View current SQL queries
// Add to database.js
{ logging: console.log }

// This will print every Sequelize query to console
```

### HTTP Request Debugging

```javascript
// Install REST client for VS Code
// Or use curl:

curl -X GET http://localhost:5000/api/health

curl -X POST http://localhost:5000/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"john@example.com","password":"SecurePass123!"}'

curl -X GET http://localhost:5000/api/student/profile \
  -H "Authorization: Bearer YOUR_TOKEN_HERE"
```

---

## 🧹 Maintenance Tasks

### Daily

- [ ] Monitor error logs for failures
- [ ] Check for failed login attempts (security)
- [ ] Review application status changes

### Weekly

- [ ] Review audit logs
- [ ] Check database size
- [ ] Verify backups working
- [ ] Check for deprecated API calls in logs

### Monthly

- [ ] Update dependencies: `npm outdated`
- [ ] Run security audit: `npm audit`
- [ ] Archive old logs
- [ ] Review user complaints/issues
- [ ] Performance analysis

### Quarterly

- [ ] Full security review
- [ ] Database optimization (ANALYZE)
- [ ] Capacity planning
- [ ] Architecture review

---

## 🚀 Performance Optimization

### Identify Slow Queries

```javascript
// Add timing to database config
{
  logging: (sql, timing) => {
    if (timing > 100) {  // Log queries > 100ms
      console.log(`SLOW QUERY (${timing}ms): ${sql}`);
    }
  }
}
```

### Optimize Matching Algorithm

```javascript
// Currently: Calculates all matches for all active postings
// For 100 students, 50 postings = 5,000 calculations

// Optimization 1: Only active students
const activeStudents = await Student.findAll({
  where: { profile_completeness_percentage: { $gte: 50 } }
});

// Optimization 2: Cache match scores
const cached = await MatchScore.findOne({
  where: { student_id, posting_id },
  raw: true
});
if (cached && isRecentEnough(cached.calculated_at)) {
  return cached;  // Skip calculation
}

// Optimization 3: Batch calculation
await matchingService.calculateBatch(studentIds);
```

---

## 🔄 Backup & Recovery

### Manual Backup

```bash
# Backup database file
cp database/ojt_system.db database/ojt_system.db.backup

# Backup logs
tar -czf logs/app.log.2026-04.tar.gz logs/app.log

# Backup everything
tar -czf backup-$(date +%Y%m%d).tar.gz database/ logs/
```

### Restore from Backup

```bash
# Restore database
cp database/ojt_system.db.backup database/ojt_system.db

# Verify restore
npm test
```

---

## 📊 Database Maintenance

### Check Database Health

```sql
-- Count records
SELECT 'User' as table_name, COUNT(*) FROM users
UNION ALL
SELECT 'Student', COUNT(*) FROM students
-- ... etc

-- Find duplicates
SELECT email, COUNT(*) FROM users GROUP BY email HAVING COUNT(*) > 1;

-- Find orphaned records
SELECT * FROM students WHERE user_id NOT IN (SELECT id FROM users);
```

### Optimize Database

```bash
# SQLite optimization
sqlite3 database/ojt_system.db "VACUUM;"
sqlite3 database/ojt_system.db "ANALYZE;"
```

---

## ⚠️ Monitoring Alerts

Setup alerts for:

```javascript
// High number of failed logins
SELECT COUNT(*) FROM auditlog 
WHERE action = 'login' AND status = 'failed'
AND createdAt > NOW() - INTERVAL 1 HOUR;
// Alert if > 10 in an hour

// Database growth
// Alert if size > 500MB

// Error rate
// Alert if > 1% of requests fail

// API latency
// Alert if average response time > 1 second
```

---

## 📞 Support Escalation

### When to Escalate

1. **Database Corruption**
   - Error messages about database
   - Data inconsistencies
   - Restore from backup
   - Call DBA

2. **Security Breach**
   - Unauthorized access detected
   - Suspicious audit logs
   - Disable affected accounts immediately
   - Notify security team

3. **Data Loss**
   - Records missing
   - Incorrect values
   - Check audit logs
   - Restore from backup

---

## 📚 Helpful Commands

```bash
# Start development
npm run dev

# Run tests
npm test
npm run test:watch

# Check dependencies
npm outdated
npm audit

# Update dependencies safely
npm update

# Security audit and fix
npm audit fix

# View environment
cat .env

# Check node version
node --version

# View app logs
tail -f logs/app.log

# Clear logs
> logs/app.log

# Reset database (development only)
rm database/ojt_system.db
npm run dev
```

---

**Next:** See [**11-ARCHITECTURE-DECISIONS.md**](./11-ARCHITECTURE-DECISIONS.md) for background on key decisions.
