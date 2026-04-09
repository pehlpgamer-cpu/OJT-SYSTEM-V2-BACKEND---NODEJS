# OJT System V2 - Complete API Endpoints Reference

**Version:** 2.0  
**Framework:** Node.js 18+ with Express.js 4.18+  
**ORM:** Sequelize 6.35+ (SQLite3/PostgreSQL)  
**Authentication:** Bearer Token (JWT 9.0+)  
**Base URL:** `http://localhost:3000/api`  
**Last Updated:** April 9, 2026

---

## 📋 Quick Reference

### Authentication (Public)
- `POST /auth/register` - Register new user
- `POST /auth/login` - Login and get JWT token
- `POST /auth/forgot-password` - Request password reset
- `POST /auth/reset-password` - Reset password with token

### Student Routes (Authenticated)
- `GET /students/profile` - Get student profile
- `PUT /students/profile` - Update student profile
- `GET /students/skills` - List student skills
- `POST /students/skills` - Add skill to profile

### Applications (Authenticated)
- `POST /applications` - Submit job application
- `GET /applications` - List student applications

### Matching & Discovery (Authenticated)
- `GET /matches` - Get matched job postings

### Notifications (Authenticated)
- `GET /notifications` - Get user notifications (paginated)
- `PUT /notifications/:id/read` - Mark notification as read

### Audit (Admin Only)
- `GET /audit-logs` - Get system audit trail

### Meta
- `GET /health` - Health check
- `GET /api/version` - API version info
- `GET /api/user` - Get current user info

---

## 🔐 Authentication

### Base Headers

All authenticated endpoints require:
```http
Authorization: Bearer {jwt_token}
Content-Type: application/json
```

### Token Format

JWT tokens contain:
- **Header:** `{alg: HS256, typ: JWT}`
- **Payload:** `{userId, role, iat, exp}`
- **Signature:** HMAC-SHA256 signed with JWT_SECRET

Example decoded token:
```json
{
  "userId": "123e4567-e89b-12d3-a456-426614174000",
  "role": "student",
  "iat": 1712676000,
  "exp": 1712762400
}
```

**Token Expiration:** 24 hours from issuance  
**Refresh:** Re-login to get new token

---

## 📍 Endpoint Details

### Health & Meta Endpoints

#### GET `/health`
Public health check for load balancers.

**Response (200 OK):**
```json
{
  "status": "ok",
  "timestamp": "2026-04-09T12:34:56.789Z",
  "environment": "production"
}
```

**Use for:** Kubernetes liveness probes, load balancer checks

---

#### GET `/api/version`
API version and environment information.

**Response (200 OK):**
```json
{
  "version": "2.0.0",
  "name": "OJT System V2 API",
  "environment": "production"
}
```

---

#### GET `/api/user` ⚠️ **Authenticated**
Get current authenticated user's profile.

**Headers:**
```
Authorization: Bearer {token}
```

**Response (200 OK):**
```json
{
  "message": "User information retrieved",
  "data": {
    "user": {
      "id": "user-uuid",
      "name": "John Doe",
      "email": "john@example.com",
      "role": "student",
      "status": "active"
    },
    "profile": {
      "id": "student-uuid",
      "user_id": "user-uuid",
      "profile_completeness_percentage": 75,
      "preferred_locations": ["Manila", "Cebu"],
      "willing_to_relocate": true
    }
  }
}
```

---

### Authentication Endpoints

#### POST `/auth/register`
Register a new user with role.

**Request Body:**
```json
{
  "name": "John Doe",
  "email": "john@example.com",
  "password": "SecurePass123!",
  "role": "student"
}
```

**Parameters:**
| Field | Type | Required | Validation |
|-------|------|----------|-----------|
| `name` | string | Yes | 1-255 chars |
| `email` | string | Yes | Valid email, unique |
| `password` | string | Yes | Min 8 chars, uppercase/number/special |
| `role` | string | Yes | `student`, `company`, `coordinator` |

**Response (201 Created):**
```json
{
  "message": "Registration successful",
  "user": {
    "id": "uuid",
    "name": "John Doe",
    "email": "john@example.com",
    "role": "student",
    "status": "active"
  },
  "token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
}
```

**Role-Specific Behavior:**
```
student
├─ Status: active (immediately usable)
├─ Creates: Student profile
└─ Can: View postings, apply immediately

company
├─ Status: pending (needs admin approval)
├─ Creates: Company profile
└─ Can: Create postings after approval

coordinator
├─ Status: pending (needs admin approval)
├─ Creates: Coordinator profile
└─ Can: Manage students after approval
```

**Error (409 Conflict - Email exists):**
```json
{
  "message": "Email already registered",
  "statusCode": 409,
  "context": { "email": "john@example.com" }
}
```

**Rate Limit:** 3 registrations per hour per IP

---

#### POST `/auth/login`
Authenticate with email and password.

**Request Body:**
```json
{
  "email": "john@example.com",
  "password": "SecurePass123!"
}
```

**Response (200 OK):**
```json
{
  "message": "Login successful",
  "user": {
    "id": "uuid",
    "name": "John Doe",
    "email": "john@example.com",
    "role": "student",
    "status": "active"
  },
  "token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
}
```

**Side Effects:**
- ✅ Updates `last_login_at` timestamp
- ✅ Logs audit entry with IP address
- ✅ Resets `failedLoginAttempts` counter

**Error (401 Unauthorized - Wrong password):**
```json
{
  "message": "Invalid email or password",
  "statusCode": 401
}
```

**Error (423 Locked - Account lockout):**
```json
{
  "message": "Account is temporarily locked. Try again in 27 minutes",
  "statusCode": 423
}
```

**Lockout Mechanism:**
- 5 failed login attempts = 30-minute account lock
- Auto-unlock after 30 minutes
- Counter resets on successful login
- See: Bug Fix #4 in FIXES-IMPLEMENTATION-SUMMARY.md

**Rate Limit:** 5 attempts per 15 minutes per IP

---

#### POST `/auth/forgot-password`
Request password reset token.

**Request Body:**
```json
{
  "email": "john@example.com"
}
```

**Response (200 OK):**
```json
{
  "message": "If email exists, password reset link will be sent",
  "resetToken": "jwt.token.here" // Only in debug mode
}
```

**Security:** Generic response (doesn't reveal if email exists)

**Email Behavior:**
- Development: Returns token in response
- Production: Sends token via email (not implemented)

**Token Details:**
- Stored in `password_reset_tokens` table
- Expires in: 1 hour
- One-time use: Marked as "used" after reset
- Prevents reuse attacks

---

#### POST `/auth/reset-password`
Reset password with valid reset token.

**Request Body:**
```json
{
  "resetToken": "jwt.token.from.email",
  "newPassword": "NewSecurePass123!"
}
```

**Response (200 OK):**
```json
{
  "message": "Password reset successfully"
}
```

**Validations:**
- Token must exist in database
- Token not already used
- Token not expired
- Password meets strength requirements

**Security:**
- Token marked as used immediately after reset
- Prevents replay attacks
- Logs password change in audit trail

**Error (401 Unauthorized - Token already used):**
```json
{
  "message": "This reset link has already been used",
  "statusCode": 401
}
```

---

### Student Endpoints

#### GET `/students/profile` ⚠️ **Authenticated**
Retrieve student profile.

**Headers:**
```
Authorization: Bearer {token}
```

**Response (200 OK):**
```json
{
  "message": "Profile retrieved",
  "data": {
    "id": "student-uuid",
    "user_id": "user-uuid",
    "profile_completeness_percentage": 85,
    "preferred_locations": ["Manila", "Cebu"],
    "willing_to_relocate": true,
    "gpa": 3.5,
    "academic_program": "Computer Science",
    "availability_start": "2026-06-01T00:00:00Z",
    "availability_end": "2026-12-01T00:00:00Z"
  }
}
```

**Completeness Calculation:**
```
= (filled_fields / total_fields) * 100

Fields: name, email, phone, address, school, course, 
GPA, availability period, skills, resume, location preferences
```

---

#### PUT `/students/profile` ⚠️ **Authenticated**
Update student profile.

**Request Body:**
```json
{
  "preferred_locations": ["Manila", "Quezon City"],
  "willing_to_relocate": true,
  "gpa": 3.6,
  "academic_program": "Computer Science",
  "availability_start": "2026-06-01",
  "availability_end": "2026-12-01"
}
```

**Response (200 OK):**
```json
{
  "message": "Profile updated successfully",
  "data": {
    "id": "student-uuid",
    "profile_completeness_percentage": 90,
    "...": "updated fields"
  }
}
```

**Side Effects:**
- ✅ Recalculates `profile_completeness_percentage`
- ✅ Logs change in audit trail
- ✅ Invalidates cached matches

---

#### GET `/students/skills` ⚠️ **Authenticated**
List student's technical skills.

**Query Parameters:**
```
?page=1&limit=10
```

**Response (200 OK):**
```json
{
  "message": "Skills retrieved",
  "data": [
    {
      "id": "skill-uuid",
      "name": "JavaScript",
      "proficiency_level": "advanced",
      "years_of_experience": 3,
      "verified": true
    },
    {
      "id": "skill-uuid",
      "name": "Python",
      "proficiency_level": "intermediate",
      "years_of_experience": 2,
      "verified": false
    }
  ]
}
```

**Proficiency Levels:** `beginner`, `intermediate`, `advanced`, `expert`

---

#### POST `/students/skills` ⚠️ **Authenticated**
Add a skill to student profile.

**Request Body:**
```json
{
  "name": "React.js",
  "proficiency_level": "advanced",
  "years_of_experience": 2
}
```

**Response (201 Created):**
```json
{
  "message": "Skill added successfully",
  "data": {
    "id": "skill-uuid",
    "name": "React.js",
    "proficiency_level": "advanced",
    "years_of_experience": 2,
    "verified": false
  }
}
```

**Validation:**
- Skill name: required, unique per student
- Proficiency: required, in [beginner, intermediate, advanced, expert]
- Years: required, >= 0

**Side Effects:**
- ✅ Invalidates job matches cache
- ✅ Logs skill addition

---

### Application Endpoints

#### POST `/applications` ⚠️ **Authenticated**
Submit application to job posting.

**Request Body:**
```json
{
  "posting_id": "posting-uuid",
  "cover_letter": "I am interested in this position...",
  "resume_id": "resume-uuid"
}
```

**Response (201 Created):**
```json
{
  "message": "Application submitted successfully",
  "data": {
    "id": "application-uuid",
    "student_id": "student-uuid",
    "posting_id": "posting-uuid",
    "status": "submitted",
    "submitted_at": "2026-04-09T12:34:56.789Z",
    "match_score": 87
  }
}
```

**Validations:**
- Student must have completed profile
- Posting must be active
- Student not already applied (deduplicate)
- Position must have available slots

**Safety Mechanisms:**
- **Transaction-based:** All operations atomic
- **Row-level locking:** Prevents concurrent over-subscription
- **Prevents race conditions:** Under high concurrency
- See: Bug Fix #2 in FIXES-IMPLEMENTATION-SUMMARY.md

**Side Effects:**
- ✅ Creates Application record
- ✅ Calculates match score
- ✅ Sends notification to student
- ✅ Logs to audit trail

---

#### GET `/applications` ⚠️ **Authenticated**
List student's applications.

**Query Parameters:**
```
?status=submitted&posting_id=uuid&limit=20&page=1
```

**Response (200 OK):**
```json
{
  "message": "Applications retrieved",
  "data": [
    {
      "id": "app-uuid",
      "posting": {
        "id": "posting-uuid",
        "title": "Junior Developer",
        "company": "Tech Corp"
      },
      "status": "under_review",
      "submitted_at": "2026-04-05T10:00:00Z",
      "match_score": 87
    }
  ],
  "count": 5
}
```

**Application Statuses:**
```
submitted → under_review → shortlisted → hired
                        → rejected
```

---

### Matching & Discovery Endpoints

#### GET `/matches` ⚠️ **Authenticated**
Get job postings matched to student profile.

**Query Parameters:**
```
?minScore=60&limit=20&page=1&sortBy=match_score
```

**Response (200 OK):**
```json
{
  "message": "Matching postings retrieved",
  "data": [
    {
      "id": "posting-uuid",
      "title": "Senior Developer",
      "company": "Tech Corp",
      "description": "...",
      "required_skills": ["JavaScript", "React"],
      "location": "Manila",
      "job_type": "Full-time",
      "salary_range": "60000 - 80000",
      "match_score": 92,
      "match_status": "highly_compatible",
      "match_breakdown": {
        "skill_score": 90,        // 40% weight
        "location_score": 100,    // 20% weight
        "availability_score": 90, // 20% weight
        "gpa_score": 85,          // 10% weight
        "program_score": 95       // 10% weight
      }
    }
  ],
  "count": 12
}
```

**Matching Algorithm:**
```
Overall Score = (
  skill_score * 0.40 +
  location_score * 0.20 +
  availability_score * 0.20 +
  gpa_score * 0.10 +
  program_score * 0.10
)

Match Status:
- >= 85: highly_compatible ⭐⭐⭐⭐⭐
- 70-84: compatible ⭐⭐⭐⭐
- 50-69: moderately_compatible ⭐⭐⭐
- 30-49: weak_match ⭐⭐
- < 30: not_compatible ⭐
```

**Component Scoring:**

| Component | Calculation | Weight |
|-----------|-------------|--------|
| Skills | (matched / required) * 100 | 40% |
| Location | 100 if remote, 100 if exact match, 75 if nearby, 0 if mismatch | 20% |
| Availability | % overlap of date ranges | 20% |
| GPA | (student GPA / min required) * 100 | 10% |
| Program | 100 if match, 80 if related, 30 if unrelated | 10% |

---

### Notification Endpoints

#### GET `/notifications` ⚠️ **Authenticated**
Get paginated user notifications.

**Query Parameters:**
```
?page=1&limit=10&unread=true
```

**Response (200 OK):**
```json
{
  "message": "Notifications retrieved",
  "data": [
    {
      "id": "notif-uuid",
      "type": "application_status_update",
      "title": "Your application was shortlisted",
      "message": "Congratulations! You're shortlisted for Senior Developer at Tech Corp",
      "read": false,
      "priority": "high",
      "related_entity_id": "app-uuid",
      "related_entity_type": "Application",
      "created_at": "2026-04-09T12:34:56.789Z"
    }
  ],
  "pagination": {
    "page": 1,
    "per_page": 10,
    "total": 23,
    "total_pages": 3
  }
}
```

**Notification Types:**
```
- application_submitted
- application_status_update
- match_found
- message_received
- deadline_approaching
- profile_feedback
```

**Priority Levels:** `low`, `medium`, `high`, `urgent`

---

#### PUT `/notifications/:id/read` ⚠️ **Authenticated**
Mark notification as read.

**Path Parameters:**
```
:id - Notification UUID
```

**Response (200 OK):**
```json
{
  "message": "Notification marked as read",
  "data": {
    "id": "notif-uuid",
    "read": true,
    "read_at": "2026-04-09T12:35:00.789Z"
  }
}
```

---

### Admin Endpoints

#### GET `/audit-logs` ⚠️ **Authenticated (Admin Only)**
Retrieve system audit trail.

**Authorization:**
```
Authorization: Bearer {admin_token}
User role must be: admin
```

**Query Parameters:**
```
?user_id=uuid&action=login&limit=50&page=1
```

**Response (200 OK):**
```json
{
  "message": "Audit logs retrieved",
  "data": [
    {
      "id": "log-uuid",
      "user_id": "user-uuid",
      "action": "login",
      "entity_type": "User",
      "entity_id": "user-uuid",
      "old_values": null,
      "new_values": { "last_login_at": "2026-04-09T12:34:56Z" },
      "ip_address": "192.168.1.1",
      "user_agent": "Mozilla/5.0...",
      "severity": "low",
      "created_at": "2026-04-09T12:34:56.789Z"
    }
  ],
  "count": 45
}
```

**Audited Actions:**
```
create, update, delete, login, logout, password_change,
role_change, status_change, approval, rejection
```

**Severity Levels:**
```
low:    Regular operations (profile update)
medium: Sensitive operations (password change)
high:   Critical operations (user creation, role change)
```

---

## 🚨 Error Responses

### Standard Error Format

All errors return appropriate HTTP status code with JSON body:

```json
{
  "message": "Error description",
  "statusCode": 400,
  "context": {
    "field": "Additional context about error"
  },
  "timestamp": "2026-04-09T12:34:56.789Z"
}
```

### Common HTTP Status Codes

| Status | When | Example |
|--------|------|---------|
| **400** | Bad request - Invalid input | Missing required fields |
| **401** | Unauthorized - Invalid/missing token | Expired JWT, wrong password |
| **403** | Forbidden - User lacks permission | Non-admin accessing admin endpoint |
| **404** | Not found - Resource doesn't exist | User ID doesn't exist |
| **409** | Conflict - Resource already exists | Duplicate email, already applied |
| **422** | Unprocessable - Validation failed | Password too weak |
| **423** | Locked - Account is locked | Failed login attempts exceeded |
| **429** | Too many requests - Rate limited | Exceeded request limit |
| **500** | Server error - Unexpected error | Database connection failed |

### Validation Error Response

```json
{
  "message": "Validation failed",
  "statusCode": 422,
  "errors": {
    "email": ["Email is required", "Email must be valid"],
    "password": ["Password must be at least 8 characters"]
  }
}
```

---

## ⏱️ Rate Limiting

Rate limits protect against abuse and brute force attacks.

### Limits by Endpoint Category

| Category | Limit | Window | Note |
|----------|-------|--------|------|
| Authentication | 5 attempts | 15 min | Login, register |
| General API | 100 requests | 15 min | Most endpoints |
| Password Reset | 3 attempts | 1 hour | Forgot-password |

### Rate Limit Headers

```http
X-RateLimit-Limit: 100
X-RateLimit-Remaining: 87
X-RateLimit-Reset: 1712762200
```

### When Rate Limited

**Response (429 Too Many Requests):**
```json
{
  "message": "Too many requests. Please try again later.",
  "statusCode": 429,
  "retryAfter": 300
}
```

---

## 🔒 Security Best Practices

### On Client Side

1. **Store Token Securely:**
   ```javascript
   // ✅ Good: sessionStorage (cleared on tab close)
   sessionStorage.setItem('token', token);
   
   // ⚠️ Risky: localStorage (persistent, XSS vulnerable)
   localStorage.setItem('token', token);
   
   // ❌ Never: cookies without HttpOnly flag
   ```

2. **Include Token in Requests:**
   ```javascript
   const headers = {
     'Authorization': `Bearer ${token}`,
     'Content-Type': 'application/json'
   };
   ```

3. **Handle Token Expiration:**
   ```javascript
   if (response.status === 401) {
     // Token expired, redirect to login
     redirectToLogin();
   }
   ```

### On Server Side

- ✅ Tokens signed with strong secret (32+ chars)
- ✅ HTTPS enforced in production
- ✅ Rate limiting on auth endpoints
- ✅ Account lockout after 5 failed attempts
- ✅ Passwords hashed with bcrypt (10 rounds min)
- ✅ CORS restricted to approved origins
- ✅ Helmet security headers enabled

---

## 📊 Database Relationships

### User → Role-Specific Profiles
```
User (1) ──→ (1:1) Student
        ──→ (1:1) Company
        ──→ (1:1) Coordinator
```

### Application Workflow
```
Student → Skills → Matching Engine
   ↓
Applications → OJT Postings ← Company
   ↓          ├─ Required Skills
Notifications  └─ Locations
```

### Audit Trail
```
Any table modification → AuditLog
(User CRUD, status changes, etc.)
```

---

## 📝 Examples

### Complete Registration → Login → Apply Flow

1. **Register as Student:**
   ```bash
   curl -X POST http://localhost:3000/api/auth/register \
     -H "Content-Type: application/json" \
     -d '{
       "name": "John Doe",
       "email": "john@example.com",
       "password": "SecurePass123!",
       "role": "student"
     }'
   ```

2. **Login:**
   ```bash
   curl -X POST http://localhost:3000/api/auth/login \
     -H "Content-Type: application/json" \
     -d '{
       "email": "john@example.com",
       "password": "SecurePass123!"
     }'
   ```

3. **Update Profile:**
   ```bash
   curl -X PUT http://localhost:3000/api/students/profile \
     -H "Authorization: Bearer {token}" \
     -H "Content-Type: application/json" \
     -d '{
       "gpa": 3.5,
       "academic_program": "Computer Science",
       "preferred_locations": ["Manila"]
     }'
   ```

4. **Add Skills:**
   ```bash
   curl -X POST http://localhost:3000/api/students/skills \
     -H "Authorization: Bearer {token}" \
     -H "Content-Type: application/json" \
     -d '{
       "name": "JavaScript",
       "proficiency_level": "advanced"
     }'
   ```

5. **Get Matches:**
   ```bash
   curl -X GET "http://localhost:3000/api/matches?minScore=70" \
     -H "Authorization: Bearer {token}"
   ```

6. **Apply to Job:**
   ```bash
   curl -X POST http://localhost:3000/api/applications \
     -H "Authorization: Bearer {token}" \
     -H "Content-Type: application/json" \
     -d '{
       "posting_id": "posting-uuid",
       "cover_letter": "I'm interested..."
     }'
   ```

---

## 🧪 Testing the API

### Using cURL

```bash
# Health check
curl http://localhost:3000/health

# Register
curl -X POST http://localhost:3000/api/auth/register \
  -H "Content-Type: application/json" \
  -d '{"name":"Test","email":"test@test.com","password":"Test1234!","role":"student"}'

# Login
curl -X POST http://localhost:3000/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"test@test.com","password":"Test1234!"}'

# Protected endpoint
curl http://localhost:3000/api/user \
  -H "Authorization: Bearer {your_token}"
```

### Using Postman

1. Import the API endpoints
2. Set up environment variables:
   - `base_url`: `http://localhost:3000`
   - `token`: Save from login response
3. Use `{{base_url}}/api/...` in request URLs
4. Add `Authorization: Bearer {{token}}` header

---

## 📞 Support

- **Issues:** Check TEST-VERIFICATION-REPORT.md
- **Bugs:** See FIXES-IMPLEMENTATION-SUMMARY.md
- **Architecture:** See SYSTEM-ARCHITECTURE.md
- **Database:** See DATABASE-SCHEMA-DOCUMENTATION.md
- **Services:** See SERVICE-LAYER-DOCUMENTATION.md
