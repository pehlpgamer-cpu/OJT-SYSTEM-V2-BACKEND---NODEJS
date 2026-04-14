# Vercel Deployment - Quick Start Guide

## Complete Steps for Deploying to Vercel

### ✅ Files Already Created
- ✅ `vercel.json` - Vercel configuration
- ✅ `api/index.js` - Serverless handler
- ✅ `.vercelignore` - Files to exclude

**Next Steps:**

---

## Step 1: Prepare Database (Choose One)

### Option A: Use Vercel Postgres (Recommended - Fastest)

```bash
# 1. Go to https://vercel.com/docs/storage/vercel-postgres
# 2. Create free PostgreSQL database
# 3. Copy connection string from Vercel dashboard
```

### Option B: Use MongoDB Atlas (Alternative)

```bash
# 1. Go to https://www.mongodb.com/cloud/atlas
# 2. Create free cluster
# 3. Get connection string
```

### Option C: Use External PostgreSQL (Neon, Railway, etc.)

```bash
# Create account on any PostgreSQL hosting service
# Get connection string
```

---

## Step 2: Update Database Configuration

Update `src/config/database.js`:

```javascript
import { Sequelize } from 'sequelize';

const sequelize = new Sequelize(
  process.env.DATABASE_URL || 'postgres://localhost/ojt_db',
  {
    dialect: 'postgres',  // Change from sqlite to postgres
    logging: false,
    pool: {
      max: 5,
      min: 0,
      idle: 10000,
    },
    dialectOptions: {
      connectTimeout: 30000,
    },
  }
);

export default sequelize;
```

---

## Step 3: Add PostgreSQL Dependencies

```bash
npm install pg pg-hstore
```

Update `package.json` - remove sqlite3:

```json
{
  "dependencies": {
    "pg": "^8.11.0",
    "pg-hstore": "^2.3.4"
    // Remove "sqlite3": "^5.1.0"
  }
}
```

---

## Step 4: Commit Changes to Git

```bash
git add .
git commit -m "Add Vercel deployment configuration and PostgreSQL support"
git push origin main
```

---

## Step 5: Deploy to Vercel

### Option A: Via Vercel Dashboard (Easiest)

1. Go to https://vercel.com/dashboard
2. Click "Add New..." → "Project"
3. Select "Import Git Repository"
4. Choose your GitHub repository
5. Click "Import"
6. Vercel auto-detects Node.js project
7. Click "Deploy"

### Option B: Via Vercel CLI

```bash
# Install Vercel CLI (one time)
npm install -g vercel

# Login to Vercel
vercel login

# Deploy
vercel --prod
```

---

## Step 6: Set Environment Variables

### In Vercel Dashboard

1. Go to your project settings
2. Click "Environment Variables"
3. Add these variables for **Production**:

```env
DATABASE_URL=postgresql://user:password@host:5432/ojt_db
NODE_ENV=production
JWT_SECRET=your-super-long-random-secret-key-here
GOOGLE_CLIENT_ID=your-google-client-id
GOOGLE_CLIENT_SECRET=your-google-client-secret
GOOGLE_PROD_CALLBACK_URL=https://your-project.vercel.app/api/auth/google/callback
CORS_ORIGIN=https://your-project.vercel.app
SESSION_SECRET=your-session-secret-key-here
```

**Important:**
- Each variable needs to be added individually
- Make sure to select "Production" environment
- Click "Add" for each variable

---

## Step 7: Redeploy with Environment Variables

After setting environment variables, redeploy:

```bash
vercel --prod
```

Or click "Redeploy" in the Vercel dashboard.

---

## Step 8: Verify Deployment

Test these endpoints:

```bash
# Health check
curl https://your-project.vercel.app/health

# API version
curl https://your-project.vercel.app/api/version

# Google OAuth redirect (test)
curl https://your-project.vercel.app/api/auth/google/redirect?role=student
```

---

## Step 9: View Logs

```bash
# Real-time logs
vercel logs --follow

# Or in dashboard: Deployments → View Logs
```

---

## Step 10: Setup Custom Domain

1. Go to Vercel dashboard
2. Click "Settings" → "Domains"
3. Add your custom domain (e.g., api.yourdomain.com)
4. Update DNS records (Vercel provides instructions)

---

## Database Migration

After first deployment, you need to set up the database:

### Option A: Remote Connection

```bash
# Connect to Vercel Postgres
psql postgresql://user:password@host:5432/ojt_db

# Run migrations directly:
\i database/migrations/20260415001-create-password-reset-tokens.js
\i database/migrations/20260415002-add-account-lockout-columns.js
\i database/migrations/20260415003-add-database-indexes.js
\i database/migrations/20260410001-add-google-oauth-columns.js
```

### Option B: Automatic Sync

Sequelize can auto-sync on first deployment:

```javascript
// In src/config/database.js or server.js
await sequelize.sync({ force: false, alter: true });
```

---

## Troubleshooting

### 404 on Endpoints

**Problem:** Getting 404 on `/api/*` routes  
**Solution:** Check vercel.json routes configuration

```json
{
  "routes": [
    { "src": "/(.*)", "dest": "api/index.js" }
  ]
}
```

### Database Connection Failed

**Problem:** `Error: connect ECONNREFUSED`  
**Solution:**
1. Verify DATABASE_URL in environment variables
2. Check database is accessible from Vercel (whitelisted IPs)
3. Increase timeout in database.js:
   ```javascript
   connectTimeout: 60000
   ```

### Google OAuth Errors

**Problem:** 401 on Google callback  
**Solution:** Update callback URL:
```env
GOOGLE_PROD_CALLBACK_URL=https://your-project.vercel.app/api/auth/google/callback
```

### Cold Start Too Slow

**Problem:** First request takes too long  
**Solution:** 
- Increase memory in vercel.json:
  ```json
  "functions": {
    "api/index.js": {
      "memory": 1024,
      "maxDuration": 60
    }
  }
  ```

### CORS Errors

**Problem:** Frontend can't access API  
**Solution:** Add frontend URL to CORS:
```env
CORS_ORIGIN=https://your-frontend.vercel.app,https://yourdomain.com
```

---

## Common Issues & Solutions

| Issue | Solution |
|-------|----------|
| Build fails | Check `npm install` works locally |
| Env vars undefined | Redeploy after setting vars |
| Database timeout | Increase timeout / check IP whitelist |
| SQLite not working | Switch to PostgreSQL |
| 500 errors | Check `vercel logs` for details |
| Module not found | Check all imports are correct |

---

## Performance Tips

✅ **Database Connection Pooling**
```javascript
pool: { max: 5, min: 0, idle: 10000 }
```

✅ **Enable Caching Headers**
```javascript
app.set('Cache-Control', 'max-age=3600');
```

✅ **Use Environment-Specific Config**
```javascript
if (process.env.NODE_ENV === 'production') {
  // production settings
}
```

✅ **Monitor Function Duration**
- Vercel dashboard → Analytics → Function Duration

---

## Security Checklist

- ✅ All secrets in environment variables (not in code)
- ✅ HTTPS enabled by default on Vercel
- ✅ Strong JWT_SECRET and SESSION_SECRET
- ✅ Database IP whitelisting configured
- ✅ CORS_ORIGIN set to allowed domains only
- ✅ Sensitive logs not exposed

---

## Commands Reference

```bash
# Deploy to production
vercel --prod

# Deploy preview
vercel

# View logs
vercel logs --follow

# List deployments
vercel list

# Rollback to previous
vercel rollback

# View environment
vercel env pull

# Remove project
vercel remove
```

---

## Useful Links

- **Vercel Dashboard:** https://vercel.com/dashboard
- **Vercel Docs:** https://vercel.com/docs
- **Vercel Postgres:** https://vercel.com/docs/storage/vercel-postgres
- **Node.js on Vercel:** https://vercel.com/guides/nodejs/express
- **Environment Variables:** https://vercel.com/docs/concepts/projects/environment-variables
- **Custom Domains:** https://vercel.com/docs/concepts/deployments/custom-domains

---

## Support Resources

- **Vercel Community:** https://github.com/vercel/vercel/discussions
- **Common Issues:** https://vercel.com/docs/frequently-asked-questions
- **Status Page:** https://www.vercelstatus.com/

---

## What's Included in Vercel Deployment

✅ **Automatic SSL/HTTPS**  
✅ **Global CDN**  
✅ **Automatic Deployments** (on git push)  
✅ **Preview Deployments** (for pull requests)  
✅ **Environment Variables**  
✅ **Logging & Analytics**  
✅ **Monitoring**  
✅ **Serverless Functions**  

---

**Your deployment is ready! 🚀**

Follow the steps above to get your OJT System V2 Backend API running on Vercel.

For detailed troubleshooting, see `VERCEL-DEPLOYMENT-GUIDE.md`
