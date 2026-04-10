# OJT System V2 Backend - Complete Technical Documentation

**Version:** 2.0.0  
**Last Updated:** April 9, 2026  
**Status:** Production Ready  
**Framework:** Node.js/Express + Sequelize ORM + SQLite

---

## 📚 Documentation Overview

This comprehensive documentation covers every aspect of the OJT System V2 Backend. Navigate using the links below or read sequentially.

### Quick Navigation

| Document | Purpose | Audience |
|----------|---------|----------|
| [**01-ARCHITECTURE.md**](./01-ARCHITECTURE.md) | System design, patterns, technology choices | Developers, Architects |
| [**02-DATABASE-SCHEMA.md**](./02-DATABASE-SCHEMA.md) | Database design, relationships, migrations | DBAs, Developers |
| [**03-API-REFERENCE.md**](./03-API-REFERENCE.md) | Complete API endpoints with examples | Frontend, API Users |
| [**04-MODELS.md**](./04-MODELS.md) | All data models explained in detail | Backend Developers |
| [**05-SERVICES.md**](./05-SERVICES.md) | Business logic layer documentation | Backend Developers |
| [**06-MIDDLEWARE.md**](./06-MIDDLEWARE.md) | Authentication, validation, middleware explained | Backend Developers |
| [**07-UTILITIES.md**](./07-UTILITIES.md) | Helper functions, error handling, logging | Backend Developers |
| [**08-SECURITY-ANALYSIS.md**](./08-SECURITY-ANALYSIS.md) | Security measures, OWASP compliance | Security, DevOps |
| [**09-TESTING-GUIDE.md**](./09-TESTING-GUIDE.md) | Test strategy, test cases, coverage | QA, Developers |
| [**10-TROUBLESHOOTING.md**](./10-TROUBLESHOOTING.md) | Common issues, debugging, maintenance | DevOps, Support |
| [**11-ARCHITECTURE-DECISIONS.md**](./11-ARCHITECTURE-DECISIONS.md) | Why decisions were made, trade-offs | Architects, Tech Leads |
| [**12-QUICK-START.md**](./12-QUICK-START.md) | Quick reference for developers | All Developers |

---

## 🎯 Project Overview

### What is this system?

The OJT (On-the-Job Training) System V2 is an intelligent job matching platform that:

- **Connects Students** with job opportunities based on skills, availability, and location
- **Helps Companies** post job openings and find suitable candidates
- **Automates Matching** using a weighted scoring algorithm
- **Tracks Applications** with workflow management
- **Manages Credentials** through secure authentication and authorization

### Key Features

✅ **Intelligent Matching Algorithm** - Weighted scoring (Skills 40%, Location 20%, Availability 20%, GPA 10%, Program 10%)  
✅ **Role-Based Access Control** - Student, Company, Coordinator, Admin roles  
✅ **Account Security** - Bcrypt password hashing, JWT tokens, failed login tracking  
✅ **Audit Logging** - Complete audit trail of sensitive operations  
✅ **Profile Management** - Students and companies can update profiles  
✅ **Application Tracking** - Monitor application status through workflow  
✅ **Skill Management** - Students add skills with proficiency levels

---

## 🏗️ Technology Stack

| Layer | Technology | Version | Purpose |
|-------|-----------|---------|---------|
| **Runtime** | Node.js | 18+ | JavaScript runtime |
| **Framework** | Express.js | ^4.18.0 | Web framework |
| **Database** | SQLite | 5.1.0 | Lightweight relational DB |
| **ORM** | Sequelize | ^6.35.0 | Database abstraction |
| **Security** | Bcrypt | ^5.1.0 | Password hashing |
| **Auth** | JWT (jsonwebtoken) | ^9.0.0 | Token-based auth |
| **Validation** | express-validator | ^7.0.0 | Input validation |
| **Middleware** | Helmet | ^7.0.0 | Security headers |
| **Middleware** | CORS | ^2.8.5 | Cross-origin support |
| **Logging** | Morgan | ^1.10.0 | HTTP request logging |
| **Testing** | Jest | ^29.0.0 | Unit/Integration tests |
| **Testing** | Supertest | ^6.3.0 | HTTP assertion library |

---

## 📊 System Statistics

| Metric | Value |
|--------|-------|
| **Models** | 15 (User, Student, Company, Application, etc.) |
| **Services** | 4 (Auth, Student, Matching, Notification) |
| **Middleware** | 2 (Auth, Validation) |
| **Database Tables** | 15 (with relationships) |
| **API Endpoints** | 50+ (documented in API Reference) |
| **Test Suites** | 4 (150+ individual tests) |
| **Test Coverage** | 70%+ statements |

---

## 🚀 Getting Started

### Prerequisites

```bash
# Node.js and npm
node --version  # Should be 18+
npm --version   # Should be 8+
```

### Installation

```bash
# 1. Install dependencies
npm install

# 2. Set up environment variables
cp .env.example .env  # Create .env from template

# 3. Start development server
npm run dev

# 4. Run tests
npm test
```

### Environment Variables

Critical environment variables (see `.env.example`):

```env
# Application
APP_ENV=development
APP_PORT=5000
APP_NAME=OJT System V2
APP_DEBUG=true

# Database
DB_CONNECTION=sqlite
DB_PATH=./database/ojt_system.db

# Authentication
JWT_SECRET=your-secret-key-min-32-chars
JWT_EXPIRES_IN=7d

# Security
BCRYPT_ROUNDS=10
RATE_LIMIT_WINDOW_MS=900000
RATE_LIMIT_MAX_REQUESTS=100

# CORS
CORS_ORIGIN=http://localhost:3000
```

### Running the Application

```bash
# Development with auto-reload
npm run dev

# Production
npm start

# Run tests
npm test
npm run test:watch
npm run test:unit
npm run test:integration
```

---

## 📁 Project Structure

```
src/
├── server.js                 # Entry point
├── config/
│   ├── database.js          # Sequelize configuration
│   └── env.js               # Environment variables
├── middleware/
│   ├── auth.js              # JWT & RBAC
│   └── validation.js        # Input validation
├── models/
│   ├── User.js              # Base user model
│   ├── Student.js           # Student profile
│   ├── Company.js           # Company profile
│   ├── OjtPosting.js        # Job posting
│   ├── Application.js       # Job application
│   ├── Skill.js             # Skills (student & posting)
│   ├── Matching.js          # Match scores & rules
│   ├── Audit.js             # Audit logs & notifications
│   ├── Coordinator.js       # Coordinator profile
│   ├── PasswordResetToken.js # Password reset
│   └── index.js             # Model initialization
├── services/
│   ├── AuthService.js       # Authentication logic
│   ├── StudentService.js    # Student operations
│   ├── MatchingService.js   # Matching algorithm
│   └── NotificationService.js # Notifications & audit
└── utils/
    └── errorHandler.js      # Error handling & logging

tests/
├── setup.js                 # Jest configuration
├── helpers.js               # Test factories
├── unit/                    # Unit tests
└── integration/             # Integration tests

database/
├── migrations/              # Schema migrations
└── ojt_system.db           # SQLite database (development)
```

---

## 🔐 Security Highlights

- **Password Security**: Bcrypt hashing with 10 rounds
- **Token Security**: JWT with expiration (7 days)
- **Input Validation**: express-validator on all endpoints
- **SQL Protection**: Sequelize ORM prevents SQL injection
- **Account Lockout**: 5 failed login attempts lock account for 30 minutes
- **Audit Logging**: All sensitive operations logged
- **CORS Protection**: Configurable cross-origin requests
- **Security Headers**: Helmet.js for standard security headers

See [**08-SECURITY-ANALYSIS.md**](./08-SECURITY-ANALYSIS.md) for comprehensive security analysis.

---

## 📈 Performance Considerations

- **In-Memory SQLite**: Used in development for speed
- **Database Indexes**: Optimized queries on frequently accessed fields
- **Match Score Caching**: Pre-calculated compatibility scores
- **Connection Pooling**: Reusable database connections
- **JWT Stateless**: No session storage needed

---

## 🧪 Testing

```bash
# Run all tests (150+ tests)
npm test

# Watch mode for development
npm run test:watch

# Unit tests only
npm run test:unit

# Integration tests only
npm run test:integration

# Verbose output
npm run test:verbose

# Coverage report
npm test           # Coverage generated in ./coverage/
```

**Current Coverage:** 70%+ statements  
**Test Files:** 4 suites with 150+ individual tests  
**Execution Time:** 5-10 seconds

---

## 📋 Coding Standards Applied

### Principles

- **KISS** - Keep it small & simple
- **Single Responsibility** - Each class has one reason to change
- **DRY** - Don't repeat yourself
- **Encapsulation** - Hide implementation details
- **Early Return** - Avoid deep nesting (max 2-3 levels)

### Best Practices

- ✅ Meaningful comments (what and why)
- ✅ Input validation on all endpoints
- ✅ Errors handled with try-catch
- ✅ Logging for debugging and monitoring
- ✅ OWASP security best practices
- ✅ Comprehensive test coverage

---

## 🐛 Common Debugging Tips

1. **Check Logs**: See `./logs/app.log`
2. **Enable Debug Mode**: Set `APP_DEBUG=true` in `.env`
3. **Database Issues**: Run migrations first
4. **Auth Problems**: Verify JWT_SECRET is set
5. **Tests Failing**: Ensure `NODE_ENV=test` environment

See [**10-TROUBLESHOOTING.md**](./10-TROUBLESHOOTING.md) for detailed troubleshooting.

---

## 📞 Support & Contribution

For issues or questions:

1. Check [**10-TROUBLESHOOTING.md**](./10-TROUBLESHOOTING.md)
2. Review relevant documentation file above
3. Check [**09-TESTING-GUIDE.md**](./09-TESTING-GUIDE.md) for test examples
4. Review [**11-ARCHITECTURE-DECISIONS.md**](./11-ARCHITECTURE-DECISIONS.md) for context

---

## 📄 Documentation Index

| # | Document | Status | Details |
|---|----------|--------|---------|
| 01 | ARCHITECTURE | ✅ Complete | System design, patterns, stack |
| 02 | DATABASE-SCHEMA | ✅ Complete | All 15 models, relationships |
| 03 | API-REFERENCE | ✅ Complete | 50+ endpoints with examples |
| 04 | MODELS | ✅ Complete | Every model field explained |
| 05 | SERVICES | ✅ Complete | All services documented |
| 06 | MIDDLEWARE | ✅ Complete | Auth, validation detailed |
| 07 | UTILITIES | ✅ Complete | Error handlers, logging |
| 08 | SECURITY-ANALYSIS | ✅ Complete | OWASP compliance checked |
| 09 | TESTING-GUIDE | ✅ Complete | Test strategy & cases |
| 10 | TROUBLESHOOTING | ✅ Complete | Solutions for common issues |
| 11 | ARCHITECTURE-DECISIONS | ✅ Complete | ADRs for key decisions |
| 12 | QUICK-START | ✅ Complete | Quick developer reference |

---

## 📊 Version History

| Version | Date | Changes |
|---------|------|---------|
| 2.0.0 | Apr 2026 | Account lockout, audit logging, matching algorithm |
| 1.0.0 | Mar 2026 | Initial release with basic auth and matching |

---

**Next Steps:** Start with [**01-ARCHITECTURE.md**](./01-ARCHITECTURE.md) for system overview, or jump to [**12-QUICK-START.md**](./12-QUICK-START.md) for quick reference.
