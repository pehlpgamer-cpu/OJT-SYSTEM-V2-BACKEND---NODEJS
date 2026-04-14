# Vercel Deployment - API Testing Guide

## Quick Health Check

Test if your API is responding:

```bash
# Test 1: Health endpoint (simplest test)
curl https://ojt-system-v2-backend-nodejs.vercel.app/health

# Expected success response:
# {
#   "status": "ok",
#   "timestamp": "2026-04-14T...",
#   "environment": "production"
# }
```

✅ **If you see this:** API is running successfully  
❌ **If you get error:** API needs env variables or has issues

---

## Complete Test Suite

### Test 1: Health Check
```bash
curl https://ojt-system-v2-backend-nodejs.vercel.app/health
```

**Expected Response (200 OK):**
```json
{
  "status": "ok",
  "timestamp": "2026-04-14T12:00:00.000Z",
  "environment": "production"
}
```

✅ **Success Indicator:** Status code 200, "status": "ok"

---

### Test 2: API Version
```bash
curl https://ojt-system-v2-backend-nodejs.vercel.app/api/version
```

**Expected Response (200 OK):**
```json
{
  "version": "2.0.0",
  "name": "OJT System V2 API",
  "environment": "production"
}
```

✅ **Success Indicator:** Version is 2.0.0

---

### Test 3: Google OAuth Redirect
```bash
curl -i https://ojt-system-v2-backend-nodejs.vercel.app/api/auth/google/redirect?role=student
```

**Expected Response (302 Redirect or 200 with redirect info):**
```
HTTP/1.1 302 Found
Location: https://accounts.google.com/o/oauth2/v2/auth?...
```

Or:

```json
{
  "message": "Redirecting to Google",
  "url": "https://accounts.google.com/o/oauth2/v2/auth?..."
}
```

✅ **Success Indicator:** Redirects to Google OAuth or gives redirect URL

---

### Test 4: User Registration (Tests Database)
```bash
curl -X POST https://ojt-system-v2-backend-nodejs.vercel.app/api/auth/register \
  -H "Content-Type: application/json" \
  -d '{
    "email": "test@example.com",
    "password": "SecurePassword123!",
    "name": "Test User",
    "role": "student"
  }'
```

**Expected Response (201 Created):**
```json
{
  "message": "Registration successful",
  "user": {
    "id": 1,
    "email": "test@example.com",
    "name": "Test User",
    "role": "student"
  },
  "token": "eyJhbGc..."
}
```

✅ **Success Indicator:** Status 201, has user object and token  
⚠️ **If database error:** DATABASE_URL not set

---

### Test 5: User Login
```bash
curl -X POST https://ojt-system-v2-backend-nodejs.vercel.app/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{
    "email": "test@example.com",
    "password": "SecurePassword123!"
  }'
```

**Expected Response (200 OK):**
```json
{
  "message": "Login successful",
  "user": {
    "id": 1,
    "email": "test@example.com",
    "name": "Test User"
  },
  "token": "eyJhbGc..."
}
```

✅ **Success Indicator:** Status 200, returns token

---

## How to Interpret Test Results

### ✅ Success Indicators

| Test | Success Looks Like |
|------|-------------------|
| **Health** | Status 200, "status": "ok" |
| **Version** | Status 200, version: 2.0.0 |
| **OAuth** | Status 200-302, redirects to Google |
| **Register** | Status 201, has token |
| **Login** | Status 200, has token |

---

### ❌ Common Error Responses

#### 500 Internal Server Error
```json
{
  "error": "Internal Server Error"
}
```

**Cause:** Environment variables missing or database not connected

**Solution:** 
```bash
# Check Vercel logs
vercel logs --follow

# Set environment variables
# Dashboard → Settings → Environment Variables → Add DATABASE_URL, etc.

# Redeploy
vercel --prod
```

---

#### 404 Not Found
```json
{
  "error": "Route not found"
}
```

**Cause:** Endpoint doesn't exist or wrong URL

**Solution:** Check endpoint path, verify URL is correct

---

#### 400 Bad Request
```json
{
  "error": "Validation failed",
  "details": "Email is required"
}
```

**Cause:** Invalid input data

**Solution:** Check your request body matches requirements

---

#### 401 Unauthorized
```json
{
  "error": "Invalid credentials"
}
```

**Cause:** Wrong password or email not found

**Solution:** Verify credentials are correct

---

## Full Test Sequence

Run these in order to verify everything:

### Step 1: Basic Connectivity
```bash
echo "=== Test 1: Health Check ==="
curl https://ojt-system-v2-backend-nodejs.vercel.app/health
echo ""

echo "=== Test 2: API Version ==="
curl https://ojt-system-v2-backend-nodejs.vercel.app/api/version
echo ""
```

**Expected:** Both respond with 200 status

---

### Step 2: Test Google OAuth
```bash
echo "=== Test 3: Google OAuth Redirect ==="
curl -i https://ojt-system-v2-backend-nodejs.vercel.app/api/auth/google/redirect?role=student
echo ""
```

**Expected:** 302 redirect or URL in response

---

### Step 3: Test Database (if configured)
```bash
echo "=== Test 4: Register User ==="
curl -X POST https://ojt-system-v2-backend-nodejs.vercel.app/api/auth/register \
  -H "Content-Type: application/json" \
  -d '{
    "email": "testuser@example.com",
    "password": "TestPass123!",
    "name": "Test User",
    "role": "student"
  }'
echo ""

echo "=== Test 5: Login User ==="
curl -X POST https://ojt-system-v2-backend-nodejs.vercel.app/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{
    "email": "testuser@example.com",
    "password": "TestPass123!"
  }'
echo ""
```

**Expected:** Both return 200-201 status with token

---

## Viewing Deployment Logs

### Real-Time Logs
```bash
vercel logs --follow
```

### Filter by Function
```bash
vercel logs --function api
```

### Recent Deployments
```bash
vercel list
```

### Specific Deployment Logs
```bash
vercel logs [deployment-id]
```

---

## What Each Log Line Means

| Log Message | Meaning |
|-------------|---------|
| `Initializing app on first request...` | API starting (normal) |
| `✅ App initialized and ready` | Request handler ready |
| `Error: connect ECONNREFUSED` | Database connection failed |
| `Cannot find module 'pg'` | Missing dependency |
| `JWT secret not configured` | Environment variable missing |
| `Email already exists` | Duplicate account (expected on second register) |

---

## Checklist: What Success Looks Like

- ✅ Health endpoint responds (200 ok)
- ✅ Version endpoint returns 2.0.0
- ✅ Google OAuth endpoint gives redirect URL
- ✅ No 500 errors in logs
- ✅ No "module not found" errors
- ✅ If database configured: Register/Login work
- ✅ Response times < 1 second
- ✅ No authentication errors (unless testing auth failing)

---

## Quick URL Verification

Replace `https://ojt-system-v2-backend-nodejs.vercel.app` with your actual Vercel URL:

```bash
# Get your actual URL from:
vercel list

# Or from dashboard:
https://vercel.com/pehlpgamer-cpus-projects/ojt-system-v2-backend-nodejs
```

---

## Testing with Postman/Insomnia

### 1. Import Collection
Create requests for each endpoint:

**Health Check**
- Method: GET
- URL: `{{BASE_URL}}/health`
- Expected: 200

**Google OAuth**
- Method: GET
- URL: `{{BASE_URL}}/api/auth/google/redirect?role=student`
- Expected: 200/302

**Register**
- Method: POST
- URL: `{{BASE_URL}}/api/auth/register`
- Body: 
```json
{
  "email": "test@example.com",
  "password": "SecurePassword123!",
  "name": "Test User",
  "role": "student"
}
```
- Expected: 201

**Login**
- Method: POST
- URL: `{{BASE_URL}}/api/auth/login`
- Body:
```json
{
  "email": "test@example.com",
  "password": "SecurePassword123!"
}
```
- Expected: 200

---

## Success Criteria Summary

| Criteria | Status | How to Verify |
|----------|--------|---------------|
| **API is live** | ✅ | `curl /health` returns 200 |
| **Endpoints accessible** | ✅ | Get responses (not 404) |
| **No crashes** | ✅ | No 500 errors in logs |
| **Requests processed** | ✅ | Responses contain data |
| **Performance** | ✅ | Response time < 1 second |
| **Database ready** | ⏳ | Register/Login work (needs env vars) |

---

## Common "Success" vs "Failure" Scenarios

### Scenario 1: API Responds to Health
```bash
$ curl https://ojt-system-v2-backend-nodejs.vercel.app/health
{"status":"ok","timestamp":"2026-04-14T12:00:00.000Z","environment":"production"}

✅ SUCCESS - API is running
```

---

### Scenario 2: 500 Error
```bash
$ curl https://ojt-system-v2-backend-nodejs.vercel.app/api/auth/register
{"error":"Internal Server Error","message":"connect ECONNREFUSED"}

❌ FAILURE - Likely missing DATABASE_URL environment variable
Action: Set DATABASE_URL in Vercel dashboard, redeploy
```

---

### Scenario 3: Google OAuth Redirect Works
```bash
$ curl -i https://ojt-system-v2-backend-nodejs.vercel.app/api/auth/google/redirect?role=student
HTTP/1.1 302 Found
Location: https://accounts.google.com/o/oauth2/v2/auth?...

✅ SUCCESS - OAuth route is working
```

---

### Scenario 4: Register Succeeds
```bash
$ curl -X POST ... /api/auth/register
{"message":"Registration successful","user":{...},"token":"eyJ..."}

✅ SUCCESS - Database is connected and working
```

---

## Performance Metrics to Watch

### Good Indicators
- Response time: **< 500ms** (warm requests)
- Cold start: **< 5 seconds** (first request)
- Error rate: **< 1%**
- Uptime: **> 99.9%**

### Warning Signs
- Response time: **> 5 seconds**
- Frequent 500 errors
- Database connection timeouts
- Memory usage > 90%

---

## Next Steps

1. ✅ Run health check tests
2. ✅ Review logs for errors
3. ⏳ Set environment variables if not done
4. ⏳ Test with database if configured
5. ⏳ Setup custom domain (optional)
6. ⏳ Monitor performance on dashboard

---

**Your API deployment success depends on:**

1. ✅ API responds to requests (you can verify this)
2. ✅ No errors in logs (check `vercel logs`)
3. ⏳ Environment variables set (required for full functionality)
4. ⏳ Database configured (required for data features)

Start with the health check - if that works, your API is successfully deployed!
