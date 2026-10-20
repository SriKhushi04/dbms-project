import express from 'express';
import { createGroup, joinGroup, getGroupDetails } from '../controllers/groupController.js';
import { authenticate, requireRole } from '../middleware/auth.js';

const router = express.Router();

router.post('/', authenticate, requireRole('STUDENT'), createGroup);
router.post('/join', authenticate, requireRole('STUDENT'), joinGroup);
router.get('/:id', authenticate, getGroupDetails);

export default router;

