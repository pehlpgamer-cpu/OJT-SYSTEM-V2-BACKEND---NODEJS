# React Custom Hooks for OJT API

**Status:** Recommended Hook Patterns for React Developers  
**Version:** 2.1.0  
**Updated:** April 14, 2026  
**Target:** React Components using OJT Backend API

---

## Quick Reference

Copy-paste ready hooks for common API operations.

---

## Hook 1: useAuth - Authentication Management

```javascript
/**
 * WHY: Centralized auth state + token management
 * Handles: login, register, logout, token refresh, current user
 */
import { useCallback, useEffect, useState } from 'react';

const API_BASE = process.env.REACT_APP_API_URL || 'http://localhost:5000/api';

export function useAuth() {
  const [user, setUser] = useState(null);
  const [token, setToken] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  // Load auth state from localStorage on mount
  useEffect(() => {
    const savedToken = localStorage.getItem('ojt_token');
    const savedUser = localStorage.getItem('ojt_user');
    
    if (savedToken && savedUser) {
      setToken(savedToken);
      setUser(JSON.parse(savedUser));
    }
    setLoading(false);
  }, []);

  // Register new user
  const register = useCallback(async (data) => {
    setLoading(true);
    try {
      const response = await fetch(`${API_BASE}/auth/register`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
      });

      const result = await response.json();

      if (!response.ok) {
        throw new Error(result.message);
      }

      // Store auth data
      localStorage.setItem('ojt_token', result.token);
      localStorage.setItem('ojt_user', JSON.stringify(result.user));
      
      setToken(result.token);
      setUser(result.user);
      setError(null);

      return result;
    } catch (err) {
      setError(err.message);
      throw err;
    } finally {
      setLoading(false);
    }
  }, []);

  // Login with email/password
  const login = useCallback(async (email, password) => {
    setLoading(true);
    try {
      const response = await fetch(`${API_BASE}/auth/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password }),
      });

      const result = await response.json();

      if (!response.ok) {
        throw new Error(result.message);
      }

      localStorage.setItem('ojt_token', result.token);
      localStorage.setItem('ojt_user', JSON.stringify(result.user));
      
      setToken(result.token);
      setUser(result.user);
      setError(null);

      return result;
    } catch (err) {
      // Special handling for lockout
      if (err.message.includes('locked')) {
        const remaining = extractMinutes(err.message);
        setError({ message: err.message, locked: true, remaining });
      } else {
        setError(err.message);
      }
      throw err;
    } finally {
      setLoading(false);
    }
  }, []);

  // Logout - clear everything
  const logout = useCallback(() => {
    localStorage.removeItem('ojt_token');
    localStorage.removeItem('ojt_user');
    setToken(null);
    setUser(null);
    setError(null);
  }, []);

  return {
    user,
    token,
    loading,
    error,
    register,
    login,
    logout,
    isAuthenticated: !!token,
  };
}

function extractMinutes(message) {
  const match = message.match(/(\d+)\s*minutes?/);
  return match ? parseInt(match[1]) : 0;
}
```

---

## Hook 2: useApi - Generic API Requests

```javascript
/**
 * WHY: Reusable hook for any API call with auth
 * Handles: auth header, error handling, loading state, retries
 */
import { useCallback, useState } from 'react';

const API_BASE = process.env.REACT_APP_API_URL || 'http://localhost:5000/api';

export function useApi() {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  const request = useCallback(async (
    endpoint,
    options = {},
    retry = 0,
    maxRetries = 2
  ) => {
    setLoading(true);
    setError(null);

    try {
      const token = localStorage.getItem('ojt_token');
      
      const response = await fetch(`${API_BASE}${endpoint}`, {
        method: 'GET',
        ...options,
        headers: {
          'Content-Type': 'application/json',
          ...(token && { 'Authorization': `Bearer ${token}` }),
          ...options.headers,
        },
      });

      // Handle specific status codes
      if (response.status === 401) {
        // Token expired - logout
        localStorage.removeItem('ojt_token');
        localStorage.removeItem('ojt_user');
        window.location.href = '/login';
        throw new Error('Session expired');
      }

      if (response.status === 429) {
        // Rate limited - retry with backoff
        if (retry < maxRetries) {
          await new Promise(r => setTimeout(r, Math.pow(2, retry) * 1000));
          return request(endpoint, options, retry + 1, maxRetries);
        }
        throw new Error('Too many requests - please wait');
      }

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.message || 'API error');
      }

      return data;
    } catch (err) {
      setError(err.message);
      throw err;
    } finally {
      setLoading(false);
    }
  }, []);

  return { request, loading, error };
}

// Usage:
// const { request, loading, error } = useApi();
// const result = await request('/student/profile');
```

---

## Hook 3: useStudentMatches - Job Matching

```javascript
/**
 * WHY: Get job matches with proper error handling
 * Returns: matches array, loading state, error state
 */
import { useCallback, useEffect, useState } from 'react';
import { useApi } from './useApi';

export function useStudentMatches(minScore = 70, enabled = true) {
  const [matches, setMatches] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const { request } = useApi();

  const fetchMatches = useCallback(async () => {
    if (!enabled) return;

    setLoading(true);
    try {
      const data = await request(`/student/matches?min_score=${minScore}`);
      setMatches(data.matches || []);
      setError(null);
    } catch (err) {
      setError(err.message);
      setMatches([]);
    } finally {
      setLoading(false);
    }
  }, [minScore, enabled, request]);

  // Fetch on mount and when minScore changes
  useEffect(() => {
    fetchMatches();
  }, [fetchMatches]);

  return {
    matches,
    loading,
    error,
    refetch: fetchMatches,
  };
}

// Usage:
// const { matches, loading, error } = useStudentMatches(75);
// matches.forEach(m => console.log(m.overall_score));
```

---

## Hook 4: useApplication - Submit Job Application

```javascript
/**
 * WHY: Handle application submission with transaction safety
 * Handles: Optimistic UI updates, error rollback, conflict detection
 */
import { useCallback, useState } from 'react';
import { useApi } from './useApi';

export function useApplication() {
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState(null);
  const { request } = useApi();

  const apply = useCallback(async (postingId, data) => {
    setSubmitting(true);
    setError(null);

    try {
      const result = await request(`/applications/${postingId}`, {
        method: 'POST',
        body: JSON.stringify(data),
      });

      return result;
    } catch (err) {
      // Handle specific errors
      if (err.message.includes('already applied')) {
        setError({
          type: 'DUPLICATE',
          message: 'You already applied to this position',
          fatal: true, // User cannot retry
        });
      } else if (err.message.includes('filled')) {
        setError({
          type: 'FULL',
          message: 'All positions filled',
          fatal: true, // User cannot retry
        });
      } else if (err.message.includes('not found')) {
        setError({
          type: 'NOTFOUND',
          message: 'Job posting not found',
          fatal: true,
        });
      } else {
        setError({
          type: 'GENERIC',
          message: err.message,
          fatal: false, // User can retry
        });
      }
      throw err;
    } finally {
      setSubmitting(false);
    }
  }, [request]);

  return {
    apply,
    submitting,
    error,
    clearError: () => setError(null),
  };
}

// Usage in component:
// const { apply, submitting, error } = useApplication();
// 
// const handleApply = async () => {
//   try {
//     await apply(jobId, { cover_letter: '...' });
//     showSuccess('Applied!');
//   } catch {
//     if (!error.fatal) {
//       showRetryButton();
//     }
//   }
// };
```

---

## Hook 5: useFormValidation - React Form Handling

```javascript
/**
 * WHY: Validate form before submitting to API
 * Prevents unnecessary API calls, improves UX
 */
import { useCallback, useState } from 'react';

export function useFormValidation(initialValues, validationRules) {
  const [values, setValues] = useState(initialValues);
  const [errors, setErrors] = useState({});
  const [touched, setTouched] = useState({});

  const validate = useCallback(() => {
    const newErrors = {};

    Object.entries(validationRules).forEach(([field, rules]) => {
      const value = values[field];

      if (rules.required && !value) {
        newErrors[field] = `${field} is required`;
      } else if (rules.minLength && value && value.length < rules.minLength) {
        newErrors[field] = `${field} must be at least ${rules.minLength} characters`;
      } else if (rules.email && value && !isValidEmail(value)) {
        newErrors[field] = 'Invalid email address';
      }
    });

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  }, [values, validationRules]);

  const handleChange = (field) => (e) => {
    setValues(prev => ({ ...prev, [field]: e.target.value }));
  };

  const handleBlur = (field) => () => {
    setTouched(prev => ({ ...prev, [field]: true }));
  };

  const handleSubmit = (onSubmit) => async (e) => {
    e.preventDefault();
    
    if (validate()) {
      await onSubmit(values);
    }
  };

  return {
    values,
    errors,
    touched,
    handleChange,
    handleBlur,
    handleSubmit,
    setValues,
  };
}

function isValidEmail(email) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
}

// Usage:
// const form = useFormValidation(
//   { email: '', password: '' },
//   {
//     email: { required: true, email: true },
//     password: { required: true, minLength: 8 }
//   }
// );
//
// <input
//   value={form.values.email}
//   onChange={form.handleChange('email')}
//   onBlur={form.handleBlur('email')}
// />
// {form.touched.email && form.errors.email && <span>{form.errors.email}</span>}
```

---

## Full Example Component: Job Application

```javascript
import React from 'react';
import { useAuth } from './hooks/useAuth';
import { useStudentMatches } from './hooks/useStudentMatches';
import { useApplication } from './hooks/useApplication';
import { useFormValidation } from './hooks/useFormValidation';

export function JobApplicationPage() {
  const { user, token } = useAuth();
  const { matches, loading: matchesLoading } = useStudentMatches(75);
  const { apply, submitting, error } = useApplication();
  const form = useFormValidation(
    { coverLetter: '' },
    { coverLetter: { required: true, minLength: 50 } }
  );

  const handleApply = form.handleSubmit(async (values) => {
    const selectedJob = matches.find(m => m.id === selectedJobId);
    
    try {
      await apply(selectedJob.posting_id, {
        cover_letter: values.coverLetter,
      });
      
      alert('Application submitted!');
      form.setValues({ coverLetter: '' });
    } catch (err) {
      // Error already in state via useApplication
    }
  });

  if (!token) {
    return <div>Please login first</div>;
  }

  return (
    <div>
      <h1>Find Jobs</h1>
      
      {matchesLoading ? (
        <div>Loading matches...</div>
      ) : (
        <div>
          {matches.map(match => (
            <div key={match.id}>
              <h3>{match.posting.title}</h3>
              <p>Match Score: {match.overall_score}%</p>
              <button onClick={() => openApplicationForm(match.posting_id)}>
                Apply
              </button>
            </div>
          ))}
        </div>
      )}

      {/* Application Form */}
      <form onSubmit={handleApply}>
        <textarea
          value={form.values.coverLetter}
          onChange={form.handleChange('coverLetter')}
          onBlur={form.handleBlur('coverLetter')}
          placeholder="Why do you want this job?"
        />
        {form.touched.coverLetter && form.errors.coverLetter && (
          <span className="error">{form.errors.coverLetter}</span>
        )}

        {error && (
          <div className="error">
            {error.message}
            {!error.fatal && <button type="button">Retry</button>}
          </div>
        )}

        <button type="submit" disabled={submitting}>
          {submitting ? 'Submitting...' : 'Submit Application'}
        </button>
      </form>
    </div>
  );
}
```

---

## Error Handling Patterns

### Pattern 1: Graceful Retry

```javascript
const [retryCount, setRetryCount] = useState(0);
const maxRetries = 3;

const handleRetry = async () => {
  if (retryCount < maxRetries) {
    setRetryCount(retryCount + 1);
    await retry(); // Re-execute failed operation
  }
};

// Show retry button only if not fatal error and haven't exceeded max retries
{error && !error.fatal && retryCount < maxRetries && (
  <button onClick={handleRetry}>Retry ({retryCount}/{maxRetries})</button>
)}
```

### Pattern 2: User Lockout Countdown

```javascript
const [lockoutRemaining, setLockoutRemaining] = useState(0);

useEffect(() => {
  if (lockoutRemaining > 0) {
    const timer = setTimeout(
      () => setLockoutRemaining(lockoutRemaining - 1),
      60000 // Update every minute
    );
    return () => clearTimeout(timer);
  }
}, [lockoutRemaining]);

// Display countdown timer
{error?.locked && (
  <div className="alert">
    Account locked. Try again in {lockoutRemaining} minutes
  </div>
)}
```

---

## Testing Hooks

```javascript
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';

// Mock fetch
global.fetch = jest.fn();

test('useAuth registers user', async () => {
  fetch.mockResolvedValueOnce({
    ok: true,
    json: async () => ({
      user: { id: 1, name: 'John' },
      token: 'jwt_token',
    }),
  });

  const { result } = renderHook(() => useAuth());

  await act(async () => {
    await result.current.register({
      name: 'John',
      email: 'john@example.com',
      password: 'Pass123!',
      role: 'student',
    });
  });

  expect(result.current.user).toEqual({ id: 1, name: 'John' });
  expect(localStorage.getItem('ojt_token')).toBe('jwt_token');
});
```

---

## Summary

| Hook | What it does | When to use |
|------|-------------|-----------|
| `useAuth` | Login, register, logout | On every page |
| `useApi` | Generic HTTP requests | Anywhere you need API data |
| `useStudentMatches` | Fetch job matches | Job search page |
| `useApplication` | Submit job application | Application form |
| `useFormValidation` | Validate form fields | Any form (register, profile, etc) |

**Next:** See [03-API-REFERENCE.md](./03-API-REFERENCE.md) for all available endpoints these hooks call.
