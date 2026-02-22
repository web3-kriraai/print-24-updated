import express from 'express';
import { authMiddleware, requireAdmin } from '../../middlewares/authMiddleware.js';
import { authorizePhysicalDesigner } from '../middlewares/authorizePhysicalDesigner.js';
import {
    bookVisitHandler,
    getMyBookingsHandler,
    acceptVisitHandler,
    startVisitHandler,
    endVisitHandler,
    getAllBookingsHandler,
    getDesignerBookingsHandler,
    getDesignerStatsHandler,
    getReportHandler,
    cancelVisitHandler,
    getAvailableDesignersHandler,
    getDesignerSlotsHandler,
    getOfficeConfigHandler,
    updateOfficeConfigHandler
} from '../controllers/physicalBooking.controller.js';
import {
    getMyAvailability,
    updateMyAvailability
} from '../controllers/availability.controller.js';

const router = express.Router();

// ─────────────────────────────────────────────────────────────────────────────
// CUSTOMER ROUTES
// ─────────────────────────────────────────────────────────────────────────────

// Book a physical designer visit
// POST /api/physical/book
router.post('/book', authMiddleware, bookVisitHandler);

// Get customer's own bookings
// GET /api/physical/my-bookings
router.get('/my-bookings', authMiddleware, getMyBookingsHandler);

// Get available designers for a specific date
// GET /api/physical/designers?date=YYYY-MM-DD
router.get('/designers', authMiddleware, getAvailableDesignersHandler);

// Get available slots for a designer on a specific date
// GET /api/physical/:id/slots?date=YYYY-MM-DD
router.get('/:id/slots', authMiddleware, getDesignerSlotsHandler);

// ─────────────────────────────────────────────────────────────────────────────
// ADMIN ROUTES
// Note: These must be defined BEFORE /:id routes to avoid route conflicts
// ─────────────────────────────────────────────────────────────────────────────

// Get all bookings (with optional ?status= filter)
// GET /api/physical/all
router.get('/all', authMiddleware, requireAdmin, getAllBookingsHandler);

// Get admin report with revenue analytics (optional ?startDate= &endDate= filters)
// GET /api/physical/report
router.get('/report', authMiddleware, requireAdmin, getReportHandler);

// Get office configuration (any authenticated user)
// GET /api/physical/office-config
router.get('/office-config', authMiddleware, getOfficeConfigHandler);

// Update office configuration (admin only)
// PUT /api/physical/office-config
router.put('/office-config', authMiddleware, requireAdmin, updateOfficeConfigHandler);

// ─────────────────────────────────────────────────────────────────────────────
// DESIGNER ROUTES
// ─────────────────────────────────────────────────────────────────────────────

// Get bookings assigned to the designer
// GET /api/physical/designer-bookings
router.get('/designer-bookings', authMiddleware, authorizePhysicalDesigner, getDesignerBookingsHandler);

// Get aggregate stats for the logged-in designer
// GET /api/physical/designer-stats
router.get('/designer-stats', authMiddleware, authorizePhysicalDesigner, getDesignerStatsHandler);

// Get designer's own availability settings
// GET /api/physical/availability
router.get('/availability', authMiddleware, authorizePhysicalDesigner, getMyAvailability);

// Update designer's own availability settings
// POST /api/physical/availability
router.post('/availability', authMiddleware, authorizePhysicalDesigner, updateMyAvailability);

// Accept a booking (assigned designer only)
// PATCH /api/physical/:id/accept
router.patch('/:id/accept', authMiddleware, authorizePhysicalDesigner, acceptVisitHandler);

// Start a visit — begins time tracking (assigned designer only)
// PATCH /api/physical/:id/start
router.patch('/:id/start', authMiddleware, authorizePhysicalDesigner, startVisitHandler);

// End a visit — calculates billing (assigned designer only)
// PATCH /api/physical/:id/end
router.patch('/:id/end', authMiddleware, authorizePhysicalDesigner, endVisitHandler);

// ─────────────────────────────────────────────────────────────────────────────
// ADMIN PARAMETERIZED ROUTES
// ─────────────────────────────────────────────────────────────────────────────

// Cancel a booking (admin only)
// PATCH /api/physical/:id/cancel
router.patch('/:id/cancel', authMiddleware, requireAdmin, cancelVisitHandler);

export default router;
