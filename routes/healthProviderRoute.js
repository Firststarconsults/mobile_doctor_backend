// healthProviderRoute.js
import express from 'express';
import healthProviderControllers from '../controllers/healthProviderController.js';
import { ensureAuthenticated, ensureOwner, ensureHealthProvider } from '../middleware/auth.js';
import { validateObjectId } from '../middleware/validation.js';
import { generalLimiter } from '../middleware/rateLimiter.js';

const router = express.Router();

// Apply authentication to all routes
router.use(ensureAuthenticated);



// Protected provider operations
router.post('/credentialsDetails/:providerId', validateObjectId("providerId"), ensureOwner, healthProviderControllers.setCredentials);
router.post('/otherProvidersCredentials/:providerId', validateObjectId("providerId"), ensureOwner, healthProviderControllers.setOtherCredentials);

// Reviews and recommendations
router.post('/:doctorId/reviews', validateObjectId("doctorId"), healthProviderControllers.addReview);
router.post('/recommend/:doctorId', validateObjectId("doctorId"), ensureHealthProvider, healthProviderControllers.recommendHealthProvider);
router.get('/recommendations/:patientId', validateObjectId("patientId"), ensureOwner, healthProviderControllers.getRecommendedProviders);

// Status and online management
router.put('/:doctorId/update-isOnline', validateObjectId("doctorId"), ensureOwner, healthProviderControllers.updateIsOnlineStatus);
router.get('/online-sponsored-doctors', generalLimiter, healthProviderControllers.getOnlineSponsoredDoctors);

// Public endpoints (read-only with basic auth)
router.get('/:doctorId/reviews', validateObjectId("doctorId"), generalLimiter, healthProviderControllers.getDoctorReviews);
router.get('/:providerId/isOnline', validateObjectId("providerId"), generalLimiter, healthProviderControllers.checkOnlineStatus);
router.get('/doctor-summary/:doctorId', validateObjectId("doctorId"), generalLimiter, healthProviderControllers.doctorSummary);
router.get('/doctors-patient/:doctorId', validateObjectId("doctorId"), ensureHealthProvider, healthProviderControllers.getPatientsOfDoctor);

// Public listings (read-only)
router.get('/top-rated-doctors', generalLimiter, healthProviderControllers.getTopRatedDoctors);
router.get('/therapists', generalLimiter, healthProviderControllers.getAllTherapists);
router.get('/pharmacies', generalLimiter, healthProviderControllers.getAllPharmacies);
router.get('/laboratories', generalLimiter, healthProviderControllers.getAllLaboratories);
router.get('/all-doctors', generalLimiter, healthProviderControllers.getAllDoctors);












export default router;
