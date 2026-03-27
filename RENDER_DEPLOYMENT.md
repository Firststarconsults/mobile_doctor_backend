# 🚀 Mobile Doctor Backend - Render Deployment Guide

## 📋 **Step-by-Step Render Deployment**

### **Step 1: Prepare Your Code**

#### **1.1 Ensure render.yaml is in root**
```
Mobile-Doctor-Backend-main/
├── render.yaml          ✅ (Created)
├── package.json         ✅
├── server.js           ✅
└── ...
```

#### **1.2 Push to GitHub**
```bash
# Make sure all changes are committed
git add .
git commit -m "Add Render deployment configuration"
git push origin main
```

---

### **Step 2: Create Render Account**

1. **Go to** [Render Dashboard](https://dashboard.render.com/)
2. **Sign up** with GitHub (easiest method)
3. **Connect your GitHub account**
4. **Grant Render access** to your repository

---

### **Step 3: Deploy Using Blueprint (Recommended)**

#### **3.1 Use Blueprint**
1. In Render Dashboard, click **"New"** → **"Blueprint"**
2. **Select your GitHub repository**
3. **Select branch**: `main` (or your default branch)
4. **Name**: `mobile-doctor-blueprint`
5. **Click "Apply"**

Render will automatically:
- ✅ Read `render.yaml`
- ✅ Create Web Service
- ✅ Configure environment variables
- ✅ Generate secrets (SESSION_SECRET, JWT_SECRET)
- ✅ Set up auto-deployment

---

### **Step 4: Set Up External Services**

#### **4.1 MongoDB Atlas (Database)**

1. **Create MongoDB Atlas Account**
   - Go to [MongoDB Atlas](https://www.mongodb.com/atlas)
   - Sign up/Sign in

2. **Create Cluster**
   - Click "Build a Database"
   - Choose **M0 (Free)** for testing or **M10** for production
   - Select cloud provider (AWS recommended with Render)
   - Choose region (same as Render: Oregon)

3. **Configure Security**
   - **Database Access** → Add New Database User
     - Username: `mobile-doctor-app`
     - Password: Auto-generate or create strong password
   - **Network Access** → Add IP Address
     - Click "Allow Access from Anywhere" (or add Render IPs later)

4. **Get Connection String**
   - Click "Connect" → "Connect your application"
   - Copy the connection string
   - Replace `<password>` with your database password

5. **Add to Render Environment Variables**
   - In Render Dashboard → Your Web Service → Environment
   - Add: `MONGODB_URI=your_connection_string_here`

---

#### **4.2 Firebase (Push Notifications)**

1. **Create Firebase Project**
   - Go to [Firebase Console](https://console.firebase.google.com/)
   - Click "Add Project"
   - Name: `mobile-doctor-prod`

2. **Get Service Account Key**
   - Project Settings → Service Accounts
   - Click "Generate New Private Key"
   - Download JSON file

3. **Extract and Add to Render**
   ```bash
   # From the downloaded JSON, add these to Render:
   FIREBASE_PROJECT_ID=your-project-id
   FIREBASE_CLIENT_EMAIL=firebase-adminsdk-xxxxx@your-project.iam.gserviceaccount.com
   FIREBASE_PRIVATE_KEY="-----BEGIN PRIVATE KEY-----\nYOUR_KEY_HERE\n-----END PRIVATE KEY-----\n"
   ```
   
   ⚠️ **Important**: The private key needs newlines. In Render, paste the entire key with `\n` characters, or use the JSON format and parse it in code.

---

#### **4.3 Twilio (SMS)**

1. **Create Twilio Account**
   - Go to [Twilio Console](https://www.twilio.com/console)
   - Sign up and verify your phone

2. **Get Credentials**
   - Dashboard → Account Info
   - Copy Account SID and Auth Token

3. **Get Phone Number**
   - Phone Numbers → Buy a Number
   - Choose a number with SMS capability

4. **Add to Render**
   ```bash
   TWILIO_ACCOUNT_SID=ACxxxxxxxxxxxxxxxxxxxxxxxxxxxxx
   TWILIO_AUTH_TOKEN=your_auth_token
   TWILIO_PHONE_NUMBER=+1234567890
   ```

---

#### **4.4 Cloudinary (File Storage)**

1. **Create Cloudinary Account**
   - Go to [Cloudinary](https://cloudinary.com/)
   - Sign up for free account

2. **Get Credentials**
   - Dashboard → Account Details
   - Copy Cloud Name, API Key, API Secret

3. **Add to Render**
   ```bash
   CLOUDINARY_CLOUD_NAME=your-cloud-name
   CLOUDINARY_API_KEY=your-api-key
   CLOUDINARY_API_SECRET=your-api-secret
   ```

---

#### **4.5 Paystack (Payments)**

1. **Create/Login Paystack Account**
   - Go to [Paystack](https://paystack.com/)
   - Complete business verification for live mode

2. **Get API Keys**
   - Settings → API Keys
   - Copy Secret Key

3. **Add to Render**
   ```bash
   # For testing (recommended first)
   PAYSTACK_SECRET_KEY=pk_test_YOUR_PAYSTACK_TEST_KEY_HERE
   
   # For production (after testing)
   PAYSTACK_SECRET_KEY=pk_live_YOUR_PAYSTACK_LIVE_KEY_HERE
   ```

4. **Set Up Webhook**
   - In Paystack Dashboard → Settings → Webhooks
   - Add webhook URL: `https://your-app.onrender.com/api/auth/paystack/webhook`

---

### **Step 5: Configure Environment Variables in Render**

After Blueprint deployment, go to your Web Service in Render Dashboard:

1. **Click on your service** → **Environment**
2. **Add the following variables**:

#### **Required Variables**
```bash
# MongoDB
MONGODB_URI=mongodb+srv://mobile-doctor-app:PASSWORD@cluster0.xxxxx.mongodb.net/mbdb?retryWrites=true&w=majority

# Client URL (your frontend URL, or same as backend for now)
CLIENT_URL=https://mobile-doctor-api.onrender.com

# Google OAuth (Optional - only if using Google login)
CLIENT_ID=your-google-oauth-client-id
CLIENT_SECRET=your-google-oauth-client-secret

# Email (Gmail)
G_MAIL=your-email@gmail.com
GOOGLE_APPPASSWORD=your-16-char-app-password

# All other service credentials from Step 4
```

3. **Click "Save Changes"**
4. **Render will automatically redeploy**

---

### **Step 6: Deploy and Test**

#### **6.1 Monitor Deployment**
1. Go to your Web Service in Render Dashboard
2. Click **"Logs"** tab to see deployment progress
3. Wait for **"Your service is live"** message

#### **6.2 Test Health Endpoint**
```bash
curl https://mobile-doctor-api.onrender.com/api/health

# Expected response:
{
  "status": "ok",
  "database": "connected",
  "uptime": 123.456,
  "timestamp": "2026-03-27T17:00:00.000Z"
}
```

#### **6.3 Test Security**
```bash
# Should return 401 Unauthorized
curl -X POST https://mobile-doctor-api.onrender.com/api/admin/updateKycVerificationStatus/123
```

---

### **Step 7: Custom Domain (Optional)**

1. **Buy Domain**
   - Use Namecheap, GoDaddy, or any registrar
   - Example: `mobile-doctor-api.com`

2. **Add to Render**
   - Dashboard → Your Service → Settings → Custom Domains
   - Add your domain
   - Render will provide DNS records

3. **Configure DNS**
   - Go to your domain registrar
   - Add CNAME record pointing to Render
   - Wait for DNS propagation (can take up to 48 hours)

4. **Update Environment Variables**
   ```bash
   CLIENT_URL=https://your-custom-domain.com
   DOMAIN=your-custom-domain.com
   ```

---

### **Step 8: Enable Auto-Deploy**

1. In Render Dashboard → Your Service → Settings
2. **Auto-Deploy**: Enabled (default)
3. Now every `git push` will automatically deploy!

---

## 📊 **Render Plans & Pricing**

### **Free Tier (Testing)**
- **Web Service**: 512 MB RAM, 0.1 CPU
- **Bandwidth**: 100 GB/month
- **Build minutes**: 500/month
- **Uptime**: Spins down after 15 min idle (slow first request)

### **Starter Plan ($7/month)**
- **Web Service**: 512 MB RAM, 0.5 CPU
- **Always on**: No spin-down
- **Good for**: Small production apps

### **Standard Plan ($25/month)**
- **Web Service**: 1 GB RAM, 1 CPU
- **Auto-scaling**: Up to 3 instances
- **Good for**: Production with traffic

### **Production Recommendation**
- **Database**: MongoDB Atlas M10 ($57/month)
- **Web Service**: Standard Plan ($25/month)
- **Redis**: Starter ($0/month with limits)
- **Total**: ~$82/month for full production setup

---

## 🔧 **Troubleshooting**

### **Build Fails**
```bash
# Check package.json exists
# Check all dependencies are in package.json
# Check Node version compatibility
```

### **Database Connection Fails**
```bash
# Verify MONGODB_URI is set correctly
# Check MongoDB Atlas IP whitelist
# Ensure password is URL-encoded if special characters
```

### **Environment Variables Not Working**
```bash
# Variables are case-sensitive
# Check for trailing spaces
# Redeploy after changing variables
```

### **Service Shows "Deploying" Forever**
```bash
# Check logs for errors
# Ensure health check endpoint (/api/health) returns 200
# Check if PORT is set to 10000 (Render requirement)
```

---

## 🎉 **Success!**

After completing these steps, your Mobile Doctor Backend will be:
- ✅ **Live on Render**
- ✅ **Connected to MongoDB Atlas**
- ✅ **Secured with environment variables**
- ✅ **Auto-deploying on git push**
- ✅ **Accessible via HTTPS**

**Your API URL**: `https://mobile-doctor-api.onrender.com`

---

## 📱 **Next Steps**

1. **Test all endpoints** with Postman or curl
2. **Set up frontend** to use your Render URL
3. **Configure CORS** if needed (add frontend URL to allowed origins)
4. **Monitor usage** in Render Dashboard
5. **Scale up** as your user base grows

**You're now deployed on Render!** 🚀
