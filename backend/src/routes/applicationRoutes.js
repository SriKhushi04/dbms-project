import express from 'express';
import { savePreferences, submitApplication, getApplicationResult } from '../controllers/applicationController.js';
import { authenticate } from '../middleware/auth.js';

const router = express.Router();

router.put('/:id/preferences', authenticate, savePreferences);
router.post('/:id/submit', authenticate, submitApplication);
router.get('/:id/result', authenticate, getApplicationResult);

export default router;

