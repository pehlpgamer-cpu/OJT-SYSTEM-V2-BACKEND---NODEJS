# Render Deployment - Quick Start (5 mins)

**Status:** Ready to Deploy ✅

---

## ⚡ Fastest Way to Deploy

### Step 1: Push Code to GitHub

```bash
git add .
git commit -m "Ready for Render"
git push origin main
```

### Step 2: Create PostgreSQL on Render

1. Go to https://render.com/dashboard
2. **New** → **PostgreSQL**
3. Name: `ojt-system-v2-postgres`
4. Click **Create Database**
5. **Copy** the `External Database URL` (looks like `postgres://user:pass@...`)

### Step 3: Deploy to Render

1. **New** → **Web Service**
2. **Build and deploy from Git**
3. Select your GitHub repo
4. **Name:** `ojt-system-v2-api`
5. **Build Command:** `npm install`
6. **Start Command:** `node src/server.js`
7. **Region:** Pick nearest to you
8. Click **Advanced** → **Add Environment Variables**

### Step 4: Add Environment Variables

Copy-paste these (replace YOUR_VALUES):

```
APP_ENV=production
APP_DEBUG=false
APP_PORT=10000
PORT=10000
NODE_ENV=production
APP_URL=https://ojt-system-v2-api.onrender.com
DB_CONNECTION=postgres
DATABASE_URL=postgres://user:password@host:port/database
JWT_SECRET=your_strong_secret_here_32_chars_or_more
GOOGLE_CLIENT_ID=your_google_id
GOOGLE_CLIENT_SECRET=your_google_secret
GOOGLE_PROD_CALLBACK_URL=https://ojt-system-v2-api.onrender.com/api/auth/google/callback
CORS_ORIGIN=https://your-domain.com,http://localhost:3000
```

**Get values from:**
- `DATABASE_URL` → Your PostgreSQL service credentials (from Step 2)
- `JWT_SECRET` → Generate: `node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"`
- `GOOGLE_*` → Google Cloud Console

### Step 5: Deploy

Click **Create Web Service** and wait for "Live" status (green).

---

## ✅ Verify It Works

```bash
# Health check (replace with your service name)
curl https://ojt-system-v2-api.onrender.com/health

# Should return:
# {"status":"ok","timestamp":"...","environment":"production"}
```

---

## 🔧 Code Changes Required

**Before deploying, add PostgreSQL support:**

### 1. Install PostgreSQL Driver

```bash
npm install pg pg-hstore
```

### 2. Update `src/config/database.js`

Replace the Sequelize initialization with this:

```javascript
import { Sequelize } from 'sequelize';
import { config } from './env.js';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

let sequelize;

if (config.database.url && process.env.APP_ENV === 'production') {
  // Production: PostgreSQL on Render
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
  // Development: SQLite locally
  sequelize = new Sequelize({
    dialect: 'sqlite',
    storage: process.env.NODE_ENV === 'test' 
      ? ':memory:' 
      : path.join(__dirname, '../../database', config.database.path.split('/').pop()),
    logging: config.app.debug && process.env.NODE_ENV !== 'test' ? console.log : false,
    timestamps: true,
    define: {
      underscored: true,
      freezeTableName: false,
      paranoid: true,
    },
  });
}

// ... rest of your code (connectDatabase, etc.)
```

### 3. Update `src/config/env.js`

Add this to the database section:

```javascript
database: {
  connection: process.env.DB_CONNECTION || 'sqlite',
  path: process.env.DB_PATH || './database/ojt_system.db',
  url: process.env.DATABASE_URL,  // Add this line
},
```

### 4. Commit Changes

```bash
git add package.json package-lock.json src/config/
git commit -m "Add PostgreSQL support for Render deployment"
git push origin main
```

---

## 📚 Files Created for You

- `render.yaml` - Render configuration
- `.env.render.template` - Environment variables template
- `RENDER-DEPLOYMENT-GUIDE.md` - Complete guide
- `RENDER-DEPLOYMENT-CHECKLIST.md` - Pre-flight checklist

---

## 🆘 Troubleshooting

### "Build failed"
→ Check **Deploy logs**, look for error messages

### "App crashed after deploy"
→ Check **Logs tab**, likely missing env var or DB issue

### "Port already in use"
→ Already configured to use dynamic PORT env var

### "Cannot find module 'pg'"
→ Run `npm install pg pg-hstore` and push to GitHub

### "Database connection failed"
→ Verify `DATABASE_URL` is correct, check PostgreSQL service is "Available"

---

## 📊 After Deployment

Render automatically redeploys when you `git push`:

```bash
# Make changes
git add .
git commit -m "New feature"
git push origin main
# → Render redeploys automatically! 🚀
```

---

**That's it! Your API is now live on Render.** 🎉

For detailed info, see `RENDER-DEPLOYMENT-GUIDE.md`
