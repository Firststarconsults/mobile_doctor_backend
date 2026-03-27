@echo off
REM 🚀 Mobile Doctor Backend - Production Deployment Script (Windows)

echo 🚀 MOBILE DOCTOR BACKEND - PRODUCTION DEPLOYMENT
echo ==============================================

REM Set production environment
set NODE_ENV=production

REM Step 1: Install production dependencies
echo 📦 Installing production dependencies...
npm ci --production
if %errorlevel% neq 0 (
    echo ❌ Failed to install dependencies
    pause
    exit /b 1
)

REM Step 2: Check if production .env file exists
if not exist ".env.production" (
    echo ❌ .env.production file not found
    echo 💡 Please create .env.production with your production variables
    pause
    exit /b 1
)

REM Step 3: Copy production environment
echo 🔧 Setting up production environment...
copy .env.production .env

REM Step 4: Check if PM2 is installed
pm2 --version >nul 2>&1
if %errorlevel% neq 0 (
    echo 📥 Installing PM2 process manager...
    npm install -g pm2
)

REM Step 5: Start/Restart the application
echo 🚀 Starting production server...
pm2 start server.js --name "mobile-doctor-api" --env production
if %errorlevel% neq 0 (
    echo ❌ Failed to start application
    pause
    exit /b 1
)

REM Step 6: Save PM2 configuration
echo 💾 Saving PM2 configuration...
pm2 save

REM Step 7: Setup PM2 startup script
echo 🔧 Setting up PM2 startup script...
pm2 startup

echo.
echo 🎉 Production deployment completed!
echo 📊 Application status:
pm2 status

echo.
echo 📝 Next steps:
echo 1. Configure your domain and SSL certificate
echo 2. Set up MongoDB Atlas production database
echo 3. Configure Firebase and Twilio for production
echo 4. Test all endpoints at https://yourdomain.com
echo 5. Monitor logs with: pm2 logs mobile-doctor-api

echo.
echo 🚀 Your Mobile Doctor Backend is now running in production!
pause
