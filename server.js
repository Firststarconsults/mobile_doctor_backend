// server.js - Updated with enhanced Socket.io implementation
import 'dotenv/config';
import express from "express";
import session from 'express-session';
import passport from 'passport';
import bodyParser from "body-parser";
import fileUpload from "express-fileupload";
import cors from 'cors';
import timeout from 'connect-timeout';
import { connect, checkConnection } from "./config/connectionState.js";
import authRoute from "./routes/authRoute.js";
import userRouter from './routes/userRoute.js';
import providerRouter from './routes/healthProviderRoute.js';
import searchRouter from './routes/searchRoute.js';
import adminRouter from './routes/adminRoute.js';
import messageRoute from './routes/messageRoute.js';
import configRoute from './routes/configRoute.js';
import medicalReportRoute from './routes/medicalReportRoute.js';
import prescriptionRoute from './routes/prescriptionRoute.js';
import notificationRoute from './routes/notificationRoute.js';
import http from 'http'; 
import { Server } from 'socket.io';
import { setupTransactionStatusChecker } from './utils/transactionStatusChecker.js';
import { setupSocketHandlers } from './utils/socketHandler.js';
import { errorHandler, notFound } from './middleware/errorHandler.js';
import helmet from 'helmet';
import { setCSRFToken, csrfProtection } from './middleware/csrf.js';

const app = express();

const server = http.createServer(app);

// Enhanced Socket.io configuration
const io = new Server(server, {
  cors: {
    origin: process.env.CLIENT_URL || '*',
    methods: ['GET', 'POST'],
    credentials: true
  },
  pingTimeout: 60000, // 60 seconds
  pingInterval: 25000, // 25 seconds
  transports: ['websocket', 'polling'],
  allowEIO3: true
});

// Security headers first
app.use(helmet({
  contentSecurityPolicy: {
    directives: {
      defaultSrc: ["'self'"],
      styleSrc: ["'self'", "'unsafe-inline'", "https://fonts.googleapis.com"],
      fontSrc: ["'self'", "https://fonts.gstatic.com"],
      imgSrc: ["'self'", "data:", "https:", "blob:"],
      scriptSrc: ["'self'"],
      connectSrc: ["'self'", "https://api.cloudinary.com"],
      frameSrc: ["'none'"],
      objectSrc: ["'none'"],
      mediaSrc: ["'self'"],
      manifestSrc: ["'self'"]
    }
  },
  crossOriginEmbedderPolicy: false,
  hsts: {
    maxAge: 31536000,
    includeSubDomains: true,
    preload: true
  }
}));

// CORS configuration
app.use(cors({
  origin: process.env.CLIENT_URL || '*',
  credentials: true
}));

app.use(bodyParser.urlencoded({ extended: true }));
app.use(express.json());

app.use(session({
  secret: process.env.SESSION_SECRET,
  resave: false,
  saveUninitialized: false,
  rolling: true, // Reset expiration on every request
  cookie: {
    secure: process.env.NODE_ENV === 'production', // Only send over HTTPS in production
    httpOnly: true, // Prevent client-side JavaScript access
    maxAge: 24 * 60 * 60 * 1000, // 24 hours
    sameSite: 'strict', // Prevent CSRF attacks
    path: '/',
    domain: process.env.NODE_ENV === 'production' ? process.env.DOMAIN : undefined
  },
  name: 'sessionId', // Custom session name (avoid default)
  unset: 'destroy' // Properly clean up session
}));

app.use(passport.initialize());
app.use(passport.session());

// CSRF protection (after session middleware)
app.use(setCSRFToken);

// Apply CSRF protection to state-changing routes (temporarily disabled for testing)
// app.use('/api', csrfProtection);

app.use(
    fileUpload({
      useTempFiles: true,
      tempFileDir: process.env.UPLOAD_TEMP_DIR || '/tmp/',
      limits: { 
        fileSize: parseInt(process.env.MAX_FILE_SIZE) || 50 * 1024 * 1024, // 50MB max file size
        files: 5 // Maximum 5 files per request
      },
      abortOnLimit: true,
      responseOnLimit: 'File size limit exceeded',
      createParentPath: true,
      safeFileNames: true, // Remove non-alphanumeric characters
      preserveExtension: true, // Keep file extensions
      debug: process.env.NODE_ENV === 'development',
      limitHandler: (req, res, next) => {
        console.error('File upload limit exceeded:', {
          ip: req.ip,
          userAgent: req.get('User-Agent'),
          timestamp: new Date().toISOString()
        });
        res.status(413).json({
          message: 'File size limit exceeded',
          maxSize: parseInt(process.env.MAX_FILE_SIZE) || 50 * 1024 * 1024
        });
      }
    })
  );

app.use(timeout('25s'));
app.use((req, res, next) => {
  if (!req.timedout) next();
});

// Connect to database
connect();

// Setup enhanced Socket.io handlers
setupSocketHandlers(io);

// Routes
app.use("/api/auth", authRoute);
app.use("/api/user", userRouter);
app.use("/api/provider", providerRouter);
app.use("/api/search", searchRouter);
app.use("/api/admin", adminRouter);
app.use("/api/medical-report", medicalReportRoute);
app.use("/api/prescription", prescriptionRoute);
app.use("/api/config", configRoute);
app.use('/api/messages', messageRoute);
app.use('/api/notification', notificationRoute);

// Health check endpoints
app.get("/api", (req, res) => {
    res.json({ 
      message: "Welcome to /api",
      status: "active",
      timestamp: new Date().toISOString()
    });
});

app.get("/", (req, res) => {
    res.json({ 
      message: "Welcome to Mobile Doctor API",
      version: "1.0.0",
      status: "running"
    });
});

app.get("/api/health", (req, res) => {
  const dbStatus = checkConnection();
  res.json({
    status: "ok",
    database: dbStatus.isConnected ? "connected" : "disconnected",
    uptime: process.uptime(),
    timestamp: new Date().toISOString()
  });
});

// 404 handler for undefined routes
app.use(notFound);

// Enhanced error handling middleware
app.use(errorHandler);

// Export io for use in other modules
export { io };

// Start server
const PORT = process.env.PORT || 3000;

// Connect to database before starting server
connect().then(() => {
  server.listen(PORT, () => {
    console.log(`Server is listening on port ${PORT}`);
    console.log(`Environment: ${process.env.NODE_ENV || 'development'}`);
    
    // Start the transaction status checker
    const connectionCheckInterval = setInterval(() => {
      const connectionStatus = checkConnection();
      if (connectionStatus.isConnected) {
        clearInterval(connectionCheckInterval);
        setupTransactionStatusChecker(30);
        console.log('Transaction status checker initialized');
      } else {
        console.log('Waiting for database connection before initializing transaction checker...');
      }
    }, 5000);
  });
}).catch((error) => {
  console.error('Failed to connect to database:', error);
  console.log('Server will start without database connection...');
  server.listen(PORT, () => {
    console.log(`Server is listening on port ${PORT}`);
    console.log(`Environment: ${process.env.NODE_ENV || 'development'}`);
    console.log('Warning: Database not connected');
  });
});

// Graceful shutdown
process.on('SIGTERM', () => {
  console.log('SIGTERM signal received: closing HTTP server');
  server.close(() => {
    console.log('HTTP server closed');
    process.exit(0);
  });
});

process.on('SIGINT', () => {
  console.log('SIGINT signal received: closing HTTP server');
  server.close(() => {
    console.log('HTTP server closed');
    process.exit(0);
  });
});