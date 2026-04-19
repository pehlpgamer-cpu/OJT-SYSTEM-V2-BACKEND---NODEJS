# Neon.tech PostgreSQL Deployment Guide

Complete guide for deploying your OJT System API with PostgreSQL on Neon.tech and Vercel.

---

## 📋 Prerequisites

- [Neon.tech](https://neon.tech) account (free tier available)
- [Vercel](https://vercel.com) account connected to your GitHub repo
- Node.js 18+ installed locally
- Your code pushed to GitHub

---

## 🚀 Step 1: Create Neon PostgreSQL Database

### 1.1 Create a Free Neon Account
1. Go to https://neon.tech and click "Sign Up"
2. Create account using GitHub OAuth (easier)
3. Verify email

### 1.2 Create a New Project
1. In Neon dashboard, click "New Project"
2. Name it: `ojt-system-v2` 
3. Select region closest to your users (e.g., US East)
4. Select PostgreSQL version 15+ 
5. Click "Create Project"

### 1.3 Get Connection String
1. In project dashboard, click "Pooler" tab (important!)
   - This uses connection pooling, required for serverless
   - **Do NOT use the "Direct" connection - it won't work on Vercel**
2. Select "Connection string" or "Prisma URL"
3. Copy the full string (starts with `postgresql://`)
4. Example format:
   ```
   postgresql://neon_user:password@ep-quiet-cloud-xxxxx.neon.tech/neondb?sslmode=require
   ```

### 1.4 Create Initial Database Schema (Local)

Run migrations locally first to populate your database:

```bash
# Install dependencies
npm install

# Create initial schema from Sequelize models
npm run test
```

This creates tables from your models in Neon database (via DATABASE_URL).

---

## 🔧 Step 2: Configure Your Application

### 2.1 Update Environment Configuration

Your code already supports PostgreSQL. Ensure [src/config/env.js](src/config/env.js) includes:

```javascript
database: {
  connection: process.env.DB_CONNECTION || 'sqlite',
  path: process.env.DB_PATH || './database/ojt_system.db',
},
```

### 2.2 Database Configuration

The updated [src/config/database.js](src/config/database.js) now:
- ✅ Detects `DATABASE_URL` environment variable
- ✅ Automatically uses PostgreSQL when `DATABASE_URL` is set
- ✅ Falls back to SQLite for local development
- ✅ Configures connection pooling (critical for serverless)
- ✅ Handles SSL connection to Neon

---

## 🌐 Step 3: Deploy to Vercel

### 3.1 Create Vercel Project

Option A: Using Vercel Dashboard
1. Go to https://vercel.com/dashboard
2. Click "New Project"
3. Import your GitHub repository
4. Select your project
5. Click "Import"

Option B: Using Vercel CLI
```bash
npm i -g vercel
vercel
```

### 3.2 Set Environment Variables in Vercel

1. In Vercel dashboard, go to Project Settings → Environment Variables
2. Add these variables:

| Variable | Value | Notes |
|----------|-------|-------|
| `DATABASE_URL` | `postgresql://...` | Copy from Neon (Pooler) |
| `APP_ENV` | `production` | |
| `APP_DEBUG` | `false` | |
| `JWT_SECRET` | Generate a strong random string | Use: `node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"` |
| `GOOGLE_CLIENT_ID` | Your OAuth ID | If using Google Auth |
| `GOOGLE_CLIENT_SECRET` | Your OAuth secret | If using Google Auth |
| `CORS_ORIGIN` | Your frontend URL | Your React/Vue domain |

### 3.3 Important: Connection String Format for Serverless

⚠️ **CRITICAL**: Use the **Pooler** connection string from Neon, NOT the Direct connection:

- ❌ Wrong (Direct): `postgresql://user@ep-xxx.neon.tech/neondb`
- ✅ Correct (Pooler): `postgresql://user:password@ep-xxx.neon.tech/neondb?sslmode=require`

The pooler adds connection pooling, which serverless environments require.

---

## 🧪 Step 4: Test Connection Locally

### 4.1 Test with Neon Database Locally

```bash
# Create .env.local file with Neon connection string
echo "DATABASE_URL=postgresql://neon_user:password@ep-xxxxx.neon.tech/neondb?sslmode=require" > .env.local
echo "APP_DEBUG=true" >> .env.local

# Start your server
npm run dev

# Check logs for: ✅ Database connection authenticated successfully
```

### 4.2 Test via API

```bash
# Test database connection
curl http://localhost:5000/api/health

# Should return database status
```

---

## 📊 Step 5: Verify on Vercel Production

### 5.1 Deploy & Check Logs

```bash
# Push your changes to GitHub (auto-deploys to Vercel)
git add .
git commit -m "Add PostgreSQL Neon support"
git push origin main

# In Vercel dashboard, click on your deployment
# View "Logs" tab to see:
# - "🐘 Using PostgreSQL (Neon.tech)"
# - "✅ Database connection authenticated successfully"
```

### 5.2 Monitor Connection Pool

1. Go to https://console.neon.tech
2. Click your project
3. Go to "Monitoring" tab
4. Watch for:
   - ✅ Active connections (should show 1-3)
   - ✅ No connection errors
   - ✅ Query latency < 100ms

---

## 🔄 Step 6: Database Migrations

### 6.1 Run Migrations When Schema Changes

If you add new columns or models:

```bash
# Locally with Neon
DATABASE_URL=postgresql://... npm run migrate

# Or manually create migration file
# database/migrations/20260419001-add-new-field.js
```

### 6.2 Using Sequelize Migrations

Since your project has migrations folder, use:

```bash
# Create new migration
npx sequelize-cli migration:generate --name add-new-field

# Run pending migrations on Neon (requires DATABASE_URL)
DATABASE_URL=postgresql://... npx sequelize-cli db:migrate
```

---

## 🆘 Troubleshooting

### ❌ Error: "connect ECONNREFUSED"
**Solution**: Check that DATABASE_URL uses **Pooler** connection string, not Direct

### ❌ Error: "SSL certificate problem"
**Solution**: Ensure `?sslmode=require` is in DATABASE_URL

### ❌ Connection Pool Exhausted
**Solution**: Increase `DATABASE_POOL_MAX` in environment variables (default 3)

### ❌ "Too many connections"
**Solution**: 
1. Reduce pool size: `DATABASE_POOL_MAX=2`
2. Use connection pooling (already configured)
3. Check for connection leaks in code

### ❌ Vercel Timeout (504)
**Solution**:
1. Check database is responsive: `npx sequelize-cli db:migrate --env production`
2. Verify DATABASE_URL is correct
3. Check Neon dashboard for active queries

---

## 📈 Performance Tips

### 1. Connection Pooling
Already configured with optimal settings for Vercel:
- Min: 1 connection
- Max: 3 connections
- Idle timeout: 20 seconds

### 2. Add Database Indexes

For frequently queried columns, add indexes in migrations:

```javascript
// Example migration
'use_strict';
module.exports = {
  up: async (queryInterface, Sequelize) => {
    await queryInterface.addIndex('users', ['email']);
    await queryInterface.addIndex('applications', ['student_id']);
  },
};
```

### 3. Monitor Query Performance

In [src/config/database.js](src/config/database.js), enable query logging in production:

```javascript
logging: config.app.debug ? console.log : false,
```

---

## 🔐 Security Best Practices

### 1. Never Commit Real Secrets
- ✅ Commit: `.env.production.example` (with placeholder values)
- ❌ Don't commit: `.env.production` or `.env.local`

### 2. Rotate JWT Secret
Generate strong random JWT secret:
```bash
node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
```

### 3. Use Read-Only Replica for Analytics (Optional)
Neon supports read replicas for heavy queries:
1. Create a branch in Neon dashboard
2. Use separate connection string for read-heavy operations

### 4. Enable Neon Security Features
In Neon dashboard:
- ✅ Enable autosuspend (auto-pause after 5 min inactivity)
- ✅ Enable auto-restart on activity
- ✅ Regular backups (default: 7 days)

---

## 📚 Useful Commands

```bash
# Check PostgreSQL connection
psql "$DATABASE_URL"

# View database schema
\dt

# Run migrations on production
DATABASE_URL=postgresql://... npm run migrate

# Reset database (CAREFUL!)
DATABASE_URL=postgresql://... npx sequelize-cli db:migrate:undo:all

# Generate JWT secret
node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"

# Test Vercel connection locally
vercel env pull
npm run dev
```

---

## 🎯 Summary

Your application is now configured for:
- ✅ PostgreSQL via Neon.tech
- ✅ Automatic database detection (PostgreSQL if `DATABASE_URL` set, SQLite otherwise)
- ✅ Serverless-optimized connection pooling
- ✅ Vercel deployment
- ✅ SSL encryption
- ✅ Zero-downtime deployments

**Next Steps:**
1. Set `DATABASE_URL` in Vercel environment variables
2. Deploy to Vercel
3. Monitor Neon dashboard for connection health
4. Scale as needed (upgrade from free tier if necessary)
