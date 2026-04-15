# 17 - Request & Response Format Guide

**Version:** 1.0.0  
**Last Updated:** April 15, 2026  
**Target:** Frontend developers building consistency in API calls

---

## 📋 Table of Contents
1. [Request Format Standard](#request-format-standard)
2. [Response Format Standard](#response-format-standard)
3. [Pagination Standard](#pagination-standard)
4. [Filtering & Sorting](#filtering--sorting)
5. [Date & Time Format](#date--time-format)
6. [Data Type Conversions](#data-type-conversions)
7. [Common Request/Response Patterns](#common-request-response-patterns)

---

## 📤 Request Format Standard

### Headers Required

All requests must include:

```http
Authorization: Bearer <JWT_TOKEN>
Content-Type: application/json
```

### Authorization Header Format

```
Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpZCI6MSwiZW1haWwiOiJ1c2VyQGV4YW1wbGUuY29tIn0.SIGNATURE
```

**Pattern:** `Bearer <space> <token>`

### Body Format (JSON)

All request bodies are JSON with camelCase property names:

```json
{
  "firstName": "John",
  "lastName": "Doe",
  "emailAddress": "john@example.com",
  "yearsOfExperience": 5,
  "isActive": true
}
```

**Rules:**
- Use **camelCase** for all property names
- All string values are quoted
- Numbers (no quotes): `5`, `true`, `false`
- Arrays: comma-separated, same format
- null for missing values: `"middleName": null`

### Query Parameters Format

Parameters go in the URL query string:

```http
GET /api/postings?limit=20&offset=0&sortBy=createdAt&sortOrder=desc
```

**Format:**
- Query params use camelCase
- Values are URL-encoded
- Multiple values: repeat param or use comma-separated
- Boolean: `true` or `false` (lowercase strings)

### Example: Complex Request

```javascript
// Vue 3 Composable
async function searchPostings(filters) {
  const params = new URLSearchParams({
    limit: filters.limit || 20,
    offset: filters.offset || 0,
    sortBy: filters.sortBy || 'createdAt',
    sortOrder: filters.sortOrder || 'desc',
    minSalary: filters.minSalary || '',
    allowRemote: filters.allowRemote ? 'true' : 'false'
  });
  
  const response = await fetch(
    `${API_BASE_URL}/postings?${params}`,
    {
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json'
      }
    }
  );
  
  return await response.json();
}
```

---

## 📥 Response Format Standard

### Success Response (200-299)

All successful responses follow this structure:

```json
{
  "success": true,
  "statusCode": 200,
  "message": "Operation successful",
  "data": {
    // Actual response data
  },
  "timestamp": "2026-04-15T10:30:00.000Z",
  "requestId": "req-abc123xyz"
}
```

**Fields:**
- `success`: Boolean, always `true` for success
- `statusCode`: HTTP status (200, 201, etc)
- `message`: Human-readable success message
- `data`: The actual response payload (structure varies by endpoint)
- `timestamp`: ISO 8601 UTC timestamp when response created
- `requestId`: Unique ID for tracking/debugging

### Single Resource Response

```json
{
  "success": true,
  "statusCode": 200,
  "message": "Student profile retrieved",
  "data": {
    "id": 1,
    "firstName": "John",
    "lastName": "Doe",
    "email": "john@example.com",
    "profileCompletenessPercentage": 75,
    "createdAt": "2026-01-15T08:00:00.000Z",
    "updatedAt": "2026-04-15T10:30:00.000Z"
  },
  "timestamp": "2026-04-15T10:30:00.000Z",
  "requestId": "req-abc123xyz"
}
```

### Array/List Response

```json
{
  "success": true,
  "statusCode": 200,
  "message": "Skills retrieved",
  "data": [
    {
      "id": 1,
      "skillName": "Java",
      "proficiencyLevel": "advanced",
      "endorsementCount": 2
    },
    {
      "id": 2,
      "skillName": "Python",
      "proficiencyLevel": "intermediate",
      "endorsementCount": 0
    }
  ],
  "timestamp": "2026-04-15T10:30:00.000Z",
  "requestId": "req-abc123xyz"
}
```

### Creation Response (201 Created)

```json
{
  "success": true,
  "statusCode": 201,
  "message": "Skill created successfully",
  "data": {
    "id": 5,
    "skillName": "Python",
    "proficiencyLevel": "advanced",
    "yearsOfExperience": 3.5,
    "endorsementCount": 0,
    "createdAt": "2026-04-15T10:30:00.000Z",
    "updatedAt": "2026-04-15T10:30:00.000Z"
  },
  "timestamp": "2026-04-15T10:30:00.000Z",
  "requestId": "req-abc123xyz"
}
```

### Error Response (4xx-5xx)

Detailed format in [Error Handling Guide](16-ERROR-HANDLING-GUIDE.md):

```json
{
  "success": false,
  "statusCode": 400,
  "error": {
    "code": "VALIDATION_ERROR",
    "message": "Email is required",
    "details": {
      "field": "email",
      "reason": "missing_field"
    }
  },
  "timestamp": "2026-04-15T10:30:00.000Z",
  "requestId": "req-abc123xyz"
}
```

---

## 📊 Pagination Standard

### Pagination Request Format

```http
GET /api/applications?limit=20&offset=0&sortBy=createdAt&sortOrder=desc
```

**Parameters:**
- `limit`: Number of results per page (default: 20, max: 100)
- `offset`: Number of results to skip (0 = first page, 20 = second page)
- `sortBy`: Field to sort by (createdAt, updatedAt, score, etc)
- `sortOrder`: `asc` (ascending) or `desc` (descending, default)

### Pagination Response Format

```json
{
  "success": true,
  "statusCode": 200,
  "message": "Applications retrieved",
  "data": [
    { /* application 1 */ },
    { /* application 2 */ },
    { /* ... up to 20 */ }
  ],
  "pagination": {
    "total": 247,
    "limit": 20,
    "offset": 0,
    "page": 1,
    "totalPages": 13,
    "hasNextPage": true,
    "hasPreviousPage": false
  },
  "timestamp": "2026-04-15T10:30:00.000Z",
  "requestId": "req-abc123xyz"
}
```

**Pagination Fields:**
- `total`: Total number of records matching filter
- `limit`: Records per page (from request)
- `offset`: Starting record number (from request)
- `page`: Current page number (1-indexed)
- `totalPages`: Total number of pages
- `hasNextPage`: Boolean for navigation
- `hasPreviousPage`: Boolean for navigation

### Vue 3 Pagination Example

```javascript
// src/composables/useApi.js
export function usePagination() {
  const pagination = reactive({
    limit: 20,
    offset: 0,
    total: 0,
    totalPages: 0,
    currentPage: 1
  });
  
  const goToPage = (pageNumber) => {
    pagination.offset = (pageNumber - 1) * pagination.limit;
    pagination.currentPage = pageNumber;
    fetchData(); // Refetch with new offset
  };
  
  const nextPage = () => {
    if (pagination.hasNextPage) {
      goToPage(pagination.currentPage + 1);
    }
  };
  
  const previousPage = () => {
    if (pagination.hasPreviousPage) {
      goToPage(pagination.currentPage - 1);
    }
  };
  
  return { pagination, goToPage, nextPage, previousPage };
}
```

---

## 🔍 Filtering & Sorting

### Filtering Format

Filters are passed as query parameters:

```http
GET /api/postings?
  location=San Francisco&
  minSalary=50000&
  maxSalary=100000&
  allowRemote=true&
  status=active
```

**Common Filters:**
- Text fields: Exact match or partial (depends on endpoint)
- Numbers: Exact, or with operators (`min`, `max`)
- Booleans: `true` or `false` (lowercase)
- Dates: ISO string or comparison operators
- Enums: Exact match only

### Sorting Format

```http
GET /api/applications?sortBy=createdAt&sortOrder=desc
```

**Valid sortBy values (endpoint specific):**
- `createdAt` - Creation timestamp
- `updatedAt` - Last update timestamp
- `score` - Match/relevance score
- `title` - Resource title
- `name` - Resource name
- `salary` - Salary amount

**sortOrder:**
- `asc` - Ascending (A→Z, 0→100)
- `desc` - Descending (Z→A, 100→0, default)

### Complex Filter Example

```javascript
// Vue 3 Component
const filters = reactive({
  location: 'San Francisco',
  minSalary: 50000,
  maxSalary: 100000,
  allowRemote: true,
  status: 'active',
  minScore: 70,
  sortBy: 'createdAt',
  sortOrder: 'desc'
});

const buildQueryString = (filters) => {
  const params = new URLSearchParams();
  
  Object.entries(filters).forEach(([key, value]) => {
    if (value !== null && value !== undefined && value !== '') {
      params.append(key, value);
    }
  });
  
  return params.toString();
};

// Usage
const url = `/api/postings?${buildQueryString(filters)}`;
```

---

## ⏰ Date & Time Format

### ISO 8601 Standard

All dates/times use **ISO 8601 format in UTC timezone**:

```
2026-04-15T10:30:00.000Z
```

**Format breakdown:**
- `2026` - Year (4 digits)
- `04` - Month (2 digits, 01-12)
- `15` - Day (2 digits, 01-31)
- `T` - Literal separator
- `10` - Hour (24-hour format, 00-23)
- `30` - Minute (00-59)
- `00` - Second (00-59)
- `.000` - Milliseconds (3 digits, 000-999)
- `Z` - Timezone (UTC, always 'Z')

### Date-Only Format (if applicable)

For date-only fields (no time), use:

```json
{
  "startDate": "2026-06-01",
  "endDate": "2026-08-31",
  "availabilityStart": "2026-06-01T00:00:00.000Z"
}
```

### Parsing in Vue 3

```javascript
// Parse API timestamp to JavaScript Date
const apiTimestamp = "2026-04-15T10:30:00.000Z";
const date = new Date(apiTimestamp);
console.log(date); // 2026-04-15T10:30:00.000Z

// Format for display
const formatted = new Intl.DateTimeFormat('en-US', {
  year: 'numeric',
  month: 'long',
  day: 'numeric',
  hour: '2-digit',
  minute: '2-digit'
}).format(date);
// Output: "April 15, 2026, 10:30 AM"

// Send back to API
const isoString = date.toISOString();
console.log(isoString); // "2026-04-15T10:30:00.000Z"
```

---

## 🔢 Data Type Conversions

### String Numbers

Always quote numeric strings:

```json
{
  "userId": 1,                    // Number
  "phoneNumber": "202-555-1234",  // String (phone must be string)
  "zipCode": "10001",             // String (leading zeros)
  "salary": 50000                 // Number (no quotes)
}
```

### Boolean Values

Booleans are always lowercase:

```json
{
  "allowRemote": true,
  "isActive": false,
  "aisSuspended": false
}
```

**In URL parameters:** `?allowRemote=true&isActive=false`

### Null vs Undefined

Use `null` for missing optional fields, omit undefined:

```json
{
  "firstName": "John",       // Present
  "middleName": null,        // Present but empty
  "suffix": ❌ OMIT          // Don't include if not present
}
```

### Decimal Numbers (Prices, GPA, Scores)

```json
{
  "gpa": 3.85,           // 2 decimal places typical
  "salary": 50000.00,    // Financial: 2 decimals
  "matchScore": 87.5     // Score: 1 decimal
}
```

### Arrays

```json
{
  "skills": ["Java", "Python", "JavaScript"],
  "tags": ["remote-friendly", "startup", "tech"],
  "coordinates": [40.7128, -74.0060],
  "emptyArray": []       // Ok if empty
}
```

---

## 🎯 Common Request/Response Patterns

### Pattern 1: Create Resource

**Request:**
```http
POST /api/student/skills
Authorization: Bearer <token>
Content-Type: application/json

{
  "skillName": "Kotlin",
  "proficiencyLevel": "intermediate",
  "yearsOfExperience": 2
}
```

**Response (201):**
```json
{
  "success": true,
  "statusCode": 201,
  "message": "Skill created successfully",
  "data": {
    "id": 42,
    "skillName": "Kotlin",
    "proficiencyLevel": "intermediate",
    "yearsOfExperience": 2,
    "endorsementCount": 0,
    "createdAt": "2026-04-15T10:30:00.000Z",
    "updatedAt": "2026-04-15T10:30:00.000Z"
  },
  "timestamp": "2026-04-15T10:30:00.000Z",
  "requestId": "req-abc123xyz"
}
```

### Pattern 2: Get Resource by ID

**Request:**
```http
GET /api/postings/42
Authorization: Bearer <token>
```

**Response (200):**
```json
{
  "success": true,
  "statusCode": 200,
  "message": "Job posting retrieved",
  "data": {
    "id": 42,
    "title": "Senior Developer",
    "company": {
      "id": 5,
      "name": "TechCorp"
    },
    "location": "San Francisco",
    "salary": {
      "min": 120000,
      "max": 160000
    },
    "createdAt": "2026-01-15T08:00:00.000Z",
    "updatedAt": "2026-04-15T10:30:00.000Z"
  },
  "timestamp": "2026-04-15T10:30:00.000Z",
  "requestId": "req-abc123xyz"
}
```

### Pattern 3: Update Resource

**Request:**
```http
PUT /api/student/profile
Authorization: Bearer <token>
Content-Type: application/json

{
  "firstName": "John",
  "lastName": "Smith",
  "bio": "Updated bio..."
}
```

**Response (200):**
```json
{
  "success": true,
  "statusCode": 200,
  "message": "Profile updated successfully",
  "data": {
    "id": 1,
    "firstName": "John",
    "lastName": "Smith",
    "bio": "Updated bio...",
    "profileCompletenessPercentage": 80,
    "updatedAt": "2026-04-15T10:30:00.000Z"
  },
  "timestamp": "2026-04-15T10:30:00.000Z",
  "requestId": "req-abc123xyz"
}
```

### Pattern 4: Delete Resource

**Request:**
```http
DELETE /api/student/skills/42
Authorization: Bearer <token>
```

**Response (200):**
```json
{
  "success": true,
  "statusCode": 200,
  "message": "Skill deleted successfully",
  "data": null,
  "timestamp": "2026-04-15T10:30:00.000Z",
  "requestId": "req-abc123xyz"
}
```

### Pattern 5: List with Pagination & Filter

**Request:**
```http
GET /api/applications?
  status=shortlisted&
  limit=20&
  offset=0&
  sortBy=createdAt&
  sortOrder=desc
```

**Response (200):**
```json
{
  "success": true,
  "statusCode": 200,
  "message": "Applications retrieved",
  "data": [
    {
      "id": 1,
      "status": "shortlisted",
      "jobTitle": "Developer",
      "company": "TechCorp",
      "appliedAt": "2026-04-10T08:00:00.000Z"
    }
  ],
  "pagination": {
    "total": 15,
    "limit": 20,
    "offset": 0,
    "page": 1,
    "totalPages": 1,
    "hasNextPage": false,
    "hasPreviousPage": false
  },
  "timestamp": "2026-04-15T10:30:00.000Z",
  "requestId": "req-abc123xyz"
}
```

---

## 🔗 Related Documentation
- [API Reference](03-API-REFERENCE.md) - All endpoints
- [Error Handling Guide](16-ERROR-HANDLING-GUIDE.md) - Error responses
- [Vue 3 Integration Guide](14-VUE3-INTEGRATION-GUIDE.md) - Implementation examples
