# 02 - Database Schema & Data Model

**Version:** 2.0.0  
**Database:** SQLite  
**ORM:** Sequelize 6.35.0

---

## 📊 Database Overview

### Core Statistics

| Metric | Value |
|--------|-------|
| **Total Tables** | 15 |
| **Total Relationships** | 25+ |
| **Indexed Columns** | 30+ |
| **Soft Delete Tables** | Most (paranoid mode) |
| **Foreign Key Constraints** | All present |
| **Cascade Behavior** | DELETE cascades to child records |

### Database File

```
database/
├── ojt_system.db           # Production DB (SQLite file)
├── ojt_system.db-shm       # Temporary shared memory (SQLite)
├── ojt_system.db-wal       # Write-ahead log (SQLite)
└── migrations/             # Schema migration scripts
    ├── 20260415001-create-password-reset-tokens.js
    ├── 20260415002-add-account-lockout-columns.js
    └── 20260415003-add-database-indexes.js
```

---

## 🔑 Core Tables

### 1. **User** (Base Authentication Table)

**Purpose:** Central authentication & user management

**Columns:**

| Column | Type | Constraints | Purpose |
|--------|------|-----------|---------|
| `id` | INTEGER | PK, AUTO_INCREMENT | Unique identifier |
| `name` | VARCHAR(255) | NOT NULL | Full name |
| `email` | VARCHAR(255) | NOT NULL, UNIQUE | Email login identifier |
| `password` | VARCHAR(255) | NOT NULL | Bcrypt hashed password |
| `role` | ENUM | NOT NULL, DEFAULT 'student' | student, company, coordinator, admin |
| `status` | ENUM | NOT NULL, DEFAULT 'pending' | active, pending, suspended, inactive, locked |
| `email_verified_at` | DATETIME | NULL | Timestamp when email verified |
| `last_login_at` | DATETIME | NULL | Track last login for security |
| `remember_token` | VARCHAR(100) | NULL | Optional persistent session token |
| `failedLoginAttempts` | INTEGER | DEFAULT 0 | Count of failed login attempts |
| `lockedUntil` | DATETIME | NULL | When account was locked (locked after 5 failed attempts) |
| `createdAt` | DATETIME | DEFAULT NOW | Record creation timestamp |
| `updatedAt` | DATETIME | DEFAULT NOW | Record update timestamp |
| `deletedAt` | DATETIME | NULL | Soft delete timestamp (paranoid mode) |

**Indexes:**
```sql
CREATE INDEX idx_user_email ON users(email);
CREATE INDEX idx_user_role ON users(role);
CREATE INDEX idx_user_status ON users(status);
```

**Relationships:**
- `hasOne` Student (one-to-one, onDelete=CASCADE)
- `hasOne` Company (one-to-one, onDelete=CASCADE)
- `hasOne` Coordinator (one-to-one, onDelete=CASCADE)
- `hasMany` PasswordResetToken (one-to-many, onDelete=CASCADE)
- `hasMany` AuditLog (one-to-many, for user_id field)
- `hasMany` Notification (one-to-many)

**Security Notes:**
- Password always hashed with bcrypt (10 rounds)
- Failed login attempts tracked for brute-force protection
- Account locked after 5 failed attempts for 30 minutes
- Email used for login (case-insensitive, normalized)

---

### 2. **Student** (Student Profile)

**Purpose:** Student-specific profile information

**Columns:**

| Column | Type | Constraints | Purpose |
|--------|------|-----------|---------|
| `id` | INTEGER | PK, AUTO_INCREMENT | Unique identifier |
| `user_id` | INTEGER | FK, NOT NULL | Reference to User (CASCADE) |
| `first_name` | VARCHAR(100) | NULL | Student first name |
| `last_name` | VARCHAR(100) | NULL | Student last name |
| `phone` | VARCHAR(20) | NULL | Contact phone (numeric validation) |
| `bio` | TEXT | NULL | Student biography/about |
| `current_location` | VARCHAR(255) | NULL | Where student currently is |
| `preferred_location` | VARCHAR(255) | NULL | Where student wants OJT |
| `profile_picture_url` | VARCHAR(500) | NULL | URL to profile image |
| `availability_start` | DATETIME | NULL | When student can start OJT |
| `availability_end` | DATETIME | NULL | When student must finish OJT |
| `profile_completeness_percentage` | INTEGER | DEFAULT 0, 0-100 | Motivate profile completion |
| `gpa` | DECIMAL(3,2) | NULL, 0-4.0 | Student GPA if available |
| `academic_program` | VARCHAR(255) | NULL | Degree program (e.g., CS, Engineering) |
| `year_of_study` | ENUM | NULL | 1st, 2nd, 3rd, 4th, graduate |
| `createdAt` | DATETIME | DEFAULT NOW | Record creation |
| `updatedAt` | DATETIME | DEFAULT NOW | Record update |
| `deletedAt` | DATETIME | NULL | Soft delete |

**Indexes:**
```sql
CREATE INDEX idx_student_user_id ON students(user_id);
CREATE INDEX idx_student_preferred_location ON students(preferred_location);
```

**Relationships:**
- `belongsTo` User (many-to-one)
- `hasMany` StudentSkill (one-to-many, onDelete=CASCADE)
- `hasMany` Application (one-to-many, onDelete=CASCADE)
- `hasMany` MatchScore (one-to-many, onDelete=CASCADE)

**Instance Methods:**
- `calculateProfileCompleteness()` - Updates profile_completeness_percentage based on filled fields
- `getFullName()` - Returns first_name + last_name

---

### 3. **Company** (Company Profile)

**Purpose:** Company-specific information for job posting

**Columns:**

| Column | Type | Constraints | Purpose |
|--------|------|-----------|---------|
| `id` | INTEGER | PK, AUTO_INCREMENT | Unique identifier |
| `user_id` | INTEGER | FK, NOT NULL | Reference to User (CASCADE) |
| `company_name` | VARCHAR(255) | NULL | Official company name |
| `industry_type` | VARCHAR(100) | NULL | Industry/sector (Tech, Finance, etc) |
| `company_size` | ENUM | NULL | 1-50, 51-200, 201-500, 500+ |
| `company_website` | VARCHAR(500) | NULL | URL to company website (URL validation) |
| `phone` | VARCHAR(20) | NULL | Company phone for contact |
| `address` | VARCHAR(500) | NULL | Full company address |
| `city` | VARCHAR(100) | NULL | City headquarters |
| `country` | VARCHAR(100) | NULL | Country of operation |
| `description` | TEXT | NULL | Company description/about |
| `logo_url` | VARCHAR(500) | NULL | URL to company logo |
| `accreditation_status` | ENUM | NOT NULL | pending, approved, rejected, suspended |
| `accreditation_verified_at` | DATETIME | NULL | When company was verified |
| `average_rating` | DECIMAL(3,2) | DEFAULT 0, 0-5 | Student ratings average |
| `total_ratings` | INTEGER | DEFAULT 0 | Number of ratings received |
| `tax_id` | VARCHAR(50) | NULL | Tax ID for compliance |
| `is_approved_for_posting` | BOOLEAN | DEFAULT FALSE | Can post job openings? |
| `createdAt` | DATETIME | DEFAULT NOW | Record creation |
| `updatedAt` | DATETIME | DEFAULT NOW | Record update |
| `deletedAt` | DATETIME | NULL | Soft delete |

**Indexes:**
```sql
CREATE INDEX idx_company_user_id ON companies(user_id);
CREATE INDEX idx_company_accreditation ON companies(accreditation_status);
```

**Relationships:**
- `belongsTo` User (many-to-one)
- `hasMany` OjtPosting (one-to-many, onDelete=CASCADE)

**Business Rules:**
- Must be accredited before posting jobs
- Rating calculated from student reviews
- Can be suspended if ratings too low

---

### 4. **OjtPosting** (Job Postings)

**Purpose:** Job opportunities posted by companies

**Columns:**

| Column | Type | Constraints | Purpose |
|--------|------|-----------|---------|
| `id` | INTEGER | PK, AUTO_INCREMENT | Unique posting ID |
| `company_id` | INTEGER | FK, NOT NULL | Company posting this job |
| `title` | VARCHAR(255) | NOT NULL | Job title (e.g., Junior Developer) |
| `description` | TEXT | NOT NULL | Detailed job description |
| `location` | VARCHAR(255) | NOT NULL | Physical job location (used in location matching) |
| `allow_remote` | BOOLEAN | DEFAULT FALSE | Can be done remotely? |
| `duration_weeks` | INTEGER | NOT NULL, 1-52 | How long is OJT? |
| `start_date` | DATETIME | NULL | Preferred start date |
| `salary_range_min` | DECIMAL(12,2) | NULL, ≥0 | Minimum monthly salary |
| `salary_range_max` | DECIMAL(12,2) | NULL, ≥0 | Maximum monthly salary |
| `stipend` | BOOLEAN | DEFAULT FALSE | Is there a stipend/allowance? |
| `min_gpa` | DECIMAL(3,2) | NULL, 0-4.0 | GPA requirement |
| `academic_program` | VARCHAR(255) | NULL | Required program (e.g., Computer Science) |
| `min_year_of_study` | ENUM | DEFAULT 'any' | Minimum year of study |
| `posting_status` | ENUM | NOT NULL | active, closed, draft, archived |
| `positions_available` | INTEGER | NOT NULL, ≥1 | Number of openings |
| `positions_filled` | INTEGER | DEFAULT 0 | Applications accepted so far |
| `views_count` | INTEGER | DEFAULT 0 | Times posting viewed |
| `applications_count` | INTEGER | DEFAULT 0 | Total applications received |
| `createdAt` | DATETIME | DEFAULT NOW | Record creation |
| `updatedAt` | DATETIME | DEFAULT NOW | Record update |
| `deletedAt` | DATETIME | NULL | Soft delete |

**Indexes:**
```sql
CREATE INDEX idx_ojtposting_company_id ON ojtpostings(company_id);
CREATE INDEX idx_ojtposting_status ON ojtpostings(posting_status);
CREATE INDEX idx_ojtposting_location ON ojtpostings(location);
```

**Relationships:**
- `belongsTo` Company (many-to-one)
- `hasMany` PostingSkill (one-to-many, onDelete=CASCADE)
- `hasMany` Application (one-to-many, onDelete=CASCADE)
- `hasMany` MatchScore (one-to-many, onDelete=CASCADE)

---

### 5. **Application** (Student Applications)

**Purpose:** Track student applications to job postings

**Columns:**

| Column | Type | Constraints | Purpose |
|--------|------|-----------|---------|
| `id` | INTEGER | PK, AUTO_INCREMENT | Unique application ID |
| `student_id` | INTEGER | FK, NOT NULL | Student applying |
| `posting_id` | INTEGER | FK, NOT NULL | Job posting applied for |
| `resume_id` | INTEGER | FK, NULL | Resume submitted |
| `application_status` | ENUM | NOT NULL | submitted, under_review, shortlisted, rejected, hired, withdrawn |
| `cover_letter` | TEXT | NULL | Why student wants this position |
| `match_score` | DECIMAL(5,2) | NULL, 0-100 | Compatibility score |
| `company_feedback` | TEXT | NULL | Feedback from company |
| `rejection_reason` | VARCHAR(255) | NULL | Why student was rejected |
| `applied_at` | DATETIME | NOT NULL, DEFAULT NOW | Application timestamp |
| `reviewed_at` | DATETIME | NULL | When company reviewed |
| `interviewed_at` | DATETIME | NULL | When student was interviewed |
| `hired_at` | DATETIME | NULL | When student was hired |
| `notes` | TEXT | NULL | Internal notes |
| `createdAt` | DATETIME | DEFAULT NOW | Record creation |
| `updatedAt` | DATETIME | DEFAULT NOW | Record update |
| `deletedAt` | DATETIME | NULL | Soft delete |

**Indexes:**
```sql
CREATE INDEX idx_application_student_id ON applications(student_id);
CREATE INDEX idx_application_posting_id ON applications(posting_id);
CREATE INDEX idx_application_status ON applications(application_status);
CREATE INDEX idx_application_applied_at ON applications(applied_at);
CREATE UNIQUE INDEX idx_application_unique ON applications(student_id, posting_id);
```

**Relationships:**
- `belongsTo` Student (many-to-one)
- `belongsTo` OjtPosting (many-to-one)
- `belongsTo` Resume (optional, many-to-one)

**Business Rules:**
- Unique constraint: student can only apply once per posting
- Status workflow: submitted → under_review → shortlisted/rejected → hired/withdrawn
- match_score populated when application created (from MatchScore table)

---

### 6. **StudentSkill** (Student Skills)

**Purpose:** Track skills each student has with proficiency levels

**Columns:**

| Column | Type | Constraints | Purpose |
|--------|------|-----------|---------|
| `id` | INTEGER | PK, AUTO_INCREMENT | Unique ID |
| `student_id` | INTEGER | FK, NOT NULL | Which student |
| `skill_name` | VARCHAR(100) | NOT NULL | Skill name (e.g., Java, SQL) |
| `proficiency_level` | ENUM | DEFAULT 'beginner' | beginner, intermediate, advanced, expert |
| `years_of_experience` | DECIMAL(3,1) | NULL, 0-50 | Years of practical experience |
| `endorsed_count` | INTEGER | DEFAULT 0 | Endorsements from others |
| `createdAt` | DATETIME | DEFAULT NOW | Record creation |
| `updatedAt` | DATETIME | DEFAULT NOW | Record update |
| `deletedAt` | DATETIME | NULL | Soft delete |

**Indexes:**
```sql
CREATE INDEX idx_studentskill_student_id ON studentskills(student_id);
CREATE INDEX idx_studentskill_skill_name ON studentskills(skill_name);
CREATE INDEX idx_studentskill_proficiency ON studentskills(proficiency_level);
```

**Relationships:**
- `belongsTo` Student (many-to-one)

**Instance Methods:**
- `updateProficiency(newLevel)` - Update proficiency with validation
- `addEndorsement()` - Increment endorsed_count

---

### 7. **PostingSkill** (Required Skills for Jobs)

**Purpose:** Define which skills are required/preferred for each job

**Columns:**

| Column | Type | Constraints | Purpose |
|--------|------|-----------|---------|
| `id` | INTEGER | PK, AUTO_INCREMENT | Unique ID |
| `posting_id` | INTEGER | FK, NOT NULL | Job posting |
| `skill_name` | VARCHAR(100) | NOT NULL | Skill required |
| `is_required` | BOOLEAN | DEFAULT TRUE | Required vs preferred (affects matching weight) |
| `proficiency_required` | ENUM | DEFAULT 'intermediate' | Minimum skill level needed |
| `weight` | DECIMAL(3,2) | DEFAULT 1.0 | Importance weight in matching |
| `createdAt` | DATETIME | DEFAULT NOW | Record creation |
| `updatedAt` | DATETIME | DEFAULT NOW | Record update |
| `deletedAt` | DATETIME | NULL | Soft delete |

**Indexes:**
```sql
CREATE INDEX idx_postingskill_posting_id ON postingskills(posting_id);
CREATE INDEX idx_postingskill_is_required ON postingskills(is_required);
```

**Relationships:**
- `belongsTo` OjtPosting (many-to-one)

---

### 8. **MatchScore** (Cached Compatibility Scores)

**Purpose:** Pre-calculated match scores between students and postings

**Columns:**

| Column | Type | Constraints | Purpose |
|--------|------|-----------|---------|
| `id` | INTEGER | PK, AUTO_INCREMENT | Unique ID |
| `student_id` | INTEGER | FK, NOT NULL | Student being matched |
| `posting_id` | INTEGER | FK, NOT NULL | Job posting |
| `overall_score` | DECIMAL(5,2) | NOT NULL, 0-100 | Final compatibility score |
| `skill_score` | DECIMAL(5,2) | 0-100 | Skill match percentage (40% weight) |
| `location_score` | DECIMAL(5,2) | 0-100 | Location match (20% weight) |
| `availability_score` | DECIMAL(5,2) | 0-100 | Availability match (20% weight) |
| `gpa_score` | DECIMAL(5,2) | 0-100 | GPA fit (10% weight) |
| `academic_program_score` | DECIMAL(5,2) | 0-100 | Program alignment (10% weight) |
| `match_status` | ENUM | NOT NULL | highly_compatible, compatible, moderately_compatible, weak_match, not_compatible |
| `calculated_at` | DATETIME | NOT NULL | When score calculated |
| `match_rank` | INTEGER | NULL | Rank among this student's matches (1st best, 2nd, etc) |
| `recommendation_reason` | TEXT | NULL | Explanation for recommendation |
| `createdAt` | DATETIME | DEFAULT NOW | Record creation |
| `updatedAt` | DATETIME | DEFAULT NOW | Record update |
| `deletedAt` | DATETIME | NULL | Soft delete |

**Indexes:**
```sql
CREATE INDEX idx_matchscore_student_id ON matchscores(student_id);
CREATE INDEX idx_matchscore_posting_id ON matchscores(posting_id);
CREATE INDEX idx_matchscore_overall ON matchscores(overall_score);
```

**Relationships:**
- `belongsTo` Student (many-to-one)
- `belongsTo` OjtPosting (many-to-one)

**Algorithm Explanation:**
```
overall_score = 
  (skill_score * 0.40) +
  (location_score * 0.20) +
  (availability_score * 0.20) +
  (gpa_score * 0.10) +
  (academic_program_score * 0.10)

match_status:
  - overall_score ≥ 80 → highly_compatible
  - overall_score ≥ 60 → compatible
  - overall_score ≥ 40 → moderately_compatible
  - overall_score ≥ 20 → weak_match
  - overall_score < 20 → not_compatible
```

---

### 9. **AuditLog** (Compliance Logging)

**Purpose:** Track all sensitive operations for security and compliance

**Columns:**

| Column | Type | Constraints | Purpose |
|--------|------|-----------|---------|
| `id` | INTEGER | PK, AUTO_INCREMENT | Unique log ID |
| `user_id` | INTEGER | FK, NULL | Who performed action (null for system) |
| `user_role` | VARCHAR(50) | NULL | User's role at time of action |
| `entity_type` | VARCHAR(100) | NOT NULL | Table affected (User, Application, etc) |
| `entity_id` | INTEGER | NOT NULL | ID of record changed |
| `action` | ENUM | NOT NULL | create, update, delete, login, logout, view |
| `old_values` | JSON | NULL | Previous state (for updates) |
| `new_values` | JSON | NULL | New state (after change) |
| `ip_address` | VARCHAR(50) | NULL | Requester's IP address |
| `user_agent` | TEXT | NULL | Browser/client user-agent |
| `reason` | TEXT | NULL | Why action was taken |
| `severity` | ENUM | NOT NULL | low, medium, high, critical |
| `status` | ENUM | NOT NULL | success, failed, pending |
| `error_message` | TEXT | NULL | Error details if failed |
| `createdAt` | DATETIME | DEFAULT NOW | When logged |

**Indexes:**
```sql
CREATE INDEX idx_auditlog_user_id ON auditlogs(user_id);
CREATE INDEX idx_auditlog_entity_type ON auditlogs(entity_type);
CREATE INDEX idx_auditlog_action ON auditlogs(action);
CREATE INDEX idx_auditlog_severity ON auditlogs(severity);
```

**Relationships:**
- `belongsTo` User (optional, many-to-one)

**Logged Events:**
- User registration
- User login/logout
- Password changes
- Profile updates
- Application status changes
- Company accreditation changes
- Admin actions

---

### 10. **Notification** (In-App Notifications)

**Purpose:** Send notifications to users about important events

**Columns:**

| Column | Type | Constraints | Purpose |
|--------|------|-----------|---------|
| `id` | INTEGER | PK, AUTO_INCREMENT | Unique notification ID |
| `user_id` | INTEGER | FK, NOT NULL | User receiving notification |
| `notification_type` | ENUM | NOT NULL | application_received, application_accepted, profile_match, etc |
| `title` | VARCHAR(255) | NOT NULL | Notification title |
| `message` | TEXT | NOT NULL | Notification message |
| `related_entity_type` | VARCHAR(100) | NULL | Reference table (Application, OjtPosting, etc) |
| `related_entity_id` | INTEGER | NULL | Reference ID in that table |
| `is_read` | BOOLEAN | DEFAULT FALSE | Has user seen this? |
| `read_at` | DATETIME | NULL | When user read it |
| `action_url` | VARCHAR(500) | NULL | Link to related resource |
| `createdAt` | DATETIME | DEFAULT NOW | When sent |

**Indexes:**
```sql
CREATE INDEX idx_notification_user_id ON notifications(user_id);
CREATE INDEX idx_notification_is_read ON notifications(is_read);
```

**Relationships:**
- `belongsTo` User (many-to-one)

---

### 11. **PasswordResetToken** (Password Recovery)

**Purpose:** Secure password reset process

**Columns:**

| Column | Type | Constraints | Purpose |
|--------|------|-----------|---------|
| `id` | INTEGER | PK, AUTO_INCREMENT | Unique ID |
| `userId` | INTEGER | FK, NOT NULL | User resetting password |
| `token` | VARCHAR(500) | NOT NULL, UNIQUE | Reset token (cryptographically secure) |
| `expiresAt` | DATETIME | NOT NULL | Token expiration (1 hour) |
| `createdAt` | DATETIME | DEFAULT NOW | When created |
| `updatedAt` | DATETIME | DEFAULT NOW | When updated |

**Indexes:**
```sql
CREATE INDEX idx_password_reset_user_id ON passwordresettokens(userId);
CREATE INDEX idx_password_reset_token ON passwordresettokens(token);
```

**Relationships:**
- `belongsTo` User (many-to-one)

---

### 12. **Coordinator** (Coordinator Profile)

**Purpose:** Coordinator user profile (manages OJT program)

**Columns:**

| Column | Type | Constraints | Purpose |
|--------|------|-----------|---------|
| `id` | INTEGER | PK, AUTO_INCREMENT | Unique ID |
| `user_id` | INTEGER | FK, NOT NULL | Reference to User |
| `department` | VARCHAR(255) | NULL | Department coordinator works for |
| `max_students` | INTEGER | DEFAULT 100 | Max students they can manage |
| `students_managed` | INTEGER | DEFAULT 0 | Current count of managed students |
| `createdAt` | DATETIME | DEFAULT NOW | Record creation |
| `updatedAt` | DATETIME | DEFAULT NOW | Record update |
| `deletedAt` | DATETIME | NULL | Soft delete |

**Relationships:**
- `belongsTo` User (many-to-one)

---

### 13. **OjtProgress** (Application Progress)

**Purpose:** Track progress during OJT period

**Columns:**

| Column | Type | Constraints | Purpose |
|--------|------|-----------|---------|
| `id` | INTEGER | PK, AUTO_INCREMENT | Unique ID |
| `application_id` | INTEGER | FK, NOT NULL | Which application |
| `week_number` | INTEGER | NOT NULL | Progress week |
| `progress_percentage` | INTEGER | 0-100 | How far through OJT |
| `supervisor_notes` | TEXT | NULL | Notes from supervisor |
| `student_feedback` | TEXT | NULL | Student's feedback |
| `status` | ENUM | NOT NULL | on_track, needs_support, falling_behind |
| `createdAt` | DATETIME | DEFAULT NOW | Record creation |
| `updatedAt` | DATETIME | DEFAULT NOW | Record update |

**Relationships:**
- `belongsTo` Application (many-to-one)

---

### 14. **Resume** (Student Resumes)

**Purpose:** Store student resumes for applications

**Columns:**

| Column | Type | Constraints | Purpose |
|--------|------|-----------|---------|
| `id` | INTEGER | PK, AUTO_INCREMENT | Unique ID |
| `student_id` | INTEGER | FK, NOT NULL | Which student |
| `resume_url` | VARCHAR(500) | NOT NULL | URL to resume file |
| `file_name` | VARCHAR(255) | NOT NULL | Original file name |
| `file_size` | INTEGER | NOT NULL | File size in bytes |
| `is_default` | BOOLEAN | DEFAULT FALSE | Use this by default? |
| `createdAt` | DATETIME | DEFAULT NOW | Upload date |
| `updatedAt` | DATETIME | DEFAULT NOW | Last modified |

**Relationships:**
- `belongsTo` Student (many-to-one)
- `hasMany` Application (one-to-many)

---

### 15. **MatchingRule** (Matching Algorithm Config)

**Purpose:** Configure matching algorithm weights per institution

**Columns:**

| Column | Type | Constraints | Purpose |
|--------|------|-----------|---------|
| `id` | INTEGER | PK, AUTO_INCREMENT | Unique ID |
| `name` | VARCHAR(255) | NOT NULL | Rule set name |
| `skill_weight` | DECIMAL(3,2) | DEFAULT 0.40 | Skill factor weight (0-1) |
| `location_weight` | DECIMAL(3,2) | DEFAULT 0.20 | Location factor weight |
| `availability_weight` | DECIMAL(3,2) | DEFAULT 0.20 | Availability factor weight |
| `gpa_weight` | DECIMAL(3,2) | DEFAULT 0.10 | GPA factor weight |
| `academic_program_weight` | DECIMAL(3,2) | DEFAULT 0.10 | Program factor weight |
| `min_match_score` | INTEGER | DEFAULT 40 | Minimum score to show match |
| `is_active` | BOOLEAN | DEFAULT TRUE | Use these rules? |
| `created_by` | INTEGER | FK | Admin who created |
| `createdAt` | DATETIME | DEFAULT NOW | Record creation |

**Business Rules:**
- Sum of all weights should equal 1.0
- Can have multiple rule sets but only one active
- Allows customization per institution

---

## 🔄 Relationship Diagram

```
User (parent for many)
├── 1:1 Student
│   ├── 1:Many StudentSkill
│   ├── 1:Many Application
│   └── 1:Many MatchScore
│
├── 1:1 Company
│   └── 1:Many OjtPosting
│       ├── 1:Many PostingSkill
│       ├── 1:Many Application
│       └── 1:Many MatchScore
│
├── 1:1 Coordinator
│
└── 1:Many PasswordResetToken

Application
├── Many:1 Student
├── Many:1 OjtPosting
└── Many:1 Resume (optional)

MatchScore
├── Many:1 Student
└── Many:1 OjtPosting

AuditLog
└── Many:1 User (optional)

Notification
└── Many:1 User
```

---

## 🔐 Data Validation Rules

### User Table

```javascript
name: {
  length: 2-255,
  regex: /[a-zA-Z\s'-]/,
  message: "Name can only contain letters, spaces, hyphens"
}

email: {
  format: RFC 5322 email,
  unique: true,
  lowercase: true,
  normalized: true
}

password: {
  minimum length: 8 characters,
  must contain: uppercase letter,
  must contain: digit,
  must contain: special character (!@#$%^&*)
}

role: {
  enum: ['student', 'company', 'coordinator', 'admin'],
  default: 'student'
}

status: {
  enum: ['active', 'pending', 'suspended', 'inactive', 'locked'],
  default: 'pending'
}
```

### Student Table

```javascript
phone: numeric only, optional
gpa: 0.00-4.00, optional
year_of_study: enum or null
profile_completeness_percentage: 0-100
```

### Company Table

```javascript
company_website: valid URL or null
company_size: enum or null
average_rating: 0-5.00
accreditation_status: must be one of enum
```

### OjtPosting Table

```javascript
duration_weeks: 1-52
min_gpa: 0-4.0 or null
salary_range_min/max: ≥ 0
positions_available: ≥ 1
```

---

## 📈 Migration Scripts

As system evolved, migrations were added:

### Migration 1: Password Reset
- Added PasswordResetToken table
- Added expiryAt field
- Created refresh token logic

### Migration 2: Account Lockout
- Added failedLoginAttempts column to User
- Added lockedUntil column to User
- Added account status 'locked'

### Migration 3: Performance Indexes
- Added indexes on all FK columns
- Added indexes on frequently filtered columns
- Added composite indexes for common queries

---

## 🚀 Performance Considerations

### Query Optimization

1. **N+1 Problem Prevention**
   ```javascript
   // Bad: Creates N queries
   const students = await Student.findAll();
   const skills = await StudentSkill.findAll(); // Called per student ❌
   
   // Good: Single query with join
   const students = await Student.findAll({
     include: ['skills']  // Eager loading ✅
   });
   ```

2. **Selective Field Retrieval**
   ```javascript
   // Bad: Gets all columns
   const postings = await OjtPosting.findAll();
   
   // Good: Only needed fields
   const postings = await OjtPosting.findAll({
     attributes: ['id', 'title', 'location', 'salary_range_min']
   });
   ```

3. **Pagination for Large Results**
   ```javascript
   const page = 1;
   const limit = 20;
   const offset = (page - 1) * limit;
   const postings = await OjtPosting.findAll({
     limit,
     offset,
     order: [['createdAt', 'DESC']]
   });
   ```

---

## 🔄 Soft Deletes

Most tables use Sequelize's `paranoid: true` option:

```javascript
// Delete (soft)
await user.destroy(); // Sets deletedAt timestamp

// Restore
await user.restore(); // Clears deletedAt

// Force hard delete
await user.destroy({ force: true }); // Permanently deletes

// Excluded by default in queries
const users = await User.findAll(); // Only gets deletedAt IS NULL

// Include soft deleted
const users = await User.findAll({
  paranoid: false  // Gets all including deleted
});
```

---

## 📊 Database Statistics

```sql
-- Count records by table
SELECT 'User' as table_name, COUNT(*) as count FROM users
UNION ALL
SELECT 'Student', COUNT(*) FROM students
UNION ALL
SELECT 'Company', COUNT(*) FROM companies
UNION ALL
SELECT 'OjtPosting', COUNT(*) FROM ojtpostings
UNION ALL
SELECT 'Application', COUNT(*) FROM applications
-- ... etc for all 15 tables
```

---

**Next:** See [**03-API-REFERENCE.md**](./03-API-REFERENCE.md) for complete API documentation.
