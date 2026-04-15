# 18 - Rate Limiting & Throttling Guide

**Version:** 1.0.0  
**Last Updated:** April 15, 2026  
**Target:** Frontend developers handling rate limits gracefully

---

## 📋 Table of Contents
1. [Overview](#overview)
2. [Rate Limit Rules](#rate-limit-rules)
3. [Detecting Rate Limits](#detecting-rate-limits)
4. [Handling Rate Limits](#handling-rate-limits)
5. [Best Practices](#best-practices)
6. [Retry Strategies](#retry-strategies)

---

## 📊 Overview

The API implements **rate limiting** to prevent abuse and ensure fair usage. Different endpoints have different limits based on security sensitivity and resource usage.

**Key Principle:** 
- Legitimate use cases are not affected
- Brute-force attacks are prevented
- Distributed attacks are slowed down

---

## 🎯 Rate Limit Rules

### Authentication Endpoints (Most Strict)

**Login Endpoint:**
```
POST /auth/login
Limit: 10 attempts per 15 minutes per IP address
```

**Failed Attempts:**
- 1-4 failed: Error response
- 5+ failed: Account locked for 30 minutes (423 status)
- Auto-unlock when period expires

**Status Code:** 429 Too Many Requests

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
  },
  "headers": {
    "Retry-After": "60",
    "X-RateLimit-Limit": "10",
    "X-RateLimit-Remaining": "0",
    "X-RateLimit-Reset": "1712584860"
  }
}
```

### Registration Endpoint

```
POST /auth/register
Limit: 5 attempts per hour per IP address
```

**Reason:** Prevent account creation spam

---

### Google OAuth Endpoints

```
GET /auth/google/redirect
GET /auth/google/callback
Limit: No rate limit (stateless, CSRF protected)
```

**Note:** Passport handles rate limiting via standard OAuth state/nonce

---

### API Endpoints (General)

```
GET /api/student/matches
GET /api/postings
GET /api/applications
Limit: 100 requests per minute per authenticated user
```

**Note:** Grouped by authenticated user, not IP. Allows legitimate requests while preventing misuse.

---

### Status Codes

| Code | Meaning | Action |
|------|---------|--------|
| 200 | Success | Proceed normally |
| 201 | Created | Proceed normally |
| 400 | Bad request | Fix request and retry |
| 401 | Unauthorized | Re-login and retry |
| 423 | Account locked | Wait 30 minutes (user visible) |
| 429 | Rate limited | **Use exponential backoff (see below)** |
| 500-503 | Server error | Retry with backoff |

---

## 🔍 Detecting Rate Limits

### Response Headers

Every API response includes rate limit information:

```http
HTTP/1.1 200 OK
X-RateLimit-Limit: 100
X-RateLimit-Remaining: 47
X-RateLimit-Reset: 1712584860
Retry-After: 60
```

**Header Meanings:**
- `X-RateLimit-Limit`: Total requests allowed in the window
- `X-RateLimit-Remaining`: How many requests left before hitting limit
- `X-RateLimit-Reset`: Unix timestamp when limit resets
- `Retry-After`: Seconds to wait before retrying (if rate limited)

### Vue 3: Check Rate Limit Headers

```javascript
// utils/rateLimit.js

export function parseRateLimitHeaders(response) {
  return {
    limit: parseInt(response.headers.get('X-RateLimit-Limit')) || null,
    remaining: parseInt(response.headers.get('X-RateLimit-Remaining')) || null,
    resetAt: parseInt(response.headers.get('X-RateLimit-Reset')) || null,
    retryAfter: parseInt(response.headers.get('Retry-After')) || null
  };
}

export function getRateLimitStatus(headers) {
  const remaining = parseInt(headers.get('X-RateLimit-Remaining'));
  const limit = parseInt(headers.get('X-RateLimit-Limit'));
  
  if (remaining === null || limit === null) return null;
  
  const percentage = (remaining / limit) * 100;
  
  if (percentage <= 10) return 'critical';  // 10% or less
  if (percentage <= 25) return 'warning';   // 25% or less
  if (percentage <= 50) return 'caution';   // 50% or less
  return 'healthy';
}
```

---

## ⚡ Handling Rate Limits

### Scenario 1: Got 429 Response

```javascript
// composables/useApi.js

async function apiCall(endpoint, method = 'GET', data = null, retryCount = 0) {
  try {
    const response = await fetch(endpoint, {
      method,
      headers: { 'Authorization': `Bearer ${getToken()}` },
      body: data ? JSON.stringify(data) : null
    });
    
    const result = await response.json();
    
    // Handle 429 Too Many Requests
    if (response.status === 429) {
      const retryAfter = 
        parseInt(response.headers.get('Retry-After')) || 60;
      
      // Wait and retry automatically
      if (retryCount < 3) {
        console.warn(`Rate limited. Retrying in ${retryAfter}s...`);
        await sleep(retryAfter * 1000);
        return apiCall(endpoint, method, data, retryCount + 1);
      } else {
        throw new Error('Rate limit exceeded. Please try again later.');
      }
    }
    
    return result;
  } catch (error) {
    throw error;
  }
}

function sleep(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}
```

### Scenario 2: Account Locked (423)

User cannot login for 30 minutes. Show countdown:

```javascript
// components/LoginForm.vue

import { ref, computed } from 'vue';

export default {
  setup() {
    const accountLocked = ref(false);
    const lockExpiryTime = ref(null);
    const lockTimeRemaining = ref(null);
    
    async function handleLogin() {
      try {
        const response = await fetch('/api/auth/login', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ email, password })
        });
        
        if (response.status === 423) {
          const data = await response.json();
          // Account locked
          accountLocked.value = true;
          lockExpiryTime.value = data.error.details.retry_after;
          
          // Start countdown
          startLockCountdown(data.error.details.minutes_remaining);
          return;
        }
        
        if (response.ok) {
          // Login successful
        }
      } catch (error) {
        // Error handling
      }
    }
    
    function startLockCountdown(minutes) {
      let secondsRemaining = minutes * 60;
      
      const interval = setInterval(() => {
        secondsRemaining--;
        lockTimeRemaining.value = Math.ceil(secondsRemaining / 60);
        
        if (secondsRemaining <= 0) {
          clearInterval(interval);
          accountLocked.value = false;
          lockTimeRemaining.value = null;
        }
      }, 1000);
    }
    
    return {
      accountLocked,
      lockTimeRemaining,
      handleLogin,
      startLockCountdown
    };
  }
};
```

---

## 🏆 Best Practices

### 1. Check Remaining Before Requesting

```javascript
// Store rate limit info in Pinia
export const useRateLimitStore = defineStore('rateLimit', () => {
  const limits = reactive({
    remaining: null,
    limit: null,
    resetAt: null
  });
  
  const isLimitApproaching = computed(() => {
    if (!limits.limit || !limits.remaining) return false;
    return (limits.remaining / limits.limit) < 0.25; // < 25%
  });
  
  const updateFromHeaders = (response) => {
    limits.limit = parseInt(response.headers.get('X-RateLimit-Limit'));
    limits.remaining = parseInt(response.headers.get('X-RateLimit-Remaining'));
    limits.resetAt = parseInt(response.headers.get('X-RateLimit-Reset'));
  };
  
  return { limits, isLimitApproaching, updateFromHeaders };
});

// In component
const rateLimitStore = useRateLimitStore();

if (rateLimitStore.isLimitApproaching) {
  showWarning('You are approaching rate limit. Please slow down.');
}
```

### 2. Batch Requests When Possible

```javascript
// ❌ BAD: Make 50 requests immediately
skills.forEach(skill => {
  await api.get(`/api/skills/${skill.id}`);
});

// ✅ GOOD: Get all skills in one request
const allSkills = await api.get('/api/student/skills');
```

### 3. Implement Debouncing for Search

```javascript
// composables/useSearch.js
import { ref, watch } from 'vue';
import { debounce } from '@/utils/debounce';

export function useSearch() {
  const query = ref('');
  const results = ref([]);
  
  // Debounce search to 1 request per 500ms
  const debouncedSearch = debounce(async (searchQuery) => {
    if (searchQuery.length < 2) return;
    
    const response = await fetch(
      `/api/postings?search=${encodeURIComponent(searchQuery)}`
    );
    results.value = await response.json();
  }, 500);
  
  watch(query, debouncedSearch);
  
  return { query, results };
}
```

### 4. Implement Throttling for Rapid Events

```javascript
// utils/throttle.js
export function throttle(func, limit) {
  let inThrottle;
  return function(...args) {
    if (!inThrottle) {
      func.apply(this, args);
      inThrottle = true;
      setTimeout(() => inThrottle = false, limit);
    }
  };
}

// Usage: Scroll/resize events
window.addEventListener('scroll', throttle(() => {
  // Fetch more data on scroll
  loadMorePostings();
}, 1000)); // Max 1 request per second
```

---

## 🔄 Retry Strategies

### Strategy 1: Exponential Backoff

Ideal for unpredictable errors (429, server errors):

```javascript
async function withExponentialBackoff(
  fn,
  maxRetries = 3,
  baseDelay = 1000
) {
  for (let attempt = 1; attempt <= maxRetries; attempt++) {
    try {
      return await fn();
    } catch (error) {
      if (attempt === maxRetries) throw error;
      
      // Exponential backoff: 1s, 2s, 4s, 8s...
      const delay = baseDelay * Math.pow(2, attempt - 1);
      
      // Add random jitter to prevent thundering herd
      const jitter = delay * Math.random();
      
      await sleep(delay + jitter);
    }
  }
}

// Usage
const result = await withExponentialBackoff(
  () => apiCall('/api/matches'),
  3,  // max 3 retries
  1000 // initial 1 second delay
);
```

### Strategy 2: Circuit Breaker Pattern

Prevent cascading failures:

```javascript
class CircuitBreaker {
  constructor(threshold = 5, timeout = 60000) {
    this.failureCount = 0;
    this.threshold = threshold;
    this.timeout = timeout;
    this.state = 'closed'; // closed, open, half-open
    this.resetTimer = null;
  }
  
  async execute(fn) {
    if (this.state === 'open') {
      throw new Error('Circuit breaker is open');
    }
    
    try {
      const result = await fn();
      this.onSuccess();
      return result;
    } catch (error) {
      this.onFailure();
      throw error;
    }
  }
  
  onSuccess() {
    this.failureCount = 0;
    if (this.state === 'half-open') {
      this.state = 'closed';
    }
  }
  
  onFailure() {
    this.failureCount++;
    
    if (this.failureCount >= this.threshold) {
      this.state = 'open';
      
      // Reset to half-open after timeout
      this.resetTimer = setTimeout(() => {
        this.state = 'half-open';
        this.failureCount = 0;
      }, this.timeout);
    }
  }
}

// Usage
const breaker = new CircuitBreaker();

async function safeApiCall(endpoint) {
  return breaker.execute(() => apiCall(endpoint));
}
```

### Strategy 3: Retry with Status-Specific Logic

```javascript
async function smartRetry(apiCall, maxRetries = 3) {
  for (let attempt = 1; attempt <= maxRetries; attempt++) {
    try {
      return await apiCall();
    } catch (error) {
      const status = error.response?.status;
      const isLastAttempt = attempt === maxRetries;
      
      // Don't retry client errors (400, 403, 404, etc)
      if (status >= 400 && status < 500) {
        throw error;
      }
      
      // Retry server errors and rate limits
      if ([429, 500, 502, 503].includes(status)) {
        if (isLastAttempt) throw error;
        
        const delay = getRetryDelay(attempt, error);
        await sleep(delay);
        continue;
      }
      
      // Unexpected error
      throw error;
    }
  }
}

function getRetryDelay(attempt, error) {
  // If error tells us to wait, use that
  if (error.response?.headers['retry-after']) {
    return parseInt(error.response.headers['retry-after']) * 1000;
  }
  
  // Exponential backoff otherwise
  return Math.pow(2, attempt - 1) * 1000 + Math.random() * 1000;
}
```

---

## 📊 Monitoring Rate Limits

### Display Rate Limit Status in UI

```vue
<!-- components/RateLimitIndicator.vue -->
<template>
  <div class="rate-limit-indicator" :class="status">
    <span v-if="status === 'healthy'" class="icon">✓</span>
    <span v-else-if="status === 'caution'" class="icon">⚠</span>
    <span v-else-if="status === 'warning'" class="icon">⚠⚠</span>
    <span v-else class="icon">🔴</span>
    
    <span class="text">
      {{ remaining }} / {{ limit }} requests remaining
    </span>
    
    <span class="time" v-if="resetAt">
      Resets in {{ minutesUntilReset }}
    </span>
  </div>
</template>

<script setup>
import { computed } from 'vue';
import { useRateLimitStore } from '@/stores/rateLimit';

const rateLimitStore = useRateLimitStore();

const remaining = computed(() => rateLimitStore.limits.remaining);
const limit = computed(() => rateLimitStore.limits.limit);
const resetAt = computed(() => rateLimitStore.limits.resetAt);

const status = computed(() => {
  if (!remaining.value || !limit.value) return 'unknown';
  const pct = (remaining.value / limit.value) * 100;
  if (pct <= 10) return 'critical';
  if (pct <= 25) return 'warning';
  if (pct <= 50) return 'caution';
  return 'healthy';
});

const minutesUntilReset = computed(() => {
  if (!resetAt.value) return null;
  const now = Math.floor(Date.now() / 1000);
  const diff = resetAt.value - now;
  return Math.max(1, Math.ceil(diff / 60));
});
</script>

<style scoped>
.rate-limit-indicator {
  padding: 8px 12px;
  border-radius: 4px;
  display: flex;
  gap: 8px;
  align-items: center;
  font-size: 12px;
}

.rate-limit-indicator.healthy {
  background: #d4edda;
  color: #155724;
}

.rate-limit-indicator.caution {
  background: #fff3cd;
  color: #856404;
}

.rate-limit-indicator.warning {
  background: #f8d7da;
  color: #721c24;
}

.rate-limit-indicator.critical {
  background: #f5c6cb;
  color: #721c24;
  font-weight: bold;
}

.icon {
  min-width: 16px;
}
</style>
```

---

## 🚨 Common Scenarios

### Scenario: Bulk Import Causes Rate Limit

```javascript
// ❌ BAD: Too fast
postings.forEach(posting => {
  await savePosting(posting); // 1000 requests in rapid succession
});

// ✅ GOOD: Throttled
const DELAY = 100; // ms between requests

for (const posting of postings) {
  await savePosting(posting);
  await sleep(DELAY);
}
```

### Scenario: Multiple Tabs Trigger Rate Limit

```javascript
// Store should be shared across tabs via localStorage
// but add local detection to prevent duplicate requests

const requestCache = new Map();

async function cachedRequest(key, fn) {
  if (requestCache.has(key)) {
    return requestCache.get(key);
  }
  
  const promise = fn();
  requestCache.set(key, promise);
  
  // Clear cache after request completes or fails
  try {
    const result = await promise;
    return result;
  } finally {
    // Clear cache after 5 seconds
    setTimeout(() => requestCache.delete(key), 5000);
  }
}
```

---

## 🔗 Related Documentation
- [Error Handling Guide](16-ERROR-HANDLING-GUIDE.md)
- [API Reference](03-API-REFERENCE.md)
- [Vue 3 Integration Guide](14-VUE3-INTEGRATION-GUIDE.md)
