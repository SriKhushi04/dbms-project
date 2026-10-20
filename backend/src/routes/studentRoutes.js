import express from 'express';
import { getMyProfile, getMyApplication } from '../controllers/studentController.js';
import { authenticate, requireRole } from '../middleware/auth.js';

const router = express.Router();

router.get('/me', authenticate, requireRole('STUDENT'), getMyProfile);
router.get('/me/application', authenticate, requireRole('STUDENT'), getMyApplication);

export default router;

