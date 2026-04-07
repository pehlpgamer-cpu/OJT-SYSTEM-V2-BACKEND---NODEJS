# OJT System V2 - API Reference Guide

**Version:** 2.0  
**API Standard:** RESTful with JSON  
**Authentication:** Bearer Token (Laravel Sanctum)  
**Base URL:** `http://localhost:8000/api`  
**Content-Type:** `application/json`

---

## Table of Contents
1. [API Overview](#api-overview)
2. [Authentication Endpoints](#authentication-endpoints)
3. [Student Endpoints](#student-endpoints)
4. [Company Endpoints](#company-endpoints)
5. [Application Endpoints](#application-endpoints)
6. [Admin Endpoints](#admin-endpoints)
7. [Public Endpoints](#public-endpoints)
8. [Error Responses](#error-responses)
9. [Rate Limiting](#rate-limiting)

---

## API Overview

### Base Authentication

All authenticated endpoints require the `Authorization` header:

```http
Authorization: Bearer {api_token}
```

**Token Acquisition:**
1. Register/Login to obtain token
2. Store token in client (localStorage/sessionStorage)
3. Include in all subsequent requests

### Response Format

```json
{
  "message": "Operation description",
  "data": {
    "id": 1,
    "name": "John Doe",
    "email": "john@example.com"
  }
}
```

Or on error:

```json
{
  "message": "Error description",
  "errors": {
    "field_name": ["Error message 1", "Error message 2"]
  }
}
```

### Status Codes

| Code | Meaning | Usage |
|------|---------|-------|
| 200 | OK | Successful GET/PUT/DELETE |
| 201 | Created | Successful POST |
| 400 | Bad Request | Invalid input data |
| 401 | Unauthorized | Missing/invalid token |
| 403 | Forbidden | User lacks permission |
| 404 | Not Found | Resource doesn't exist |
| 422 | Unprocessable | Validation failed |
| 429 | Too Many Requests | Rate limit exceeded |
| 500 | Server Error | Unexpected server error |

---

## Authentication Endpoints

### POST `/api/auth/register`

Create a new user account with role-specific profile.

**Request:**
```json
{
  "name": "John Doe",
  "email": "john@example.com",
  "password": "SecurePassword123!",
  "password_confirmation": "SecurePassword123!",
  "role": "student"
}
```

**Role Options:**
- `student` - Job seeker (auto-active)
- `company` - Job poster (pending approval)
- `coordinator` - Academic supervisor (pending approval)
- `admin` - System administrator (admin only)

**Response (201 Created):**
```json
{
  "message": "Registration successful.",
  "user": {
    "id": 1,
    "name": "John Doe",
    "email": "john@example.com",
    "role": "student",
    "status": "active"
  }
}
```

**Validation Rules:**
- name: required, string, max 255
- email: required, unique, valid email format
- password: required, min 8 chars, confirmation match
- role: required, in [student, company, coordinator]

**Auto-Created Profiles:**
```
Role: student
├─ Creates Student record (profile_completeness: 0%)
└─ Account status: active

Role: company
├─ Creates Company record (accreditation_status: pending)
└─ Account status: pending

Role: coordinator
├─ Creates Coordinator record
└─ Account status: pending
```

---

### POST `/api/auth/login`

Authenticate and receive API token.

**Request:**
```json
{
  "email": "john@example.com",
  "password": "SecurePassword123!"
}
```

**Response (200 OK):**
```json
{
  "message": "Login successful.",
  "token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
  "user": {
    "id": 1,
    "name": "John Doe",
    "email": "john@example.com",
    "role": "student",
    "status": "active"
  }
}
```

**Error (401 Unauthorized):**
```json
{
  "message": "Invalid credentials."
}
```

**Error (403 Forbidden - Suspended):**
```json
{
  "message": "Account is not active. Current status: suspended"
}
```

**Security:**
- Rate limited: 5 attempts per minute (OWASP protection)
- Post-login: Updates `last_login_at` timestamp
- Token: Single-use, revoked on logout

---

### POST `/api/auth/logout`

Revoke the current access token.

**Request:**
```
Authorization: Bearer {token}
```

**Response (200 OK):**
```json
{
  "message": "Logged out."
}
```

---

### POST `/api/auth/verify-email`

Verify email address (placeholder for future email integration).

**Request:**
```json
{
  "email": "john@example.com",
  "code": "123456"
}
```

**Response:**
```json
{
  "message": "Email verified successfully."
}
```

**Current Status:** Auto-verified on registration (no real email system yet).

---

### POST `/api/auth/forgot-password`

Request password reset token.

**Request:**
```json
{
  "email": "john@example.com"
}
```

**Response (200 OK):**
```json
{
  "message": "Password reset link sent to your email."
}
```

**Rate Limit:** 3 attempts per minute (OWASP protection)

---

### POST `/api/auth/reset-password`

Reset password using reset token.

**Request:**
```json
{
  "email": "john@example.com",
  "token": "reset_token_from_email",
  "password": "NewPassword123!",
  "password_confirmation": "NewPassword123!"
}
```

**Response (200 OK):**
```json
{
  "message": "Password reset successfully."
}
```

---

## Student Endpoints

### GET `/api/students/me`

Get current student profile.

**Request:**
```
Authorization: Bearer {token}
Method: GET
```

**Response (200 OK):**
```json
{
  "message": "Student profile retrieved.",
  "data": {
    "id": 1,
    "user_id": 1,
    "first_name": "John",
    "last_name": "Doe",
    "phone": "555-1234",
    "address": "123 Main St",
    "school": "University Name",
    "course": "Computer Science",
    "year_level": 3,
    "profile_completeness": 75,
    "created_at": "2026-02-06T00:00:00Z",
    "updated_at": "2026-04-07T10:00:00Z"
  }
}
```

**Authorization:** Student only (checks own profile)

---

### PUT `/api/students/me`

Update student profile.

**Request:**
```json
{
  "first_name": "John",
  "last_name": "Doe",
  "phone": "555-5678",
  "address": "123 New St",
  "school": "University Name",
  "course": "Computer Science",
  "year_level": 4
}
```

**Response (200 OK):**
```json
{
  "message": "Profile updated successfully.",
  "data": {
    "id": 1,
    "first_name": "John",
    "last_name": "Doe",
    "profile_completeness": 85,
    "updated_at": "2026-04-07T10:30:00Z"
  }
}
```

**Validation:**
- first_name: string, max 255
- last_name: string, max 255
- phone: string, max 20
- address: string, max 500
- school: string, max 255
- course: string, max 255
- year_level: integer, 1-4

**Side Effect:** Updates `profile_completeness` percentage

---

### PUT `/api/students/me/skills`

Update student skills and proficiency.

**Request:**
```json
{
  "skills": [
    {
      "skill_name": "Java",
      "proficiency": "advanced"
    },
    {
      "skill_name": "Python",
      "proficiency": "intermediate"
    },
    {
      "skill_name": "MySQL",
      "proficiency": "intermediate"
    }
  ]
}
```

**Proficiency Levels:**
- `beginner` - Foundational knowledge
- `intermediate` - Practical working knowledge
- `advanced` - Expert-level capability

**Response (200 OK):**
```json
{
  "message": "Skills updated successfully.",
  "data": {
    "student_id": 1,
    "skills": [
      {
        "id": 1,
        "skill_name": "Java",
        "proficiency": "advanced"
      }
    ]
  }
}
```

**Logic:**
- Deletes previous skills
- Inserts new skills
- Triggers match score recalculation (future)

---

### PUT `/api/students/me/preferences`

Update job preferences.

**Request:**
```json
{
  "preferred_location": "Metro Manila",
  "preferred_industry": "Technology",
  "preferred_duration": "3 months"
}
```

**Response (200 OK):**
```json
{
  "message": "Preferences updated successfully.",
  "data": {
    "id": 1,
    "student_id": 1,
    "preferred_location": "Metro Manila",
    "preferred_industry": "Technology",
    "preferred_duration": "3 months"
  }
}
```

---

### PUT `/api/students/me/availability`

Update availability windows.

**Request:**
```json
{
  "available_from": "2026-05-01",
  "available_until": "2026-08-31",
  "preferred_schedule": "Monday-Friday, 8AM-5PM"
}
```

**Response (200 OK):**
```json
{
  "message": "Availability updated successfully.",
  "data": {
    "id": 1,
    "student_id": 1,
    "available_from": "2026-05-01",
    "available_until": "2026-08-31",
    "preferred_schedule": "Monday-Friday, 8AM-5PM"
  }
}
```

---

### POST `/api/students/me/resumes`

Upload a new resume.

**Request (Form Data):**
```
Content-Type: multipart/form-data

file: <binary PDF file>
```

**Constraints:**
- Max file size: 5 MB
- Allowed types: .pdf, .doc, .docx

**Response (201 Created):**
```json
{
  "message": "Resume uploaded successfully.",
  "data": {
    "id": 1,
    "student_id": 1,
    "file_name": "JohnDoe_Resume.pdf",
    "file_path": "/resumes/student_1/JohnDoe_Resume.pdf",
    "mime_type": "application/pdf",
    "file_size": 245632,
    "is_active": false,
    "created_at": "2026-04-07T10:00:00Z"
  }
}
```

---

### GET `/api/students/me/resumes`

List all student resumes.

**Response (200 OK):**
```json
{
  "message": "Resumes retrieved.",
  "data": [
    {
      "id": 1,
      "file_name": "JohnDoe_Resume.pdf",
      "is_active": true,
      "created_at": "2026-03-15T00:00:00Z"
    },
    {
      "id": 2,
      "file_name": "JohnDoe_Resume_v2.pdf",
      "is_active": false,
      "created_at": "2026-04-07T10:00:00Z"
    }
  ]
}
```

---

### GET `/api/students/me/resumes/{id}`

Retrieve specific resume details.

**Response (200 OK):**
```json
{
  "message": "Resume retrieved.",
  "data": {
    "id": 1,
    "file_name": "JohnDoe_Resume.pdf",
    "file_path": "/resumes/student_1/JohnDoe_Resume.pdf",
    "mime_type": "application/pdf",
    "file_size": 245632,
    "is_active": true
  }
}
```

---

### DELETE `/api/students/me/resumes/{id}`

Delete a resume.

**Response (200 OK):**
```json
{
  "message": "Resume deleted successfully."
}
```

**Constraint:** Cannot delete resume if it's the active resume.

---

### PUT `/api/students/me/resumes/{id}/activate`

Set as active resume (used in applications by default).

**Request:**
```json
{}
```

**Response (200 OK):**
```json
{
  "message": "Resume activated successfully.",
  "data": {
    "id": 1,
    "is_active": true
  }
}
```

**Side Effect:** Sets previous active resume to `is_active = false`

---

### GET `/api/students/me/recommendations`

Get recommended job postings based on match scores.

**Query Parameters:**
```
?limit=10&min_score=50
```

**Response (200 OK):**
```json
{
  "message": "Recommendations retrieved.",
  "data": [
    {
      "ojt_posting_id": 5,
      "title": "Junior Developer",
      "company_name": "Tech Corp",
      "location": "Metro Manila",
      "total_score": 85,
      "skill_score": 90,
      "location_score": 100,
      "availability_score": 70,
      "slots": 3,
      "slots_filled": 1,
      "duration": "3 months"
    }
  ]
}
```

**Sorting:** By `total_score` descending

---

### GET `/api/ojt-postings`

Browse all active job postings (public).

**Query Parameters:**
```
?page=1&per_page=15&location=Metro Manila&industry=Technology&search=developer
```

**Response (200 OK):**
```json
{
  "message": "Postings retrieved.",
  "data": [
    {
      "id": 5,
      "title": "Junior Developer",
      "company": {
        "id": 2,
        "company_name": "Tech Corp"
      },
      "location": "Metro Manila",
      "industry": "Technology",
      "slots": 3,
      "slots_filled": 1,
      "duration": "3 months",
      "status": "active",
      "created_at": "2026-02-15T00:00:00Z"
    }
  ],
  "pagination": {
    "current_page": 1,
    "per_page": 15,
    "total": 42,
    "last_page": 3
  }
}
```

---

### GET `/api/ojt-postings/{id}`

View detailed posting information.

**Response (200 OK):**
```json
{
  "message": "Posting retrieved.",
  "data": {
    "id": 5,
    "title": "Junior Developer",
    "description": "We are looking for...",
    "company": {
      "id": 2,
      "company_name": "Tech Corp",
      "industry": "Technology",
      "address": "123 Tech Street",
      "contact_person": "Jane Smith",
      "contact_phone": "555-9999"
    },
    "location": "Metro Manila",
    "slots": 3,
    "slots_filled": 1,
    "duration": "3 months",
    "schedule": {
      "monday": {"start": "08:00", "end": "17:00"},
      "wednesday": {"start": "08:00", "end": "17:00"},
      "friday": {"start": "08:00", "end": "17:00"}
    },
    "skills": [
      {
        "id": 1,
        "skill_name": "Java",
        "is_required": true,
        "proficiency_min": "intermediate"
      }
    ],
    "status": "active",
    "created_at": "2026-02-15T00:00:00Z"
  }
}
```

---

## Application Endpoints

### POST `/api/applications`

Submit application to OJT posting.

**Request:**
```json
{
  "ojt_posting_id": 5,
  "resume_id": 1,
  "cover_letter": "I am interested in this position because..."
}
```

**Parameters:**
- ojt_posting_id: required, must be active posting with available slots
- resume_id: optional (uses active resume if not specified)
- cover_letter: optional

**Response (201 Created):**
```json
{
  "message": "Application submitted.",
  "data": {
    "id": 42,
    "student_id": 1,
    "ojt_posting_id": 5,
    "resume_id": 1,
    "status": "pending",
    "cover_letter": "I am interested...",
    "created_at": "2026-04-07T10:00:00Z"
  }
}
```

**Validation:**
- Posting must be active
- Posting must have available slots
- Cannot apply twice to same posting
- Student must have a resume

**Side Effect:**
- Creates notification for company
- Logs audit entry
- Triggers email to company (future)

---

### GET `/api/students/me/applications`

List student's own applications.

**Query Parameters:**
```
?page=1&per_page=15&status=pending
```

**Response (200 OK):**
```json
{
  "message": "Applications retrieved.",
  "data": [
    {
      "id": 42,
      "ojt_posting": {
        "id": 5,
        "title": "Junior Developer",
        "company": {
          "company_name": "Tech Corp"
        }
      },
      "status": "pending",
      "created_at": "2026-04-07T10:00:00Z",
      "updated_at": "2026-04-07T10:00:00Z"
    }
  ]
}
```

---

### GET `/api/applications/{id}`

View application details.

**Authorization:** 
- Student who created application, OR
- Company owning the posting, OR
- Admin

**Response (200 OK):**
```json
{
  "message": "Application retrieved.",
  "data": {
    "id": 42,
    "student": {
      "id": 1,
      "first_name": "John",
      "last_name": "Doe",
      "school": "University Name",
      "course": "Computer Science"
    },
    "ojt_posting": {
      "id": 5,
      "title": "Junior Developer"
    },
    "resume": {
      "id": 1,
      "file_name": "JohnDoe_Resume.pdf"
    },
    "status": "pending",
    "cover_letter": "I am interested...",
    "ojt_progress": null,
    "created_at": "2026-04-07T10:00:00Z"
  }
}
```

---

### DELETE `/api/applications/{id}`

Withdraw application (only if pending).

**Response (200 OK):**
```json
{
  "message": "Application withdrawn."
}
```

**Constraint:** Cannot withdraw accepted applications

---

## Company Endpoints

### PUT `/api/company/postings/{id}/update-status`

Update application status to accepted or rejected.

**Request:**
```json
{
  "status": "accepted",
  "notes": "Congratulations! You have been accepted."
}
```

**Response (200 OK):**
```json
{
  "message": "Application status updated.",
  "data": {
    "id": 42,
    "status": "accepted"
  }
}
```

**Side Effect:**
- If accepted: Creates OjtProgress record for student
- Sends notification to student
- Logs audit entry

---

### POST `/api/company/postings`

Create new job posting.

**Request:**
```json
{
  "title": "Junior Developer",
  "description": "We are looking for...",
  "location": "Metro Manila",
  "industry": "Technology",
  "slots": 3,
  "duration": "3 months",
  "schedule": {
    "monday": {"start": "08:00", "end": "17:00"},
    "wednesday": {"start": "08:00", "end": "17:00"},
    "friday": {"start": "08:00", "end": "17:00"}
  },
  "skills": [
    {
      "skill_name": "Java",
      "is_required": true,
      "proficiency_min": "intermediate"
    }
  ]
}
```

**Response (201 Created):**
```json
{
  "message": "Posting created successfully.",
  "data": {
    "id": 5,
    "company_id": 2,
    "title": "Junior Developer",
    "status": "active",
    "slots": 3,
    "slots_filled": 0
  }
}
```

---

## Admin Endpoints

### GET `/api/admin/audit-logs`

View all audit logs with pagination and filters.

**Query Parameters:**
```
?page=1&per_page=50&user_id=5&action=create&entity_type=Application
```

**Response (200 OK):**
```json
{
  "message": "Audit logs retrieved.",
  "data": [
    {
      "id": 1,
      "user_id": 5,
      "user": {
        "name": "John Doe",
        "email": "john@example.com"
      },
      "action": "create",
      "entity_type": "Application",
      "entity_id": 42,
      "old_values": null,
      "new_values": {
        "student_id": 1,
        "ojt_posting_id": 5,
        "status": "pending"
      },
      "ip_address": "192.168.1.1",
      "created_at": "2026-04-07T10:00:00Z"
    }
  ]
}
```

---

### GET `/api/admin/users`

List all users with role filtering.

**Query Parameters:**
```
?page=1&per_page=50&role=student&status=active
```

**Response (200 OK):**
```json
{
  "message": "Users retrieved.",
  "data": [
    {
      "id": 1,
      "name": "John Doe",
      "email": "john@example.com",
      "role": "student",
      "status": "active",
      "last_login_at": "2026-04-07T09:00:00Z",
      "created_at": "2026-02-06T00:00:00Z"
    }
  ]
}
```

---

### PUT `/api/admin/users/{id}/status`

Update user account status.

**Request:**
```json
{
  "status": "suspended",
  "reason": "Violation of terms"
}
```

**Response (200 OK):**
```json
{
  "message": "User status updated.",
  "data": {
    "id": 1,
    "status": "suspended"
  }
}
```

---

### GET `/api/admin/matching-rules`

Get current matching algorithm configuration.

**Response (200 OK):**
```json
{
  "message": "Matching rules retrieved.",
  "data": {
    "id": 1,
    "rule_name": "Default Rules",
    "skill_weight": 50,
    "location_weight": 30,
    "availability_weight": 20,
    "minimum_score": 30,
    "is_active": true
  }
}
```

---

### PUT `/api/admin/matching-rules/{id}`

Update matching algorithm weights.

**Request:**
```json
{
  "skill_weight": 60,
  "location_weight": 20,
  "availability_weight": 20,
  "minimum_score": 40
}
```

**Response (200 OK):**
```json
{
  "message": "Matching rules updated.",
  "data": {
    "id": 1,
    "skill_weight": 60,
    "location_weight": 20,
    "availability_weight": 20,
    "minimum_score": 40
  }
}
```

**Validation:** Weights must sum to 100 or less

---

## Public Endpoints

### GET `/api/partner-companies`

List all accredited companies (public, no auth required).

**Response (200 OK):**
```json
{
  "message": "Companies retrieved.",
  "data": [
    {
      "id": 2,
      "company_name": "Tech Corp",
      "industry": "Technology",
      "address": "123 Tech Street",
      "description": "Leading technology solutions provider...",
      "accreditation_status": "Verified"
    }
  ]
}
```

---

### GET `/api/faqs`

Get frequently asked questions (public, no auth required).

**Query Parameters:**
```
?category=Student&status=active
```

**Response (200 OK):**
```json
{
  "message": "FAQs retrieved.",
  "data": [
    {
      "id": 1,
      "question": "How do I apply for an OJT position?",
      "answer": "1. Complete your profile\n2. Upload your resume\n3. Browse available positions\n4. Click Apply",
      "category": "Student"
    }
  ]
}
```

---

### POST `/api/contact`

Submit contact form (public, no auth required).

**Request:**
```json
{
  "name": "Jane Smith",
  "email": "jane@example.com",
  "phone": "555-7777",
  "subject": "Partnership Inquiry",
  "message": "We are interested in partnering with your platform..."
}
```

**Rate Limited:** 5 submissions per minute per IP

**Response (201 Created):**
```json
{
  "message": "Your message has been sent. We will respond shortly.",
  "data": {
    "id": 1,
    "status": "new"
  }
}
```

---

## Error Responses

### Validation Error (422)

```json
{
  "message": "The given data was invalid.",
  "errors": {
    "email": [
      "The email field is required."
    ],
    "password": [
      "The password must be at least 8 characters.",
      "The password confirmation does not match."
    ]
  }
}
```

### Unauthorized (401)

```json
{
  "message": "Unauthenticated."
}
```

### Forbidden (403)

```json
{
  "message": "This action is unauthorized."
}
```

### Not Found (404)

```json
{
  "message": "Resource not found."
}
```

### Server Error (500)

```json
{
  "message": "An unexpected error occurred. Please try again later."
}
```

---

## Rate Limiting

### Default Limits

| Endpoint | Limit | Window |
|----------|-------|--------|
| POST /auth/login | 5 attempts | 1 minute |
| POST /auth/forgot-password | 3 attempts | 1 minute |
| POST /contact | 5 submissions | 1 minute |
| Other authenticated | 60 requests | 1 minute |

### Rate Limit Headers

All responses include:
```
X-RateLimit-Limit: 60
X-RateLimit-Remaining: 45
X-RateLimit-Reset: 1712488800
```

---

## Testing API Endpoints

### Using cURL

```bash
# Login
curl -X POST http://localhost:8000/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{
    "email": "john@example.com",
    "password": "SecurePassword123!"
  }'

# Get student profile
curl -X GET http://localhost:8000/api/students/me \
  -H "Authorization: Bearer YOUR_TOKEN"

# Browse postings
curl -X GET "http://localhost:8000/api/ojt-postings?page=1&location=Metro Manila"
```

### Using Postman

1. Create collection called "OJT System"
2. Set variable `{{base_url}}` = `http://localhost:8000/api`
3. Set variable `{{token}}` = token from login response
4. Use `Authorization: Bearer {{token}}` in collection settings
5. Import endpoints and test

---

## Summary

The OJT API provides **comprehensive RESTful endpoints** for:

✅ **Authentication** - Secure token-based auth with Sanctum  
✅ **Student Management** - Profile, skills, preferences, resumes  
✅ **Job Browsing & Application** - Discover and apply for positions  
✅ **Company Operations** - Post jobs and manage applications  
✅ **Admin Control** - User management, audit logs, algorithm tuning  
✅ **Public Access** - Company info, FAQs, contact forms  

All endpoints follow **RESTful conventions** with **proper status codes**, **validation**, **rate limiting**, and **error handling** for **production-ready** implementation.
