# Quick Neon + Vercel Deployment Checklist

Complete this checklist to deploy your PostgreSQL database on Neon.tech.

---

## ✅ Neon Account Setup (10 minutes)

- [ ] Create Neon account at https://neon.tech
- [ ] Create new project in Neon console
- [ ] Copy **Pooler** connection string (not Direct!)
- [ ] Test connection locally: `psql "postgresql://..."`

**Connection String Format:**
```
postgresql://neon_user:password@ep-xxxxx.neon.tech/neondb?sslmode=require
```

---

## ✅ Local Testing (10 minutes)

```bash
# 1. Create .env.local file
echo "DATABASE_URL=postgresql://your-connection-string-here" > .env.local
echo "APP_DEBUG=true" >> .env.local

# 2. Install dependencies
npm install

# 3. Test database connection
npm run dev

# Check for: ✅ Database connection authenticated successfully
# Check for: 🐘 Using PostgreSQL (Neon.tech)
```

- [ ] Server starts without errors
- [ ] Sees "🐘 Using PostgreSQL" in logs
- [ ] Database connection authenticated

---

## ✅ Vercel Setup (5 minutes)

### Via Vercel Dashboard
1. Go to https://vercel.com/dashboard
2. Click "New Project" or select your repo
3. Go to **Settings → Environment Variables**
4. Add these variables:

| Key | Value | Generate |
|-----|-------|----------|
| `DATABASE_URL` | Neon Pooler connection string | From Neon dashboard |
| `APP_ENV` | `production` | |
| `APP_DEBUG` | `false` | |
| `JWT_SECRET` | Random 64-char hex string | `node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"` |
| `GOOGLE_CLIENT_ID` | Your OAuth ID | From Google Cloud Console (if using) |
| `GOOGLE_CLIENT_SECRET` | Your OAuth secret | From Google Cloud Console (if using) |
| `CORS_ORIGIN` | Your frontend URL | e.g., `https://app.example.com` |

- [ ] DATABASE_URL set correctly (Pooler format)
- [ ] JWT_SECRET generated and set
- [ ] GOOGLE_* variables set (if using Google Auth)
- [ ] CORS_ORIGIN set to your frontend domain

---

## ✅ Code Deployment (2 minutes)

```bash
# Push changes to GitHub (auto-deploys to Vercel)
git add .
git commit -m "Add PostgreSQL Neon support"
git push origin main
```

- [ ] Changes pushed to GitHub
- [ ] Vercel deployment triggered (watch dashboard)
- [ ] No build errors in Vercel logs

---

## ✅ Verify Production (5 minutes)

In Vercel dashboard:

1. Open latest deployment
2. Click **"Logs"** tab
3. Look for:
   - [ ] "🐘 Using PostgreSQL (Neon.tech)"
   - [ ] "✅ Database connection authenticated successfully"
   - [ ] No errors or warnings

4. Visit your deployed API:
   ```
   https://your-vercel-deployment.vercel.app/api/health
   ```
   - [ ] Returns status 200
   - [ ] Shows database as connected

---

## ✅ Production Verification (10 minutes)

### Monitor Neon Connections
1. Go to https://console.neon.tech
2. Select your project
3. Go to **"Monitoring"** tab
4. Verify:
   - [ ] Active connections showing
   - [ ] No connection errors
   - [ ] Query latency < 100ms

### Test API Endpoints
```bash
# Test from your deployed URL
curl https://your-deployment.vercel.app/api/health

# Should return database status
```
- [ ] API responds without errors
- [ ] Database queries work

---

## ✅ Backup & Security (5 minutes)

- [ ] Enable autosuspend in Neon (Settings → Auto-suspend)
- [ ] Verify backups enabled (default: 7 days)
- [ ] Store JWT_SECRET securely (not in code)
- [ ] Test with sample API request

---

## 🎉 Deployment Complete!

Your PostgreSQL database on Neon.tech is now live on Vercel!

### Next Steps:
- Monitor Neon dashboard for connection health
- Test all API endpoints in production
- Scale database tier if needed
- Set up monitoring alerts

### Useful Links:
- [Neon Dashboard](https://console.neon.tech)
- [Vercel Dashboard](https://vercel.com/dashboard)
- [Connection String Reference](NEON-DEPLOYMENT-GUIDE.md)

---

## ❌ If Something Goes Wrong

### Connection Issues
1. Verify DATABASE_URL uses **Pooler**, not Direct
2. Ensure `?sslmode=require` at end of URL
3. Check password contains special chars (may need escaping)

### Authentication Fails
1. Generate new JWT_SECRET: `node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"`
2. Update in Vercel environment variables

### Timeout Errors
1. Check Neon is awake (may auto-suspend after 5 min)
2. Check database query is not too slow
3. See [NEON-DEPLOYMENT-GUIDE.md](NEON-DEPLOYMENT-GUIDE.md) Troubleshooting section

### Contact Support
- Neon Support: https://neon.tech/docs/support
- Vercel Support: https://vercel.com/support
