import {
    bookVisit,
    acceptVisit,
    startVisit,
    endVisit,
    cancelVisit,
    getCustomerBookings,
    getDesignerBookings,
    getAllBookings,
    getAvailableDesigners,
    getDesignerSlots,
    getDesignerPhysicalStats
} from '../services/physicalBooking.service.js';
import { getAdminReport } from '../services/physicalReport.service.js';
import { getIO } from '../config/socket.js';
import OfficeConfig from '../models/OfficeConfig.js';

import { formatISTDate } from '../../utils/dateUtils.js';

/**
 * physicalBooking.controller.js
 * 
 * Thin controller layer for Physical Designer Visit endpoints.
 * All business logic is delegated to the service layer.
 * 
 * Routes handled:
 * Customer:
 *   POST   /api/physical/book          → bookVisitHandler
 *   GET    /api/physical/my-bookings   → getMyBookingsHandler
 * 
 * Designer:
 *   PATCH  /api/physical/:id/accept    → acceptVisitHandler
 *   PATCH  /api/physical/:id/start     → startVisitHandler
 *   PATCH  /api/physical/:id/end       → endVisitHandler
 * 
 * Admin:
 *   GET    /api/physical/all           → getAllBookingsHandler
 *   GET    /api/physical/report        → getReportHandler
 *   PATCH  /api/physical/:id/cancel    → cancelVisitHandler
 */

// ─────────────────────────────────────────────────────────────────────────────
// CUSTOMER ENDPOINTS
// ─────────────────────────────────────────────────────────────────────────────

/**
 * POST /api/physical/book
 * Customer books a physical designer visit.
 */
export const bookVisitHandler = async (req, res) => {
    try {
        const customerId = req.user._id;
        const booking = await bookVisit(customerId, req.body);

        // Emit real-time update to all clients viewing this designer/date
        try {
            const io = getIO();
            const { designerId, visitDate, timeSlot } = booking;
            const { socketId } = req.body;

            // Format date to YYYY-MM-DD for room name (IST consistent)
            const dateStr = formatISTDate(visitDate);

            // IMPORTANT: Convert ObjectId fields to strings for frontend comparison
            const designerIdStr = designerId.toString();
            const timeSlotStr = (timeSlot || '').toString();

            // Use string designerId for room name consistency with frontend
            const roomName = `slots-${designerIdStr}-${dateStr}`;

            // Log room size for debugging
            const room = io.sockets.adapter.rooms.get(roomName);
            const roomSize = room ? room.size : 0;
            console.log(`[Socket] Room ${roomName} has ${roomSize} connected client(s)`);
            console.log(`[Socket] Emitting slotBooked to room: ${roomName} for slot: ${timeSlotStr}, designerId: ${designerIdStr}, senderSocketId: ${socketId || 'none'}`);

            io.to(roomName).emit('slotBooked', {
                designerId: designerIdStr,
                visitDate: dateStr,
                timeSlot: timeSlotStr,
                socketId
            });

            // Notify designated designer specifically
            io.to(`user_${designerId}`).emit('new_physical_booking', {
                bookingId: booking._id,
                message: 'You have a new physical designer visit assignment.'
            });

            console.log(`[Socket] Successfully emitted events for designer ${designerId}`);
        } catch (socketErr) {
            console.error('[Socket] Failed to emit socket events:', socketErr.message);
        }

        return res.status(201).json({
            success: true,
            message: 'Physical designer visit booked successfully.',
            booking
        });
    } catch (error) {
        console.error('[PhysicalBooking] bookVisit error:', error.message);
        return res.status(error.statusCode || 500).json({
            success: false,
            error: error.message || 'Failed to book visit.'
        });
    }
};

/**
 * GET /api/physical/my-bookings
 * Customer retrieves their own bookings.
 */
export const getMyBookingsHandler = async (req, res) => {
    try {
        const customerId = req.user._id;
        const bookings = await getCustomerBookings(customerId);

        return res.status(200).json({
            success: true,
            count: bookings.length,
            bookings
        });
    } catch (error) {
        console.error('[PhysicalBooking] getMyBookings error:', error.message);
        return res.status(500).json({
            success: false,
            error: error.message || 'Failed to fetch bookings.'
        });
    }
};

/**
 * GET /api/physical/designers
 * Fetches available designers for a specific date.
 * Query params: ?date=YYYY-MM-DD
 */
export const getAvailableDesignersHandler = async (req, res) => {
    try {
        const { date } = req.query;
        if (!date) {
            return res.status(400).json({ success: false, error: "Date is required." });
        }

        const { designers, officeInfo } = await getAvailableDesigners(date);
        return res.status(200).json({
            success: true,
            designers,
            officeInfo
        });
    } catch (error) {
        console.error('[PhysicalBooking] getAvailableDesigners error:', error.message);
        return res.status(500).json({
            success: false,
            error: error.message || 'Failed to fetch available designers.'
        });
    }
};

/**
 * GET /api/physical/:id/slots
 * Fetches available time slots for a designer on a specific date.
 * Query params: ?date=YYYY-MM-DD
 */
export const getDesignerSlotsHandler = async (req, res) => {
    try {
        const { id } = req.params;
        const { date } = req.query;

        if (!date) {
            return res.status(400).json({ success: false, error: "Date is required." });
        }

        const slots = await getDesignerSlots(id, date);
        return res.status(200).json({
            success: true,
            slots
        });
    } catch (error) {
        console.error('[PhysicalBooking] getDesignerSlots error:', error.message);
        return res.status(500).json({
            success: false,
            error: error.message || 'Failed to fetch available slots.'
        });
    }
};

// ─────────────────────────────────────────────────────────────────────────────
// DESIGNER ENDPOINTS
// ─────────────────────────────────────────────────────────────────────────────

/**
 * PATCH /api/physical/:id/accept
 * Assigned designer accepts the booking.
 */
export const acceptVisitHandler = async (req, res) => {
    try {
        const { id } = req.params;
        const designerId = req.user._id;
        const booking = await acceptVisit(id, designerId);

        // Notify Customer
        try {
            const io = getIO();
            io.to(`user_${booking.customerId}`).emit('physical_visit_update', {
                bookingId: booking._id,
                status: 'Accepted',
                message: 'Your designer has accepted the visit request.'
            });
        } catch (err) {
            console.error('[Socket] Update emit failed:', err.message);
        }

        return res.status(200).json({
            success: true,
            message: 'Visit accepted successfully.',
            booking
        });
    } catch (error) {
        console.error('[PhysicalBooking] acceptVisit error:', error.message);
        return res.status(error.statusCode || 500).json({
            success: false,
            error: error.message || 'Failed to accept visit.'
        });
    }
};

/**
 * PATCH /api/physical/:id/start
 * Designer starts the physical visit — begins time tracking.
 */
export const startVisitHandler = async (req, res) => {
    try {
        const { id } = req.params;
        const designerId = req.user._id;
        const booking = await startVisit(id, designerId);

        // Notify Customer
        try {
            const io = getIO();
            io.to(`user_${booking.customerId}`).emit('physical_visit_update', {
                bookingId: booking._id,
                status: 'InProgress',
                message: 'Your designer has started the visit.'
            });
        } catch (err) {
            console.error('[Socket] Update emit failed:', err.message);
        }

        return res.status(200).json({
            success: true,
            message: 'Visit started. Time tracking has begun.',
            booking,
            visitStartTime: booking.visitStartTime
        });
    } catch (error) {
        console.error('[PhysicalBooking] startVisit error:', error.message);
        return res.status(error.statusCode || 500).json({
            success: false,
            error: error.message || 'Failed to start visit.'
        });
    }
};

/**
 * PATCH /api/physical/:id/end
 * Designer ends the visit — calculates billing and updates designer earnings.
 */
export const endVisitHandler = async (req, res) => {
    try {
        const { id } = req.params;
        const designerId = req.user._id;
        const booking = await endVisit(id, designerId);

        // Notify Customer
        try {
            const io = getIO();
            io.to(`user_${booking.customerId}`).emit('physical_visit_update', {
                bookingId: booking._id,
                status: 'Completed',
                message: 'Visit completed! Billing details are now available.'
            });
        } catch (err) {
            console.error('[Socket] Update emit failed:', err.message);
        }

        return res.status(200).json({
            success: true,
            message: 'Visit completed. Billing has been calculated.',
            booking,
            billing: {
                totalDurationMinutes: booking.totalDurationMinutes,
                hourlyRate: booking.hourlyRate,
                baseAmount: booking.baseAmount,
                totalAmount: booking.totalAmount,
                advancePaid: booking.advancePaid,
                remainingAmount: booking.remainingAmount,
                paymentStatus: booking.paymentStatus
            }
        });
    } catch (error) {
        console.error('[PhysicalBooking] endVisit error:', error.message);
        return res.status(error.statusCode || 500).json({
            success: false,
            error: error.message || 'Failed to end visit.'
        });
    }
};

/**
 * GET /api/physical/designer-bookings
 * Designer retrieves their own assigned bookings.
 */
export const getDesignerBookingsHandler = async (req, res) => {
    try {
        const designerId = req.user._id;
        const bookings = await getDesignerBookings(designerId);

        return res.status(200).json({
            success: true,
            count: bookings.length,
            bookings
        });
    } catch (error) {
        console.error('[PhysicalBooking] getDesignerBookings error:', error.message);
        return res.status(error.statusCode || 500).json({
            success: false,
            error: error.message || 'Failed to fetch designer bookings.'
        });
    }
};

/**
 * GET /api/physical/designer-stats
 * Designer retrieves their aggregate physical visit stats.
 */
export const getDesignerStatsHandler = async (req, res) => {
    try {
        const designerId = req.user._id;
        const stats = await getDesignerPhysicalStats(designerId);

        return res.status(200).json({
            success: true,
            stats
        });
    } catch (error) {
        console.error('[PhysicalBooking] getDesignerStats error:', error.message);
        return res.status(500).json({
            success: false,
            error: error.message || 'Failed to fetch designer stats.'
        });
    }
};

// ─────────────────────────────────────────────────────────────────────────────
// ADMIN ENDPOINTS
// ─────────────────────────────────────────────────────────────────────────────

/**
 * GET /api/physical/all
 * Admin retrieves all bookings with optional status filter.
 * Query params: ?status=InProgress
 */
export const getAllBookingsHandler = async (req, res) => {
    try {
        const filters = {};
        if (req.query.status) filters.status = req.query.status;

        const bookings = await getAllBookings(filters);

        return res.status(200).json({
            success: true,
            count: bookings.length,
            bookings
        });
    } catch (error) {
        console.error('[PhysicalBooking] getAllBookings error:', error.message);
        return res.status(500).json({
            success: false,
            error: error.message || 'Failed to fetch bookings.'
        });
    }
};

/**
 * GET /api/physical/report
 * Admin gets aggregated report with revenue analytics.
 * Query params: ?startDate=2026-01-01&endDate=2026-12-31
 */
export const getReportHandler = async (req, res) => {
    try {
        const { startDate, endDate } = req.query;
        const report = await getAdminReport({ startDate, endDate });

        return res.status(200).json({
            success: true,
            report
        });
    } catch (error) {
        console.error('[PhysicalBooking] getReport error:', error.message);
        return res.status(500).json({
            success: false,
            error: error.message || 'Failed to generate report.'
        });
    }
};

/**
 * PATCH /api/physical/:id/cancel
 * Admin cancels a booking.
 * Body: { reason: "optional cancellation reason" }
 */
export const cancelVisitHandler = async (req, res) => {
    try {
        const { id } = req.params;
        const adminId = req.user._id;
        const { reason } = req.body;

        const booking = await cancelVisit(id, adminId, reason);

        // Notify Customer and Designer
        try {
            const io = getIO();
            const recipients = [`user_${booking.customerId}`];
            if (booking.designerId) recipients.push(`user_${booking.designerId}`);

            recipients.forEach(room => {
                io.to(room).emit('physical_visit_update', {
                    bookingId: booking._id,
                    status: 'Cancelled',
                    message: `Booking cancelled by admin: ${reason || 'No reason provided'}`
                });
            });
        } catch (err) {
            console.error('[Socket] Update emit failed:', err.message);
        }

        return res.status(200).json({
            success: true,
            message: 'Booking cancelled successfully.',
            booking
        });
    } catch (error) {
        console.error('[PhysicalBooking] cancelVisit error:', error.message);
        return res.status(error.statusCode || 500).json({
            success: false,
            error: error.message || 'Failed to cancel booking.'
        });
    }
};

// ─────────────────────────────────────────────────────────────────────────────
// OFFICE CONFIG ENDPOINTS
// ─────────────────────────────────────────────────────────────────────────────

/**
 * GET /api/physical/office-config
 * Returns the centralized office configuration.
 */
export const getOfficeConfigHandler = async (req, res) => {
    try {
        const config = await OfficeConfig.findOne().lean();
        if (!config) {
            return res.status(404).json({ success: false, error: 'Office configuration not found.' });
        }

        return res.status(200).json({
            success: true,
            officeConfig: {
                officeName: config.officeName || '',
                officeAddress: config.officeAddress || '',
                officePhone: config.officePhone || '',
                startHour: config.startHour,
                endHour: config.endHour,
                isOpen: config.isOpen,
                holidays: config.holidays || [],
                updatedAt: config.updatedAt
            }
        });
    } catch (error) {
        console.error('[PhysicalBooking] getOfficeConfig error:', error.message);
        return res.status(500).json({
            success: false,
            error: error.message || 'Failed to fetch office configuration.'
        });
    }
};

/**
 * PUT /api/physical/office-config
 * Admin updates the centralized office configuration.
 * Body: { officeName, officeAddress, officePhone, startHour, endHour, isOpen }
 */
export const updateOfficeConfigHandler = async (req, res) => {
    try {
        const { officeName, officeAddress, officePhone, startHour, endHour, isOpen } = req.body;
        const adminId = req.user._id;

        const updateFields = { updatedBy: adminId };
        if (officeName !== undefined) updateFields.officeName = officeName;
        if (officeAddress !== undefined) updateFields.officeAddress = officeAddress;
        if (officePhone !== undefined) updateFields.officePhone = officePhone;
        if (startHour !== undefined) updateFields.startHour = startHour;
        if (endHour !== undefined) updateFields.endHour = endHour;
        if (isOpen !== undefined) updateFields.isOpen = isOpen;

        const config = await OfficeConfig.findOneAndUpdate(
            {},
            { $set: updateFields },
            { new: true, upsert: true }
        );

        return res.status(200).json({
            success: true,
            message: 'Office configuration updated successfully.',
            officeConfig: config
        });
    } catch (error) {
        console.error('[PhysicalBooking] updateOfficeConfig error:', error.message);
        return res.status(500).json({
            success: false,
            error: error.message || 'Failed to update office configuration.'
        });
    }
};
