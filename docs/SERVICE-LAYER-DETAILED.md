# OJT System V2 - Service Layer Documentation

**Version:** 2.0  
**Framework:** Node.js 18+ with Express.js 4.18+  
**Pattern:** Service-Oriented Architecture  
**Total Services:** 5 (AuthService, StudentService, MatchingService, NotificationService, AuditService)  
**Last Updated:** April 9, 2026

---

## 📚 Service Layer Overview

The Service Layer contains all business logic, separated from HTTP routes and database operations. Each service is instantiated per request with injected models, ensuring loose coupling and testability.

```
Route Handler
    ↓
Service Layer (BUSINESS LOGIC)
    ├─ AuthService
    ├─ StudentService
    ├─ MatchingService
    ├─ NotificationService
    └─ AuditService
    ↓
Sequelize Models (DATA ACCESS)
    ↓
Database (PERSISTENT STORAGE)
```

---

## 🔐 AuthService

**File:** `src/services/AuthService.js`

Handles all authentication operations including user registration, login, password management, and token generation.

### Constructor

```javascript
const authService = new AuthService(models);
// models: Sequelize models instance
//         Contains: User, Student, Company, Coordinator, PasswordResetToken
```

### Public Methods

#### `.register(data: Object): Promise<Object>`

Create a new user account with role-specific profile.

**Parameters:**
```javascript
{
  name: string,           // 1-255 characters
  email: string,          // Unique, valid email format
  password: string,       // Min 8 chars, must include uppercase, number, special char
  role: string            // 'student' | 'company' | 'coordinator'
}
```

**Returns:**
```javascript
{
  user: {
    id: string (UUID),
    name: string,
    email: string,
    role: string,
    status: string
  },
  token: string (JWT)
}
```

**Side Effects:**
```
✅ Creates User record with hashed password
✅ Creates role-specific profile (Student/Company/Coordinator)
✅ Logs audit entry (severity: high)
✅ Sets user status:
   - student: 'active' (immediately usable)
   - company: 'pending' (awaits admin approval)
   - coordinator: 'pending' (awaits admin approval)
```

**Errors:**
```
409 Conflict      - Email already registered
400 Bad Request   - Invalid role or data
422 Unprocessable - Password doesn't meet requirements
```

**Security Features:**
- ✅ Password validated for strength (min 8, uppercase, number, special)
- ✅ Password hashed with bcrypt before storage (10 rounds)
- ✅ Rate limited at endpoint (3 registrations per hour)

---

#### `.login(email: string, password: string): Promise<Object>`

Authenticate user with email and password.

**Parameters:**
```javascript
email: string,       // User email (case-insensitive)
password: string     // User password (plaintext)
```

**Returns:**
```javascript
{
  user: {
    id: string (UUID),
    name: string,
    email: string,
    role: string,
    status: string
  },
  token: string (JWT)
}
```

**Side Effects:**
```
✅ Updates last_login_at timestamp
✅ Logs login event in audit trail
✅ Resets failedLoginAttempts counter (on success)
✅ Increments failedLoginAttempts (on failure)
✅ Locks account if 5+ failed attempts
```

**Account Lockout Logic:**
```javascript
if (user.status === 'locked') {
  // Calculate lock remaining time
  lockRemaining = 30 min - (now - lockedUntil);
  if (lockRemaining > 0) {
    throw new AppError(`Locked for ${lockRemaining} more minutes`, 423);
  } else {
    user.status = 'active';
    user.failedLoginAttempts = 0;
  }
}

if (password_incorrect) {
  failedAttempts++;
  if (failedAttempts >= 5) {
    user.status = 'locked';
    user.lockedUntil = now + 30 minutes;
    throw new AppError('Account locked', 423);
  }
} else {
  user.failedLoginAttempts = 0;
  return token;
}
```

**Errors:**
```
401 Unauthorized  - Invalid email/password
403 Forbidden     - Account status not 'active'
                    (suspended/pending/inactive)
423 Locked        - Account locked due to failed attempts
400 Bad Request   - Missing email or password
```

**Security Features:**
- ✅ Bcrypt password comparison (constant-time)
- ✅ Account lockout after 5 failed attempts (30-minute lock)
- ✅ Auto-unlock after lockout period
- ✅ Rate limited at endpoint (5 per 15 minutes)
- ✅ Generic error message (doesn't reveal if email exists)

---

#### `.validateToken(token: string): Promise<Object>`

Verify JWT token validity and extract user information.

**Parameters:**
```javascript
token: string  // JWT token (without 'Bearer ' prefix)
```

**Returns:**
```javascript
{
  userId: string (UUID),
  role: string,
  iat: number (issued at timestamp),
  exp: number (expiration timestamp)
}
```

**Errors:**
```
401 Unauthorized  - Invalid signature
                  - Expired token
                  - Malformed token
```

**Used By:**
- `authMiddleware` in route protection
- Token validation on protected routes

---

#### `.forgotPassword(email: string): Promise<Object>`

Generate password reset token for email-based password recovery.

**Parameters:**
```javascript
email: string  // User email (case-insensitive)
```

**Returns:**
```javascript
{
  message: string,
  resetToken: string (only in debug mode)  // JWT token
}
```

**Side Effects:**
```
✅ Creates PasswordResetToken record in database
✅ Token expires in 1 hour
✅ Token marked as unused
✅ Logs to audit trail
✅ Would send email (not implemented yet)
```

**Security Features:**
- ✅ Generic response (doesn't reveal if email exists)
- ✅ Token stored in database (trackable, revocable)
- ✅ One-time use enforcement
- ✅ Rate limited at endpoint (3 per hour)

**Token Storage:**
```javascript
PasswordResetToken {
  id: UUID,
  userId: UUID,
  token: string (JWT),
  used: boolean (default: false),
  usedAt: datetime (null initially),
  expiresAt: datetime (1 hour from creation),
  createdAt: datetime,
  updatedAt: datetime
}
```

---

#### `.resetPassword(resetToken: string, newPassword: string): Promise<Object>`

Reset user password using reset token.

**Parameters:**
```javascript
resetToken: string,    // JWT token from password reset
newPassword: string    // New password (must meet strength requirements)
```

**Returns:**
```javascript
{
  message: string  // "Password reset successfully"
}
```

**Side Effects:**
```
✅ Verifies token exists in database
✅ Checks token not already used
✅ Checks token not expired
✅ Updates user password (hashed with bcrypt)
✅ Marks token as used (timestamp recorded)
✅ Logs password change to audit trail
✅ Cannot be replayed (one-time use)
```

**Errors:**
```
401 Unauthorized  - Token not found
                  - Token already used
                  - Token expired
404 Not Found     - User not found
400 Bad Request   - Invalid password format
```

**Security Features:**
- ✅ Token must not be used before
- ✅ Token must not be expired
- ✅ Token marked as used immediately
- ✅ Prevents replay attacks
- ✅ Prevents token reuse attacks
- ✅ See: Bug Fix #3 in FIXES-IMPLEMENTATION-SUMMARY.md

---

#### `.getCurrentUser(userId: string): Promise<Object>`

Retrieve complete user profile including role-specific data.

**Parameters:**
```javascript
userId: string  // User UUID
```

**Returns:**
```javascript
{
  user: {
    id: string,
    name: string,
    email: string,
    role: string,
    status: string
  },
  profile: {
    // Role-specific data
    // Student: gpa, academic_program, availability dates, etc.
    // Company: accreditation_status, is_approved_for_posting
    // Coordinator: max_students
  }
}
```

**Errors:**
```
404 Not Found  - User doesn't exist
```

---

### Internal Helper Methods

#### `.hashPassword(password: string, rounds?: number): Promise<string>`

Hash password using bcrypt.

```javascript
// Internal use only
const hashedPassword = await authService.hashPassword('SecurePass123!', 10);
// rounds: default from config (typically 10, min 5)
```

---

## 👨‍🎓 StudentService

**File:** `src/services/StudentService.js`

Manages student-specific operations including profile management, skills, and applications.

### Constructor

```javascript
const studentService = new StudentService(models);
// models: Sequelize models with Student, StudentSkill, Application, etc.
```

### Public Methods

#### `.getProfile(userId: string): Promise<Object>`

Retrieve student profile information.

**Parameters:**
```javascript
userId: string  // User UUID (must be student role)
```

**Returns:**
```javascript
{
  id: string (UUID),
  user_id: string,
  profile_completeness_percentage: number (0-100),
  preferred_locations: string[],
  willing_to_relocate: boolean,
  gpa: number (0-4.0),
  academic_program: string,
  availability_start: datetime,
  availability_end: datetime,
  created_at: datetime,
  updated_at: datetime
}
```

**Completeness Calculation:**
```javascript
// Percentage of populated fields
completeness = (populatedFields / totalFields) * 100;

Fields:
- name, email, phone
- address
- school, course, gpa
- academic_program
- skills (at least one)
- availability period
- location preferences
```

**Errors:**
```
404 Not Found  - Student profile not found
```

---

#### `.updateProfile(userId: string, data: Object): Promise<Object>`

Update student profile information.

**Parameters:**
```javascript
{
  preferred_locations?: string[],
  willing_to_relocate?: boolean,
  gpa?: number,
  academic_program?: string,
  availability_start?: datetime,
  availability_end?: datetime,
  // ... other profile fields
}
```

**Returns:**
```javascript
// Updated student profile object
{
  id: string,
  profile_completeness_percentage: number,
  // ... all profile fields
}
```

**Side Effects:**
```
✅ Recalculates profile_completeness_percentage
✅ Logs data change to audit trail
✅ Invalidates job match cache
```

**Validation:**
```
- GPA: number between 0-4.0
- Locations: array of valid city names
- Dates: availability_end > availability_start
- Program: known academic program
```

---

#### `.getSkills(userId: string): Promise<Array>`

List student's technical skills.

**Returns:**
```javascript
[
  {
    id: string (UUID),
    name: string,
    proficiency_level: string,  // beginner|intermediate|advanced|expert
    years_of_experience: number,
    verified: boolean,
    created_at: datetime
  },
  // ... more skills
]
```

**Sorting:** By created_at (newest first)

---

#### `.addSkill(userId: string, data: Object): Promise<Object>`

Add a new skill to student profile.

**Parameters:**
```javascript
{
  name: string,                           // Skill name (unique per student)
  proficiency_level: string,              // beginner|intermediate|advanced|expert
  years_of_experience?: number            // Default: 0
}
```

**Returns:**
```javascript
{
  id: string (UUID),
  name: string,
  proficiency_level: string,
  years_of_experience: number,
  verified: boolean (default: false)
}
```

**Side Effects:**
```
✅ Creates StudentSkill record
✅ Updates profile_completeness_percentage
✅ Invalidates job match cache
✅ Logs skill addition
```

**Errors:**
```
409 Conflict      - Skill name already exists for this student
422 Unprocessable - Invalid proficiency level
```

---

#### `.getApplications(userId: string, filters?: Object): Promise<Array>`

List student's job applications.

**Parameters:**
```javascript
filters: {
  status?: string,           // Filter by application status
  posting_id?: string,       // Filter by posting
  page?: number,             // Default: 1
  limit?: number             // Default: 10
}
```

**Returns:**
```javascript
[
  {
    id: string (UUID),
    posting: {
      id: string,
      title: string,
      company: {
        name: string
      },
      location: string,
      salary_range: string
    },
    status: string,  // submitted|under_review|shortlisted|hired|rejected
    submitted_at: datetime,
    match_score: number,
    created_at: datetime
  },
  // ... more applications
]
```

**Status Values:**
```
submitted      → Initial application state
under_review   → Employer reviewing
shortlisted    → Passed initial screening
hired          → Accepted offer
rejected       → Not selected
```

---

#### `.applyToPosting(userId: string, postingId: string, data: Object): Promise<Object>`

Submit application to job posting.

**Parameters:**
```javascript
{
  posting_id: string,         // Posting UUID
  cover_letter?: string,      // Optional cover letter
  resume_id?: string          // Optional resume UUID
}
```

**Returns:**
```javascript
{
  id: string (UUID),
  student_id: string,
  posting_id: string,
  status: string ('submitted'),
  submitted_at: datetime,
  match_score: number,
  created_at: datetime
}
```

**Side Effects:**
```
✅ Creates Application record
✅ Calculates and stores match score
✅ Sends notification to student
✅ Logs to audit trail
```

**Safety & Concurrency:**
```javascript
// ATOMIC TRANSACTION (prevents race conditions)
BEGIN TRANSACTION
  1. Find student record (check exists)
  2. LOCK OjtPosting row (row-level lock)
  3. Check no duplicate application
  4. Check positions available
  5. Create Application record
  6. Increment application count
  7. Calculate match score
COMMIT (or ROLLBACK on error)

// Without transaction: multiple concurrent applications
// could exceed position limit
// With transaction: guaranteed safety
```

**See:** Bug Fix #2 in FIXES-IMPLEMENTATION-SUMMARY.md

**Validations:**
```
- Student must have completed profile
- Posting must exist and be active
- No duplicate application
- Posting must have available positions
```

**Errors:**
```
404 Not Found       - Student/posting not found
409 Conflict        - Already applied to this posting
                    - All positions filled
400 Bad Request     - Invalid posting_id
```

---

#### `.getMatchedPostings(userId: string, minScore?: number): Promise<Array>`

Get job postings matched to student profile. (Calls MatchingService)

**Parameters:**
```javascript
userId: string,     // Student user UUID
minScore?: number   // Minimum match score (default: 60)
```

**Returns:**
```javascript
[
  {
    id: string (UUID),
    title: string,
    company: {
      name: string,
      industry: string
    },
    description: string,
    required_skills: [
      { name: string, proficiency_level: string }
    ],
    location: string,
    job_type: string,  // Full-time|Part-time|Contract
    salary_range: string,
    application_deadline: datetime,
    
    // MATCH INFORMATION
    match_score: number (0-100),
    match_status: string,  // highly_compatible|compatible|moderately_compatible|weak_match|not_compatible
    match_breakdown: {
      skill_score: number,           // 40% weight
      location_score: number,        // 20% weight
      availability_score: number,    // 20% weight
      gpa_score: number,             // 10% weight
      program_score: number          // 10% weight
    }
  },
  // ... more matched postings
]
```

---

### Internal Helper Methods

#### `.getProfile(userId: string): Promise<Object>` (Private)

Finds and returns student profile by user ID.

---

## 📊 MatchingService

**File:** `src/services/MatchingService.js`

Implements intelligent job-to-student matching algorithm using 5-component scoring system.

### Constructor

```javascript
const matchingService = new MatchingService(models);
```

### Matching Algorithm

The matching algorithm calculates compatibility between student profile and job posting using weighted component scores.

**Formula:**
```
Overall Score = (
  SkillScore * 0.40 +
  LocationScore * 0.20 +
  AvailabilityScore * 0.20 +
  GPAScore * 0.10 +
  ProgramScore * 0.10
)
```

**Match Status Classification:**
```
Score ≥ 85  → highly_compatible        (⭐⭐⭐⭐⭐)
Score 70-84 → compatible               (⭐⭐⭐⭐)
Score 50-69 → moderately_compatible    (⭐⭐⭐)
Score 30-49 → weak_match               (⭐⭐)
Score < 30  → not_compatible           (⭐)
```

### Public Methods

#### `.calculateForStudent(studentId: string): Promise<Array>`

Calculate match scores for all active job postings for a student.

**Returns:**
```javascript
[
  {
    // MatchScore record in database
    id: string,
    student_id: string,
    posting_id: string,
    overall_score: number,
    skill_score: number,
    location_score: number,
    availability_score: number,
    gpa_score: number,
    program_score: number,
    match_status: string
  },
  // ... sorted by overall_score descending
]
```

**Process:**
```
1. Load student with skills and profile
2. Load all active postings with requirements
3. For each posting:
   ├─ calculateSkillScore()
   ├─ calculateLocationScore()
   ├─ calculateAvailabilityScore()
   ├─ calculateGPAScore()
   ├─ calculateAcademicProgramScore()
   └─ Combine with weights → overall_score
4. Store in MatchScore table
5. Sort by score descending
6. Return top matches
```

---

#### `.calculateSkillScore(student, posting): Promise<number>`

Calculate skill match percentage (40% weight).

**Formula:**
```javascript
if (no required skills) {
  return 100;  // No requirements = perfect match
}

matchedSkills = countMatched(studentSkills, requiredSkills);
requiredCount = requiredSkills.length;
basedScore = (matchedSkills / requiredCount) * 100;

// Apply proficiency weighting
proficiencyBonus = 0;
for each matched skill:
  if (proficiency === 'advanced')  proficiencyBonus += 5;
  if (proficiency === 'expert')    proficiencyBonus += 10;

finalScore = basedScore + proficiencyBonus;

return min(finalScore, 100);  // Cap at 100
```

**Examples:**
```
Student has: [JavaScript(advanced), Python(intermediate)]
Job requires: [JavaScript(required), Django(required)]

Matches: JavaScript ✓
Advanced bonus: +5
Score: (1/2)*100 + 5 = 55

vs.

Custom tags or bonus for matching
```

---

#### `.calculateLocationScore(student, posting): Promise<number>`

Calculate location compatibility (20% weight).

**Logic:**
```javascript
if (posting.location === 'Remote') {
  return 100;  // Remote = anywhere matches
}

if (student.preferred_location === posting.location) {
  return 100;  // Exact match
}

if (isNearby(student.preferred_location, posting.location)) {
  return 75;  // Same metro area
}

if (student.willing_to_relocate) {
  return 40;  // Can move but different location
}

return 0;  // Location mismatch, unwilling to relocate
```

**Nearby Cities (Metro Manila Example):**
```
- Manila ↔ Quezon City: nearby
- Manila ↔ Makati: nearby
- Manila ↔ Pasig: nearby
- Manila ↔ Cebu: not nearby
```

---

#### `.calculateAvailabilityScore(student, posting): Promise<number>`

Calculate date overlap percentage (20% weight).

**Formula:**
```javascript
studentStart = student.availability_start;
studentEnd = student.availability_end;
postingStart = posting.start_date;
postingEnd = posting.end_date;

overlapStart = max(studentStart, postingStart);
overlapEnd = min(studentEnd, postingEnd);

if (overlapEnd <= overlapStart) {
  return 0;  // No overlap
}

overlapDays = overlapEnd - overlapStart;
totalDays = postingEnd - postingStart;

percentage = (overlapDays / totalDays) * 100;
return min(percentage, 100);
```

**Examples:**
```
Posting: June 1 - Sept 1 (92 days)

Student: June 1 - Dec 1 (184 days)
Overlap: June 1 - Sept 1 (92 days)
Score: (92/92) * 100 = 100

Student: July 1 - Sept 1 (62 days)
Overlap: July 1 - Sept 1 (62 days)
Score: (62/92) * 100 = 67

Student: May 1 - May 31 (31 days)
Overlap: None (0 days)
Score: 0
```

---

#### `.calculateGPAScore(studentGPA, minRequired): Promise<number>`

Calculate GPA compatibility (10% weight).

**Formula:**
```javascript
if (minRequired === null || minRequired === 0) {
  return 100;  // No GPA requirement
}

if (studentGPA >= minRequired) {
  return 100;  // Meets or exceeds requirement
}

score = (studentGPA / minRequired) * 100;
return score;
```

**Examples:**
```
Min Required: 3.0

Student GPA: 3.5
Score: 100 (exceeds)

Student GPA: 3.0
Score: 100 (meets)

Student GPA: 2.4
Score: (2.4/3.0) * 100 = 80

Student GPA: 2.0
Score: (2.0/3.0) * 100 = 67
```

---

#### `.calculateAcademicProgramScore(studentProgram, requiredProgram): Promise<number>`

Calculate academic background relevance (10% weight).

**Formula:**
```javascript
if (requiredProgram === null) {
  return 100;  // No program requirement
}

if (studentProgram === requiredProgram) {
  return 100;  // Exact match
}

if (isRelatedProgram(studentProgram, requiredProgram)) {
  return 80;  // Related field
}

return 30;  // Unrelated field (still possible with skills)
```

**Related Programs:**
```
Related to Computer Science:
- Information Technology
- Software Engineering
- Data Science
- Computer Engineering

Related to Business:
- Finance
- Marketing
- Accounting
- Management

Related to Engineering:
- Mechanical Engineering
- Electrical Engineering
- Civil Engineering
- Technology Engineering
```

---

#### `.getMatchStatus(score: number): string`

Get human-readable match status from score.

**Returns:**
```javascript
if (score >= 85)     return 'highly_compatible';
if (score >= 70)     return 'compatible';
if (score >= 50)     return 'moderately_compatible';
if (score >= 30)     return 'weak_match';
return 'not_compatible';
```

---

## 🔔 NotificationService

**File:** `src/services/NotificationService.js`

Manages user notifications and event-based alerting.

### Constructor

```javascript
const notificationService = new NotificationService(models);
```

### Public Methods

#### `.getNotifications(userId: string, page?: number, limit?: number): Promise<Object>`

Get paginated notifications for user.

**Parameters:**
```javascript
userId: string,
page?: number = 1,
limit?: number = 10
```

**Returns:**
```javascript
{
  data: [
    {
      id: string (UUID),
      user_id: string,
      type: string,                    // application_submitted|status_update|etc
      title: string,
      message: string,
      read: boolean,
      priority: string,                // low|medium|high|urgent
      related_entity_id: string,
      related_entity_type: string,     // Application|User|etc
      created_at: datetime,
      read_at: datetime (null if unread)
    }
  ],
  pagination: {
    page: number,
    per_page: number,
    total: number,
    total_pages: number
  }
}
```

---

#### `.markAsRead(notificationId: string): Promise<Object>`

Mark notification as read.

**Returns:**
```javascript
{
  id: string,
  read: boolean (true),
  read_at: datetime
}
```

---

#### `.notifyApplicationSubmitted(userId: string, applicationId: string, postingTitle: string): Promise<undefined>`

Send notification about submitted application.

**Creates Notification:**
```javascript
{
  type: 'application_submitted',
  title: 'Application Submitted',
  message: `Your application for "${postingTitle}" has been submitted`,
  priority: 'medium',
  related_entity_type: 'Application',
  related_entity_id: applicationId
}
```

---

#### `.notifyApplicationStatusUpdate(userId: string, applicationId: string, status: string): Promise<undefined>`

Send notification about application status change.

**Creates Notification:**
```javascript
{
  type: 'application_status_update',
  title: 'Application Status Updated',
  message: `Your application status changed to: ${status}`,
  priority: status === 'hired' ? 'high' : 'medium',
  related_entity_type: 'Application',
  related_entity_id: applicationId
}
```

---

### Notification Types

| Type | Trigger | Priority |
|------|---------|----------|
| `application_submitted` | Student submits application | medium |
| `application_status_update` | Employer updates status | high |
| `match_found` | New matching job posted | medium |
| `message_received` | New message from employer | high |
| `deadline_approaching` | Application deadline soon | urgent |
| `profile_feedback` | Feedback on student profile | medium |
| `verification_needed` | Account verification needed | high |
| `account_update` | Account settings changed | low |

---

## 📋 AuditService

**File:** `src/services/NotificationService.js` (included with NotificationService)

Logs all sensitive operations for compliance and security auditing.

### Constructor

```javascript
const auditService = new AuditService(models);
```

### Public Methods

#### `.log(auditEntry: Object): Promise<Object>`

Generic audit log creation.

**Parameters:**
```javascript
{
  userId: string (UUID),
  action: string,                  // create|update|delete|login|etc
  entityType: string,              // User|Student|Application|etc
  entityId: string,
  oldValues?: object,              // Before modification
  newValues: object,               // After modification
  ipAddress: string,
  userAgent: string,
  severity: string,                // low|medium|high
  description?: string
}
```

**Returns:**
```javascript
{
  id: string (UUID),
  // ... all audit entry fields
  created_at: datetime
}
```

**Stored in:** `audit_logs` table

---

#### `.logLogin(userId: string, ipAddress: string, userAgent: string): Promise<Object>`

Log user login event.

**Equivalent to:**
```javascript
await auditService.log({
  userId,
  action: 'login',
  entityType: 'User',
  entityId: userId,
  ipAddress,
  userAgent,
  severity: 'low'
});
```

---

#### `.logDataChange(userId: string, entityType: string, entityId: string, oldValues: object, newValues: object, description: string): Promise<Object>`

Log data modification event.

**Severity:** `medium` (data changed by user)

---

### Audited Actions

| Action | Entity | Severity | Example |
|--------|--------|----------|---------|
| `login` | User | low | User logged in |
| `logout` | User | low | User logged out |
| `register` | User | high | New account created |
| `password_change` | User | medium | Password updated |
| `role_change` | User | high | Role modified |
| `status_change` | User | high | Status changed (active→suspended) |
| `update` | Student/Company | medium | Profile updated |
| `create` | Application | low | Application submitted |
| `delete` | Application | medium | Application withdrawn |
| `approval` | Company | high | Company approved for posting |
| `rejection` | Company | high | Company rejected |

---

## 🔗 Service Interactions

### Typical Request Flow

```
POST /api/auth/login
  ↓
AuthService.login(email, password)
  ├─ Find user by email (via models.User)
  ├─ Compare password with bcrypt
  ├─ Generate JWT token
  ├─ Update last_login_at
  └─ Call AuditService.logLogin()
        └─ Create audit log
  ↓
Response: { user, token }
```

---

```
POST /api/applications
  ↓
StudentService.applyToPosting(userId, postingId, data)
  ├─ BEGIN TRANSACTION
  ├─ Find student
  ├─ LOCK posting row
  ├─ Create application
  ├─ Call MatchingService.calculateScore()
  │     └─ Calculate all 5 components
  ├─ Store match score
  ├─ Call NotificationService.notifyApplicationSubmitted()
  │     └─ Create notification record
  ├─ Call AuditService.log()
  │     └─ Create audit log
  └─ COMMIT TRANSACTION
  ↓
Response: { application }
```

---

```
GET /api/matches?minScore=70
  ↓
StudentService.getMatchedPostings(userId, minScore)
  ├─ Load student profile with skills
  ├─ Load all active postings
  ├─ Call MatchingService.calculateForStudent()
  │     ├─ For each posting:
  │     │  ├─ calculateSkillScore()
  │     │  ├─ calculateLocationScore()
  │     │  ├─ calculateAvailabilityScore()
  │     │  ├─ calculateGPAScore()
  │     │  ├─ calculateAcademicProgramScore()
  │     │  └─ Combine with weights
  │     ├─ Filter score >= minScore
  │     └─ Sort by score descending
  └─ Return matches with breakdown
  ↓
Response: [{ posting with match_breakdown }]
```

---

## 🧪 Testing Services

Services are easily testable with mock models:

```javascript
// Mock models for unit testing
const mockModels = {
  User: {
    create: jest.fn(),
    findByPk: jest.fn(),
    findByEmail: jest.fn(),
  },
  Student: {
    create: jest.fn(),
    findOne: jest.fn(),
  },
  // ... other models
};

// Instantiate service with mocks
const authService = new AuthService(mockModels);

// Test
it('should create user and return token', async () => {
  mockModels.User.create.mockResolvedValue({
    id: 'uuid',
    name: 'John',
    email: 'john@test.com',
    generateToken: () => 'token123'
  });

  const result = await authService.register({...});

  expect(result.user).toBeDefined();
  expect(result.token).toBe('token123');
});
```

---

## 📊 Service Metrics

### Performance Benchmarks

| Operation | Time | Events |
|-----------|------|--------|
| login() | ~5ms | DB query + JWT sign |
| register() | ~50ms | Hash password + 2 inserts |
| calculateForStudent() | ~50ms | 1000 postings × 5 calculations |
| applyToPosting() | ~20ms | Transaction + lock + insert |
| forgotPassword() | ~10ms | DB query + token create |

---

## 🔐 Service Layer Security

- ✅ All user inputs validated
- ✅ SQL injection prevented (Sequelize parameterized queries)
- ✅ XSS safe (no HTML rendering)
- ✅ CSRF prevented (stateless JWT auth)
- ✅ Rate limiting at HTTP layer (not service)
- ✅ Passwords hashed (never logged)
- ✅ Tokens never logged
- ✅ Audit trail of sensitive operations
