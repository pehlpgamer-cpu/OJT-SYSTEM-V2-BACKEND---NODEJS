# Render Deployment Pre-Flight Checklist

Use this checklist to ensure everything is ready before deploying to Render.

## 📋 Repository Preparation

- [ ] **Code Committed**
  - [ ] `git add .` 
  - [ ] `git commit -m "Prepare for Render deployment"`
  - [ ] `.gitignore` includes: `node_modules/`, `.env`, `database/*.db`, `logs/`

- [ ] **GitHub Remote**
  - [ ] GitHub account created
  - [ ] Repository pushed to GitHub
  - [ ] Repository is public (or Render has access to private)
  - [ ] Main branch is default branch

- [ ] **Package.json**
  - [ ] `start` script exists: `node src/server.js`
  - [ ] All dependencies listed
  - [ ] `pg` and `pg-hstore` added for PostgreSQL support
  - [ ] `npm install` runs without errors locally

## 🗄️ Database Preparation

- [ ] **PostgreSQL Setup**
  - [ ] Render account created (https://render.com)
  - [ ] PostgreSQL database created on Render
  - [ ] Database URL copied and saved securely
  - [ ] Format: `postgres://user:password@host:port/database`

## 🔐 Environment Variables Prepared

### Security Credentials (Generate/Obtain These)

- [ ] **JWT_SECRET**
  - [ ] Generated strong random string (32+ characters)
  - [ ] Not committed to GitHub
  - [ ] Store in `.env.render.template` for reference

- [ ] **GOOGLE_CLIENT_ID & SECRET**
  - [ ] Google Cloud OAuth credentials created
  - [ ] Redirect URI added to Google Console: `https://YOUR-SERVICE.onrender.com/api/auth/google/callback`
  - [ ] Note: Use temp URL like `https://ojt-system-v2-api.onrender.com` for now

- [ ] **DATABASE_URL**
  - [ ] PostgreSQL connection string from Render
  - [ ] Tested connection works locally (optional)

### Configuration Values

- [ ] **APP_URL**
  - [ ] Decided on service name (e.g., `ojt-system-v2-api`)
  - [ ] Full URL: `https://ojt-system-v2-api.onrender.com`

- [ ] **CORS_ORIGIN**
  - [ ] List of frontend domains identified
  - [ ] Include localhost:3000 for development
  - [ ] Example: `https://domain.com,http://localhost:3000`

- [ ] **LOG_LEVEL**
  - [ ] Set to `info` for production
  - [ ] Set to `debug` for troubleshooting (not recommended)

## 📦 Code Updates Required

- [ ] **src/config/database.js Updated**
  - [ ] Supports PostgreSQL with SSL
  - [ ] Fallback to SQLite for local dev
  - [ ] Conditions: `if (DATABASE_URL && production) → use PostgreSQL`

- [ ] **src/config/env.js Updated**
  - [ ] Exports `database.url` property
  - [ ] Supports `DB_CONNECTION` variable
  - [ ] `PORT` falls back to `process.env.PORT`

- [ ] **package.json Dependencies**
  - [ ] `pg` added: `npm install pg`
  - [ ] `pg-hstore` added: `npm install pg-hstore`
  - [ ] Both saved to `package.json`

- [ ] **render.yaml Created**
  - [ ] Located at project root
  - [ ] Contains correct build/start commands
  - [ ] `buildCommand: npm install`
  - [ ] `startCommand: node src/server.js`

## 🔍 Local Testing

- [ ] **Dependencies Install**
  - [ ] Run `npm install` without errors
  - [ ] `node_modules` created successfully

- [ ] **Start Script Works**
  - [ ] Run `npm start` locally
  - [ ] No errors in console
  - [ ] Can reach `http://localhost:5000/health`

- [ ] **Database Migrations Run**
  - [ ] Database tables created
  - [ ] No SQL errors in logs
  - [ ] Can check tables in database

- [ ] **Health Endpoint Works**
  ```bash
  curl http://localhost:5000/health
  # Should return: {"status": "ok", ...}
  ```

- [ ] **Version Endpoint Works**
  ```bash
  curl http://localhost:5000/api/version
  # Should return: {"version": "2.0.0", ...}
  ```

## 🚀 Render Dashboard Setup

- [ ] **Render Account**
  - [ ] Account created at https://render.com
  - [ ] Email verified
  - [ ] Payment method added (if not using free tier)

- [ ] **GitHub Connected**
  - [ ] Render authorized to access GitHub
  - [ ] Repository selected and visible

- [ ] **PostgreSQL Created**
  - [ ] Service running (status: "Available")
  - [ ] Connection credentials visible

## 🎯 Deployment Checklist

### Before Clicking "Deploy"

- [ ] **Render Web Service Config**
  - [ ] Service name: `ojt-system-v2-api` (or your choice)
  - [ ] Environment: `node`
  - [ ] Region: Closest to your location
  - [ ] Plan: Starter (or Standard for production)
  - [ ] Build command: `npm install`
  - [ ] Start command: `node src/server.js`

- [ ] **Environment Variables Added to Render**
  - [ ] APP_NAME
  - [ ] APP_ENV=production
  - [ ] APP_DEBUG=false
  - [ ] APP_PORT=10000
  - [ ] PORT=10000
  - [ ] NODE_ENV=production
  - [ ] APP_URL=https://your-service.onrender.com
  - [ ] DB_CONNECTION=postgres
  - [ ] DATABASE_URL=postgres://...
  - [ ] JWT_SECRET=your-strong-secret
  - [ ] GOOGLE_CLIENT_ID
  - [ ] GOOGLE_CLIENT_SECRET
  - [ ] GOOGLE_PROD_CALLBACK_URL
  - [ ] CORS_ORIGIN

### Deploy Step

- [ ] Click **"Deploy"** button
- [ ] Monitor build logs in real-time
- [ ] Wait for "Live" status (green)

## ✅ Post-Deployment Verification

### Immediate Checks (First 5 mins)

- [ ] **Service Status**
  - [ ] Shows "Live" (green)
  - [ ] Service URL visible
  - [ ] Build completed successfully

- [ ] **Health Check**
  ```bash
  curl https://your-service-name.onrender.com/health
  # Should respond with status: ok
  ```

- [ ] **Version Check**
  ```bash
  curl https://your-service-name.onrender.com/api/version
  # Should respond with version 2.0.0
  ```

- [ ] **Check Logs**
  - [ ] No errors in logs
  - [ ] See "Database connected" messages
  - [ ] No "Cannot find module" errors

### Database Checks (5-10 mins)

- [ ] **Database Connected**
  - [ ] Logs show successful PostgreSQL connection
  - [ ] Tables created automatically
  - [ ] No connection errors

- [ ] **Database Accessible**
  - [ ] Can read/write data
  - [ ] No permission errors in logs

### API Tests (10-15 mins)

- [ ] **Authentication Endpoints**
  ```bash
  # Test registration
  curl -X POST https://your-service.onrender.com/api/auth/register \
    -H "Content-Type: application/json" \
    -d '{"email":"test@ex.com","password":"Test123!","name":"Test","role":"student"}'
  ```

- [ ] **Protected Endpoints**
  - [ ] Get JWT token from login
  - [ ] Use token to access protected routes
  - [ ] Token validation works

- [ ] **Google OAuth** (Optional, test setup)
  - [ ] `/api/auth/google/redirect` returns Google auth URL
  - [ ] Trace through OAuth flow
  - [ ] Check logs for OAuth attempts

### Frontend Integration (15-30 mins)

- [ ] **Update Frontend .env**
  ```
  REACT_APP_API_URL=https://your-service-name.onrender.com
  ```

- [ ] **CORS Settings**
  - [ ] Frontend can make API calls
  - [ ] No CORS errors in browser console
  - [ ] Check Render logs for CORS validation

- [ ] **End-to-End Test**
  - [ ] Can register from frontend
  - [ ] Can login from frontend
  - [ ] Can access protected pages

## 🆘 If Deployment Fails

- [ ] **Check Build Logs**
  - [ ] Deploy → Build & Deployment Logs
  - [ ] Look for error messages
  - [ ] Common: "Cannot find module X"

- [ ] **Check Runtime Logs**
  - [ ] Service → Logs
  - [ ] Look for runtime errors
  - [ ] Check database connection errors

- [ ] **Verify Environment Variables**
  - [ ] All required vars added
  - [ ] No typos in keys
  - [ ] Secrets are correct

- [ ] **Test Locally Again**
  - [ ] `npm install`
  - [ ] `npm start`
  - [ ] Verify locally before retry

## 📱 Connect Frontend

- [ ] **Update Frontend Repository**
  - [ ] Set API URL in `.env`
  - [ ] Push to GitHub
  - [ ] Deploy to Vercel/Netlify/Render

- [ ] **Test End-to-End**
  - [ ] Can login
  - [ ] Can access protected pages
  - [ ] Data persists across sessions

## 🎉 Deployment Complete!

- [ ] Celebrate! 🎊
- [ ] Monitor service over next few hours
- [ ] Check logs periodically for errors
- [ ] Set up alerts for downtime (Render dashboard)

---

## 💡 Quick Reference Commands

```bash
# Generate JWT_SECRET
node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"

# Test health endpoint
curl https://your-service-name.onrender.com/health

# Check PostgreSQL connection
psql "postgres://user:pass@host:port/database"

# View Render logs locally (if using Render CLI)
render logs --service-id=your-service-id
```

---

## 📞 Support Resources

- **Render Docs:** https://render.com/docs
- **Node.js Deployment:** https://render.com/docs/deploy-node-express-app
- **PostgreSQL on Render:** https://render.com/docs/databases
- **Troubleshooting:** https://render.com/docs/troubleshooting

---

**Last Updated:** April 14, 2026  
**Status:** Ready for Deployment ✅
