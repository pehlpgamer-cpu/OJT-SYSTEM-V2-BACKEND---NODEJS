# 01 - System Architecture & Design Patterns

**Version:** 2.0.0  
**Date:** April 9, 2026

---

## 📐 Architecture Overview

The OJT System V2 Backend follows a **layered architecture** pattern with clear separation of concerns:

```
┌─────────────────────────────────────────────────────────────┐
│                   HTTP Requests (REST API)                   │
├─────────────────────────────────────────────────────────────┤
│          Express.js Framework + Middleware Layer              │
│  ┌─────────────────────────────────────────────────────────┐ │
│  │ Security: Helmet, CORS | Logging: Morgan                │ │
│  │ Auth: JWT Middleware | Validation: express-validator    │ │
│  └─────────────────────────────────────────────────────────┘ │
├─────────────────────────────────────────────────────────────┤
│           Business Logic Layer (Services)                     │
│  ┌─────────────────────────────────────────────────────────┐ │
│  │ AuthService | StudentService | MatchingService          │ │
│  │ NotificationService | AuditService                       │ │
│  └─────────────────────────────────────────────────────────┘ │
├─────────────────────────────────────────────────────────────┤
│           Data Access Layer (Models/ORM)                      │
│  ┌─────────────────────────────────────────────────────────┐ │
│  │ Sequelize ORM - Handles all database queries             │ │
│  │ 15 Data Models with relationships                        │ │
│  └─────────────────────────────────────────────────────────┘ │
├─────────────────────────────────────────────────────────────┤
│           Database Layer                                      │
│  ┌─────────────────────────────────────────────────────────┐ │
│  │ SQLite - Lightweight relational database                │ │
│  │ 15 Tables with indexes and foreign keys                 │ │
│  └─────────────────────────────────────────────────────────┘ │
└─────────────────────────────────────────────────────────────┘
```

---

## 🏗️ Architectural Layers

### Layer 1: HTTP & Middleware Layer

**Purpose:** Handle HTTP requests, security, and validation  
**Technologies:** Express.js, Helmet, CORS, Morgan, express-validator

**Responsibilities:**
- Accept HTTP requests
- Apply security headers (Helmet)
- Handle CORS policies
- Log all requests (Morgan)
- Validate input (express-validator)
- Authenticate users (JWT)
- Authorize based on role (RBAC)

**Flow:**
```
Request → Middleware Stack → Route Handler → Service Call → Database
Response ← Error Handler ← Service Response ← Database Response
```

### Layer 2: Business Logic Layer (Services)

**Purpose:** Encapsulate business rules and domain logic  
**Technologies:** Plain JavaScript classes

**Responsibilities:**
- Process requests
- Apply business rules
- Validate data
- Coordinate models
- Handle errors

**Services Implemented:**
- **AuthService** - Registration, login, token generation, password reset
- **StudentService** - Profile management, skill management
- **MatchingService** - Intelligent job matching algorithm
- **NotificationService** - In-app notifications
- **AuditService** - Audit logging for compliance

**Benefits:**
- ✅ Reusable across endpoints
- ✅ Easy to test in isolation
- ✅ Business logic not tied to HTTP
- ✅ Single Responsibility Principle

### Layer 3: Data Access Layer (ORM)

**Purpose:** Abstract database operations  
**Technologies:** Sequelize ORM

**Responsibilities:**
- Define data models
- Manage relationships
- Execute queries safely (prevent SQL injection)
- Handle transactions
- Manage database connections

**Why Sequelize?**
- Prevents SQL injection through parameterized queries
- Automatic model associations
- Built-in validation
- Migration support
- Works with SQLite, PostgreSQL, MySQL

### Layer 4: Database Layer

**Purpose:** Persistent data storage  
**Technologies:** SQLite

**Database Features:**
- 15 normalized tables
- Foreign key constraints
- Indexes on frequently queried fields
- Cascading deletes
- Soft deletes (paranoid mode)

---

## 🔄 Data Flow Examples

### Example 1: User Login

```
1. POST /api/auth/login
   ↓
2. Express middleware validates request
   ↓
3. authMiddleware checks if unauthenticated (skipped for login)
   ↓
4. handleValidationErrors checks email/password format
   ↓
5. AuthService.login() called
   - Looks up user by email (database query)
   - Compares password with bcrypt
   - If valid, generates JWT token
   - Logs login attempt (AuditService)
   ↓
6. Response sent with user data + token
   ↓
7. Parser writes to logs (Morgan)
```

### Example 2: Get Student Matches

```
1. GET /api/student/matches
   ↓
2. authMiddleware verifies JWT token
   ↓
3. req.user populated with decoded token data
   ↓
4. rbacMiddleware checks user is 'student' role
   ↓
5. StudentService.getMatches(userId)
   ↓
6. MatchingService.calculateForStudent(studentId)
   - Fetches student with all skills
   - Gets all active job postings
   - For each posting, calculates 5 compatibility scores:
     * Skill match (40% weight)
     * Location match (20% weight)
     * Availability match (20% weight)
     * GPA match (10% weight)
     * Academic program match (10% weight)
   - Calculates weighted overall score (0-100)
   - Stores score in MatchScore table
   - Returns sorted by overall_score DESC
   ↓
7. API returns array of matches with scores
```

---

## 🎯 Design Patterns Used

### 1. **Service Layer Pattern**
- Encapsulates business logic in service classes
- Routes call services, services call models
- Makes code testable and reusable

```javascript
// Example: AuthService
class AuthService {
  async login(email, password) {
    // Business logic here
  }
  
  async register(data) {
    // More business logic
  }
}
```

### 2. **Dependency Injection**
- Services receive models as constructor parameter
- Makes services testable (can inject mock models)
- Decouples services from model instantiation

```javascript
export class AuthService {
  constructor(models) {
    this.models = models;  // Injected dependency
  }
}
```

### 3. **Adapter Pattern (Custom Error Handler)**
- AppError class adapts errors to consistent format
- Every error has same structure (message, statusCode, timestamp)
- Centralized error handling

```javascript
export class AppError extends Error {
  constructor(message, statusCode = 500, context = {}) {
    super(message);
    this.statusCode = statusCode;
    this.context = context;
  }
  
  toJSON() {
    return {
      message: this.message,
      statusCode: this.statusCode,
      timestamp: this.timestamp,
    };
  }
}
```

### 4. **Middleware Pattern**
- Middleware functions process requests sequentially
- Each middleware can modify req/res or call next()
- Enables composition of concerns

```javascript
app.use(helmet());           // Security
app.use(cors());             // CORS
app.use(express.json());     // Parsing
app.use(authMiddleware);     // Authentication
app.use(rbacMiddleware);     // Authorization
```

### 5. **Factory Pattern (Model Creation)**
- initializeModels() creates all models in one place
- Handles model relationships setup
- Easy to mock in tests

```javascript
export function initializeModels(sequelize) {
  const User = defineUser(sequelize);
  const Student = defineStudent(sequelize);
  // ... define all models
  
  // Setup relationships
  User.hasOne(Student, ...);
  Student.belongsTo(User, ...);
  
  return { User, Student, ... };
}
```

### 6. **Weighted Scoring Pattern (Matching Algorithm)**
- Multiple factors contribute to final score
- Each factor weighted by importance
- Transparent breakdown of scores

```javascript
const overallScore = 
  (skillScore * 0.40) +
  (locationScore * 0.20) +
  (availabilityScore * 0.20) +
  (gpaScore * 0.10) +
  (academicProgramScore * 0.10);
```

---

## 🔐 Security Architecture

### Authentication Flow

```
User → POST /api/auth/login with email/password
  ↓
AuthService.login()
  ├─ Find user by email
  ├─ Check account status (active/locked/suspended)
  ├─ Compare password with bcrypt
  │  └─ If failed: increment failedLoginAttempts, lock if ≥5
  ├─ Reset failedLoginAttempts to 0
  └─ Generate JWT token (expires in 7 days)
  ↓
Return { user, token }

Client stores token in localStorage

Subsequent requests:
POST /api/student/profile with Authorization: Bearer <token>
  ↓
authMiddleware
  ├─ Extract token from Authorization header
  ├─ Verify JWT signature (matches JWT_SECRET)
  ├─ Check expiration
  ├─ Decode token to get user data
  └─ Attach to req.user
  ↓
rbacMiddleware (if route requires role)
  ├─ Check req.user.role matches allowedRoles
  └─ Proceed or reject with 403
  ↓
Route handler executes with authenticated user context
```

### Authorization Strategy

**Role-Based Access Control (RBAC)**

```javascript
// Student can only access their own data
app.get('/api/student/profile', 
  authMiddleware, 
  rbacMiddleware(['student']),  // Only students
  studentController.getProfile
);

// Admin can manage users
app.delete('/api/admin/users/:id',
  authMiddleware,
  rbacMiddleware(['admin']),     // Only admins
  adminController.deleteUser
);

// Coordinator can manage applications
app.put('/api/coordinator/applications/:id/status',
  authMiddleware,
  rbacMiddleware(['coordinator', 'admin']),  // Coordinator or admin
  coordinatorController.updateApplicationStatus
);
```

### Input Validation Strategy

All inputs validated BEFORE reaching business logic:

```javascript
// Registration validation rules
[
  body('email').isEmail(),
  body('password').isLength({ min: 8 }).matches(/[A-Z]/).matches(/[0-9]/),
  body('name').isLength({ min: 2 }).matches(/^[a-zA-Z\s'-]+$/),
  handleValidationErrors  // Rejects if any validation fails
]
```

---

## 📊 Database Design

### Core Models

```
User (base)
├── hasOne → Student
├── hasOne → Company
├── hasOne → Coordinator
└── hasMany → PasswordResetToken

Student
├── hasMany → StudentSkill
├── hasMany → Application
└── hasMany → MatchScore (join with OjtPosting)

Company
└── hasMany → OjtPosting

OjtPosting
├── hasMany → PostingSkill
├── hasMany → Application
└── hasMany → MatchScore (join with Student)

Application
├── belongsTo → Student
├── belongsTo → OjtPosting
└── belongsTo → Resume

MatchScore
├── belongsTo → Student
├── belongsTo → OjtPosting
└── stores → 5 score components

AuditLog
├── tracks → all sensitive operations
└── created_at indexes

Notification
├── belongsTo → User
└── tracks → in-app messages
```

### Why This Design?

- **Normalized**: Reduces data duplication
- **Flexible**: Easy to add model relationships
- **Performant**: Indexes on frequently queried fields
- **Secure**: Foreign keys prevent orphaned records
- **Auditable**: Soft deletes maintain data history

---

## 🔄 Request/Response Cycle

### Successful Request

```javascript
// 1. Request arrives
GET /api/student/matches HTTP/1.1
Authorization: Bearer eyJhbGc...

// 2. Middleware processes
helmet()                    // Add security headers
cors()                     // Check CORS
express.json()             // Parse JSON body
morgan()                   // Log request
authMiddleware             // Verify JWT token
rbacMiddleware(['student']) // Check role

// 3. Route handler calls service
const matches = await studentService.getMatches(req.user.id)

// 4. Service uses models
const postings = await OjtPosting.findAll(...)
const scores = await calculateMatches(student, postings)

// 5. Response sent
HTTP/1.1 200 OK
{
  "data": [
    {
      "posting_id": 1,
      "overall_score": 87.5,
      "skill_score": 90,
      "location_score": 75,
      ...
    }
  ],
  "statusCode": 200
}
```

### Error Request

```javascript
// 1. Request arrives
POST /api/auth/login HTTP/1.1
Body: { email: "invalid", password: "123" }

// 2. Validation fails in middleware
handleValidationErrors intercepts
Returns: HTTP 422 with validation errors

HTTPResponse/1.1 422 Unprocessable Entity
{
  "message": "Validation failed",
  "statusCode": 422,
  "errors": {
    "email": ["Email must be valid"],
    "password": ["Password requirements not met"]
  }
}

// Never reaches business logic
```

---

## 🚀 Performance Optimizations

### Database Optimizations

1. **Indexes** - Fast lookups on:
   - User email (used in login queries)
   - Student preferred_location (location matching)
   - OjtPosting posting_status (active postings query)
   - MatchScore overall_score (sorting results)

2. **Connection Pooling** - Reuses database connections
   - Prevents opening new connection per request
   - Reduces latency

3. **Query Optimization**
   - Selective field retrieval (don't fetch all columns)
   - Eager loading with `include` (reduce N+1 queries)
   - Limit/offset for pagination

### Application Optimizations

1. **Caching** - MatchScore table caches calculated scores
   - Don't recalculate every request
   - Updated when profiles change

2. **Early Return** - Fail fast to avoid unnecessary processing
   ```javascript
   if (!user) throw new AppError('User not found', 404);
   if (!user.isActive) throw new AppError('User inactive', 403);
   // Process continues only if both checks pass
   ```

3. **Minimal Dependencies**
   - Only essential packages used
   - Less code = less overhead
   - Startup faster

---

## 🧪 Testability by Design

### Architecture supports testing

1. **Service Layer** - Services testable in isolation
   - Inject mock models
   - No HTTP layer
   - Pure business logic

2. **Dependency Injection** - Easy to mock
   ```javascript
   // Real: new AuthService(realModels)
   // Test: new AuthService(mockModels)
   ```

3. **Clear Inputs/Outputs** - Services have predictable behavior
   - Input: parameters
   - Output: return value
   - Side effects: logged

4. **Integration Tests** - Full request/response cycle
   - Use supertest to make HTTP requests
   - Verify entire middleware stack

---

## 📈 Scalability Considerations

### Current Architecture (SQLite)

**Good for:**
- Development
- Small teams
- Testing
- Prototyping

**Limitations:**
- Single file storage
- No built-in replication
- Limited concurrent writes
- Not suitable for >1GB data

### Future Scalability Options

1. **Migrate to PostgreSQL**
   - No code changes needed (Sequelize handles it)
   - Add connection pooling (pg-pool)
   - Add read replicas

2. **Add Caching Layer (Redis)**
   - Cache frequently accessed data
   - Session store
   - Real-time notifications

3. **Microservices**
   - Separate matching engine
   - Separate notification service
   - Message queues (RabbitMQ/Kafka)

---

## 🔗 Technology Justifications

| Technology | Why Chosen | Alternatives Considered |
|------------|-----------|------------------------|
| Express | Lightweight, widely used | Fastify (overkill), Koa |
| Sequelize | Easy to use, migrations | TypeORM (learning curve) |
| SQLite | Dev-friendly, no setup | PostgreSQL (complex for dev) |
| JWT | Stateless, scalable | Sessions (harder to scale) |
| Bcrypt | Industry standard | Argon2 (slower for passwords) |
| jest | Great DX, fixtures | Mocha (needs more config) |

---

## 📚 Design Principles Applied

### 1. Single Responsibility Principle (SRP)
Each class has one reason to change:
- AuthService handles auth only
- StudentService handles student operations only
- MatchingService handles matching only

### 2. Open/Closed Principle (OCP)
Classes open for extension, closed for modification:
- Can add new services without changing existing ones
- Can add new roles without changing RBAC logic

### 3. Dependency Inversion Principle (DIP)
Depend on abstractions, not concretions:
- Services depend on injected models
- Controllers depend on services
- Not: Services directly importing models

### 4. Don't Repeat Yourself (DRY)
- Validation rules defined once
- Error handling centralized
- Logging consistent across app

### 5. KISS (Keep It Simple, Stupid)
- No over-engineering
- Clear, readable code
- Comments explain "why", not "what"

---

## 🎓 Architectural Decision Records

See **11-ARCHITECTURE-DECISIONS.md** for detailed reasoning behind:
- Why service layer
- Why Sequelize ORM
- Why JWT over sessions
- Why weighted scoring algorithm
- Why role-based access control

---

**Next:** See [**02-DATABASE-SCHEMA.md**](./02-DATABASE-SCHEMA.md) for detailed database design.
