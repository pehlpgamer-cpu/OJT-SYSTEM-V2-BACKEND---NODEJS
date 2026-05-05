# Registration Network Error Fix

## Problem
Frontend (https://ojt-job-matching.netlify.app) was getting:
```
NetworkError when attempting to fetch resource
```
when attempting to register on the RegisterPage component.

## Root Cause
The Vercel serverless entry point (`api/index.js`) was serving a **stub application** with only `/health` and `/api/version` endpoints, returning **404** for all other routes including `/api/auth/register`.

The file contained a minimal Express app instead of loading the actual application from `src/server.js`.

## Fixes Applied

### 1. Updated `api/index.js` (Critical Fix)
**Before**: Served a stub app with 404 for all real endpoints
**After**: Properly loads and initializes the full Express app from `src/server.js`

Key changes:
- Imports `initializeApp` from `src/server.js`
- Initializes the full app on first request (cold start optimization)
- Properly handles initialization errors with meaningful error messages
- All routes from `src/server.js` now available on Vercel

### 2. Added Input Validation to Registration Endpoint
**Location**: `src/server.js` line 162 (POST /api/auth/register)

Added validation middleware:
- `authValidationRules()` - Validates input data
- `handleValidationErrors` - Returns 422 for invalid input

### 3. Enhanced Validation Rules
**Location**: `src/middleware/validation.js`

Added role field validation:
```javascript
body('role')
  .trim()
  .isIn(['student', 'company', 'coordinator'])
  .withMessage('Role must be one of: student, company, or coordinator'),
```

Validation now checks:
- ✅ Email format
- ✅ Password strength (8+ chars, uppercase, number, special char)
- ✅ Password confirmation match
- ✅ Name format (2-255 chars, letters/spaces/hyphens/apostrophes only)
- ✅ Role (must be valid: student, company, or coordinator)

## Deployment Checklist

### ⚠️ CRITICAL: Environment Variables on Vercel
Set these on Vercel dashboard under Settings → Environment Variables:

```
DATABASE_URL=postgresql://[user]:[password]@[host]/[database]?sslmode=require
JWT_SECRET=generate-with: node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
SESSION_SECRET=generate-with: node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
NODE_ENV=production
APP_ENV=production
CORS_ORIGIN=https://ojt-job-matching.netlify.app
GOOGLE_CLIENT_ID=your-google-client-id
GOOGLE_CLIENT_SECRET=your-google-client-secret
GOOGLE_PROD_CALLBACK_URL=https://ojt-system-v2-backend-nodejs.vercel.app/api/auth/google/callback
RATE_LIMIT_WINDOW_MS=900000
RATE_LIMIT_MAX_REQUESTS=100
```

### Steps to Deploy

1. **Commit changes**:
   ```bash
   git add api/index.js src/server.js src/middleware/validation.js
   git commit -m "fix: repair Vercel serverless entry point and add registration validation"
   ```

2. **Push to GitHub**:
   ```bash
   git push origin main
   ```

3. **Vercel auto-redeploy** (if connected) or:
   ```bash
   vercel deploy --prod
   ```

4. **Verify on Vercel**:
   - Check Vercel dashboard for successful deployment
   - Check logs for initialization messages
   - Test `/health` endpoint should return 200

5. **Test Registration**:
   ```bash
   curl -X POST https://ojt-system-v2-backend-nodejs.vercel.app/api/auth/register \
     -H "Content-Type: application/json" \
     -d '{
       "name": "Test User",
       "email": "test@example.com",
       "password": "TestPassword123!",
       "password_confirmation": "TestPassword123!",
       "role": "student"
     }'
   ```

## Expected Response (Success)
```json
{
  "message": "Registration successful",
  "user": {
    "id": 1,
    "name": "Test User",
    "email": "test@example.com",
    "role": "student",
    "status": "active"
  },
  "token": "eyJhbGciOiJIUzI1NiIs..."
}
```

## Expected Response (Validation Error)
```json
{
  "message": "Validation failed",
  "statusCode": 422,
  "errors": {
    "password": ["Password must be at least 8 characters"]
  }
}
```

## Local Testing

### 1. Install dependencies:
```bash
npm install
```

### 2. Start local server:
```bash
npm start
```

### 3. Test registration locally:
```bash
curl -X POST http://localhost:5000/api/auth/register \
  -H "Content-Type: application/json" \
  -d '{
    "name": "Test User",
    "email": "test@example.com",
    "password": "TestPassword123!",
    "password_confirmation": "TestPassword123!",
    "role": "student"
  }'
```

## Debugging

### If registration still fails on Vercel:

1. **Check Vercel logs**:
   - Dashboard → Deployments → [latest] → Logs
   - Look for initialization errors

2. **Verify environment variables**:
   - Dashboard → Settings → Environment Variables
   - Ensure DATABASE_URL is set correctly

3. **Test backend directly**:
   ```bash
   # Test if app is running
   curl https://ojt-system-v2-backend-nodejs.vercel.app/health
   
   # Should return:
   # {"status":"ok","timestamp":"...","environment":"production"}
   ```

4. **Check CORS configuration**:
   - CORS_ORIGIN must match frontend URL exactly
   - Currently set to: `https://ojt-job-matching.netlify.app`

5. **Check database connection**:
   - Ensure Neon PostgreSQL is accessible
   - Test connection string in Neon dashboard

## Files Modified

| File | Changes |
|------|---------|
| `api/index.js` | Load full app from src/server.js instead of stub |
| `src/server.js` | Import authValidationRules, add to registration route |
| `src/middleware/validation.js` | Add role field validation |

## Timeline

- **Issue Date**: Registration endpoint returning 404 on Vercel
- **Root Cause**: Stub application serving instead of real app
- **Fixed**: api/index.js now properly initializes full Express app
- **Testing**: Verify on Vercel after deployment

---

**Status**: Ready for deployment and testing on Vercel
