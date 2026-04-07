# OJT System V2 - Database Schema Documentation

**Version:** 2.0  
**Database Type:** SQLite  
**Normalization Level:** 3NF (Third Normal Form)  
**Last Updated:** April 2026

---

## Table of Contents
1. [Schema Overview](#schema-overview)
2. [Entity-Relationship Diagram](#entity-relationship-diagram)
3. [Core Tables](#core-tables)
4. [Supporting Tables](#supporting-tables)
5. [Relationship Specifications](#relationship-specifications)
6. [Indexing Strategy](#indexing-strategy)
7. [Data Constraints & Validation](#data-constraints--validation)

---

## Schema Overview

### Table Count: 23 Core Tables

| Domain | Tables | Purpose |
|--------|--------|---------|
| Authentication | users | User accounts, roles, credentials |
| User Profiles | students, companies, coordinators | Role-specific data |
| Student Supplementary | student_skills, student_preferences, student_availability | Student metadata |
| Job Postings | ojt_postings, posting_skills | Companies' job listings |
| Applications | applications | Student-to-job applications |
| Matching | match_scores, matching_rules | Intelligent job matching |
| Progress & Tracking | ojt_progress, resumes | Training progress logging |
| Communication | notifications, messages | In-app messaging |
| Compliance | audit_logs, contact_messages | Audit trail & public forms |
| Support | faqs, ojt_guidelines | Knowledge base |
| Infrastructure | password_reset_tokens, sessions, jobs, cache | Laravel system tables |

---

## Entity-Relationship Diagram

```
┌─────────────────────────────────────────────────────────────────┐
│                         CORE DOMAIN                             │
├─────────────────────────────────────────────────────────────────┤

                            ┌──────────┐
                            │  Users   │ (authentication)
                            └────┬─────┘
                    ┌───────────┼───────────┐
                    │           │           │
             ┌──────▼───┐  ┌────▼────┐  ┌──▼──────┐
             │ Students │  │Companies │  │Coord.   │
             └──────┬───┘  └────┬─────┘  └──┬─────┘
                    │           │           │
          ┌─────────┼───────┐   │           │
          │         │       │   │ (job      │
     ┌────▼──┐ ┌───▼──┐ ┌──▼──┐postings) │
     │Skills │ │Prefs │ │Avail.│ ┌───────▼──────┐
     └───────┘ └──────┘ └──────┘ │OjtPostings   │
                                  └───────┬──────┘
     ┌──────┐                             │
     │Resume│ ◄──┐  (student applies)    │
     └──┬───┘    │                        │
        │        │  ┌──────────────────────┘
        │        │  │
        │     ┌──▼──────────┐
        └────►│Applications │
               └──┬──────────┘
                  │
         ┌────────┼────────┐
         │        │        │
    ┌────▼──┐ ┌──▼───┐ ┌──▼────────┐
    │Resume │ │Posting│ │OjtProgress│
    └───────┘ └──────┘ └───────────┘

    ┌──────────────────────────────────────┐
    │      MATCHING & INTELLIGENCE         │
    ├──────────────────────────────────────┤
    │ ┌──────────────┐  ┌────────────────┐ │
    │ │ Match Scores │  │Matching Rules  │ │
    │ └──────────────┘  └────────────────┘ │
    └──────────────────────────────────────┘

    ┌──────────────────────────────────────┐
    │    COMMUNICATION & COMPLIANCE        │
    ├──────────────────────────────────────┤
    │ ┌───────────────┐  ┌──────────────┐  │
    │ │Notifications  │  │  Audit Logs  │  │
    │ └───────────────┘  └──────────────┘  │
    └──────────────────────────────────────┘
```

---

## Core Tables

### 1. users (Base Authentication)

**Purpose:** Store all user accounts across all roles

**Schema:**
```
Column Name           | Type      | Constraint      | Notes
──────────────────────┼───────────┼─────────────────┼──────────────
id                   | BIGINT    | PRIMARY KEY     | Auto-increment
name                 | VARCHAR   | NOT NULL        | Full name
email                | VARCHAR   | UNIQUE, NOT NULL| Login identifier
email_verified_at    | TIMESTAMP | NULLABLE        | Email verification
password             | VARCHAR   | NOT NULL        | Bcrypt hashed
role                 | ENUM      | NOT NULL        | student|company|coordinator|admin
status               | ENUM      | NOT NULL, DEFAULT| active|pending|suspended
last_login_at        | TIMESTAMP | NULLABLE        | Last successful login
remember_token       | VARCHAR   | NULLABLE        | Session token
created_at           | TIMESTAMP | NOT NULL        | Record creation time
updated_at           | TIMESTAMP | NOT NULL        | Last update time
```

**Role Distribution:**
- **student**: Regular students seeking OJT placements (auto-active)
- **company**: Organizations providing OJT placements (pending approval)
- **coordinator**: Academic supervisors (pending approval)
- **admin**: System administrators

**Indexes:**
```
PRIMARY: id
UNIQUE: email (login lookups)
INDEX: role (role-based filtering)
INDEX: status (active user queries)
```

**Relationships:**
- Has One → student
- Has One → company
- Has One → coordinator
- Has Many → notifications
- Has Many → sent_messages
- Has Many → audit_logs

---

### 2. students (Student Profiles)

**Purpose:** Extended student information beyond authentication

**Schema:**
```
Column Name          | Type      | Constraint      | Notes
─────────────────────┼───────────┼─────────────────┼──────────────
id                  | BIGINT    | PRIMARY KEY     | Auto-increment
user_id             | BIGINT    | FK to users     | Reference to user Account
first_name          | VARCHAR   | NOT NULL        | Given name
last_name           | VARCHAR   | NOT NULL        | Family name
phone               | VARCHAR   | NULLABLE        | Contact number
address             | TEXT      | NULLABLE        | Physical address
school              | VARCHAR   | NULLABLE        | School/University name
course              | VARCHAR   | NULLABLE        | Program/Course
year_level          | INTEGER   | NULLABLE        | 1-4 (year in course)
profile_completeness| DECIMAL   | DEFAULT 0       | % profile filled (0-100)
created_at          | TIMESTAMP | NOT NULL        | Creation time
updated_at          | TIMESTAMP | NOT NULL        | Last update time
```

**Profile Completeness Calculation:**
```
Completed fields:
├─ user.name (10%)
├─ user.email (10%)
├─ first_name + last_name (10%)
├─ phone (10%)
├─ address (10%)
├─ school & course (20%)
├─ skills (10%)
├─ preferences (10%)
└─ availability (10%)
─────────────────────
TOTAL: 100%
```

**Indexes:**
```
PRIMARY: id
FK: user_id
INDEX: (first_name, last_name) - searching students
```

**Relationships:**
- Belongs To → user
- Has Many → student_skills
- Has One → student_preferences
- Has One → student_availability
- Has Many → resumes
- Has One → active_resume (where is_active=true)
- Has Many → applications
- Has Many → match_scores

---

### 3. companies (Company Profiles)

**Purpose:** Organization information for job posting companies

**Schema:**
```
Column Name            | Type      | Constraint      | Notes
───────────────────────┼───────────┼─────────────────┼──────────────
id                    | BIGINT    | PRIMARY KEY     | Auto-increment
user_id               | BIGINT    | FK to users     | Reference to user account
company_name          | VARCHAR   | NOT NULL        | Official company name
industry              | VARCHAR   | NULLABLE        | Industry classification
address               | TEXT      | NULLABLE        | Company address
description           | TEXT      | NULLABLE        | About company
contact_person        | VARCHAR   | NULLABLE        | Primary contact name
contact_phone         | VARCHAR   | NULLABLE        | Contact number
accreditation_status  | VARCHAR   | NULLABLE        | Verified|Pending|Rejected
created_at            | TIMESTAMP | NOT NULL        | Creation time
updated_at            | TIMESTAMP | NOT NULL        | Last update time
```

**Accreditation Workflow:**
```
New Company Registration
    ↓
Status: "Pending" (requires admin review)
    ↓
Admin Review
    ├─ Approve → "Verified" (can post jobs)
    └─ Reject → "Rejected" (cannot post)
```

**Indexes:**
```
PRIMARY: id
FK: user_id
INDEX: accreditation_status (filter by approved companies)
```

**Relationships:**
- Belongs To → user
- Has Many → ojt_postings (all job postings)

---

### 4. coordinators (Academic Coordinators)

**Purpose:** Track academic supervisors for student monitoring

**Schema:**
```
Column Name         | Type      | Constraint      | Notes
────────────────────┼───────────┼─────────────────┼──────────────
id                  | BIGINT    | PRIMARY KEY     | Auto-increment
user_id             | BIGINT    | FK to users     | Reference to user account
first_name          | VARCHAR   | NOT NULL        | Given name
last_name           | VARCHAR   | NOT NULL        | Family name
department          | VARCHAR   | NULLABLE        | School department
school_affiliation  | VARCHAR   | NULLABLE        | School/Institution name
created_at          | TIMESTAMP | NOT NULL        | Creation time
updated_at          | TIMESTAMP | NOT NULL        | Last update time
```

**Relationships:**
- Belongs To → user

---

### 5. ojt_postings (Job Postings)

**Purpose:** Job opportunities offered by companies

**Schema:**
```
Column Name         | Type      | Constraint      | Notes
────────────────────┼───────────┼─────────────────┼──────────────
id                  | BIGINT    | PRIMARY KEY     | Auto-increment
company_id          | BIGINT    | FK to companies | Posted by company
title               | VARCHAR   | NOT NULL        | Job title
description         | TEXT      | NULLABLE        | Full job description
location            | VARCHAR   | NULLABLE        | Work location
industry            | VARCHAR   | NULLABLE        | Industry type
slots               | UNSIGNED INT| NOT NULL      | Total positions available
slots_filled        | UNSIGNED INT| DEFAULT 0    | Currently filled positions
duration            | VARCHAR   | NULLABLE        | e.g., "3 months", "6 months"
schedule            | JSON      | NULLABLE        | Weekly schedule (days/hours)
status              | ENUM      | NOT NULL        | active|inactive|closed
created_at          | TIMESTAMP | NOT NULL        | Creation time
updated_at          | TIMESTAMP | NOT NULL        | Last update time
```

**Status Workflow:**
```
Company Creates Posting
    ↓
Status: "active" (accepting applications)
    ↓
┌──────────────────┬───────────────────┐
▼                  ▼                   ▼
All slots filled   Company stops       Time expires
    │              accepting jobs      │
    └──────────────┬────────────────────┘
                   ▼
        Status: "closed"
```

**Schedule JSON Format:**
```json
{
  "monday": {"start": "08:00", "end": "17:00"},
  "wednesday": {"start": "08:00", "end": "17:00"},
  "friday": {"start": "08:00", "end": "17:00"}
}
```

**Indexes:**
```
PRIMARY: id
FK: company_id (find company's postings)
INDEX: status (find active postings)
INDEX: (status, slots_filled < slots) - find open positions
```

**Relationships:**
- Belongs To → company
- Has Many → posting_skills
- Has Many → applications
- Has Many → match_scores

---

### 6. applications (OJT Applications)

**Purpose:** Student applications to job postings

**Schema:**
```
Column Name         | Type      | Constraint      | Notes
────────────────────┼───────────┼─────────────────┼──────────────
id                  | BIGINT    | PRIMARY KEY     | Auto-increment
student_id          | BIGINT    | FK to students  | Applying student
ojt_posting_id      | BIGINT    | FK to postings  | Applied position
resume_id           | BIGINT    | FK to resumes   | NULLABLE
status              | VARCHAR   | NOT NULL        | pending|accepted|rejected
cover_letter        | TEXT      | NULLABLE        | Application message
created_at          | TIMESTAMP | NOT NULL        | Application date
updated_at          | TIMESTAMP | NOT NULL        | Last update
```

**Status Transitions:**
```
Student Submits Application
    ↓
Status: "pending" (awaiting company response)
    ↓
┌──────────────────────┬──────────────────────┐
▼                      ▼
Company Accepts        Company Rejects
    │                      │
    ▼                      ▼
Status: "accepted"    Status: "rejected"
    │
    └─► Creates OjtProgress record
```

**Unique Constraint:**
```
UNIQUE(student_id, ojt_posting_id)
↳ A student can only apply once per posting
```

**Indexes:**
```
PRIMARY: id
FK: student_id (find student's applications)
FK: ojt_posting_id (find posting's applications)
FK: resume_id (find applications using resume)
INDEX: status (find pending applications)
INDEX: (student_id, status) - find student's accepted applications
```

**Relationships:**
- Belongs To → student
- Belongs To → ojt_posting
- Belongs To → resume
- Has One → ojt_progress

---

### 7. ojt_progress (Training Progress)

**Purpose:** Track student work completed during OJT

**Schema:**
```
Column Name         | Type      | Constraint      | Notes
────────────────────┼───────────┼─────────────────┼──────────────
id                  | BIGINT    | PRIMARY KEY     | Auto-increment
application_id      | BIGINT    | FK to applicat. | UNIQUE
student_id          | BIGINT    | FK to students  | Redundant for queries
hours_completed     | DECIMAL   | DEFAULT 0       | Total hours worked
hours_required      | DECIMAL   | NULLABLE        | Target hours
documents_submitted | INTEGER   | DEFAULT 0       | # of documents uploaded
status              | VARCHAR   | NOT NULL        | in_progress|submitted|approved
submitted_at        | TIMESTAMP | NULLABLE        | When submitted
approved_at         | TIMESTAMP | NULLABLE        | When approved
approval_notes      | TEXT      | NULLABLE        | Coordinator feedback
created_at          | TIMESTAMP | NOT NULL        | Creation time
updated_at          | TIMESTAMP | NOT NULL        | Last update time
```

**Progress Workflow:**
```
Application Accepted
    ↓
OjtProgress Created (status: in_progress)
    ↓
Student logs hours & uploads documents
    ↓
Student submits completion (status: submitted)
    ↓
Coordinator reviews & approves (status: approved)
    ↓
OJT Completed ✓
```

**Indexes:**
```
PRIMARY: id
UNIQUE: application_id (one progress per application)
FK: student_id
```

**Relationships:**
- Belongs To → application
- Belongs To → student

---

## Supporting Tables

### 8. student_skills

**Schema:**
```
id | student_id (FK) | skill_name (VARCHAR) | proficiency (enum: beginner|intermediate|advanced) | created_at | updated_at
```

**Proficiency Levels:**
- beginner: Foundational knowledge
- intermediate: Practical working knowledge
- advanced: Expert-level capability

**Matching Impact:** Required skills for postings are compared against student skills.

---

### 9. student_preferences

**Schema:**
```
id | student_id (FK, UNIQUE) | preferred_location (VARCHAR) | preferred_industry (VARCHAR) | preferred_duration (VARCHAR) | created_at | updated_at
```

**One-to-One Relationship:** Each student has exactly one preference record.

---

### 10. student_availability

**Schema:**
```
id | student_id (FK, UNIQUE) | available_from (DATE) | available_until (DATE) | preferred_schedule (VARCHAR) | created_at | updated_at
```

---

### 11. resumes

**Schema:**
```
Column Name     | Type      | Constraint      | Notes
────────────────┼───────────┼─────────────────┼──────────────
id              | BIGINT    | PRIMARY KEY     | Auto-increment
student_id      | BIGINT    | FK to students  | Owner
file_name       | VARCHAR   | NOT NULL        | Original filename
file_path       | VARCHAR   | NOT NULL        | Storage path
mime_type       | VARCHAR   | NULLABLE        | application/pdf
file_size       | BIGINT    | NULLABLE        | Bytes
is_active       | BOOLEAN   | DEFAULT false   | Currently used for applications
created_at      | TIMESTAMP | NOT NULL        | Upload time
updated_at      | TIMESTAMP | NOT NULL        | Last update
```

**Active Resume Logic:**
```
When student applies without specifying resume:
├─ Use is_active = true resume
└─ If none exists, application fails

When student sets new active resume:
├─ Set previous active resume to false
└─ Set new resume to true
```

**Indexes:**
```
PRIMARY: id
FK: student_id
INDEX: (student_id, is_active) - find student's active resume
```

---

### 12. posting_skills

**Schema:**
```
Column Name     | Type      | Constraint      | Notes
────────────────┼───────────┼─────────────────┼────────────────────────
id              | BIGINT    | PRIMARY KEY     | Auto-increment
ojt_posting_id  | BIGINT    | FK to postings  | Which posting
skill_name      | VARCHAR   | NOT NULL        | Skill required
is_required     | BOOLEAN   | DEFAULT true    | Must-have or nice-to-have
proficiency_min | VARCHAR   | NULLABLE        | Minimum level required
created_at      | TIMESTAMP | NOT NULL        | Creation time
updated_at      | TIMESTAMP | NOT NULL        | Last update time
```

**Matching Algorithm Use:**
```
When calculating skill score:
├─ Get all skills where is_required = true
├─ Check intersection with student's skills
├─ Calculate percentage match
└─ Apply skill_weight from MatchingRule
```

---

### 13. match_scores (Matching Algorithm Results)

**Schema:**
```
Column Name         | Type      | Constraint      | Notes
────────────────────┼───────────┼─────────────────┼──────────────
id                  | BIGINT    | PRIMARY KEY     | Auto-increment
student_id          | BIGINT    | FK to students  | Evaluated student
ojt_posting_id      | BIGINT    | FK to postings  | Evaluated posting
skill_score         | INTEGER   | 0-100           | Skill match %
location_score      | INTEGER   | 0-100           | Location match %
availability_score  | INTEGER   | 0-100           | Schedule match %
total_score         | INTEGER   | 0-100           | Weighted composite
created_at          | TIMESTAMP | NOT NULL        | Calculation time
updated_at          | TIMESTAMP | NOT NULL        | Recalculation time
```

**Composite Score Formula:**
```
total_score = (
    skill_score × rule.skill_weight +
    location_score × rule.location_weight +
    availability_score × rule.availability_weight
) / 100
```

**Unique Constraint:**
```
UNIQUE(student_id, ojt_posting_id)
↳ One score per student-posting pair
```

**Indexes:**
```
PRIMARY: id
UNIQUE: (student_id, ojt_posting_id)
INDEX: (student_id, total_score DESC) - find top recommendations
INDEX: (ojt_posting_id, total_score DESC) - find top candidates
```

---

### 14. matching_rules (Matching Algorithm Configuration)

**Schema:**
```
Column Name         | Type      | Constraint      | Notes
────────────────────┼───────────┼─────────────────┼──────────────
id                  | BIGINT    | PRIMARY KEY     | Auto-increment
rule_name           | VARCHAR   | NOT NULL        | e.g., "Default Rules"
skill_weight        | INTEGER   | NOT NULL        | 0-100 (%)
location_weight     | INTEGER   | NOT NULL        | 0-100 (%)
availability_weight | INTEGER   | NOT NULL        | 0-100 (%)
minimum_score       | INTEGER   | DEFAULT 30      | Min score to recommend
is_active           | BOOLEAN   | DEFAULT true    | Currently in use
created_at          | TIMESTAMP | NOT NULL        | Creation time
updated_at          | TIMESTAMP | NOT NULL        | Last update time
```

**Weight Distribution:**
```
Constraint: skill_weight + location_weight + availability_weight ≤ 100

Example (must sum to 100):
├─ skill_weight: 50 (skills most important)
├─ location_weight: 30
└─ availability_weight: 20
```

**Admin Configuration:**
```
Scenario 1: Skills-focused matching
├─ skill_weight: 60%
├─ location_weight: 20%
└─ availability_weight: 20%

Scenario 2: Location-focused
├─ skill_weight: 30%
├─ location_weight: 50%
└─ availability_weight: 20%
```

---

### 15. notifications

**Schema:**
```
Column Name     | Type      | Constraint      | Notes
────────────────┼───────────┼─────────────────┼──────────────
id              | BIGINT    | PRIMARY KEY     | Auto-increment
user_id         | BIGINT    | FK to users     | Recipient
title           | VARCHAR   | NOT NULL        | Notification title
message         | TEXT      | NOT NULL        | Notification content
type            | VARCHAR   | NOT NULL        | info|success|warning|error
link            | VARCHAR   | NULLABLE        | Deep link in frontend
is_read         | BOOLEAN   | DEFAULT false   | Read status
created_at      | TIMESTAMP | NOT NULL        | Sent time
updated_at      | TIMESTAMP | NOT NULL        | Last updated
```

**Notification Types & Examples:**
```
type: 'info'
├─ "New Job Recommendation"
└─ "Your profile is 50% complete"

type: 'success'
├─ "Application Submitted"
└─ "OJT Progress Approved"

type: 'warning'
├─ "Application Deadline: 2 days"
└─ "Missing documents for OJT"

type: 'error'
├─ "Application Rejected"
└─ "Document Upload Failed"
```

**Indexes:**
```
PRIMARY: id
FK: user_id
INDEX: (user_id, is_read) - unread notifications
INDEX: (user_id, created_at DESC) - recent notifications
```

---

### 16. audit_logs (Compliance & Forensics)

**Schema:**
```
Column Name     | Type      | Constraint      | Notes
────────────────┼───────────┼─────────────────┼──────────────────────────
id              | BIGINT    | PRIMARY KEY     | Auto-increment
user_id         | BIGINT    | FK to users     | NULLABLE, who performed
action          | VARCHAR   | NOT NULL        | e.g., "create", "update", "delete"
entity_type     | VARCHAR   | NULLABLE        | Model name (Application, User)
entity_id       | BIGINT    | NULLABLE        | ID of changed record
old_values      | JSON      | NULLABLE        | Previous state
new_values      | JSON      | NULLABLE        | Current state
ip_address      | VARCHAR   | NULLABLE        | Source IP
created_at      | TIMESTAMP | NOT NULL        | Timestamp
```

**Audit Examples:**
```
Example 1: Student Updates Profile
{
  "user_id": 5,
  "action": "update",
  "entity_type": "Student",
  "entity_id": 5,
  "old_values": {"phone": "555-1234"},
  "new_values": {"phone": "555-5678"},
  "ip_address": "192.168.1.1",
  "created_at": "2026-04-07 14:32:00"
}

Example 2: Application Submission
{
  "user_id": 5,
  "action": "create",
  "entity_type": "Application",
  "entity_id": 42,
  "old_values": null,
  "new_values": {"student_id": 5, "ojt_posting_id": 3, "status": "pending"},
  "ip_address": "192.168.1.1",
  "created_at": "2026-04-07 14:35:00"
}
```

**Indexes:**
```
PRIMARY: id
INDEX: (user_id, created_at DESC) - user activity timeline
INDEX: entity_type - filter by entity type
INDEX: action - filter by action
```

---

### 17. messages (Direct Messaging)

**Schema:**
```
Column Name     | Type      | Constraint      | Notes
────────────────┼───────────┼─────────────────┼──────────────
id              | BIGINT    | PRIMARY KEY     | Auto-increment
sender_id       | BIGINT    | FK to users     | Message sender
recipient_id    | BIGINT    | FK to users     | Message recipient
subject         | VARCHAR   | NULLABLE        | Message topic
body            | TEXT      | NOT NULL        | Message content
is_read         | BOOLEAN   | DEFAULT false   | Read status
created_at      | TIMESTAMP | NOT NULL        | Sent time
updated_at      | TIMESTAMP | NOT NULL        | Last update
```

**Current Status:** Placeholder for future implementation

---

### 18. faqs (Knowledge Base)

**Schema:**
```
Column Name     | Type      | Constraint      | Notes
────────────────┼───────────┼─────────────────┼──────────────
id              | BIGINT    | PRIMARY KEY     | Auto-increment
question        | TEXT      | NOT NULL        | FAQ question
answer          | TEXT      | NOT NULL        | FAQ answer
category        | VARCHAR   | NULLABLE        | e.g., "Student", "Company"
display_order   | INTEGER   | DEFAULT 0       | Sort order
status          | VARCHAR   | DEFAULT "active"| active|inactive
created_at      | TIMESTAMP | NOT NULL        | Creation time
updated_at      | TIMESTAMP | NOT NULL        | Last update time
```

---

### 19. ojt_guidelines (OJT Information)

**Schema:**
```
Column Name     | Type      | Constraint      | Notes
────────────────┼───────────┼─────────────────┼──────────────
id              | BIGINT    | PRIMARY KEY     | Auto-increment
title           | VARCHAR   | NOT NULL        | Guideline title
content         | TEXT      | NOT NULL        | Guidelines text
version         | VARCHAR   | NULLABLE        | "1.0", "2.0"
effective_date  | DATE      | NULLABLE        | When this version applies
status          | VARCHAR   | DEFAULT "active"| active|archived
created_at      | TIMESTAMP | NOT NULL        | Creation time
updated_at      | TIMESTAMP | NOT NULL        | Last update time
```

---

### 20. contact_messages (Public Contact Form)

**Schema:**
```
Column Name     | Type      | Constraint      | Notes
────────────────┼───────────┼─────────────────┼──────────────
id              | BIGINT    | PRIMARY KEY     | Auto-increment
name            | VARCHAR   | NOT NULL        | Sender name
email           | VARCHAR   | NOT NULL        | Reply email
phone           | VARCHAR   | NULLABLE        | Phone number
subject         | VARCHAR   | NOT NULL        | Message subject
message         | TEXT      | NOT NULL        | Message body
status          | VARCHAR   | DEFAULT "new"   | new|read|resolved
created_at      | TIMESTAMP | NOT NULL        | Submitted time
updated_at      | TIMESTAMP | NOT NULL        | Last update time
```

---

## Relationship Specifications

### One-to-Many Relationships

| From Parent | To Child | Constraint | Notes |
|------------|----------|-----------|-------|
| User | Student | ON DELETE CASCADE | Delete user → delete student |
| User | Company | ON DELETE CASCADE | Delete user → delete company |
| User | Coordinator | ON DELETE CASCADE | Delete user → delete coordinator |
| Company | OjtPosting | ON DELETE CASCADE | Delete company → delete postings |
| Student | StudentSkill | ON DELETE CASCADE | Delete student → delete skills |
| Student | Resume | ON DELETE CASCADE | Delete student → delete resumes |
| Student | Application | ON DELETE CASCADE | Delete student → delete applications |
| Student | MatchScore | ON DELETE CASCADE | Delete student → delete scores |
| OjtPosting | PostingSkill | ON DELETE CASCADE | Delete posting → delete skills |
| OjtPosting | Application | ON DELETE CASCADE | Delete posting → delete applications |
| Student | OjtProgress | ON DELETE CASCADE | Delete student → delete progress |

### One-to-One Relationships

| Parent | Child | Constraint | Notes |
|--------|-------|-----------|-------|
| User | Student | UNIQUE user_id | One per user |
| User | Company | UNIQUE user_id | One per user |
| User | Coordinator | UNIQUE user_id | One per user |
| Student | StudentPreference | UNIQUE student_id | One per student |
| Student | StudentAvailability | UNIQUE student_id | One per student |
| Application | OjtProgress | UNIQUE application_id | One per application |

### Many-to-Many Relationships (via Bridge Tables)

Currently modeled as one-to-many:
- Student ←→ Skill (via StudentSkill)
- OjtPosting ←→ Skill (via PostingSkill)

Future: Could be many-to-many if multiple students use same skills table.

---

## Indexing Strategy

### Primary Performance Concerns

1. **User Login:**
   ```sql
   SELECT * FROM users WHERE email = ?
   INDEX: email (UNIQUE)
   ```

2. **Student Profile Retrieval:**
   ```sql
   SELECT * FROM students WHERE user_id = ?
   INDEX: user_id (FK)
   ```

3. **Active Job Postings:**
   ```sql
   SELECT * FROM ojt_postings WHERE status = 'active' AND slots_filled < slots
   INDEX: status
   INDEX: (slots_filled, slots)
   ```

4. **Student Applications:**
   ```sql
   SELECT * FROM applications WHERE student_id = ? ORDER BY created_at DESC
   INDEX: student_id
   ```

5. **Job Recommendations:**
   ```sql
   SELECT * FROM match_scores 
   WHERE student_id = ? 
   ORDER BY total_score DESC 
   LIMIT 10
   INDEX: (student_id, total_score DESC)
   ```

6. **Audit Trail:**
   ```sql
   SELECT * FROM audit_logs 
   WHERE user_id = ? 
   ORDER BY created_at DESC
   INDEX: (user_id, created_at DESC)
   ```

---

## Data Constraints & Validation

### Unique Constraints

```
users.email - No duplicate email addresses
students.user_id - One student per user
companies.user_id - One company per user
coordinators.user_id - One coordinator per user
student_preferences.student_id - One preference per student
student_availability.student_id - One availability per student
applications(student_id, ojt_posting_id) - One app per student-posting pair
match_scores(student_id, ojt_posting_id) - One score per pair
```

### Foreign Key Constraints

```
students.user_id → users.id (CASCADE DELETE)
companies.user_id → users.id (CASCADE DELETE)
coordinators.user_id → users.id (CASCADE DELETE)
student_skills.student_id → students.id (CASCADE DELETE)
student_preferences.student_id → students.id (CASCADE DELETE)
student_availability.student_id → students.id (CASCADE DELETE)
resumes.student_id → students.id (CASCADE DELETE)
ojt_postings.company_id → companies.id (CASCADE DELETE)
posting_skills.ojt_posting_id → ojt_postings.id (CASCADE DELETE)
applications.student_id → students.id (CASCADE DELETE)
applications.ojt_posting_id → ojt_postings.id (CASCADE DELETE)
applications.resume_id → resumes.id (SET NULL)
ojt_progress.application_id → applications.id (CASCADE DELETE)
ojt_progress.student_id → students.id (CASCADE DELETE)
notifications.user_id → users.id (CASCADE DELETE)
messages.sender_id → users.id (CASCADE DELETE)
messages.recipient_id → users.id (CASCADE DELETE)
audit_logs.user_id → users.id (SET NULL)
match_scores.student_id → students.id (CASCADE DELETE)
match_scores.ojt_posting_id → ojt_postings.id (CASCADE DELETE)
```

### Enum Constraints

```
users.role:
├─ 'student'
├─ 'company'
├─ 'coordinator'
└─ 'admin'

users.status:
├─ 'active'
├─ 'pending' (not yet approved)
└─ 'suspended' (disabled account)

ojt_postings.status:
├─ 'active' (accepting applications)
├─ 'inactive' (temporarily not accepting)
└─ 'closed' (no longer accepting)

applications.status:
├─ 'pending' (awaiting review)
├─ 'accepted' (approved by company)
└─ 'rejected' (declined by company)

ojt_progress.status:
├─ 'in_progress' (student working)
├─ 'submitted' (awaiting approval)
└─ 'approved' (coordinator approved)

notifications.type:
├─ 'info' (informational)
├─ 'success' (positive action)
├─ 'warning' (warning message)
└─ 'error' (error alert)
```

---

## Summary

The OJT Schema is designed with:

✅ **3NF Normalization** - Minimal redundancy, maximum consistency  
✅ **Strategic Indexing** - Optimized for common queries  
✅ **Referential Integrity** - Cascading constraints for data safety  
✅ **Audit Trail** - Complete history of sensitive operations  
✅ **Extensibility** - Room for future features (messages, advanced matching)  
✅ **Role-Based Access** - Separated user profiles by responsibility  

This ensures **data consistency**, **query performance**, and **regulatory compliance**.
