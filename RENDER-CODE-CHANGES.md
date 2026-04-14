# Code Changes for Render Deployment

These are the exact changes needed to support PostgreSQL for Render.

---

## File 1: `package.json` - Add PostgreSQL Driver

**Add these lines to the `dependencies` section:**

```json
{
  "dependencies": {
    "express": "^4.18.0",
    "sequelize": "^6.35.0",
    "sqlite3": "^5.1.0",
    "pg": "^8.11.0",
    "pg-hstore": "^2.3.4",
    "bcrypt": "^5.1.0",
    // ... rest of dependencies
  }
}
```

**Then run:** `npm install`

---

## File 2: `src/config/env.js` - Add PostgreSQL URL

**Find this section:**

```javascript
  // Database Configuration
  database: {
    connection: process.env.DB_CONNECTION || 'sqlite',
    path: process.env.DB_PATH || './database/ojt_system.db',
  },
```

**Replace with:**

```javascript
  // Database Configuration
  database: {
    connection: process.env.DB_CONNECTION || 'sqlite',
    path: process.env.DB_PATH || './database/ojt_system.db',
    url: process.env.DATABASE_URL, // Add this line for PostgreSQL on Render
  },
```

---

## File 3: `src/config/database.js` - PostgreSQL Support

**This is the main change. Replace your current Sequelize initialization with:**

```javascript
/**
 * Database Configuration (Sequelize ORM)
 * 
 * Supports both SQLite (local development) and PostgreSQL (Render production)
 */

import { Sequelize } from 'sequelize';
import { config } from './env.js';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

/**
 * Initialize Sequelize instance
 * 
 * Production (Render): Uses PostgreSQL with DATABASE_URL
 * Development (Local): Uses SQLite file
 * Test: Uses in-memory SQLite
 */
let sequelize;

// Check if we're in production with a PostgreSQL connection string
if (config.database.url && process.env.APP_ENV === 'production') {
  // ==============================================================================
  // PRODUCTION: PostgreSQL on Render
  // ==============================================================================
  console.log('📦 Initializing PostgreSQL connection (Render)...');
  
  sequelize = new Sequelize(config.database.url, {
    dialect: 'postgres',
    protocol: 'postgres',
    
    // SSL is required for Render's PostgreSQL
    dialectOptions: {
      ssl: {
        require: true,
        rejectUnauthorized: false, // Required for Render's SSL certificate
      },
    },
    
    // Logging: Set to false in production to reduce overhead
    logging: config.app.debug ? console.log : false,
    
    // Connection options
    pool: {
      max: 5,
      min: 1,
      idle: 10000,
      acquire: 30000,
    },
    
    // Timestamps
    timestamps: true,
    
    // Model options
    define: {
      underscored: true, // Convert camelCase to snake_case
      freezeTableName: false,
      paranoid: true, // Soft deletes
    },
  });
} else {
  // ==============================================================================
  // DEVELOPMENT: SQLite (local and test)
  // ==============================================================================
  console.log('📦 Initializing SQLite connection (development)...');
  
  sequelize = new Sequelize({
    dialect: 'sqlite',
    
    // Use in-memory for tests, file-based for development
    storage: process.env.NODE_ENV === 'test' 
      ? ':memory:' 
      : path.join(__dirname, '../../database', config.database.path.split('/').pop()),
    
    // Logging
    logging: config.app.debug && process.env.NODE_ENV !== 'test' ? console.log : false,
    
    // Timestamps
    timestamps: true,
    
    // Model options
    define: {
      underscored: true,
      freezeTableName: false,
      paranoid: true,
    },
  });
}

/**
 * Connect to database and sync models
 */
export async function connectDatabase() {
  try {
    // Test connection
    await sequelize.authenticate();
    console.log('✅ Database connection authenticated');

    // Sync models with database
    // force: false means don't drop existing tables
    // alter: true means update table structure if models changed
    await sequelize.sync({ alter: false });
    console.log('✅ Database models synchronized');
  } catch (error) {
    console.error('❌ Database connection failed:', error.message);
    throw error;
  }
}

export default sequelize;
```

---

## Deployment Steps Summary

1. **Install PostgreSQL driver:**
   ```bash
   npm install pg pg-hstore
   ```

2. **Update files:**
   - Add PostgreSQL URL to `env.js`
   - Update `database.js` with code above

3. **Test locally:**
   ```bash
   npm install
   npm start
   # Check: curl http://localhost:5000/health
   ```

4. **Commit and push:**
   ```bash
   git add package.json package-lock.json src/config/database.js src/config/env.js
   git commit -m "Add PostgreSQL support for Render deployment"
   git push origin main
   ```

5. **Deploy to Render:**
   - Create PostgreSQL database
   - Create Web Service
   - Add environment variables (including `DATABASE_URL`)
   - Click Deploy

---

## Environment Variables on Render

Set these in Render dashboard → Environment Variables:

```
DB_CONNECTION=postgres
DATABASE_URL=postgres://user:password@host:port/database
APP_ENV=production
NODE_ENV=production
APP_DEBUG=false
JWT_SECRET=your_strong_secret
```

---

## Verify Deployment

```bash
# Health check
curl https://your-service.onrender.com/health

# Version check
curl https://your-service.onrender.com/api/version
```

---

## Rollback (If Needed)

If something goes wrong:

1. **Check Render logs:**
   - Service → Logs tab
   - Look for error messages

2. **Common issues:**
   - Missing `DATABASE_URL` env var
   - `DATABASE_URL` format incorrect
   - PostgreSQL not running (check Render dashboard)
   - Missing `pg` dependency (run `npm install pg`)

3. **If need to revert:**
   ```bash
   git revert HEAD
   git push origin main
   # Render automatically redeploys the previous version
   ```

---

## What Changed?

| Component | Before (SQLite) | After (PostgreSQL) |
|-----------|---|---|
| **Driver** | sqlite3 | pg + pg-hstore |
| **Storage** | Local file | Render PostgreSQL |
| **SSL** | Not needed | Required (configured) |
| **Connection Pool** | Default | Optimized (5 max, 1 min) |
| **Env Vars** | DB_CONNECTION, DB_PATH | DB_CONNECTION, DATABASE_URL |

---

## Full Example: Complete `env.js` Update

```javascript
/**
 * Environment Configuration
 */
import dotenv from 'dotenv';

dotenv.config();

export const config = {
  // Application
  app: {
    name: process.env.APP_NAME || 'OJT System V2',
    env: process.env.APP_ENV || 'development',
    debug: process.env.APP_DEBUG === 'true',
    port: parseInt(process.env.PORT || process.env.APP_PORT || '5000'),
    url: process.env.APP_URL || 'http://localhost:5000',
  },

  // Database - supports both SQLite and PostgreSQL
  database: {
    connection: process.env.DB_CONNECTION || 'sqlite',
    path: process.env.DB_PATH || './database/ojt_system.db',
    url: process.env.DATABASE_URL, // PostgreSQL on Render
  },

  // Authentication (JWT)
  auth: {
    secret: process.env.JWT_SECRET,
    expiresIn: process.env.JWT_EXPIRES_IN || '7d',
    bcryptRounds: parseInt(process.env.BCRYPT_ROUNDS || '10'),
  },

  // Google OAuth
  google: {
    clientId: process.env.GOOGLE_CLIENT_ID,
    clientSecret: process.env.GOOGLE_CLIENT_SECRET,
    devCallbackUrl: process.env.GOOGLE_DEV_CALLBACK_URL || 'http://localhost:5000/api/auth/google/callback',
    prodCallbackUrl: process.env.GOOGLE_PROD_CALLBACK_URL || process.env.APP_URL + '/api/auth/google/callback',
  },

  // Rate Limiting
  rateLimit: {
    windowMs: parseInt(process.env.RATE_LIMIT_WINDOW_MS || '900000'),
    maxRequests: parseInt(process.env.RATE_LIMIT_MAX_REQUESTS || '100'),
  },

  // CORS
  cors: {
    origin: (process.env.CORS_ORIGIN || 'http://localhost:3000').split(','),
    methods: ['GET', 'POST', 'PUT', 'DELETE'],
    credentials: true,
  },

  // Logging
  logging: {
    level: process.env.LOG_LEVEL || 'info',
    file: process.env.LOG_FILE || './logs/app.log',
  },
};

export function validateConfig() {
  const required = ['JWT_SECRET'];
  const missing = required.filter(key => !process.env[key]);

  if (missing.length > 0) {
    throw new Error(
      `Missing required environment variables: ${missing.join(', ')}. ` +
      `Please check your .env file.`
    );
  }

  console.log(`✅ Environment configuration validated for ${config.app.env} mode`);
}

export default config;
```

---

That's it! These are the **only three code changes needed** for Render deployment. 

**Next steps:**
1. Make the changes above
2. Follow the Quick Start guide: `RENDER-QUICK-START.md`
3. Deploy! 🚀
