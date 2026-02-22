/**
 * COMPLAINT MANAGEMENT SYSTEM - Routes
 * Created: 2026-02-04
 * 
 * All complaint-related API endpoints
 */

import express from 'express';
import {
    checkComplaintEligibility,
    registerComplaint,
    registerStaffComplaint,
    getComplaints,
    getComplaint,
    addMessage,
    updateStatus,
    reopenComplaint,
    getComplaintStats,
} from '../controllers/complaintController.js';
import {
    validateComplaintTimeLimit,
    validateSingleComplaintRule,
    validateProofOfMistake,
    validateComplaintPermissions,
    validateComplaintFields,
} from '../middlewares/complaintValidation.js';

// Import authentication middleware (adjust path as needed)
import { authMiddleware } from '../middlewares/authMiddleware.js';
import { adminAuth } from '../middlewares/roleMiddleware.js';

const router = express.Router();

// ============================================
// PUBLIC/CUSTOMER ROUTES
// ============================================

// All routes require authentication
router.use(authMiddleware);

/**
 * GET /api/complaints/check-eligibility/:orderId
 * Check if user can register complaint for an order
 * Returns: eligibility status, existing complaint info, time limit details
 */
router.get('/check-eligibility/:orderId', checkComplaintEligibility);

/**
 * POST /api/complaints/register
 * Register a new complaint
 * Body: { orderId, complaintType, description, images[], policyConfirmed }
 * Middleware: Time limit + single complaint validation
 */
router.post(
    '/register',
    validateComplaintFields,
    validateComplaintTimeLimit,
    validateSingleComplaintRule,
    registerComplaint
);

// ============================================
// STAFF-ONLY ROUTES
// ============================================

/**
 * POST /api/complaints/register-on-behalf
 * Staff register complaint on behalf of customer
 * Body: { orderId, complaintType, description, onBehalfOfUserId, proofOfMistake }
 * Requires: ADMIN or EMP role
 */
router.post(
    '/register-on-behalf',
    adminAuth,
    validateComplaintFields,
    validateProofOfMistake,
    registerStaffComplaint
);

/**
 * GET /api/complaints
 * Get complaints list with filters (Admin dashboard)
 * Query: status, type, startDate, endDate, assignedTo, registerSource, page, limit, search
 * Requires: ADMIN or EMP role
 */
router.get(
    '/',
    adminAuth,
    getComplaints
);

/**
 * GET /api/complaints/stats/dashboard
 * Get complaint statistics for dashboard
 * Query: startDate, endDate
 * Requires: ADMIN or EMP role
 */
router.get(
    '/stats/dashboard',
    adminAuth,
    getComplaintStats
);

// ============================================
// GENERIC ID ROUTES (MUST BE LAST)
// ============================================

/**
 * GET /api/complaints/:id
 * Get single complaint details with full conversation
 */
router.get('/:id', getComplaint);

/**
 * POST /api/complaints/:id/messages
 * Add a message to complaint conversation
 * Body: { message, isInternal?, attachments[] }
 */
router.post(
    '/:id/messages',
    validateComplaintPermissions('add_message'),
    addMessage
);

/**
 * PATCH /api/complaints/:id/status
 * Update complaint status
 * Body: { status, notes?, resolutionType?, resolutionNotes?, mistakeType?, assignedTo? }
 * Requires: ADMIN or EMP role
 */
router.patch(
    '/:id/status',
    adminAuth,
    validateComplaintPermissions('update_status'),
    updateStatus
);

/**
 * POST /api/complaints/:id/reopen
 * Reopen a closed complaint
 * Body: { reason }
 * Requires: ADMIN or EMP role
 */
router.post(
    '/:id/reopen',
    adminAuth,
    validateComplaintPermissions('reopen'),
    reopenComplaint
);

export default router;
