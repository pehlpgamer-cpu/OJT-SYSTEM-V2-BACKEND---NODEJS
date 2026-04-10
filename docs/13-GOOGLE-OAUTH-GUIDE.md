# Google OAuth Setup & Implementation Guide

**Version:** 1.0.0  
**Date:** April 2026  
**Status:** New Feature - Implementation Complete

---

## 📋 Overview

Google OAuth has been integrated into the OJT System, allowing users to:
- ✅ Sign up using their Google account
- ✅ Link existing email account to Google
- ✅ Unlink Google from their account
- ✅ Auto-verify emails via Google
- ✅ All roles supported (Student, Company, Coordinator, Admin)

---

## 🔐 Setup: Getting Google OAuth Credentials

### Step 1: Create Google Cloud Project

1. Go to [Google Cloud Console](https://console.cloud.google.com)
2. Click **Select a Project** → **New Project**
3. Enter project name: `OJT-System-Google-OAuth`
4. Click **Create**

### Step 2: Enable Google+ API

1. Go to **APIs & Services** → **Library**
2. Search for "Google+ API"
3. Click on it → Click **Enable**

### Step 3: Create OAuth 2.0 Credentials

1. Go to **APIs & Services** → **Credentials**
2. Click **Create Credentials** → **OAuth 2.0 Client ID**
3. If prompted: Click **Configure OAuth Consent Screen**
   - User type: **External**
   - Click **Create**
   - Fill in app name: "OJT System V2"
   - Add your email
   - Add scopes: `profile`, `email`
   - Save and continue

4. Back to **Create OAuth 2.0 Client ID**
5. Application type: **Web application**
6. Add **Authorized redirect URIs**:
   ```
   Development:
   http://localhost:5000/api/auth/google/callback
   
   Production:
   https://your-domain.com/api/auth/google/callback
   ```
7. Click **Create**

### Step 4: Save Credentials

You'll see a popup with:
- **Client ID**
- **Client Secret**

Copy these and add to `.env`:

```env
GOOGLE_CLIENT_ID=your-client-id.apps.googleusercontent.com
GOOGLE_CLIENT_SECRET=your-client-secret
```

---

## 📝 API Endpoints

### 1. Start Google OAuth

**Initiate Google login/signup flow**

```http
GET /api/auth/google/redirect?role=student&linking=false
```

**Query Parameters:**
- `role`: `student`, `company`, `coordinator` (optional, default: student)
- `linking`: `true`/`false` - whether this is account linking (optional)

**Frontend Implementation:**

```html
<!-- Sign up with Google button -->
<a href="http://localhost:5000/api/auth/google/redirect?role=student">
  Sign up with Google
</a>

<!-- For existing user linking -->
<a href="http://localhost:5000/api/auth/google/redirect?role=student&linking=true">
  Link Google Account
</a>
```

**What Happens:**
1. User is redirected to Google
2. User selects/logs into Google account
3. Authorizes app to access profile + email
4. Google redirects back to callback URL

---

### 2. Google OAuth Callback (Automatic)

**Google calls this automatically**

```http
GET /api/auth/google/callback?code=AUTH_CODE&state=STATE
```

**No frontend action needed** - handled by backend

**Response Scenarios:**

#### A. New User - Success
```json
{
  "user": {
    "id": 1,
    "name": "John Doe",
    "email": "john@gmail.com",
    "role": "student",
    "status": "active",
    "auth_provider": "google",
    "google_linked": true
  },
  "token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
  "statusCode": 200
}
```

#### B. Existing Email - Linking Request
```json
{
  "requiresLinking": true,
  "message": "Email already registered. Please confirm linking Google account.",
  "existingUserId": 2,
  "googleEmail": "john@gmail.com",
  "statusCode": 200
}
```

#### C. Error
```json
{
  "message": "Google authentication failed",
  "statusCode": 401
}
```

---

### 3. Confirm Account Linking

**When email already exists, user must confirm linking**

```http
POST /api/auth/google/confirm-linking
Content-Type: application/json

{
  "userId": 2,
  "googleId": "118234567890123456789",
  "email": "john@gmail.com"
}
```

**Response (Success):**
```json
{
  "user": {
    "id": 2,
    "name": "John Doe",
    "email": "john@gmail.com",
    "role": "student",
    "auth_provider": "email",
    "google_linked": true
  },
  "token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
  "message": "Google account linked successfully",
  "statusCode": 200
}
```

---

### 4. Link Google Account (Authenticated)

**For logged-in users to add Google to existing account**

```http
POST /api/auth/google/link
Authorization: Bearer <your-jwt-token>
Content-Type: application/json

{
  "googleId": "118234567890123456789",
  "email": "john@gmail.com"
}
```

**Response:**
```json
{
  "user": { ... },
  "token": "new-jwt-token",
  "message": "Google account linked successfully",
  "statusCode": 200
}
```

**Requirements:**
- User must already have a password (for security)
- User must be authenticated (Bearer token)

---

### 5. Unlink Google Account

**Remove Google OAuth from account**

```http
DELETE /api/auth/google/unlink
Authorization: Bearer <your-jwt-token>
```

**Response:**
```json
{
  "user": {
    "id": 1,
    "name": "John Doe",
    "email": "john@gmail.com",
    "google_linked": false
  },
  "message": "Google account unlinked successfully",
  "statusCode": 200
}
```

**Requirements:**
- User must have a password set (can't unlink if no other auth method)
- User must be authenticated

---

### 6. Check Google Auth Status

**Check if user has Google linked**

```http
GET /api/auth/google/status
Authorization: Bearer <your-jwt-token>
```

**Response:**
```json
{
  "google_linked": true,
  "auth_provider": "google",
  "statusCode": 200
}
```

---

## 🔄 User Workflows

### Flow 1: Sign Up with Google (New User)

```
┌─────────────────────────────────────────┐
│ User clicks "Sign up with Google"       │
└──────────────┬──────────────────────────┘
               │
               ▼
┌─────────────────────────────────────────┐
│ GET /api/auth/google/redirect?role=student
└──────────────┬──────────────────────────┘
               │ Redirects to Google login
               ▼
┌─────────────────────────────────────────┐
│ User allows app access                  │
└──────────────┬──────────────────────────┘
               │
               ▼
┌─────────────────────────────────────────┐
│ GET /api/auth/google/callback           │
│ (Automatic - no user action)            │
└──────────────┬──────────────────────────┘
               │
               ▼
┌─────────────────────────────────────────┐
│ ✅ New account created                  │
│ ✅ Email auto-verified                  │
│ ✅ User data stored                     │
│ ✅ JWT token returned                   │
└─────────────────────────────────────────┘
```

### Flow 2: Link Existing Account to Google

```
┌──────────────────────────────────────────┐
│ User: "I have email account, add Google" │
└───────────────────┬──────────────────────┘
                    │
                    ▼
┌──────────────────────────────────────────┐
│ GET /api/auth/google/redirect?linking=true
└───────────────────┬──────────────────────┘
                    │
                    ▼
┌──────────────────────────────────────────┐
│ (Google OAuth flow)                      │
└───────────────────┬──────────────────────┘
                    │
                    ▼
┌──────────────────────────────────────────┐
│ Email matches existing account           │
│ System returns linking confirmation UI   │
└───────────────────┬──────────────────────┘
                    │
                    ▼
┌──────────────────────────────────────────┐
│ User clicks "Confirm Linking"            │
│ POST /api/auth/google/confirm-linking    │
└───────────────────┬──────────────────────┘
                    │
                    ▼
┌──────────────────────────────────────────┐
│ ✅ Google ID linked to account           │
│ ✅ Can now login with either method      │
│ ✅ JWT token returned                    │
└──────────────────────────────────────────┘
```

### Flow 3: Logout with User Choice

```
┌──────────────────────────────────────┐
│ User clicks Logout                   │
└──────────────┬───────────────────────┘
               │
               ▼
┌──────────────────────────────────────┐
│ User preferences:                    │
│ ☐ Also logout from Google            │
│ ☑ Only logout from app               │
└──────────────┬───────────────────────┘
               │
               ▼
┌──────────────────────────────────────┐
│ ✅ JWT token invalidated             │
│ ✅ Google session kept (if selected) │
└──────────────────────────────────────┘
```

---

## 🔒 Security Features Implemented

### ✅ Email Verification
- Google emails auto-verified (trusted provider)
- Prevents unverified email registrations

### ✅ Account Linking Protection
- Requires email match confirmation
- Prevents unauthorized account takeovers
- User must have password to unlink

### ✅ OAuth Security
- Passport.js for secure OAuth flow
- State parameter prevents CSRF attacks
- Credentials never exposed in URLs
- HTTPS enforced in production

### ✅ Audit Logging
- All Google auth attempts logged
- Failed attempts tracked
- Account linking events logged

### ✅ Session Security
- Session cookie httpOnly (can't be accessed by JavaScript)
- Secure flag in production (HTTPS only)
- 24-hour session expiration

---

## 🧪 Testing

### Unit Tests

```bash
npm run test -- googleAuth.test.js
```

### Manual Testing with cURL

#### 1. Create Session
```bash
curl -c cookies.txt http://localhost:5000/api/auth/google/redirect?role=student
```

#### 2. Simulate Google Callback (requires auth code from Google)
```bash
# Note: In development, manually test via browser UI
curl -i http://localhost:5000/api/auth/google/callback?code=GOOGLE_AUTH_CODE
```

#### 3. Test Linking (with token)
```bash
TOKEN="your-jwt-token"

curl -X POST http://localhost:5000/api/auth/google/link \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "googleId": "118234567890123456789",
    "email": "user@gmail.com"
  }'
```

#### 4. Check Status
```bash
curl -H "Authorization: Bearer $TOKEN" \
  http://localhost:5000/api/auth/google/status
```

---

## 📊 Database Changes

### New User Model Fields

| Column | Type | Purpose |
|--------|------|---------|
| `google_id` | STRING(255) | Google's unique ID |
| `auth_provider` | ENUM | `email` or `google` |
| `google_linked_at` | DATETIME | When Google was linked |
| `password` | STRING(255) | Now nullable for OAuth users |

### Migration

Migration file: `database/migrations/20260410001-add-google-oauth-columns.js`

Run migration:

```bash
npm run migrate
```

---

## 🐛 Troubleshooting

### "Invalid OAuth Client"

**Cause:** Redirect URI doesn't match credentials

**Fix:**
1. Go to Google Cloud Console
2. Check OAuth 2.0 credentials
3. Verify **Authorized redirect URIs** matches exactly:
   - `http://localhost:5000/api/auth/google/callback` (dev)
   - `https://your-domain.com/api/auth/google/callback` (prod)

### "Email already registered"

**Expected behavior** - Email exists under different auth method

**Solutions:**
1. User logs in with original method (email/password)
2. Links Google account manually
3. Then can use either login method

### "Cannot unlink - no other authentication method"

**Cause:** User doesn't have password set

**Fix:**
1. User sets password first (via password reset or profile)
2. Then can unlink Google

### "Session could not be verified"

**Cause:** Session expired or cookies cleared

**Fix:**
1. Clear browser cookies
2. Start new Google OAuth flow
3. Session automatically recreated

---

## 📝 Code Examples

### Frontend - React Component Example

```javascript
import { useState } from 'react';

function GoogleAuth() {
  const [role, setRole] = useState('student');

  const handleGoogleSignup = () => {
    // Redirect to backend OAuth flow
    window.location.href = 
      `http://localhost:5000/api/auth/google/redirect?role=${role}`;
  };

  const handleGoogleLink = async () => {
    const token = localStorage.getItem('auth_token');
    
    // Call confirm-linking endpoint
    // First, initiate OAuth flow
    const popup = window.open(
      `http://localhost:5000/api/auth/google/redirect?linking=true`,
      'GoogleAuth',
      'width=500,height=600'
    );

    // Listen for callback
    window.addEventListener('message', (event) => {
      if (event.data.requiresLinking) {
        // Show confirmation UI
        // Call confirm-linking endpoint
      }
    });
  };

  return (
    <div>
      <select value={role} onChange={(e) => setRole(e.target.value)}>
        <option value="student">Student</option>
        <option value="company">Company</option>
        <option value="coordinator">Coordinator</option>
      </select>
      
      <button onClick={handleGoogleSignup}>
        Sign up with Google
      </button>
      
      <button onClick={handleGoogleLink}>
        Link Google Account
      </button>
    </div>
  );
}

export default GoogleAuth;
```

---

## 📚 Additional Resources

- [Google OAuth 2.0 Documentation](https://developers.google.com/identity/protocols/oauth2)
- [Passport.js Google Strategy](http://www.passportjs.org/packages/passport-google-oauth20/)
- [OWASP OAuth Security](https://cheatsheetseries.owasp.org/cheatsheets/OAuth_2_Cheat_Sheet.html)

---

**Next Steps:**
1. Test the implementation thoroughly
2. Deploy to staging environment
3. Monitor Google OAuth usage in production
4. Gather user feedback on auth experience

