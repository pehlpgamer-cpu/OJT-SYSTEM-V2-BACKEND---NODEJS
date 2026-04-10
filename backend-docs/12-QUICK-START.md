# 12 - Quick Start & Developer Reference

**Version:** 2.0.0  
**Format:** Quick Reference Guide

---

## 🚀 Quick Setup (5 minutes)

### 1. Prerequisites
```bash
Node.js 18+
npm 8+
Git
```

### 2. Clone & Install
```bash
git clone <repo-url>
cd OJT-SYSTEM-V2-BACKEND---NODEJS
npm install
```

### 3. Configure Environment
```bash
# Copy template
cp .env.sample .env

# Edit with your values (required):
# DATABASE_URL=sqlite://./database.sqlite
# JWT_SECRET=your-secret-key-min-32-chars
# NODE_ENV=development
```

### 4. Initialize Database
```bash
npm run migrate
npm run seed  # Optional: add test data
```

### 5. Start Server
```bash
npm run dev
# Server runs on http://localhost:3000
```

### 6. Verify Health
```bash
curl http://localhost:3000/health
# {"status":"ok"}
```

---

## 📋 Essential Commands

### Development
```bash
npm run dev              # Start with nodemon (watches changes)
npm run start            # Start without watch
npm run debug            # Start with debugger on port 9229
```

### Testing
```bash
npm run test             # Run all tests
npm run test:unit        # Only unit tests
npm run test:integration # Only integration tests
npm run test:watch       # Watch mode
npm run test:coverage    # With coverage report
```

### Database
```bash
npm run migrate          # Run pending migrations
npm run migrate:undo     # Rollback last migration
npm run seed             # Populate test data
```

### Monitoring
```bash
npm run logs:app         # View application logs
npm run logs:errors      # View error logs only
npm run logs:follow      # Follow logs in real-time
```

---

## 🔑 Environment Variables

| Variable | Example | Required |
|----------|---------|----------|
| `NODE_ENV` | development, production | ✅ |
| `PORT` | 3000 | ✅ |
| `DATABASE_URL` | sqlite://./database.sqlite | ✅ |
| `JWT_SECRET` | your-secret-key (32+ chars) | ✅ |
| `JWT_EXPIRY` | 7d | ⚠️ Default: 7d |
| `LOG_LEVEL` | debug, info, warn, error | ⚠️ Default: info |

### Generate Secure JWT_SECRET
```bash
node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
```

---

## 🧪 Testing Quick Reference

### Run Specific Test
```bash
npm run test -- authService.test.js
npm run test -- --testNamePattern="login"
```

### View Coverage
```bash
npm run test:coverage
open coverage/lcov-report/index.html
```

### Common Test Names
- `sanityChecks.test.js` - Infrastructure & setup (30+ tests)
- `authService.test.js` - Authentication (35+ tests)
- `matchingService.test.js` - Matching algorithm (40+ tests)
- `api.test.js` - HTTP endpoints (50+ tests)

---

## 🔗 API Quick Reference

### Authentication

#### Register Student
```bash
curl -X POST http://localhost:3000/api/v1/auth/register \
  -H "Content-Type: application/json" \
  -d '{
    "email": "student@example.com",
    "password": "SecurePass123!",
    "name": "John Doe",
    "role": "student"
  }'
```

**Response:**
```json
{
  "token": "eyJhbGc...",
  "user": {
    "id": 1,
    "email": "student@example.com",
    "role": "student"
  }
}
```

#### Login
```bash
curl -X POST http://localhost:3000/api/v1/auth/login \
  -H "Content-Type: application/json" \
  -d '{
    "email": "student@example.com",
    "password": "SecurePass123!"
  }'
```

### Make Authenticated Request

```bash
# Get token first (from login/register)
TOKEN="eyJhbGc..."

# Use in subsequent requests
curl -X GET http://localhost:3000/api/v1/students/profile \
  -H "Authorization: Bearer $TOKEN"
```

### Student Endpoints

```bash
# Get profile
GET /api/v1/students/profile

# Update profile
PUT /api/v1/students/profile
# Body: { first_name, last_name, phone, bio, ... }

# Add skill
POST /api/v1/students/skills
# Body: { skill_name, proficiency_level, years_of_experience }

# Get skills
GET /api/v1/students/skills

# Get matches
GET /api/v1/students/matches?limit=20&sort=score
```

### Company Endpoints

```bash
# Create posting
POST /api/v1/company/postings
# Body: { title, description, location, duration_weeks, ... }

# Get postings
GET /api/v1/company/postings

# Get applications
GET /api/v1/company/applications
```

### Application Endpoints

```bash
# Apply for job
POST /api/v1/applications
# Body: { posting_id }

# Get application status
GET /api/v1/applications/:id

# Update status
PATCH /api/v1/applications/:id/status
# Body: { application_status: "shortlisted" }
```

---

## 🐛 Debugging Quick Tips

### Enable Debug Logging
```bash
DEBUG=ojt-system:* npm run dev
```

### Check Database
```bash
# Open SQLite database
sqlite3 database.sqlite

# Common queries:
SELECT * FROM users LIMIT 5;
SELECT * FROM students WHERE user_id = 1;
SELECT COUNT(*) FROM audit_logs WHERE created_at > datetime('now', '-1 day');
```

### Monitor Requests
```bash
# All requests logged automatically by Morgan
# View logs: npm run logs:follow
```

### API Testing Tools

**Postman Collection URL:** See README.md for collection export

**Manual cURL Testing:**
```bash
# Test GET
curl -X GET http://localhost:3000/api/v1/health -v

# Test POST with JSON
curl -X POST http://localhost:3000/api/v1/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"test@test.com","password":"pass"}' \
  -v

# View response headers
curl -i http://localhost:3000/api/v1/health
```

---

## ⚙️ Common Issues & Fixes

### Port Already in Use
```bash
# Find process on port 3000
lsof -i :3000

# Kill it
kill -9 <PID>

# Or use different port
PORT=3001 npm run dev
```

### JWT_SECRET Not Set
```bash
# Error: JWT_SECRET not configured

# Fix: Add to .env
JWT_SECRET=your-secret-key-32-chars-minimum
```

### Database Locked
```bash
# Error: database is locked

# Fix: Close all connections, restart
npm run dev
```

### Account Locked
```bash
# Error: Account locked after 5 failed attempts

# Wait 30 minutes for auto-unlock
# Or in development, manually update:
sqlite3 database.sqlite
UPDATE users SET status='active', failedLoginAttempts=0 WHERE id=1;
```

### Test Failures
```bash
# Likely causes:
# 1. Database state - clear it
rm database.sqlite
npm run migrate

# 2. NODE_ENV not set to test
NODE_ENV=test npm run test

# 3. Port in use
npm run test -- --forceExit
```

---

## 📊 Database Schema Quick Reference

```
users (Base authentication)
├── students
├── companies
└── coordinators

OjtPostings (Job listings)
├── Applications (student applications)
└── PostingSkills (required skills)

StudentSkills (what students know)
MatchScores (cached compatibility)
AuditLogs (security logging)
Notifications (in-app messages)
PasswordResetToken (password recovery)
```

### Common Relationship Queries

```javascript
// Get student with all data
const student = await Student.findOne({
  where: { user_id: userId },
  include: [
    { model: StudentSkill },
    { model: Application, include: [OjtPosting] }
  ]
});

// Get posting with skills
const posting = await OjtPosting.findOne({
  where: { id: postingId },
  include: [PostingSkill]
});

// Get matches for student
const matches = await MatchScore.findAll({
  where: { student_id: studentId },
  include: [OjtPosting],
  order: [['overall_score', 'DESC']]
});
```

---

## 🔒 Security Checklist

### Before Deployment
- [ ] `NODE_ENV=production`
- [ ] Long, random `JWT_SECRET` (32+ characters)
- [ ] Database backup strategy
- [ ] Error logging configured
- [ ] Rate limiting active
- [ ] CORS configured correctly
- [ ] Helmet security headers enabled
- [ ] Audit logging working
- [ ] SQL injection tests pass
- [ ] RBAC tests pass

### During Development
- [ ] Never commit `.env` file
- [ ] Don't log passwords
- [ ] Validate all inputs
- [ ] Test with invalid data
- [ ] Check console for secrets

---

## 📚 Full Documentation Index

| Document | Purpose | Best For |
|----------|---------|----------|
| [00-README.md](./00-README.md) | Overview & navigation | **Start here** |
| [01-ARCHITECTURE.md](./01-ARCHITECTURE.md) | System design patterns | Understanding the big picture |
| [02-DATABASE-SCHEMA.md](./02-DATABASE-SCHEMA.md) | All 15 models & fields | Database questions |
| [03-API-REFERENCE.md](./03-API-REFERENCE.md) | 50+ endpoints documented | API development |
| [04-MODELS.md](./04-MODELS.md) | Model class methods | Model implementation |
| [05-SERVICES.md](./05-SERVICES.md) | Service layer methods | Business logic |
| [06-MIDDLEWARE.md](./06-MIDDLEWARE.md) | Auth & validation | Request processing |
| [07-UTILITIES.md](./07-UTILITIES.md) | Error & logging | Debugging & monitoring |
| [08-SECURITY-ANALYSIS.md](./08-SECURITY-ANALYSIS.md) | OWASP compliance | Security review |
| [09-TESTING-GUIDE.md](./09-TESTING-GUIDE.md) | 150+ test examples | Writing tests |
| [10-TROUBLESHOOTING.md](./10-TROUBLESHOOTING.md) | Common issues | Fixing problems |
| [11-ARCHITECTURE-DECISIONS.md](./11-ARCHITECTURE-DECISIONS.md) | Design decisions (ADRs) | Understanding "why" |
| [12-QUICK-START.md](./12-QUICK-START.md) | This document! | Quick lookup |

---

## 🎯 Typical Workflows

### Adding a New Feature

1. **Understand architecture** → Read [01-ARCHITECTURE.md](./01-ARCHITECTURE.md)
2. **Plan database changes** → See [02-DATABASE-SCHEMA.md](./02-DATABASE-SCHEMA.md)
3. **Create model/migration** → Follow patterns in [04-MODELS.md](./04-MODELS.md)
4. **Implement service** → Write business logic, reference [05-SERVICES.md](./05-SERVICES.md)
5. **Add routes** → Use API patterns from [03-API-REFERENCE.md](./03-API-REFERENCE.md)
6. **Test** → Follow [09-TESTING-GUIDE.md](./09-TESTING-GUIDE.md)
7. **Check security** → Review [08-SECURITY-ANALYSIS.md](./08-SECURITY-ANALYSIS.md)

### Fixing a Bug

1. **Locate the service** → Reference [05-SERVICES.md](./05-SERVICES.md)
2. **Add test case** → Examples in [09-TESTING-GUIDE.md](./09-TESTING-GUIDE.md)
3. **Fix the code**
4. **Verify test passes** → `npm run test`
5. **Check logs** → `npm run logs:follow`

### Deploying to Production

1. **Review security** → [08-SECURITY-ANALYSIS.md](./08-SECURITY-ANALYSIS.md) checklist
2. **Run full test suite** → `npm run test:coverage`
3. **Set production env vars** → See environment section above
4. **Backup database** → [10-TROUBLESHOOTING.md](./10-TROUBLESHOOTING.md) procedures
5. **Monitor after deploy** → View audit logs & errors continuously

---

## 🆘 Support & Learning Paths

### I Want to Learn...

**The whole system:** [00-README.md](./00-README.md) + [01-ARCHITECTURE.md](./01-ARCHITECTURE.md)

**How data flows:** [02-DATABASE-SCHEMA.md](./02-DATABASE-SCHEMA.md) + [03-API-REFERENCE.md](./03-API-REFERENCE.md)

**How to build features:** [04-MODELS.md](./04-MODELS.md) + [05-SERVICES.md](./05-SERVICES.md)

**How to test code:** [09-TESTING-GUIDE.md](./09-TESTING-GUIDE.md) + examples

**How to secure code:** [08-SECURITY-ANALYSIS.md](./08-SECURITY-ANALYSIS.md) + [10-TROUBLESHOOTING.md](./10-TROUBLESHOOTING.md)

**Why design decisions were made:** [11-ARCHITECTURE-DECISIONS.md](./11-ARCHITECTURE-DECISIONS.md)

### When Things Break

1. Check [10-TROUBLESHOOTING.md](./10-TROUBLESHOOTING.md) for your issue
2. Enable debug: `DEBUG=ojt-system:* npm run dev`
3. Check logs: `npm run logs:follow`
4. Review tests: `npm run test:watch`
5. Check database: `sqlite3 database.sqlite`

---

## 💡 Pro Tips

### Faster Development
```bash
# Watch tests while coding
npm run test:watch

# In another terminal, watch service
NODE_ENV=development npm run dev
```

### Code Quality
```bash
# Run before committing
npm run test:coverage
npm run lint  # if available
```

### Learning
```bash
# Read actual source code alongside docs
# Docs + source code = full understanding

# Search for function in docs
grep -r "functionName" docs/
```

---

## 📞 Need Help?

1. **Check quick reference:** This document
2. **Search documentation:** Use grep or Ctrl+F
3. **Read relevant guide:** See index above
4. **Run tests:** `npm run test` for examples
5. **Check codebase:** Source code is implementation of docs

---

**Last Updated:** April 2026  
**Documentation Version:** 2.0.0  
**System Version:** OJT-SYSTEM-V2-BACKEND

**Next Step:** Pick a document from the index above based on your need!
