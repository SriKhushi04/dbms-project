// ============================================================================
// HOSTELHUB MANAGEMENT MODULE ROUTES
// Maps REST endpoints with role-based access control and student validation
// ============================================================================

import express from 'express';
import {
  verifyManagementToken,
  requireRole,
  requireStudent
} from '../middleware/managementAuth.js';
import { createManagementController } from '../controllers/managementController.js';

export function createManagementRouter(pool) {
  const router = express.Router();
  const ctrl = createManagementController(pool);

  // --------------------------------------------------------------------------
  // 1. Authentication & Staff Account Setup
  // --------------------------------------------------------------------------
  router.post('/auth/setup-first-staff', (req, res) => ctrl.setupFirstStaff(req, res));
  router.post('/auth/staff-login', (req, res) => ctrl.staffLogin(req, res));
  router.post(
    '/auth/staff-create',
    verifyManagementToken,
    requireRole('WARDEN'),
    (req, res) => ctrl.createStaffAccount(req, res)
  );
  router.post('/auth/student-register', (req, res) => ctrl.studentRegister(req, res));
  router.post('/auth/student-login', (req, res) => ctrl.studentLogin(req, res));

  // --------------------------------------------------------------------------
  // 2. Feature 1: Maintenance & Complaints System
  // --------------------------------------------------------------------------
  router.post(
    '/complaints',
    verifyManagementToken,
    requireStudent,
    (req, res) => ctrl.createComplaint(req, res)
  );
  router.get(
    '/complaints/my',
    verifyManagementToken,
    requireStudent,
    (req, res) => ctrl.getMyComplaints(req, res)
  );
  router.get(
    '/complaints/admin',
    verifyManagementToken,
    requireRole('WARDEN'),
    (req, res) => ctrl.getAllComplaintsAdmin(req, res)
  );
  router.patch(
    '/complaints/:id/status',
    verifyManagementToken,
    requireRole('WARDEN'),
    (req, res) => ctrl.updateComplaintStatus(req, res)
  );
  router.get(
    '/complaints/stats',
    verifyManagementToken,
    requireRole('WARDEN'),
    (req, res) => ctrl.getComplaintStats(req, res)
  );

  // --------------------------------------------------------------------------
  // 3. Feature 2: Fees & Billing Management
  // --------------------------------------------------------------------------
  router.get(
    '/fees/my-ledger',
    verifyManagementToken,
    requireStudent,
    (req, res) => ctrl.getMyFeeLedger(req, res)
  );
  router.post(
    '/fees/pay',
    verifyManagementToken,
    requireStudent,
    (req, res) => ctrl.payFee(req, res)
  );
  router.get(
    '/fees/admin/ledger',
    verifyManagementToken,
    requireRole('ACCOUNTANT', 'WARDEN'),
    (req, res) => ctrl.getAllFeeLedgersAdmin(req, res)
  );

  // --------------------------------------------------------------------------
  // 4. Feature 3: Mess & Meal Management
  // --------------------------------------------------------------------------
  router.get('/mess/menu', (req, res) => ctrl.getMessMenu(req, res));
  router.put(
    '/mess/admin/menu/:day',
    verifyManagementToken,
    requireRole('MESS_SUPERVISOR', 'WARDEN'),
    (req, res) => ctrl.updateMessMenu(req, res)
  );
  router.get(
    '/mess/dietary-preference',
    verifyManagementToken,
    requireStudent,
    (req, res) => ctrl.getDietaryPreference(req, res)
  );
  router.put(
    '/mess/dietary-preference',
    verifyManagementToken,
    requireStudent,
    (req, res) => ctrl.setDietaryPreference(req, res)
  );
  router.post(
    '/mess/rebates',
    verifyManagementToken,
    requireStudent,
    (req, res) => ctrl.applyMessRebate(req, res)
  );
  router.get(
    '/mess/rebates/my',
    verifyManagementToken,
    requireStudent,
    (req, res) => ctrl.getMyRebates(req, res)
  );
  router.get(
    '/mess/admin/rebates',
    verifyManagementToken,
    requireRole('MESS_SUPERVISOR', 'WARDEN'),
    (req, res) => ctrl.getAllRebatesAdmin(req, res)
  );
  router.patch(
    '/mess/admin/rebates/:id',
    verifyManagementToken,
    requireRole('MESS_SUPERVISOR', 'WARDEN'),
    (req, res) => ctrl.updateRebateStatusAdmin(req, res)
  );

  // --------------------------------------------------------------------------
  // 5. Feature 4: Curfew & Gate-Pass Management
  // --------------------------------------------------------------------------
  router.post(
    '/gatepass/request',
    verifyManagementToken,
    requireStudent,
    (req, res) => ctrl.requestGatePass(req, res)
  );
  router.get(
    '/gatepass/my',
    verifyManagementToken,
    requireStudent,
    (req, res) => ctrl.getMyGatePasses(req, res)
  );
  router.get(
    '/gatepass/admin/requests',
    verifyManagementToken,
    requireRole('WARDEN', 'SECURITY_GUARD'),
    (req, res) => ctrl.getAllGatePassesAdmin(req, res)
  );
  router.patch(
    '/gatepass/admin/:id/decision',
    verifyManagementToken,
    requireRole('WARDEN'),
    (req, res) => ctrl.updateGatePassDecisionAdmin(req, res)
  );
  router.post(
    '/gatepass/security/log-movement',
    verifyManagementToken,
    requireRole('SECURITY_GUARD', 'WARDEN'),
    (req, res) => ctrl.logMovementSecurity(req, res)
  );

  return router;
}

export default createManagementRouter;
