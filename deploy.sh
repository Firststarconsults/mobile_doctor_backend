#!/bin/bash

# 🚀 Mobile Doctor Backend - Production Deployment Script

echo "🚀 MOBILE DOCTOR BACKEND - PRODUCTION DEPLOYMENT"
echo "=============================================="

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Check if we're in production mode
if [ "$NODE_ENV" != "production" ]; then
    echo -e "${YELLOW}⚠️  Setting NODE_ENV to production...${NC}"
    export NODE_ENV=production
fi

# Step 1: Install production dependencies
echo -e "${BLUE}📦 Installing production dependencies...${NC}"
npm ci --production

if [ $? -ne 0 ]; then
    echo -e "${RED}❌ Failed to install dependencies${NC}"
    exit 1
fi

# Step 2: Check if production .env file exists
if [ ! -f ".env.production" ]; then
    echo -e "${RED}❌ .env.production file not found${NC}"
    echo -e "${YELLOW}💡 Please create .env.production with your production variables${NC}"
    exit 1
fi

# Step 3: Copy production environment
echo -e "${BLUE}🔧 Setting up production environment...${NC}"
cp .env.production .env

# Step 4: Check if PM2 is installed
if ! command -v pm2 &> /dev/null; then
    echo -e "${YELLOW}📥 Installing PM2 process manager...${NC}"
    npm install -g pm2
fi

# Step 5: Start/Restart the application
echo -e "${BLUE}🚀 Starting production server...${NC}"
pm2 start server.js --name "mobile-doctor-api" --env production

if [ $? -eq 0 ]; then
    echo -e "${GREEN}✅ Application started successfully!${NC}"
else
    echo -e "${RED}❌ Failed to start application${NC}"
    exit 1
fi

# Step 6: Save PM2 configuration
echo -e "${BLUE}💾 Saving PM2 configuration...${NC}"
pm2 save

# Step 7: Setup PM2 startup script
echo -e "${BLUE}🔧 Setting up PM2 startup script...${NC}"
pm2 startup

echo -e "${GREEN}🎉 Production deployment completed!${NC}"
echo -e "${BLUE}📊 Application status:${NC}"
pm2 status

echo -e "\n${YELLOW}📝 Next steps:${NC}"
echo -e "1. ${BLUE}Configure your domain and SSL certificate${NC}"
echo -e "2. ${BLUE}Set up MongoDB Atlas production database${NC}"
echo -e "3. ${BLUE}Configure Firebase and Twilio for production${NC}"
echo -e "4. ${BLUE}Test all endpoints at https://yourdomain.com${NC}"
echo -e "5. ${BLUE}Monitor logs with: pm2 logs mobile-doctor-api${NC}"

echo -e "\n${GREEN}🚀 Your Mobile Doctor Backend is now running in production!${NC}"
