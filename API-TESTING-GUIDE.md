# API Testing Guide - OJT System V2 Backend

**Base URL:** https://ojt-system-v2-backend-nodejs.vercel.app

---

## Quick Test (One-Liners)

### Option 1: Using curl (Command Line)

```bash
# Health Check
curl https://ojt-system-v2-backend-nodejs.vercel.app/health

# Version Info
curl https://ojt-system-v2-backend-nodejs.vercel.app/api/version

# Ping
curl https://ojt-system-v2-backend-nodejs.vercel.app/ping

# Minimal Handler
curl https://ojt-system-v2-backend-nodejs.vercel.app/minimal
```

### Option 2: Using PowerShell (Windows)

```powershell
# Health Check
(Invoke-WebRequest -Uri "https://ojt-system-v2-backend-nodejs.vercel.app/health").Content | ConvertFrom-Json

# Version Info
(Invoke-WebRequest -Uri "https://ojt-system-v2-backend-nodejs.vercel.app/api/version").Content | ConvertFrom-Json

# Ping
(Invoke-WebRequest -Uri "https://ojt-system-v2-backend-nodejs.vercel.app/ping").Content | ConvertFrom-Json

# Minimal Handler
(Invoke-WebRequest -Uri "https://ojt-system-v2-backend-nodejs.vercel.app/minimal").Content | ConvertFrom-Json
```

---

## Detailed Testing with curl

### 1. Health Endpoint
```bash
curl -i https://ojt-system-v2-backend-nodejs.vercel.app/health
```

**Expected Response:**
```
HTTP/1.1 200 OK
Content-Type: application/json

{"status":"ok","timestamp":"2026-04-14T06:02:43.404Z","environment":"vercel"}
```

### 2. Version Endpoint
```bash
curl -i https://ojt-system-v2-backend-nodejs.vercel.app/api/version
```

**Expected Response:**
```
HTTP/1.1 200 OK
Content-Type: application/json

{"version":"2.0.0","name":"OJT System V2 API","environment":"vercel","note":"Simple direct handler - use npm start for full app"}
```

### 3. Ping Endpoint
```bash
curl -i https://ojt-system-v2-backend-nodejs.vercel.app/ping
```

**Expected Response:**
```
HTTP/1.1 200 OK
Content-Type: application/json

{"pong":true}
```

### 4. Minimal Handler (Connectivity Test)
```bash
curl -i https://ojt-system-v2-backend-nodejs.vercel.app/minimal
```

**Expected Response:**
```
HTTP/1.1 200 OK
Content-Type: application/json

{"minimal":true,"time":"2026-04-14T05:58:21.616Z"}
```

### 5. Test (ES Module Test)
```bash
curl -i https://ojt-system-v2-backend-nodejs.vercel.app/test
```

**Expected Response (May fail depending on implementation):**
```
HTTP/1.1 500 or 200 
Content-Type: application/json
```

### 6. 404 - Invalid Route
```bash
curl -i https://ojt-system-v2-backend-nodejs.vercel.app/invalid-route
```

**Expected Response:**
```
HTTP/1.1 404 Not Found
Content-Type: application/json

{"error":"Not Found","message":"This is a simplified Vercel deployment...","path":"/invalid-route"}
```

---

## Testing with Postman

### Setup:
1. Open **Postman**
2. Create a new **Collection** called "OJT System V2"
3. Add these requests:

### Request 1: Health Check
- **Method:** GET
- **URL:** `https://ojt-system-v2-backend-nodejs.vercel.app/health`
- **Click:** Send

### Request 2: Version
- **Method:** GET
- **URL:** `https://ojt-system-v2-backend-nodejs.vercel.app/api/version`
- **Click:** Send

### Request 3: Ping
- **Method:** GET
- **URL:** `https://ojt-system-v2-backend-nodejs.vercel.app/ping`
- **Click:** Send

### Request 4: Minimal
- **Method:** GET
- **URL:** `https://ojt-system-v2-backend-nodejs.vercel.app/minimal`
- **Click:** Send

---

## Testing with JavaScript/Fetch

### In Browser Console or Node.js:

```javascript
// Health Check
fetch('https://ojt-system-v2-backend-nodejs.vercel.app/health')
  .then(res => res.json())
  .then(data => console.log('Health:', data));

// Version
fetch('https://ojt-system-v2-backend-nodejs.vercel.app/api/version')
  .then(res => res.json())
  .then(data => console.log('Version:', data));

// Ping
fetch('https://ojt-system-v2-backend-nodejs.vercel.app/ping')
  .then(res => res.json())
  .then(data => console.log('Ping:', data));

// Minimal
fetch('https://ojt-system-v2-backend-nodejs.vercel.app/minimal')
  .then(res => res.json())
  .then(data => console.log('Minimal:', data));
```

### Complete Test Script (test-api.js):

```javascript
const BASE_URL = 'https://ojt-system-v2-backend-nodejs.vercel.app';

const endpoints = [
  '/health',
  '/api/version',
  '/ping',
  '/minimal',
  '/test',
  '/invalid'
];

async function testAllEndpoints() {
  console.log('🧪 Testing OJT System V2 API\n');
  
  for (const endpoint of endpoints) {
    try {
      const response = await fetch(BASE_URL + endpoint);
      const data = await response.json();
      
      console.log(`✅ ${endpoint}`);
      console.log(`   Status: ${response.status}`);
      console.log(`   Response:`, data);
      console.log();
    } catch (error) {
      console.log(`❌ ${endpoint}`);
      console.log(`   Error: ${error.message}\n`);
    }
  }
}

testAllEndpoints();
```

**Run with Node.js:**
```bash
node test-api.js
```

---

## Testing with Bash Script

### Create `test-api.sh`:

```bash
#!/bin/bash

BASE_URL="https://ojt-system-v2-backend-nodejs.vercel.app"
ENDPOINTS=("/health" "/api/version" "/ping" "/minimal" "/test")

echo "🧪 Testing OJT System V2 API"
echo "======================================"
echo ""

for endpoint in "${ENDPOINTS[@]}"; do
  echo "Testing: $endpoint"
  echo "---"
  curl -s "$BASE_URL$endpoint" | jq '.' 2>/dev/null || echo "  [Error or no JSON output]"
  echo ""
done

echo "======================================"
echo "✅ Test complete"
```

**Run:**
```bash
chmod +x test-api.sh
./test-api.sh
```

---

## Testing with Advanced curl Options

### With Headers:
```bash
curl -v https://ojt-system-v2-backend-nodejs.vercel.app/health
```

### With Formatted Output (requires jq):
```bash
curl -s https://ojt-system-v2-backend-nodejs.vercel.app/health | jq '.'
```

### With Timing:
```bash
curl -w "\n\nTime taken: %{time_total}s\n" https://ojt-system-v2-backend-nodejs.vercel.app/health
```

### All at Once (All 4 working endpoints):
```bash
for endpoint in "/health" "/api/version" "/ping" "/minimal"; do
  echo "=== Testing $endpoint ==="
  curl -s https://ojt-system-v2-backend-nodejs.vercel.app${endpoint} | jq '.'
  echo ""
done
```

---

## Verification Checklist

- [ ] `/health` returns **200 OK** with `"status":"ok"`
- [ ] `/api/version` returns **200 OK** with version `"2.0.0"`
- [ ] `/ping` returns **200 OK** with `"pong":true`
- [ ] `/minimal` returns **200 OK** with timestamp
- [ ] Response times < 2 seconds (after initial cold start)
- [ ] All responses are **JSON** with `Content-Type: application/json`
- [ ] `environment` field shows `"vercel"`

---

## Current API Status

### ✅ Working Endpoints (Simplified Handler)
- `GET /health` - Health check
- `GET /api/version` - Version info
- `GET /ping` - Ping test
- `GET /minimal` - Minimal connectivity test

### ⚠️ Limited Endpoints (Requires Full DB Setup)
- `POST /api/auth/register` - Requires DATABASE_URL
- `POST /api/auth/login` - Requires DATABASE_URL
- `GET /api/auth/google/redirect` - Requires GOOGLE_CLIENT_ID/SECRET
- All other routes - Return 404 (Not Found)

### 📝 Note
The current deployment uses a **simplified handler** for Vercel compatibility. For full application functionality with:
- User authentication
- Database persistence
- Google OAuth
- Job matching algorithms
- All business logic

You'll need to:
1. Set `DATABASE_URL` environment variable (PostgreSQL or MongoDB)
2. Set Google OAuth credentials (`GOOGLE_CLIENT_ID`, `GOOGLE_CLIENT_SECRET`)
3. Replace `/api/index.js` with full app initialization

See `VERCEL-DEEP-ANALYSIS-AND-FIXES.md` for production setup instructions.

---

## Environment Info

### Check Environment:
```bash
# See if you're on Vercel
curl -s https://ojt-system-v2-backend-nodejs.vercel.app/health | jq '.environment'
# Output: "vercel"
```

### Monitor Live Response Times:
```bash
# Repeat test 5 times, measure timing
for i in {1..5}; do
  echo "Request #$i:"
  curl -w "  Response time: %{time_total}s\n" -s https://ojt-system-v2-backend-nodejs.vercel.app/health > /dev/null
done
```

---

## Troubleshooting

| Issue | Solution |
|-------|----------|
| `curl: (7) Failed to connect` | Check internet connection |
| `Connection timeout` | Try again (cold start may take 5-10s) |
| `404 Not Found` | Endpoint doesn't exist (use ones listed above) |
| `500 Internal Server Error` | API error - check Vercel logs |
| Slow responses (>10s) | Cold start - responses are faster after first request |

---

## Useful Commands for Quick Testing

### All endpoints at once (PowerShell):
```powershell
@("/health", "/api/version", "/ping", "/minimal") | ForEach-Object {
  Write-Host "Testing $_"
  (Invoke-WebRequest -Uri "https://ojt-system-v2-backend-nodejs.vercel.app$_").Content | ConvertFrom-Json | Format-List
}
```

### All endpoints at once (Linux/Mac):
```bash
for endpoint in /health /api/version /ping /minimal; do
  echo "=== $endpoint ==="
  curl -s https://ojt-system-v2-backend-nodejs.vercel.app${endpoint} | jq '.'
done
```

---

## Next Steps

1. **Test the endpoints** using any method above
2. **Verify all return 200 OK** status codes
3. **Check response times** (should be fast after initial cold start)
4. **Set up environment variables** for full functionality
5. **Enable database persistence** for production use

---

**API Base URL:** https://ojt-system-v2-backend-nodejs.vercel.app

Happy testing! 🚀
