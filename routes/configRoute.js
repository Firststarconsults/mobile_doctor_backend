// routes.js or similar
import express from 'express';
import { updateConfiguration } from '../controllers/configController.js';

const router = express.Router();

router.post('/', updateConfiguration);

export default router;
