Read [](file:///c%3A/Users/TheHonoredOne/Frequently%20changing%20backup%20%28laptop%29/my-software-projects/COLLEGE%20-%202ND%20YEAR%20-%202ND%20SEMESTER/OJT-SYSTEM-V2-BACKEND---NODEJS/backend-docs/00-README.md#1-1), lines 1 to 150

Read [](file:///c%3A/Users/TheHonoredOne/Frequently%20changing%20backup%20%28laptop%29/my-software-projects/COLLEGE%20-%202ND%20YEAR%20-%202ND%20SEMESTER/OJT-SYSTEM-V2-BACKEND---NODEJS/backend-docs/01-ARCHITECTURE.md#1-1), lines 1 to 200

Read [](file:///c%3A/Users/TheHonoredOne/Frequently%20changing%20backup%20%28laptop%29/my-software-projects/COLLEGE%20-%202ND%20YEAR%20-%202ND%20SEMESTER/OJT-SYSTEM-V2-BACKEND---NODEJS/backend-docs/02-DATABASE-SCHEMA.md#1-1), lines 1 to 100

Read [](file:///c%3A/Users/TheHonoredOne/Frequently%20changing%20backup%20%28laptop%29/my-software-projects/COLLEGE%20-%202ND%20YEAR%20-%202ND%20SEMESTER/OJT-SYSTEM-V2-BACKEND---NODEJS/backend-docs/03-API-REFERENCE.md#1-1), lines 1 to 250

Read [](file:///c%3A/Users/TheHonoredOne/Frequently%20changing%20backup%20%28laptop%29/my-software-projects/COLLEGE%20-%202ND%20YEAR%20-%202ND%20SEMESTER/OJT-SYSTEM-V2-BACKEND---NODEJS/backend-docs/05-SERVICES.md#1-1), lines 1 to 200

Read [](file:///c%3A/Users/TheHonoredOne/Frequently%20changing%20backup%20%28laptop%29/my-software-projects/COLLEGE%20-%202ND%20YEAR%20-%202ND%20SEMESTER/OJT-SYSTEM-V2-BACKEND---NODEJS/backend-docs/03-API-REFERENCE.md#250-250), lines 250 to 350

## 🎯 API Purpose

The **OJT System V2** is an intelligent **job matching and application platform** specifically designed for **On-the-Job Training (OJT) programs**. It connects:

- **Students** (job seekers) looking for training opportunities
- **Companies** (employers) seeking to hire interns/trainees  
- **Coordinators** (faculty) managing OJT programs
- **Admins** (system administrators) overseeing the platform

**Core Mission:** Use intelligent algorithmic matching to connect the right students with the right opportunities based on skills, location, availability, GPA, and academic program.

---

## 👥 User Workflows

### 🎓 **STUDENT WORKFLOW**

**Role:** Job seeker  
**Permissions:** Read-only access to postings, can apply and manage applications

```
1. REGISTRATION & PROFILE SETUP
   ├─ Register with email/password
   ├─ Create student profile
   ├─ Add personal info (location, availability dates, GPA, program)
   └─ Add skills with proficiency levels

2. JOB DISCOVERY & MATCHING
   ├─ View job postings (automatically matched)
   ├─ See match scores breakdown:
   │  ├─ Skill match (40% weight) - "Do I have required skills?"
   │  ├─ Location match (20%) - "Is this location acceptable?"
   │  ├─ Availability match (20%) - "Am I available during this period?"
   │  ├─ GPA match (10%) - "Does my GPA meet requirement?"
   │  └─ Program match (10%) - "Is this for my academic program?"
   ├─ Filter matches by score threshold
   └─ See detailed job descriptions

3. APPLICATION & TRACKING
   ├─ Apply to jobs (one click)
   ├─ Track application status:
   │  ├─ Submitted
   │  ├─ Under Review
   │  ├─ Shortlisted / Rejected
   │  ├─ Interviewed
   │  └─ Hired
   ├─ View company feedback
   └─ Receive notifications on status changes

4. PROFILE MAINTENANCE
   ├─ Update skills (proficiency, experience years)
   ├─ Update availability windows
   ├─ Update preferred location
   ├─ Modify profile information
   └─ Profile completeness % auto-calculated
```

**API Endpoints for Students:**
- `POST /auth/register` - Register as student
- `GET /api/student/profile` - View profile
- `PUT /api/student/profile` - Update profile
- `POST /api/student/skills` - Add skill
- `GET /api/student/skills` - List skills
- `GET /api/student/matches` - Get personalized matches
- `POST /api/applications` - Apply for job
- `GET /api/applications` - Track applications

---

### 🏢 **COMPANY WORKFLOW**

**Role:** Employer/HR  
**Permissions:** Can post jobs, manage applications, view candidate profiles

```
1. REGISTRATION & COMPANY SETUP
   ├─ Register with company email
   ├─ Create company profile:
   │  ├─ Company name
   │  ├─ Description/About
   │  ├─ Industry type
   │  ├─ Location/headquarters
   │  └─ Contact info
   └─ Request accreditation (waits for coordinator approval)

2. JOB POSTING
   ├─ Create job posting with:
   │  ├─ Title & description
   │  ├─ Location & remote option
   │  ├─ Duration (weeks)
   │  ├─ Salary range & stipend
   │  ├─ Requirements:
   │  │  ├─ Minimum GPA
   │  │  ├─ Academic program
   │  │  ├─ Year of study
   │  │  └─ Individual skills needed
   │  └─ # of positions available
   ├─ Post status changes:
   │  ├─ Draft → Active → Closed/Archived
   │  └─ Track view counts
   └─ Can unpublish anytime

3. REVIEWING APPLICATIONS
   ├─ Dashboard shows:
   │  ├─ Total applications received
   │  ├─ Applications by status
   │  └─ Recommended candidates (by match score)
   ├─ For each applicant, see:
   │  ├─ Student profile (skills, GPA, location)
   │  ├─ Match score breakdown
   │  ├─ Resume/documents
   │  └─ Application submission date
   ├─ Update application status:
   │  ├─ Shortlist → Interview → Hire/Reject
   │  └─ Add feedback notes
   └─ Offer notifications trigger for selected students

4. CANDIDATE MANAGEMENT
   ├─ Filter candidates by:
   │  ├─ Match score
   │  ├─ Skills match
   │  ├─ Location
   │  └─ Availability
   ├─ Batch actions (move to next stage)
   └─ Export candidate lists
```

**API Endpoints for Companies:**
- `POST /auth/register` - Register as company
- `GET /api/company/profile` - View company profile
- `PUT /api/company/profile` - Update company profile
- `POST /api/company/postings` - Create job posting
- `GET /api/company/postings` - List company's postings
- `PUT /api/company/postings/:id` - Update posting
- `GET /api/company/applications` - View applications received
- `PATCH /api/company/applications/:id/status` - Update application status
- `GET /api/company/recommendations` - Get ranked candidates

---

### 👨‍🏫 **COORDINATOR WORKFLOW**

**Role:** Faculty/Program Manager  
**Permissions:** Can approve companies, monitor program, generate reports

```
1. PROGRAM SETUP & MANAGEMENT
   ├─ Create/manage OJT programs
   ├─ Set program requirements:
   │  ├─ Minimum GPA for participation
   │  ├─ Academic programs included
   │  └─ Available OJT dates/semesters
   └─ Invite students to program

2. COMPANY ACCREDITATION
   ├─ Review company applications:
   │  ├─ Company information
   │  ├─ Industry & experience
   │  └─ Previous participant feedback
   ├─ Approve/reject companies
   │  ├─ Approved → can post jobs
   │  └─ Rejected → cannot participate
   └─ Manage approved companies list

3. STUDENT VERIFICATION
   ├─ Verify student GPA & records
   ├─ Confirm academic eligibility
   ├─ Approve/suspend students from program
   └─ Track student participation

4. MONITORING & REPORTING
   ├─ Dashboard metrics:
   │  ├─ Total students enrolled
   │  ├─ Total companies participating
   │  ├─ Jobs posted this semester
   │  ├─ Application volume
   │  ├─ Placement rate
   │  └─ Program success metrics
   ├─ View audit logs:
   │  ├─ Who registered when
   │  ├─ Companies approved/rejected
   │  └─ Critical system events
   ├─ Generate reports:
   │  ├─ Student placement summary
   │  ├─ Company satisfaction
   │  └─ Program effectiveness
   └─ Monitor for suspicious activity
```

**API Endpoints for Coordinators:**
- `POST /auth/register` - Register as coordinator
- `GET /api/coordinator/programs` - List programs
- `POST /api/coordinator/programs` - Create program
- `GET /api/coordinator/companies/pending` - Pending approvals
- `PATCH /api/coordinator/companies/:id/approve` - Approve company
- `GET /api/coordinator/students` - List students
- `GET /api/coordinator/reports` - Generate reports
- `GET /api/coordinator/audit-logs` - View audit trail

---

### 🔐 **ADMIN WORKFLOW**

**Role:** System Administrator  
**Permissions:** Full system access, user management, configuration

```
1. USER MANAGEMENT
   ├─ View all users (students, companies, coordinators)
   ├─ Manage user status:
   │  ├─ Active, Suspended, Locked, Inactive
   │  └─ Ban bad actors permanently
   ├─ Reset passwords
   ├─ Unlock locked accounts
   └─ Manually verify accounts

2. SYSTEM MONITORING
   ├─ View comprehensive audit logs:
   │  ├─ All login attempts
   │  ├─ Account lockouts
   │  ├─ Failed password attempts
   │  ├─ Data modifications
   │  └─ Admin actions
   ├─ Monitor system health:
   │  ├─ Database performance
   │  ├─ Error logs
   │  └─ Rate limiting issues
   └─ View security alerts

3. CONFIGURATION
   ├─ Adjust system settings:
   │  ├─ Account lockout policy (5 attempts, 30 min)
   │  ├─ Token expiration (7 days)
   │  ├─ Rate limiting parameters
   │  └─ Matching algorithm weights
   ├─ Manage feature flags
   └─ Configure integrations

4. DATA MANAGEMENT
   ├─ Database backups
   ├─ Data exports
   ├─ Hard deletes (if needed)
   ├─ Bulk operations
   └─ Recovery procedures
```

**API Endpoints for Admins:**
- `GET /api/admin/users` - List all users
- `PATCH /api/admin/users/:id/status` - Change user status
- `GET /api/admin/audit-logs` - View all audit logs
- `GET /api/admin/reports` - System reports
- `POST /api/admin/configuration` - Update settings

---

## 🔄 **Data Flow Across User Types** 

```graph LR
    Student["👤 STUDENT<br/>Seeks Job"]
    Register["Register & Build<br/>Profile + Skills"]
    BrowseJobs["Browse Matched Jobs<br/>See Match Scores"]
    Apply["Apply to Jobs"]
    TrackApp["Track Application<br/>Status"]
    
    Company["🏢 COMPANY<br/>Hires Students"]
    CompReg["Register Company<br/>Profile"]
    PostJob["Post Job<br/>Opening"]
    ReviewApp["Review Applications<br/>from Students"]
    HireStudent["Shortlist & Hire<br/>Selected Students"]
    
    Coordinator["👨‍🏫 COORDINATOR<br/>Manages Program"]
    ApproveComp["Approve Companies"]
    VerifyStud["Verify Students"]
    Monitor["Monitor & Report<br/>Program Metrics"]
    
    Admin["🔐 ADMIN<br/>System Owner"]
    UserMgmt["Manage All Users"]
    AuditLog["View Audit Logs<br/>& Security"]
    Config["Configure<br/>System"]
    
    Student --> Register --> BrowseJobs --> Apply --> TrackApp
    Company --> CompReg --> PostJob --> ReviewApp --> HireStudent
    Coordinator --> ApproveComp
    Coordinator --> VerifyStud
    Coordinator --> Monitor
    
    Admin --> UserMgmt
    Admin --> AuditLog
    Admin --> Config
    
    PostJob -.->|Job Available| BrowseJobs
    Apply -.->|Applications| ReviewApp
    ApproveComp -.->|Before Posting| PostJob
    VerifyStud -.->|Before Matching| BrowseJobs
    
    style Student fill:#e1f5ff
    style Company fill:#fff3e0
    style Coordinator fill:#f3e5f5
    style Admin fill:#ffebee
```

---

## ⚙️ **Intelligent Matching Algorithm** (Core Feature)

The system's key differentiator is its **weighted scoring algorithm**. When a student views their matches:

```
Overall Match Score = (Skill×40%) + (Location×20%) + (Availability×20%) + (GPA×10%) + (Program×10%)
```

| Factor | Weight | How It's Calculated | Example |
|--------|--------|-------------------|---------|
| **Skill Match** | 40% | Overlap between student skills & required skills, weighted by proficiency | Student has "Java" (advanced) + "SQL" (advanced) matching "Java" (required) + "Python" (preferred) = 85/100 |
| **Location Match** | 20% | Exact match=100%, remote allowed=75%, no match=0% | Student prefers SF & job is in SF = 100, or remote allowed = 75 |
| **Availability** | 20% | Covers full job duration=100%, partial=50%, no overlap=0% | Student available June-Aug, job needs June-Sept = 50 |
| **GPA** | 10% | Meets requirement=100%, below minimum=scaled % | Job requires 3.0 GPA, student has 3.5 = 100 |
| **Program** | 10% | Exact match=100%, different=0%, no requirement=100% | Both Computer Science = 100 |

**Match Status Classification:**
- 🟢 **Highly Compatible** (80–100) - Great fit, should apply
- 🟡 **Compatible** (60–79) - Good fit, worth exploring
- 🟠 **Moderately Compatible** (40–59) - Some alignment, consider
- 🔴 **Weak Match** (20–39) - Risky, few requirements met
- ⚫ **Not Compatible** (<20) - Don't apply, major gaps

---

## 🔒 **Security & Compliance**

All workflows protected by:
- ✅ **JWT Authentication** - Token-based, stateless
- ✅ **Role-Based Access Control** - Each role has specific permissions
- ✅ **Password Security** - Bcrypt hashing (10 rounds)
- ✅ **Account Lockout** - 5 failed attempts = 30-min lock
- ✅ **Audit Logging** - Every sensitive action logged (who, what, when, why)
- ✅ **Input Validation** - All inputs sanitized
- ✅ **Rate Limiting** - 100 requests per 15 minutes

---

## 📊 **System Statistics**

| Component | Count |
|-----------|-------|
| **User Roles** | 4 (Student, Company, Coordinator, Admin) |
| **Data Models** | 15 tables with relationships |
| **API Endpoints** | 50+ endpoints |
| **Test Cases** | 150+ tests |
| **Scoring Factors** | 5 (weighted) |
| **Deployment** | Node.js + Express + SQLite |