# Deploy OJT System V2 Backend to Render.com

**Last Updated:** April 14, 2026  
**Platform:** Render.com (Starter Plan and above)  
**Language:** Node.js + Express + SQLite (will use PostgreSQL on Render)

---

## 🎯 Prerequisites

Before deploying to Render, ensure you have:

- ✅ **GitHub Account** - Render deploys from Git repositories
- ✅ **Repository Pushed** - Your code on GitHub (public or private)
- ✅ **Render Account** - Sign up at https://render.com (free tier available)
- ✅ **Environment Variables Ready** - All `.env` variables documented

---

## 📋 Step 1: Prepare Your Repository

### 1.1 Ensure `.gitignore` Exists

Your `.gitignore` should exclude sensitive files:

```
node_modules/
.env
.env.local
database/*.db
logs/
coverage/
*.log
.DS_Store
```

### 1.2 Push Code to GitHub

```bash
# Initialize git (if not already)
git init

# Add all files
git add .

# Commit
git commit -m "OJT System V2 Backend - Ready for Render deployment"

# Add your GitHub remote
git remote add origin https://github.com/YOUR_USERNAME/ojt-system-v2-backend.git

# Push to main branch
git branch -M main
git push -u origin main
```

### 1.3 Verify `package.json` Has Start Script

✅ Your `package.json` already has:
```json
"scripts": {
  "start": "node src/server.js",
  ...
}
```

This is what Render will run to start your server.

---

## 🗄️ Step 2: Set Up PostgreSQL Database on Render

Since Render doesn't support persistent file-based SQLite, we'll use PostgreSQL.

### Option A: Use Render's PostgreSQL (Recommended)

#### 2A.1 Create PostgreSQL Database on Render

1. Log in to https://render.com
2. Click **New +** button → Select **PostgreSQL**
3. Configure:
   - **Name:** `ojt-system-v2-postgres`
   - **Database:** `ojt_system`
   - **User:** `ojt_user`
   - **Region:** Choose closest to your location
   - **PostgreSQL Version:** 15 (or latest)
4. Click **Create Database**
5. Wait for database to initialize (2-3 minutes)

#### 2A.2 Copy Database Credentials

Once database is ready, you'll see:
- **External Database URL** - Copy this (`postgres://...`)
- **Internal Database URL** - For connections within Render
- **Host, User, Password** - Alternative connection details

**Store this URL safely** - you'll need it for the next step.

---

## 🚀 Step 3: Configure Your Backend for Render

### 3.1 Update `src/config/env.js` for PostgreSQL Support

Your app currently uses SQLite. We need to add PostgreSQL support. Update `src/config/env.js`:

```javascript
// ... existing code ...

export const config = {
  app: {
    name: process.env.APP_NAME || 'OJT System V2',
    env: process.env.APP_ENV || 'development',
    debug: process.env.APP_DEBUG === 'true',
    port: parseInt(process.env.PORT || process.env.APP_PORT || '5000'),
    url: process.env.APP_URL || 'http://localhost:5000',
  },

  // Database Configuration - Support both SQLite and PostgreSQL
  database: {
    connection: process.env.DB_CONNECTION || 'sqlite',
    path: process.env.DB_PATH || './database/ojt_system.db',
    // PostgreSQL connection string (used when DB_CONNECTION=postgres)
    url: process.env.DATABASE_URL,
  },

  // ... rest of config ...
};
```

### 3.2 Update `src/config/database.js` for PostgreSQL

Replace your Sequelize initialization to support PostgreSQL:

```javascript
import { Sequelize } from 'sequelize';
import { config } from './env.js';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

let sequelize;

if (config.database.url && process.env.APP_ENV === 'production') {
  // Production: Use PostgreSQL connection string from Render
  sequelize = new Sequelize(config.database.url, {
    dialect: 'postgres',
    protocol: 'postgres',
    dialectOptions: {
      ssl: {
        require: true,
        rejectUnauthorized: false,
      },
    },
    logging: config.app.debug ? console.log : false,
    timestamps: true,
    define: {
      underscored: true,
      freezeTableName: false,
      paranoid: true,
    },
  });
} else {
  // Development: Use SQLite
  sequelize = new Sequelize({
    dialect: 'sqlite',
    storage: process.env.NODE_ENV === 'test' ? ':memory:' : path.join(__dirname, '../../database', config.database.path.split('/').pop()),
    logging: config.app.debug && process.env.NODE_ENV !== 'test' ? console.log : false,
    timestamps: true,
    define: {
      underscored: true,
      freezeTableName: false,
      paranoid: true,
    },
  });
}

// ... rest of your code ...
```

### 3.3 Add PostgreSQL to Dependencies

Update your `package.json` to include the PostgreSQL driver:

```json
{
  "dependencies": {
    "pg": "^8.11.0",
    "pg-hstore": "^2.3.4",
    // ... existing dependencies ...
  }
}
```

---

## 🔐 Step 4: Create Render Configuration Files

### 4.1 Create `render.yaml` (Infrastructure as Code)

This file tells Render how to deploy your app.

Create `render.yaml` in your project root:

```yaml
services:
  - type: web
    name: ojt-system-v2-api
    env: node
    plan: starter
    buildCommand: npm install
    startCommand: node src/server.js
    envVars:
      - key: APP_ENV
        value: production
      - key: APP_DEBUG
        value: false
      - key: PORT
        value: 10000
      - key: NODE_ENV
        value: production
      - key: JWT_SECRET
        sync: false
```

### 4.2 Alternatively: Create `.render/render.yaml`

Same location as above but in `.render/` folder (optional):

```yaml
services:
  - type: web
    name: ojt-system-v2-api
    env: node
    plan: starter
    buildCommand: npm install
    startCommand: node src/server.js
    routes:
      - path: /
        type: http
```

---

## 🔑 Step 5: Deploy on Render Dashboard

### 5.1 Connect GitHub Repository

1. Go to https://render.com/dashboard
2. Click **New +** → **Web Service**
3. Select **Build and deploy from a Git repository**
4. Click **Connect account** (GitHub)
5. Authorize Render to access your GitHub
6. Select your repository: `ojt-system-v2-backend`
7. Select branch: `main`

### 5.2 Configure Deployment Settings

1. **Name:** `ojt-system-v2-api`
2. **Environment:** Node
3. **Region:** Choose nearest to you
4. **Branch:** `main`
5. **Build Command:** `npm install`
6. **Start Command:** `node src/server.js`
7. **Plan:** Starter (free) or higher

### 5.3 Add Environment Variables

In the **Environment Variables** section, add all required variables:

```
APP_NAME=OJT System V2
APP_ENV=production
APP_DEBUG=false
APP_PORT=10000
APP_URL=https://ojt-system-v2-api.onrender.com
PORT=10000
NODE_ENV=production

DB_CONNECTION=postgres
DATABASE_URL=postgres://ojt_user:PASSWORD@app-name.c.aivencloud.com:11821/ojt_system
CORS_ORIGIN=https://your-frontend-domain.com,https://yourdomain.com

JWT_SECRET=your_very_secure_jwt_secret_here
JWT_EXPIRES_IN=7d
BCRYPT_ROUNDS=10

GOOGLE_CLIENT_ID=your_google_client_id
GOOGLE_CLIENT_SECRET=your_google_client_secret
GOOGLE_PROD_CALLBACK_URL=https://ojt-system-v2-api.onrender.com/api/auth/google/callback

RATE_LIMIT_WINDOW_MS=900000
RATE_LIMIT_MAX_REQUESTS=100

LOG_LEVEL=info
```

**⚠️ Important:** Replace these values:
- `DATABASE_URL` - Use the PostgreSQL URL from Step 2
- `JWT_SECRET` - Generate a strong random string
- `GOOGLE_CLIENT_*` - From your Google Cloud Console
- `APP_URL` - Will be `https://your-service-name.onrender.com`
- `CORS_ORIGIN` - Your frontend domain(s)

### 5.4 Click Deploy

Click the **Deploy** button. Render will:
1. Build your application
2. Install dependencies
3. Start the server
4. Show build logs in real-time

---

## ✅ Step 6: Verify Deployment

### 6.1 Check Service Status

1. Go to your service dashboard on Render
2. Look for **"Live"** status (green indicator)
3. Copy your **Service URL** (ends with `.onrender.com`)

### 6.2 Test API Endpoints

Open terminal and test:

```bash
# Health check
curl https://your-service-name.onrender.com/health

# Expected response:
# {
#   "status": "ok",
#   "timestamp": "2026-04-14T...",
#   "environment": "production"
# }

# API version
curl https://your-service-name.onrender.com/api/version

# Expected response:
# {
#   "version": "2.0.0",
#   "name": "OJT System V2 API",
#   "environment": "production"
# }
```

### 6.3 Test Database Connection

Test a database endpoint:

```bash
# Try creating a user (requires valid email/password)
curl -X POST https://your-service-name.onrender.com/api/auth/register \
  -H "Content-Type: application/json" \
  -d '{
    "email": "test@example.com",
    "password": "TestPassword123!",
    "name": "Test User",
    "role": "student"
  }'
```

### 6.4 Check Logs

In Render dashboard:
1. Click your service
2. Go to **Logs** tab
3. Look for connection confirmations and any errors

---

## 📱 Step 7: Connect Frontend to Backend

Update your frontend `.env` to use the live API:

**`.env` (Frontend)**
```
REACT_APP_API_URL=https://your-service-name.onrender.com
REACT_APP_GOOGLE_CLIENT_ID=your_google_client_id
```

---

## 🔄 Step 8: Continuous Deployment Setup

Render automatically redeploys when you push to GitHub:

```bash
# Make changes locally
git add .
git commit -m "Feature: Add new endpoint"

# Push to GitHub
git push origin main

# Render automatically deploys! 🚀
# Check your service logs for deployment progress
```

To disable auto-deploy or configure selective deployments:
1. Go to Service Settings
2. Under **Deploy**, disable "Auto-Deploy" if desired

---

## 🆘 Troubleshooting Common Issues

### Issue: "Port 10000 is not available"

**Solution:** Render assigns ports dynamically. Use environment variable:

```javascript
// In your server.js, use PORT if available
const PORT = process.env.PORT || 5000;
```

Your `package.json` start script should launch on `process.env.PORT`.

### Issue: "Cannot find module 'pg'"

**Solution:** PostgreSQL driver not installed:

```bash
npm install pg pg-hstore
git add package-lock.json
git commit -m "Add PostgreSQL driver"
git push
```

### Issue: "SSL certificate verify failed"

**Solution:** SSL is required for Render PostgreSQL. Already included in Step 3.2 config:

```javascript
dialectOptions: {
  ssl: {
    require: true,
    rejectUnauthorized: false,
  },
}
```

### Issue: "Database connection timeout"

**Solution:** Check if PostgreSQL database is running:
1. Go to Render dashboard
2. Check PostgreSQL service status (should be "Available")
3. Verify `DATABASE_URL` environment variable is correct
4. Try connecting with a database tool (pgAdmin) to test connectivity

### Issue: "CORS errors from frontend"

**Solution:** Update `CORS_ORIGIN` environment variable:

```
CORS_ORIGIN=https://your-frontend-domain.com,https://another-domain.com
```

### Issue: "Google OAuth not working"

**Solution:** Update Google Cloud Console redirect URIs:
1. Go to Google Cloud Console
2. Authorized redirect URIs → Add:
   ```
   https://your-service-name.onrender.com/api/auth/google/callback
   ```
3. Update `GOOGLE_PROD_CALLBACK_URL` on Render

---

## 📊 Monitoring & Maintenance

### View Logs

```bash
# Tail logs from Render dashboard
1. Service → Logs
2. See real-time API requests and errors
```

### View Metrics

1. Service → **Metrics** tab
2. Monitor:
   - CPU usage
   - Memory usage
   - Response times
   - H12/H13 errors

### Database Backups

With Render PostgreSQL:
1. Service → **Backups** tab
2. Automatic backups daily
3. Manual backups available
4. Restore to specific point-in-time

### Scale Resources

Starter plan limitations:
- Limited CPU/Memory
- For production, upgrade to **Standard** or higher

To upgrade:
1. Service → **Settings**
2. Change **Plan** to Standard/Pro
3. Billing automatically adjusts

---

## 💰 Cost Estimate

| Service | Plan | Cost |
|---------|------|------|
| **Web Service** | Starter (free tier) | Free (with limitations) |
| | Standard | $7-12/month |
| **PostgreSQL** | Starter | Free |
| | Standard | $7-15/month |

**Free tier limitations:**
- App spins down after 15 min inactivity
- Slow startup time
- Limited to 2 web services + 1 database

For production, recommend **Standard** tier (~$14-27/month total).

---

## 🔒 Production Checklist

Before going live:

- [ ] `JWT_SECRET` is strong (32+ characters)
- [ ] `DATABASE_URL` from Render PostgreSQL
- [ ] `CORS_ORIGIN` updated to frontend domain
- [ ] `GOOGLE_PROD_CALLBACK_URL` configured
- [ ] `APP_URL` matches service domain
- [ ] `NODE_ENV=production`
- [ ] `APP_DEBUG=false`
- [ ] HTTPS enabled (automatic on Render)
- [ ] Database backups verified
- [ ] Error logging configured
- [ ] Health check endpoint responding
- [ ] Database migrations run successfully

---

## 🚀 Quick Summary

### Deploy in 5 Steps:

1. **Push code to GitHub**
   ```bash
   git push origin main
   ```

2. **Create PostgreSQL on Render**
   - New → PostgreSQL
   - Note the connection URL

3. **Deploy web service**
   - New → Web Service
   - Select your repository
   - Add environment variables
   - Click Deploy

4. **Verify it works**
   ```bash
   curl https://your-service.onrender.com/health
   ```

5. **Connect your frontend**
   ```
   API_URL=https://your-service.onrender.com
   ```

---

## 📚 Additional Resources

- [Render Documentation](https://render.com/docs)
- [Render Node.js Guide](https://render.com/docs/deploy-node-express-app)
- [Render PostgreSQL](https://render.com/docs/databases)
- [Node.js Best Practices](https://nodejs.org/en/docs/guides/nodejs-docker-webapp/)

---

## 🆘 Need Help?

If deployment fails:

1. **Check Render logs** → Service → Logs
2. **Search for error message** in troubleshooting above
3. **Common issues:**
   - Missing environment variables
   - Incorrect database URL
   - Port conflicts
   - Missing npm dependencies

For Render support: https://render.com/docs/support

For Node.js/Express issues: Check application logs in Render dashboard

---

**Ready to deploy your OJT System V2 Backend!** ✅

