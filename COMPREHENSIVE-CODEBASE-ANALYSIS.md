# OJT System V2 Backend - Comprehensive Codebase Analysis

**Document Version:** 1.0  
**System:** Node.js/Express Backend API  
**Date:** April 2026  
**Framework:** Express.js with Sequelize ORM

---

## Table of Contents

1. [HTTP Endpoints](#1-http-endpoints)
2. [Services & Methods](#2-services--methods)
3. [Data Models & Relationships](#3-data-models--relationships)
4. [Middleware & Security](#4-middleware--security)
5. [Error Handling](#5-error-handling)
6. [Database Configuration](#6-database-configuration)
7. [Environment Variables](#7-environment-variables)
8. [Testing Approach](#8-testing-approach)

---

## 1. HTTP Endpoints

### Authentication Endpoints (Public)

#### 1.1 User Registration
```
POST /api/auth/register
Rate Limited: Yes (5 attempts per 15 minutes)
Authentication: None (public)

Request Body:
{
  "name": "John Doe",
  "email": "john@example.com",
  "password": "SecurePass123!",
  "role": "student|company|coordinator"
}

Response (201):
{
  "message": "Registration successful",
  "user": {
    "id": 1,
    "name": "John Doe",
    "email": "john@example.com",
    "role": "student",
    "status": "active"
  },
  "token": "eyJhbGc..."
}

Role-Specific Behaviors:
- student: Auto-active, creates Student profile with 0% completeness
- company: Pending approval, creates Company profile (pending accreditation)
- coordinator: Pending approval, creates Coordinator profile
```

#### 1.2 User Login
```
POST /api/auth/login
Rate Limited: Yes (5 attempts per 15 minutes)
Authentication: None (public)

Request Body:
{
  "email": "john@example.com",
  "password": "SecurePass123!"
}

Response (200):
{
  "message": "Login successful",
  "user": {
    "id": 1,
    "name": "John Doe",
    "email": "john@example.com",
    "role": "student",
    "status": "active"
  },
  "token": "eyJhbGc..."
}

Security Features:
- Failed Login Tracking: Locks account after 5 failed attempts
- Account Lock Duration: 30 minutes
- Lock Status Resets: On successful login or after lock period
- Last Login Timestamp: Updated on successful login
```

### Protected Endpoints (Authenticated)

#### 1.3 Get Current User Info
```
GET /api/user
Authentication: Required (Bearer token)
RBAC: None (all authenticated users)

Response (200):
{
  "message": "User information retrieved",
  "data": {
    "user": {
      "id": 1,
      "name": "John Doe",
      "email": "john@example.com",
      "role": "student",
      "status": "active"
    },
    "profile": { /* role-specific profile data */ }
  }
}
```

### Student Endpoints

#### 1.4 Get Student Profile
```
GET /api/students/profile
Authentication: Required (Bearer token)
RBAC: student role
Parameters: None
Query Parameters: None

Response (200):
{
  "message": "Profile retrieved",
  "data": {
    "id": 1,
    "user_id": 1,
    "first_name": "John",
    "last_name": "Doe",
    "phone": "+1234567890",
    "bio": "Aspiring software developer",
    "current_location": "Manila",
    "preferred_location": "Manila",
    "availability_start": "2026-06-01T00:00:00Z",
    "availability_end": "2026-08-31T23:59:59Z",
    "profile_completeness_percentage": 45,
    "gpa": 3.5,
    "academic_program": "Computer Science",
    "year_of_study": "2nd"
  }
}

Error Cases:
- 404: Student profile not found
```

#### 1.5 Update Student Profile
```
PUT /api/students/profile
Authentication: Required (Bearer token)
RBAC: student role
Parameters: req.user.id (from JWT)

Request Body (all fields optional):
{
  "first_name": "John",
  "last_name": "Doe",
  "phone": "+1234567890",
  "bio": "Updated bio",
  "current_location": "Manila",
  "preferred_location": "Manila",
  "profile_picture_url": "https://...",
  "availability_start": "2026-06-01T00:00:00Z",
  "availability_end": "2026-08-31T23:59:59Z",
  "academic_program": "Computer Science",
  "gpa": 3.8,
  "year_of_study": "3rd"
}

Response (200):
{
  "message": "Profile updated successfully",
  "data": { /* updated profile */ }
}

Side Effects:
- Recalculates profile_completeness_percentage
- Triggers audit log entry via AuditService
- May update matching scores if skills/location changed
```

#### 1.6 Get Student Skills
```
GET /api/students/skills
Authentication: Required (Bearer token)
RBAC: student role
Query Parameters: None

Response (200):
{
  "message": "Skills retrieved",
  "data": [
    {
      "id": 1,
      "student_id": 1,
      "skill_name": "JavaScript",
      "proficiency_level": "intermediate",
      "years_of_experience": 2,
      "endorsed_count": 3
    }
  ]
}

Sorting: By proficiency_level DESC (highest first)
```

#### 1.7 Add Skill to Student
```
POST /api/students/skills
Authentication: Required (Bearer token)
RBAC: student role

Request Body:
{
  "skill_name": "React.js",
  "proficiency_level": "intermediate|beginner|expert",
  "years_of_experience": 1
}

Response (201):
{
  "message": "Skill added successfully",
  "data": {
    "id": 2,
    "student_id": 1,
    "skill_name": "React.js",
    "proficiency_level": "intermediate",
    "years_of_experience": 1
  }
}

Validation:
- skill_name: required, max 100 characters
- proficiency_level: required, enum validation
- years_of_experience: optional, numeric
```

### Job Matching & Application Endpoints

#### 1.8 Get Matched Postings
```
GET /api/matches
Authentication: Required (Bearer token)
RBAC: student role
Query Parameters:
  - minScore: minimum match score (default: 60)

Response (200):
{
  "message": "Matching postings retrieved",
  "data": [
    {
      "id": 1,
      "posting_id": 5,
      "student_id": 1,
      "overall_score": 87,
      "skill_score": 92,
      "location_score": 75,
      "availability_score": 80,
      "gpa_score": 85,
      "academic_program_score": 100,
      "match_status": "strong_match",
      "posting": { /* full posting details */ }
    }
  ],
  "count": 8
}

Algorithm:
- Weighted scoring: Skills (40%), Location (20%), Availability (20%), GPA (10%), Academic Program (10%)
- Only returns postings with status='active'
- Filtered by minScore parameter
- Sorted by overall_score descending
```

#### 1.9 Submit Application
```
POST /api/applications
Authentication: Required (Bearer token)
RBAC: student role

Request Body:
{
  "posting_id": 5,
  "cover_letter": "I am interested in this position because..."
}

Response (201):
{
  "message": "Application submitted successfully",
  "data": {
    "id": 1,
    "student_id": 1,
    "posting_id": 5,
    "application_status": "submitted",
    "cover_letter": "I am interested...",
    "match_score": 87,
    "applied_at": "2026-04-09T10:30:00Z"
  }
}

Error Cases:
- 404: Posting not found or not active
- 409: Student already applied to this posting
- 409: All positions filled

Transaction Safety:
- Uses database transaction with row lock
- Prevents race condition on position count
- Atomic: all or nothing

Side Effects:
- Notification sent: notifyApplicationSubmitted()
- Audit logged: Application created
- Match score calculated if not cached
```

#### 1.10 Get Student Applications
```
GET /api/applications
Authentication: Required (Bearer token)
RBAC: student role
Query Parameters:
  - status: filter by application_status
  - page: pagination (default 1)
  - limit: items per page (default 10)

Response (200):
{
  "message": "Applications retrieved",
  "data": [
    {
      "id": 1,
      "student_id": 1,
      "posting_id": 5,
      "application_status": "submitted|under_review|shortlisted|rejected|hired|withdrawn",
      "match_score": 87,
      "applied_at": "2026-04-09T10:30:00Z",
      "reviewed_at": null,
      "interviewed_at": null,
      "hired_at": null
    }
  ],
  "count": 5
}
```

### Notification Endpoints

#### 1.11 Get Notifications (Paginated)
```
GET /api/notifications
Authentication: Required (Bearer token)
RBAC: all authenticated users
Query Parameters:
  - page: page number (default 1)
  - limit: items per page (default 10)

Response (200):
{
  "message": "Notifications retrieved",
  "data": [
    {
      "id": 1,
      "user_id": 1,
      "title": "Application Submitted",
      "message": "Your application for Junior Developer has been submitted",
      "type": "application_submitted",
      "priority": "normal",
      "is_read": false,
      "created_at": "2026-04-09T10:30:00Z"
    }
  ],
  "pagination": {
    "total": 25,
    "page": 1,
    "limit": 10,
    "totalPages": 3
  }
}
```

#### 1.12 Mark Notification as Read
```
PUT /api/notifications/:id/read
Authentication: Required (Bearer token)
RBAC: all authenticated users
Parameters:
  - id: notification ID (path parameter)

Response (200):
{
  "message": "Notification marked as read",
  "data": {
    "id": 1,
    "user_id": 1,
    "is_read": true,
    "read_at": "2026-04-09T10:35:00Z"
  }
}

Error Cases:
- 404: Notification not found
```

### Admin Endpoints (RBAC: admin only)

#### 1.13 Get Audit Logs
```
GET /api/audit-logs
Authentication: Required (Bearer token)
RBAC: admin only
Query Parameters:
  - limit: max records per request (default 50)

Response (200):
{
  "message": "Audit logs retrieved",
  "data": [
    {
      "id": 1,
      "user_id": 5,
      "user_role": "student",
      "entity_type": "Application",
      "entity_id": 10,
      "action": "create|update|delete|login|logout|view",
      "old_values": null,
      "new_values": { /* what changed */ },
      "ip_address": "192.168.1.1",
      "user_agent": "Mozilla/5.0...",
      "severity": "low|medium|high|critical",
      "status": "success|failed|pending",
      "created_at": "2026-04-09T10:30:00Z"
    }
  ],
  "count": 48
}
```

### Health & Meta Endpoints

#### 1.14 Health Check
```
GET /health
Authentication: None (public)

Response (200):
{
  "status": "ok",
  "timestamp": "2026-04-09T10:30:00Z",
  "environment": "development"
}

Purpose: Load balancer/monitoring endpoint
```

#### 1.15 API Version
```
GET /api/version
Authentication: None (public)

Response (200):
{
  "version": "2.0.0",
  "name": "OJT System V2 API",
  "environment": "development"
}
```

### Error Responses (Global)

```
404 Not Found (undefined route):
{
  "message": "Route GET /api/invalid not found",
  "statusCode": 404
}

429 Rate Limit Exceeded:
{
  "message": "Too many requests, please try again later",
  "statusCode": 429,
  "retryAfter": 300
}

401 Authentication Failed:
{
  "message": "Invalid token|Token has expired|Missing Authorization header",
  "statusCode": 401
}

403 Forbidden (RBAC):
{
  "message": "Forbidden. Required role: admin, coordinator",
  "statusCode": 403
}
```

---

## 2. Services & Methods

### AuthService

**Location:** `src/services/AuthService.js`  
**Purpose:** Encapsulates authentication logic  
**Dependency:** User model, JWT, Bcrypt

#### Public Methods:

##### `register(data: Object): Promise<Object>`
- **Parameters:**
  - `name` (string): User full name
  - `email` (string): User email address
  - `password` (string): Plaintext password
  - `role` (string): 'student'|'company'|'coordinator'
- **Returns:** `{ user: {...}, token: string }`
- **Throws:** AppError on validation failure, duplicate email, invalid role
- **Side Effects:** 
  - Creates User record with bcrypt-hashed password
  - Creates role-specific profile (Student/Company/Coordinator)
  - Generates JWT token
  - Logs to Logger

##### `login(email: string, password: string): Promise<Object>`
- **Parameters:**
  - `email` (string): User email (case-insensitive)
  - `password` (string): Plaintext password
- **Returns:** `{ user: {...}, token: string }`
- **Throws:** AppError on invalid credentials, account locked, account pending
- **Security Features:**
  - Failed login tracking (max 5 attempts)
  - Account locking (30-minute lock after 5 failures)
  - Password comparison using bcrypt (constant-time)
  - Updates last_login_at timestamp
  - Resets failedLoginAttempts on success
- **Status Codes:**
  - 401: Invalid credentials
  - 423: Account locked
  - 403: Account pending/suspended

##### `validateToken(token: string): Promise<Object>`
- **Parameters:**
  - `token` (string): JWT token to verify
- **Returns:** Decoded token payload
- **Throws:** AppError if expired or invalid
- **Implementation:** jwt.verify() with config.auth.secret

##### `forgotPassword(email: string): Promise<Object>`
- **Parameters:**
  - `email` (string): User email
- **Returns:** `{ message: string }`
- **Implementation:** Creates PasswordResetToken, sends email (mocked)

##### `resetPassword(token: string, newPassword: string): Promise<Object>`
- **Parameters:**
  - `token` (string): Password reset token
  - `newPassword` (string): New password
- **Returns:** `{ message: string }`
- **Validation:** Token must not be expired, password strength checked
- **Side Effects:** Updates User.password, deletes PasswordResetToken record

##### `getCurrentUser(userId: number): Promise<Object>`
- **Parameters:**
  - `userId` (number): User ID from JWT
- **Returns:** User record with associated profile

---

### StudentService

**Location:** `src/services/StudentService.js`  
**Purpose:** Manages student-specific operations  
**Dependency:** Student, StudentSkill, Application, OjtPosting models

#### Public Methods:

##### `getProfile(userId: number): Promise<Object>`
- **Parameters:** 
  - `userId` (number): User ID
- **Returns:** Student profile record
- **Throws:** AppError(404) if student profile not found
- **Fields:** first_name, last_name, phone, bio, location, gpa, academic_program, profile_completeness_percentage, etc.

##### `updateProfile(userId: number, data: Object): Promise<Object>`
- **Parameters:**
  - `userId` (number): User ID
  - `data` (Object): Fields to update (first_name, last_name, phone, bio, location, gpa, etc.)
- **Returns:** Updated Student profile
- **Side Effects:**
  - Recalculates profile_completeness_percentage
  - Triggers audit log
  - May recalculate matching scores
- **Allowed Fields:** first_name, last_name, phone, bio, current_location, preferred_location, profile_picture_url, availability_start, availability_end, academic_program, year_of_study, gpa

##### `getSkills(userId: number): Promise<Array>`
- **Parameters:**
  - `userId` (number): User ID
- **Returns:** Array of StudentSkill records
- **Sorting:** By proficiency_level DESC (highest first)
- **Throws:** AppError(404) if student not found

##### `addSkill(userId: number, skillData: Object): Promise<Object>`
- **Parameters:**
  - `userId` (number): User ID
  - `skillData` (Object): { skill_name, proficiency_level, years_of_experience }
- **Returns:** Created StudentSkill record
- **Validation:** skill_name (required), proficiency_level (enum), years_of_experience (optional)

##### `updateSkill(userId: number, skillId: number, data: Object): Promise<Object>`
- **Parameters:**
  - `userId` (number): User ID
  - `skillId` (number): Skill ID to update
  - `data` (Object): { proficiency_level, years_of_experience }
- **Returns:** Updated StudentSkill record
- **Verification:** Skill must belong to user's student profile

##### `deleteSkill(userId: number, skillId: number): Promise<boolean>`
- **Parameters:**
  - `userId` (number): User ID
  - `skillId` (number): Skill ID to delete
- **Returns:** true/false
- **Throws:** AppError(404) if skill not found

##### `getMatchedPostings(userId: number, minScore: number): Promise<Array>`
- **Parameters:**
  - `userId` (number): Student user ID
  - `minScore` (number): Minimum matching score (default 60)
- **Returns:** Array of matching postings with match scores
- **Calculation:** Calls MatchingService.calculateForStudent()
- **Filtering:** Only active postings, filtered by minScore

##### `applyToPosting(userId: number, postingId: number, data: Object): Promise<Object>`
- **Parameters:**
  - `userId` (number): Student user ID
  - `postingId` (number): OJT posting ID
  - `data` (Object): { cover_letter }
- **Returns:** Created Application record
- **Throws:** 
  - AppError(404): Posting not found or not active
  - AppError(409): Student already applied or all positions filled
- **Transaction Safety:** Uses database transaction with row lock
- **Side Effects:**
  - Creates Application record
  - Triggers notification
  - Audit logged

##### `getApplications(userId: number, query: Object): Promise<Array>`
- **Parameters:**
  - `userId` (number): Student user ID
  - `query` (Object): { status, page, limit }
- **Returns:** Array of Application records
- **Filtering:** By application_status if provided
- **Pagination:** Supports page/limit parameters

---

### MatchingService

**Location:** `src/services/MatchingService.js`  
**Purpose:** Core matching algorithm for student-to-job compatibility  
**Dependency:** Student, OjtPosting, MatchScore, MatchingRule models

#### Public Methods:

##### `calculateForStudent(studentId: number): Promise<Array>`
- **Parameters:**
  - `studentId` (number): Student ID
- **Returns:** Array of match scores sorted by overall_score DESC
- **Throws:** AppError(404) if student not found
- **Scope:** All active postings (posting_status='active')
- **Caching:** Results stored in MatchScore table for fast retrieval

##### `calculateScore(student: Object, posting: Object): Promise<Object>`
- **Parameters:**
  - `student` (Object): Student record with skills
  - `posting` (Object): OjtPosting record with requiredSkills
- **Returns:** MatchScore record with all component scores
- **Algorithm:**
  ```
  Components (equal weight initially):
  1. skillScore (0-100) = 40% weight
  2. locationScore (0-100) = 20% weight
  3. availabilityScore (0-100) = 20% weight
  4. gpaScore (0-100) = 10% weight
  5. academicProgramScore (0-100) = 10% weight
  
  Formula: overall_score = (skillScore * 0.40) + (locationScore * 0.20) + 
                          (availabilityScore * 0.20) + (gpaScore * 0.10) + 
                          (academicProgramScore * 0.10)
  ```
- **Creates/Updates:** MatchScore record (findOrCreate pattern)

##### `calculateSkillScore(student: Object, posting: Object): Promise<number>`
- **Parameters:**
  - `student` (Object): Student with skills array
  - `posting` (Object): Posting with requiredSkills array
- **Returns:** Score 0-100
- **Algorithm:**
  - Required skills: 80% weight
  - Preferred skills: 20% weight
  - If admin.prioritize_required_skills and missing required skills: penalize by -30
  - Skill matching: case-insensitive, by name
  - Weights: Each skill has configurable weight (default 1.0)

##### `calculateLocationScore(student: Object, posting: Object): Promise<number>`
- **Parameters:**
  - `student` (Object): Student with preferred/current location
  - `posting` (Object): Posting with location, allow_remote flag
- **Returns:** Score 0-100
- **Logic:**
  - Remote allowed: 100pts
  - Preferred location matches posting: 100pts
  - Current location matches posting: 80pts
  - Student willing to relocate: 50pts
  - No information: 0pts

##### `calculateAvailabilityScore(student: Object, posting: Object): Promise<number>`
- **Parameters:**
  - `student` (Object): Student with availability_start/end dates
  - `posting` (Object): Posting with start_date, duration_weeks
- **Returns:** Score 0-100
- **Logic:** DateRange overlap calculation

##### `calculateGpaScore(student: Object, posting: Object): Promise<number>`
- **Parameters:**
  - `student` (Object): Student with GPA
  - `posting` (Object): Posting with min_gpa requirement
- **Returns:** Score 0-100
- **Logic:** Linear interpolation between min_gpa and 4.0 (max GPA)

##### `calculateAcademicProgramScore(student: Object, posting: Object): Promise<number>`
- **Parameters:**
  - `student` (Object): Student with academic_program
  - `posting` (Object): Posting with required academic_program (optional)
- **Returns:** Score 0-100
- **Logic:**
  - Exact match: 100pts
  - No requirement in posting: 100pts
  - No program specified in student: 50pts
  - Different program: 0pts

##### `getDefaultRules(): Object`
- **Returns:** Default matching weights/configuration
- **Weights:**
  ```javascript
  {
    skill_weight: 0.40,
    location_weight: 0.20,
    availability_weight: 0.20,
    gpa_weight: 0.10,
    academic_program_weight: 0.10,
    prioritize_required_skills: false
  }
  ```

---

### NotificationService

**Location:** `src/services/NotificationService.js`  
**Purpose:** In-app notification management  
**Dependency:** Notification model

#### Public Methods:

##### `notify(userId: number, data: Object): Promise<Object>`
- **Parameters:**
  - `userId` (number): User to notify
  - `data` (Object): { title, message, type, entityType, entityId, priority, actionUrl }
- **Returns:** Created Notification record
- **Throws:** AppError on creation failure

##### `getNotifications(userId: number, page: number, limit: number): Promise<Object>`
- **Parameters:**
  - `userId` (number): User ID
  - `page` (number): Page number (default 1)
  - `limit` (number): Items per page (default 10)
- **Returns:** `{ data: Array, pagination: {...} }`
- **Offset:** (page - 1) * limit
- **Sorting:** By createdAt DESC

##### `getUnreadNotifications(userId: number, limit: number): Promise<Array>`
- **Parameters:**
  - `userId` (number): User ID
  - `limit` (number): Max notifications (default 10)
- **Returns:** Array of unread notifications
- **Filter:** is_read = false
- **Sorting:** By priority DESC, then createdAt DESC

##### `markAsRead(notificationId: number): Promise<Object>`
- **Parameters:**
  - `notificationId` (number): Notification ID
- **Returns:** Updated Notification (is_read=true, read_at=NOW)
- **Throws:** Error if notification not found

##### `markAllAsRead(userId: number): Promise<Object>`
- **Parameters:**
  - `userId` (number): User ID
- **Returns:** Update result with count updated
- **Filter:** user_id=userId AND is_read=false

##### `deleteNotification(notificationId: number): Promise<boolean>`
- **Parameters:**
  - `notificationId` (number): Notification ID
- **Returns:** true if deleted, false if not found

##### `getUnreadCount(userId: number): Promise<number>`
- **Parameters:**
  - `userId` (number): User ID
- **Returns:** Count of unread notifications
- **Filter:** user_id=userId AND is_read=false

##### `notifyApplicationSubmitted(userId: number, applicationId: number, postingTitle: string): Promise<Object>`
- Called automatically when student applies to a posting
- **Message:** "Your application for {postingTitle} has been submitted successfully!"
- **Type:** 'application_submitted'
- **Priority:** 'normal'

---

### AuditService

**Location:** `src/services/NotificationService.js` (exported alongside NotificationService)  
**Purpose:** Log all sensitive operations for compliance and security  
**Dependency:** AuditLog model

#### Public Methods:

##### `log(data: Object): Promise<Object>`
- **Parameters:**
  ```javascript
  data: {
    userId: number,
    action: 'create|update|delete|login|logout|view',
    entityType: string,
    entityId: number,
    oldValues: Object|null,
    newValues: Object|null,
    ipAddress: string,
    userAgent: string,
    severity: 'low|medium|high|critical',
    reason: string|null
  }
  ```
- **Returns:** Created AuditLog record
- **Automatic Fields:** createdAt, status='success'

##### `logLogin(userId: number, ipAddress: string, userAgent: string): Promise<Object>`
- Called on successful login
- **Action:** 'login'
- **Severity:** 'medium'
- **Entity:** User (ref: userId)

##### `logDataChange(userId: number, entityType: string, entityId: number, oldValues: Object, newValues: Object, reason: string): Promise<Object>`
- Called when user data is modified
- **Action:** 'update'
- **Severity:** Varies
- **Tracks:** Before and after values

---

## 3. Data Models & Relationships

### Database: SQLite3
**Location:** `./database/ojt_system.db`  
**ORM:** Sequelize 6.35+  
**Timestamps:** Auto-added (createdAt, updatedAt)

### Models Overview

```
User (1) ──┬──→ (1) Student
           ├──→ (1) Company
           ├──→ (1) Coordinator
           └──→ (Many) PasswordResetToken

Student (1) ──┬──→ (Many) StudentSkill
              ├──→ (Many) Application
              ├──→ (Many) Resume
              ├──→ (Many) MatchScore
              └──→ (Many) OjtProgress

Company (1) ──→ (Many) OjtPosting

OjtPosting (1) ──┬──→ (Many) PostingSkill
                 ├──→ (Many) Application
                 └──→ (Many) MatchScore

Application (Many) ──→ (1) Resume
AuditLog (tracking all changes)
Notification (one-to-many with User)
```

### Model Definitions

#### User Model
```
Table: "Users" (pluralized by Sequelize)

Columns:
├── id (INTEGER, PK, autoIncrement)
├── name (STRING 255, NOT NULL)
├── email (STRING 255, NOT NULL, UNIQUE)
├── password (STRING 255, NOT NULL, bcrypt-hashed)
├── role (ENUM: 'student'|'company'|'coordinator'|'admin', default='student')
├── status (ENUM: 'active'|'pending'|'suspended'|'inactive', default='pending')
├── email_verified_at (DATE, nullable)
├── last_login_at (DATE, nullable)
├── remember_token (STRING 100, nullable)
├── failedLoginAttempts (INTEGER, default=0)
├── lockedUntil (DATE, nullable)
├── createdAt (DATE, auto)
└── updatedAt (DATE, auto)

Indexes:
├── email (UNIQUE)
├── role
├── status

Hooks:
├── beforeCreate: Hash password with bcrypt
└── beforeUpdate: Hash if password changed

Methods:
├── generateToken(): Generates JWT token
├── comparePassword(plaintext): Async bcrypt comparison
├── getProfile(): Returns role-specific profile
└── findByEmail(email): Static class method
```

#### Student Model
```
Table: "Students"

Columns:
├── id (INTEGER, PK)
├── user_id (INTEGER, FK→User.id, CASCADE)
├── first_name (STRING 100, nullable)
├── last_name (STRING 100, nullable)
├── phone (STRING 20, nullable)
├── bio (TEXT, nullable)
├── current_location (STRING 255, nullable)
├── preferred_location (STRING 255, nullable)
├── profile_picture_url (STRING 500, nullable)
├── availability_start (DATE, nullable)
├── availability_end (DATE, nullable)
├── profile_completeness_percentage (INTEGER 0-100, default=0)
├── gpa (DECIMAL 3.2, 0-4.0, nullable)
├── academic_program (STRING 255, nullable)
├── year_of_study (ENUM: '1st'|'2nd'|'3rd'|'4th'|'graduate', nullable)
├── createdAt (DATE)
└── updatedAt (DATE)

Indexes:
├── user_id
└── preferred_location

Methods:
├── calculateProfileCompleteness(): Updates profile_completeness_percentage
└── getMatchedPostings(minScore): Returns MatchScore records
```

#### Company Model
```
Table: "Companies"

Columns:
├── id (INTEGER, PK)
├── user_id (INTEGER, FK→User.id, CASCADE)
├── company_name (STRING 255, nullable)
├── industry_type (STRING 100, nullable)
├── company_size (ENUM: '1-50'|'51-200'|'201-500'|'500+', nullable)
├── company_website (STRING 500, nullable, URL validated)
├── phone (STRING 20, nullable)
├── address (STRING 500, nullable)
├── city (STRING 100, nullable)
├── country (STRING 100, nullable)
├── description (TEXT, nullable)
├── logo_url (STRING 500, nullable)
├── accreditation_status (ENUM: 'pending'|'approved'|'rejected'|'suspended', default='pending')
├── accreditation_verified_at (DATE, nullable)
├── average_rating (DECIMAL 3.2, 0-5.0, default=0)
├── total_ratings (INTEGER, default=0)
├── tax_id (STRING 50, nullable)
├── is_approved_for_posting (BOOLEAN, default=false)
├── createdAt (DATE)
└── updatedAt (DATE)

Indexes:
├── user_id
└── accreditation_status

Validations:
├── company_website: Must be valid URL
├── average_rating: 0-5 range
└── total_ratings: >= 0
```

#### OjtPosting Model
```
Table: "OjtPostings"

Columns:
├── id (INTEGER, PK)
├── company_id (INTEGER, FK→Company.id, CASCADE)
├── title (STRING 255, NOT NULL)
├── description (TEXT, NOT NULL)
├── location (STRING 255, NOT NULL)
├── allow_remote (BOOLEAN, default=false)
├── duration_weeks (INTEGER 1-52)
├── start_date (DATE, nullable)
├── salary_range_min (DECIMAL 12.2, >=0, nullable)
├── salary_range_max (DECIMAL 12.2, >=0, nullable)
├── stipend (BOOLEAN, default=false)
├── min_gpa (DECIMAL 3.2, 0-4.0, nullable)
├── academic_program (STRING 255, nullable)
├── min_year_of_study (ENUM: '1st'|'2nd'|'3rd'|'4th'|'graduate'|'any', default='any')
├── posting_status (ENUM: 'active'|'closed'|'draft'|'archived', default='draft')
├── positions_available (INTEGER, >=1, default=1)
├── positions_filled (INTEGER, >=0, default=0)
├── number_of_applications (INTEGER, default=0)
├── published_at (DATE, nullable)
├── application_deadline (DATE, nullable)
├── tags (JSON, default=[])
├── createdAt (DATE)
└── updatedAt (DATE)

Indexes:
├── company_id
├── posting_status
├── location
└── academic_program

Methods:
├── hasPositionsAvailable(): Returns boolean
├── incrementApplicationCount(): Increments number_of_applications
└── calculateMatches(minScore): Calls MatchingService
```

#### StudentSkill Model
```
Table: "StudentSkills"

Columns:
├── id (INTEGER, PK)
├── student_id (INTEGER, FK→Student.id, CASCADE)
├── skill_name (STRING 100, NOT NULL)
├── proficiency_level (ENUM: 'beginner'|'intermediate'|'expert', default='beginner')
├── years_of_experience (INTEGER, nullable)
├── endorsed_count (INTEGER, default=0)
├── createdAt (DATE)
└── updatedAt (DATE)

Indexes:
├── student_id
└── skill_name

Methods:
├── updateProficiency(level): Updates proficiency_level
└── incrementEndorsements(): Increments endorsed_count
```

#### PostingSkill Model
```
Table: "PostingSkills"

Columns:
├── id (INTEGER, PK)
├── posting_id (INTEGER, FK→OjtPosting.id, CASCADE)
├── skill_name (STRING 100, NOT NULL)
├── is_required (BOOLEAN, default=false)
├── min_proficiency_level (ENUM: 'beginner'|'intermediate'|'expert', default='beginner')
├── weight (DECIMAL 5.2, default=1.0)
├── createdAt (DATE)
└── updatedAt (DATE)

Indexes:
├── posting_id
├── skill_name
└── is_required
```

#### Application Model
```
Table: "Applications"

Columns:
├── id (INTEGER, PK)
├── student_id (INTEGER, FK→Student.id, CASCADE)
├── posting_id (INTEGER, FK→OjtPosting.id, CASCADE)
├── resume_id (INTEGER, FK→Resume.id, nullable)
├── application_status (ENUM: 'submitted'|'under_review'|'shortlisted'|'rejected'|'hired'|'withdrawn', default='submitted')
├── cover_letter (TEXT, nullable)
├── match_score (DECIMAL 5.2, 0-100, nullable)
├── company_feedback (TEXT, nullable)
├── rejection_reason (STRING 255, nullable)
├── applied_at (DATE, default=NOW)
├── reviewed_at (DATE, nullable)
├── interviewed_at (DATE, nullable)
├── hired_at (DATE, nullable)
├── notes (TEXT, nullable)
├── createdAt (DATE)
└── updatedAt (DATE)

Indexes:
├── student_id
├── posting_id
├── application_status
├── applied_at
└── UNIQUE(student_id, posting_id) ← Prevents duplicate applications

Methods:
├── updateStatus(newStatus, reason): Updates application_status with validation
├── scheduleInterview(date): Sets interviewed_at
└── withdraw(): Sets status='withdrawn'
```

#### MatchScore Model
```
Table: "MatchScores"

Columns:
├── id (INTEGER, PK)
├── student_id (INTEGER, FK→Student.id, CASCADE)
├── posting_id (INTEGER, FK→OjtPosting.id, CASCADE)
├── overall_score (DECIMAL 5.2, 0-100)
├── skill_score (DECIMAL 5.2, 0-100)
├── location_score (DECIMAL 5.2, 0-100)
├── availability_score (DECIMAL 5.2, 0-100)
├── gpa_score (DECIMAL 5.2, 0-100)
├── academic_program_score (DECIMAL 5.2, 0-100)
├── match_status (ENUM: 'strong_match'|'good_match'|'moderate_match'|'weak_match', default='moderate_match')
├── calculated_at (DATE)
├── createdAt (DATE)
└── updatedAt (DATE)

Indexes:
├── student_id
├── posting_id
├── overall_score
└── UNIQUE(student_id, posting_id) ← Only one score per pair

Purpose: Cache matching calculation results
Refresh: Recalculated when student profile or posting changes
```

#### AuditLog Model
```
Table: "AuditLogs"

Columns:
├── id (INTEGER, PK)
├── user_id (INTEGER, FK→User.id, nullable, CASCADE)
├── user_role (STRING 50, nullable)
├── entity_type (STRING 100, NOT NULL) — E.g., 'User', 'Application', 'Student'
├── entity_id (INTEGER, NOT NULL)
├── action (ENUM: 'create'|'update'|'delete'|'login'|'logout'|'view')
├── old_values (JSON, nullable)
├── new_values (JSON, nullable)
├── ip_address (STRING 50, nullable)
├── user_agent (TEXT, nullable)
├── reason (TEXT, nullable)
├── severity (ENUM: 'low'|'medium'|'high'|'critical', default='medium')
├── status (ENUM: 'success'|'failed'|'pending', default='success')
├── error_message (TEXT, nullable)
├── createdAt (DATE)
└── updatedAt (DATE)

Indexes:
├── user_id
├── entity_type
├── entity_id
├── action
├── severity
└── (user_id, action, entity_type)

Purpose: Compliance, security audit trails, troubleshooting
Retention: Indefinite (critical data)
```

#### Notification Model
```
Table: "Notifications"

Columns:
├── id (INTEGER, PK)
├── user_id (INTEGER, FK→User.id, CASCADE)
├── title (STRING 255, NOT NULL)
├── message (TEXT, NOT NULL)
├── type (STRING 100, NOT NULL) — E.g., 'application_submitted', 'application_accepted'
├── entity_type (STRING 100, nullable)
├── entity_id (INTEGER, nullable)
├── priority (ENUM: 'low'|'normal'|'high'|'urgent', default='normal')
├── action_url (STRING 500, nullable) — Link for action button
├── is_read (BOOLEAN, default=false)
├── read_at (DATE, nullable)
├── createdAt (DATE)
└── updatedAt (DATE)

Indexes:
├── user_id
├── is_read
└── priority

Methods:
├── markAsRead(): Sets is_read=true, read_at=NOW
└── createAndNotify(userId, data): Create + return
```

#### PasswordResetToken Model
```
Table: "PasswordResetTokens"

Columns:
├── id (INTEGER, PK)
├── userId (INTEGER, FK→User.id, CASCADE)
├── token (STRING 255, NOT NULL, UNIQUE)
├── is_used (BOOLEAN, default=false)
├── expires_at (DATE, NOT NULL)
├── createdAt (DATE)
└── updatedAt (DATE)

Purpose: One-time password reset tokens
TTL: Default 1 hour
```

---

## 4. Middleware & Security

### Authentication Middleware

**Location:** `src/middleware/auth.js`

#### `authMiddleware(req, res, next): void`

**Purpose:** Verify JWT token and validate user authentication

**Flow:**
```
1. Check Authorization header
   - Expected format: "Bearer {token}"
   - Throw 401 if missing/invalid format
2. Extract token (remove "Bearer " prefix)
3. Call jwt.verify(token, config.auth.secret)
   - Verifies signature
   - Checks expiration
4. On success: Attach decoded user to req.user
5. On error: Handle TokenExpiredError, JsonWebTokenError
6. Call next() to pass to next middleware
```

**Error Handling:**
```javascript
- TokenExpiredError: 401 { message: "Token has expired" }
- JsonWebTokenError: 401 { message: "Invalid token" }
- AppError: Pass through with statusCode
- Other: 401 { message: "Authentication failed" }
```

**Attached to Request:**
```javascript
req.user = {
  id: number,
  email: string,
  role: string,
  // ... other JWT payload fields
}
```

#### `rbacMiddleware(allowedRoles: string[]): Middleware`

**Purpose:** Role-Based Access Control enforcement

**Usage:**
```javascript
// Allow only admins
app.get('/path', rbacMiddleware(['admin']), handler)

// Allow admins or coordinators
app.get('/path', rbacMiddleware(['admin', 'coordinator']), handler)

// Allow any authenticated user (empty array)
app.get('/path', rbacMiddleware([]), handler)
```

**Implementation:**
```
1. Check if req.user exists (authMiddleware must run first)
2. If no allowed roles specified: allow all authenticated users
3. Check if req.user.role is in allowedRoles array
4. If match: Call next()
5. If no match: 403 { message: "Forbidden. Required role: {roles}" }
```

**Logging:** Logs unauthorized attempts with userId, userRole, requiredRoles

### Rate Limiting

**Location:** `src/middleware/auth.js` (RateLimiter class)

#### `RateLimiter(windowMs: number, maxRequests: number)` Class

**Purpose:** Prevent brute force and DoS attacks

**Configuration:**
```javascript
// Default from config.auth
windowMs: 900000 (15 minutes)
maxRequests: 100 (per IP per window)

// Auth endpoints (more restrictive)
RateLimiter(windowMs, max/20 = 5 attempts per 15 minutes)

// General endpoints
RateLimiter(windowMs, 100 requests per 15 minutes)
```

**Implementation:**
```
1. Get client IP (handles proxies via X-Forwarded-For, X-Real-IP)
2. Get current timestamp (Date.now())
3. Initialize IP tracking if first request
4. Remove expired timestamps (older than windowMs)
5. Check: if valid_timestamps.length >= maxRequests → 429
6. Add current timestamp to tracking
7. Set header: Retry-After: {seconds}
```

**Response (429 Too Many Requests):**
```json
{
  "message": "Too many requests, please try again later",
  "statusCode": 429,
  "retryAfter": 900
}
```

**Storage:** In-memory Map (not persistent across server restarts)

---

### Validation Middleware

**Location:** `src/middleware/validation.js`

#### `handleValidationErrors(req, res, next): void`

**Purpose:** Process express-validator results

```javascript
const errors = validationResult(req);
if (!errors.isEmpty()) {
  // Format: { param: ["error1", "error2"] }
  return 422 Unprocessable Entity
}
```

#### Validation Rule Sets

##### Authentication Rules (`authValidationRules()`)
```javascript
Rules: [
  body('email')
    .trim()
    .isEmail() ✓ Valid email format
    .normalizeEmail()
    .toLowerCase(),
  
  body('password')
    .isLength({ min: 8 }) ✓ Min 8 characters
    .matches(/[A-Z]/) ✓ At least 1 uppercase
    .matches(/[0-9]/) ✓ At least 1 digit
    .matches(/[!@#$%^&*]/) ✓ At least 1 special char
  
  body('password_confirmation')
    .custom((value, { req }) => value === req.body.password)
    ✓ Match password field
  
  body('name')
    .trim()
    .isLength({ min: 2, max: 255 })
    .matches(/^[a-zA-Z\s'-]+$/) ✓ Only letters, spaces, hyphens, apostrophes
]
```

##### Student Update Rules (`studentUpdateRules()`)
```javascript
body('first_name').optional()...
body('last_name').optional()...
body('phone').optional().isMobilePhone()
body('bio').optional().isLength({ max: 1000 })
body('profile_picture_url').optional().isURL()
body('preferred_location').optional()...
body('availability_start').optional().isISO8601()
body('availability_end').optional().isISO8601()
```

##### Job Posting Rules (`jobPostingRules()`)
```javascript
body('title')
  .trim()
  .notEmpty()
  .isLength({ min: 3, max: 255 })

body('description')
  .trim()
  .notEmpty()
  .isLength({ min: 20, max: 5000 })

body('location').trim().notEmpty()...
body('salary_range_min').optional().isInt({ min: 0 })
body('salary_range_max').optional().isInt({ min: 0 })
body('duration_weeks').isInt({ min: 1, max: 52 })
body('posting_status').isIn(['active', 'closed', 'draft'])
```

### Security Headers (Helmet)

**Location:** `src/server.js`

```javascript
app.use(helmet());
```

**Headers Added:**
```
Strict-Transport-Security: max-age=15552000; includeSubDomains
X-Content-Type-Options: nosniff
X-Frame-Options: DENY
X-XSS-Protection: 1; mode=block
Referrer-Policy: strict-origin-when-cross-origin
```

### CORS Configuration

**Location:** `src/config/env.js` and `src/server.js`

```javascript
cors: {
  origin: (process.env.CORS_ORIGIN || 'http://localhost:3000').split(','),
  methods: ['GET', 'POST', 'PUT', 'DELETE'],
  credentials: true
}
```

---

## 5. Error Handling

### Custom Error Class

**Location:** `src/utils/errorHandler.js`

#### `AppError extends Error`

```javascript
constructor(message, statusCode = 500, context = {})

Properties:
- message: Error description
- statusCode: HTTP status code
- context: Additional context info
- timestamp: ISO string of when error occurred
- stack: Stack trace (maintained)

Methods:
- toJSON(includeStack?): Convert to response object
```

**Usage:**
```javascript
throw new AppError('User not found', 404, { userId: 123 })
throw new AppError('Email already registered', 409)
throw new AppError('Account locked', 423)
```

**Response Format:**
```json
{
  "message": "Error description",
  "statusCode": 404,
  "timestamp": "2026-04-09T10:30:00Z",
  "stack": "..." // Only in debug mode
}
```

### Error Handler Middleware

**Location:** `src/server.js`

**Applied as final middleware:**
```javascript
app.use(errorHandler);

// Catches all errors from:
// - Thrown exceptions
// - Async handler rejections
// - Middleware errors
```

**Handler Logic:**
```
1. If AppError: Return res.status(statusCode).json(toJSON())
2. If known error type (ValidationError, etc): Handle appropriately
3. Default: 500 { message: "Internal server error" }
```

### Error Wrapping Helper

**Location:** `src/utils/errorHandler.js`

#### `wrap(asyncFn): Middleware`

**Purpose:** Catch async errors and pass to error handler

```javascript
// Without wrap: Unhandled promise rejection
app.get('/path', async (req, res) => {
  throw new Error('Oops!') // Not caught
})

// With wrap: Errors pass to next(error)
app.get('/path', 
  wrap(async (req, res) => {
    throw new AppError('User not found', 404)
  })
)
```

**Implementation:**
```javascript
const wrap = (fn) => (req, res, next) => {
  Promise.resolve(fn(req, res, next)).catch(next);
};
```

### Logger Utility

**Location:** `src/utils/errorHandler.js`

#### `Logger` Class (Static Methods)

```javascript
// Levels: ERROR, WARN, INFO, DEBUG

Logger.error(message, error, meta)
Logger.warn(message, meta)
Logger.info(message, meta)
Logger.debug(message, meta)
```

**Features:**
- Colored console output (development)
- File logging (production or ERROR level)
- Structured logging (JSON format)
- Metadata support
- Stack trace capture

**Example:**
```javascript
Logger.info('User logged in', {
  userId: user.id,
  email: user.email,
  role: user.role
})

// Output: {"timestamp": "...", "level": "INFO", "message": "...", "userId": 1, ...}
```

**Log File:** `./logs/app.log` (JSON lines format)

---

## 6. Database Configuration

### Sequelize Setup

**Location:** `src/config/database.js`

```javascript
const sequelize = new Sequelize({
  dialect: 'sqlite',
  storage: process.env.NODE_ENV === 'test' ? ':memory:' : './database/ojt_system.db',
  logging: false, // Disable SQL logging
  timestamps: true, // Auto-add createdAt/updatedAt
  
  define: {
    underscored: true, // camelCase → snake_case
    freezeTableName: false, // Auto-pluralize table names
    paranoid: true, // Soft deletes
  }
})
```

### Sync Strategy

```javascript
// Test environment
sequelize.sync({ force: true }) 
// Drops & recreates all tables for each test run

// Development
sequelize.sync({ alter: true })
// Safe schema updates (adds columns, may not drop)

// Production
// Use migrations instead (not auto-sync)
```

### Connection Pooling

**Default Settings:**
```javascript
// SQLite doesn't use connection pools (single file-based DB)
// In-memory database (:memory:) for tests
// File-based for development/production
```

### Database File

**Location:** `./database/ojt_system.db`  
**Format:** SQLite3 binary format  
**Migrations:** `./database/migrations/`

**Migration Files:**
```
20260415001-create-password-reset-tokens.js
20260415002-add-account-lockout-columns.js
20260415003-add-database-indexes.js
```

---

## 7. Environment Variables

### Configuration File

**Location:** `.env` (not checked into git)  
**Template:** `.env.example` (in git)

### Required Variables

```bash
# REQUIRED - Must be set or app won't start
JWT_SECRET=your-secret-key-change-this-in-production

# OPTIONAL - With defaults
APP_NAME=OJT System V2
APP_ENV=development|production|test
APP_DEBUG=true|false
APP_PORT=5000 (default)
APP_URL=http://localhost:5000 (default)

DB_CONNECTION=sqlite (only option)
DB_PATH=./database/ojt_system.db (default)

JWT_EXPIRES_IN=7d (default)
BCRYPT_ROUNDS=10 (default, higher = slower but more secure)

RATE_LIMIT_WINDOW_MS=900000 (15 min, default)
RATE_LIMIT_MAX_REQUESTS=100 (default)

CORS_ORIGIN=http://localhost:3000 (default, comma-separated for multiple)
LOG_LEVEL=info (default: info, options: error|warn|info|debug)
LOG_FILE=./logs/app.log (default)
```

### Configuration Object

**Location:** `src/config/env.js`

```javascript
export const config = {
  app: {
    name: process.env.APP_NAME || 'OJT System V2',
    env: process.env.APP_ENV || 'development',
    debug: process.env.APP_DEBUG === 'true',
    port: parseInt(process.env.APP_PORT || '5000'),
    url: process.env.APP_URL || 'http://localhost:5000',
  },
  database: {
    connection: 'sqlite',
    path: process.env.DB_PATH || './database/ojt_system.db',
  },
  auth: {
    secret: process.env.JWT_SECRET, // No default - must be set
    expiresIn: process.env.JWT_EXPIRES_IN || '7d',
    bcryptRounds: parseInt(process.env.BCRYPT_ROUNDS || '10'),
  },
  rateLimit: {
    windowMs: parseInt(process.env.RATE_LIMIT_WINDOW_MS || '900000'),
    maxRequests: parseInt(process.env.RATE_LIMIT_MAX_REQUESTS || '100'),
  },
  cors: {
    origin: (process.env.CORS_ORIGIN || 'http://localhost:3000').split(','),
    methods: ['GET', 'POST', 'PUT', 'DELETE'],
    credentials: true,
  },
  logging: {
    level: process.env.LOG_LEVEL || 'info',
    file: process.env.LOG_FILE || './logs/app.log',
  },
};

export function validateConfig() {
  const required = ['JWT_SECRET'];
  const missing = required.filter(key => !process.env[key]);
  if (missing.length > 0) {
    throw new Error(`Missing required environment variables: ${missing.join(', ')}`);
  }
}
```

### Validation

**When:** On app startup in `server.js`

```javascript
validateConfig(); // Throws if JWT_SECRET not set
```

---

## 8. Testing Approach

### Testing Stack

**Framework:** Jest 29.0+  
**E2E HTTP Testing:** Supertest 6.3+  
**Mocking:** Jest built-in mocks  

### Test Scripts

```jsonse
npm run test              // All tests with coverage
npm run test:watch       // Watch mode
npm run test:unit        // Unit tests only
npm run test:integration // Integration tests only
npm run test:verbose     // Detailed output
```

### Test Structure

```
tests/
├── helpers.js            // Test utilities, factories
├── setup.js              // Global test setup
├── unit/
│   ├── authService.test.js
│   ├── matchingService.test.js
│   ├── bugfixes.test.js
│   └── sanityChecks.test.js
└── integration/
    └── api.test.js
```

### Unit Testing Pattern

**Location:** `tests/unit/authService.test.js`

```javascript
import { describe, it, expect, beforeEach, afterEach, jest } from '@jest/globals';
import bcrypt from 'bcrypt';
import { factories, testTime } from '../helpers.js';

describe('AuthService', () => {
  let authService;
  let mockModels;

  beforeEach(() => {
    // Create mock models for isolated testing
    mockModels = {
      User: {
        findByPk: jest.fn(),
        findOne: jest.fn(),
        create: jest.fn(),
      },
      Student: {
        create: jest.fn(),
        findOne: jest.fn(),
      },
    };
    
    authService = new AuthService(mockModels);
  });

  describe('register()', () => {
    it('should successfully register new student', async () => {
      const userData = {
        name: 'John Doe',
        email: 'john@test.com',
        password: 'SecurePass123!',
        role: 'student',
      };

      const mockUser = factories.studentUser({ email: userData.email });
      mockModels.User.create.mockResolvedValue(mockUser);
      mockModels.Student.create.mockResolvedValue({});

      const result = await authService.register(userData);

      expect(result).toBeDefined();
      expect(result.email).toBe(userData.email);
      expect(result.role).toBe('student');
      expect(mockModels.User.create).toHaveBeenCalledWith(
        expect.objectContaining({ email: userData.email.toLowerCase() })
      );
    });

    it('should reject duplicate email', async () => {
      mockModels.User.findByEmail = jest.fn().mockResolvedValue({ id: 1 });

      await expect(
        authService.register({
          name: 'Jane Doe',
          email: 'existing@test.com',
          password: 'SecurePass123!',
          role: 'student',
        })
      ).rejects.toThrow('already registered');
    });

    it('should validate password strength', async () => {
      const weakPasswords = ['short', 'NoNumbers!', '12345678'];

      for (const pwd of weakPasswords) {
        await expect(
          authService.register({
            name: 'Test',
            email: `test${Math.random()}@test.com`,
            password: pwd,
            role: 'student',
          })
        ).rejects.toThrow();
      }
    });

    it('should hash password before storing', async () => {
      const password = 'TestPassword123!';
      const hashedPassword = await bcrypt.hash(password, 10);

      // Verify hashing
      expect(hashedPassword).not.toBe(password);
      expect(hashedPassword.length).toBeGreaterThan(password.length);

      // Verify compare works
      const matches = await bcrypt.compare(password, hashedPassword);
      expect(matches).toBe(true);
    });

    it('should create role-specific profile', async () => {
      const roles = ['student', 'company', 'coordinator'];

      for (const role of roles) {
        mockModels.User.create.mockResolvedValue(factories.studentUser({ role }));
        mockModels[role === 'student' ? 'Student' : role].create.mockResolvedValue({});

        await authService.register({
          name: `User ${role}`,
          email: `${role}@test.com`,
          password: 'SecurePass123!',
          role,
        });

        // Verify correct model's create was called
        expect(
          mockModels[role === 'student' ? 'Student' : role].create
        ).toHaveBeenCalled();
      }
    });
  });

  describe('login()', () => {
    it('should login user with correct credentials', async () => {
      const password = 'SecurePass123!';
      const hashedPassword = await bcrypt.hash(password, 10);
      const mockUser = factories.studentUser();
      mockUser.password = hashedPassword;
      mockUser.comparePassword = jest.fn().mockResolvedValue(true);

      mockModels.User.findByEmail = jest.fn().mockResolvedValue(mockUser);

      const result = await authService.login('john@test.com', password);

      expect(result.user).toBeDefined();
      expect(result.token).toBeDefined();
      expect(mockUser.comparePassword).toHaveBeenCalledWith(password);
    });

    it('should reject invalid password', async () => {
      const mockUser = factories.studentUser();
      mockUser.comparePassword = jest.fn().mockResolvedValue(false);
      mockModels.User.findByEmail = jest.fn().mockResolvedValue(mockUser);

      await expect(
        authService.login('john@test.com', 'WrongPassword123!')
      ).rejects.toThrow('Invalid email or password');
    });

    it('should lock account after 5 failed attempts', async () => {
      const mockUser = factories.studentUser();
      mockUser.failedLoginAttempts = 4;
      mockUser.comparePassword = jest.fn().mockResolvedValue(false);
      mockUser.update = jest.fn().mockResolvedValue({});

      mockModels.User.findByEmail = jest.fn().mockResolvedValue(mockUser);

      // 5th failed attempt should lock
      await expect(
        authService.login('john@test.com', 'WrongPassword!')
      ).rejects.toThrow('locked');

      expect(mockUser.update).toHaveBeenCalledWith(
        expect.objectContaining({ status: 'locked' })
      );
    });

    it('should update last_login_at on success', async () => {
      const mockUser = factories.studentUser();
      mockUser.comparePassword = jest.fn().mockResolvedValue(true);
      mockUser.update = jest.fn().mockResolvedValue({});

      mockModels.User.findByEmail = jest.fn().mockResolvedValue(mockUser);

      await authService.login('john@test.com', 'SecurePass123!');

      expect(mockUser.update).toHaveBeenCalledWith(
        expect.objectContaining({ last_login_at: expect.any(Date) })
      );
    });
  });
});
```

### Test Helpers

**Location:** `tests/helpers.js`

```javascript
// Factories for consistent test data
export const factories = {
  studentUser: (overrides = {}) => ({
    id: 1,
    name: 'Test Student',
    email: `student-${Math.random()}@test.com`,
    password: 'hashed_password',
    role: 'student',
    status: 'active',
    ...overrides,
  }),

  ojtPosting: (companyId, overrides = {}) => ({
    id: 1,
    company_id: companyId,
    title: 'Junior Developer',
    description: 'Exciting opportunity...',
    location: 'Manila',
    posting_status: 'active',
    positions_available: 2,
    positions_filled: 0,
    ...overrides,
  }),

  skill: (overrides = {}) => ({
    id: 1,
    skill_name: 'JavaScript',
    proficiency_level: 'intermediate',
    years_of_experience: 2,
    ...overrides,
  }),

  application: (studentId, postingId, overrides = {}) => ({
    id: 1,
    student_id: studentId,
    posting_id: postingId,
    application_status: 'submitted',
    cover_letter: 'I am interested...',
    match_score: 85,
    ...overrides,
  }),

  hashPassword: async (password = 'TestPassword123!') => {
    return bcrypt.hash(password, 10);
  },
};

// Database utilities
export const testDb = {
  // Database setup/teardown helpers
};

// Time utilities for tests
export const testTime = {
  now: () => new Date(),
  future: (hours = 1) => new Date(Date.now() + hours * 60 * 60 * 1000),
  past: (hours = 1) => new Date(Date.now() - hours * 60 * 60 * 1000),
};
```

### Integration Testing

**Approach:** Test through HTTP layer with real models

```javascript
import request from 'supertest';
import { initializeApp } from '../src/server.js';

describe('Authentication API', () => {
  let app;

  beforeEach(async () => {
    app = await initializeApp();
  });

  it('should register new user', async () => {
    const response = await request(app)
      .post('/api/auth/register')
      .send({
        name: 'John Doe',
        email: 'john@test.com',
        password: 'SecurePass123!',
        role: 'student',
      });

    expect(response.status).toBe(201);
    expect(response.body.user.email).toBe('john@test.com');
    expect(response.body.token).toBeDefined();
  });

  it('should login user', async () => {
    // First register
    await request(app)
      .post('/api/auth/register')
      .send({...});

    // Then login
    const response = await request(app)
      .post('/api/auth/login')
      .send({
        email: 'john@test.com',
        password: 'SecurePass123!',
      });

    expect(response.status).toBe(200);
    expect(response.body.token).toBeDefined();
  });
});
```

### Test Coverage

**Target:** >80% coverage

**Command:** `npm run test:unit -- --coverage`

**Output:**
```
─────────────────────────────────────────────────────────────────
File                       | % Stmts | % Branch | % Funcs | % Lines |
─────────────────────────────────────────────────────────────────
All files                  |   85.2  |   78.3   |   88.9  |   85.1  |
 src/services/             |   89.4  |   85.2   |   92.1  |   89.2  |
  AuthService.js           |   91.0  |   88.0   |   94.0  |   90.0  |
  StudentService.js        |   87.0  |   84.0   |   90.0  |   87.0  |
 src/middleware/           |   82.1  |   75.0   |   85.0  |   81.0  |
```

### Sanity Checks

**Location:** `tests/unit/sanityChecks.test.js`

```javascript
// Tests that verify basic system health
describe('System Sanity Checks', () => {
  it('should load all models', () => {
    const models = initializeModels(sequelize);
    expect(models.User).toBeDefined();
    expect(models.Student).toBeDefined();
    expect(models.Company).toBeDefined();
    // ... etc
  });

  it('should validate config on startup', () => {
    expect(() => validateConfig()).not.toThrow();
  });

  it('should create required indexes', async () => {
    // Verify indexes exist
  });
});
```

---

## Summary Table

| Component | Implementation | Purpose | Key Features |
|-----------|----------------|---------|--------------|
| **Endpoints** | 15 total (2 public, 13 protected) | RESTful API | Rate-limited auth, RBAC, Paginated responses |
| **Services** | 4 main (Auth, Student, Matching, Notification) | Business logic | Atomic transactions, error handling, logging |
| **Models** | 16 tables | Data persistence | Relationships, indexes, validation hooks |
| **Middleware** | 4 types (Auth, RBAC, Validation, Rate Limit) | Request processing | Security, validation, access control |
| **Security** | Bcrypt, JWT, Helmet, CORS, Rate Limit | Protection | SQLi prevention, XSS protection, CSRF tokens |
| **Database** | SQLite + Sequelize | Data storage | ORM support, migrations, transactions |
| **Testing** | Unit + Integration | Quality assurance | >80% coverage, jest, supertest |
| **Error Handling** | Custom AppError class | Consistent responses | Structured logging, audit trails |
| **Logging** | Logger utility | Debugging/compliance | Console + file output, levels |
| **Config** | Environment variables (.env) | Flexibility | Validation, sensible defaults |

---

**Document Complete**  
Version 1.0 | April 9, 2026
