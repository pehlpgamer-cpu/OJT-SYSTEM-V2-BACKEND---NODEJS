# Vue 3 Frontend Developer Quick Start

**Date:** April 15, 2026  
**Target:** Vue 3 developers integrating with OJT System V2 Backend  
**Deployment:** Vercel Backend + Netlify Frontend

---

## 🚀 Start Here: 5-Minute Overview

The **OJT System V2 Backend** is a Node.js/Express API for managing on-the-job training placements. As a Vue 3 developer, you need to:

1. ✅ **Authenticate users** (login, registration, Google OAuth)
2. ✅ **Call API endpoints** (fetch student data, job postings, applications)
3. ✅ **Handle errors gracefully** (validation errors, rate limits, OAuth issues)
4. ✅ **Manage state** (Pinia store for auth, user profile, job matches)
5. ✅ **Display real-time feedback** (loading states, error messages)

---

## 📚 Documentation by Use Case

Pick what you need:

### I want to...

#### 👤 **Implement User Authentication**
1. Start with [Error Handling Guide](16-ERROR-HANDLING-GUIDE.md) → Understand error codes
2. Read [API Reference - Authentication](03-API-REFERENCE.md#authentication-endpoints) → All auth endpoints
3. Reference [Vue 3 Integration Guide](14-VUE3-INTEGRATION-GUIDE.md) → Implementation patterns

**Key Points:**
- Login/Register endpoints are rate-limited (10 attempts per 15 min)
- Account locks after 5 failed login attempts (30 min lockout)
- JWT expires after 7 days (no refresh token - user must re-login)
- Google OAuth requires `GOOGLE_CLIENT_ID` from environment variables

#### 🔍 **Fetch Job Matches & Browse Postings**
1. Read [API Reference - Student Endpoints](03-API-REFERENCE.md#-student-endpoints)
2. See [Request/Response Format](17-REQUEST-RESPONSE-FORMAT.md#pagination-standard) → Pagination
3. View [Rate Limiting Guide](18-RATE-LIMITING-GUIDE.md) → Handle limits gracefully

**Key Points:**
- Get matches: `GET /api/student/matches`
- Matches include score breakdown (skill, location, availability, GPA, program)
- Pagination: Use `limit` (default 20, max 100) and `offset` parameters
- Limit: 100 requests/min per user

#### 📝 **Build Student Profile Management**
1. Check [API Reference - Student Profile](03-API-REFERENCE.md#get-student-profile)
2. View model details in [Models Documentation](04-MODELS.md)
3. Reference [Vue 3 Integration](14-VUE3-INTEGRATION-GUIDE.md#core-features-integration)

**Key Points:**
- Profile completeness auto-calculated when updated
- Availability dates determine eligibility for job matches
- Skills tracked with proficiency level (beginner → expert)
- GPA and academic program used for matching

#### 💼 **Implement Company Job Posting Management**
1. See [API Reference - Company Endpoints](03-API-REFERENCE.md#-company-endpoints)
2. Understand requirements in [Database Schema](02-DATABASE-SCHEMA.md)
3. Follow patterns in [Vue 3 Integration Guide](14-VUE3-INTEGRATION-GUIDE.md)

**Key Points:**
- Only approved companies can post (accreditation_status = 'approved')
- Postings default to 'draft' status before publishing
- Each posting shows count of applications and match scores
- Required skills vs preferred skills affect matching algorithm

#### ⚠️ **Handle Errors & Edge Cases**
1. **MUST READ:** [Error Handling Guide](16-ERROR-HANDLING-GUIDE.md) - Standard error format
2. Review [Common Errors & Solutions](16-ERROR-HANDLING-GUIDE.md#-common-errors--solutions)
3. See [Rate Limiting Guide](18-RATE-LIMITING-GUIDE.md) - When API says "slow down"

**Critical Erros to Expect:**
- 401 TOKEN_EXPIRED → Auto-logout, redirect to login
- 423 ACCOUNT_LOCKED → Show countdown timer
- 429 RATE_LIMIT_EXCEEDED → Retry with exponential backoff
- 422 VALIDATION_FAILED → Show field-specific errors to user

---

## 🏗️ Architecture Overview

### Data Flow

```
Vue 3 Component
    ↓
Pinia Store (state management)
    ↓
API Client (composable/utility)
    ↓
Backend API (Express)
    ↓
Database (PostgreSQL/Neon)
```

### Key Components to Implement

```
Frontend/
├── composables/
│   ├── useApi.js           # API client wrapper
│   ├── useAuth.js          # Auth logic
│   ├── useStudentProfile.js # Student data
│   └── useJobMatches.js    # Matching algorithm UI
├── stores/
│   ├── authStore.js        # User + JWT token
│   ├── studentStore.js     # Student profile
│   ├── matchStore.js       # Job matches data
│   └── errorStore.js       # Global error handling
├── views/
│   ├── LoginPage.vue
│   ├── StudentDashboard.vue
│   ├── JobListingPage.vue
│   └── ApplicationForm.vue
└── utils/
    ├── apiClient.js        # HTTP wrapper
    ├── errorHandler.js     # Error formatting
    └── validation.js       # Form validation
```

---

## 🔑 Essential Setup Steps

### 1. Environment Variables

Create `.env.local`:

```env
# API
VITE_API_BASE_URL=https://ojt-system-v2-backend-nodejs.vercel.app/api

# Google OAuth
VITE_GOOGLE_CLIENT_ID=<your-client-id>.apps.googleusercontent.com

# Token Storage
VITE_JWT_TOKEN_KEY=ojt_system_jwt_token

# Debug Mode
VITE_DEBUG=false
```

**Note:** Get `GOOGLE_CLIENT_ID` from step 2

### 2. Set Up Google OAuth

1. Go to [Google Cloud Console](https://console.cloud.google.com/)
2. Create new project or select existing
3. Enable: Google+ API
4. Create OAuth 2.0 credentials (Web application)
5. Add authorized redirect URIs:
   - Dev: `http://localhost:5173/auth/callback`
   - Prod: `https://your-frontend.netlify.app/auth/callback`
6. Copy Client ID to `.env.local`

### 3. Install Dependencies

```bash
npm install
npm install pinia
npm install axios  # or use fetch (already in browser)
npm install vue-router  # for navigation
```

### 4. Create Pinia Stores

See [VUE3-INTEGRATION-GUIDE](14-VUE3-INTEGRATION-GUIDE.md#pinia-store-setup) for full setup

### 5. Create API Client

```javascript
// src/utils/apiClient.js
export async function apiCall(endpoint, method = 'GET', data = null) {
  const token = localStorage.getItem('ojt_system_jwt_token');
  const headers = {
    'Content-Type': 'application/json',
  };
  
  if (token) {
    headers['Authorization'] = `Bearer ${token}`;
  }
  
  const response = await fetch(
    `${import.meta.env.VITE_API_BASE_URL}${endpoint}`,
    {
      method,
      headers,
      body: data ? JSON.stringify(data) : null
    }
  );
  
  const result = await response.json();
  
  if (!response.ok) {
    throw {
      statusCode: result.statusCode,
      code: result.error?.code,
      message: result.error?.message,
      details: result.error?.details
    };
  }
  
  return result.data;
}
```

---

## 🎯 Common Implementation Patterns

### Login with Error Handling

```vue
<!-- LoginPage.vue -->
<template>
  <form @submit.prevent="login">
    <input v-model="email" type="email" placeholder="Email" required />
    <input v-model="password" type="password" placeholder="Password" required />
    
    <p v-if="error" class="error">{{ error }}</p>
    <p v-if="accountLocked" class="warning">
      Account locked. Try again in {{ minutesRemaining }} minutes
    </p>
    
    <button :disabled="loading || accountLocked">
      {{ loading ? 'Logging in...' : 'Login' }}
    </button>
  </form>
</template>

<script setup>
import { ref } from 'vue';
import { useRouter } from 'vue-router';
import { apiCall } from '@/utils/apiClient';

const router = useRouter();
const email = ref('');
const password = ref('');
const error = ref('');
const loading = ref(false);
const accountLocked = ref(false);
const minutesRemaining = ref(0);

async function login() {
  error.value = '';
  loading.value = true;
  
  try {
    const result = await apiCall('/auth/login', 'POST', {
      email: email.value,
      password: password.value
    });
    
    localStorage.setItem('ojt_system_jwt_token', result.token);
    router.push('/dashboard');
  } catch (err) {
    if (err.code === 'ACCOUNT_LOCKED') {
      accountLocked.value = true;
      minutesRemaining.value = err.details.minutes_remaining;
      startCountdown();
    } else if (err.code === 'INVALID_CREDENTIALS') {
      error.value = 'Invalid email or password';
    } else {
      error.value = err.message || 'Login failed';
    }
  } finally {
    loading.value = false;
  }
}

function startCountdown() {
  const interval = setInterval(() => {
    minutesRemaining.value--;
    if (minutesRemaining.value <= 0) {
      clearInterval(interval);
      accountLocked.value = false;
    }
  }, 60000);
}
</script>
```

### Fetch Job Matches with Pagination

```javascript
// composables/useJobMatches.js
import { ref, reactive } from 'vue';
import { apiCall } from '@/utils/apiClient';

export function useJobMatches() {
  const matches = ref([]);
  const loading = ref(false);
  const error = ref('');
  const pagination = reactive({
    total: 0,
    limit: 20,
    offset: 0,
    page: 1,
    totalPages: 0
  });
  
  async function fetchMatches(minScore = 50) {
    loading.value = true;
    error.value = '';
    
    try {
      const response = await apiCall(
        `/student/matches?limit=${pagination.limit}&offset=${pagination.offset}&min_score=${minScore}`
      );
      
      matches.value = response.data;
      pagination.total = response.pagination.total;
      pagination.totalPages = response.pagination.totalPages;
      pagination.page = response.pagination.page;
    } catch (err) {
      error.value = err.message;
      console.error('Failed to fetch matches:', err);
    } finally {
      loading.value = false;
    }
  }
  
  function nextPage() {
    if (pagination.page < pagination.totalPages) {
      pagination.page++;
      pagination.offset += pagination.limit;
      fetchMatches();
    }
  }
  
  return { matches, loading, error, pagination, fetchMatches, nextPage };
}
```

---

## 🚨 Critical Things to Know

### ⏰ JWT Token Expiration (7 Days)
- **Problem:** Token expires after 7 days automatically
- **No refresh token available** (architecture decision)
- **Solution:** Plan for re-login flow, notify users at 6.5 days

```javascript
// Check token expiration on app load
const expirationTime = parseJWT(token).exp * 1000; // Convert to ms
const now = Date.now();
const hoursRemaining = (expirationTime - now) / (1000 * 60 * 60);

if (hoursRemaining < 24) {
  showNotification(`Your session expires in ${hoursRemaining} hours`);
}
```

### 🔒 Account Lockout (5 Failed Attempts)
- After 5 failed logins, account locks for 30 minutes
- Backend auto-unlocks, frontend should show countdown
- Use `minutes_remaining` from error response to calculate

```javascript
if (error.code === 'ACCOUNT_LOCKED') {
  const minutes = error.details.minutes_remaining;
  disableLoginForm();
  startCountdown(minutes * 60);
}
```

### ⏱️ Rate Limiting (100 requests/min)
- General endpoints limited to 100 req/min per authenticated user
- Auth endpoints: 10 attempts per 15 min
- Implement retry logic with exponential backoff
- Check `X-RateLimit-Remaining` header before making requests

```javascript
if (response.status === 429) {
  const retryAfter = response.headers.get('Retry-After');
  await sleep((retryAfter || 60) * 1000);
  // Retry request
}
```

### 🔗 Google OAuth Linking
- New Google email: Auto-register new account
- Existing email: Ask user to confirm linking
- After linking, both email and Google auth work
- Can unlink Google but must have password first

### 📱 Mobile Considerations
- Tokens expire after 7 days (problematic for apps)
- Consider implementing token refresh before implementation
- Handle network errors gracefully (slow connections)

---

## 📖 Full Documentation Index

| Doc | Purpose |
|-----|---------|
| [API Reference](03-API-REFERENCE.md) | All endpoints, request/response examples |
| [Error Handling Guide](16-ERROR-HANDLING-GUIDE.md) | Error codes, HTTP status, patterns |
| [Request/Response Format](17-REQUEST-RESPONSE-FORMAT.md) | Data format standards, pagination |
| [Rate Limiting Guide](18-RATE-LIMITING-GUIDE.md) | Rate limit rules, retry strategies |
| [Vue 3 Integration](14-VUE3-INTEGRATION-GUIDE.md) | Implementation patterns, composables |
| [Architecture](01-ARCHITECTURE.md) | System design, data flow |
| [Database Schema](02-DATABASE-SCHEMA.md) | Data models, relationships |
| [Quick Start](12-QUICK-START.md) | Backend setup (for reference) |

---

## 🆘 Troubleshooting

### "Authorization header is missing"
- Ensure you're including `Authorization: Bearer <token>` header
- Check token exists in localStorage
- Token might have expired

### "Token is invalid or has expired"
- Clear localStorage and re-login
- Check `.env.local` has correct `VITE_JWT_TOKEN_KEY`
- Backend `JWT_SECRET` might have changed

### "Too many login attempts"
- Rate limit: Wait 15 minutes or use different IP
- Or: Account locked (wait 30 min or contact support)

### "CORS error: Access-Control-Allow-Origin"
- Backend might be down
- Frontend URL might not be in CORS whitelist
- Check `VITE_API_BASE_URL` is correct

### "Google OAuth callback never reaches frontend"
- Check redirect URI in `google/callback` route handler
- Ensure `.env.local` has correct `VITE_GOOGLE_CLIENT_ID`
- Check Google Cloud Console CORS settings

---

## 💬 Need Help?

- Check [Error Handling Guide](16-ERROR-HANDLING-GUIDE.md) for specific error codes
- Review [API Reference](03-API-REFERENCE.md) endpoints
- See [Vue 3 Integration Guide](14-VUE3-INTEGRATION-GUIDE.md) for patterns
- Open issue in repository with error code + request ID

---

**Last Updated:** April 15, 2026  
**API Version:** 2.2.0  
**Backend Status:** All core endpoints implemented ✅  
**OAuth Status:** Google OAuth implemented (in progress)  
