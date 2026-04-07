# OJT System V2 - System Architecture & Design Documentation

**Version:** 2.0  
**Last Updated:** April 2026  
**Framework:** Laravel 12.x  
**Database:** SQLite  
**API Authentication:** Laravel Sanctum (API Tokens)

---

## Table of Contents
1. [Executive Overview](#executive-overview)
2. [System Architecture](#system-architecture)
3. [Core Components](#core-components)
4. [Technology Stack](#technology-stack)
5. [Design Patterns & Principles](#design-patterns--principles)
6. [Data Flow](#data-flow)
7. [Security Architecture](#security-architecture)

---

## Executive Overview

The **OJT System V2** is a comprehensive On-the-Job Training matching platform that connects students with companies and monitors their training progress. The system intelligently matches students to job postings based on skills, location preferences, and availability using a weighted scoring algorithm.

### Key Features
- **Multi-role user management** (Student, Company, Coordinator, Admin)
- **Smart job matching algorithm** with configurable decision rules
- **Resume management** with active resume tracking
- **Real-time notifications** via in-app messaging
- **Comprehensive audit logging** for compliance
- **Role-based access control (RBAC)** across all endpoints
- **RESTful API** with token-based authentication

### System Metrics
- **20 Database Models** with normalized relationships
- **4 Core Services** handling business logic
- **6+ Controller Focus Areas** organized by domain
- **23 Database Migrations** with cascading relationships
- **Full audit trail** for sensitive operations

---

## System Architecture

### High-Level Architecture Diagram

```
┌─────────────────────────────────────────────────────────────┐
│                    FRONTEND CLIENTS                         │
│         (Vanilla JS, HTML, CSS, Bootstrap Icons)            │
└──────────────────────┬──────────────────────────────────────┘
                       │ HTTP/REST
                       ▼
┌─────────────────────────────────────────────────────────────┐
│                   API GATEWAY LAYER                         │
│             (Laravel Routing & Middleware)                  │
├──────────────────────────────────────────────────────────────┤
│  - Route Definitions (api.php)                              │
│  - Authentication Middleware (Sanctum)                      │
│  - Rate Limiting (Throttle)                                 │
│  - CORS Middleware                                          │
│  - Request Validation (Form Requests)                       │
└──────────────────────┬──────────────────────────────────────┘
                       │
        ┌──────────────┼──────────────┐
        ▼              ▼              ▼
   ┌────────────┐ ┌────────────┐ ┌─────────────┐
   │ Controllers│ │ Requests   │ │ Middleware  │
   └────────────┘ └────────────┘ └─────────────┘
        │
        ▼
┌─────────────────────────────────────────────────────────────┐
│                  BUSINESS LOGIC LAYER                       │
│                    (Services)                               │
├──────────────────────────────────────────────────────────────┤
│  ┌──────────────┐  ┌─────────────────┐  ┌──────────────┐   │
│  │  Matching    │  │  Notification   │  │   Audit      │   │
│  │  Service     │  │   Service       │  │   Service    │   │
│  └──────────────┘  └─────────────────┘  └──────────────┘   │
│                                                              │
│  ┌──────────────┐                                           │
│  │   Report     │                                           │
│  │   Service    │                                           │
│  └──────────────┘                                           │
└──────────────────────┬──────────────────────────────────────┘
                       │
        ┌──────────────┼──────────────┐
        ▼              ▼              ▼
┌─────────────────────────────────────────────────────────────┐
│                    DATA ACCESS LAYER                        │
│              (Eloquent ORM Models)                          │
├──────────────────────────────────────────────────────────────┤
│  - User Aggregates (User, Student, Company, Coordinator)    │
│  - Job Domain (OjtPosting, Application, OjtProgress)        │
│  - Matching Domain (MatchScore, MatchingRule)               │
│  - Communication (Notification, Message)                    │
│  - Audit & Support (AuditLog, Faq, ContactMessage)          │
└──────────────────────┬──────────────────────────────────────┘
                       │
                       ▼
                ┌──────────────┐
                │   SQLite     │
                │  Database    │
                └──────────────┘
```

### Layered Architecture Explanation

#### 1. **Presentation Layer (Frontend)**
- Vanilla JavaScript, HTML, CSS
- Bootstrap Icons for UI
- Dark/Light mode toggle
- Responsive design
- No framework dependencies (as per requirements)

#### 2. **API Gateway Layer**
- Laravel routing (`routes/api.php`)
- Sanctum API token authentication
- Rate limiting (OWASP brute-force protection)
- Request validation using Form Requests
- CORS configuration
- Input sanitization

#### 3. **Business Logic Layer**
- **MatchingService**: Weighted scoring algorithm for student-to-job matching
- **NotificationService**: In-app notification creation and delivery
- **AuditService**: Compliance and security audit trail logging
- **ReportService**: Analytics and reporting for stakeholders
- Encapsulation of complex business rules
- Single Responsibility principle adherence

#### 4. **Data Access Layer**
- Eloquent ORM models with relationships
- Database transactions for consistency
- Query builders for complex queries
- Factory classes for testing
- Model attributes with type casting

#### 5. **Database Layer**
- SQLite for lightweight deployment
- Normalized schema (3NF)
- Foreign key constraints with cascading
- Indexes on frequently queried columns
- Migration-based versioning

---

## Core Components

### 1. User Management Component

**Models:**
- `User` - Base authentication model
- `Student` - Student-specific profile
- `Company` - Company information
- `Coordinator` - Academic coordinator

**Key Features:**
```
User (Polymorphic parent)
├── Student Profile
│   ├── Skills (StudentSkill)
│   ├── Preferences (StudentPreference)
│   ├── Availability (StudentAvailability)
│   ├── Resumes (Resume)
│   └── Applications (Application)
├── Company Profile
│   └── OJT Postings (OjtPosting)
├── Coordinator Profile
│   └── Monitoring role
└── Role-based permissions
```

**Role Definitions:**
- **Student**: Job seeker, can apply, upload resumes, track progress
- **Company**: Job poster, reviews applications, manages postings
- **Coordinator**: Academic supervisor, monitors student progress
- **Admin**: Platform manager, configures rules, views audit logs

---

### 2. Job Matching Component

**Models:**
- `OjtPosting` - Job posting from companies
- `PostingSkill` - Required skills per posting
- `MatchScore` - Calculated compatibility scores
- `MatchingRule` - Configurable matching algorithm weights

**Matching Algorithm:**

The system uses a **weighted composite scoring approach**:

```
Total Score = (
    Skill Score × Weight_Skills +
    Location Score × Weight_Location +
    Availability Score × Weight_Availability
) / 100

Where:
- Skill Score: % of required posting skills student has (0-100)
- Location Score: 
  * 100 = exact match
  * 50 = no preference/location set
  * 0 = mismatch
- Availability Score: Schedule compatibility (0-100)
```

**Example Calculation:**
```
Student Skills: Java, Python, MySQL
Posting Requires: Java, Python, Docker

Skill Score = (2/3) × 100 = 67%
Location Score = 100% (exact match)
Availability Score = 80%

Rules: Skills=50%, Location=30%, Availability=20%

Total = (67×0.50 + 100×0.30 + 80×0.20) / 100 = 76.5%
```

**Admin Customization:**
Admins can adjust weights via the `MatchingRule` model to fine-tune matching criteria without code changes.

---

### 3. Application & Progress Component

**Models:**
- `Application` - Student application to posting
- `OjtProgress` - Training hours and document tracking
- `Resume` - Student resume uploads

**Application Workflow:**
```
Student Applies
    ↓
Application Created (pending)
    ↓
Company Reviews
    ↓
Company Accepts/Rejects
    ↓
If Accepted: OjtProgress Created
    ↓
Student Logs Hours & Documents
    ↓
Coordinator Approves
```

**Status Tracking:**
- Application: pending → accepted/rejected → completed
- OjtProgress: in-progress → submitted → approved

---

### 4. Notification & Communication Component

**Models:**
- `Notification` - In-app notifications
- `Message` - Direct messaging (future expansion)

**Notification Types:**
- Application received
- Application status change
- Job recommendation
- Progress approval
- System announcements

---

### 5. Audit & Compliance Component

**Models:**
- `AuditLog` - Comprehensive action trail
- `ContactMessage` - Public contact form submissions

**Audit Tracking:**
Logs on critical operations:
- User login/logout
- Application submissions
- Status changes
- Profile modifications
- Administrative actions

**Audit Fields:**
- user_id (who performed action)
- action (what action)
- entity_type & entity_id (what changed)
- old_values / new_values (data before/after)
- ip_address (from where)
- timestamp (when)

---

## Technology Stack

### Backend
| Component | Technology | Version |
|-----------|-----------|---------|
| Framework | Laravel | 12.x |
| ORM | Eloquent | 12.x |
| Authentication | Sanctum | 4.0 |
| API Token | Bearer Tokens | - |
| Database | SQLite | Latest |
| Language | PHP | 8.2+ |
| Testing | PHPUnit | 11.5.3 |
| Dev Tool | Laravel Tinker | 2.10.1 |

### Frontend
| Component | Technology |
|-----------|-----------|
| HTML | HTML5 |
| CSS | CSS3 (No Tailwind/PostCSS) |
| JavaScript | Vanilla ES6+ |
| Icons | Bootstrap Icons CDN |
| Build Tool | Vite |

### Development Tools
| Tool | Purpose |
|------|---------|
| Composer | PHP dependency management |
| npm | JavaScript/CSS packaging |
| Vite | Module bundling & HMR |
| Pint | PHP code formatting |
| Pail | Log streaming |
| Faker | Test data generation |
| Mockery | Mocking for tests |

---

## Design Patterns & Principles

### 1. SOLID Principles

**Single Responsibility Principle:**
- Each service handles one domain (Matching, Notifications, Audit)
- Controllers delegate to services, don't contain business logic
- Models represent entities, use relationships for data access

**Open/Closed Principle:**
- MatchingRule model allows algorithm customization without code changes
- Services can be extended with new notification types
- Middleware stack allows adding cross-cutting concerns

**Liskov Substitution Principle:**
- All controllers extend base `Controller`
- Role-specific controllers can be swapped via dependency injection

**Interface Segregation Principle:**
- Controllers only depend on the services they need
- Form Requests validate only their specific inputs

**Dependency Inversion Principle:**
- Services injected into controllers via constructor
- Loosely coupled to implementations

### 2. Design Patterns Used

**Service Layer Pattern:**
```php
// Controller uses service, not direct model manipulation
$this->matchingService->calculateForStudent($student);
```

**Repository Pattern (via Eloquent):**
```php
// Models act as repositories
$applications = Application::where('student_id', $id)->get();
```

**Factory Pattern:**
```php
// Database factories for test data
StudentFactory::new()->create();
```

**Polymorphism (Role-based):**
```php
// User.php
$user->isStudent()
$user->isCompany()
$user->isCoordinator()
$user->isAdmin()
```

### 3. Coding Standards

**From CONTEXT.md Requirements:**
- KISS (Keep It Small & Simple)
- Encapsulation through Services
- Early return technique (avoid deep nesting)
- 2-3 max nesting depth
- DRY - No code/logic duplication
- Helpful comments (what and why)
- OWASP security best practices

**Framework Best Practices:**
- Use Eloquent relationships, not raw SQL
- Database pagination for large datasets
- Type hints on all methods
- Attribute casting for type safety
- Transaction wrapping for consistency

---

## Data Flow

### Critical User Journey: Student Applies for Job

```
1. FRONTEND
   Student clicks "Apply" button
   ├─ Validates form locally
   └─ Sends POST /api/applications

2. API LAYER
   AuthController middleware verifies token
   ├─ Extracts user from token
   └─ Routes to ApplicationController@store

3. VALIDATION LAYER
   StoreApplicationRequest validates:
   ├─ ojt_posting_id exists & is active
   ├─ student has active resume (or specified one)
   ├─ resume_id belongs to requesting student
   └─ cover_letter is optional string

4. BUSINESS LOGIC
   ApplicationController@store:
   ├─ Retrieves student profile
   ├─ Checks posting availability
   ├─ Prevents duplicate applications
   └─ Creates Application record (DB transaction)

5. NOTIFICATION
   NotificationService::send():
   ├─ Creates Notification record
   ├─ Links company to notification
   └─ Sets link to company dashboard

6. AUDIT LOGGING
   AuditService::log():
   ├─ Records user_id who created application
   ├─ Logs entity_type='Application'
   ├─ Stores new_values with application data
   └─ Captures IP address

7. RESPONSE
   Returns 201 Created:
   {
     "message": "Application submitted.",
     "data": { Application data with relationships }
   }

8. FRONTEND
   ├─ Shows success message
   ├─ Updates student applications list
   └─ Triggers page refresh
```

### Background Process: Match Score Calculation

```
1. TRIGGER (when?)
   ├─ Student profile updated
   ├─ New posting created
   └─ Matching rules changed

2. DATA COLLECTION
   ├─ Get all active postings
   ├─ For each posting, get required skills
   └─ Get student skills, preferences, availability

3. CALCULATION
   For each posting:
   ├─ Calculate skill score (intersection)
   ├─ Calculate location score (comparison)
   ├─ Calculate availability score (overlap)
   └─ Apply weights from MatchingRule

4. STORAGE
   ├─ Create/update MatchScore record
   ├─ Store component scores
   └─ Store final composite score

5. RETRIEVAL
   When student requests recommendations:
   ├─ Query MatchScore table
   ├─ Order by total_score DESC
   ├─ Filter by minimum_score from MatchingRule
   └─ Join OjtPosting details
```

---

## Security Architecture

### Authentication & Authorization

**Authentication Flow:**
```
POST /api/auth/login
├─ Validate email & password
├─ Check user status (active/suspended)
├─ Create Sanctum API token
└─ Return token in response

Client stores token locally
├─ Include in Authorization: Bearer <token> header
└─ Sanctum middleware validates on each request
```

**Authorization Levels:**

1. **Route-Level (Middleware):**
   ```php
   Route::middleware('auth:sanctum')->group(function () {
       // Requires valid token
   });
   ```

2. **Controller-Level (Role Checks):**
   ```php
   if (!$user->isStudent()) {
       return response()->json(['message' => 'Unauthorized'], 403);
   }
   ```

3. **Resource-Level (Ownership Checks):**
   ```php
   if ($application->student->user_id !== $user->id) {
       return response()->json(['message' => 'Forbidden'], 403);
   }
   ```

### Security Measures

**OWASP Protection:**

1. **Brute Force (Rate Limiting):**
   ```php
   Route::post('/login', [AuthController::class, 'login'])
       ->middleware('throttle:5,1'); // 5 attempts/minute
   ```

2. **SQL Injection (Eloquent):**
   - Only use Eloquent ORM, parameterized queries
   - Never concatenate user input into SQL

3. **CSRF (Token Validation):**
   - Handled by Laravel middleware for web routes
   - Not needed for API (token-based auth)

4. **XSS (Output Encoding):**
   - Frontend sanitizes user input
   - API returns JSON (not HTML)

5. **Password Storage:**
   ```php
   'password' => Hash::make($input) // Bcrypt hashing
   'password' => 'hashed' // Auto-hash on assignment
   ```

6. **Sensitive Data Hiding:**
   ```php
   protected $hidden = [
       'password',
       'remember_token',
   ];
   ```

7. **Audit Trail (Compliance):**
   - All sensitive operations logged
   - User ID, action, IP address captured
   - Timestamps for forensics

### Data Protection

**Encryption:**
- Database passwords in .env (not in code)
- Sanctum tokens hashed before storage
- No sensitive data in logs

**Access Control:**
- Students see only their own applications
- Companies see only their own postings
- Admins see everything (with audit logging)
- Coordinators see assigned students

---

## Deployment Architecture

### Environment Configuration

**Development:**
```
.env
├─ APP_ENV=local
├─ APP_DEBUG=true
├─ Database: SQLite (local)
└─ Cache: file
```

**Production:**
```
.env
├─ APP_ENV=production
├─ APP_DEBUG=false
├─ Database: SQLite (or PostgreSQL)
└─ Cache: redis/memcached
```

### Startup Sequence

```bash
composer install          # Install dependencies
npm install              # Install frontend deps
php artisan key:generate # Generate APP_KEY
php artisan migrate      # Run migrations
npm run build            # Build frontend
php artisan serve        # Start server
```

---

## Summary

The OJT System V2 is built on a **clean, layered architecture** that:

✅ **Separates concerns** (Controllers → Services → Models)  
✅ **Follows SOLID principles** for maintainability  
✅ **Implements security best practices** for compliance  
✅ **Uses intelligent matching algorithm** for smart recommendations  
✅ **Provides comprehensive audit trail** for accountability  
✅ **Scales with role-based access** for multiple stakeholders  

This design enables **professional-grade production deployment** while maintaining code clarity and team readability.
