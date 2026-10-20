import express from 'express';
import {
  getDashboardMetrics,
  closeSubmissions,
  triggerAllocation,
  getAllocationResults,
  publishResults,
  markBatchVacated,
  getStudentsList,
  getApplicationsList,
  getAuditLogs
} from '../controllers/adminController.js';
import { authenticate, requireRole } from '../middleware/auth.js';

const router = express.Router();

// Enforce ADMIN role for all routes in this router
router.use(authenticate, requireRole('ADMIN'));

router.get('/dashboard', getDashboardMetrics);
router.get('/students', getStudentsList);
router.get('/applications', getApplicationsList);
router.get('/audit-logs', getAuditLogs);

router.post('/batches/:id/close', closeSubmissions);
router.post('/batches/:id/allocate', triggerAllocation);
router.get('/batches/:id/allocation-results', getAllocationResults);
router.post('/batches/:id/publish', publishResults);
router.post('/batches/:id/mark-vacated', markBatchVacated);

export default router;

