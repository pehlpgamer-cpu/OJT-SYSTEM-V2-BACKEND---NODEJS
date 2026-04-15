# Vue 3 + Pinia + Fetch API Integration Guide

**Frontend Target**: Vue 3 (Composition API) + Pinia + Fetch API on Netlify  
**Backend API**: OJT System V2 Node.js (Vercel) with Neon PostgreSQL  
**Last Updated**: April 15, 2026  
**Version**: 2.1.0

---

## Table of Contents

1. [Quick Start](#quick-start)
2. [Authentication & JWT](#authentication--jwt)
3. [API Client Setup](#api-client-setup)
4. [Pinia Store Setup](#pinia-store-setup)
5. [Core Features Integration](#core-features-integration)
6. [Error Handling](#error-handling)
7. [Sequence Diagrams](#sequence-diagrams)
8. [Best Practices](#best-practices)
9. [Troubleshooting](#troubleshooting)

---

## Quick Start

### 1. Environment Variables (.env.local)

```env
VITE_API_BASE_URL=https://ojt-system-v2-backend-nodejs.vercel.app/api
VITE_GOOGLE_CLIENT_ID=your-google-client-id.apps.googleusercontent.com
VITE_JWT_TOKEN_KEY=ojt_jwt_token
VITE_JWT_REFRESH_INTERVAL=6m
```

### 2. Install Dependencies

```bash
npm install
npm install pinia
npm install @pinia/testing  # for testing
```

### 3. Create Pinia Setup (main.js)

```javascript
import { createPinia } from 'pinia'
import { createApp } from 'vue'
import App from './App.vue'

const app = createApp(App)
app.use(createPinia())
app.mount('#app')
```

### 4. First API Call (Test)

```vue
<template>
  <div>
    <button @click="testApiConnection">Test Connection</button>
    <p v-if="response">{{ response }}</p>
    <p v-if="error" class="error">{{ error }}</p>
  </div>
</template>

<script setup>
import { ref } from 'vue'

const response = ref(null)
const error = ref(null)

async function testApiConnection() {
  try {
    const res = await fetch(
      `${import.meta.env.VITE_API_BASE_URL}/health`
    )
    const data = await res.json()
    response.value = data
  } catch (err) {
    error.value = err.message
  }
}
</script>

<style scoped>
.error {
  color: red;
}
</style>
```

---

## Authentication & JWT

### JWT Token Flow

**Backend generates 7-day tokens** - Tokens expire after 7 days:

```
1. User logs in
   ↓
2. Backend validates credentials
   ↓
3. Backend generates JWT (valid 7 days)
   ↓
4. Frontend stores in localStorage
   ↓
5. Frontend sends in Authorization header for subsequent requests
   ↓
6. Backend validates JWT on every request
   ↓
7. If expired, frontend needs fresh login (no refresh endpoint available)
```

### Token Storage (Secure)

```javascript
// utils/tokenStorage.js

export const tokenStorage = {
  // Set JWT token in localStorage
  set(token) {
    localStorage.setItem(
      import.meta.env.VITE_JWT_TOKEN_KEY,
      token
    )
  },

  // Get JWT token from localStorage
  get() {
    return localStorage.getItem(
      import.meta.env.VITE_JWT_TOKEN_KEY
    )
  },

  // Remove JWT token from localStorage (logout)
  remove() {
    localStorage.removeItem(
      import.meta.env.VITE_JWT_TOKEN_KEY
    )
  },

  // Check if token exists
  exists() {
    return !!this.get()
  },

  // Parse JWT to get expiration time (no validation, client-side only)
  getExpiration() {
    const token = this.get()
    if (!token) return null

    try {
      const parts = token.split('.')
      if (parts.length !== 3) return null

      const payload = JSON.parse(atob(parts[1]))
      return new Date(payload.exp * 1000)
    } catch (e) {
      return null
    }
  },

  // Check if token is expired
  isExpired() {
    const expiration = this.getExpiration()
    if (!expiration) return true
    return Date.now() > expiration.getTime()
  }
}
```

### Registration Endpoint

**TODO: Implement in frontend**

```vue
<template>
  <form @submit.prevent="registerUser">
    <input v-model="formData.name" type="text" placeholder="Full Name" required />
    <input v-model="formData.email" type="email" placeholder="Email" required />
    <input v-model="formData.password" type="password" placeholder="Password (min 8 chars)" required />
    
    <select v-model="formData.role" required>
      <option value="">Select Role</option>
      <option value="student">Student</option>
      <option value="company">Company</option>
      <option value="coordinator">Coordinator</option>
    </select>

    <button type="submit" :disabled="loading">
      {{ loading ? 'Registering...' : 'Register' }}
    </button>
    <p v-if="error" class="error">{{ error }}</p>
  </form>
</template>

<script setup>
import { ref } from 'vue'
import { useRouter } from 'vue-router'
import { useAuthStore } from '@/stores/auth'

const router = useRouter()
const authStore = useAuthStore()

const formData = ref({
  name: '',
  email: '',
  password: '',
  role: ''
})

const loading = ref(false)
const error = ref(null)

async function registerUser() {
  if (!formData.value.password || formData.value.password.length < 8) {
    error.value = 'Password must be at least 8 characters'
    return
  }

  loading.value = true
  error.value = null

  try {
    const response = await fetch(
      `${import.meta.env.VITE_API_BASE_URL}/auth/register`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(formData.value)
      }
    )

    if (!response.ok) {
      const errorData = await response.json()
      throw new Error(errorData.message || 'Registration failed')
    }

    const data = await response.json()
    authStore.setUser(data.user)
    authStore.setToken(data.token)

    router.push('/dashboard')
  } catch (err) {
    error.value = err.message
  } finally {
    loading.value = false
  }
}
</script>
```

### Login Endpoint

**Account Lockout**: After 5 failed login attempts, account locks for 30 minutes

```vue
<template>
  <form @submit.prevent="loginUser">
    <input v-model="email" type="email" placeholder="Email" required />
    <input v-model="password" type="password" placeholder="Password" required />
    <button type="submit" :disabled="loading">
      {{ loading ? 'Logging in...' : 'Login' }}
    </button>

    <!-- Show lockout message if account is locked -->
    <p v-if="accountLocked" class="error">
      ⏳ Account locked due to too many failed attempts.
      <br />
      Remaining time: {{ lockoutTimeRemaining }}
      <br />
      Contact support if you need immediate access.
    </p>

    <p v-if="error && !accountLocked" class="error">{{ error }}</p>
    <p v-if="googleLoginNeeded" class="info">
      Or login with Google instead
    </p>
  </form>
</template>

<script setup>
import { ref, computed } from 'vue'
import { useRouter } from 'vue-router'
import { useAuthStore } from '@/stores/auth'
import { tokenStorage } from '@/utils/tokenStorage'

const router = useRouter()
const authStore = useAuthStore()

const email = ref('')
const password = ref('')
const loading = ref(false)
const error = ref(null)
const accountLocked = ref(false)
const lockoutExpiryTime = ref(null)
const lockoutTimeRemaining = ref(null)

// Update lockout timer every second
const lockoutTimer = computed(() => {
  if (!lockoutExpiryTime.value) return null

  const now = Date.now()
  const expiryMs = new Date(lockoutExpiryTime.value).getTime()
  const remainingMs = expiryMs - now

  if (remainingMs <= 0) {
    accountLocked.value = false
    lockoutExpiryTime.value = null
    return null
  }

  const totalSeconds = Math.ceil(remainingMs / 1000)
  const minutes = Math.floor(totalSeconds / 60)
  const seconds = totalSeconds % 60

  lockoutTimeRemaining.value = `${minutes}m ${seconds}s`
  return remainingMs
})

const googleLoginNeeded = computed(() => {
  return accountLocked.value || error.value?.includes('Account')
})

async function loginUser() {
  loading.value = true
  error.value = null
  accountLocked.value = false

  try {
    const response = await fetch(
      `${import.meta.env.VITE_API_BASE_URL}/auth/login`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          email: email.value.toLowerCase().trim(),
          password: password.value
        })
      }
    )

    if (response.status === 423) {
      // Account locked (HTTP 423 - Locked)
      const errorData = await response.json()
      accounting(true)
      // Extract remaining minutes from error message like "...in 29 minutes"
      const match = errorData.message.match(/(\d+)\s*minutes/)
      if (match) {
        const minutesRemaining = parseInt(match[1])
        lockoutExpiryTime.value = new Date(Date.now() + minutesRemaining * 60 * 1000)
      }
      error.value = errorData.message
      return
    }

    if (!response.ok) {
      const errorData = await response.json()
      error.value = errorData.message || 'Login failed'
      return
    }

    const data = await response.json()
    authStore.setUser(data.user)
    tokenStorage.set(data.token)

    // Clear form and redirect
    email.value = ''
    password.value = ''
    router.push('/dashboard')
  } catch (err) {
    error.value = err.message || 'Connection error'
  } finally {
    loading.value = false
  }
}
</script>

<style scoped>
.error {
  color: #dc3545;
  margin-top: 10px;
  padding: 10px;
  background: #f8d7da;
  border-radius: 4px;
}

.info {
  color: #0c5460;
  margin-top: 10px;
  padding: 10px;
  background: #d1ecf1;
  border-radius: 4px;
}
</style>
```

### Google OAuth Login

**Two workflows**: New account creation OR account linking

```vue
<template>
  <div>
    <button @click="initiateGoogleLogin" :disabled="loading">
      {{ loading ? 'Connecting...' : '🔐 Login with Google' }}
    </button>
    <p v-if="error" class="error">{{ error }}</p>
  </div>
</template>

<script setup>
import { ref } from 'vue'
import { useRouter } from 'vue-router'
import { useAuthStore } from '@/stores/auth'
import { tokenStorage } from '@/utils/tokenStorage'

const router = useRouter()
const authStore = useAuthStore()

const loading = ref(false)
const error = ref(null)

async function initiateGoogleLogin() {
  loading.value = true
  error.value = null

  try {
    // Step 1: Redirect to backend OAuth initiation
    // Backend will handle Google OAuth consent screen
    window.location.href = `${import.meta.env.VITE_API_BASE_URL}/auth/google`
  } catch (err) {
    error.value = err.message
    loading.value = false
  }
}

// After Google redirects back to callback:
// Handle callback if this is running in the callback URL
async function handleGoogleCallback() {
  // Backend redirects to: /google-callback?token=...&user=...
  const urlParams = new URLSearchParams(window.location.search)
  const token = urlParams.get('token')
  const userJson = urlParams.get('user')

  if (token && userJson) {
    try {
      const user = JSON.parse(decodeURIComponent(userJson))
      authStore.setUser(user)
      tokenStorage.set(token)
      router.push('/dashboard')
    } catch (err) {
      error.value = 'Failed to process Google login'
    }
  }
}

// Call on component mount if in callback page
onMounted(() => {
  handleGoogleCallback()
})
</script>
```

---

## API Client Setup

### Fetch Wrapper with JWT

```javascript
// utils/apiClient.js

import { tokenStorage } from './tokenStorage'

class ApiClient {
  constructor(baseURL) {
    this.baseURL = baseURL
  }

  // Build headers with JWT token
  buildHeaders(customHeaders = {}) {
    const headers = {
      'Content-Type': 'application/json',
      ...customHeaders
    }

    const token = tokenStorage.get()
    if (token) {
      headers.Authorization = `Bearer ${token}`
    }

    return headers
  }

  // Make GET request
  async get(endpoint, options = {}) {
    return this.request(endpoint, {
      method: 'GET',
      ...options
    })
  }

  // Make POST request
  async post(endpoint, body, options = {}) {
    return this.request(endpoint, {
      method: 'POST',
      body: JSON.stringify(body),
      ...options
    })
  }

  // Make PUT request
  async put(endpoint, body, options = {}) {
    return this.request(endpoint, {
      method: 'PUT',
      body: JSON.stringify(body),
      ...options
    })
  }

  // Make DELETE request
  async delete(endpoint, options = {}) {
    return this.request(endpoint, {
      method: 'DELETE',
      ...options
    })
  }

  // Base request method
  async request(endpoint, config = {}) {
    const url = `${this.baseURL}${endpoint}`
    const headers = this.buildHeaders(config.headers)

    try {
      const response = await fetch(url, {
        ...config,
        headers
      })

      // Handle 401 Unauthorized (token expired)
      if (response.status === 401) {
        tokenStorage.remove()
        window.location.href = '/login'
        throw new Error('Session expired. Please login again.')
      }

      // Handle 423 Locked (account locked)
      if (response.status === 423) {
        const data = await response.json()
        throw {
          status: 423,
          message: data.message,
          code: 'ACCOUNT_LOCKED'
        }
      }

      // Handle other errors
      if (!response.ok) {
        const error = await response.json()
        throw {
          status: response.status,
          message: error.message || `HTTP ${response.status}`,
          data: error
        }
      }

      return await response.json()
    } catch (error) {
      console.error(`API Error (${config.method} ${endpoint}):`, error)
      throw error
    }
  }
}

export const apiClient = new ApiClient(
  import.meta.env.VITE_API_BASE_URL
)
```

---

## Pinia Store Setup

### Auth Store

```javascript
// stores/auth.js

import { defineStore } from 'pinia'
import { ref, computed } from 'vue'
import { apiClient } from '@/utils/apiClient'
import { tokenStorage } from '@/utils/tokenStorage'

export const useAuthStore = defineStore('auth', () => {
  // State
  const user = ref(null)
  const isAuthenticated = computed(() => !!user.value)
  const isLoading = ref(false)
  const error = ref(null)

  // Actions
  function setUser(userData) {
    user.value = userData
  }

  function setToken(token) {
    tokenStorage.set(token)
  }

  function logout() {
    user.value = null
    tokenStorage.remove()
  }

  async function fetchCurrentUser() {
    isLoading.value = true
    error.value = null

    try {
      const response = await apiClient.get('/auth/me')
      setUser(response.user)
    } catch (err) {
      error.value = err.message
      if (err.status === 401) {
        logout()
      }
    } finally {
      isLoading.value = false
    }
  }

  return {
    // State
    user,
    isAuthenticated,
    isLoading,
    error,

    // Methods
    setUser,
    setToken,
    logout,
    fetchCurrentUser
  }
})
```

### Student Store

```javascript
// stores/student.js

import { defineStore } from 'pinia'
import { ref, computed } from 'vue'
import { apiClient } from '@/utils/apiClient'

export const useStudentStore = defineStore('student', () => {
  // State
  const profile = ref(null)
  const applications = ref([])
  const matches = ref([])
  const isLoading = ref(false)
  const error = ref(null)

  // Computed
  const profileCompleteness = computed(
    () => profile.value?.profile_completeness_percentage || 0
  )

  const skills = computed(() => profile.value?.skills || [])

  // Actions
  async function fetchProfile() {
    isLoading.value = true
    error.value = null

    try {
      const response = await apiClient.get('/student/profile')
      profile.value = response.profile
    } catch (err) {
      error.value = err.message
    } finally {
      isLoading.value = false
    }
  }

  async function updateProfile(data) {
    isLoading.value = true
    error.value = null

    try {
      const response = await apiClient.put('/student/profile', data)
      profile.value = response.profile
    } catch (err) {
      error.value = err.message
      throw err
    } finally {
      isLoading.value = false
    }
  }

  async function addSkill(skillData) {
    try {
      const response = await apiClient.post('/student/skills', skillData)
      profile.value.skills = response.skills
    } catch (err) {
      error.value = err.message
      throw err
    }
  }

  async function fetchApplications() {
    isLoading.value = true
    error.value = null

    try {
      const response = await apiClient.get('/student/applications')
      applications.value = response.applications
    } catch (err) {
      error.value = err.message
    } finally {
      isLoading.value = false
    }
  }

  async function applyToPosting(postingId) {
    try {
      const response = await apiClient.post(
        `/student/postings/${postingId}/apply`,
        {}
      )
      applications.value.push(response.application)
      return response.application
    } catch (err) {
      error.value = err.message
      throw err
    }
  }

  async function fetchMatches() {
    isLoading.value = true
    error.value = null

    try {
      const response = await apiClient.get('/student/matches')
      matches.value = response.matches
    } catch (err) {
      error.value = err.message
    } finally {
      isLoading.value = false
    }
  }

  return {
    // State
    profile,
    applications,
    matches,
    isLoading,
    error,

    // Computed
    profileCompleteness,
    skills,

    // Methods
    fetchProfile,
    updateProfile,
    addSkill,
    fetchApplications,
    applyToPosting,
    fetchMatches
  }
})
```

---

## Core Features Integration

### Job Matching Algorithm

The backend calculates match scores using 5 components:

```
OVERALL_SCORE = 
  Skills (40%) + 
  Location (20%) + 
  Availability (20%) + 
  GPA (10%) + 
  Academic Program (10%)
```

**Each component scores 0-100, then weighted:**

```javascript
// Usage in component
<script setup>
import { useStudentStore } from '@/stores/student'

const studentStore = useStudentStore()

async function getMatches() {
  await studentStore.fetchMatches()
  
  // Matches are sorted by score (highest first)
  const topMatches = studentStore.matches.slice(0, 10)
  
  // Each match has:
  // - posting_id
  // - skill_score (0-100)
  // - location_score (0-100)
  // - availability_score (0-100)
  // - gpa_score (0-100)
  // - program_score (0-100)
  // - overall_score (weighted average)
  // - match_status (perfect, great, good, fair, poor)
}
</script>
```

### Application Submission (Transactional)

⚠️ **Important**: Backend uses database transactions to prevent race conditions

```javascript
// When applying to a posting:
// 1. Backend locks the posting row
// 2. Checks if positions available
// 3. Decrements available positions
// 4. Creates application record
// 5. Commits transaction

// Frontend error handling:
async function applyToPosting(postingId) {
  try {
    const application = await studentStore.applyToPosting(postingId)
    showSuccess('Application submitted!')
    return application
  } catch (err) {
    if (err.message.includes('No positions available')) {
      showError('Sorry, all positions have been filled')
    } else if (err.message.includes('Already applied')) {
      showError('You have already applied to this posting')
    } else {
      showError(err.message)
    }
    throw err
  }
}
```

### Rate Limiting

Backend enforces rate limits: **100 requests per 15 minutes**

```javascript
// Frontend handling:
// If you hit the limit, you'll get 429 error:

async function apiCall() {
  try {
    const data = await apiClient.get('/endpoint')
  } catch (err) {
    if (err.status === 429) {
      showError('Too many requests. Please wait a moment.')
    }
  }
}
```

---

## Error Handling

### HTTP Status Codes

| Status | Meaning | Frontend Action |
|--------|---------|-----------------|
| 200 | ✅ Success | Process response |
| 201 | ✅ Created | Show success, update list |
| 400 | ❌ Invalid request | Show validation errors |
| 401 | ❌ Unauthorized | Redirect to login |
| 403 | ❌ Forbidden | Show "access denied" |
| 404 | ❌ Not found | Show "not found" message |
| 409 | ❌ Conflict | Email exists / Already applied |
| 423 | 🔒 Account locked | Show lockout timer |
| 429 | 🚫 Rate limited | Wait before retrying |
| 500 | 💥 Server error | Show "try again later" |

### Error Response Format

```json
{
  "message": "User not found",
  "status": 404,
  "error": {
    "code": "NOT_FOUND",
    "timestamp": "2026-04-15T07:15:37.645Z"
  }
}
```

### Global Error Handler

```javascript
// plugins/errorHandler.js

export function registerGlobalErrorHandler(app) {
  app.config.errorHandler = (err, instance, info) => {
    console.error('Global error:', err, info)

    // Log to error tracking service (Sentry, etc.)
    // logError({
    //   message: err.message,
    //   stack: err.stack,
    //   component: instance?.$options.name,
    //   timestamp: new Date().toISOString()
    // })

    // Show user-friendly message
    if (err.status === 401) {
      showNotification('Session expired. Please login again.', 'error')
    } else if (err.status === 500) {
      showNotification('Server error. Please try again later.', 'error')
    }
  }
}
```

---

## Sequence Diagrams

### Authentication Flow

```
User App              Backend              Google
  │                     │                     │
  ├─ Click "Login" ────→ /auth/google        │
  │                     │─ Redirect to Google OAuth
  │                     │← Google consent screen
  │← User consents ─────────────────────────→
  │                     │← Auth code
  │                     ├─ Exchange code for ID token
  │                     │← ID token
  │                     ├─ Create/link account
  │← Redirect with JWT ←─────────────────────┘
  │                     ✅ Logged in!
```

### Job Matching Flow

```
Frontend              Backend              Database
  │                     │                     │
  ├─ GET /matches ────→ │                     │
  │                     ├─ Fetch student skills─→
  │                     │← Skills data
  │                     ├─ Fetch open postings──→
  │                     │← All postings
  │                     ├─ Calculate 5 components
  │                     │  (Skill, Location, etc.)
  │                     ├─ Cache scores────────→
  │                     │
  │← Sorted by score ←──┤
  │                     ✅ Top 50 matches returned
```

### Application Submission Flow

```
Frontend              Backend              Database
  │                     │                     │
  ├─ POST /apply ────→  │                     │
  │                     ├─ Lock posting row ───→
  │                     │← (LOCKED)
  │                     ├─ Check availability  │
  │                     ├─ Create application──→
  │                     ├─ Decrement count ────→
  │                     │
  │                     ├─ Commit transaction──→
  │                     │← ✅
  │← 201 Created ←──────┤
  │                     ✅ Application created (atomic)
```

---

## Best Practices

### 1. Composables for Reusability

```javascript
// composables/useApiData.js

import { ref, watch } from 'vue'

export function useApiData(apiCall, immediate = true) {
  const data = ref(null)
  const isLoading = ref(false)
  const error = ref(null)

  async function fetch() {
    isLoading.value = true
    error.value = null

    try {
      data.value = await apiCall()
    } catch (err) {
      error.value = err
    } finally {
      isLoading.value = false
    }
  }

  if (immediate) {
    fetch()
  }

  return {
    data,
    isLoading,
    error,
    fetch
  }
}
```

### 2. Form Validation

```javascript
// utils/validators.js

export const validators = {
  email: (email) => {
    const re = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
    return re.test(email) ? null : 'Invalid email'
  },

  password: (password) => {
    if (password.length < 8) return 'Min 8 characters'
    if (!password.includes(/[0-9]/)) return 'Must include number'
    if (!password.includes(/[A-Z]/)) return 'Must include uppercase'
    return null
  },

  phone: (phone) => {
    const re = /^[0-9+\-\s()]+$/
    return re.test(phone) ? null : 'Invalid format'
  }
}
```

### 3. Loading States

Always show loading/skeleton UI:

```vue
<template>
  <div v-if="isLoading" class="skeleton">
    <div class="bg-gray-300 h-4 rounded mb-2"></div>
    <div class="bg-gray-300 h-4 rounded"></div>
  </div>

  <div v-else-if="error" class="error">
    {{ error.message }}
    <button @click="retry">Retry</button>
  </div>

  <div v-else>
    <!-- Content here -->
  </div>
</template>
```

### 4. Token Refresh Check

Before making authenticated requests:

```javascript
import { tokenStorage } from '@/utils/tokenStorage'

async function checkTokenExpiration() {
  if (tokenStorage.isExpired()) {
    // Token expired - need new login
    showNotification('Session expired. Please login again.')
    router.push('/login')
    return false
  }
  return true
}
```

---

## Troubleshooting

### Common Issues

#### 1. CORS Errors

**Error**: `Access to XMLHttpRequest blocked by CORS policy`

**Solution**: Backend already has CORS enabled. Check:
- Frontend URL matches `CORS_ORIGIN` in backend env vars
- On Netlify: Env variables updated for production URL

```javascript
// Debug: Check CORS headers
fetch('https://api.example.com/health')
  .then(r => {
    console.log(r.headers.get('access-control-allow-origin'))
  })
```

#### 2. Token Not Sending

**Error**: `401 Unauthorized` on authenticated endpoints

**Solution**: Check token storage

```javascript
import { tokenStorage } from '@/utils/tokenStorage'

console.log('Token exists:', tokenStorage.exists())
console.log('Token value:', tokenStorage.get())
console.log('Token expired:', tokenStorage.isExpired())
```

#### 3. Account Locked

**Error**: `HTTP 423 - Account temporarily locked`

**Solution**: Show countdown to unlock

```javascript
// Calculate remaining time
const expiryTime = new Date(response.message.match(/(\d+) minutes/)[1])
const minutesLeft = Math.ceil((expiryTime - Date.now()) / 60000)
showError(`Try again in ${minutesLeft} minutes`)
```

#### 4. Application Already Submitted

**Error**: `409 Conflict - Already applied to this posting`

**Solution**: Add check before allowing re-submission

```javascript
// Check if already applied
const alreadyApplied = applications.value.some(
  a => a.posting_id === postingId && a.status !== 'withdrawn'
)

if (alreadyApplied) {
  showError('You have already applied to this posting')
}
```

#### 5. Network Timeout

**Error**: `Failed to fetch` / Timeout

**Solution**: Add timeout to requests

```javascript
// Add to apiClient
async request(endpoint, config = {}) {
  const controller = new AbortController()
  const timeout = setTimeout(() => controller.abort(), 10000) // 10 sec

  try {
    const response = await fetch(url, {
      ...config,
      signal: controller.signal
    })
    // ...
  } finally {
    clearTimeout(timeout)
  }
}
```

---

## Testing Integration

### Testing with Mock Data

```javascript
// __tests__/api.test.js

import { describe, it, expect, vi } from 'vitest'
import { apiClient } from '@/utils/apiClient'

describe('API Client', () => {
  it('sends JWT token in Authorization header', async () => {
    const fetchSpy = vi.spyOn(global, 'fetch')

    await apiClient.get('/student/profile')

    expect(fetchSpy).toHaveBeenCalledWith(
      expect.any(String),
      expect.objectContaining({
        headers: expect.objectContaining({
          Authorization: expect.stringMatching(/^Bearer /)
        })
      })
    )
  })
})
```

---

## API Reference Quick Links

- [All Endpoints](03-API-REFERENCE.md)
- [Database Schema](02-DATABASE-SCHEMA.md)
- [Google OAuth Setup](13-GOOGLE-OAUTH-GUIDE.md)
- [Error Handling Deep Dive](10-TROUBLESHOOTING.md)

---

**Need help?** Check the backend docs home: [00-README.md](00-README.md)

