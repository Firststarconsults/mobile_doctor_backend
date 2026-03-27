import express from 'express';
import { updateMedicalReport, getMedicalReport, uploadTestResult, getTestResult } from '../controllers/medicalReportsController.js';
import { ensureAuthenticated, ensureOwner, ensureHealthProvider } from '../middleware/auth.js';
import { validateObjectId } from '../middleware/validation.js';
import { generalLimiter, uploadLimiter } from '../middleware/rateLimiter.js';

const router = express.Router();

// Apply authentication to all routes
router.use(ensureAuthenticated);

// Protected medical report operations
router.post('/create-medicalReport/:userId', validateObjectId("userId"), ensureOwner, uploadLimiter, updateMedicalReport);
router.get('/get-medicalReport/:userId', validateObjectId("userId"), ensureOwner, generalLimiter, getMedicalReport);
router.post('/upload-test-result/:userId', validateObjectId("userId"), ensureHealthProvider, uploadLimiter, uploadTestResult);
router.get('/test-result/:userId', validateObjectId("userId"), ensureOwner, generalLimiter, getTestResult);

export default router;
