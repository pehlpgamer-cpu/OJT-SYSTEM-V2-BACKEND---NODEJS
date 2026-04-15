# OJT System V2 Backend - Complete Codebase Analysis
**Comprehensive Technical Documentation for Frontend Integration**

**Project**: OJT (On-The-Job Training) System V2 Backend  
**Framework**: Node.js + Express.js + Sequelize ORM  
**Database**: SQLite (development), PostgreSQL (production)  
**Version**: 2.0.0  
**Status**: Production-Ready  
**Date**: April 15, 2026

---

## Table of Contents
1. [Project Structure](#project-structure)
2. [Architecture Overview](#architecture-overview)
3. [API Endpoints Complete Map](#api-endpoints-complete-map)
4. [Services Analysis](#services-analysis)
5. [Database Models (15 Total)](#database-models-15-total)
6. [Middleware System](#middleware-system)
7. [Authentication & Security](#authentication--security)
8. [Error Handling](#error-handling)
9. [Configuration & Environment](#configuration--environment)
10. [Deployment (Vercel)](#deployment-vercel)
11. [Frontend Integration Guide](#frontend-integration-guide)

---

## 1. Project Structure

```
OJT-SYSTEM-V2-BACKEND-NODEJS/
├── src/
│   ├── server.js                 # Express app initialization & routes
│   ├── config/
│   │   ├── env.js               # Environment variables & validation
│   │   ├── database.js          # Sequelize configuration
│   │   └── passport.js          # Google OAuth strategy setup
│   ├── models/                  # 15 Database models
│   │   ├── index.js             # Model initialization & relationships
│   │   ├── User.js              # Base user table (all roles)
│   │   ├── Student.js           # Student profile extension
│   │   ├── Company.js           # Company profile extension
│   │   ├── Coordinator.js       # Coordinator profile extension
│   │   ├── OjtPosting.js        # Job postings
│   │   ├── Application.js       # Student applications + Resume model
│   │   ├── Skill.js             # StudentSkill & PostingSkill models
│   │   ├── Matching.js          # MatchScore & MatchingRule models
│   │   ├── Audit.js             # AuditLog, Notification, Message models
│   │   ├── PasswordResetToken.js # Password reset token management
│   ├── services/                # 5 Business logic services
│   │   ├── AuthService.js       # Registration, login, token generation
│   │   ├── StudentService.js    # Profile, skills, applications
│   │   ├── MatchingService.js   # 5-component job matching algorithm
│   │   ├── GoogleAuthService.js # Google OAuth & account linking
│   │   └── NotificationService.js # In-app notifications & audit logging
│   ├── middleware/
│   │   ├── auth.js              # JWT auth, RBAC, rate limiting
│   │   └── validation.js        # Input validation & sanitization
│   ├── routes/
│   │   └── googleAuth.js        # Google OAuth routes (redirect, callback, linking)
│   └── utils/
│       └── errorHandler.js      # AppError class, Logger, async wrapper
├── database/
│   └── migrations/              # Migration files (future use)
├── tests/
│   ├── unit/                    # Unit tests for services
│   ├── integration/             # Integration tests for APIs
│   └── helpers.js               # Test utilities
├── api/                         # Vercel serverless functions
│   ├── index.js                 # Main API handler
│   ├── minimal.js               # Minimal test endpoint
│   └── ping.js                  # Health check endpoint
├── logs/                        # Application logs
├── coverage/                    # Jest coverage reports
├── package.json                 # Dependencies & npm scripts
├── vercel.json                  # Vercel routing configuration
├── jest.config.cjs              # Jest testing configuration
└── [Documentation files]
```

### Key Statistics
- **Total Source Files**: 21+
- **Lines of Code**: 4,500+
- **Comment Coverage**: 100% (All functions fully documented)
- **Database Models**: 15
- **API Endpoints**: 18+
- **Services**: 5
- **Middleware Functions**: 3 major + utilities

---

## 2. Architecture Overview

### Layered Architecture Pattern
```
┌─────────────────────────────────────────────────────┐
│         HTTP ROUTES (Express)                       │
│  POST /api/auth/login, /api/students/profile, etc.  │
└────────────────┬────────────────────────────────────┘
                 │ Request → Response
┌─────────────────────────────────────────────────────┐
│         MIDDLEWARE STACK                            │
│  auth.js (JWT, RBAC, rate limiting)                 │
│  validation.js (input validation)                   │
│  errorHandler wrapper (try-catch)                   │
└────────────────┬────────────────────────────────────┘
                 │ Business Logic
┌─────────────────────────────────────────────────────┐
│         5 SERVICE CLASSES                           │
│  AuthService, StudentService, MatchingService      │
│  GoogleAuthService, NotificationService             │
│  (Encapsulate business logic, testable)            │
└────────────────┬────────────────────────────────────┘
                 │ Data Operations
┌─────────────────────────────────────────────────────┐
│         15 DATABASE MODELS (Sequelize)              │
│  User, Student, Company, Coordinator                │
│  OjtPosting, Application, Skill models              │
│  Matching, Audit, Notification models               │
└────────────────┬────────────────────────────────────┘
                 │ SQL Queries (parameterized)
┌─────────────────────────────────────────────────────┐
│         DATABASE (SQLite / PostgreSQL)              │
│  23 Tables with relationships & indexes             │
└─────────────────────────────────────────────────────┘
```

### Design Principles Applied
1. **KISS**: Keep It Simple and Stupid - max 2-3 nesting depth
2. **DRY**: Don't Repeat Yourself - reusable services
3. **SOLID**: Single Responsibility per class
4. **Early Return**: Fail fast, avoid deep nesting
5. **Service Injection**: Testable, decoupled services

---

## 3. API Endpoints Complete Map

### Authentication Routes (Public)
| Method | Endpoint | Service Method | Request Body | Response | Status | Notes |
|--------|----------|-----------------|--------------|----------|--------|-------|
| POST | `/api/auth/register` | AuthService.register() | {name, email, password, role} | {user, token} | 201 | Rate limited (5/min) |
| POST | `/api/auth/login` | AuthService.login() | {email, password} | {user, token} | 200 | Rate limited (5/min) |
| GET | `/api/auth/google/redirect` | [Passport] | ?role=student&linking=false | [Redirect to Google] | 302 | Initiates OAuth flow |
| GET | `/api/auth/google/callback` | GoogleAuthService.authenticateWithGoogle() | [Google code] | {user, token} or {requiresLinking: true} | 200 | OAuth callback |
| POST | `/api/auth/google/confirm-linking` | GoogleAuthService.confirmAccountLinking() | {userId, googleId} | {user, token} | 200 | Confirm account link |
| POST | `/api/auth/google/link` | GoogleAuthService.requestAccountLinking() | None (auth header) | {message, requiresConfirmation} | 200 | Add Google to existing account |

### Protected Routes - Student Profile (Requires JWT)
| Method | Endpoint | Service Method | Request | Status | Complexity | Notes |
|--------|----------|-----------------|---------|--------|------------|-------|
| GET | `/api/students/profile` | StudentService.getProfile(userId) | JWT header | 200 | Simple | Retrieve logged-in student's profile |
| PUT | `/api/students/profile` | StudentService.updateProfile() | {first_name, last_name, gpa, academic_program, availability_start/end, location, bio} | 200 | Medium | Recalculates profile completeness % |
| GET | `/api/students/skills` | StudentService.getSkills(userId) | JWT header | 200 | Simple | List all student skills |
| POST | `/api/students/skills` | StudentService.addSkill() | {skill_name, proficiency_level, years_of_experience} | 201 | Simple | Add skill to profile |
| PUT | `/api/students/skills/:id` | StudentService.updateSkill() | {proficiency_level, years_of_experience} | 200 | Simple | Update skill level |
| DELETE | `/api/students/skills/:id` | StudentService.deleteSkill() | None | 204 | Simple | Remove skill |

### Matching Routes (Requires JWT)
| Method | Endpoint | Service Method | Request | Status | Complexity | Notes |
|--------|----------|-----------------|---------|--------|------------|-------|
| GET | `/api/matches` | StudentService.getMatchedPostings() | ?minScore=60 | 200 | High (Algorithm) | Get recommended job postings |

**Matching Algorithm Used**:
- Skill Match (40%) - Required vs preferred skills
- Location Match (20%) - Geographic preference vs remote option
- Availability Match (20%) - Schedule alignment
- GPA Match (10%) - Academic performance requirement
- Academic Program Match (10%) - Field alignment

**Output**: Array sorted by overall_score (0-100), with detailed component breakdown

### Application Routes (Requires JWT)
| Method | Endpoint | Service Method | Request | Status | Complexity | Notes |
|--------|----------|-----------------|---------|--------|------------|-------|
| POST | `/api/applications` | StudentService.applyToPosting() | {posting_id, resume_id, cover_letter} | 201 | Medium | Submit job application |
| GET | `/api/applications` | StudentService.getApplications() | ?status=submitted&page=1&limit=10 | 200 | Medium | List student's applications |
| PUT | `/api/applications/:id` | StudentService.updateApplication() | {status} | 200 | Medium | Update application status |

**Application Status Flow**:
- submitted → under_review → shortlisted → hired (or rejected)
- Or: submitted → rejected with reason
- Or: submitted → withdrawn by student

### Notification Routes (Requires JWT)
| Method | Endpoint | Service Method | Request | Status | Complexity | Notes |
|--------|----------|-----------------|---------|--------|------------|-------|
| GET | `/api/notifications` | NotificationService.getNotifications() | ?page=1&limit=10 | 200 | Simple | Paginated notifications |
| PUT | `/api/notifications/:id/read` | NotificationService.markAsRead() | None | 200 | Simple | Mark single as read |
| PUT | `/api/notifications/read-all` | NotificationService.markAllAsRead() | None | 200 | Simple | Mark all as read |

### System Routes
| Method | Endpoint | Handler | Response | Notes |
|--------|----------|---------|----------|-------|
| GET | `/health` | [App health check] | {status: 'ok', timestamp, environment} | Used by load balancers |
| GET | `/api/version` | [Static] | {version: '2.0.0', name, environment} | API version info |

---

## 4. Services Analysis

### 4.1 AuthService
**Location**: `src/services/AuthService.js`  
**Purpose**: Authentication, registration, login, password reset  
**Dependencies**: User model, JWT, Bcrypt

#### Methods

##### 1. `register(data: { name, email, password, role })`
- **Signature**: `async register(data) → Promise<{user, token}>`
- **Purpose**: Create new user account with role-specific profile
- **Key Logic**:
  1. Check email not already registered (409 if exists)
  2. Validate role (student/company/coordinator)
  3. Create User with hashed password (bcrypt hook)
  4. Create role-specific profile (Student/Company/Coordinator)
  5. Generate JWT token
  6. Log audit trail
- **Complexity**: **MEDIUM**
- **Security**: 
  - Email uniqueness enforced at DB level
  - Password hashing via beforeCreate hook (10 rounds bcrypt)
  - Role validation prevents invalid roles
- **Errors**: 409 (email exists), 400 (invalid role)

##### 2. `login(email: string, password: string)`
- **Signature**: `async login(email, password) → Promise<{user, token}>`
- **Purpose**: Authenticate user with email/password
- **Key Logic**:
  1. Normalize email (lowercase, trim)
  2. Find user by email
  3. Check if account is LOCKED (security feature)
     - Locked after 5 failed attempts for 30 minutes
     - Auto-unlock after duration expires
  4. Compare password with hash using bcrypt
  5. Reset failedLoginAttempts on success
  6. Update last_login_at timestamp
  7. Generate JWT token
- **Complexity**: **MEDIUM**
- **Security**:
  - Generic error message (don't reveal if email exists)
  - Account lockout after 5 failed attempts
  - Failed attempts tracked in database
  - Lock duration: 30 minutes (configurable)
- **Errors**: 401 (invalid creds), 423 (account locked - HTTP Locked)

##### 3. `requestPasswordReset(email: string)`
- **Signature**: `async requestPasswordReset(email) → Promise<void>`
- **Purpose**: Generate password reset token
- **Key Logic**:
  1. Find user by email
  2. Delete existing reset tokens (prevent multiple)
  3. Create new PasswordResetToken with 1-hour expiration
  4. Generate JWT reset token
  5. Return token (frontend sends to user via email in production)
- **Complexity**: **MEDIUM**
- **Security**: Token expires in 1 hour, marked as used after use
- **Errors**: 404 (user not found)

##### 4. `resetPassword(token: string, newPassword: string)`
- **Signature**: `async resetPassword(token, newPassword) → Promise<{user, token}>`
- **Purpose**: Reset password with valid token
- **Key Logic**:
  1. Verify JWT token
  2. Find PasswordResetToken record
  3. Check not already used
  4. Check not expired
  5. Update user password (hash via hook)
  6. Mark token as used
  7. Generate new login token
- **Complexity**: **MEDIUM**
- **Security**: Token can only be used once, time-limited (1 hour)
- **Errors**: 401 (invalid/expired token), 400 (token already used)

---

### 4.2 StudentService
**Location**: `src/services/StudentService.js`  
**Purpose**: Student profile, skills, applications management  
**Dependencies**: Student, StudentSkill, Application, OjtPosting models

#### Methods

##### 1. `getProfile(userId: number)`
- **Signature**: `async getProfile(userId) → Promise<Student>`
- **Purpose**: Retrieve student's profile data
- **Complexity**: **SIMPLE**
- **Returns**: Student object with fields: {id, first_name, last_name, phone, bio, gpa, academic_program, year_of_study, profile_completeness_percentage, availability_start/end, ...}

##### 2. `updateProfile(userId: number, data: object)`
- **Signature**: `async updateProfile(userId, data) → Promise<Student>`
- **Purpose**: Update student profile and recalculate completeness
- **Key Logic**:
  1. Find student by user_id
  2. Whitelist allowed fields (prevent mass assignment)
  3. Update each provided field
  4. Call calculateProfileCompleteness()
  5. Save to database
  6. Audit log the change
- **Complexity**: **MEDIUM**
- **Allowed Fields**: first_name, last_name, phone, bio, current_location, preferred_location, profile_picture_url, availability_start/end, academic_program, year_of_study, gpa
- **Side Effect**: Profile completeness recalculated (0-100%)

##### 3. `addSkill(userId: number, skillData: {skill_name, proficiency_level, years_of_experience})`
- **Signature**: `async addSkill(userId, skillData) → Promise<StudentSkill>`
- **Purpose**: Add new skill to student profile
- **Complexity**: **SIMPLE**
- **Validation**:
  - skill_name: required, max 100 chars
  - proficiency_level: enum (beginner/intermediate/advanced/expert)
  - years_of_experience: 0-50

##### 4. `getSkills(userId: number)`
- **Signature**: `async getSkills(userId) → Promise<StudentSkill[]>`
- **Purpose**: Retrieve all skills for student
- **Ordering**: Sorted by proficiency_level DESC (advanced skills first)
- **Complexity**: **SIMPLE**

##### 5. `updateSkill(userId: number, skillId: number, data: object)`
- **Signature**: `async updateSkill(userId, skillId, data) → Promise<StudentSkill>`
- **Purpose**: Update existing skill
- **Complexity**: **SIMPLE**
- **Can Update**: proficiency_level, years_of_experience

##### 6. `deleteSkill(userId: number, skillId: number)`
- **Signature**: `async deleteSkill(userId, skillId) → Promise<boolean>`
- **Purpose**: Remove skill from student profile
- **Complexity**: **SIMPLE**
- **Error**: 404 if skill not found

##### 7. `applyToPosting(userId: number, postingId: number, data: {resume_id, cover_letter})`
- **Signature**: `async applyToPosting(userId, postingId, data) → Promise<Application>`
- **Purpose**: Submit job application
- **Key Logic**:
  1. Check student exists
  2. Check posting exists
  3. Check not already applied (unique constraint)
  4. Create Application record with status='submitted'
  5. Calculate match score
  6. Log audit trail
  7. Return application
- **Complexity**: **MEDIUM**
- **Errors**: 409 (already applied), 404 (posting not found)

##### 8. `getApplications(userId: number, filters: object)`
- **Signature**: `async getApplications(userId, {status?, page?, limit?}) → Promise<Application[]>`
- **Purpose**: Retrieve applications with pagination and filtering
- **Filters**: application_status (submitted/under_review/shortlisted/rejected/hired/withdrawn)
- **Pagination**: Default page=1, limit=10
- **Complexity**: **MEDIUM**

##### 9. `getMatchedPostings(userId: number, minScore: number)`
- **Signature**: `async getMatchedPostings(userId, minScore) → Promise<MatchScore[]>`
- **Purpose**: Get recommended job postings
- **Complexity**: **HIGH** (triggers matching algorithm)
- **Process**:
  1. Get student profile with skills
  2. Get all active postings with required skills
  3. Calculate match score for each (see MatchingService)
  4. Filter by minScore (default 60)
  5. Sort by overall_score DESC
  6. Return with component breakdown

---

### 4.3 MatchingService
**Location**: `src/services/MatchingService.js`  
**Purpose**: Core intelligent job matching algorithm  
**Key Feature**: 5-component weighted scoring system

#### Algorithm Overview

```
OVERALL SCORE = (SkillScore × 40%) + (LocationScore × 20%) 
              + (AvailabilityScore × 20%) + (GpaScore × 10%)
              + (AcademicProgramScore × 10%)

Result: 0-100 scale
```

#### Methods

##### 1. `calculateForStudent(studentId: number)`
- **Signature**: `async calculateForStudent(studentId) → Promise<MatchScore[]>`
- **Purpose**: Calculate match scores for all active postings
- **Complexity**: **VERY HIGH**
- **Process**:
  1. Get student with skills
  2. Get all active postings
  3. Loop through each posting and calculate score
  4. Sort by overall_score DESC
  5. Return sorted array
- **Time Complexity**: O(n*m*k) where n=students, m=postings, k=skills per posting

##### 2. `calculateScore(student: object, posting: object)`
- **Signature**: `async calculateScore(student, posting) → Promise<MatchScore>`
- **Purpose**: Calculate single student-posting match
- **Returns**:
  ```javascript
  {
    id, student_id, posting_id,
    overall_score: 0-100,
    skill_score: 0-100,
    location_score: 0-100,
    availability_score: 0-100,
    gpa_score: 0-100,
    academic_program_score: 0-100,
    match_status: 'highly_compatible'|'compatible'|'moderately_compatible'|'weak_match'|'not_compatible',
    calculated_at: Date,
    match_rank: integer
  }
  ```
- **Complexity**: **HIGH**

##### 3. `calculateSkillScore(student, posting, weights)`
- **Signature**: `async calculateSkillScore(student, posting, weights) → number (0-100)`
- **Purpose**: Skill compatibility (40% weight in overall)
- **Algorithm**:
  1. Get required skills (marked is_required=true)
  2. Get preferred skills (marked is_required=false)
  3. Match student skills against required (each weighted)
  4. Calculate required match %
  5. If admin prioritize_required_skills=true and not 100%, penalize by -30
  6. Match against preferred skills
  7. Combine: (required_score × 80%) + (preferred_score × 20%)
- **Complexity**: **MEDIUM**
- **Example**: 
  - Student has: Java (advanced), Python (intermediate), SQL (intermediate)
  - Posting requires: Java (required), Python (required)
  - Posting prefers: C++ (preferred)
  - Result: 100% required match + partial preferred = ~93 skill score

##### 4. `calculateLocationScore(student, posting)`
- **Signature**: `async calculateLocationScore(student, posting) → number (0-100)`
- **Purpose**: Location preference matching (20% weight)
- **Scoring Logic**:
  - **100**: Remote allowed OR exact location match
  - **80**: Student current location matches posting location
  - **75**: Nearby location (same country/region)
  - **50**: Different location but student willing to relocate
  - **40**: No preference specified
  - **0**: If no similarity
- **Complexity**: **SIMPLE**

##### 5. `calculateAvailabilityScore(student, posting)`
- **Signature**: `async calculateAvailabilityScore(student, posting) → number (0-100)`
- **Purpose**: Schedule alignment (20% weight)
- **Logic**:
  1. Get student's availability window (availability_start/end)
  2. Get posting's start_date and duration_weeks
  3. Calculate posting end date = start + duration
  4. Check overlap:
     - Perfect overlap: 100
     - Partial overlap: 50-90
     - No available dates: 50
     - No dates specified: 100
- **Complexity**: **MEDIUM**

##### 6. `calculateGpaScore(student, posting)`
- **Signature**: `async calculateGpaScore(student, posting) → number (0-100)`
- **Purpose**: Academic performance (10% weight)
- **Logic**:
  1. Check if posting has min_gpa requirement
  2. If no requirement: 100
  3. If student has GPA and meets requirement: 100
  4. If student GPA below requirement: calculate % difference
  5. Range: 0-100
- **Complexity**: **SIMPLE**

##### 7. `calculateAcademicProgramScore(student, posting)`
- **Signature**: `async calculateAcademicProgramScore(student, posting) → number (0-100)`
- **Purpose**: Field alignment (10% weight)
- **Logic**:
  1. Check if posting has academic_program requirement
  2. Exact match: 100
  3. Related fields (CS vs Computer Engineering): 80
  4. No requirement: 100
  5. Mismatch: 0-30
- **Complexity**: **SIMPLE**

##### 8. `getDefaultRules()`
- **Signature**: `getDefaultRules() → {skill_weight: 40, location_weight: 20, ...}`
- **Purpose**: Return default matching weights if none configured
- **Complexity**: **SIMPLE**

---

### 4.4 GoogleAuthService
**Location**: `src/services/GoogleAuthService.js`  
**Purpose**: Google OAuth 2.0 authentication and account linking  
**Dependencies**: User model, Passport, JWT

#### OAuth Flow Diagram
```
User → /api/auth/google/redirect?role=student
     ↓ (stores role in session)
     → Passport redirects to Google consent screen
     ↓ (user grants permissions)
     ← Google redirects to /api/auth/google/callback with code
     ↓
     → Check if google_id exists (existing user)
     → Check if email exists (linking scenario)
     → If new user: create account + generate token
     → If existing: return user + token
     → If email exists but different google_id: 
        require linking confirmation
```

#### Methods

##### 1. `authenticateWithGoogle(googleProfile: {id, email, name, picture})`
- **Signature**: `async authenticateWithGoogle(googleProfile) → Promise<{user, token} | {requiresLinking: true}>`
- **Purpose**: Main OAuth authentication handler (called by Passport callback)
- **Key Logic**:
  1. Check if google_id already linked (existing OAuth user)
     - Return user + token
  2. Check if email exists (account linking scenario)
     - Return {requiresLinking: true, ...} with details
  3. Create new user (first-time Google login)
     - Create User record with google_id
     - Create Student profile (default role)
     - Auto-verify email
     - Auto-activate account
     - Generate token
- **Complexity**: **MEDIUM**
- **Returns**: 
  - Success: {user: {...}, token: "..."}
  - Linking needed: {requiresLinking: true, existingUserId: 123, googleProfile: {...}}

##### 2. `_createGoogleUser(googleProfile)`
- **Signature**: `async _createGoogleUser(googleProfile) → Promise<User>`
- **Purpose**: Private method to create new user from Google profile
- **Complexity**: **SIMPLE**
- **Preconditions**: Email is not already registered
- **Side Effects**: Creates User + Student profile

##### 3. `requestAccountLinking(userId: number, googleProfile: object)`
- **Signature**: `async requestAccountLinking(userId, googleProfile) → Promise<{message, requiresConfirmation, userId}>`
- **Purpose**: Request to link Google OAuth to existing account
- **Security Checks**:
  1. User exists
  2. Email matches (existing user email = Google email)
  3. User has password (can unlink later if needed)
- **Complexity**: **SIMPLE**
- **Errors**: 404 (user not found), 400 (email mismatch or no password)

##### 4. `confirmAccountLinking(userId: number, googleId: string, email: string)`
- **Signature**: `async confirmAccountLinking(userId, googleId, email) → Promise<{user, token}>`
- **Purpose**: Confirm and execute account linking
- **Key Logic**:
  1. Find user by ID
  2. Verify email matches
  3. Update user.google_id = googleId
  4. Update user.google_linked_at = now
  5. Generate token
- **Complexity**: **SIMPLE**
- **Errors**: 404 (user not found), 400 (email mismatch)

##### 5. `unlinkGoogleAccount(userId: number, password: string)`
- **Signature**: `async unlinkGoogleAccount(userId, password) → Promise<{message}>`
- **Purpose**: Disconnect Google OAuth from account (keep password auth)
- **Security**: Verify password before unlinking
- **Complexity**: **SIMPLE**
- **Errors**: 401 (wrong password), 400 (no password to fall back to)

##### 6. `_formatUser(user: User)`
- **Signature**: `_formatUser(user) → {id, name, email, role, status, auth_provider}`
- **Purpose**: Private method to format user response (exclude sensitive fields)
- **Complexity**: **SIMPLE**

---

### 4.5 NotificationService & AuditService
**Location**: `src/services/NotificationService.js`  
**Purpose**: In-app notifications and audit trail logging  
**Dependencies**: Notification, AuditLog models

#### NotificationService Methods

##### 1. `notify(userId: number, data: {title, message, type, entityType, entityId, priority?, actionUrl?})`
- **Signature**: `async notify(userId, data) → Promise<Notification>`
- **Purpose**: Create and send notification to user
- **Notification Types**: 
  - 'application_submitted', 'application_reviewed', 'application_accepted', 'application_rejected'
  - 'new_match', 'profile_viewed', 'message_received'
  - 'account_update', 'system_alert', 'reminder'
- **Complexity**: **SIMPLE**
- **Returns**: Created Notification object with id, is_read=false, created_at

##### 2. `getUnreadNotifications(userId: number, limit: number = 10)`
- **Signature**: `async getUnreadNotifications(userId, limit) → Promise<Notification[]>`
- **Purpose**: Get unread notifications for user
- **Ordering**: By priority DESC, then createdAt DESC
- **Complexity**: **SIMPLE**

##### 3. `getNotifications(userId: number, page: number = 1, limit: number = 10)`
- **Signature**: `async getNotifications(userId, page, limit) → Promise<{data, pagination}>`
- **Purpose**: Get all notifications with pagination
- **Returns**:
  ```javascript
  {
    data: [Notification[], ...],
    pagination: {
      total: 45,
      page: 1,
      limit: 10,
      totalPages: 5
    }
  }
  ```
- **Complexity**: **SIMPLE**

##### 4. `markAsRead(notificationId: number)`
- **Signature**: `async markAsRead(notificationId) → Promise<Notification>`
- **Purpose**: Mark single notification as read
- **Updates**: is_read=true, read_at=now
- **Complexity**: **SIMPLE**

##### 5. `markAllAsRead(userId: number)`
- **Signature**: `async markAllAsRead(userId) → Promise<{affected: number}>`
- **Purpose**: Mark all notifications as read for user
- **Complexity**: **SIMPLE**

##### 6. `deleteNotification(notificationId: number)`
- **Signature**: `async deleteNotification(notificationId) → Promise<number>`
- **Purpose**: Delete notification permanently
- **Returns**: Number of deleted records
- **Complexity**: **SIMPLE**

#### AuditService Methods

##### 1. `log(data: {userId, action, entityType, entityId, newValues?, oldValues?, ipAddress, userAgent, severity})`
- **Signature**: `async log(data) → Promise<AuditLog>`
- **Purpose**: Log sensitive operation for audit trail
- **Severity Levels**: 'low', 'medium', 'high', 'critical'
- **Actions**: 'create', 'update', 'delete', 'login', 'logout', 'view'
- **Complexity**: **SIMPLE**
- **Used For**: Registration, login, data changes, admin actions

##### 2. `logLogin(userId: number, ipAddress: string, userAgent: string)`
- **Signature**: `async logLogin(userId, ipAddress, userAgent) → Promise<AuditLog>`
- **Purpose**: Log successful login
- **Complexity**: **SIMPLE**

##### 3. `logDataChange(userId: number, entityType: string, entityId: number, oldValues, newValues, reason)`
- **Signature**: `async logDataChange(userId, entityType, entityId, oldValues, newValues, reason) → Promise<AuditLog>`
- **Purpose**: Log data modification with before/after values
- **Complexity**: **SIMPLE**

---

## 5. Database Models (15 Total)

### Model Relationship Diagram
```
┌─────────────────────────────────────────────────────┐
│                      USER (15 fields)               │
│  id, name, email, password, role, status,          │
│  google_id, auth_provider, failedLoginAttempts...  │
└──────────────────┬┬────────────────────────────────┘
         ┌─────────┘└─────────┐
         │                    │
    ┌────▼─────┐        ┌────▼──────────┐
    │  STUDENT  │        │   COMPANY     │
    │  (14 fld) │        │   (15 fields) │
    └────┬─────┘        └────┬──────────┘
         │                   │
    ┌────▼──────┐       ┌────▼─────────────┐
    │STUDENTSKILL│       │  OJTPOSTING     │
    │  (7 fld)   │       │  (18 fields)    │
    └────────────┘       └────┬────────────┘
                              │
          ┌───────────────────┼──────────────┐
          │                   │              │
      ┌───▼─────────┐    ┌────▼───┐   ┌────▼──────────┐
      │POSTINGSKILL │    │ APPLIC. │   │  MATCHSCORE   │
      │  (7 fields) │    │(14 fld) │   │  (13 fields)  │
      └─────────────┘    └────┬────┘   └───────────────┘
                              │
                         ┌────▼────────┐
                         │   RESUME    │
                         │ (9 fields)  │
                         └─────────────┘

┌──────────────────────────────────────────────────────┐
│  COORDINATOR (7 fields)  - Academic supervisors     │
└──────────────────────────────────────────────────────┘

┌──────────────────────────────────────────────────────────┐
│  OJTPROGRESS (9 fields)  - Tracks student OJT status    │
└──────────────────────────────────────────────────────────┘

┌──────────────────────────────────────────────────────────┐
│  MATCHINGRULE (7 fields) - Configurable algorithm weights│
└──────────────────────────────────────────────────────────┘

┌──────────────────────────────────────────────────────────┐
│  Communication Models:                                   │
│  - AUDITLOG (12 fields) - Audit trail                   │
│  - NOTIFICATION (10 fields) - In-app notifications      │
│  - MESSAGE (7 fields) - User-to-user messages           │
└──────────────────────────────────────────────────────────┘

┌──────────────────────────────────────────────────────────┐
│  PASSWORDRESETTOKEN (6 fields) - Password reset flow    │
└──────────────────────────────────────────────────────────┘
```

### Complete Model Specifications

#### 1. USER Model (15 fields + timestamps)
**Purpose**: Base table for all user roles  
**Table**: users (singular in Sequelize)

| Field | Type | Constraints | Purpose | Example |
|-------|------|-------------|---------|---------|
| id | INTEGER | PK, Auto | Unique identifier | 1 |
| name | STRING(255) | NOT NULL | Full name | "Juan Dela Cruz" |
| email | STRING(255) | UNIQUE, NOT NULL | Login email | "juan@example.com" |
| password | STRING(255) | NULL | Bcrypt hash (null for OAuth) | "$2b$10$..." |
| role | ENUM | 'student'\|'company'\|'coordinator'\|'admin' | User type | "student" |
| status | ENUM | 'active'\|'pending'\|'suspended'\|'inactive' | Account state | "active" |
| email_verified_at | DATE | NULL | Email verification timestamp | 2026-04-15 |
| last_login_at | DATE | NULL | Last successful login | 2026-04-15 10:30:00 |
| failedLoginAttempts | INTEGER | Default 0 | Brute-force counter | 3 |
| lockedUntil | DATE | NULL | Account lock expiration | 2026-04-15 10:45:00 |
| google_id | STRING(255) | UNIQUE, NULL | Google OAuth ID | "123456789" |
| auth_provider | ENUM | 'email'\|'google' | Auth method used | "email" |
| google_linked_at | DATE | NULL | Google account link time | 2026-04-15 |
| createdAt | DATE | Auto | Record creation | 2026-04-15 |
| updatedAt | DATE | Auto | Last update | 2026-04-15 |

**Indexes**:
- `email` (UNIQUE) - Fast login lookup
- `google_id` (UNIQUE) - Fast OAuth lookup
- `role` - Filter by role
- `status` - Find active users

**Instance Methods**:
- `comparePassword(plaintext)` - Verify password during login
- `generateToken()` - Create JWT for authentication
- `findByEmail(email)` - Query helper
- `findByGoogleId(googleId)` - Query helper

---

#### 2. STUDENT Model (14 fields)
**Purpose**: Student-specific profile data  
**Relationship**: belongsTo User (1:1), hasMany StudentSkill (1:N), hasMany Application (1:N)

| Field | Type | Constraints | Purpose | Example |
|-------|------|-------------|---------|---------|
| id | INTEGER | PK, Auto | Student profile ID | 1 |
| user_id | INTEGER | FK, NOT NULL | Reference to User | 1 |
| first_name | STRING(100) | NULL | First name | "Juan" |
| last_name | STRING(100) | NULL | Last name | "Dela Cruz" |
| phone | STRING(20) | NULL | Contact number | "+639123456789" |
| bio | TEXT | NULL | About student | "Passionate developer..." |
| current_location | STRING(255) | NULL | Current city | "Manila, Philippines" |
| preferred_location | STRING(255) | NULL | OJT location preference | "Makati, Philippines" |
| profile_picture_url | STRING(500) | NULL | Photo URL | "https://..." |
| availability_start | DATE | NULL | When available for OJT | 2026-06-01 |
| availability_end | DATE | NULL | When must finish OJT | 2026-08-31 |
| profile_completeness_percentage | INTEGER | 0-100 | Profile fill % | 65 |
| gpa | DECIMAL(3,2) | 0-4.0 | Grade point average | 3.75 |
| academic_program | STRING(255) | NULL | Degree program | "Computer Science" |
| year_of_study | ENUM | '1st'\|'2nd'\|'3rd'\|'4th'\|'graduate' | Academic year | "2nd" |

**Indexes**: user_id, preferred_location  
**Instance Methods**:
- `calculateProfileCompleteness()` - Update completeness % based on filled fields
- Relations: User, StudentSkill[], Application[], Resume[], MatchScore[]

---

#### 3. COMPANY Model (15 fields)
**Purpose**: Company profile for job posting  
**Relationship**: belongsTo User (1:1), hasMany OjtPosting (1:N)

| Field | Type | Constraints | Purpose | Example |
|-------|------|-------------|---------|---------|
| id | INTEGER | PK, Auto | Company ID | 1 |
| user_id | INTEGER | FK, NOT NULL | Reference to User | 2 |
| company_name | STRING(255) | NULL | Official company name | "Acme Corporation" |
| industry_type | STRING(100) | NULL | Industry sector | "Technology" |
| company_size | ENUM | '1-50'\|'51-200'\|'201-500'\|'500+' | Employee count | "51-200" |
| company_website | STRING(500) | NULL | Website URL | "https://acme.com" |
| phone | STRING(20) | NULL | Company phone | "+632-7123-4567" |
| address | STRING(500) | NULL | Headquarters address | "123 Main St" |
| city | STRING(100) | NULL | City | "Manila" |
| country | STRING(100) | NULL | Country | "Philippines" |
| description | TEXT | NULL | Company about | "Leading tech solutions..." |
| logo_url | STRING(500) | NULL | Logo image URL | "https://..." |
| accreditation_status | ENUM | 'pending'\|'approved'\|'rejected'\|'suspended' | Verification | "approved" |
| accreditation_verified_at | DATE | NULL | When accredited | 2026-01-15 |
| average_rating | DECIMAL(3,2) | 0-5 | Student ratings avg | 4.5 |
| total_ratings | INTEGER | ≥0 | Number of ratings | 12 |

**Indexes**: user_id, accreditation_status  
**Relations**: User, OjtPosting[]

---

#### 4. COORDINATOR Model (7 fields)
**Purpose**: Academic supervisors monitoring OJT  
**Relationship**: belongsTo User (1:1), hasMany OjtProgress (1:N)

| Field | Type | Constraints | Purpose | Example |
|-------|------|-------------|---------|---------|
| id | INTEGER | PK, Auto | Coordinator ID | 1 |
| user_id | INTEGER | FK, NOT NULL | Reference to User | 3 |
| department | STRING(100) | NULL | Academic department | "Computer Science" |
| designation | STRING(100) | NULL | Job title | "OJT Coordinator" |
| office_location | STRING(255) | NULL | Office location | "Room 301, Engineering" |
| phone_extension | STRING(10) | NULL | Office phone ext | "1234" |
| students_assigned | INTEGER | ≥0 | Current assignments | 25 |
| max_students | INTEGER | ≥1 | Max can supervise | 50 |

**Indexes**: user_id, department  
**Instance Methods**: getAssignedStudents()

---

#### 5. OJTPOSTING Model (18 fields)
**Purpose**: Job posting for OJT positions  
**Relationship**: belongsTo Company (N:1), hasMany PostingSkill (1:N), hasMany Application (1:N), hasMany MatchScore (1:N)

| Field | Type | Constraints | Purpose | Example |
|-------|------|-------------|---------|---------|
| id | INTEGER | PK, Auto | Posting ID | 1 |
| company_id | INTEGER | FK, NOT NULL | Hiring company | 1 |
| title | STRING(255) | NOT NULL | Job title | "Junior Developer" |
| description | TEXT | NOT NULL | Full job description | "Develop web applications..." |
| location | STRING(255) | NOT NULL | Work location | "Makati, Metro Manila" |
| allow_remote | BOOLEAN | Default false | Remote work allowed? | false |
| duration_weeks | INTEGER | 1-52 | OJT length in weeks | 12 |
| start_date | DATE | NULL | Preferred start | 2026-06-01 |
| salary_range_min | DECIMAL(12,2) | ≥0 | Minimum salary | 15000.00 |
| salary_range_max | DECIMAL(12,2) | ≥0 | Maximum salary | 25000.00 |
| stipend | BOOLEAN | Default false | Paid/unpaid? | true |
| min_gpa | DECIMAL(3,2) | 0-4.0 | GPA requirement | 2.5 |
| academic_program | STRING(255) | NULL | Required program | "Computer Science" |
| min_year_of_study | ENUM | '1st'\|'2nd'\|'3rd'\|'4th'\|'graduate'\|'any' | Year requirement | "2nd" |
| posting_status | ENUM | 'active'\|'closed'\|'draft'\|'archived' | Current state | "active" |
| positions_available | INTEGER | ≥1 | Openings count | 3 |
| positions_filled | INTEGER | ≥0 | Filled count | 1 |
| created_by_user_id | INTEGER | FK | Company HR person | 1 |
| createdAt | DATE | Auto | Posted date | 2026-04-01 |

**Indexes**: company_id, posting_status, start_date, location  
**Relations**: Company, PostingSkill[], Application[], MatchScore[]

---

#### 6. STUDENTSKILL Model (7 fields)
**Purpose**: Student's individual skills with proficiency  
**Relationship**: belongsTo Student (N:1)

| Field | Type | Constraints | Purpose | Example |
|-------|------|-------------|---------|---------|
| id | INTEGER | PK, Auto | Skill record ID | 1 |
| student_id | INTEGER | FK, NOT NULL | Student owner | 1 |
| skill_name | STRING(100) | NOT NULL | Skill name | "Java" |
| proficiency_level | ENUM | 'beginner'\|'intermediate'\|'advanced'\|'expert' | Level | "advanced" |
| years_of_experience | DECIMAL(3,1) | 0-50 | Years exp | 2.5 |
| endorsed_count | INTEGER | ≥0 | Endorsements | 3 |
| createdAt | DATE | Auto | Added date | 2026-04-01 |

**Indexes**: student_id, skill_name, proficiency_level  
**Instance Methods**:
- `updateProficiency(newLevel)` - Update skill level
- `addEndorsement()` - Increment endorsement count

---

#### 7. POSTINGSKILL Model (7 fields)
**Purpose**: Skills required/preferred for a job posting  
**Relationship**: belongsTo OjtPosting (N:1)

| Field | Type | Constraints | Purpose | Example |
|-------|------|-------------|---------|---------|
| id | INTEGER | PK, Auto | Requirement ID | 1 |
| posting_id | INTEGER | FK, NOT NULL | Job posting | 1 |
| skill_name | STRING(100) | NOT NULL | Skill name | "Java" |
| is_required | BOOLEAN | NOT NULL | Required vs preferred? | true |
| min_proficiency_level | ENUM | 'beginner'\|...\|'expert' | Min level | "intermediate" |
| weight | DECIMAL(3,2) | 0-2 | Importance weight | 1.5 |
| description | TEXT | NULL | Why needed | "Core technology" |

**Indexes**: posting_id, skill_name  
**Purpose**: Matching algorithm uses these to calculate skill score

---

#### 8. APPLICATION Model (14 fields)
**Purpose**: Student applications to job postings  
**Relationship**: belongsTo Student (N:1), belongsTo OjtPosting (N:1), belongsTo Resume (N:1)  
**Constraint**: Unique(student_id, posting_id) - prevent duplicate applications

| Field | Type | Constraints | Purpose | Example |
|-------|------|-------------|---------|---------|
| id | INTEGER | PK, Auto | Application ID | 1 |
| student_id | INTEGER | FK, NOT NULL | Applying student | 1 |
| posting_id | INTEGER | FK, NOT NULL | Job posting | 1 |
| resume_id | INTEGER | FK, NULL | Submitted resume | 1 |
| application_status | ENUM | 'submitted'\|'under_review'\|'shortlisted'\|'rejected'\|'hired'\|'withdrawn' | State | "submitted" |
| cover_letter | TEXT | NULL | Application message | "I'm interested because..." |
| match_score | DECIMAL(5,2) | 0-100 | Matching algorithm score | 85.50 |
| company_feedback | TEXT | NULL | Feedback from company | "Great fit!" |
| rejection_reason | STRING(255) | NULL | Why rejected | "Over-qualified" |
| applied_at | DATE | NOT NULL | Application timestamp | 2026-04-15 10:00:00 |
| reviewed_at | DATE | NULL | When reviewed by company | 2026-04-16 14:30:00 |
| interviewed_at | DATE | NULL | Interview date | 2026-04-17 09:00:00 |
| hired_at | DATE | NULL | Hire date | 2026-04-18 16:00:00 |
| notes | TEXT | NULL | Internal notes | "Follow up later" |

**Indexes**: student_id, posting_id, application_status, applied_at, UNIQUE(student_id, posting_id)  
**Instance Methods**:
- `updateStatus(newStatus, reason)` - Change app status
- `scheduleInterview(date)` - Set interview time
- `withdraw()` - Student withdraws application

---

#### 9. RESUME Model (9 fields)
**Purpose**: Student resumes  
**Relationship**: belongsTo Student (N:1), hasMany Application (1:N)

| Field | Type | Constraints | Purpose | Example |
|-------|------|-------------|---------|---------|
| id | INTEGER | PK, Auto | Resume ID | 1 |
| student_id | INTEGER | FK, NOT NULL | Student owner | 1 |
| file_name | STRING(255) | NOT NULL | Filename | "JuanDelaCruz_CV.pdf" |
| file_url | STRING(500) | NOT NULL | S3/CDN URL | "https://cdn.com/..." |
| file_size_kb | INTEGER | ≥0 | File size | 245 |
| is_current | BOOLEAN | Default true | Active resume? | true |
| upload_date | DATE | Auto | Upload timestamp | 2026-04-01 |
| file_type | STRING(10) | 'pdf'\|'docx' | Format | "pdf" |
| createdAt | DATE | Auto | Record creation | 2026-04-01 |

**Purpose**: Students can have multiple resumes, choose which to submit with application

---

#### 10. MATCHSCORE Model (13 fields)
**Purpose**: Cached match score between student and posting  
**Relationship**: belongsTo Student (N:1), belongsTo OjtPosting (N:1)  
**Index**: Unique(student_id, posting_id)

| Field | Type | Constraints | Purpose | Example |
|-------|------|-------------|---------|---------|
| id | INTEGER | PK, Auto | Score ID | 1 |
| student_id | INTEGER | FK, NOT NULL | Student | 1 |
| posting_id | INTEGER | FK, NOT NULL | Job posting | 1 |
| overall_score | DECIMAL(5,2) | 0-100 | Final score | 82.35 |
| skill_score | DECIMAL(5,2) | 0-100 | Skill component | 90 |
| location_score | DECIMAL(5,2) | 0-100 | Location component | 80 |
| availability_score | DECIMAL(5,2) | 0-100 | Availability component | 75 |
| gpa_score | DECIMAL(5,2) | 0-100 | GPA component | 85 |
| academic_program_score | DECIMAL(5,2) | 0-100 | Program component | 100 |
| match_status | ENUM | 'highly_compatible'\|'compatible'\|'moderately_compatible'\|'weak_match'\|'not_compatible' | Category | "compatible" |
| calculated_at | DATE | Auto | When calculated | 2026-04-15 |
| match_rank | INTEGER | NULL | Rank for student | 1 |
| recommendation_reason | TEXT | NULL | Why recommended | "Skills align well" |

**Indexes**: student_id, posting_id, overall_score, UNIQUE(student_id, posting_id)  
**Instance Methods**: getMatchStatusDescription()

---

#### 11. MATCHINGRULE Model (7 fields)
**Purpose**: Configurable algorithm weights (admin only)

| Field | Type | Constraints | Purpose | Example |
|-------|------|-------------|---------|---------|
| id | INTEGER | PK, Auto | Rule ID | 1 |
| version | INTEGER | NOT NULL | Rule version | 1 |
| skill_weight | DECIMAL(5,2) | 0-100 | Skill importance | 40 |
| location_weight | DECIMAL(5,2) | 0-100 | Location importance | 20 |
| availability_weight | DECIMAL(5,2) | 0-100 | Availability importance | 20 |
| gpa_weight | DECIMAL(5,2) | 0-100 | GPA importance | 10 |
| academic_program_weight | DECIMAL(5,2) | 0-100 | Program importance | 10 |

**Purpose**: Allow institution to configure matching algorithm (currently hardcoded)

---

#### 12. OJTPROGRESS Model (9 fields)
**Purpose**: Track student progress during OJT  
**Relationship**: belongsTo Student (N:1), belongsTo Application (1:1), belongsTo Coordinator (N:1)

| Field | Type | Constraints | Purpose | Example |
|-------|------|-------------|---------|---------|
| id | INTEGER | PK, Auto | Progress ID | 1 |
| student_id | INTEGER | FK, NOT NULL | Student | 1 |
| application_id | INTEGER | FK, NOT NULL | Hired application | 1 |
| coordinator_id | INTEGER | FK, NULL | Assigned supervisor | 1 |
| status | ENUM | 'not_started'\|'in_progress'\|'completed'\|'abandoned' | OJT state | "in_progress" |
| start_date | DATE | NULL | OJT start | 2026-06-01 |
| end_date | DATE | NULL | OJT end | 2026-08-31 |
| midterm_evaluation | DECIMAL(5,2) | 0-100 | Midterm score | 85.50 |
| final_evaluation | DECIMAL(5,2) | 0-100 | Final score | 88.00 |
| notes | TEXT | NULL | Supervisor notes | "Excellent progress" |

---

#### 13. AUDITLOG Model (12 fields)
**Purpose**: Complete audit trail for compliance  
**Relationship**: belongsTo User (N:1)

| Field | Type | Constraints | Purpose | Example |
|-------|------|-------------|---------|---------|
| id | INTEGER | PK, Auto | Log ID | 1 |
| user_id | INTEGER | FK, NULL | Actor (null=system) | 1 |
| user_role | STRING(50) | NULL | Actor role | "student" |
| entity_type | STRING(100) | NOT NULL | Table affected | "User" |
| entity_id | INTEGER | NOT NULL | Record ID changed | 1 |
| action | ENUM | 'create'\|'update'\|'delete'\|'login'\|'logout'\|'view' | Operation type | "create" |
| old_values | JSON | NULL | Before values | {"email": "old@..."} |
| new_values | JSON | NULL | After values | {"email": "new@..."} |
| ip_address | STRING(50) | NULL | Request IP | "203.0.113.42" |
| user_agent | TEXT | NULL | Browser info | "Mozilla/5.0..." |
| reason | TEXT | NULL | Why action taken | "User requested" |
| severity | ENUM | 'low'\|'medium'\|'high'\|'critical' | Importance | "high" |
| status | ENUM | 'success'\|'failed'\|'pending' | Result | "success" |
| error_message | TEXT | NULL | Error if failed | NULL |

**Indexes**: user_id, entity_type, entity_id, action, severity, (user_id, action, entity_type)  
**Purpose**: Complete audit trail for regulatory compliance

---

#### 14. NOTIFICATION Model (10 fields)
**Purpose**: In-app notifications  
**Relationship**: belongsTo User (N:1)

| Field | Type | Constraints | Purpose | Example |
|-------|------|-------------|---------|---------|
| id | INTEGER | PK, Auto | Notification ID | 1 |
| user_id | INTEGER | FK, NOT NULL | Recipient | 1 |
| title | STRING(200) | NOT NULL | Heading | "New Job Match!" |
| message | TEXT | NOT NULL | Full message | "A new job posting matched your profile" |
| notification_type | ENUM | 10 types* | Category | "new_match" |
| entity_type | STRING(100) | NULL | Related entity | "OjtPosting" |
| entity_id | INTEGER | NULL | Related entity ID | 5 |
| priority | ENUM | 'low'\|'normal'\|'high' | Urgency | "normal" |
| action_url | STRING(500) | NULL | Link to action | "/postings/5" |
| is_read | BOOLEAN | Default false | Viewed? | false |
| read_at | DATE | NULL | When read | 2026-04-15 10:30:00 |

*notification_type options: application_submitted, application_reviewed, application_accepted, application_rejected, new_match, profile_viewed, message_received, account_update, system_alert, reminder

**Indexes**: user_id, is_read, priority, createdAt

---

#### 15. MESSAGE Model (7 fields)
**Purpose**: Direct user-to-user messaging  
**Relationship**: belongsTo User as sender (N:1), belongsTo User as recipient (N:1)

| Field | Type | Constraints | Purpose | Example |
|-------|------|-------------|---------|---------|
| id | INTEGER | PK, Auto | Message ID | 1 |
| sender_id | INTEGER | FK, NOT NULL | Message sender | 1 |
| recipient_id | INTEGER | FK, NOT NULL | Message receiver | 2 |
| subject | STRING(255) | NOT NULL | Message title | "Resume Feedback" |
| body | TEXT | NOT NULL | Message content | "Your resume looks great..." |
| is_read | BOOLEAN | Default false | Read? | false |
| created_at | DATE | Auto | Sent timestamp | 2026-04-15 09:00:00 |
| read_at | DATE | NULL | When read | 2026-04-15 10:00:00 |

**Indexes**: sender_id, recipient_id, is_read

---

#### 16. PASSWORDRESETTOKEN Model (6 fields - UUID based)
**Purpose**: Secure password reset token management

| Field | Type | Constraints | Purpose | Example |
|-------|------|-------------|---------|---------|
| id | UUID | PK | Token ID | "550e8400-..." |
| userId | UUID | FK, NOT NULL | User requesting reset | "6ba7b810-..." |
| token | STRING(512) | UNIQUE, NOT NULL | JWT reset token | "eyJhbGc..." |
| used | BOOLEAN | Default false | Already used? | false |
| usedAt | DATE | NULL | When used | 2026-04-15 10:30:00 |
| expiresAt | DATE | NOT NULL | Expiration (1 hour) | 2026-04-15 11:00:00 |

**Instance Methods**:
- `isValid()` - Check if token still valid
- `markAsUsed()` - Mark used to prevent reuse

**Indexes**: userId, token (UNIQUE), expiresAt, (used, expiresAt)

---

### Model Relationships Summary
```
USER (1) ──────→ (1) STUDENT ──────→ (N) STUDENTSKILL
        ├────→ (1) COMPANY ──────→ (N) OJTPOSTING ──→ (N) APPLICATION ──→ (1) RESUME
        ├────→ (1) COORDINATOR
        └────→ (N) AUDITLOG

OJTPOSTING ──→ (N) POSTINGSKILL
            ──→ (N) MATCHSCORE ←── STUDENT

APPLICATION ──→ (1) OJTPROGRESS ←── COORDINATOR

USER ──────→ (N) NOTIFICATION
    ├────→ (N) MESSAGE (as sender)
    └────→ (N) MESSAGE (as recipient)
```

---

## 6. Middleware System

### 6.1 Authentication Middleware

**File**: `src/middleware/auth.js`

#### 1. `authMiddleware` - JWT Verification
```javascript
authMiddleware(req, res, next)
```

**Purpose**: Verify JWT token from Authorization header  
**Execution Order**: Before all protected routes

**Process**:
1. Extract Authorization header
2. Check format: "Bearer eyJhbGc..."
3. Extract token (remove "Bearer " prefix)
4. Verify JWT signature and expiration using config.auth.secret
5. If valid: attach user data to `req.user`
6. If expired: return 401 with "Token has expired"
7. If invalid: return 401 with "Invalid token"
8. Call next() to continue

**Request Header**:
```
Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpZCI6MSwibmFtZSI6I...
```

**req.user object** (if valid):
```javascript
{
  id: 1,
  email: "student@example.com",
  role: "student",
  iat: 1718448000,           // Issued at
  exp: 1719052800            // Expires at
}
```

**Errors**:
- 401: Missing Authorization header
- 401: Invalid Bearer format
- 401: Invalid/tampered token
- 401: Token expired

---

#### 2. `rbacMiddleware` - Role-Based Access Control
```javascript
rbacMiddleware(allowedRoles = [])(req, res, next)
```

**Purpose**: Restrict routes to specific user roles  
**Must Run After**: authMiddleware (requires req.user)

**Usage**:
```javascript
app.post('/api/admin/users', 
  authMiddleware,
  rbacMiddleware(['admin']),  // Only admins
  handler
);

app.get('/api/reports',
  authMiddleware,
  rbacMiddleware(['admin', 'coordinator']),  // Admins or coordinators
  handler
);

app.get('/api/notifications',
  authMiddleware,
  rbacMiddleware(),  // Any authenticated user
  handler
);
```

**Check Logic**:
1. Verify req.user exists (authMiddleware ran first)
2. If allowedRoles is empty: allow all authenticated users
3. If allowedRoles provided: check if req.user.role in list
4. If allowed: call next()
5. If denied: return 403 with permission error

**Error**: 403 Forbidden - User role not in allowed list

---

#### 3. `createRateLimiters()` - Rate Limiting
```javascript
const limiters = createRateLimiters()
limiters.auth.middleware()  // Use in route
```

**Purpose**: Prevent brute-force attacks

**Rate Limiting Tiers**:
1. **Auth endpoints** (login/register): 5 requests per 15 minutes
2. **General API**: 100 requests per 15 minutes
3. **Strict endpoints**: As configured

**Configuration** (from `env.js`):
```javascript
rateLimit: {
  windowMs: 900000,        // 15 minutes
  maxRequests: 100,        // 100 requests
}
```

**Usage**:
```javascript
app.post('/api/auth/login',
  limiters.auth.middleware(),  // Apply rate limit
  authHandler
);
```

**Errors**: 429 Too Many Requests - Rate limit exceeded

---

### 6.2 Validation Middleware

**File**: `src/middleware/validation.js`

#### Input Validation Rules

**Using**: `express-validator` library

##### 1. Authentication Validation
```javascript
authValidationRules()
```

**Fields Validated**:
- **email**:
  - Must be valid email format
  - Normalized (trimmed, lowercased)
  - Example: "Juan@Example.COM" → "juan@example.com"

- **password**:
  - Minimum 8 characters
  - At least 1 uppercase letter (A-Z)
  - At least 1 number (0-9)
  - At least 1 special character (!@#$%^&*)
  - Example VALID: "MyPass123!"
  - Example INVALID: "password" (no upper, no number, no special)

- **password_confirmation**:
  - Must match password field exactly

- **name**:
  - 2-255 characters
  - Only letters, spaces, hyphens, apostrophes
  - Example: "Juan O'Dela-Cruz" ✓
  - Example: "Juan123" ✗

##### 2. Student Update Validation
```javascript
studentUpdateRules()
```

**Fields Validated**:
- **first_name**: 1-100 chars
- **last_name**: 1-100 chars
- **phone**: Valid mobile number format
- **bio**: Max 1000 chars
- **preferred_location**: Max 255 chars (location text)
- **profile_picture_url**: Valid HTTPS URL
- **availability_start/end**: ISO 8601 date format

##### 3. Job Posting Validation
```javascript
jobPostingRules()
```

**Fields Validated**:
- **title**: 3-255 chars, required
- **description**: 20-5000 chars, required
- **location**: Max 255 chars, required
- **salary_range_min/max**: Non-negative integers
- **duration_weeks**: 1-52 weeks
- **posting_status**: 'active' | 'closed' | 'draft'

##### 4. Skill Validation
```javascript
skillValidationRules()
```

**Fields Validated**:
- **skill_name**: 1-100 chars, required
- **proficiency_level**: 'beginner'|'intermediate'|'advanced'|'expert'
- **years_of_experience**: 0-50 years

---

#### Error Handling
```javascript
handleValidationErrors(req, res, next)
```

**Execution**: Applied to all routes using validation rules

**Error Response** (422 Unprocessable Entity):
```javascript
{
  message: "Validation failed",
  statusCode: 422,
  errors: {
    email: ["Email must be valid"],
    password: [
      "Password must contain at least one uppercase letter",
      "Password must contain at least one special character"
    ]
  }
}
```

---

### 6.3 Error Handling Middleware

**File**: `src/utils/errorHandler.js`

#### 1. `wrap()` - Async Error Wrapper
```javascript
wrap(async (req, res) => { ... })
```

**Purpose**: Automatically catch Promise rejections  
**Usage**: Wrap every async route handler

**Before** (without wrap):
```javascript
app.get('/api/students/profile', async (req, res) => {
  try {
    const profile = await studentService.getProfile(req.user.id);
    res.json(profile);
  } catch (error) {
    res.status(500).json({message: "Server error"});
  }
});
```

**After** (with wrap):
```javascript
app.get('/api/students/profile',
  wrap(async (req, res) => {
    const profile = await studentService.getProfile(req.user.id);
    res.json(profile);
  })
);
```

**Benefits**:
- Eliminates try-catch boilerplate
- Automatically catches and logs errors
- Formats error response consistently
- Prevents unhandled promise rejections

---

#### 2. `AppError` - Custom Error Class
```javascript
throw new AppError(message, statusCode, context)
```

**Purpose**: Standardized error responses

**Constructor**:
- `message` (string): Error message for client
- `statusCode` (number): HTTP status code (default 500)
- `context` (object): Additional debug info (logged, not sent to client)

**Properties**:
- `statusCode`: HTTP status code
- `message`: Client-facing message
- `timestamp`: ISO 8601 timestamp
- `stack`: Stack trace (debug mode only)
- `context`: Debug context

**Example Usage**:
```javascript
// Simple error
throw new AppError('Email not found', 404);

// Error with context (for debugging)
throw new AppError('Skill not found', 404, {
  userId: req.user.id,
  skillId: skillId
});

// Server error
throw new AppError('Database connection failed', 500, {
  originalError: dbError.message
});
```

**Instance Method**: `toJSON(includeStack = false)`
- Formats error for HTTP response
- Includes stack trace only in debug mode
- Returns: `{message, statusCode, timestamp, stack?}`

---

#### 3. `Logger` - Structured Logging
```javascript
Logger.error(message, error, meta)
Logger.warn(message, meta)
Logger.info(message, meta)
Logger.debug(message, meta)
```

**Log Levels** (in order of severity):
1. ERROR - Exceptions, failures (always logged)
2. WARN - Suspicious but handled situations
3. INFO - Normal operational events
4. DEBUG - Detailed diagnostic info

**Log Entry Structure**:
```javascript
{
  timestamp: "2026-04-15T10:30:45.123Z",
  level: "ERROR",
  message: "User authentication failed",
  userId: 1,
  email: "juan@example.com",
  errorMessage: "Invalid password",
  errorStack: "Error: Invalid password\n at..."
}
```

**Usage**:
```javascript
// Error with exception
Logger.error('Login failed', new Error('Invalid params'), {
  email: req.body.email,
  ipAddress: req.ip
});

// Warning
Logger.warn('Rate limit approaching', {
  userId: req.user.id,
  requestsInWindow: 95
});

// Info - normal events
Logger.info('User registered', {
  userId: newUser.id,
  email: newUser.email,
  role: newUser.role
});

// Debug - detailed info
Logger.debug('Query executed', {
  query: 'SELECT * FROM users WHERE id = ?',
  params: [1],
  executionMs: 45
});
```

**Console Output** (development):
- Uses ANSI colors
- RED: ERROR
- YELLOW: WARN
- CYAN: INFO
- GRAY: DEBUG

**File Logging** (production):
- Errors logged to stdout/stderr
- Files not used on Vercel (serverless limitation)

---

## 7. Authentication & Security

### 7.1 JWT (JSON Web Token) Authentication

**Library**: jsonwebtoken v9.0.0

#### Token Generation
```javascript
user.generateToken()  // Instance method on User model
```

**Payload**:
```javascript
{
  id: 1,
  email: "juan@example.com",
  role: "student",
  iat: 1718448000,      // Issued at (Unix timestamp)
  exp: 1719052800       // Expiration (7 days later by default)
}
```

**Header**:
```javascript
{
  alg: "HS256",   // Algorithm
  typ: "JWT"      // Type
}
```

**Signature**: HMAC-SHA256 using `config.auth.secret`

**Configuration** (from `env.js`):
```javascript
auth: {
  secret: process.env.JWT_SECRET || 'development-secret-key-change-in-production',
  expiresIn: process.env.JWT_EXPIRES_IN || '7d',  // 7 days
  bcryptRounds: 10
}
```

**Token Location** (in HTTP requests):
```
Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
```

**Verification** (in authMiddleware):
1. Extract token from Authorization header
2. Call `jwt.verify(token, secret)`
3. If valid: return decoded payload
4. If expired: throw TokenExpiredError
5. If invalid: throw JsonWebTokenError

---

### 7.2 Password Security

**Library**: bcrypt v5.1.0

#### Hashing
```javascript
password_hash = await bcrypt.hash(plaintext_password, rounds)
// Example: $2b$10$MIvmM7BH.R3nJvkN0oAg8oKtR7nH... (60 chars)
```

**Configuration**:
```javascript
bcryptRounds: 10  // Time cost (higher = slower = more secure)
```

**Auto-hashing** (in User model):
```javascript
hooks: {
  beforeCreate: async (user) => {
    if (user.password) {
      user.password = await bcrypt.hash(user.password, config.auth.bcryptRounds);
    }
  },
  beforeUpdate: async (user) => {
    if (user.changed('password')) {
      user.password = await bcrypt.hash(user.password, config.auth.bcryptRounds);
    }
  }
}
```

#### Password Verification (during login)
```javascript
const isMatch = await bcrypt.compare(plaintextPassword, hashedPassword);
// Returns: true/false
```

**Security Properties**:
- Each hash is unique (due to random salt)
- Cannot reverse hash to get plaintext
- Brute-force resistant (slow algorithm)
- Salted (random 128-bit salt)

---

### 7.3 Account Lockout (Brute-Force Protection)

**Implementation**: Database-backed account locking

**Fields** (on User model):
```javascript
failedLoginAttempts: INTEGER,    // Count of failed attempts
lockedUntil: DATE,              // Lock expiration time
```

**Lockout Logic** (in AuthService.login()):
1. If status === 'locked':
   - Calculate time since lockUntil
   - If lock period NOT expired: return 423 (Locked)
   - If lock period expired: auto-unlock, reset attempts to 0
2. If password verification FAILS:
   - Increment failedLoginAttempts
   - If failedLoginAttempts >= 5:
     - Set status = 'locked'
     - Set lockedUntil = now + 30 minutes
     - Return 423 (Locked)
   - Else: return 401 (Invalid credentials)
3. If password verification SUCCEEDS:
   - Reset failedLoginAttempts = 0
   - Update last_login_at = now

**Frontend Display**:
- Show error 423 → "Account locked due to failed attempts"
- Calculate and display remaining lock time
- Show countdown timer
- Suggest "Try again in X minutes"

**Lockout Duration**: 30 minutes (configurable)  
**Max Failed Attempts**: 5 (before lockout)

---

### 7.4 Google OAuth 2.0

**Library**: passport-google-oauth20 v2.0.0

#### OAuth Workflow
```
1. Frontend → GET /api/auth/google/redirect?role=student
2. Redirect to Google consent screen (Passport handles)
3. User grants permissions (profile, email)
4. Google redirects back to /api/auth/google/callback?code=...
5. Backend exchanges code for access token
6. Passport callback handler creates/logs in user
7. Return JWT token to frontend
```

#### Configuration
**File**: `src/config/passport.js`

**Credentials** (from environment):
```javascript
clientID: process.env.GOOGLE_CLIENT_ID,
clientSecret: process.env.GOOGLE_CLIENT_SECRET,
callbackURL: environment-dependent (dev vs prod)
```

**Verification Callback** (Passport strategy):
```javascript
new GoogleStrategy(
  { clientID, clientSecret, callbackURL },
  async (accessToken, refreshToken, profile, done) => {
    // 1. Extract: googleId, email, name, picture
    // 2. Check if google_id already linked (existing user)
    // 3. Check if email exists (linking scenario)
    // 4. Create new user if not found
    // 5. Return user via done(null, user)
  }
)
```

#### Account Linking Scenarios

**Scenario 1: New User (first-time Google login)**
- Google ID not found in database
- Email not found in database
- → Create new User with google_id
- → Create Student profile
- → Auto-verify email and activate account
- → Return token

**Scenario 2: Existing Google User (returning user)**
- Google ID found in database
- → Return existing user
- → Generate new token

**Scenario 3: Email Already Registered (linking scenario)**
- Google ID not found
- Email found (exists with password auth)
- → Return `{requiresLinking: true, existingUserId, googleProfile}`
- → Frontend prompts user to confirm linking
- → User confirms via POST /api/auth/google/confirm-linking
- → Backend updates user.google_id and google_linked_at

**OAuth Scopes** (permissions requested):
- `profile`: name, picture
- `email`: email address

---

### 7.5 General Security Measures

#### 1. SQL Injection Prevention
**Method**: Sequelize ORM with parameterized queries
```javascript
// BAD (vulnerable):
User.findAll({ where: `email = '${email}'` })

// GOOD (Sequelize):
User.findAll({ where: { email: email } })
// Translates to: SELECT * FROM users WHERE email = ? [email]
// Parameters passed separately - no string interpolation
```

#### 2. XSS (Cross-Site Scripting) Prevention
**Methods**:
- Input validation: sanitize and validate all inputs
- Output encoding: JSON response bodies automatically escaped
- Helmet middleware: Sets security headers

**Helmet Headers Set**:
```
X-Content-Type-Options: nosniff
X-Frame-Options: DENY              # No clickjacking
X-XSS-Protection: 1; mode=block
Strict-Transport-Security: ...
Content-Security-Policy: ...
```

#### 3. CORS (Cross-Origin Resource Sharing)
**Configuration** (from `env.js`):
```javascript
cors: {
  origin: ['http://localhost:3000'],  // Allowed origins
  methods: ['GET', 'POST', 'PUT', 'DELETE'],
  credentials: true                    # Allow cookies/auth headers
}
```

**Frontend Integration**:
```javascript
fetch('/api/auth/login', {
  method: 'POST',
  credentials: 'include',  // Send cookies
  headers: {
    'Content-Type': 'application/json'
  },
  body: JSON.stringify({email, password})
})
```

#### 4. Rate Limiting
**Configuration**:
```javascript
rateLimit: {
  windowMs: 900000,     // 15 minutes
  maxRequests: 100,     // 100 requests per window
}
```

**Auth Endpoints**: More aggressive rate limiting (5 req/15min)  
**Purpose**: Prevent brute-force attacks, DOS attacks

#### 5. Input Validation
**Library**: express-validator v7.0.0

**Rules Applied**:
- Email format validation (RFC 5322)
- Password strength requirements
- Phone number validation
- URL validation (for profile pictures, websites)
- String length limits
- Enum validation (for status, role, etc.)

**Example**:
```javascript
body('password')
  .isLength({ min: 8 })
  .matches(/[A-Z]/)        // Uppercase required
  .matches(/[0-9]/)        // Number required
  .matches(/[!@#$%^&*]/)   // Special char required
```

---

#### 6. Data Masking in Responses
**Never sent to client**:
- `password` (always hashed, never returned)
- `.stack` (error stack traces in production)
- `.context` (debug context)
- SQL queries
- Internal system info

**Server Returns** (filtered responses):
```javascript
// User object
{
  id: 1,
  name: "Juan Dela Cruz",
  email: "juan@example.com",
  role: "student",
  status: "active"
  // password NOT included
}
```

---

## 8. Error Handling

### Error Handling Flow
```
Route Handler
    ↓
Middleware Stack (auth, validation, rate limit)
    ↓
Business Logic (Service methods)
    ↓ (If error)
throw AppError(message, statusCode) or throw Error
    ↓
Error caught by wrap() function
    ↓
Logger.error() called (logged for debugging)
    ↓
Error formatted to JSON response
    ↓
res.status(statusCode).json({message, statusCode, timestamp})
```

### HTTP Status Codes Used

| Status | Meaning | Common Triggers | Response Format |
|--------|---------|-----------------|-----------------|
| 200 | OK | Successful GET, PUT | `{data, message}` |
| 201 | Created | Successful POST | `{data, message}` |
| 204 | No Content | Successful DELETE | No body |
| 400 | Bad Request | Invalid input validation | `{message, statusCode, errors?}` |
| 401 | Unauthorized | Invalid JWT, expired token | `{message, statusCode}` |
| 403 | Forbidden | Insufficient permissions (role) | `{message, statusCode}` |
| 404 | Not Found | User/posting/skill not found | `{message, statusCode}` |
| 409 | Conflict | Email exists, duplicate app | `{message, statusCode}` |
| 422 | Unprocessable Entity | Validation failed | `{message, statusCode, errors}` |
| 423 | Locked | Account locked (too many attempts) | `{message, statusCode}` |
| 429 | Too Many Requests | Rate limit exceeded | `{message, statusCode}` |
| 500 | Server Error | Unexpected error | `{message, statusCode}` |

### Common Error Scenarios

**Scenario 1: Registration**
```
Email already exists → 409 Conflict
Invalid role → 400 Bad Request
Validation failed → 422 Unprocessable Entity
Success → 201 Created
```

**Scenario 2: Login**
```
Email not found → 401 Unauthorized (generic message)
Password incorrect → 401 Unauthorized (generic message)
Account locked → 423 Locked (with remaining time)
Success → 200 OK
```

**Scenario 3: Apply to Job**
```
Student not found → 404 Not Found
Job posting not found → 404 Not Found
Already applied → 409 Conflict (duplicate application)
Success → 201 Created
```

**Scenario 4: Access Protected Resource**
```
No Authorization header → 401 Unauthorized
Invalid token → 401 Unauthorized
Expired token → 401 Unauthorized
Insufficient role → 403 Forbidden
Success → 200 OK
```

### Error Response Format

**Standard Error Response**:
```javascript
// 400, 401, 404, 500, etc.
{
  message: "User-friendly error message",
  statusCode: 404,
  timestamp: "2026-04-15T10:30:45.123Z"
}
```

**Validation Error Response** (422):
```javascript
{
  message: "Validation failed",
  statusCode: 422,
  errors: {
    email: ["Email must be valid"],
    password: [
      "Password must be at least 8 characters",
      "Password must contain at least one uppercase letter"
    ]
  }
}
```

---

## 9. Configuration & Environment

### Environment Variables

**File**: `.env` (root directory)

```bash
# APP CONFIGURATION
APP_NAME=OJT System V2
APP_ENV=development              # development | production
APP_DEBUG=true                   # true | false
APP_PORT=5000                    # Server port
APP_URL=http://localhost:5000    # Full app URL

# DATABASE
DB_CONNECTION=sqlite             # sqlite | postgres
DB_PATH=./database/ojt_system.db

# AUTHENTICATION
JWT_SECRET=your-super-secret-key-here
JWT_EXPIRES_IN=7d                # 7 days
BCRYPT_ROUNDS=10

# GOOGLE OAUTH
GOOGLE_CLIENT_ID=your-google-client-id.apps.googleusercontent.com
GOOGLE_CLIENT_SECRET=your-google-client-secret
GOOGLE_DEV_CALLBACK_URL=http://localhost:5000/api/auth/google/callback
GOOGLE_PROD_CALLBACK_URL=https://yourdomain.com/api/auth/google/callback

# RATE LIMITING
RATE_LIMIT_WINDOW_MS=900000      # 15 minutes
RATE_LIMIT_MAX_REQUESTS=100

# CORS
CORS_ORIGIN=http://localhost:3000

# LOGGING
LOG_LEVEL=info                   # debug | info | warn | error
LOG_FILE=./logs/app.log
```

### Configuration Loading

**File**: `src/config/env.js`

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
    connection: process.env.DB_CONNECTION || 'sqlite',
    path: process.env.DB_PATH || './database/ojt_system.db',
  },
  auth: {
    secret: process.env.JWT_SECRET || 'development-secret-key-change-in-production',
    expiresIn: process.env.JWT_EXPIRES_IN || '7d',
    bcryptRounds: parseInt(process.env.BCRYPT_ROUNDS || '10'),
  },
  // ... more config
};
```

### Environment Validation

**Validation Rules** (in `validateConfig()`):
- On Vercel serverless: Use defaults if DATABASE_URL not set
- Production: Warn if critical env vars missing
- All modes: Validate enum values

**Fail-Fast Approach**: Errors during startup prevent broken deployments

---

## 10. Deployment (Vercel)

### Vercel Setup

**File**: `vercel.json`

```json
{
  "version": 2,
  "routes": [
    {
      "src": "/minimal",
      "dest": "/api/minimal.js"
    },
    {
      "src": "/ping",
      "dest": "/api/ping.js"
    },
    {
      "src": "/test",
      "dest": "/api/test.js"
    },
    {
      "src": "/(.*)",
      "dest": "/api/index.js"
    }
  ]
}
```

### Serverless Function

**File**: `api/index.js` (Vercel serverless entry point)

```javascript
// Handles all requests not matching other routes
// Single handler for all API endpoints

import initializeApp from '../src/server.js';

let initializedApp = null;

export default async (req, res) => {
  if (!initializedApp) {
    initializedApp = await initializeApp();
  }
  
  // Handle request using Express app
  return initializedApp(req, res);
};
```

### Deployment Considerations

**In-Memory Database**:
- Data NOT persisted between deployments
- Use DATABASE_URL for persistent database
- Example: PostgreSQL on Render, Railway, or Supabase

**Environment Variables** (set on Vercel dashboard):
```
APP_ENV=production
APP_URL=https://your-domain.vercel.app
GOOGLE_CLIENT_ID=...
GOOGLE_CLIENT_SECRET=...
DATABASE_URL=postgresql://...
```

**Cold Starts**:
- First request after deployment: ~2-3 seconds (initialization)
- Subsequent requests: ~100-500ms (normal)

**Logging**:
- Log output: stdout (captured by Vercel)
- Files: Not persisted (Vercel serverless limitation)
- Use external logging (Sentry, LogRocket, etc.) for production

---

## 11. Frontend Integration Guide

### For Vue 3 + Pinia + Fetch API (on Netlify)

### 11.1 API Client Setup

**File**: `src/api/client.ts` (after your frontend is created)

```typescript
const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000';

export class ApiClient {
  private token: string | null = localStorage.getItem('auth_token');

  setToken(token: string) {
    this.token = token;
    localStorage.setItem('auth_token', token);
  }

  clearToken() {
    this.token = null;
    localStorage.removeItem('auth_token');
  }

  private getHeaders() {
    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
    };
    
    if (this.token) {
      headers['Authorization'] = `Bearer ${this.token}`;
    }
    
    return headers;
  }

  async request(endpoint: string, options: RequestInit = {}) {
    const response = await fetch(`${API_BASE_URL}${endpoint}`, {
      ...options,
      headers: {
        ...this.getHeaders(),
        ...options.headers,
      },
    });

    if (response.status === 401) {
      // Token expired or invalid
      this.clearToken();
      // Redirect to login...
    }

    const data = await response.json();

    if (!response.ok) {
      throw new Error(data.message || 'API request failed');
    }

    return data;
  }

  post(endpoint: string, body: any) {
    return this.request(endpoint, {
      method: 'POST',
      body: JSON.stringify(body),
    });
  }

  get(endpoint: string) {
    return this.request(endpoint, { method: 'GET' });
  }

  put(endpoint: string, body: any) {
    return this.request(endpoint, {
      method: 'PUT',
      body: JSON.stringify(body),
    });
  }
}

export const api = new ApiClient();
```

### 11.2 Authentication Flow

**Register**:
```typescript
const response = await api.post('/api/auth/register', {
  name: 'Juan Dela Cruz',
  email: 'juan@example.com',
  password: 'SecurePass123!',
  role: 'student'
});

// Response:
// {
//   message: "Registration successful",
//   user: { id, name, email, role, status },
//   token: "eyJhbGc..."
// }

api.setToken(response.token);
```

**Login**:
```typescript
const response = await api.post('/api/auth/login', {
  email: 'juan@example.com',
  password: 'SecurePass123!'
});

// Success: { message, user, token }
// Error 401: { message, statusCode }
// Error 423: { message, statusCode } + show countdown

api.setToken(response.token);
```

**Google OAuth**:
```typescript
// 1. Redirect user to OAuth
window.location.href = `${API_BASE_URL}/api/auth/google/redirect?role=student`;

// 2. Handle callback (after user authorizes)
// Backend redirects to http://localhost:3000/auth/callback?token=...
// Frontend extracts token from URL and calls:
api.setToken(tokenFromUrl);

// 3. Check if linking required
if (response.requiresLinking) {
  // Show "Link to existing account" confirmation dialog
  const confirmResponse = await api.post('/api/auth/google/confirm-linking', {
    userId: response.existingUserId,
    googleId: response.googleProfile.googleId
  });
  api.setToken(confirmResponse.token);
}
```

### 11.3 Student Profile Operations

**Get Profile**:
```typescript
const profile = await api.get('/api/students/profile');
// Response: { message, data: Student }
```

**Update Profile**:
```typescript
const updated = await api.put('/api/students/profile', {
  first_name: 'Juan',
  last_name: 'Dela Cruz',
  gpa: 3.75,
  academic_program: 'Computer Science',
  availability_start: '2026-06-01',
  availability_end: '2026-08-31'
});
// Response: { message, data: Student }
```

**Add Skill**:
```typescript
const skill = await api.post('/api/students/skills', {
  skill_name: 'Java',
  proficiency_level: 'advanced',
  years_of_experience: 2.5
});
// Response: { message, data: StudentSkill }
```

**Get Skills**:
```typescript
const skills = await api.get('/api/students/skills');
// Response: { message, data: StudentSkill[] }
```

### 11.4 Job Matching & Applications

**Get Recommended Postings**:
```typescript
const matches = await api.get('/api/matches?minScore=60');
// Response: {
//   message: "Matching postings retrieved",
//   data: [ MatchScore[] ],
//   count: 5
// }

// Each MatchScore contains:
// {
//   id, student_id, posting_id,
//   overall_score: 82.35,
//   skill_score: 90,
//   location_score: 80,
//   availability_score: 75,
//   gpa_score: 85,
//   academic_program_score: 100,
//   match_status: "compatible",
//   recommendation_reason: "..."
// }
```

**Apply to Job**:
```typescript
const application = await api.post('/api/applications', {
  posting_id: 1,
  resume_id: 5,       // Student's resume ID
  cover_letter: "I'm excited about this opportunity..."
});
// Response: { message, data: Application }
// Status now: { application_status: 'submitted', applied_at: ... }
```

**Get Applications**:
```typescript
const apps = await api.get('/api/applications?status=submitted&page=1&limit=10');
// Response: {
//   message: "Applications retrieved",
//   data: Application[],
//   count: 3
// }
```

### 11.5 Notifications

**Get Notifications**:
```typescript
const notifs = await api.get('/api/notifications?page=1&limit=10');
// Response: {
//   message: "Notifications retrieved",
//   data: Notification[],
//   count: 45
// }

// Notification fields:
// { id, title, message, type, priority, is_read, read_at, created_at }
```

**Mark as Read**:
```typescript
await api.put(`/api/notifications/${notificationId}/read`);
```

**Mark All as Read**:
```typescript
await api.put('/api/notifications/read-all');
```

### 11.6 Error Handling Template

```typescript
try {
  const result = await api.post('/api/auth/login', data);
  // Success
} catch (error) {
  if (error.message.includes('Validation failed')) {
    // Show validation errors
    const response = await error.json();
    console.log(response.errors);  // { email: [...], password: [...] }
  } else if (error.statusCode === 423) {
    // Account locked - show countdown
    showLockoutCountdown(error.message);
  } else if (error.statusCode === 401) {
    // Invalid credentials
    showError('Invalid email or password');
  } else {
    // Generic error
    showError(error.message);
  }
}
```

---

## Summary & Quick Reference

### Key Files & LOC
| File | Lines | Purpose |
|------|-------|---------|
| server.js | 350+ | Express app & routes |
| models/index.js | 250+ | Model definitions & relationships |
| services/MatchingService.js | 300+ | Core matching algorithm |
| middleware/auth.js | 150+ | JWT, RBAC, rate limiting |
| middleware/validation.js | 200+ | Input validation rules |
| errorHandler.js | 150+ | Error classes & logging |

### Database Statistics
- **15 Models** → 23 Tables (with junction tables)
- **100+ Indexes** for fast queries
- **Relationships**: 40+ associations defined
- **Constraints**: FK keys, unique, check, not null

### API Statistics
- **18+ Endpoints** fully implemented
- **5 Services** with 40+ methods total
- **3 Middleware** layers + utils
- **~4,500 lines** of code with 100% comment coverage

### Security Features Implemented
✅ JWT authentication with expiration  
✅ Bcrypt password hashing (10 rounds)  
✅ Account lockout (5 attempts, 30 min)  
✅ Role-based access control (RBAC)  
✅ Rate limiting (brute-force protection)  
✅ Input validation & sanitization  
✅ SQL injection prevention (ORM)  
✅ Google OAuth 2.0 with account linking  
✅ Audit logging for compliance  
✅ CORS configuration  
✅ Helmet security headers  

---

## Appendix: Matching Algorithm Deep Dive

### Five-Component Weighted System

```
OVERALL_SCORE = 
  (SkillScore        × 0.40) +
  (LocationScore     × 0.20) +
  (AvailabilityScore × 0.20) +
  (GpaScore          × 0.10) +
  (AcademicProgram   × 0.10)

Result Range: 0-100
```

### Skill Score Calculation
```
RequiredSkillScore = (MatchedRequiredWeight / TotalRequiredWeight) × 100

If admin.prioritize_required_skills AND RequiredSkillScore < 100:
  finalSkillScore = RequiredSkillScore - 30  // Penalty
Else:
  PreferredSkillScore = (MatchedPreferredWeight / TotalPreferredWeight) × 100
  finalSkillScore = (RequiredSkillScore × 0.80) + (PreferredSkillScore × 0.20)

Return: Math.round(finalSkillScore)
```

### Location Score Calculation
```
If posting.allow_remote:
  return 100

Else if student.preferred_location === posting.location:
  return 100

Else if same country/region:
  return 75

Else:
  return 40-50 (different location, possible relocation)
```

### Availability Score Calculation
```
If student has no availability window:
  return 50  // Unknown availability

If posting has no start date:
  return 100  // No specific time requirement

Calculate overlap between:
  - Student window: [availability_start, availability_end]
  - OJT window: [start_date, start_date + duration_weeks]

If perfect overlap:
  return 100
Else if partial overlap:
  return 50-90 (proportional to overlap percentage)
Else:
  return 0-30
```

### GPA Score Calculation
```
If posting has no min_gpa:
  return 100

If student.gpa >= posting.min_gpa:
  return 100

Else:
  percentage = (student.gpa / posting.min_gpa) × 100
  return percentage  // 0-99
```

### Academic Program Score
```
If posting has no program requirement:
  return 100

If student.academic_program == posting.academic_program:
  return 100

If related programs (e.g., CS vs Computer Engineering):
  return 80

Else:
  return 0-30
```

### Match Status Classification
```
overall_score >= 90:  "highly_compatible"
overall_score >= 75:  "compatible"
overall_score >= 60:  "moderately_compatible"
overall_score >= 40:  "weak_match"
overall_score  < 40:  "not_compatible"
```

---

**END OF ANALYSIS DOCUMENT**

---

*This document provides complete technical reference for all OJT System V2 Backend components, suitable for:*
- Frontend developers integrating with the API
- Backend developers maintaining/extending the codebase
- QA engineers understanding all functionality
- Documentation writers creating user guides
- DevOps engineers deploying the system

*For questions about specific endpoints, services, or models, refer to the corresponding section above.*

