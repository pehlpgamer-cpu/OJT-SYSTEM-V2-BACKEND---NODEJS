#!/bin/bash

# OJT System V2 - Backend Setup Script
# 
# WHY: Automates initial setup process to prevent manual errors
# and ensure consistent development environment setup
#
# WHAT: Creates directories, copies env files, installs deps

set -e  # Exit on any error

echo "╔════════════════════════════════════════════╗"
echo "║   OJT System V2 - Backend Setup Script     ║"
echo "╚════════════════════════════════════════════╝"
echo ""

# Color codes for output
GREEN='\033[0;32m'
BLUE='\033[0;34m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Step 1: Create required directories
echo -e "${BLUE}📁 Creating project directories...${NC}"
mkdir -p database logs src/{config,models,middleware,services,utils,routes,controllers}
echo -e "${GREEN}✅ Directories created${NC}"
echo ""

# Step 2: Check Node.js installation
echo -e "${BLUE}🔍 Checking Node.js installation...${NC}"
if ! command -v node &> /dev/null; then
  echo -e "${YELLOW}⚠️  Node.js is not installed. Please install Node.js 16+${NC}"
  echo "Visit: https://nodejs.org/"
  exit 1
fi

NODE_VERSION=$(node -v)
echo -e "${GREEN}✅ Node.js ${NODE_VERSION} found${NC}"
echo ""

# Step 3: Copy environment file
echo -e "${BLUE}⚙️  Setting up environment variables...${NC}"
if [ ! -f .env ]; then
  if [ -f .env.example ]; then
    cp .env.example .env
    echo -e "${GREEN}✅ Created .env from .env.example${NC}"
    echo -e "${YELLOW}⚠️  Please edit .env with your configuration${NC}"
  else
    echo -e "${YELLOW}⚠️  .env.example not found${NC}"
  fi
else
  echo -e "${GREEN}✅ .env file already exists${NC}"
fi
echo ""

# Step 4: Install dependencies
echo -e "${BLUE}📦 Installing dependencies...${NC}"
npm install
echo -e "${GREEN}✅ Dependencies installed${NC}"
echo ""

# Step 5: Create initial database structure
echo -e "${BLUE}🗄️  Initializing database...${NC}"
touch database/ojt_system.db
chmod 666 database/ojt_system.db
echo -e "${GREEN}✅ Database file created${NC}"
echo ""

# Step 6: Display status
echo -e "${GREEN}╔════════════════════════════════════════════╗${NC}"
echo -e "${GREEN}║  ✅ Setup Complete!                       ║${NC}"
echo -e "${GREEN}╚════════════════════════════════════════════╝${NC}"
echo ""

echo "📝 Next Steps:"
echo ""
echo "1️⃣  Edit .env file with your configuration:"
echo "   - Change JWT_SECRET to a strong random value"
echo "   - Configure database if needed"
echo "   - Set CORS_ORIGIN for frontend"
echo ""
echo "2️⃣  Start development server:"
echo "   npm run dev"
echo ""
echo "3️⃣  Test the API:"
echo "   curl http://localhost:5000/health"
echo ""
echo "📚 Documentation:"
echo "   - README.md for setup and API documentation"
echo "   - docs/ folder for detailed documentation"
echo ""
echo -e "${BLUE}For more info, see README.md${NC}"
