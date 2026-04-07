@echo off
REM OJT System V2 - Backend Setup Script for Windows
REM 
REM WHY: Automates initial setup process for Windows users
REM WHAT: Creates directories, copies env files, installs deps

echo.
echo ╔════════════════════════════════════════════╗
echo ║   OJT System V2 - Backend Setup Script     ║
echo ╚════════════════════════════════════════════╝
echo.

REM Step 1: Create required directories
echo 📁 Creating project directories...
if not exist database mkdir database
if not exist logs mkdir logs
if not exist src\config mkdir src\config
if not exist src\models mkdir src\models
if not exist src\middleware mkdir src\middleware
if not exist src\services mkdir src\services
if not exist src\utils mkdir src\utils
if not exist src\routes mkdir src\routes
if not exist src\controllers mkdir src\controllers
echo ✅ Directories created
echo.

REM Step 2: Check Node.js installation
echo 🔍 Checking Node.js installation...
where node >nul 2>nul
if %ERRORLEVEL% NEQ 0 (
  echo ⚠️  Node.js is not installed. Please install Node.js 16+
  echo Visit: https://nodejs.org/
  pause
  exit /b 1
)

for /f "tokens=*" %%i in ('node -v') do set NODE_VERSION=%%i
echo ✅ Node.js %NODE_VERSION% found
echo.

REM Step 3: Copy environment file
echo ⚙️  Setting up environment variables...
if not exist .env (
  if exist .env.example (
    copy .env.example .env
    echo ✅ Created .env from .env.example
    echo ⚠️  Please edit .env with your configuration
  ) else (
    echo ⚠️  .env.example not found
  )
) else (
  echo ✅ .env file already exists
)
echo.

REM Step 4: Install dependencies
echo 📦 Installing dependencies...
call npm install
if %ERRORLEVEL% NEQ 0 (
  echo ❌ npm install failed
  pause
  exit /b 1
)
echo ✅ Dependencies installed
echo.

REM Step 5: Create initial database structure
echo 🗄️  Initializing database...
if not exist database\ojt_system.db (
  type nul > database\ojt_system.db
)
echo ✅ Database file created
echo.

REM Step 6: Display status
echo ╔════════════════════════════════════════════╗
echo ║  ✅ Setup Complete!                       ║
echo ╚════════════════════════════════════════════╝
echo.

echo 📝 Next Steps:
echo.
echo 1️⃣  Edit .env file with your configuration:
echo    - Change JWT_SECRET to a strong random value
echo    - Configure database if needed
echo    - Set CORS_ORIGIN for frontend
echo.
echo 2️⃣  Start development server:
echo    npm run dev
echo.
echo 3️⃣  Test the API:
echo    curl http://localhost:5000/health
echo.
echo 📚 Documentation:
echo    - README.md for setup and API documentation
echo    - docs\ folder for detailed documentation
echo.
echo For more info, see README.md
echo.

pause
