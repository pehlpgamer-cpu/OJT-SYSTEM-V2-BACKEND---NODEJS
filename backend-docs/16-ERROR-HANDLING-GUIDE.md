# 16 - Error Handling Guide

**Version:** 1.0.0  
**Last Updated:** April 15, 2026  
**Target:** Frontend developers integrating error handling in Vue 3

---

## 📋 Table of Contents
1. [Standard Error Response Format](#standard-error-response-format)
2. [HTTP Status Codes](#http-status-codes)
3. [Application-Specific Error Codes](#application-specific-error-codes)
4. [Error Categories](#error-categories)
5. [Vue 3 Error Handling Patterns](#vue-3-error-handling-patterns)
6. [Common Errors & Solutions](#common-errors--solutions)

---

## 📋 Standard Error Response Format

All errors from the API follow this format:

```json
{
  "statusCode": 400,
  "error": {
    "code": "VALIDATION_ERROR",
    "message": "Email is required",
    "details": {
      "field": "email",
      "reason": "missing_field"
    }
  },
  "timestamp": "2026-04-15T10:30:00Z",
  "requestId": "req-abc123xyz"
}
```

### Response Fields

| Field | Type | Purpose |
|-------|------|---------|
| `statusCode` | number | HTTP status code (4xx or 5xx) |
| `error.code` | string | Machine-readable error code (use for error handling) |
| `error.message` | string | Human-readable error message (show to user) |
| `error.details` | object | Additional context (varies by error type) |
| `timestamp` | ISO string | When error occurred (timezone UTC) |
| `requestId` | string | For support/debugging ("Reference ID: req-xxx") |

---

## 📊 HTTP Status Codes

### 400 Bad Request
**Cause:** Invalid request format, missing fields, invalid data types

```json
{
  "statusCode": 400,
  "error": {
    "code": "VALIDATION_ERROR",
    "message": "Password must be at least 8 characters",
    "details": {
      "field": "password",
      "reason": "too_short",
      "minLength": 8
    }
  }
}
```

**When to show user:**
- "Password must be at least 8 characters"
- Show under form field

---

### 401 Unauthorized
**Cause:** Missing or invalid authentication (token expired, invalid)

**Case 1: Missing token**
```json
{
  "statusCode": 401,
  "error": {
    "code": "MISSING_AUTH_TOKEN",
    "message": "Authorization header is missing",
    "details": {}
  }
}
```

**Case 2: Invalid token**
```json
{
  "statusCode": 401,
  "error": {
    "code": "INVALID_TOKEN",
    "message": "Token is invalid or has expired",
    "details": {
      "hint": "Please login again"
    }
  }
}
```

**Case 3: Token expired**
```json
{
  "statusCode": 401,
  "error": {
    "code": "TOKEN_EXPIRED",
    "message": "Your session has expired",
    "details": {
      "expirationTime": "2026-04-22T10:30:00Z"
    }
  }
}
```

**Frontend Action:**
- Clear token from localStorage
- Redirect to login page
- Show: "Your session expired. Please login again."

---

### 403 Forbidden
**Cause:** Authenticated but not authorized (insufficient permissions)

```json
{
  "statusCode": 403,
  "error": {
    "code": "INSUFFICIENT_PERMISSIONS",
    "message": "Only companies can view this resource",
    "details": {
      "your_role": "student",
      "required_role": "company"
    }
  }
}
```

**Variants:**

#### Account Status Issues
```json
{
  "statusCode": 403,
  "error": {
    "code": "ACCOUNT_SUSPENDED",
    "message": "Your account has been suspended",
    "details": {
      "suspension_reason": "Policy violation",
      "contact_support": "support@ojt-system.edu"
    }
  }
}
```

#### Posting Requirements Not Met
```json
{
  "statusCode": 403,
  "error": {
    "code": "COMPANY_NOT_APPROVED",
    "message": "Your company must be accredited before posting jobs",
    "details": {
      "current_status": "pending",
      "accreditation_url": "/company/accreditation"
    }
  }
}
```

**Frontend Action:**
- Show error message to user
- Optionally disable/hide feature
- Link to relevant settings page if provided

---

### 404 Not Found
**Cause:** Resource doesn't exist

```json
{
  "statusCode": 404,
  "error": {
    "code": "RESOURCE_NOT_FOUND",
    "message": "Job posting with ID 999 not found",
    "details": {
      "resource_type": "OjtPosting",
      "resource_id": 999
    }
  }
}
```

**Frontend Action:**
- Show: "This job is no longer available"
- Redirect to job listing
- Log for debugging

---

### 409 Conflict
**Cause:** Resource already exists or state conflict

```json
{
  "statusCode": 409,
  "error": {
    "code": "EMAIL_ALREADY_REGISTERED",
    "message": "Email john@example.com is already registered",
    "details": {
      "field": "email",
      "existing_account": "student"
    }
  }
}
```

**Other Conflicts:**
- Duplicate application (student already applied)
- Google account already linked
- Cannot unlink last auth method

---

### 422 Unprocessable Entity
**Cause:** Validation failed - data invalid but syntactically correct

```json
{
  "statusCode": 422,
  "error": {
    "code": "VALIDATION_FAILED",
    "message": "GPA must be between 0 and 4.0",
    "details": {
      "field": "gpa",
      "value": 5.5,
      "constraint": "range",
      "min": 0,
      "max": 4.0
    }
  }
}
```

---

### 423 Locked
**Cause:** Account locked due to security (brute-force protection)

```json
{
  "statusCode": 423,
  "error": {
    "code": "ACCOUNT_LOCKED",
    "message": "Account temporarily locked due to too many failed attempts",
    "details": {
      "retry_after": "2026-04-15T10:45:00Z",
      "minutes_remaining": 12,
      "attempts_allowed": 5
    }
  }
}
```

**Frontend Handling:**
```javascript
if (response.statusCode === 423) {
  const minutesRemaining = response.error.details.minutes_remaining;
  showError(`Account locked. Try again in ${minutesRemaining} minutes.`);
  disableLoginForm(minutesRemaining * 60); // Disable for X seconds
}
```

---

### 429 Too Many Requests
**Cause:** Rate limit exceeded

```json
{
  "statusCode": 429,
  "error": {
    "code": "RATE_LIMIT_EXCEEDED",
    "message": "Too many login attempts. Please try again later.",
    "details": {
      "limit": 10,
      "window_minutes": 15,
      "retry_after": 60
    }
  }
}
```

**Headers also included:**
```
Retry-After: 60
X-RateLimit-Limit: 10
X-RateLimit-Remaining: 0
X-RateLimit-Reset: 1712584800
```

**Frontend Handling:**
```javascript
if (response.status === 429) {
  const retryAfter = response.headers['retry-after'] || 60;
  showError(`Too many requests. Please wait ${retryAfter} seconds.`);
  // Disable button/form for retryAfter seconds
}
```

---

### 500 Internal Server Error
**Cause:** Server error (bug, database down, etc)

```json
{
  "statusCode": 500,
  "error": {
    "code": "INTERNAL_SERVER_ERROR",
    "message": "An unexpected error occurred",
    "details": {}
  },
  "requestId": "req-abc123xyz"
}
```

**Frontend Action:**
- Show: "Something went wrong. Our team has been notified."
- Show requestId for user to reference in support ticket
- Retry after delay (exponential backoff)
- Log for debugging

---

## 🎯 Application-Specific Error Codes

### Authentication Errors

| Code | HTTP Status | Meaning |
|------|-------|---------|
| `INVALID_CREDENTIALS` | 401 | Email/password incorrect |
| `MISSING_AUTH_TOKEN` | 401 | No token provided |
| `INVALID_TOKEN` | 401 | Token malformed or tampered |
| `TOKEN_EXPIRED` | 401 | JWT expired (7 days) |
| `EMAIL_NOT_VERIFIED` | 403 | Email verification pending |
| `ACCOUNT_LOCKED` | 423 | Too many failed attempts |
| `ACCOUNT_SUSPENDED` | 403 | Admin suspended account |
| `ACCOUNT_INACTIVE` | 403 | Account not active |
| `EMAIL_ALREADY_REGISTERED` | 409 | Email taken |
| `GOOGLE_ACCOUNT_LINKED` | 409 | Google already linked |
| `INVALID_RESET_TOKEN` | 401 | Password reset link expired |

### Authorization Errors

| Code | HTTP Status | Meaning |
|------|-------|---------|
| `INSUFFICIENT_PERMISSIONS` | 403 | Wrong role for operation |
| `COMPANY_NOT_APPROVED` | 403 | Company not accredited |
| `ACCOUNT_NOT_COMPLETE` | 403 | Profile incomplete (coordinator) |
| `COORDINATOR_LIMIT_REACHED` | 403 | Can't assign more students |

### Validation Errors

| Code | HTTP Status | Meaning |
|------|-------|---------|
| `VALIDATION_ERROR` | 400 | Invalid request format |
| `VALIDATION_FAILED` | 422 | Invalid data values |
| `MISSING_REQUIRED_FIELD` | 400 | Required field missing |
| `INVALID_EMAIL_FORMAT` | 400 | Email format invalid |
| `INVALID_DATE_RANGE` | 422 | Date logic error |
| `DUPLICATE_APPLICATION` | 409 | Already applied to posting |

### Resource Errors

| Code | HTTP Status | Meaning |
|------|-------|---------|
| `RESOURCE_NOT_FOUND` | 404 | Resource doesn't exist |
| `POSTING_CLOSED` | 410 | Job posting no longer accepting |
| `POSTING_FULL` | 410 | No positions available |

### System Errors

| Code | HTTP Status | Meaning |
|------|-------|---------|
| `INTERNAL_SERVER_ERROR` | 500 | Unexpected server error |
| `DATABASE_ERROR` | 500 | Database issue |
| `RATE_LIMIT_EXCEEDED` | 429 | Too many requests |
| `SERVICE_UNAVAILABLE` | 503 | Server maintenance/down |

---

## 🏷️ Error Categories

### Frontend-Friendly Errors (Show to User)
These have user-readable messages you should display:

```javascript
// Vue 3 Pattern
const handleError = (error) => {
  if (error.response?.error?.code === 'INVALID_CREDENTIALS') {
    showToast(error.response.error.message, 'error');
    // Output: "Invalid email or password"
  }
};
```

### Developer Errors (Show in Logs)
These indicate frontend bugs - fix the code:

```javascript
// Wrong role check
if (error.response?.error?.code === 'INSUFFICIENT_PERMISSIONS') {
  console.error('[BUG] Checking endpoint with wrong role');
  // Fix: Ensure only students call /student endpoints
}
```

### Infrastructure Errors (Retry with Backoff)
These are temporary - try again:

```javascript
if ([429, 503, 500].includes(error.response?.statusCode)) {
  // Wait then retry
  await sleep(exponentialBackoff(retryCount));
  retryRequest();
}
```

---

## 🛠️ Vue 3 Error Handling Patterns

### Pattern 1: API Call with Error Handling

```javascript
// src/api/client.js
export async function apiCall(method, endpoint, data = null) {
  try {
    const url = `${import.meta.env.VITE_API_BASE_URL}${endpoint}`;
    const options = {
      method,
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${localStorage.getItem('jwt_token')}`
      }
    };
    
    if (data) options.body = JSON.stringify(data);
    
    const response = await fetch(url, options);
    const result = await response.json();
    
    // Check for application-level errors
    if (!response.ok) {
      // Handle specific error codes
      if (result.error?.code === 'TOKEN_EXPIRED') {
        localStorage.removeItem('jwt_token');
        window.location.href = '/login';
        throw new Error('Session expired');
      }
      
      // Re-throw with full error details
      throw {
        statusCode: result.statusCode,
        code: result.error?.code,
        message: result.error?.message,
        details: result.error?.details
      };
    }
    
    return result;
  } catch (error) {
    console.error(`API Error [${endpoint}]:`, error);
    throw error;
  }
}
```

### Pattern 2: Component Error Handling

```javascript
// src/components/LoginForm.vue
import { ref } from 'vue';
import { apiCall } from '@/api/client';

export default {
  setup() {
    const email = ref('');
    const password = ref('');
    const error = ref('');
    const isLoading = ref(false);
    
    const handleLogin = async () => {
      error.value = '';
      isLoading.value = true;
      
      try {
        const result = await apiCall('POST', '/auth/login', {
          email: email.value,
          password: password.value
        });
        
        // Success
        localStorage.setItem('jwt_token', result.token);
        router.push('/dashboard');
        
      } catch (err) {
        // Handle different error types
        if (err.code === 'ACCOUNT_LOCKED') {
          const minutes = err.details?.minutes_remaining || 30;
          error.value = `Account locked for ${minutes} minutes`;
        } 
        else if (err.code === 'INVALID_CREDENTIALS') {
          error.value = 'Invalid email or password';
        }
        else if (err.statusCode === 500) {
          error.value = 'Server error. Please try again later.';
        }
        else {
          error.value = err.message || 'An error occurred';
        }
      } 
      finally {
        isLoading.value = false;
      }
    };
    
    return { email, password, error, isLoading, handleLogin };
  }
};
```

### Pattern 3: Pinia Store Error Handler

```javascript
// src/stores/errorStore.js
import { defineStore } from 'pinia';
import { ref } from 'vue';

export const useErrorStore = defineStore('error', () => {
  const error = ref(null);
  const requestId = ref(null);
  
  const setError = (err) => {
    error.value = {
      code: err.code,
      message: err.message,
      statusCode: err.statusCode,
      details: err.details
    };
    requestId.value = err.requestId;
  };
  
  const clearError = () => {
    error.value = null;
    requestId.value = null;
  };
  
  const handleApiError = (err) => {
    if (err.statusCode === 401) {
      // Clear auth and redirect
      useAuthStore().logout();
      router.push('/login');
    }
    
    setError(err);
  };
  
  return { error, requestId, setError, clearError, handleApiError };
});
```

---

## 🔍 Common Errors & Solutions

### "Token is invalid or has expired"
**Cause:** JWT expired (7 day limit)  
**Solution:** 
```javascript
// Check on app load and before requests
const token = localStorage.getItem('jwt_token');
if (isTokenExpired(token)) {
  // Redirect to login
}
```

**Note:** There is currently no refresh token mechanism. Users must login again after 7 days.

---

### "Account temporarily locked"
**Cause:** 5 failed login attempts  
**Solution:**
```javascript
if (error.code === 'ACCOUNT_LOCKED') {
  const minutes = error.details.minutes_remaining;
  // Show countdown, disable login form
  // Auto-enable after timeout
  setTimeout(() => enableLoginForm(), minutes * 60 * 1000);
}
```

---

### "Your email is already registered"
**Cause:** Using email from existing account  
**Solution:**
```javascript
if (error.code === 'EMAIL_ALREADY_REGISTERED') {
  showModal('Email already in use. Try logging in instead.');
}
```

---

### "You must verify your email"
**Cause:** Email verification pending  
**Solution:**
- Guide user to check email inbox
- Auto-login after verification link clicked

---

### "Too many requests"
**Cause:** Rate limit exceeded  
**Solution:**
```javascript
if (error.statusCode === 429) {
  const retryAfter = parseInt(response.headers['retry-after']) || 60;
  showToast(`Please wait ${retryAfter} seconds`);
  
  // Implement exponential backoff for retries
  const wait = exponentialBackoff(attempt) * 1000;
  setTimeout(() => retry(), wait);
}
```

---

## 📞 Support & Debugging

When reporting errors to support, include:
- **Request ID:** `error.requestId` (found in response)
- **Error Code:** `error.code`
- **Timestamp:** `error.timestamp`
- **Your Role:** student/company/coordinator
- **What you were doing:** Specific action that failed

Example support message:
```
Issue: Getting "Account Suspended" when trying to log in
Request ID: req-abc123xyz
Timestamp: 2026-04-15T10:30:00Z
Status Code: 403
```

---

## 🔗 Related Documentation
- [API Reference](03-API-REFERENCE.md) - All endpoints
- [Request/Response Format](17-REQUEST-RESPONSE-FORMAT.md)
- [Vue 3 Integration Guide](14-VUE3-INTEGRATION-GUIDE.md)
