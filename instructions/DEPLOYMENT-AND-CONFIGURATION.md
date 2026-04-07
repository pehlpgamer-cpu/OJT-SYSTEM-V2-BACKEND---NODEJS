# OJT System V2 - Deployment & Configuration Guide

**Version:** 2.0  
**Framework:** Laravel 12.x  
**Last Updated:** April 2026

---

## Table of Contents
1. [Environment Setup](#environment-setup)
2. [Installation Instructions](#installation-instructions)
3. [Database Configuration](#database-configuration)
4. [Development Environment](#development-environment)
5. [Production Deployment](#production-deployment)
6. [Configuration Files](#configuration-files)
7. [Troubleshooting Deployment](#troubleshooting-deployment)

---

## Environment Setup

### System Requirements

**Minimum:**
- PHP 8.2 or higher
- Composer 2.0+
- Node.js 16+ (for frontend assets)
- npm 8+ or yarn
- SQLite or PostgreSQL
- Git

**Recommended (Production):**
- PHP 8.4 (latest stable)
- PostgreSQL 14+ (instead of SQLite)
- Redis for caching
- Nginx (web server)
- SSL/TLS certificate

### Version Information

| Component | Version | Purpose |
|-----------|---------|---------|
| Laravel | 12.x | Framework |
| PHP | 8.2+ | Language |
| Sanctum | 4.0 | API authentication |
| SQLite | Latest | Default database |
| Node.js | 16+ | Frontend tooling |
| Vite | 7.0+ | Asset bundler |

---

## Installation Instructions

### Step 1: Clone Repository

```bash
git clone https://github.com/pehlpgamer-cpu/OJT-SYSTEM-V2-BACKEND---NODEJS.git
cd OJT-SYSTEM-V2-BACKEND---NODEJS
```

### Step 2: Install Backend Dependencies

```bash
# Install PHP packages
composer install

# Create environment file
cp .env.example .env

# Generate application key
php artisan key:generate

# Create SQLite database file
touch database/database.sqlite
```

### Step 3: Configure Environment Variables

**Edit `.env` file:**

```env
# Application
APP_NAME="OJT System V2"
APP_ENV=local
APP_DEBUG=true
APP_URL=http://localhost:8000

# Database (default SQLite)
DB_CONNECTION=sqlite
DB_DATABASE=database/database.sqlite

# Or PostgreSQL (production preferred)
DB_CONNECTION=pgsql
DB_HOST=127.0.0.1
DB_PORT=5432
DB_DATABASE=ojt_system
DB_USERNAME=postgres
DB_PASSWORD=your_password

# Mail (optional - currently no email)
MAIL_MAILER=log
MAIL_FROM_ADDRESS=noreply@ojt-system.local

# Cache & Session
CACHE_DRIVER=file
SESSION_DRIVER=file

# Security
APP_KEY=base64:your_key (auto-generated)

# Queue (optional - for background jobs)
QUEUE_CONNECTION=sync
```

### Step 4: Setup Database

```bash
# Run migrations
php artisan migrate

# Seed database (optional test data)
php artisan db:seed

# Create SQLite tables from migrations
php artisan migrate --force
```

### Step 5: Install Frontend Dependencies

```bash
# Install Node packages
npm install

# Build frontend assets
npm run build

# Or watch for development
npm run dev
```

### Step 6: Start Development Server

**Terminal 1: Start Laravel Server**
```bash
php artisan serve
```

Server runs at: `http://localhost:8000`

**Terminal 2: Start Frontend Dev Server (Optional)**
```bash
npm run dev
```

Vite HMR at: `http://localhost:5173`

---

## Database Configuration

### SQLite (Development)

**Advantages:**
- Zero configuration
- No external database needed
- Good for prototyping

**File Location:**
```
database/database.sqlite
```

**Configuration (default):**
```env
DB_CONNECTION=sqlite
DB_DATABASE=database/database.sqlite
```

**Limitations:**
- Single-threaded: No concurrency
- Performance drops with large datasets
- Not suitable for production

### PostgreSQL (Production Recommended)

**Advantages:**
- Full ACID compliance
- Excellent performance
- Handles concurrent users
- Advanced features (JSON types, arrays)

**Installation (macOS):**
```bash
# Using Homebrew
brew install postgresql@14
brew services start postgresql@14

# Create database
createdb ojt_system

# Create user
createuser ojt_user -P # Will prompt for password
```

**Installation (Ubuntu):**
```bash
sudo apt update
sudo apt install postgresql postgresql-contrib

# Create database
sudo -u postgres createdb ojt_system

# Create user
sudo -u postgres createuser ojt_user -P
```

**Configuration (.env):**
```env
DB_CONNECTION=pgsql
DB_HOST=127.0.0.1
DB_PORT=5432
DB_DATABASE=ojt_system
DB_USERNAME=ojt_user
DB_PASSWORD=your_secure_password
```

**Migrate to PostgreSQL:**
```bash
# Clear old SQLite migrations
# 1. Load existing data if needed
# 2. Run migrations
php artisan migrate --force
```

### Database Backup

**SQLite Backup:**
```bash
# Simple file copy
cp database/database.sqlite database/database.sqlite.backup.$(date +%Y%m%d)
```

**PostgreSQL Backup:**
```bash
# Full backup
pg_dump -U ojt_user ojt_system > backup.sql

# Compressed backup
pg_dump -U ojt_user ojt_system | gzip > backup.sql.gz

# Restore from backup
psql -U ojt_user ojt_system < backup.sql
```

---

## Development Environment

### Running Tests

```bash
# Run all tests
php artisan test

# Run specific test file
php artisan test tests/Feature/Auth/LoginTest.php

# Run with coverage report
php artisan test --coverage
```

### Code Quality Tools

```bash
# Fix code formatting
./vendor/bin/pint

# Check code style
./vendor/bin/pint --test

# Static analysis
./vendor/bin/phpstan analyse app

# Lint check
./vendor/bin/phpstan analyse --level=max
```

### Tinker (Interactive REPL)

```bash
# Start interactive PHP shell
php artisan tinker

# Query database
>>> $users = App\Models\User::all();
>>> $users->count();
>>> $user = $users->first();
>>> $user->email;

# Create test data
>>> App\Models\Student::factory()->count(5)->create();

# Exit
>>> exit
```

### View Logs

```bash
# Real-time log streaming
php artisan pail --timeout=0

# Or check log file
tail -f storage/logs/laravel.log
```

### Artisan Commands Cheatsheet

```bash
# Clear caches
php artisan cache:clear
php artisan config:cache
php artisan route:cache
php artisan view:cache

# Optimize
php artisan optimize

# Database seeds
php artisan db:seed

# Fresh migration (reset database)
php artisan migrate:fresh
php artisan migrate:fresh --seed

# Check routes
php artisan route:list

# Show environment
php artisan about
```

---

## Production Deployment

### Pre-Deployment Checklist

- [ ] All tests passing
- [ ] No debug information in logs
- [ ] Environment variables configured
- [ ] Database backup created
- [ ] SSL certificate installed
- [ ] Backups scheduled
- [ ] Monitoring configured
- [ ] Rate limiting tested

### Deployment Steps

**1. Prepare Server**

```bash
# SSH into server
ssh user@your-server.com

# Create application directory
mkdir -p /var/www/ojt-system
cd /var/www/ojt-system
```

**2. Clone Repository**

```bash
git clone https://github.com/pehlpgamer-cpu/OJT-SYSTEM-V2-BACKEND---NODEJS.git .
git checkout main
```

**3. Configure Environment**

```bash
# Copy and edit environment file
cp .env.example .env
nano .env

# Set production values:
APP_ENV=production
APP_DEBUG=false
APP_URL=https://ojt-system.example.com
DB_CONNECTION=pgsql
# ... database credentials ...
```

**4. Install Dependencies**

```bash
# Backend
composer install --optimize-autoloader --no-dev

# Frontend
npm ci # Uses package-lock.json for exact versions
npm run build
```

**5. Setup Database**

```bash
# Run migrations
php artisan migrate --force

# Seed reference data (FAQs, guidelines)
php artisan db:seed
```

**6. Configure Web Server (Nginx)**

**File:** `/etc/nginx/sites-available/ojt-system`

```nginx
server {
    listen 443 ssl http2;
    server_name ojt-system.example.com;

    # SSL certificates
    ssl_certificate /etc/letsencrypt/live/ojt-system.example.com/fullchain.pem;
    ssl_certificate_key /etc/letsencrypt/live/ojt-system.example.com/privkey.pem;

    # Security headers
    add_header Strict-Transport-Security "max-age=31536000; includeSubDomains" always;
    add_header X-Frame-Options "SAMEORIGIN" always;
    add_header X-Content-Type-Options "nosniff" always;
    add_header X-XSS-Protection "1; mode=block" always;

    # Root directory
    root /var/www/ojt-system/public;
    index index.php index.html;

    # PHP-FPM
    location ~ \.php$ {
        fastcgi_pass unix:/var/run/php/php8.2-fpm.sock;
        fastcgi_index index.php;
        fastcgi_param SCRIPT_FILENAME $realpath_root$fastcgi_script_name;
        include fastcgi_params;
    }

    # Static files (cache them)
    location ~ \.(js|css|png|jpg|jpeg|gif|ico|svg|woff|woff2|ttf|eot)$ {
        expires 30d;
        add_header Cache-Control "public, immutable";
    }

    # Hide sensitive files
    location ~ /\. {
        deny all;
    }

    location ~ /storage {
        deny all;
    }

    # Rewrite to index.php
    location / {
        try_files $uri $uri/ /index.php?$query_string;
    }
}

# Redirect HTTP to HTTPS
server {
    listen 80;
    server_name ojt-system.example.com;
    return 301 https://$server_name$request_uri;
}
```

**Enable Site:**
```bash
sudo ln -s /etc/nginx/sites-available/ojt-system /etc/nginx/sites-enabled/
sudo nginx -t
sudo systemctl restart nginx
```

**7. Configure PHP-FPM**

**File:** `/etc/php/8.2/fpm/pool.d/ojt.conf`

```ini
[ojt]
user = www-data
group = www-data
listen = /var/run/php/php8.2-fpm.sock
listen.owner = www-data
listen.group = www-data

pm = dynamic
pm.max_children = 20
pm.start_servers = 5
pm.min_spare_servers = 2
pm.max_spare_servers = 10
```

**8. Setup Permissions**

```bash
# Laravel directories need write permissions
sudo chown -R www-data:www-data /var/www/ojt-system
chmod -R 755 /var/www/ojt-system
chmod -R 775 /var/www/ojt-system/storage
chmod -R 775 /var/www/ojt-system/bootstrap/cache
```

**9. Setup SSL Certificate (Let's Encrypt)**

```bash
# Install Certbot
sudo apt install certbot python3-certbot-nginx

# Generate certificate
sudo certbot certonly --nginx -d ojt-system.example.com

# Auto-renewal
sudo systemctl enable certbot.timer
sudo systemctl start certbot.timer
```

**10. Optimize Laravel**

```bash
# Cache configuration
php artisan config:cache

# Cache routes
php artisan route:cache

# Cache views
php artisan view:cache

# Optimize autoloader
composer dump-autoload --optimize
```

### Monitoring & Maintenance

**Logs Monitoring:**
```bash
# View application logs
tail -f storage/logs/laravel.log

# Or setup centralized logging (ELK, Papertrail, etc.)
```

**Database Backups:**
```bash
# Automated daily backup
0 2 * * * pg_dump -U ojt_user ojt_system | gzip > /backups/ojt_$(date +\%Y\%m\%d).sql.gz

# Keep backups for 30 days
find /backups -name "ojt_*.sql.gz" -mtime +30 -delete
```

**Health Checks:**
```bash
# Setup monitoring endpoint
GET /api/health
# Returns 200 OK if system healthy

# Monitor with external service
curl -f https://ojt-system.example.com/api/health || alert
```

---

## Configuration Files

### Key Configuration Files

**File:** `config/app.php`
- Application name and timezone
- When in production, APP_DEBUG should be false

**File:** `config/database.php`
- Database connection settings
- Fallback SQLite to PostgreSQL as needed

**File:** `config/auth.php`
- Authentication guards (sanctum for API)
- Password reset configuration

**File:** `config/cors.php`
- Cross-Origin Resource Sharing settings
- In production: specify allowed origins

**File:** `config/sanctum.php`
- Token expiration
- Token abilities and scopes
- Excluded paths from authentication

### Environment Variables Reference

**Application:**
```env
APP_NAME=OJT System V2
APP_ENV=local|production
APP_DEBUG=true|false
APP_URL=http://localhost:8000
APP_KEY=base64:... (auto-generated)
```

**Database:**
```env
DB_CONNECTION=sqlite|pgsql|mysql
DB_HOST=localhost
DB_PORT=5432
DB_DATABASE=ojt_system
DB_USERNAME=user
DB_PASSWORD=password
```

**Cache & Session:**
```env
CACHE_DRIVER=file|redis
SESSION_DRIVER=file|database
```

**Mail (Optional):**
```env
MAIL_MAILER=log|smtp
MAIL_HOST=smtp.example.com
MAIL_PORT=587
MAIL_USERNAME=user
MAIL_PASSWORD=password
MAIL_FROM_ADDRESS=noreply@ojt-system.local
```

**Queue (Optional):**
```env
QUEUE_CONNECTION=sync|redis|database
```

---

## Troubleshooting Deployment

### Application Won't Start

**Error: "Key must not be empty"**
```bash
# Solution: Generate application key
php artisan key:generate
```

**Error: "SQLSTATE[HY000]"**
```bash
# Solution: Database connection issue
# 1. Check .env has correct DB credentials
# 2. Verify database exists and is accessible
# 3. Run: php artisan migrate
```

### Permissions Error

**Error: "Permission denied" on storage**
```bash
# Solution: Fix directory permissions
sudo chown -R www-data:www-data /var/www/ojt-system/storage
chmod -R 775 /var/www/ojt-system/storage
```

### 500 Error

**Solution: Check logs**
```bash
tail -f storage/logs/laravel.log
# May show actual error

# Clear caches
php artisan cache:clear
php artisan config:clear
php artisan view:clear
```

### Slow Performance

**Solution: Optimize Laravel**
```bash
php artisan config:cache
php artisan route:cache
php artisan view:cache
```

**Check database queries:**
```bash
# Enable query logging in .env
APP_DEBUG=true

# View queries in logs
tail -f storage/logs/laravel.log

# Try: Laravel Debugbar (development only)
composer require barryvdh/laravel-debugbar --dev
```

---

## Summary

OJT System deployment supports:

✅ **Development** - SQLite for quick setup  
✅ **Production** - PostgreSQL for reliability  
✅ **Automation** - Artisan commands for common tasks  
✅ **Monitoring** - Logging and health checks  
✅ **Security** - SSL, environment variables, permissions  
✅ **Scaling** - Nginx, PHP-FPM, database optimization  

This enables **professional-grade deployment** from development to production.
