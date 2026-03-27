// healthProviderRoute.js
import express from 'express';
import searchControllers from '../controllers/searchController.js';
import { ensureAuthenticated } from '../middleware/auth.js';
import { generalLimiter } from '../middleware/rateLimiter.js';

const router = express.Router();

// Apply authentication to all routes
router.use(ensureAuthenticated);

// Endpoint to get all user roles
router.get('/roles', generalLimiter, searchControllers.getAllRoles);
// Endpoint to get appropriate information based on a specific role
router.get('/roles/:role', generalLimiter, searchControllers.getAppropriateByRole);
//Endpoint to get only verified doctors
router.get('/verifiedDoctors', generalLimiter, searchControllers.getVerifiedDoctors);
router.get('/doctors', generalLimiter, searchControllers.searchDoctorsBySpecialty);





export default router;
