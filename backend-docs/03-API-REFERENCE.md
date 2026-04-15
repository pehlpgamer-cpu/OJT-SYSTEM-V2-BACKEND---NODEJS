# 03 - API Reference

**Version:** 2.2.0  
**Last Updated:** April 15, 2026  
**Base URL Dev:** `http://localhost:5000/api`  
**Base URL Prod:** `https://ojt-system-v2-backend-nodejs.vercel.app/api`  
**Authentication:** Bearer Token (JWT with HS256)  
**JWT Expiration:** 7 Days
**Default Content-Type:** `application/json`

---

## 📋 Table of Contents
1. [Authentication Endpoints](#authentication-endpoints)
2. [Student Routes (Authenticated)](#student-routes-authenticated)
3. [Company Routes (Authenticated)](#company-routes-authenticated)
4. [Job Postings (Mixed Auth)](#job-postings-mixed-auth)
5. [Applications & Matching](#applications--matching)
6. [Notifications](#notifications)
7. [Administrator Routes](#administrator-routes)
8. [Error Responses](#error-responses)
9. [Rate Limiting](#rate-limiting)
10. [Data Format Standards](#data-format-standards)

---

## 🔐 Authentication Endpoints

### Register New User

```http
POST /auth/register
Content-Type: application/json

{
  "name": "John Doe",
  "email": "john@example.com",
  "password": "SecurePass123!",
  "password_confirmation": "SecurePass123!",
  "role": "student"  // student, company, or coordinator
}
```

**Response (201 Created):**
```json
{
  "user": {
    "id": 1,
    "name": "John Doe",
    "email": "john@example.com",
    "role": "student",
    "status": "active"
  },
  "token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
  "statusCode": 201
}
```

**Validation Rules:**
- Email: Valid email format, must not exist
- Password: Min 8 chars, 1 uppercase, 1 digit, 1 special char
- Name: 2-255 chars, letters/spaces/hyphens/apostrophes
- Role: Must be 'student', 'company', or 'coordinator'

---

### Login

```http
POST /auth/login
Content-Type: application/json

{
  "email": "john@example.com",
  "password": "SecurePass123!"
}
```

**Response (200 OK):**
```json
{
  "user": {
    "id": 1,
    "name": "John Doe",
    "email": "john@example.com",
    "role": "student",
    "status": "active"
  },
  "token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
  "statusCode": 200
}
```

**Error Cases:**
- 401: Invalid email or password
- 423: Account locked (too many failed attempts)
- 403: Account pending/suspended/inactive
- 422: Validation failed

**Account Lockout:**
- After 5 failed login attempts: account locked for 30 minutes
- lockedUntil timestamp set on User record
- `failedLoginAttempts` counter reset on successful login

---

## � Google OAuth Endpoints

**New Feature:** Google OAuth 2.0 authentication and account linking

### Initiate Google OAuth Flow

**Redirect to Google Login**

```http
GET /api/auth/google/redirect?role=student&linking=false
```

**Query Parameters:**
- `role`: `student` (default), `company`, or `coordinator` - Role for new signup
- `linking`: `true` if linking existing account, `false` for new signup

**Frontend Implementation:**

```html
<!-- Sign up / Login with Google -->
<a href="http://localhost:5000/api/auth/google/redirect">
  Sign in with Google
</a>

<!-- Linking existing account -->
<a href="http://localhost:5000/api/auth/google/redirect?linking=true">
  Link Google Account
</a>
```

**What Happens:**
1. User is redirected to Google login page
2. After authentication, redirected to callback endpoint
3. Token returned via query string
4. Frontend receives token and stores in localStorage

**Response Format:**
```
Redirect to: https://accounts.google.com/o/oauth2/v2/auth?
  client_id=YOUR_CLIENT_ID
  redirect_uri=http://localhost:5000/api/auth/google/callback
  response_type=code
  scope=profile email
  state=...
```

---

### Google OAuth Callback

```http
GET /api/auth/google/callback?code=<auth_code>&state=<state>
```

**Parameters (auto-populated by Google):**
- `code`: Authorization code from Google
- `state`: CSRF protection token

**Response (Redirects to Frontend):**
```
Frontend receives query params:
?token=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...&status=success
```

**Or (if linking required):**
```
?requiresLinking=true&existingUserId=1&status=linking_required
```

**Token Details:**
```javascript
// Token payload (decoded)
{
  id: 1,
  email: "user@gmail.com",
  name: "John Doe",
  role: "student",
  google_linked: true,
  iat: 1712582400,
  exp: 1712668800
}
```

**Error Cases:**
- `?error=invalid_code` - Authorization code invalid
- `?error=access_denied` - User denied permission
- Redirects to frontend with error param for handling

---

### Confirm Account Linking (Optional)

When user tries to link Google to existing email:

**Frontend Flow:**
```javascript
// 1. Backend returns requiresLinking=true and existingUserId
// 2. Frontend shows confirmation dialog
// 3. User confirms linking
// 4. Frontend calls confirm endpoint
```

```http
POST /api/auth/google/confirm-link
Authorization: Bearer <token>
Content-Type: application/json

{
  "existingUserId": 1,
  "confirmLinking": true
}
```

**Response (200 OK):**
```json
{
  "user": {
    "id": 1,
    "name": "John Doe",
    "email": "john@example.com",
    "google_linked": true,
    "auth_provider": "google"
  },
  "token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
  "message": "Google account linked successfully",
  "statusCode": 200
}
```

**Errors:**
- 400: Email mismatch
- 409: Google ID already linked to another user
- 403: Cannot link (security requirement: must have password first)

---

### Unlink Google Account

Remove Google OAuth from existing account (keep email/password auth):

```http
POST /api/auth/google/unlink
Authorization: Bearer <token>
```

**Response (200 OK):**
```json
{
  "user": {
    "id": 1,
    "name": "John Doe",
    "email": "john@example.com",
    "google_linked": false,
    "auth_provider": "email"
  },
  "message": "Google account unlinked successfully",
  "statusCode": 200
}
```

**Errors:**
- 400: No password set (cannot unlink - no other auth method)
- 403: Google not linked to this account

---

### Validate Token

Verify current token is still valid (for session checks):

```http
GET /api/auth/validate-token
Authorization: Bearer <token>
```

**Response (200 OK):**
```json
{
  "valid": true,
  "user": {
    "id": 1,
    "email": "john@example.com",
    "role": "student",
    "google_linked": true
  },
  "expiresIn": 86400,  // Seconds until expiration
  "statusCode": 200
}
```

**Errors:**
- 401: Token invalid or expired

---

## �👤 Student Endpoints

### Get Student Profile

```http
GET /api/student/profile
Authorization: Bearer <token>
```

**Response (200 OK):**
```json
{
  "student": {
    "id": 1,
    "user_id": 1,
    "first_name": "John",
    "last_name": "Doe",
    "phone": "+12125551234",
    "bio": "Computer Science student...",
    "current_location": "New York",
    "preferred_location": "San Francisco",
    "availability_start": "2026-06-01T00:00:00Z",
    "availability_end": "2026-08-31T00:00:00Z",
    "profile_completeness_percentage": 75,
    "gpa": 3.85,
    "academic_program": "Computer Science",
    "year_of_study": "3rd"
  },
  "statusCode": 200
}
```

**Required:** Authentication (student role)

---

### Update Student Profile

```http
PUT /api/student/profile
Authorization: Bearer <token>
Content-Type: application/json

{
  "first_name": "John",
  "last_name": "Doe",
  "phone": "+12125551234",
  "bio": "Updated bio...",
  "preferred_location": "San Francisco",
  "availability_start": "2026-06-01",
  "availability_end": "2026-08-31",
  "gpa": 3.85,
  "academic_program": "Computer Science",
  "year_of_study": "3rd"
}
```

**Response (200 OK):**
```json
{
  "student": { ... updated student data ... },
  "statusCode": 200
}
```

**Side Effect:**
- `profile_completeness_percentage` automatically recalculated
- MatchScore records invalidated (will be recalculated)

---

### Add Student Skill

```http
POST /api/student/skills
Authorization: Bearer <token>
Content-Type: application/json

{
  "skill_name": "Java",
  "proficiency_level": "advanced",  // beginner, intermediate, advanced, expert
  "years_of_experience": 3.5
}
```

**Response (201 Created):**
```json
{
  "skill": {
    "id": 5,
    "student_id": 1,
    "skill_name": "Java",
    "proficiency_level": "advanced",
    "years_of_experience": 3.5,
    "endorsed_count": 0
  },
  "statusCode": 201
}
```

---

### Get Student Skills

```http
GET /api/student/skills
Authorization: Bearer <token>
```

**Query Parameters:**
- `proficiency`: Filter by level (beginner, intermediate, advanced, expert)

**Response (200 OK):**
```json
{
  "skills": [
    {
      "id": 1,
      "skill_name": "Java",
      "proficiency_level": "advanced",
      "years_of_experience": 3.5,
      "endorsed_count": 2
    },
    {
      "id": 2,
      "skill_name": "SQL",
      "proficiency_level": "advanced",
      "years_of_experience": 2.0,
      "endorsed_count": 0
    }
  ],
  "statusCode": 200
}
```

---

### Get Student Matches

```http
GET /api/student/matches
Authorization: Bearer <token>
```

**Query Parameters:**
- `sort`: Field to sort by (overall_score, location_score, etc) - default: overall_score DESC
- `limit`: Results per page (default: 20)
- `offset`: Pagination offset (default: 0)
- `min_score`: Minimum match score (0-100)

**Response (200 OK):**
```json
{
  "matches": [
    {
      "id": 1,
      "overall_score": 87.5,
      "match_status": "highly_compatible",
      "skill_score": 90,
      "location_score": 75,
      "availability_score": 95,
      "gpa_score": 85,
      "academic_program_score": 80,
      "posting": {
        "id": 1,
        "title": "Junior Developer",
        "company_name": "Tech Corp",
        "location": "San Francisco",
        "salary_range_min": 50000,
        "salary_range_max": 70000,
        "duration_weeks": 12
      }
    }
  ],
  "pagination": {
    "total": 24,
    "page": 1,
    "limit": 20
  },
  "statusCode": 200
}
```

**Algorithm:**
- Scores calculated as: (skill 40% + location 20% + availability 20% + GPA 10% + program 10%)
- Matches sorted by overall_score descending
- Only shows 'active' job postings

---

## 🏢 Company Endpoints

### Create Job Posting

```http
POST /api/company/postings
Authorization: Bearer <token>
Content-Type: application/json

{
  "title": "Junior Developer",
  "description": "Looking for...",
  "location": "San Francisco",
  "allow_remote": true,
  "duration_weeks": 12,
  "start_date": "2026-06-01",
  "salary_range_min": 50000,
  "salary_range_max": 70000,
  "stipend": true,
  "min_gpa": 3.0,
  "academic_program": "Computer Science",
  "min_year_of_study": "2nd",
  "positions_available": 3
}
```

**Response (201 Created):**
```json
{
  "posting": {
    "id": 1,
    "company_id": 1,
    "title": "Junior Developer",
    "description": "...",
    "location": "San Francisco",
    "posting_status": "draft"
  },
  "statusCode": 201
}
```

**Permissions:**
- Only companies with `accreditation_status = 'approved'` can post
- Only companies with `is_approved_for_posting = true`

---

### Get Company Postings

```http
GET /api/company/postings
Authorization: Bearer <token>
```

**Query Parameters:**
- `status`: Filter by status (draft, active, closed, archived)
- `limit`: Results per page
- `offset`: Pagination

**Response (200 OK):**
```json
{
  "postings": [
    {
      "id": 1,
      "title": "Junior Developer",
      "posting_status": "active",
      "positions_available": 3,
      "positions_filled": 1,
      "applications_count": 15,
      "views_count": 234
    }
  ],
  "statusCode": 200
}
```

---

### Update Posting Status

```http
PUT /api/company/postings/:id/status
Authorization: Bearer <token>
Content-Type: application/json

{
  "posting_status": "active"  // draft, active, closed, archived
}
```

**Response (200 OK):**
```json
{
  "posting": { ... updated posting ... },
  "statusCode": 200
}
```

---

### Get Applications for Posting

```http
GET /api/company/postings/:id/applications
Authorization: Bearer <token>
```

**Query Parameters:**
- `status`: Filter by status (submitted, under_review, shortlisted, rejected, hired)

**Response (200 OK):**
```json
{
  "applications": [
    {
      "id": 1,
      "student": {
        "id": 1,
        "name": "John Doe",
        "email": "john@example.com"
      },
      "application_status": "submitted",
      "match_score": 87.5,
      "applied_at": "2026-04-08T10:30:00Z"
    }
  ],
  "statusCode": 200
}
```

---

## 📋 Application Endpoints

### Submit Application

```http
POST /api/applications/:posting_id
Authorization: Bearer <token>
Content-Type: application/json

{
  "cover_letter": "I'm interested because...",
  "resume_id": 1  // Optional: resume to attach
}
```

**Response (201 Created):**
```json
{
  "application": {
    "id": 1,
    "student_id": 1,
    "posting_id": 1,
    "application_status": "submitted",
    "match_score": 87.5,
    "applied_at": "2026-04-08T10:30:00Z"
  },
  "statusCode": 201
}
```

**Constraints:**
- Student can only apply once per posting (unique constraint)
- Company posting must be active
- Student must exist and have profile

---

### Get Application Status

```http
GET /api/applications/:id
Authorization: Bearer <token>
```

**Response (200 OK):**
```json
{
  "application": {
    "id": 1,
    "student_id": 1,
    "posting_id": 1,
    "application_status": "under_review",
    "match_score": 87.5,
    "company_feedback": null,
    "applied_at": "2026-04-08T10:30:00Z",
    "reviewed_at": "2026-04-08T15:00:00Z",
    "interviewing_at": null
  },
  "statusCode": 200
}
```

---

### Update Application Status (Company Only)

```http
PUT /api/applications/:id/status
Authorization: Bearer <token>
Content-Type: application/json

{
  "application_status": "shortlisted",  // or rejected, hired, etc
  "company_feedback": "Great fit for our team!",
  "rejection_reason": null  // If rejecting
}
```

**Response (200 OK):**
```json
{
  "application": { ... updated application ... },
  "statusCode": 200
}
```

---

## 🔔 Notification Endpoints

### Get Notifications

```http
GET /api/notifications
Authorization: Bearer <token>
```

**Query Parameters:**
- `is_read`: Filter by read status (true/false)
- `limit`: Results per page
- `offset`: Pagination

**Response (200 OK):**
```json
{
  "notifications": [
    {
      "id": 1,
      "notification_type": "application_accepted",
      "title": "Your application was accepted!",
      "message": "Great news! Tech Corp accepted your application.",
      "is_read": false,
      "action_url": "/applications/1",
      "createdAt": "2026-04-08T10:30:00Z"
    }
  ],
  "statusCode": 200
}
```

---

### Mark Notification as Read

```http
PUT /api/notifications/:id/read
Authorization: Bearer <token>
```

**Response (200 OK):**
```json
{
  "notification": { ... notification with is_read=true ... },
  "statusCode": 200
}
```

---

## 🔐 Error Responses

All errors follow this format:

```json
{
  "message": "Error description",
  "statusCode": 400,
  "timestamp": "2026-04-08T10:30:00Z"
}
```

### Common Status Codes

| Code | Meaning | Example |
|------|---------|---------|
| 200 | OK | Successful GET/PUT/UPDATE |
| 201 | Created | Successful POST |
| 400 | Bad Request | Invalid JSON |
| 401 | Unauthorized | Missing/invalid token |
| 403 | Forbidden | Insufficient permissions |
| 404 | Not Found | Resource doesn't exist |
| 409 | Conflict | Duplicate email, duplicate application |
| 422 | Unprocessable Entity | Validation failed |
| 423 | Locked | Account locked (too many failed logins) |
| 500 | Server Error | Unexpected error |

---

## 🔑 Authentication

All protected endpoints require the `Authorization` header:

```http
Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
```

**Token Details:**
- Format: JWT (JSON Web Token)
- Encoding: HS256
- Expiration: 7 days
- Contains: { id, email, role, createdAt }

**How to get token:**
1. Call `/auth/register` or `/auth/login`
2. Token returned in response
3. Store in localStorage/sessionStorage
4. Send with all subsequent requests

---

## ⚙️ Request Options

### Pagination

Endpoints with large result sets support pagination:

```http
GET /api/student/matches?limit=20&offset=0
```

- `limit`: Results per page (default: 20, max: 100)
- `offset`: Skip this many records (default: 0)

Response includes:
```json
{
  "data": [...],
  "pagination": {
    "total": 100,
    "limit": 20,
    "offset": 0
  }
}
```

### Sorting

Supported sorting:

```http
GET /api/student/matches?sort=overall_score:desc
```

- Format: `fieldname:asc` or `fieldname:desc`
- Default: `createdAt:desc` (newest first)

---

## 🚀 Rate Limiting

```
Rate Limit: 100 requests per 15 minutes
```

Headers returned:
```
X-RateLimit-Limit: 100
X-RateLimit-Remaining: 95
X-RateLimit-Reset: 1712582400
```

---

**Next:** See [**04-MODELS.md**](./04-MODELS.md) for data model details.
