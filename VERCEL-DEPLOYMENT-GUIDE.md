# Deploying OJT System V2 Backend to Vercel

## Overview

Vercel supports Node.js APIs through serverless functions. Your Express app can be deployed as a serverless function that handles HTTP requests.

**Key Considerations:**
- ⚠️ SQLite won't work on Vercel (ephemeral filesystem)
- ✅ Need PostgreSQL, MongoDB, or other cloud database
- ✅ ES6 modules supported
- ✅ Environment variables can be configured easily

---

## Step 1: Prepare Project Structure

### Create Vercel Configuration File

Create `vercel.json` in your project root:

```json
{
  "version": 2,
  "builds": [
    {
      "src": "api/index.js",
      "use": "@vercel/node"
    }
  ],
  "routes": [
    {
      "src": "/(.*)",
      "dest": "api/index.js"
    }
  ],
  "env": {
    "NODE_ENV": "production"
  }
}
```

### Create Serverless Entry Point

Create `api/index.js`:

```javascript
/**
 * Vercel Serverless Function Handler
 * 
 * This is the entry point for Vercel's serverless execution.
 * It exports the Express app as a handler.
 */

import handler from '../src/server.js';

export default handler;
```

### Update server.js Export

Modify `src/server.js` to export the app:

At the end of `src/server.js`, replace the current server startup with:

```javascript
// Export app for Vercel serverless
export default app;

// Local development server startup
if (process.env.VERCEL !== '1') {
  const PORT = process.env.PORT || 5000;
  app.listen(PORT, () => {
    console.log(`🚀 Server running on port ${PORT}`);
  });
}
```

---

## Step 2: Switch to Cloud Database

### Option A: PostgreSQL (Recommended)

**Fastest Setup: Vercel Postgres**

1. Create free PostgreSQL on Vercel:
   - Go to https://vercel.com/docs/storage/vercel-postgres
   - Click "Create Database"
   - Get connection string

2. Update `src/config/database.js`:

```javascript
import { Sequelize } from 'sequelize';

const sequelize = new Sequelize(
  process.env.DATABASE_URL || 'postgres://user:password@localhost:5432/ojt_db',
  {
    dialect: 'postgres',
    logging: false,
    pool: {
      max: 5,
      min: 0,
      idle: 10000,
    },
    // Timeout for serverless
    dialectOptions: {
      connectTimeout: 30000,
    },
  }
);

export default sequelize;
```

3. Update `package.json` dependencies:

```json
{
  "dependencies": {
    "pg": "^8.11.0",
    "pg-hstore": "^2.3.4"
  }
}
```

Remove: `"sqlite3": "^5.1.0"` from dependencies

### Option B: MongoDB (Easier Setup)

Use free MongoDB Atlas: https://www.mongodb.com/cloud/atlas

1. Create free cluster on MongoDB Atlas
2. Get connection string
3. Consider using `mongoose` instead of Sequelize (or use Sequelize with MongoDB adapter)

---

## Step 3: Environment Variables Setup

### In Vercel Dashboard

1. Go to your project settings on Vercel
2. Navigate to "Environment Variables"
3. Add all required variables:

```env
DATABASE_URL=postgresql://user:password@host:5432/ojt_db
NODE_ENV=production
JWT_SECRET=your-super-long-secret-key-here
GOOGLE_CLIENT_ID=your-google-client-id
GOOGLE_CLIENT_SECRET=your-google-client-secret
GOOGLE_PROD_CALLBACK_URL=https://yourdomain.vercel.app/api/auth/google/callback
CORS_ORIGIN=https://yourdomain.vercel.app
SESSION_SECRET=your-session-secret-key
```

### Or Create `.env.production` File

```env
DATABASE_URL=postgresql://...
NODE_ENV=production
JWT_SECRET=...
```

---

## Step 4: Update Package.json Scripts

```json
{
  "scripts": {
    "start": "node src/server.js",
    "dev": "nodemon src/server.js",
    "build": "echo 'Build successful'",
    "test": "set NODE_ENV=test && node --experimental-vm-modules node_modules/jest/bin/jest.js --coverage --detectOpenHandles",
    "test:unit": "set NODE_ENV=test && node --experimental-vm-modules node_modules/jest/bin/jest.js tests/unit --coverage"
  }
}
```

**Important:** Vercel will look for a `build` script. Add one even if it's just `echo`.

---

## Step 5: Add .vercelignore File

Create `.vercelignore` to exclude unnecessary files:

```
.git
.gitignore
.env
.env.local
node_modules
tests/
coverage/
logs/
.cache
.next
.nuxt
dist
build
*.log
*.md
!README.md
!DEPLOYMENT.md
```

---

## Step 6: Modify server.js for Serverless

Update `src/server.js` startup code:

**Before:**
```javascript
const PORT = process.env.PORT || 5000;
sequelize.sync().then(() => {
  app.listen(PORT, () => {
    console.log(`✅ Server listening on port ${PORT}`);
  });
}).catch(err => {
  console.error('Database sync failed:', err);
  process.exit(1);
});
```

**After:**
```javascript
// Only listen locally (not on Vercel serverless)
if (process.env.VERCEL !== '1') {
  const PORT = process.env.PORT || 5000;
  
  sequelize.sync({ alter: false }).then(() => {
    app.listen(PORT, () => {
      console.log(`✅ Server listening on port ${PORT}`);
    });
  }).catch(err => {
    console.error('Database sync failed:', err);
    process.exit(1);
  });
} else {
  // Serverless: sync database once
  sequelize.sync({ alter: false }).catch(err => {
    console.error('Database sync failed:', err);
  });
}

export default app;
```

---

## Step 7: Git Setup & Deployment

### 1. Commit Your Changes

```bash
git add .
git commit -m "Add Vercel deployment configuration"
git push origin main
```

### 2. Connect to Vercel

**Option A: Via Vercel Dashboard (Recommended)**

1. Go to https://vercel.com/dashboard
2. Click "Add New..." → "Project"
3. Import your GitHub repository
4. Select the repository
5. Vercel auto-detects Next.js but you're using Express - continue anyway
6. Click "Deploy"

**Option B: Via Vercel CLI**

```bash
# Install Vercel CLI globally
npm install -g vercel

# Deploy
vercel

# First deployment - answer prompts
# Subsequent deployments: vercel --prod
```

### 3. Configure Build & Development Settings

In Vercel dashboard:
- **Build Command:** `npm run build` (or leave blank)
- **Start Command:** `node src/server.js`
- **Install Command:** `npm install`

---

## Step 8: Set Environment Variables on Vercel

1. Go to your Vercel project dashboard
2. Settings → Environment Variables
3. Add each variable:
   - Select production environment
   - Add DATABASE_URL, JWT_SECRET, etc.
4. Deploy again to apply changes

```bash
vercel --prod
```

---

## Step 9: Database Initialization

### For PostgreSQL

**Option A: Using Vercel Postgres**

1. Vercel provides web interface to run SQL
2. Or use `psql` CLI:

```bash
# Connect to your Postgres database
psql postgresql://user:password@host:5432/ojt_db

# Run migrations
\i database/migrations/...
```

**Option B: Auto-sync with Sequelize**

In `src/server.js`, set `force: true` first time:

```javascript
await sequelize.sync({ force: true }); // Creates tables
```

Then seed data:

```bash
# Before deployment, seed locally then deploy
npm run seed
```

---

## Step 10: Test Your Deployment

### Check Endpoints

```bash
# Health check
curl https://your-project.vercel.app/health

# API version
curl https://your-project.vercel.app/api/version

# Google OAuth redirect
curl https://your-project.vercel.app/api/auth/google/redirect?role=student
```

### View Logs

```bash
# Real-time logs
vercel logs

# Or in dashboard: Settings → Logs
```

### Common Issues

If you see errors:

```bash
# Check build
vercel logs --follow

# Check recent deployments
vercel list

# View environment
vercel env pull  # Downloads env variables
```

---

## Configuration Checklist

- ✅ Created `vercel.json` configuration
- ✅ Created `api/index.js` entry point
- ✅ Updated `src/server.js` to export app
- ✅ Switched from SQLite to PostgreSQL/MongoDB
- ✅ Added `pg` and `pg-hstore` to dependencies
- ✅ Updated database connection (Sequelize config)
- ✅ Added `build` script to package.json
- ✅ Created `.vercelignore` file
- ✅ Set environment variables on Vercel
- ✅ Updated Google OAuth callback URL
- ✅ Committed to version control
- ✅ Connected Vercel to GitHub
- ✅ Verified deployment

---

## Vercel vs Local Development

| Aspect | Local | Vercel |
|--------|-------|--------|
| Database | SQLite | PostgreSQL/MongoDB |
| Server | `npm start` | Serverless function |
| Port | 5000 | Auto (443/HTTPS) |
| Environment | `.env` | Dashboard settings |
| Logs | Console | Vercel dashboard |
| Scaling | Manual | Auto |
| Cost | Free | Free tier available |

---

## After Deployment

### Monitor Performance

1. Vercel dashboard → Analytics
2. Check response times & error rates
3. Monitor database performance

### Setup CI/CD

Vercel automatically deploys on `git push`:
- Push to main → Auto deploy to production
- Push to preview branch → Deploy preview

### Custom Domain

1. Dashboard → Project settings → Domains
2. Add your domain
3. Update DNS records (Vercel provides instructions)

### Database Backups

For PostgreSQL:
```bash
# Backup
pg_dump postgresql://... > backup.sql

# Restore
psql postgresql://... < backup.sql
```

---

## Troubleshooting

### 401 Unauthorized on Google OAuth

**Fix:** Update callback URL in Vercel environment:
```env
GOOGLE_PROD_CALLBACK_URL=https://your-project.vercel.app/api/auth/google/callback
```

### Database Connection Timeout

**Fix:** Increase timeout in `src/config/database.js`:
```javascript
connectTimeout: 30000, // 30 seconds
idleTimeoutMillis: 30000,
connectionTimeoutMillis: 30000,
```

### 413 Payload Too Large

**Fix:** Update body parser limits in `src/server.js`:
```javascript
app.use(express.json({ limit: '50mb' }));
app.use(express.urlencoded({ limit: '50mb', extended: true }));
```

### CORS Errors

**Fix:** Update CORS origin in Vercel environment:
```env
CORS_ORIGIN=https://your-vercel-app.vercel.app,https://yourdomain.com
```

---

## Quick Reference Commands

```bash
# Deploy to Vercel
vercel --prod

# View logs
vercel logs

# Pull environment variables
vercel env pull

# Stop deployment
vercel cancel

# Remove deployment
vercel remove

# Run locally (after setup)
npm run dev
```

---

## Security Best Practices

✅ Use environment variables for secrets (never commit to git)  
✅ Enable HTTPS (Vercel default)  
✅ Use strong JWT secrets  
✅ Regular database backups  
✅ Monitor logs for suspicious activity  
✅ Keep dependencies updated  

---

## Next Steps

1. **Option 1: PostgreSQL (Recommended for Production)**
   - Vercel Postgres: Fast setup, integrated
   - External PostgreSQL: More control, paid options

2. **Option 2: MongoDB**
   - MongoDB Atlas: Free tier available
   - Easier to scale

3. **Option 3: Keep SQLite (Development Only)**
   - Not recommended for production
   - Use for local testing only

**Recommendation:** Use Vercel Postgres for fastest production deployment.

---

## Useful Links

- Vercel Documentation: https://vercel.com/docs
- Vercel Postgres: https://vercel.com/docs/storage/vercel-postgres
- Express on Vercel: https://vercel.com/guides/nodejs/express
- environment Variables: https://vercel.com/docs/concepts/projects/environment-variables
- Custom Domains: https://vercel.com/docs/concepts/deployments/custom-domains

---

**Document Generated:** April 14, 2026  
**Ready for Deployment:** Yes ✅
