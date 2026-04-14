# OJT System V2 Backend - Complete Codebase Exploration

**Date:** April 14, 2026  
**Environment:** Node.js with Express, Sequelize ORM, SQLite/PostgreSQL  
**Version:** 2.0.0

---

## 1. DIRECTORY STRUCTURE

```
src/
├── server.js                      # Main Express app entry point
├── config/
│   ├── database.js               # Sequelize configuration
│   ├── env.js                    # Environment variables & validation
│   └── passport.js               # Google OAuth strategy setup
├── middleware/
│   ├── auth.js                   # JWT verification, RBAC, rate limiting
│   └── validation.js             # Input validation rules (express-validator)
├── models/                        # Database models
│   ├── index.js                  # Model initialization & associations
│   ├── User.js                   # Base user (all roles)
│   ├── Student.js                # Student profile extension
│   ├── Company.js                # Company profile extension
│   ├── Coordinator.js            # Coordinator profile extension
│   ├── OjtPosting.js             # Job postings
│   ├── Application.js            # Student applications + Resume
│   ├── Skill.js                  # StudentSkill + PostingSkill
│   ├── Matching.js               # MatchScore + MatchingRule + OjtProgress
│   ├── Audit.js                  # AuditLog + Notification + Message
│   └── PasswordResetToken.js     # Password reset token tracking
├── routes/
│   └── googleAuth.js             # Google OAuth routes
├── services/                      # Business logic
│   ├── AuthService.js            # Registration, login, password reset
│   ├── StudentService.js         # Student profile & applications
│   ├── MatchingService.js        # Intelligent matching algorithm
│   ├── GoogleAuthService.js      # Google OAuth account management
│   └── NotificationService.js    # Notifications + AuditService
└── utils/
    └── errorHandler.js           # Custom error class + logger + wrap()
```

---

## 2. ALL SERVICES

### 2.1 AuthService ⭐⭐⭐⭐⭐

**File:** `src/services/AuthService.js`  
**Comment Quality:** 5/5 - Excellent documentation with WHY comments

#### Public Methods:

| Method | Signature | Purpose |
|--------|-----------|---------|
| `register()` | `async register(data)` | Create new user with role-specific profile. Auto-hashes password via beforeCreate hook. Creates Student/Company/Coordinator profile. |
| `login()` | `async login(email, password)` | Validate credentials, check account lock status, track failed attempts (5 max = lock 30min), generate JWT token. |
| `validateToken()` | `async validateToken(token)` | Verify JWT signature and expiration. Throws if expired/invalid. |
| `forgotPassword()` | `async forgotPassword(email)` | Create 1-hour password reset token & store in DB (prevent reuse). Returns token if debug mode. |
| `resetPassword()` | `async resetPassword(resetToken, newPassword)` | Verify reset token, mark as used, update password. Prevents token reuse. |
| `getCurrentUser()` | `async getCurrentUser(userId)` | Fetch complete user profile with role-specific data. |
| `updateUser()` | `async updateUser(userId, data)` | Allow name/password updates. Requires current password for password change. |
| `changeUserStatus()` | `async changeUserStatus(userId, newStatus, reason)` | Admin-only: suspend/activate/inactive users. Logs to audit trail. |

#### Key Features:
- **Account Locking:** After 5 failed login attempts, account locked for 30 minutes
- **Transactions:** None explicitly (handled at route level)
- **Database Interactions:** Queries User, PasswordResetToken, role-specific models
- **Error Handling:** Generic messages ("Invalid email or password") to prevent email enumeration attacks
- **Complexity:** HIGH - Account security, token management, role-based profile creation

---

### 2.2 StudentService ⭐⭐⭐⭐

**File:** `src/services/StudentService.js`  
**Comment Quality:** 4/5 - Good documentation, some methods lack detail

#### Public Methods:

| Method | Signature | Purpose |
|--------|-----------|---------|
| `getProfile()` | `async getProfile(userId)` | Fetch student profile by user_id. |
| `updateProfile()` | `async updateProfile(userId, data)` | Update allowed fields (name, phone, bio, location, GPA, etc). Auto-recalculates profile_completeness_percentage. |
| `addSkill()` | `async addSkill(userId, skillData)` | Add a new skill with proficiency level & experience. |
| `getSkills()` | `async getSkills(userId)` | Fetch all skills for student, ordered by proficiency DESC. |
| `updateSkill()` | `async updateSkill(userId, skillId, data)` | Update proficiency or years_of_experience. |
| `deleteSkill()` | `async deleteSkill(userId, skillId)` | Remove skill from student. |
| `applyToPosting()` | `async applyToPosting(userId, postingId, data)` | **COMPLEX - Uses transaction with row lock.** Prevent race conditions (position fill, duplicate apply). Validates posting active & positions available. |
| `getApplications()` | `async getApplications(userId, filters)` | Fetch applications with optional status filter. Includes posting & resume. Ordered DESC by applied_at. |
| `getApplication()` | `async getApplication(userId, applicationId)` | Single application with full details, required skills, resume. |
| `withdrawApplication()` | `async withdrawApplication(userId, applicationId)` | Withdraw submitted application. Only works if status='submitted'. |
| `uploadResume()` | `async uploadResume(userId, file, title)` | Store resume file metadata. Sets is_active=false initially. |
| `getResumes()` | `async getResumes(userId)` | Fetch all resumes, ordered DESC by uploaded_at. |
| `setActiveResume()` | `async setActiveResume(userId, resumeId)` | Deactivate all other resumes, set target as active. One can be active at a time. |
| `getMatchedPostings()` | `async getMatchedPostings(userId, minScore)` | Fetch MatchScore records for student with score >= minScore, ordered DESC. |

#### Key Features:
- **Transactions:** `applyToPosting()` uses explicit transaction with row-level lock to prevent race conditions
- **Database Interactions:** Student, StudentSkill, Application, OjtPosting, Resume, MatchScore models
- **Error Handling:** Validates student exists before operations, checks for duplicate applications
- **Complexity:** HIGH - Application race conditions, resume management, score caching

---

### 2.3 MatchingService ⭐⭐⭐⭐⭐

**File:** `src/services/MatchingService.js`  
**Comment Quality:** 5/5 - Excellent algorithm documentation with WHY comments everywhere

#### Public Methods:

| Method | Signature | Purpose |
|--------|-----------|---------|
| `calculateForStudent()` | `async calculateForStudent(studentId)` | Calculate match scores for student vs ALL active postings. Caches results. Returns sorted by score DESC. |
| `calculateScore()` | `async calculateScore(student, posting)` | Core algorithm - calculates overall score by combining 5 weighted component scores. Creates/updates MatchScore record. |
| `calculateSkillScore()` | `async calculateSkillScore(student, posting, weights)` | Weight: 40% importance. Compares student skills with required & preferred skills. Penalizes if required skills missing (if prioritize_required_skills=true). Returns 0-100. |
| `calculateLocationScore()` | `async calculateLocationScore(student, posting)` | Weight: 20%. Logic: remote=100, preferred match=100, current match=80, nearby=75, different=40, no info=50. |
| `isNearbyLocation()` | `isNearbyLocation(loc1, loc2)` | Heuristic: checks if last part (country/province) matches. Example: "Manila, PH" ≈ "QC, PH". |
| `calculateAvailabilityScore()` | `async calculateAvailabilityScore(student, posting)` | Weight: 20%. Full overlap=100, partial=60, none=0. Student must be available during OJT period. |
| `calculateGpaScore()` | `async calculateGpaScore(student, posting)` | Weight: 10%. Student GPA >= min_gpa=100, else scales down from requirement. |
| `calculateAcademicProgramScore()` | `async calculateAcademicProgramScore(student, posting)` | Weight: 10%. Exact match=100, related programs=80, different=30. Related groups: Tech(CS,IT,SE), Engineering. |
| `calculateWeightedScore()` | `calculateWeightedScore(scores, weights)` | Combine 5 component scores using weights. Returns 0-100. |
| `getMatchStatus()` | `getMatchStatus(score, weights)` | Classify: highly_compatible(≥85), compatible(≥70), moderately_compatible(≥60), weak_match(≥40), not_compatible(<40). |
| `getDefaultRules()` | `getDefaultRules()` | Returns default weights: skill=40%, location=20%, availability=20%, gpa=10%, program=10%, min_score=60%. |
| `getMatchesForStudent()` | `async getMatchesForStudent(studentId, limit)` | Fetch cached matches, ordered DESC by overall_score, with limit. |

#### Key Features:
- **Algorithm Complexity:** Very high - 5-factor weighted matching with business logic for each factor
- **Transactions:** Uses findOrCreate in calculateScore (atomic operation)
- **Caching:** Pre-calculates and stores MatchScore records to avoid recalculating every request
- **Configurable Weighting:** Can load custom weights from MatchingRule model (admin configuration)
- **Multiple interaction points:** Most complex service - needed for student matching workflow

#### Algorithm Weights Example:
```javascript
default: {
  skill_weight: 40,          // Most important
  location_weight: 20,
  availability_weight: 20,
  gpa_weight: 10,
  academic_program_weight: 10,
  minimum_match_score: 60,   // Threshold for recommendation
  prioritize_required_skills: true,
  allow_remote_flexibility: true
}
```

---

### 2.4 GoogleAuthService ⭐⭐⭐⭐

**File:** `src/services/GoogleAuthService.js`  
**Comment Quality:** 4/5 - Good OAuth flow documentation

#### Public Methods:

| Method | Signature | Purpose |
|--------|-----------|---------|
| `authenticateWithGoogle()` | `async authenticateWithGoogle(googleProfile)` | Main OAuth flow. If google_id exists = login. If email exists = requires linking. If new = create account + student profile. |
| `requestAccountLinking()` | `async requestAccountLinking(userId, googleProfile)` | Security: Verify email matches, require password (can't link passwordless accounts). Returns linking confirmation prompt. |
| `confirmAccountLinking()` | `async confirmAccountLinking(userId, googleId, email)` | Link Google account to existing user. Verify email match, check google_id not already linked. Generate token. |
| `unlinkGoogleAccount()` | `async unlinkGoogleAccount(userId)` | Remove Google OAuth from account. Security: User must have password (can't leave account unsecured). |
| `googleAccountExists()` | `async googleAccountExists(googleId)` | Check if google_id already has account (boolean return). |
| `getUserByGoogleId()` | `async getUserByGoogleId(googleId)` | Fetch user by google_id for OAuth login. |
| `_formatUser()` | `_formatUser(user)` | Private - sanitize user response (remove password, google_id from API response). |
| `_createGoogleUser()` | `async _createGoogleUser(googleProfile)` | Private - create new user from Google profile. Auto-verifies email, creates student profile, sets status=active. |

#### Key Features:
- **Account Linking Flow:** Handles existing email scenario (requires user confirmation)
- **Security:** Email verification, password requirement for unlinking, sanitized responses
- **Role Assignment:** OAuth users default to 'student', can change during signup
- **Database Interactions:** User, Student models
- **Complexity:** MEDIUM - OAuth flow with account linking logic

---

### 2.5 NotificationService + AuditService ⭐⭐⭐⭐

**File:** `src/services/NotificationService.js`

#### NotificationService Public Methods:

| Method | Signature | Purpose |
|--------|-----------|---------|
| `notify()` | `async notify(userId, data)` | Create notification with title, message, type, priority. |
| `getUnreadNotifications()` | `async getUnreadNotifications(userId, limit)` | Fetch unread notifications, ordered by priority DESC then createdAt DESC. |
| `getNotifications()` | `async getNotifications(userId, page, limit)` | Paginated notification history. |
| `markAsRead()` | `async markAsRead(notificationId)` | Mark single notification as read with timestamp. |
| `markAllAsRead()` | `async markAllAsRead(userId)` | Bulk mark all unread as read for user. |
| `deleteNotification()` | `async deleteNotification(notificationId)` | Remove notification. |
| `getUnreadCount()` | `async getUnreadCount(userId)` | Get count for UI badge. |
| `notifyApplicationSubmitted()` | `async notifyApplicationSubmitted(userId, appId, title)` | Pre-packaged: "Application Submitted" notification. |
| `notifyApplicationReviewed()` | `async notifyApplicationReviewed(userId, appId, title, status)` | Pre-packaged: "Application Shortlisted" or "Reviewed". |
| `notifyApplicationAccepted()` | `async notifyApplicationAccepted(userId, appId, title)` | Pre-packaged: "Congratulations" urgent notification. |
| `notifyApplicationRejected()` | `async notifyApplicationRejected(userId, appId, title)` | Pre-packaged: "Application Status Update" notification. |
| `notifyNewMatches()` | `async notifyNewMatches(userId, postingCount)` | Pre-packaged: "X New Matching Jobs Found". |
| `notifyAccountApproved()` | `async notifyAccountApproved(userId)` | Pre-packaged: "Account Approved" high-priority. |

#### AuditService Public Methods:

| Method | Signature | Purpose |
|--------|-----------|---------|
| `log()` | `async log(data)` | Generic audit log. Records userId, action, entityType, old/new values, IP, severity. Info level audits don't block operations if fail. |
| `logLogin()` | `async logLogin(userId, ipAddress, userAgent)` | Convenience: Log login attempt with HIGH severity. |
| `logLogout()` | `async logLogout(userId, ipAddress)` | Convenience: Log logout with MEDIUM severity. |
| `logDataChange()` | `async logDataChange(userId, entityType, entityId, oldValues, newValues, reason)` | Convenience: Log update with before/after values. |
| `logDelete()` | `async logDelete(userId, entityType, entityId, reason)` | Convenience: Log deletion with HIGH severity. |
| `getEntityHistory()` | `async getEntityHistory(entityType, entityId)` | Fetch all changes to specific record (ordered DESC by date). |
| `getUserActions()` | `async getUserActions(userId, limit)` | Fetch user's recent actions (login, create, update, delete). |
| `getHighSeverityLogs()` | `async getHighSeverityLogs(limitDays)` | Get critical/high severity logs from last N days for monitoring. |
| `generateReport()` | `async generateReport(startDate, endDate)` | Compliance report: aggregate logs by action/severity/entity type. Returns summary + full logs. |

#### Key Features - Notifications:
- **Pre-packaged notifications:** Common events have template methods
- **Priority levels:** low, normal, high, urgent - affects UI badge & sorting
- **Link to entities:** notification_type + related_entity_type tracks what it's about

#### Key Features - Audit:
- **Non-blocking:** Audit failures don't break normal operations
- **Severity levels:** low, medium, high, critical - for monitoring/compliance
- **Context capture:** IP address, user agent, action reason for investigations
- **Compliance:** Supports generating audit reports for regulatory requirements

---

## 3. ALL MODELS

### Model Relationships Summary

```
User (many-to-one)
├─ Student (1:1 via user_id)
│  ├─ StudentSkill (1:many)
│  ├─ Application (1:many)
│  ├─ Resume (1:many)
│  ├─ MatchScore (1:many)
│  └─ OjtProgress (1:many)
├─ Company (1:1 via user_id)
│  └─ OjtPosting (1:many)
├─ Coordinator (1:1 via user_id)
│  └─ OjtProgress (1:many via coordinator_id)
├─ PasswordResetToken (1:many)
├─ Notification (1:many)
├─ AuditLog (1:many)
└─ Message (1:many as sender/recipient)

OjtPosting
├─ PostingSkill (1:many)
├─ Application (1:many)
└─ MatchScore (1:many)

Application
├─ Resume (many-to-one)
└─ OjtProgress (1:1)
```

### 3.1 User Model ⭐⭐⭐⭐

**File:** `src/models/User.js`  
**Base table for all roles**

#### Fields & Validation:
| Field | Type | Validation | Comment |
|-------|------|-----------|---------|
| id | INTEGER | PRIMARY KEY | Auto-increment |
| name | STRING(255) | Required, 2-255ch | Full name |
| email | STRING(255) | EMAIL, unique | Login identifier |
| password | STRING(255) | Optional | Null for Google OAuth users |
| role | ENUM | 'student','company','coordinator','admin' | Role-based access |
| status | ENUM | 'active','pending','suspended','inactive' | Soft-disable accounts |
| email_verified_at | DATE | Optional | NULL if not verified |
| last_login_at | DATE | Optional | Security monitoring |
| failedLoginAttempts | INTEGER | Default: 0 | Lock after 5 attempts |
| lockedUntil | DATE | Optional | Lock timeout (30 min) |
| google_id | STRING(255) | Unique, Optional | Google OAuth ID |
| auth_provider | ENUM | 'email' or 'google' | Which auth method |
| google_linked_at | DATE | Optional | When Google was linked |

#### Indexes:
- `email` (unique) - frequent login lookup
- `google_id` (unique) - OAuth lookup
- `role` - RBAC filtering
- `status` - find active users

#### Instance Methods:
| Method | Returns | Purpose |
|--------|---------|---------|
| `comparePassword(plainPassword)` | Promise<boolean> | Use bcrypt to securely compare plaintext with hash. |
| `generateToken()` | string | Create JWT token with id, email, role. Expires in 7 days (configurable). |
| `getProfile()` | Promise<Object> | Fetch role-specific profile (Student/Company/Coordinator). |

#### Class Methods:
| Method | Returns | Purpose |
|--------|---------|---------|
| `findByEmail(email)` | Promise<User>\|null | Case-insensitive email lookup. |
| `findByGoogleId(googleId)` | Promise<User>\|null | OAuth ID lookup. |

#### Hooks:
- `beforeCreate`: Hash password if provided (bcrypt rounds = 10)
- `beforeUpdate`: Only re-hash if password field changed

#### Comment Quality: 4/5
- Good field-level comments explaining WHY (e.g., "Allow null for Google OAuth users")
- Missing: High-level documentation of role hierarchy

---

### 3.2 Student Model ⭐⭐⭐⭐

**File:** `src/models/Student.js`  
**Extension of User with student-specific data**

#### Fields:
| Field | Type | Validation | Comment |
|-------|------|-----------|---------|
| id | INTEGER | PRIMARY KEY | |
| user_id | INTEGER | FK → User | CASCADE delete |
| first_name | STRING(100) | Optional | Can differ from User.name |
| last_name | STRING(100) | Optional | |
| phone | STRING(20) | Optional, numeric | |
| bio | TEXT | Optional | About/resume section |
| current_location | STRING(255) | Optional | Used for location matching |
| preferred_location | STRING(255) | Optional | OJT location preference |
| profile_picture_url | STRING(500) | Optional | Avatar URL |
| availability_start | DATE | Optional | When available for OJT |
| availability_end | DATE | Optional | Deadline for completion |
| profile_completeness_percentage | INTEGER | 0-100, required | Motivate profile completion |
| gpa | DECIMAL(3,2) | 0-4.0, optional | Academic performance |
| academic_program | STRING(255) | Optional | Degree program (CS, IT, etc) |
| year_of_study | ENUM | '1st','2nd','3rd','4th','graduate' | Current year |

#### Indexes:
- `user_id` - lookup by user
- `preferred_location` - filter by location

#### Instance Methods:
| Method | Returns | Purpose |
|--------|---------|---------|
| `calculateProfileCompleteness()` | number (0-100) | Tracks completed fields. 10 tracked fields total. Auto-called on profile update. |
| `isAvailableDuring(startDate, endDate)` | boolean | Check overlap between student availability window and OJT period. Used by matching. |
| `getSkills()` | Promise<StudentSkill[]> | Fetch associated skills. |

#### Associations:
- `hasMany` StudentSkill (1:many, cascade)
- `hasMany` Application (1:many, cascade)
- `hasMany` Resume (1:many, cascade)
- `hasMany` MatchScore (1:many, cascade)
- `hasMany` OjtProgress (1:many, cascade)
- `belongsTo` User (user_id)

#### Comment Quality: 4/5
- Good field explanations
- Instance methods well-documented

---

### 3.3 Company Model ⭐⭐⭐⭐

**File:** `src/models/Company.js`  
**Extension of User for employer accounts**

#### Fields:
| Field | Type | Comment |
|-------|------|---------|
| id | INTEGER | PRIMARY KEY |
| user_id | INTEGER | FK → User, CASCADE |
| company_name | STRING(255) | Official name |
| industry_type | STRING(100) | Sector (Tech, Finance, etc) |
| company_size | ENUM | '1-50', '51-200', '201-500', '500+' |
| company_website | STRING(500) | URL (validated) |
| phone | STRING(20) | Contact |
| address | STRING(500) | HQ address |
| city | STRING(100) | City |
| country | STRING(100) | Country |
| description | TEXT | About company |
| logo_url | STRING(500) | Logo image |
| accreditation_status | ENUM | 'pending','approved','rejected','suspended' |
| accreditation_verified_at | DATE | When approved - IMPORTANT: Guards posting ability |
| average_rating | DECIMAL(3,2) | 0-5 stars |
| total_ratings | INTEGER | Count of ratings |
| tax_id | STRING(50) | Compliance |
| is_approved_for_posting | BOOLEAN | Can post jobs? (checked before posting) |

#### Indexes:
- `user_id`
- `accreditation_status` - find pending approvals
- `city` - geographic filtering

#### Instance Methods:
| Method | Purpose |
|--------|---------|
| `approve()` | Set status='approved', is_approved_for_posting=true, set verification timestamp. Admin action. |
| `suspend()` | Pause posting privileges due to violations. |
| `updateRating(newRating)` | Recalculate average rating (1-5). Used when students rate company. |
| `getActivePostings()` | Fetch company's open job postings. |
| `getAllApplications()` | Fetch all applications to company's postings (includes posting info). |

#### Associations:
- `hasMany` OjtPosting (1:many, cascade)
- `belongsTo` User (user_id)

#### Comment Quality: 4/5

---

### 3.4 Coordinator Model ⭐⭐⭐

**File:** `src/models/Coordinator.js`  
**Academic supervisor handling student OJT progress**

#### Fields:
| Field | Type | Comment |
|-------|------|---------|
| id | INTEGER | PRIMARY KEY |
| user_id | INTEGER | FK → User |
| department | STRING(100) | Academic dept |
| designation | STRING(100) | Job title |
| office_location | STRING(255) | Office |
| phone_extension | STRING(10) | Internal ext |
| students_assigned | INTEGER | Current count |
| max_students | INTEGER | Capacity (default: 50) |
| specialization_area | STRING(255) | Expertise |
| bio | TEXT | Bio |

#### Indexes:
- `user_id`
- `department` - filter by dept

#### Instance Methods:
| Method | Purpose |
|--------|---------|
| `getAssignedStudents()` | Fetch students under this coordinator. |

#### Associations:
- `hasMany` OjtProgress (1:many)
- `belongsTo` User (user_id)

#### Comment Quality: 3/5 - Basic but sparse

---

### 3.5 OjtPosting Model ⭐⭐⭐⭐

**File:** `src/models/OjtPosting.js`  
**Job postings created by companies**

#### Key Fields:
| Field | Type | Comment |
|-------|------|---------|
| id | INTEGER | PRIMARY KEY |
| company_id | INTEGER | FK → Company, CASCADE |
| title | STRING(255) | Job title |
| description | TEXT | Full description |
| location | STRING(255) | Job location (used for matching) |
| allow_remote | BOOLEAN | Can work remotely? |
| duration_weeks | INTEGER | 1-52 weeks OJT |
| start_date | DATE | Preferred start |
| salary_range_min | DECIMAL | Min stipend |
| salary_range_max | DECIMAL | Max stipend |
| stipend | BOOLEAN | Is there payment? |
| min_gpa | DECIMAL | Minimum GPA req |
| academic_program | STRING(255) | Required degree |
| min_year_of_study | ENUM | Minimum year (1st-graduate) |
| posting_status | ENUM | 'active','closed','draft','archived' |
| positions_available | INTEGER | # of positions |
| positions_filled | INTEGER | # filled |
| number_of_applications | INTEGER | # applications received |
| published_at | DATE | When went public |
| application_deadline | DATE | Last apply date |
| tags | JSON | Search tags (["full-stack"]) |

#### Indexes:
- `company_id`
- `posting_status` - find active
- `location` - geographic search
- `academic_program` - filter by program

#### Instance Methods:
| Method | Purpose |
|--------|---------|
| `publish()` | Set status='active', set published_at timestamp. Makes visible to students. |
| `close()` | Set status='closed'. Stop accepting applications. |
| `hasPositionsAvailable()` | Boolean check: positions_filled < positions_available |
| `incrementApplicationCount()` | Increment application counter (called on apply). |
| `fillPosition()` | Increment positions_filled, auto-close if full. Can throw if already full. |
| `getRequiredSkills()` | Fetch PostingSkill records where is_required=true. |
| `getAllSkills()` | Fetch all skills (required + preferred). |

#### Associations:
- `hasMany` PostingSkill (1:many, cascade)
- `hasMany` Application (1:many, cascade)
- `hasMany` MatchScore (1:many, cascade)
- `belongsTo` Company

#### Comment Quality: 4/5
- Good documentation of status flow
- Instance methods well-explained

---

### 3.6 StudentSkill + PostingSkill Models ⭐⭐⭐⭐

**File:** `src/models/Skill.js`

#### StudentSkill
| Field | Type | Comment |
|-------|------|---------|
| id | INTEGER | PRIMARY KEY |
| student_id | INTEGER | FK → Student, CASCADE |
| skill_name | STRING(100) | "Java", "SQL", "React" |
| proficiency_level | ENUM | 'beginner','intermediate','advanced','expert' |
| years_of_experience | DECIMAL(3,1) | 0-50 years |
| endorsed_count | INTEGER | Endorsements/confirmations |

Instance methods:
- `updateProficiency(newLevel)` - validate level, save
- `addEndorsement()` - increment counter, save

#### PostingSkill
| Field | Type | Comment |
|-------|------|---------|
| id | INTEGER | PRIMARY KEY |
| posting_id | INTEGER | FK → OjtPosting, CASCADE |
| skill_name | STRING(100) | "Java", "SQL", etc |
| is_required | BOOLEAN | Mandatory vs preferred |
| min_proficiency_level | ENUM | Minimum acceptable level |
| weight | DECIMAL(3,2) | 1.0 = normal, 2.0 = double importance. Used in matching algorithm. |
| description | TEXT | Why this skill is needed |

Used by matching algorithm:
- Required skills weighted heavier
- Weight multiplier affects scoring (can be 1.0-2.0)
- Skill matching is 40% of overall score

#### Comment Quality: 4/5

---

### 3.7 Application Model ⭐⭐⭐⭐

**File:** `src/models/Application.js`  
**Student applications to job postings**

#### Fields:
| Field | Type | Comment |
|-------|------|---------|
| id | INTEGER | PRIMARY KEY |
| student_id | INTEGER | FK → Student, CASCADE |
| posting_id | INTEGER | FK → OjtPosting, CASCADE |
| resume_id | INTEGER | FK → Resume (optional) |
| application_status | ENUM | 'submitted','under_review','shortlisted','rejected','hired','withdrawn' |
| cover_letter | TEXT | Application essay |
| match_score | DECIMAL(5,2) | 0-100 compatibility score |
| company_feedback | TEXT | Company notes |
| rejection_reason | STRING(255) | Why rejected |
| applied_at | DATE | Application date |
| reviewed_at | DATE | When reviewed |
| interviewed_at | DATE | Interview date |
| hired_at | DATE | Offer accepted date |
| notes | TEXT | Internal notes |

#### Indexes:
- `student_id`
- `posting_id`
- `application_status` - filter by status
- `applied_at` - sort by date
- `UNIQUE(student_id, posting_id)` - prevent duplicates

#### Instance Methods:
| Method | Purpose |
|--------|---------|
| `updateStatus(newStatus, reason)` | Move through workflow: submitted→under_review→shortlisted→hired/rejected. Sets timestamps. |
| `scheduleInterview(interviewDate)` | Set interviewed_at. |
| `withdraw()` | Set status='withdrawn'. |

#### Resume Model
| Field | Type | Comment |
|-------|------|---------|
| id | INTEGER | PRIMARY KEY |
| student_id | INTEGER | FK → Student |
| file_name | STRING(255) | Original filename |
| file_path | STRING(500) | Stored path |
| file_size_bytes | INTEGER | Size |
| title | STRING(255) | Resume title |
| is_active | BOOLEAN | Currently used? |
| uploaded_at | DATE | Upload timestamp |
| download_count | INTEGER | # times downloaded by companies |

Instance methods:
- `setAsActive()` - deactivate others, set this active
- `recordDownload()` - increment counter

#### Comment Quality: 4/5

---

### 3.8 MatchScore + MatchingRule + OjtProgress Models ⭐⭐⭐⭐

**File:** `src/models/Matching.js`

#### MatchScore
Cached match scores between students and postings. Pre-calculated by MatchingService.

| Field | Type | Comment |
|-------|------|---------|
| id | INTEGER | PK |
| student_id | INTEGER | FK → Student, CASCADE |
| posting_id | INTEGER | FK → OjtPosting, CASCADE |
| overall_score | DECIMAL(5,2) | 0-100 final score |
| skill_score | DECIMAL(5,2) | Component: skill match |
| location_score | DECIMAL(5,2) | Component: location match |
| availability_score | DECIMAL(5,2) | Component: availability match |
| gpa_score | DECIMAL(5,2) | Component: GPA fit |
| academic_program_score | DECIMAL(5,2) | Component: program alignment |
| match_status | ENUM | 'highly_compatible','compatible','moderately_compatible','weak_match','not_compatible' |
| calculated_at | DATE | When computed |
| match_rank | INTEGER | Rank among postings for student (1st, 2nd, etc) |
| recommendation_reason | TEXT | Why recommended |

Indexes:
- `student_id, posting_id` (UNIQUE)
- `overall_score` (for sorting)
- `match_status`

Instance methods:
- `getMatchStatusDescription()` - human-readable status

#### MatchingRule
Configuration for matching algorithm (typically one global set)

| Field | Type | Default | Comment |
|-------|------|---------|---------|
| skill_weight | INTEGER | 40 | % weight for skill matching |
| location_weight | INTEGER | 20 | % weight for location |
| availability_weight | INTEGER | 20 | % weight for availability |
| gpa_weight | INTEGER | 10 | % weight for GPA |
| academic_program_weight | INTEGER | 10 | % weight for program |
| minimum_match_score | INTEGER | 60 | Threshold for recommendation |
| prioritize_required_skills | BOOLEAN | true | Must have ALL required skills? |
| allow_remote_flexibility | BOOLEAN | true | Remote postings get boost? |
| updated_by | INTEGER | FK → User (admin) | |
| updated_reason | STRING(500) | | Why rules changed |

Methods:
- `getCurrentRules()` (class) - get active rule set
- `validateWeights()` - ensure sum = 100

#### OjtProgress
Track student progress during active OJT placement

| Field | Type | Comment |
|-------|------|---------|
| id | INTEGER | PK |
| application_id | INTEGER | FK → Application, CASCADE (accepted application) |
| student_id | INTEGER | FK → Student |
| coordinator_id | INTEGER | FK → Coordinator (supervisor) |
| start_date | DATE | When OJT started |
| end_date | DATE | When actually ended |
| hours_completed | INTEGER | Hours done so far |
| total_hours_required | INTEGER | Hours needed |
| completion_percentage | INTEGER | 0-100 % complete |
| company_rating | DECIMAL(3,2) | Company's 1-5 star rating |
| performance_notes | TEXT | Feedback |
| progress_status | ENUM | 'in_progress','completed','failed','dropped' |
| final_report | TEXT | Completion report |

Instance methods:
- `updateCompletion(hoursCompleted)` - update hours, calculate %, auto-complete if ≥100%

#### Comment Quality: 4/5

---

### 3.9 AuditLog + Notification + Message Models ⭐⭐⭐⭐

**File:** `src/models/Audit.js`

#### AuditLog
Compliance & security audit trail

| Field | Type | Comment |
|-------|------|---------|
| id | INTEGER | PK |
| user_id | INTEGER | Optional: user who did action |
| user_role | STRING(50) | Role at time of action |
| entity_type | STRING(100) | "User", "Application", etc |
| entity_id | INTEGER | Record ID that changed |
| action | ENUM | 'create','update','delete','login','logout','view' |
| old_values | JSON | Before values (useful for diffs) |
| new_values | JSON | After values |
| ip_address | STRING(50) | Client IP |
| user_agent | TEXT | Browser info |
| reason | TEXT | Why this action |
| severity | ENUM | 'low','medium','high','critical' |
| status | ENUM | 'success','failed','pending' |
| error_message | TEXT | If failed |

Indexes: user_id, entity_type, entity_id, action, severity, composite indexes for queries

#### Notification
In-app messaging system

| Field | Type | Comment |
|-------|------|---------|
| id | INTEGER | PK |
| user_id | INTEGER | FK → User recipient |
| title | STRING(200) | Heading |
| message | TEXT | Body |
| notification_type | ENUM | 10 types: application_submitted, application_accepted, new_match, etc |
| related_entity_type | STRING(100) | "Application", "Posting", etc |
| related_entity_id | INTEGER | Link to entity |
| is_read | BOOLEAN | Read status |
| read_at | DATE | When read |
| priority | ENUM | 'low','normal','high','urgent' |
| expires_at | DATE | Auto-delete after date |
| action_url | STRING(500) | Click link (e.g., "/applications/123") |

Instance methods:
- `markAsRead()` - set is_read=true, read_at=now
- `createAndNotify()` (class) - factory method

#### Message
Direct messaging between users

| Field | Type | Comment |
|-------|------|---------|
| id | INTEGER | PK |
| sender_id | INTEGER | FK → User |
| recipient_id | INTEGER | FK → User |
| related_entity_type | STRING(100) | Optional context |
| related_entity_id | INTEGER | Optional entity link |
| subject | STRING(255) | For threads |
| body | TEXT | Message content |
| is_read | BOOLEAN | Read status |
| read_at | DATE | When read |

Instance methods:
- `markAsRead()` - set is_read + timestamp

#### Comment Quality: 4/5

---

### 3.10 PasswordResetToken Model ⭐⭐⭐

**File:** `src/models/PasswordResetToken.js`

| Field | Type | Comment |
|-------|------|---------|
| id | UUID | PK (UUID v4) |
| userId | UUID | FK → User, CASCADE |
| token | STRING(512) | JWT reset token (stored unhashed) |
| used | BOOLEAN | Has this token been used? |
| usedAt | DATE | When token was consumed |
| expiresAt | DATE | Token expiry (1 hour from creation) |
| createdAt | DATE | Timestamp |
| updatedAt | DATE | Timestamp |

Indexes:
- `userId` - find user's tokens
- `token` (UNIQUE) - prevent duplicates
- `expiresAt` - cleanup queries
- `used, expiresAt` - find unused/expired

Instance methods:
- `isValid()` - check if not used AND not expired
- `markAsUsed()` - set used=true, usedAt=now

#### Comment Quality: 3/5 - Basic

---

## 4. ALL ROUTES/ENDPOINTS

### 4.1 Authentication Routes (Public)

| HTTP | Path | Auth | Middleware | Service Method | Notes |
|------|------|------|------------|-----------------|-------|
| POST | `/api/auth/register` | NO | RateLimit-Auth | AuthService.register() | Create new account. Auto-creates role profile. Returns user + token. |
| POST | `/api/auth/login` | NO | RateLimit-Auth | AuthService.login() | Email + password login. Tracks failed attempts (max 5). Locks 30min. Returns token. |
| GET | `/api/auth/google/redirect` | NO | - | Passport + GoogleAuthService | Initiates Google OAuth flow. Query params: role, linking. Redirects to Google. |
| GET | `/api/auth/google/callback` | NO | - | Passport + GoogleAuthService | Google callback. Handles new/existing/linking scenarios. Returns token. |
| POST | `/api/auth/google/confirm-linking` | NO | - | GoogleAuthService.confirmAccountLinking() | User confirms linking Google to existing account. Requires userId, googleId, email. |
| POST | `/api/auth/google/link` | YES* | authMiddleware | GoogleAuthService.confirmAccountLinking() | Authenticated user links Google account. |
| DELETE | `/api/auth/google/unlink` | YES* | authMiddleware | GoogleAuthService.unlinkGoogleAccount() | Unlink Google (must have password). |
| GET | `/api/auth/google/status` | YES* | authMiddleware | - | Check if Google is linked for current user. |

*These require Bearer token in Authorization header

### 4.2 Student Profile Routes (Protected)

| HTTP | Path | Auth | Service | Response |
|------|------|------|---------|----------|
| GET | `/api/students/profile` | YES | StudentService.getProfile() | Student profile data |
| PUT | `/api/students/profile` | YES | StudentService.updateProfile() | Updated profile + audit log |
| GET | `/api/students/skills` | YES | StudentService.getSkills() | Array of StudentSkill objects |
| POST | `/api/students/skills` | YES | StudentService.addSkill() | Created StudentSkill |

### 4.3 Matching & Recommendations Routes (Protected)

| HTTP | Path | Auth | Service | Query Params | Purpose |
|------|------|------|---------|--------------|---------|
| GET | `/api/matches` | YES | StudentService.getMatchedPostings() | minScore | Fetch matched job postings (cached MatchScore records). Default minScore=60. |

### 4.4 Application Routes (Protected)

| HTTP | Path | Auth | Service | Details |
|------|------|------|---------|---------|
| POST | `/api/applications` | YES | StudentService.applyToPosting() | Submit application. Body: posting_id, cover_letter, resume_id. Triggers notification. |
| GET | `/api/applications` | YES | StudentService.getApplications() | List student's applications. Optional filter by status. |

### 4.5 Notification Routes (Protected)

| HTTP | Path | Auth | Service | Purpose |
|------|------|------|---------|---------|
| GET | `/api/notifications` | YES | NotificationService.getNotifications() | Paginated notification history. Query: page, limit. |
| PUT | `/api/notifications/:id/read` | YES | NotificationService.markAsRead() | Mark single notification as read. |

### 4.6 Current User Routes (Protected)

| HTTP | Path | Auth | Query | Returns |
|------|------|------|-------|---------|
| GET | `/api/user` | YES | - | User info + role-specific profile |

### 4.7 Utility Routes (Any)

| HTTP | Path | Auth | Response |
|------|------|------|----------|
| GET | `/health` | NO | {status, timestamp, environment} - Load balancer check |
| GET | `/api/version` | NO | {version, name, environment} |

### 4.8 Admin Routes

| HTTP | Path | Auth | Middleware | Purpose |
|------|------|------|-----------|---------|
| GET | `/api/audit-logs` | YES | rbacMiddleware(['admin']) | Fetch recent audit logs (admin only). Limit: 50 default. |

### Response Pattern

All responses follow:
```javascript
{
  message: "Action successful",
  data: {...},           // Actual data (optional)
  count: 5,              // Array count (optional)
  pagination: {          // For paginated endpoints
    total: 100,
    page: 1,
    limit: 10,
    totalPages: 10
  }
}
```

Error Response:
```javascript
{
  message: "Error description",
  statusCode: 400/401/403/404/422/500,
  errors: {...}          // Validation errors (optional)
}
```

---

## 5. MIDDLEWARE

### 5.1 Authentication Middleware (`src/middleware/auth.js`) ⭐⭐⭐⭐⭐

**Comment Quality:** 4/5

#### Functions:

1. **`authMiddleware(req, res, next)`**
   - Extracts Bearer token from `Authorization` header
   - Verifies JWT signature using `config.auth.secret`
   - Decodes and attaches user data to `req.user` (contains id, email, role)
   - Throws 401 if token missing/invalid/expired
   - **Flow:** Extract → Verify → Attach → Next

2. **`rbacMiddleware(allowedRoles = [])`**
   - Returns middleware function that checks user role
   - Compares `req.user.role` against allowed array
   - Returns 403 Forbidden if not authorized
   - If no roles specified, allows anyone authenticated
   - **Usage:** `rbacMiddleware(['admin', 'coordinator'])`

3. **`RateLimiter` class**
   - Constructor: `new RateLimiter(windowMs, maxRequests)`
   - Tracks requests by IP in Map<ip, timestamps[]>
   - Returns 429 if limit exceeded
   - Cleans up old timestamps outside window automatically
   - **Method:** `middleware()` returns Express middleware function
   - **Heuristic:** Gets client IP from X-Forwarded-For → X-Real-IP → connection.remoteAddress

4. **`createRateLimiters()` factory**
   - Returns object with different limiters:
     - `auth`: 5 attempts per 15 min (strict - brute force protection)
     - `general`: 100 per 15 min (standard)
     - `api`: 100 per 15 min (API endpoints)

---

### 5.2 Validation Middleware (`src/middleware/validation.js`) ⭐⭐⭐⭐

**Uses:** express-validator v7  
**Comment Quality:** 4/5

#### Main Handlers:

1. **`handleValidationErrors(req, res, next)`**
   - Processes validation results from express-validator
   - Aggregates errors by parameter name
   - Returns 422 with formatted error object

#### Validation Rule Sets:

1. **`authValidationRules()`** - Register/Login
   - email: valid format, trimmed, lowercased
   - password: min 8ch, 1 uppercase, 1 number, 1 special char
   - password_confirmation: must match password
   - name: 2-255ch, only letters/spaces/hyphens/apostrophes

2. **`studentUpdateRules()`** - Profile updates
   - first_name, last_name: 1-100ch (optional)
   - phone: valid mobile number (optional)
   - bio: max 1000ch (optional)
   - location/preferred_location: max 255ch (optional)
   - profile_picture_url: valid URL (optional)
   - availability dates: valid ISO8601 (optional)

3. **`jobPostingRules()`** - Job posting creation
   - title: 3-255ch
   - description: 20-5000ch
   - location: required, max 255ch
   - salary fields: positive integers (optional)
   - duration_weeks: 1-52
   - posting_status: 'active'|'closed'|'draft'

4. **`skillValidationRules()`** - Skill addition
   - skill_name: 2-100ch, alphanumeric + special chars (+,#,.,-)
   - proficiency_level: 'beginner'|'intermediate'|'advanced'|'expert'
   - years_of_experience: 0-50 (optional)
   - is_required: boolean (optional)

5. **`idParamRules()`** - ID parameters
   - `id`: positive integer

6. **`paginationRules()`** - Pagination
   - page: min 1 (optional)
   - limit: 1-100 (optional)
   - sort: 'asc'|'desc' (optional)

7. **`contactFormRules()`** - Public forms
   - name: 2-255ch
   - email: valid format
   - subject: 5-255ch
   - message: 10-5000ch
   - phone: mobile (optional)

---

## 6. CONFIGURATION

### 6.1 Environment Configuration (`src/config/env.js`) ⭐⭐⭐⭐

**Comment Quality:** 4/5

```javascript
config = {
  app: {
    name: "OJT System V2",
    env: 'development'|'production'|'test',
    debug: true/false,
    port: 5000,
    url: "http://localhost:5000"
  },
  
  database: {
    connection: 'sqlite',
    path: './database/ojt_system.db'
  },
  
  auth: {
    secret: "jwt-secret-key",
    expiresIn: "7d",
    bcryptRounds: 10
  },
  
  google: {
    clientId: string,
    clientSecret: string,
    devCallbackUrl: "http://localhost:5000/api/auth/google/callback",
    prodCallbackUrl: "https://ojt-system.vercel.app/api/auth/google/callback"
  },
  
  rateLimit: {
    windowMs: 900000,    // 15 minutes
    maxRequests: 100
  },
  
  cors: {
    origin: ['http://localhost:3000'],
    methods: ['GET','POST','PUT','DELETE'],
    credentials: true
  },
  
  logging: {
    level: 'info',
    file: './logs/app.log'    // Ignored on Vercel
  }
}
```

**Validation:** 
- Checks for required env vars upfront (fail-fast principle)
- Warns if Google OAuth not configured
- Handles Vercel serverless mode (skips DB requirements)

---

### 6.2 Database Configuration (`src/config/database.js`) ⭐⭐⭐⭐

**Comment Quality:** 4/5

- **Dialect:** SQLite (production can use PostgreSQL via environment)
- **Storage:**
  - Test: `:memory:` (in-memory, fast tests)
  - Local Dev: File-based `./database/ojt_system.db`
  - Vercel: `:memory:` (no persistent storage without DATABASE_URL)
- **Timestamps:** Enabled (createdAt, updatedAt auto-added)
- **Logging:** SQL queries logged in debug mode
- **Paranoid:** Soft deletes enabled (doesn't physically delete records)

**Connection Function:**
- `connectDatabase()`: Authenticates, syncs models
- `alter: true` in debug mode (allows schema changes)
- `force: true` in test mode (recreates all tables)
- `force: false, alter: false` in production (use migrations)

---

### 6.3 Passport Configuration (`src/config/passport.js`) ⭐⭐⭐⭐

**Comment Quality:** 4/5

#### Google OAuth Strategy:
- **Scope:** profile, email
- **Callback:** Dynamic based on env (dev vs prod)
- **Verification:**
  - Check if google_id exists (login)
  - Check if email exists (account linking)
  - Create new user if both not found
  - Auto-verify email for Google users
  - Auto-create student profile
- **Serialization:** Stores user ID in session
- **Deserialization:** Retrieves full user from DB using ID

#### Key Decisions:
- OAuth credentials optional (skips strategy if not configured)
- Email matching allows account linking flow
- New Google users default to 'student' role
- Student profile auto-created with 10% completeness (name + email)

---

## 7. UTILITIES

### 7.1 Error Handling (`src/utils/errorHandler.js`) ⭐⭐⭐⭐⭐

**Comment Quality:** 5/5 - Excellent

#### Classes & Functions:

1. **`AppError` (Custom Error Class)**
   ```javascript
   new AppError(message, statusCode, context)
   ```
   - Extends Error
   - Maintains stack trace
   - `toJSON()` method returns formatted response
   - Stack traces only in debug mode

2. **`Logger` (Static Logging Utility)**
   ```javascript
   Logger.error(message, error?, meta?)
   Logger.warn(message, meta?)
   Logger.info(message, meta?)
   Logger.debug(message, meta?)
   ```
   - Features:
     - Color-coded console output
     - Structured logging (not just strings)
     - Separate file logging for production (disabled on Vercel)
     - Different levels for filtering
     - Error details (stack traces)
   - Levels: ERROR (red), WARN (yellow), INFO (cyan), DEBUG (gray)

3. **`errorHandler` (Express Middleware)**
   - Must be LAST middleware
   - Catches all errors from routes/services
   - Logs error context (method, path, user-agent)
   - Returns appropriate status + message
   - Hides stack traces from clients in production

4. **`wrap(fn)` (Async Error Wrapper)**
   ```javascript
   app.get('/route', wrap(async (req, res) => {
     // Errors automatically caught & passed to error handler
   }))
   ```
   - Wraps async route handlers
   - Catches unhandled Promise rejections
   - Prevents app crashes from async errors

#### Benefits of Custom Error Class:
- Consistent error responses across API
- Built-in logging for difficult-to-debug issues
- Security (no internal stack traces to users)
- Structured error information

---

## 8. CODE QUALITY ASSESSMENT

### 8.1 JSDoc Coverage Analysis

#### Excellent (5/5 - 90%+ documented):
- ✅ **MatchingService** - Every method has WHY + WHAT comments
- ✅ **AuthService** - Comprehensive documentation, explains security decisions
- ✅ **errorHandler.js** - Full coverage, explains each class/method
- ✅ **Middleware/auth.js** - Well documented, shows flow clearly

#### Good (4/5 - 70-90% documented):
- ✅ **StudentService** - Most methods documented, some lack details
- ✅ **Models (User, Student, Company, OjtPosting)** - Fields documented, methods explained
- ✅ **GoogleAuthService** - OAuth flow well documented
- ✅ **server.js** - Routes documented with comments
- ✅ **Validation.js** - Rules explained

#### Adequate (3/5 - 50-70% documented):
- ⚠️ **Coordinator Model** - Basic docs, sparse instance methods
- ⚠️ **PasswordResetToken Model** - Functional but minimal comments

### 8.2 Inline Comment Coverage

| File | Type | Coverage | Issues |
|------|------|----------|--------|
| AuthService | Business Logic | 85% | Good WHY explanations |
| MatchingService | Algorithm | 95% | Excellent algorithm step-by-step |
| StudentService | CRUD | 75% | Missing transaction complexity details |
| Models | Schema | 80% | Field-level good, relationship docs missing |
| Middleware | Security | 85% | Auth flow clear, error cases explained |
| Routes | HTTP | 70% | Some routes lack detail |

### 8.3 What's Missing Comments

#### HIGH PRIORITY (Critical gaps):
1. **Model Associations (models/index.js)** - Relationships defined but no docs
   - WHY: Helps understand cascading, foreign key behavior
   - Solution: Add comments explaining one-to-many, many-to-many relationships
   
2. **Database Transactions** - Used in applyToPosting but not explained
   - WHY: Transactions are complex, easy to misuse
   - Solution: Document transaction pattern, rollback scenarios

3. **MatchingService Caching** - Score caching mentioned but no docs on cache invalidation
   - WHY: Cache stale? When recalculated? Critical for correctness
   - Solution: Add cache invalidation strategy

4. **Rate Limiter Algorithm** - IP tracking not fully explained
   - WHY: Edge case handling (X-Forwarded-For spoofing)?
   - Solution: Document proxy considerations

#### MEDIUM PRIORITY (Nice-to-have):
1. **Resume Upload** - StudentService.uploadResume() has no details on file handling
2. **Google OAuth Flow** - Some edge cases (consent screen, error handling) underdocumented
3. **Audit Log Cleanup** - AuditService.generateReport() doesn't explain retention policy

### 8.4 Code Quality Strengths

✅ **Separation of Concerns** - Services handle business logic, Models handle data, Middleware handles cross-cutting  
✅ **Error Handling** - Custom AppError, consistent error responses (no exception leaks)  
✅ **Security** - Input validation for all endpoints, bcrypt password hashing, JWT tokens, rate limiting, RBAC  
✅ **Database Design** - Proper normalization, cascading deletes, indexes on frequently queried fields  
✅ **Caching** - MatchScore pre-calculation improves performance  
✅ **Audit Trails** - Comprehensive logging for compliance  

### 8.5 Code Quality Areas for Improvement

⚠️ **Missing Transaction Boundaries** - Only applyToPosting uses transactions; other multi-step operations may have race conditions  
⚠️ **Hardcoded Constants** - Magic numbers (5 failed attempts, 30-min lock) should be config-driven  
⚠️ **Limited Validation** - Some fields accept any string (e.g., skill_name regex check missing)  
⚠️ **Cache Invalidation** - No strategy for refreshing stale MatchScores  
⚠️ **Error Messages** - Generic messages hide issues (good for security, bad for debugging)  

---

## 9. FRONTEND INTEGRATION POINTS

### 9.1 All Public Endpoints

| Endpoint | Method | Body/Query | Response | Notes |
|----------|--------|-----------|----------|-------|
| `/api/auth/register` | POST | {name, email, password, password_confirmation, role} | {user, token} | Returns JWT token for authentication |
| `/api/auth/login` | POST | {email, password} | {user, token} | 423 if account locked |
| `/api/auth/google/redirect?role=student` | GET | - | Redirect to Google | Stores role in session |
| `/api/auth/google/callback` | GET | - | {user, token} OR {requiresLinking, existingUserId} | Handles linking flow |
| `/api/auth/google/confirm-linking` | POST | {userId, googleId, email} | {user, token} | Confirm account linking |
| `/api/auth/google/link` | POST | {googleId, email} | {user, token} | Authenticated user links Google |
| `/api/auth/google/unlink` | DELETE | - | {user} | Requires password auth |
| `/api/auth/google/status` | GET | - | {google_linked, auth_provider} | Check if Google linked |
| `/api/students/profile` | GET | - | {user, profile} | Student profile data |
| `/api/students/profile` | PUT | {name, phone, location, ...} | {message, data} | Update allowed fields only |
| `/api/students/skills` | GET | - | {message, data[], count} | All skills for student |
| `/api/students/skills` | POST | {skill_name, proficiency_level, years_of_experience} | {message, data} | Add new skill |
| `/api/matches?minScore=60` | GET | query: minScore | {message, data[], count} | Cached match scores |
| `/api/applications` | POST | {posting_id, cover_letter, resume_id} | {message, data} | Submit application (race-safe) |
| `/api/applications` | GET | query: status | {message, data[], count} | List applications |
| `/api/notifications` | GET | query: page, limit | {message, data[], pagination} | Notification history |
| `/api/notifications/:id/read` | PUT | - | {message, data} | Mark notification read |
| `/api/user` | GET | - | {message, data: {user, profile}} | Current user info |
| `/health` | GET | - | {status, timestamp, environment} | Load balancer health check |

### 9.2 Error Response Pattern

All endpoints return consistent error format:

**400 Bad Request** - Validation failed
```json
{
  "message": "Validation failed",
  "statusCode": 422,
  "errors": {
    "email": ["Email must be valid"],
    "password": ["Password must contain at least one uppercase letter"]
  }
}
```

**401 Unauthorized** - Missing/invalid token
```json
{
  "message": "Invalid token",
  "statusCode": 401
}
```

**403 Forbidden** - Insufficient role
```json
{
  "message": "Forbidden. Required role: admin, coordinator",
  "statusCode": 403
}
```

**404 Not Found**
```json
{
  "message": "Student profile not found",
  "statusCode": 404
}
```

**409 Conflict** - Duplicate application
```json
{
  "message": "You have already applied to this posting",
  "statusCode": 409
}
```

**423 Locked** - Account locked
```json
{
  "message": "Account locked due to too many failed login attempts. Try again in 28 minutes",
  "statusCode": 423
}
```

**429 Too Many Requests** - Rate limited
```json
{
  "message": "Too many requests, please try again later",
  "statusCode": 429,
  "retryAfter": 60
}
```

### 9.3 Success Response Pattern

All successful endpoints return:

```javascript
{
  "message": "Action successful description",
  "data": {...},                    // Optional payload
  "count": 5,                       // For arrays
  "pagination": {                   // For paginated endpoints
    "total": 100,
    "page": 1,
    "limit": 10,
    "totalPages": 10
  }
}
```

### 9.4 Authentication Pattern for Frontend

**Token Storage & Usage:**

1. **Registration/Login Response:**
   ```json
   {
     "message": "Login successful",
     "user": {
       "id": 123,
       "name": "John Doe",
       "email": "john@example.com",
       "role": "student"
     },
     "token": "eyJhbGciOiJIUzI1NiIs..."
   }
   ```

2. **Store token in localStorage/sessionStorage:**
   ```javascript
   localStorage.setItem('token', response.token);
   ```

3. **Include in subsequent requests:**
   ```javascript
   Authorization: Bearer eyJhbGciOiJIUzI1NiIs...
   ```

4. **Token expiration:** 7 days by default (configurable)

5. **Google OAuth Token:**
   - Same format as email/password login
   - Token includes role for RBAC on frontend

### 9.5 Data Models Summary for Frontend

#### User Object
```javascript
{
  id: 1,
  name: "John Doe",
  email: "john@example.com",
  role: "student|company|coordinator|admin",
  status: "active|pending|suspended|inactive",
  auth_provider: "email|google"
}
```

#### Student Profile
```javascript
{
  id: 1,
  user_id: 1,
  first_name: "John",
  last_name: "Doe",
  bio: "Software developer",
  current_location: "Manila",
  preferred_location: "Manila",
  profile_completeness_percentage: 65,
  gpa: 3.8,
  academic_program: "Computer Science",
  year_of_study: "3rd",
  availability_start: "2026-05-01",
  availability_end: "2026-08-31"
}
```

#### Job Application
```javascript
{
  id: 5,
  student_id: 1,
  posting_id: 3,
  application_status: "submitted|under_review|shortlisted|rejected|hired|withdrawn",
  cover_letter: "I am interested...",
  match_score: 82,
  applied_at: "2026-04-14T10:30:00Z",
  ojtPosting: {...}  // Nested posting data
}
```

#### MatchScore (Recommendation)
```javascript
{
  id: 101,
  student_id: 1,
  posting_id: 3,
  overall_score: 82,
  skill_score: 85,
  location_score: 90,
  availability_score: 70,
  gpa_score: 80,
  academic_program_score: 75,
  match_status: "compatible",
  recommendation_reason: "Your skills align well with this position"
}
```

#### Notification
```javascript
{
  id: 1,
  user_id: 1,
  title: "Application Accepted!",
  message: "Congratulations! You have been accepted for...",
  notification_type: "application_accepted",
  is_read: false,
  priority: "urgent",
  action_url: "/applications/5"
}
```

### 9.6 Rate Limiting for Frontend

**Authentication endpoints:** 5 attempts per 15 minutes (per IP)
- Response on limit: `429 Too Many Requests`
- Header: `Retry-After: 900` (15 minutes in seconds)

**General endpoints:** 100 requests per 15 minutes

**Frontend handling:**
```javascript
if (response.status === 429) {
  const retryAfter = response.headers['retry-after'];
  console.log(`Rate limited. Retry in ${retryAfter} seconds`);
}
```

### 9.7 Validation Error Format for Frontend

```json
{
  "message": "Validation failed",
  "statusCode": 422,
  "errors": {
    "password": [
      "Password must be at least 8 characters",
      "Password must contain at least one uppercase letter"
    ],
    "email": [
      "Email must be valid"
    ]
  }
}
```

**Frontend error handling:**
```javascript
if (response.status === 422) {
  const errors = response.data.errors;
  Object.keys(errors).forEach(field => {
    console.log(`${field}: ${errors[field].join(', ')}`);
  });
}
```

---

## 10. MOST COMPLEX METHODS (Need Best Comments)

### 🔴 **URGENT - Needs Documentation:**

1. **`StudentService.applyToPosting()`** - Uses explicit database transaction with row-level lock
   - **Why Complex:** Race condition prevention for concurrent applications
   - **What it does:** Atomic operation ensuring positions don't oversell
   - **Missing:** Documentation of transaction flow, lock semantics

2. **`MatchingService.calculateScore()`** - Core matching algorithm
   - **Why Complex:** 5-factor weighted scoring with configurable rules
   - **What it does:** Combines skill/location/availability/GPA/program scores
   - **Missing:** Cache invalidation strategy

3. **`MatchingService.calculateSkillScore()`** - Skill matching logic
   - **Why Complex:** Distinguishes required vs preferred skills with weights
   - **What it does:** Handles skill name matching, proficiency levels
   - **Missing:** Edge cases (typos, synonym matching?)

### 🟡 **IMPORTANT - Needs Enhancement:**

4. **`AuthService.login()`** - Account locking logic
   - **Why Complex:** Security - tracks failed attempts, implements timeouts
   - **What it does:** 5 failures → lock 30 min
   - **Missing:** Why 5? Why 30min? (Config-driven constants)

5. **`GoogleAuthService.authenticateWithGoogle()`** - OAuth flow
   - **Why Complex:** Handles 3 scenarios: existing user, email exists, new user
   - **What it does:** Manages account creation, linking, authentication
   - **Missing:** Flow diagram for each scenario

6. **Models associations** - 15+ models with complex relationships
   - **Why Complex:** Cascading deletes, foreign key constraints
   - **What it does:** Defines relationship rules
   - **Missing:** Explanation of why each relationship exists, cascade implications

---

## 11. SUMMARY OF FINDINGS

### Architecture Quality: ⭐⭐⭐⭐ (8.5/10)

**Strengths:**
- Clean separation: Services (business logic) → Middleware → Models (data)
- Security: JWT auth, bcrypt hashing, rate limiting, RBAC, SQL injection prevention
- Error handling: Consistent error format, no exception leaks, proper logging
- Database: Proper normalization, cascading, indexes, transactions

**Weaknesses:**
- Cache invalidation undocumented (MatchScore stale data risk)
- Limited transactional boundaries (only applyToPosting uses it)
- Hardcoded constants (magic numbers for security thresholds)
- Some missing validation (e.g., skill_name regex)

### Documentation Quality: ⭐⭐⭐⭐ (8/10)

**Excellent:** MatchingService, AuthService, errorHandler
**Good:** Services, models, middleware, config
**Needs work:** Model associations, transaction patterns, cache strategy

### Code Quality: ⭐⭐⭐⭐ (8/10)

**What's well done:** Consistent style, DRY principle, modular design
**What needs improvement:** More transactional operations, better validation, cache invalidation docs

### Security: ⭐⭐⭐⭐⭐ (9/10)

**Strong:** Bcrypt hashing, JWT tokens, rate limiting, RBAC, input validation, audit logs
**Areas:** Password reset tokens stored plaintext in DB (should hash them too)

### Performance: ⭐⭐⭐ (7/10)

**Good:** Match score caching, indexes on frequently queried fields, connection pooling
**Areas:** No pagination on some endpoints, no query result caching (except MatchScore)

---

## 12. RECOMMENDATIONS FOR COMMENT ENHANCEMENT

### Immediate (Critical):
1. Add comments to `models/index.js` explaining each relationship + cascading rules
2. Document cache invalidation strategy in MatchingService
3. Add transaction examples/best practices in StudentService
4. Document account locking algorithm decision (why 5 attempts? why 30 min?)

### Short-term (Important):
1. Create architectural decision record (ADR) for major design choices
2. Add sequence diagrams for complex flows (OAuth, application submission)
3. Document configuration options with examples
4. Add error handling patterns guide

### Long-term (Nice-to-have):
1. API documentation (Swagger/OpenAPI)
2. Database schema diagram with relationships
3. Deployment guide (Vercel, PostgreSQL setup)
4. Performance tuning guide (index optimization, caching strategies)

---

**End of Analysis - April 14, 2026**
