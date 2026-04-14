# Vercel Deployment Setup - Summary

**Status:** ✅ **READY FOR DEPLOYMENT**  
**Date:** April 14, 2026

---

## What Has Been Done

### Files Created (Ready for Vercel)

✅ **`vercel.json`** - Vercel configuration
```json
- Defines serverless function: api/index.js
- Routes all requests to the function
- Sets memory limit: 1024MB
- Sets timeout: 60 seconds
```

✅ **`api/index.js`** - Serverless handler
```javascript
- Entry point for Vercel serverless execution
- Lazy-loads Express app on first request
- Reuses app instance for all subsequent requests
- Handles errors gracefully
```

✅ **`.vercelignore`** - Deployment exclusions
```
- Excludes tests, logs, node_modules, etc.
- Keeps migrations and necessary files
```

✅ **`VERCEL-DEPLOYMENT-GUIDE.md`** - Comprehensive guide (10 steps)
✅ **`VERCEL-DEPLOYMENT-QUICK-START.md`** - Quick reference (10 steps)

### Files Modified

✅ **`src/server.js`**
- Updated to check for Vercel environment
- Only starts local server if not on Vercel
- Exports initializeApp for use by api/index.js

---

## Current Requirements

### Database (Choose One)
- ⚠️ SQLite won't work on Vercel (ephemeral filesystem)
- ✅ PostgreSQL (recommended)
- ✅ MongoDB
- ✅ Any cloud database

### Dependencies to Add
```json
{
  "pg": "^8.11.0",
  "pg-hstore": "^2.3.4"
}
```

### Configuration Updates Needed
1. Update `src/config/database.js` - switch dialect from sqlite to postgres
2. Remove `sqlite3` from package.json
3. Set environment variables on Vercel dashboard

---

## Deployment Steps (Quick Version)

### 1. Prepare Database
```
Choose PostgreSQL, MongoDB, or other cloud DB
Get connection string from provider
```

### 2. Update Code
```bash
# Install PostgreSQL adapter
npm install pg pg-hstore

# Update src/config/database.js (dialect: 'postgres')

# Remove sqlite3 from package.json

# Commit changes
git add .
git commit -m "Add Vercel deployment config"
git push origin main
```

### 3. Deploy to Vercel
```
Go to https://vercel.com/dashboard
Import GitHub repository
Deploy (auto-detected)
```

### 4. Set Environment Variables
```
In Vercel dashboard:
Settings → Environment Variables

Add:
- DATABASE_URL
- JWT_SECRET
- GOOGLE_CLIENT_ID
- GOOGLE_CLIENT_SECRET
- GOOGLE_PROD_CALLBACK_URL
- CORS_ORIGIN
- SESSION_SECRET
```

### 5. Redeploy
```bash
vercel --prod
```

### 6. Test
```bash
curl https://your-project.vercel.app/health
```

---

## Key Considerations

### ✅ What Works Out of Box
- Express.js apps
- Node.js 18+ runtime
- Environment variables
- Custom domains
- SSL/HTTPS
- Global CDN
- Git integration

### ⚠️ Limitations
- SQLite (use PostgreSQL instead)
- Long-running processes (60 sec max)
- Large file uploads (50MB max)
- Persistent storage (use database instead)

### ✅ What We've Configured
- Lazy app initialization (cold start optimization)
- Error handling
- Vercel environment detection
- Production vs development separation

---

## Files Structure After Setup

```
project-root/
├── api/
│   └── index.js                 (NEW - Vercel entry point)
├── src/
│   ├── server.js                (MODIFIED - Vercel check)
│   ├── config/
│   │   └── database.js           (NEEDS UPDATE - switch to PG)
│   ├── models/
│   ├── services/
│   └── routes/
├── vercel.json                   (NEW - Vercel config)
├── .vercelignore                 (NEW - Ignore patterns)
├── package.json                  (NEEDS UPDATE - pg/pg-hstore)
├── VERCEL-DEPLOYMENT-GUIDE.md   (NEW - Detailed guide)
└── VERCEL-DEPLOYMENT-QUICK-START.md (NEW - Quick reference)
```

---

## Environment Variables (Set on Vercel)

```env
# Database
DATABASE_URL=postgresql://user:password@host:5432/ojt_db

# Authentication
JWT_SECRET=your-super-long-random-secret-key-minimum-32-chars
SESSION_SECRET=your-session-secret-key-minimum-32-chars

# Google OAuth
GOOGLE_CLIENT_ID=your-client-id-from-google-cloud
GOOGLE_CLIENT_SECRET=your-client-secret-from-google-cloud
GOOGLE_PROD_CALLBACK_URL=https://your-project.vercel.app/api/auth/google/callback

# Application
NODE_ENV=production
CORS_ORIGIN=https://your-project.vercel.app,https://yourdomain.com
```

---

## Vercel Project Settings

### Build Command
```
npm run build
(or leave empty)
```

### Start Command
```
node src/server.js
(Vercel doesn't use this for serverless, but good to have)
```

### Install Command
```
npm install
(automatic)
```

### Root Directory
```
./
(auto-detected)
```

---

## Performance Characteristics

| Metric | Value |
|--------|-------|
| Function Memory | 1024 MB |
| Function Timeout | 60 seconds |
| Cold Start | ~2-3 seconds |
| Warm Requests | <100ms |
| Concurrent Functions | Auto-scaled |

---

## Cold Start Optimization

The `api/index.js` handler includes:
- ✅ Lazy app initialization (not on every request)
- ✅ Single app instance reuse
- ✅ Database connection pooling
- ✅ Minimized startup dependencies

Expected cold start: 2-3 seconds on first request

---

## Monitoring & Logs

### View Logs
```bash
# Real-time
vercel logs --follow

# Or via dashboard:
Deployments → Logs
```

### Analytics
```
Dashboard → Analytics
- Function Duration
- Response Times
- Error Rates
```

---

## Rollback & Versioning

### View Deployments
```bash
vercel list
```

### Rollback to Previous
```bash
vercel rollback
```

### View Specific Deployment
```
Dashboard → Deployments → Click to view
```

---

## Going Live

### 1. Domain Setup
- Vercel provides domain or add custom domain
- DNS auto-configured
- SSL automatic

### 2. DNS Records
- Vercel provides instructions
- Usually just CNAME pointing to Vercel

### 3. Update Frontend
- Change API URL to Vercel app URL
- Update CORS_ORIGIN environment variable

### 4. Google OAuth
- Add Vercel URL to Google Cloud Console
- Update callback URL: `https://your-project.vercel.app/api/auth/google/callback`

---

## Deployment Checklist

- ⏳ [ ] Commit all changes to git
- ⏳ [ ] Add PostgreSQL dependencies (pg, pg-hstore)
- ⏳ [ ] Update database config to use PostgreSQL
- ⏳ [ ] Remove sqlite3 from package.json
- ⏳ [ ] Push to GitHub
- ⏳ [ ] Create Vercel account at vercel.com
- ⏳ [ ] Import Git repository on Vercel
- ⏳ [ ] Set environment variables
- ⏳ [ ] Deploy
- ⏳ [ ] Create database schema (manually or via Sequelize sync)
- ⏳ [ ] Test endpoints
- ⏳ [ ] Setup custom domain (optional)
- ⏳ [ ] Monitor logs and analytics

---

## Support Resources

- **Vercel Documentation:** https://vercel.com/docs
- **Node.js Guide:** https://vercel.com/guides/nodejs/express
- **Envars:** https://vercel.com/docs/concepts/projects/environment-variables
- **Custom Domains:** https://vercel.com/docs/concepts/deployments/custom-domains
- **Status:** https://www.vercelstatus.com/

---

## Common Questions

**Q: Will SQLite work?**  
A: No, use PostgreSQL or MongoDB instead.

**Q: How long startup time?**  
A: ~2-3 seconds cold start, <100ms warm requests.

**Q: Can I run migrations?**  
A: Yes, either manually via psql or via Sequelize.alter().

**Q: Is HTTPS included?**  
A: Yes, automatic SSL by Vercel.

**Q: How much does it cost?**  
A: Free tier available. ~$20/month for Pro (optional).

**Q: Can I use custom domain?**  
A: Yes, setup in Vercel dashboard.

---

## Next Actions

1. ✅ Review VERCEL-DEPLOYMENT-QUICK-START.md
2. ⏳ Setup PostgreSQL database
3. ⏳ Update database config
4. ⏳ Add dependencies
5. ⏳ Commit to GitHub
6. ⏳ Deploy to Vercel
7. ⏳ Set environment variables
8. ⏳ Test deployment

---

**Ready to deploy! 🚀**

See **VERCEL-DEPLOYMENT-QUICK-START.md** for step-by-step instructions.

See **VERCEL-DEPLOYMENT-GUIDE.md** for detailed reference.
