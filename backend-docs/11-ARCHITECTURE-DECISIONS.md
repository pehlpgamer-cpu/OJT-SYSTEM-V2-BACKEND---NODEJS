# 11 - Architecture Decisions & ADRs

**Version:** 2.0.0  
**Format:** Architecture Decision Records (ADRs)

---

## ADR-001: Service Layer Pattern

**Status:** Accepted  
**Date:** March 2026  
**Context:** Business logic needs to be decoupled from HTTP layer for testability and reusability.

### Decision
Use Service Layer pattern where:
- Services handle all business logic
- Controllers only handle HTTP (request/response)
- Services called from anywhere (routes, jobs, etc)
- Services depend on models, not vice versa

### Implementation

```
Request → Controller → Service → Model → Database
Response ← Controller ← Service ← Model
```

### Consequences

✅ **Positive:**
- Services easily testable in isolation
- Business logic reusable across endpoints
- Separation of concerns
- Easier to maintain

❌ **Negative:**
- Extra layer adds complexity
- More files to navigate
- Potential overhead

### Examples

AuthService, StudentService, MatchingService all encapsulate domain logic.

---

## ADR-002: Sequelize ORM vs SQL

**Status:** Accepted  
**Date:** March 2026  
**Context:** Need database abstraction for safety and developer experience.

### Decision
Use Sequelize ORM for:
- Protection against SQL injection
- Query parameterization
- Model relationships
- Migration support
- Validation layer

NOT use raw SQL unless absolutely necessary.

### Rationale

**SQL Injection Prevention:**
```javascript
// ✅ Safe with Sequelize
await User.findOne({ where: { email: userInput } });

// ❌ Unsafe (raw SQL)
await sequelize.query(`SELECT * FROM users WHERE email = '${userInput}'`);
```

### Consequences

✅ **Positive:**
- SQL injection prevention
- Easier to debug (see generated SQL)
- Consistent across databases
- Automatic relationship management

❌ **Negative:**
- Performance overhead (slight)
- Requires learning curve
- Some complex queries hard to write

---

## ADR-003: JWT over Sessions

**Status:** Accepted  
**Date:** March 2026  
**Context:** Need to choose authentication strategy for scalability.

### Decision
Use JWT (JSON Web Tokens) for authentication:

**Why JWT instead of sessions:**

| Feature | JWT | Sessions |
|---------|-----|----------|
| Stateless | ✅ Yes | ❌ No (server stores) |
| Scalable | ✅ Scales horizontally | ❌ Requires shared store |
| Mobile-friendly | ✅ Yes | ⚠️ Cookie-based issues |
| CORS support | ✅ Yes | ⚠️ Cookie limitations |
| Performance | ✅ No server lookup | ❌ Server lookup required |

**JWT Structure:**
```
Header.Payload.Signature
```

**Token Flow:**
```
1. Login: Server creates JWT, returns to client
2. Storage: Client stores in localStorage/sessionStorage
3. Request: Client sends with Authorization: Bearer <token>
4. Verification: Server verifies signature without DB lookup
5. Access: No server-side session storage needed
```

### Consequences

✅ **Positive:**
- Stateless - scales to multiple servers
- Reduces database load
- Mobile/SPA friendly
- RESTful (no session cookies needed)

❌ **Negative:**
- Token revocation not immediate
- Token size larger than session cookie
- Client must implement token refresh

---

## ADR-004: Weighted Matching Algorithm

**Status:** Accepted  
**Date:** March 2026  
**Context:** Need to match students to job postings intelligently.

### Decision
Use weighted scoring system with 5 factors:

```
Score = (Skill*0.40) + (Location*0.20) + (Availability*0.20) + (GPA*0.10) + (Program*0.10)
```

### Rationale

**Why these weights?**
- **Skills (40%)** - Most important factor
- **Location (20%)** - Geographic match 
- **Availability (20%)** - Can student work when job needs them?
- **GPA (10%)** - Academic performance
- **Program (10%)** - Academic program alignment

**Why this approach?**
- Transparent - students see score breakdown
- Customizable - weights can be adjusted per institution
- Extensible - new factors can be added
- Fair - multiple factors considered

### Alternative Considered

**Machine Learning Approach:**
- Train model on historical matches
- Optimize weights automatically
- Cons: Requires data, complexity

**Chosen:** Simpler weighted approach with manual weights.

### Consequences

✅ **Positive:**
- Easy to understand
- Easy to debug
- Customizable per institution
- No dependencies

❌ **Negative:**
- Manual weight tuning needed
- May not catch subtle patterns
- Weights may need adjustment

---

## ADR-005: SQLite for Development

**Status:** Accepted  
**Date:** March 2026  
**Context:** Need lightweight database for development.

### Decision
Use SQLite for development, with migration path to PostgreSQL.

### Why SQLite for Development?

- ✅ No server setup needed
- ✅ File-based (easy backup)
- ✅ Zero configuration
- ✅ Fast startup
- ✅ No Docker needed

### Migration Path to Production

```
Development: SQLite
     ↓ (Sequelize adapter switch)
Production: PostgreSQL
```

**Code change:**
```javascript
// Only change dialect in config
dialect: 'sqlite'  // Dev
dialect: 'postgres' // Prod
```

### Consequences

✅ **Positive:**
- Fast development loop
- Easy onboarding for new devs
- No infrastructure needed

❌ **Negative:**
- SQLite not suitable for production (concurrency issues)
- Migration to PostgreSQL needed

---

## ADR-006: Role-Based Access Control

**Status:** Accepted  
**Date:** March 2026  
**Context:** Need flexible permissions system.

### Decision
Implement RBAC with 4 predefined roles:

| Role | Purpose | Can Do |
|------|---------|--------|
| student | Job seeker | View profiles, apply, track apps |
| company | Employer | Post jobs, view applications |
| coordinator | Faculty | Manage program, verify entries |
| admin | System administrator | All operations |

### Implementation

```javascript
// Middleware enables role checking
app.get('/api/admin/users',
  authMiddleware,
  rbacMiddleware(['admin']),  // Only admins
  handler
);
```

### Alternative Considered

**Permission-based (Fine-grained):**
- Each action has own permission
- More flexible but complex

**Chosen:** Role-based is simpler and sufficient.

### Consequences

✅ **Positive:**
- Simple to understand
- Easy to implement
- Covers all use cases

❌ **Negative:**
- Cannot give granular permissions
- All admins have all permissions
- Adding new role requires code change

---

## ADR-007: Account Lockout Policy

**Status:** Accepted  
**Date:** April 2026  
**Context:** Need security against brute-force login attacks.

### Decision
Lock account after 5 failed login attempts for 30 minutes.

### Rationale

**Why 5 attempts?**
- Google: 5 attempts
- Industry standard
- Balances security vs user frustration

**Why 30 minutes?**
- Long enough to discourage brute-force (can't try 1000s/min)
- Not so long that legitimate user locked out forever
- Auto-unlock without admin intervention

### Implementation

```javascript
// Tracking
user.failedLoginAttempts += 1;

// Locking
if (failedLoginAttempts >= 5) {
  user.status = 'locked';
  user.lockedUntil = Date.now() + 30 * 60 * 1000;
}

// Unlocking
if (Date.now() > user.lockedUntil) {
  user.status = 'active';
  user.failedLoginAttempts = 0;
}
```

### Consequences

✅ **Positive:**
- Prevents brute-force attacks
- Auto-recovery (no admin intervention)
- Logged for security review

❌ **Negative:**
- User impact if password forgotten
- Legitimate users might get locked out

---

## ADR-008: Soft Deletes

**Status:** Accepted  
**Date:** March 2026  
**Context:** Need to preserve data history and enable recovery.

### Decision
Use soft deletes (paranoid mode) - mark deleted records with timestamp instead of removing.

### Implementation

```javascript
// Soft delete (marked deleted)
await user.destroy();
// Sets: deletedAt = NOW()

// Query excludes deleted by default
const users = await User.findAll();
// WHERE deletedAt IS NULL

// Include deleted in query
const all = await User.findAll({ paranoid: false });

// Restore
await user.restore();
// Clears deletedAt
```

### Consequences

✅ **Positive:**
- Data recovery possible
- Audit trail preserved
- Compliance (GDPR right to access)
- Soft deletes per Sequelize

❌ **Negative:**
- Database size grows
- More complex queries
- Hard deletes needed eventually

---

## ADR-009: Middleware Stack Order

**Status:** Accepted  
**Date:** March 2026  
**Context:** Order of middleware matters for functionality.

### Decision
Middleware order:

```
1. Helmet (security)
2. CORS (cross-origin)
3. Body parsing (JSON)
4. Logging (Morgan)
5. Authentication (JWT verify)
6. Authorization (RBAC)
7. Validation (Input)
8. Routes
```

### Rationale

- Security first (Helmet)
- Then cross-origin handling
- Parse requests before use
- Log all requests
- Auth BEFORE routes
- Validation before handlers

### Consequences

✅ **Positive:**
- Consistent security
- Clear processing order
- All requests logged
- Validation before business logic

---

## ADR-010: Testing Framework (Jest)

**Status:** Accepted  
**Date:** March 2026  
**Context:** Need testing framework for unit and integration tests.

### Decision
Use Jest with Supertest for API tests.

### Why Jest?

- ✅ No setup needed
- ✅ Built-in mocking
- ✅ Good DX
- ✅ Wide adoption
- ✅ Fast

### With Supertest for API testing

```javascript
// Unit test
test('function returns correct value', () => {
  expect(func()).toBe(expected);
});

// API test
test('POST /api returns 201', async () => {
  const res = await request(app)
    .post('/api/users')
    .send(data);
  expect(res.status).toBe(201);
});
```

### Consequences

✅ **Positive:**
- Great developer experience
- Quick test feedback
- Comprehensive coverage

---

## ADR-011: Error Handling Approach

**Status:** Accepted  
**Date:** March 2026  
**Context:** Need consistent error responses.

### Decision
Create AppError class wrapping all errors into consistent format.

```javascript
throw new AppError(message, statusCode, context);
```

### Benefits

- Consistent response format
- Easy to identify application errors
- Context information for debugging
- Logging integrated

### Response Format

```json
{
  "message": "Error description",
  "statusCode": 400,
  "timestamp": "2026-04-08T..."
}
```

---

## ADR-012: Code Organization

**Status:** Accepted  
**Date:** March 2026  
**Context:** Need clear structure for growing codebase.

### Decision
Organize by functionality, not layers:

```
src/
├── config/        (Configuration)
├── middleware/    (HTTP middleware)
├── models/        (Data models)
├── services/      (Business logic)
└── utils/         (Helpers)
```

### Why?

- Navigate by feature (find related code together)
- Growth-friendly (easy to add new feature)
- Dependencies clear (services → models)

### Alternative Considered

Organize by layer (all controllers together, all services together) - harder to find related code.

---

## Summary Table

| Topic | Decision | Rationale |
|-------|----------|-----------|
| Architecture | Service Layer | Testability, reusability |
| Database | Sequelize + SQLite | SQL injection prevention |
| Auth | JWT | Stateless, scalable |
| Matching | Weighted scoring | Transparent, customizable |
| Access Control | RBAC | Simple, sufficient |
| Security | Account lockout | Brute-force protection |
| Deletes | Soft deletes | Data recovery, compliance |
| Testing | Jest + Supertest | Great DX, fast feedback |
| Errors | AppError class | Consistent handling |

---

**Next:** See [**12-QUICK-START.md**](./12-QUICK-START.md) for quick reference guide.
