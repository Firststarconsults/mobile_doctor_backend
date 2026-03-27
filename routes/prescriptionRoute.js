import express from 'express';
import prescriptionController from '../controllers/presscriptionController.js';
import { ensureAuthenticated, ensureOwner, ensureHealthProvider, ensurePatient } from '../middleware/auth.js';
import { validateObjectId } from '../middleware/validation.js';
import { generalLimiter, prescriptionLimiter } from '../middleware/rateLimiter.js';

const router = express.Router();

// Apply authentication to all routes
router.use(ensureAuthenticated);

// Route for creating a prescription
router.post('/createPrescription/:doctorId', validateObjectId("doctorId"), ensureHealthProvider, prescriptionLimiter, prescriptionController.makePrescriptions);
router.post('/share-prescription/:patientId', validateObjectId("patientId"), ensureOwner, prescriptionLimiter, prescriptionController.sharePrescription);

// Provider operations
router.post('/status/:providerId', validateObjectId("providerId"), ensureHealthProvider, prescriptionLimiter, prescriptionController.updatePrescriptionStatus);
router.post('/costing/:providerId', validateObjectId("providerId"), ensureHealthProvider, prescriptionLimiter, prescriptionController.addCosting);
router.post('/upload-result/:providerId', validateObjectId("providerId"), ensureHealthProvider, prescriptionLimiter, prescriptionController.uploadTestResult);

// Patient operations
router.post('/approve-costing/:patientId', validateObjectId("patientId"), ensurePatient, prescriptionLimiter, prescriptionController.approveCosting);

// Status updates
router.post('/prescription-status/:providerId', validateObjectId("providerId"), ensureHealthProvider, prescriptionLimiter, prescriptionController.updatePrescriptionStatus);

// Read operations with proper authorization
router.get('/test-results/:patientId', validateObjectId("patientId"), ensureOwner, generalLimiter, prescriptionController.getTestResults);
router.get('/costing-details/:prescriptionId', validateObjectId("prescriptionId"), generalLimiter, prescriptionController.getCostingDetails);
router.post('/provider-prescriptions/:providerId', validateObjectId("providerId"), ensureHealthProvider, generalLimiter, prescriptionController.getProviderPrescriptions);
router.post('/providerSingle-prescriptions/:providerId', validateObjectId("providerId"), ensureHealthProvider, generalLimiter, prescriptionController.providerSinglePrescription);
router.get('/prescriptions/patient/:patientId', validateObjectId("patientId"), ensureOwner, generalLimiter, prescriptionController.getPatientPrescriptions);
router.get('/get-prescription/:prescriptionId', validateObjectId("prescriptionId"), generalLimiter, prescriptionController.getPrescription);
router.get('/get-sessionid/:doctorId/:patientId', validateObjectId("doctorId"), validateObjectId("patientId"), generalLimiter, prescriptionController.getSessionId);

export default router;
