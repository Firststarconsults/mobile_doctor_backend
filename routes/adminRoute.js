// adminRoute.js
import express from 'express';
import adminController from '../controllers/adminController.js';
import { ensureAuthenticated, ensureAdmin } from '../middleware/auth.js';
import {
  validateObjectId,
  validateAdminActions,
} from '../middleware/validation.js';
import {
  adminLimiter,
  generalLimiter,
} from '../middleware/rateLimiter.js';

const router = express.Router();



// All admin routes require authentication and admin role
router.use(ensureAuthenticated);
router.use(ensureAdmin);

// KYC and verification management
router.post('/updateKycVerificationStatus/:adminId', validateObjectId("adminId"), adminLimiter, validateAdminActions, adminController.updateKycVerificationStatus);
router.post('/updateConsultationFees/:adminId', validateObjectId("adminId"), adminLimiter, validateAdminActions, adminController.updateConsultationFees);
router.post('/setFeeForAllSpecialties/:adminId', validateObjectId("adminId"), adminLimiter, validateAdminActions, adminController.setFeeForAllSpecialties);

// Endpoint to update the isOnline status of a doctor
router.post('/doctors/update-sponsored-status', adminLimiter, validateAdminActions, adminController.updateSponsoredStatus);

// Doctor recommendations and credentials
router.post('/recommend-doctor/:id', validateObjectId("id"), adminLimiter, validateAdminActions, adminController.recommendDoctor);
router.post('/:adminId/user-transactions', validateObjectId("adminId"), adminLimiter, adminController.getUserTransactions);

// Public endpoints (read-only)
router.get('/recommended', generalLimiter, adminController.getRecommendedDoctors);
router.get('/get-credentials/:userId', validateObjectId("userId"), generalLimiter, adminController.getProvidersCredentials);
router.get('/statistics-cards', generalLimiter, adminController.getStatisticsCards);
router.get('/patient-stats', generalLimiter, adminController.getPatientStat);
router.get('/top-ailments', generalLimiter, adminController.getTopAilments);
router.get('/approveRequest', generalLimiter, adminController.approveRequest);
router.get('/approveRequestList', generalLimiter, adminController.approveRequestsList);
router.get('/patients', generalLimiter, adminController.GetPatients);
router.get('/pharmacies', generalLimiter, adminController.getAllPharmacies);
router.get('/laboratories', generalLimiter, adminController.getAllLaboratories);

// Protected admin operations
router.put('/set-approval-status/:adminId', validateObjectId("adminId"), adminLimiter, validateAdminActions, adminController.setApprovalStatus);
router.get('/:adminId/total-money-flow', validateObjectId("adminId"), adminLimiter, adminController.getTotalMoneyFlow);
router.post("/:adminId/credit-wallet", validateObjectId("adminId"), adminLimiter, validateAdminActions, adminController.creditWalletBalance);
router.post("/:adminId/deduct-wallet", validateObjectId("adminId"), adminLimiter, validateAdminActions, adminController.deductWalletBalance);

// User suspension management
router.post("/:adminId/suspend-user", validateObjectId("adminId"), adminLimiter, validateAdminActions, adminController.suspendUser);
router.get("/suspended-accounts", generalLimiter, adminController.getSuspendedAccounts);

// Transaction verification
router.get("/:adminId/verification-needed-transactions", validateObjectId("adminId"), adminLimiter, adminController.getVerificationNeededTransactions);
router.post("/:adminId/manually-verify-transaction", validateObjectId("adminId"), adminLimiter, validateAdminActions, adminController.manuallyVerifyTransaction);
router.post("/:adminId/check-transfer-status", validateObjectId("adminId"), adminLimiter, validateAdminActions, adminController.checkTransferStatusWithPaystack);

export default router;