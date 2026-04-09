# 05 - Services Layer Documentation

**Version:** 2.0.0  
**Architecture:** Service Layer Pattern - All business logic encapsulated

---

## 🎯 Services Overview

Services encapsulate all business logic, keeping it separate from HTTP layer (controllers). Services are:
- **Testable** - Can test in isolation without HTTP
- **Reusable** - Can be called from any endpoint
- **Maintainable** - Business logic centralized

### Service Initialization

```javascript
import { AuthService } from './services/AuthService.js';
import { StudentService } from './services/StudentService.js';
import { MatchingService } from './services/MatchingService.js';

// All models loaded
const models = initializeModels(sequelize);

// Create service instances with dependency injection
const authService = new AuthService(models);
const studentService = new StudentService(models);
const matchingService = new MatchingService(models);
```

---

## 🔐 AuthService

**File:** `src/services/AuthService.js`  
**Purpose:** Handle authentication, registration, password reset

### Constructor

```javascript
constructor(models) {
  this.models = models;  // Injected dependency
}
```

### register(data)

Register new user and create role-specific profile.

**Parameters:**
```javascript
{
  name: string,
  email: string,
  password: string,
  role: 'student' | 'company' | 'coordinator'
}
```

**Returns:**
```javascript
{
  user: {
    id: number,
    name: string,
    email: string,
    role: string,
    status: string
  },
  token: string  // JWT
}
```

**Process:**
1. Check if email already exists (409 Conflict)
2. Validate role is allowed
3. Create User record (password auto-hashed)
4. Create role-specific profile:
   - Student: with profile_completeness = 0
   - Company: with accreditation_status = pending
   - Coordinator: with max_students = 50
5. Generate JWT token
6. Log registration
7. Return user + token

**Errors:**
- 409: Email already registered
- 400: Invalid role

---

### login(email, password)

Authenticate user and generate token.

**Parameters:**
```javascript
email: string,
password: string
```

**Returns:**
```javascript
{
  user: { ... },
  token: string  // JWT
}
```

**Process:**
1. Normalize email (lowercase, trim)
2. Find user by email
3. Check account status:
   - If 'locked': check lock expiration
   - If 'pending'/'suspended'/'inactive': reject (403)
4. Verify password with bcrypt
5. On mismatch: increment failedLoginAttempts
   - If ≥5: lock account for 30 minutes
6. On success: reset failedLoginAttempts to 0
7. Update last_login_at
8. Log login attempt
9. Generate JWT token
10. Return user + token

**Errors:**
- 401: Invalid email/password
- 423: Account locked (too many failed attempts)
- 403: Account pending/suspended/inactive

---

### verifyToken(token)

Verify JWT token validity and expiration.

**Parameters:**
```javascript
token: string  // JWT
```

**Returns:**
```javascript
{
  id: number,
  email: string,
  role: string,
  iat: number,  // Issued at
  exp: number   // Expiration
}
```

**Errors:**
- 401: Invalid token
- 401: Token expired

---

### resetPassword(email, newPassword)

Reset password for forgotten access.

**Parameters:**
```javascript
email: string,
newPassword: string
```

**Returns:**
```javascript
{
  message: 'Password reset successfully',
  statusCode: 200
}
```

**Process:**
1. Find user by email
2. Hash new password (bcrypt)
3. Update user password
4. Delete all existing password reset tokens
5. Log password reset
6. Return success

---

## 👨‍🎓 StudentService

**File:** `src/services/StudentService.js`  
**Purpose:** Student profile and skill management

### getProfile(userId)

Get student profile by user ID.

**Returns:**
```javascript
{
  id: number,
  user_id: number,
  first_name: string,
  last_name: string,
  phone: string,
  bio: string,
  preferred_location: string,
  availability_start: date,
  availability_end: date,
  profile_completeness_percentage: number,
  gpa: number,
  academic_program: string,
  year_of_study: string
}
```

**Errors:**
- 404: Student profile not found

---

### updateProfile(userId, data)

Update student profile fields.

**Parameters:**
```javascript
{
  first_name?: string,
  last_name?: string,
  phone?: string,
  bio?: string,
  current_location?: string,
  preferred_location?: string,
  profile_picture_url?: string,
  availability_start?: date,
  availability_end?: date,
  academic_program?: string,
  year_of_study?: string,
  gpa?: number
}
```

**Returns:** Updated student object

**Side Effects:**
- Profile completeness percentage automatically recalculated
- MatchScore records invalidated (need recalculation)
- Log profile update

**Allowed Fields:**
```javascript
const allowedFields = [
  'first_name', 'last_name', 'phone', 'bio',
  'current_location', 'preferred_location',
  'profile_picture_url', 'availability_start',
  'availability_end', 'academic_program', 'year_of_study', 'gpa'
];
```

---

### addSkill(userId, skillData)

Add new skill to student's profile.

**Parameters:**
```javascript
{
  skill_name: string,      // e.g., "Java", "SQL"
  proficiency_level: string, // beginner, intermediate, advanced, expert
  years_of_experience?: number
}
```

**Returns:**
```javascript
{
  id: number,
  student_id: number,
  skill_name: string,
  proficiency_level: string,
  years_of_experience: number,
  endorsed_count: 0
}
```

---

### getSkills(userId)

Get all skills for student.

**Parameters:**
```javascript
userId: number
```

**Returns:**
```javascript
[
  {
    id: number,
    skill_name: string,
    proficiency_level: string,
    years_of_experience: number,
    endorsed_count: number
  },
  // ... more skills
]
```

**Ordering:** By proficiency_level DESC (expert first)

---

### updateSkill(userId, skillId, data)

Update existing student skill.

**Parameters:**
```javascript
{
  proficiency_level?: string,
  years_of_experience?: number
}
```

**Returns:** Updated skill

---

### deleteSkill(userId, skillId)

Remove skill from student's profile.

**Returns:**
```javascript
{
  message: 'Skill deleted successfully',
  statusCode: 200
}
```

---

## 🎯 MatchingService

**File:** `src/services/MatchingService.js`  
**Purpose:** Intelligent job matching algorithm

### calculateForStudent(studentId)

Calculate all match scores for a student against all active postings.

**Parameters:**
```javascript
studentId: number
```

**Returns:**
```javascript
[
  {
    overall_score: 87.5,
    match_status: 'highly_compatible',
    skill_score: 90,
    location_score: 75,
    availability_score: 95,
    gpa_score: 85,
    academic_program_score: 80
  },
  // ... sorted by overall_score DESC
]
```

**Process:**
1. Load student with all skills
2. Get all active job postings (with required skills)
3. For each posting, calculate match score (see below)
4. Sort by overall_score descending
5. Return matches

---

### calculateScore(student, posting)

Calculate single match between student and posting.

**Returns:**
```javascript
{
  student_id: number,
  posting_id: number,
  overall_score: decimal(5,2),
  skill_score: decimal(5,2),      // 40% weight
  location_score: decimal(5,2),   // 20% weight
  availability_score: decimal(5,2), // 20% weight
  gpa_score: decimal(5,2),        // 10% weight
  academic_program_score: decimal(5,2), // 10% weight
  match_status: string,
  calculated_at: timestamp
}
```

---

### Matching Algorithm Details

#### 1. Skill Score (40% weight)

**How it's calculated:**
```javascript
// Required skills weighted heavier than preferred
required_skill_match = 70%
preferred_skill_match = 50%
skill_score = (required_match * 0.7) + (preferred_match * 0.3)

// For each skill:
// - Exact match at required proficiency: 100%
// - Match at lower proficiency: 80%
// - No match: 0%
```

**Example:**
- Posting requires: Java (advanced), SQL (intermediate)
- Student has: Java (advanced) ✓, SQL (beginner) ✓ lower level
- Calculation: (100 * 0.7 + 80 * 0.3) = 94%

#### 2. Location Score (20% weight)

**How it's calculated:**
```javascript
if (student.preferred_location === posting.location) {
  location_score = 100;  // Exact match
} else if (posting.allow_remote) {
  location_score = 75;   // Remote option helps
} else {
  location_score = 0;    // No match
}
```

#### 3. Availability Score (20% weight)

**How it's calculated:**
```javascript
// Check if student's availability window covers posting duration
if (student.availability_start <= posting.start_date &&
    student.availability_end >= posting_end_date) {
  availability_score = 100;  // Perfect fit
} else if (partial overlap) {
  availability_score = 50;   // Partial fit
} else {
  availability_score = 0;    // No availability
}
```

#### 4. GPA Score (10% weight)

**How it's calculated:**
```javascript
if (posting.min_gpa === null) {
  gpa_score = 100;  // No requirement
} else if (student.gpa === null) {
  gpa_score = 50;   // No GPA provided
} else if (student.gpa >= posting.min_gpa) {
  gpa_score = 100;  // Meets requirement
} else {
  // Scaled below minimum
  gpa_score = (student.gpa / posting.min_gpa) * 100;
}
```

#### 5. Academic Program Score (10% weight)

**How it's calculated:**
```javascript
if (posting.academic_program === null) {
  academic_program_score = 100;  // No requirement
} else if (student.academic_program === posting.academic_program) {
  academic_program_score = 100;  // Exact match
} else {
  academic_program_score = 0;    // Different program
}
```

#### Overall Score Formula

```javascript
overall_score = 
  (skill_score * 0.40) +
  (location_score * 0.20) +
  (availability_score * 0.20) +
  (gpa_score * 0.10) +
  (academic_program_score * 0.10);

// Result: 0-100
```

#### Match Status Classification

```javascript
if (overall_score >= 80) {
  match_status = 'highly_compatible';
} else if (overall_score >= 60) {
  match_status = 'compatible';
} else if (overall_score >= 40) {
  match_status = 'moderately_compatible';
} else if (overall_score >= 20) {
  match_status = 'weak_match';
} else {
  match_status = 'not_compatible';
}
```

---

### getMatchingRules()

Get currently active matching algorithm weights.

**Returns:**
```javascript
{
  skill_weight: 0.40,
  location_weight: 0.20,
  availability_weight: 0.20,
  gpa_weight: 0.10,
  academic_program_weight: 0.10
}
```

---

## 📬 NotificationService

**File:** `src/services/NotificationService.js`  
**Purpose:** In-app notifications and audit logging

### Constructor

```javascript
class NotificationService {
  constructor(models) {
    this.models = models;
  }
}

class AuditService {
  constructor(models) {
    this.models = models;
  }
}
```

---

### NotificationService.create(userId, notificationData)

Send notification to user.

**Parameters:**
```javascript
{
  notification_type: string,  // application_received, accepted, etc
  title: string,
  message: string,
  related_entity_type?: string,  // e.g., "Application"
  related_entity_id?: number,
  action_url?: string
}
```

**Returns:** Created notification

---

### NotificationService.getUnread(userId)

Get unread notifications for user.

**Returns:**
```javascript
[
  {
    id: number,
    notification_type: string,
    title: string,
    message: string,
    is_read: false,
    action_url: string,
    createdAt: timestamp
  }
]
```

---

### AuditService.log(action, options)

Log sensitive operation for compliance.

**Parameters:**
```javascript
{
  userId: number,
  action: 'create' | 'update' | 'delete' | 'login' | 'logout',
  entity_type: string,    // Table name
  entity_id: number,
  old_values?: object,
  new_values?: object,
  ip_address?: string,
  user_agent?: string,
  severity: 'low' | 'medium' | 'high' | 'critical'
}
```

**Example:**
```javascript
await auditService.log({
  userId: user.id,
  action: 'login',
  entity_type: 'User',
  entity_id: user.id,
  ip_address: req.ip,
  user_agent: req.get('user-agent'),
  severity: 'medium'
});
```

---

## 🏗️ Service Usage Pattern

### In Controllers/Routes

```javascript
// 1. Dependency injection
import { AuthService } from './services/AuthService.js';
const authService = new AuthService(models);

// 2. Call service method
app.post('/api/auth/login', async (req, res, next) => {
  try {
    const result = await authService.login(
      req.body.email,
      req.body.password
    );
    
    res.status(200).json(result);
  } catch (error) {
    next(error);  // Error handler processes
  }
});
```

### In Tests

```javascript
// 1. Create mock models
const mockModels = {
  User: { findByEmail: jest.fn() },
  Student: { create: jest.fn() }
};

// 2. Inject mocks
const authService = new AuthService(mockModels);

// 3. Test business logic in isolation
test('register creates user', async () => {
  await authService.register({
    name: 'John',
    email: 'john@example.com',
    password: 'Test123!',
    role: 'student'
  });
  
  expect(mockModels.User.create).toHaveBeenCalled();
});
```

---

## 🚨 Error Handling in Services

All services throw `AppError` for consistent error handling:

```javascript
import { AppError } from '../utils/errorHandler.js';

// Validation error
if (!email.includes('@')) {
  throw new AppError('Invalid email format', 422);
}

// Not found
if (!user) {
  throw new AppError('User not found', 404);
}

// Unauthorized
if (user.role !== 'admin') {
  throw new AppError('Insufficient permissions', 403);
}

// Conflict
if (existingUser) {
  throw new AppError('Email already registered', 409);
}
```

---

## 🧪 Testing Services

Services are designed to be easily testable:

```javascript
// Arrange - Setup test data
const testStudent = { id: 1, gpa: 3.8, preferred_location: 'NYC' };
const testPosting = { id: 1, location: 'NYC', min_gpa: 3.0 };

// Act - Call service method
const score = await matchingService.calculateScore(testStudent, testPosting);

// Assert - Verify result
expect(score.location_score).toBe(100);
expect(score.gpa_score).toBe(100);
expect(score.overall_score).toBeGreaterThan(80);
```

---

**Next:** See [**06-MIDDLEWARE.md**](./06-MIDDLEWARE.md) for middleware documentation.
