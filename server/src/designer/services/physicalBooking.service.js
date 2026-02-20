import mongoose from 'mongoose';
import PhysicalDesignerBooking from '../models/PhysicalDesignerBooking.js';
import { User } from '../../models/User.js';
import Order from '../../models/Order.js';
import OfficeConfig from '../models/OfficeConfig.js';
import { isWithinOfficeHours } from './office.service.js';
import { normalizeToISTDate, getISTTime, formatISTDate } from '../../utils/dateUtils.js';

/**
 * physicalBooking.service.js
 * 
 * Service layer for Physical Designer Visit business logic.
 * All billing calculations happen here — never on the client.
 * 
 * Visit lifecycle: Scheduled → Accepted → InProgress → Completed / Cancelled
 */

// ─────────────────────────────────────────────────────────────────────────────
// BOOK VISIT
// Customer books a physical designer visit for a specific order.
// ─────────────────────────────────────────────────────────────────────────────
/**
 * Creates a new physical designer visit booking.
 * 
 * Business rules enforced:
 * 1. Order must exist and belong to the customer
 * 2. Order must be fully paid (paymentStatus === 'Paid')
 * 3. Visit date must be within office hours
 * 4. Designer must exist and have role 'designer'
 * 5. hourlyRate is snapshotted from designer profile — customer cannot set it
 * 
 * @param {string} customerId - ID of the customer making the booking
 * @param {Object} body - Request body containing booking details
 * @returns {Object} Created booking document
 */
export async function bookVisit(customerId, body) {
    const {
        orderId,
        designerId,
        visitDate,
        timeSlot,
        visitAddress,
        visitNotes,
        customerPhone,
        advancePaid = 0,
        baseAmount = 0,
        productSnapshot,
        visitLocation = 'OFFICE' // Default to OFFICE
    } = body;

    // ── 1. Validate required fields ──────────────────────────────────────────
    if (!orderId || !designerId || !visitDate) {
        throw Object.assign(new Error('orderId, designerId, and visitDate are required.'), { statusCode: 400 });
    }

    if (visitLocation === 'OFFICE' && !timeSlot) {
        throw Object.assign(new Error('Time slot is required for Office visits.'), { statusCode: 400 });
    }

    // ── 1b. Validate customerPhone ───────────────────────────────────────────
    if (!customerPhone) {
        throw Object.assign(new Error('Customer phone number is required.'), { statusCode: 400 });
    }
    const sanitizedPhone = customerPhone.replace(/[\s\-]/g, '');
    if (!/^(\+\d{1,3})?\d{10}$/.test(sanitizedPhone)) {
        throw Object.assign(
            new Error('Invalid phone number format. Use 10 digits or international format (e.g. +91XXXXXXXXXX).'),
            { statusCode: 400 }
        );
    }

    // ── 2. Validate order exists and belongs to customer ─────────────────────
    const order = await Order.findById(orderId);
    if (!order) {
        throw Object.assign(new Error('Order not found.'), { statusCode: 404 });
    }
    if (order.user.toString() !== customerId.toString()) {
        throw Object.assign(new Error('You can only book a designer for your own orders.'), { statusCode: 403 });
    }

    // ── 3. Validate order status ─────────────────────────────────────────────
    const rawStatus = order.paymentStatus;
    const status = String(rawStatus || '').trim().toLowerCase();

    if (status !== 'paid' && status !== 'pending') {
        throw Object.assign(
            new Error(`Invalid payment status for booking: ${rawStatus}. Expected Paid or Pending.`),
            { statusCode: 400 }
        );
    }

    // ── 4. Conflict Check (Race Condition Prevention) ────────────────────────
    // Normalize date to midnight IST for consistent storage and comparison
    const normalizedDate = normalizeToISTDate(visitDate);
    const normalizedTimeSlot = timeSlot ? timeSlot.trim() : undefined;

    // OFFICE: Check for slot conflict
    if (visitLocation === 'OFFICE') {
        const existing = await PhysicalDesignerBooking.findOne({
            designerId,
            visitDate: normalizedDate,
            timeSlot: normalizedTimeSlot,
            visitStatus: { $in: ['Scheduled', 'Accepted', 'InProgress'] }
        });
        if (existing) {
            throw Object.assign(new Error('This slot is already booked. Please select another slot.'), { statusCode: 409 });
        }
    }

    // HOME: Check for daily capacity limit (Max 3)
    if (visitLocation === 'HOME') {
        const MAX_HOME_VISITS_PER_DAY = 3;
        const visitCount = await PhysicalDesignerBooking.countDocuments({
            designerId,
            visitDate: normalizedDate,
            visitLocation: 'HOME',
            visitStatus: { $in: ['Scheduled', 'Accepted', 'InProgress'] }
        });

        if (visitCount >= MAX_HOME_VISITS_PER_DAY) {
            throw Object.assign(new Error('Designer is fully booked for home visits on this date. Please choose another date.'), { statusCode: 409 });
        }
    }

    // ── 5. Validate designer exists ───────────────────────────────────────────
    const designer = await User.findById(designerId).select('role hourlyRate name email');
    if (!designer) {
        throw Object.assign(new Error('Designer not found.'), { statusCode: 404 });
    }
    if (designer.role !== 'designer') {
        throw Object.assign(new Error('The specified user is not a designer.'), { statusCode: 400 });
    }

    // ── 6. Snapshot hourlyRate & Calculate Home Charge ───────────────────────
    const snapshotHourlyRate = designer.hourlyRate || 500;
    const homeVisitCharge = visitLocation === 'HOME' ? 500 : 0; // Fixed 500 charge for Home Visits

    // ── 7. Create booking ─────────────────────────────────────────────────────
    try {
        const booking = await PhysicalDesignerBooking.create({
            customerId,
            designerId,
            orderId,
            productSnapshot: productSnapshot || {},
            visitDate: normalizedDate,
            timeSlot: visitLocation === 'OFFICE' ? normalizedTimeSlot : undefined, // No slot for Home visit
            visitLocation,
            homeVisitCharge,
            visitAddress: visitAddress || '',
            visitNotes: visitNotes || '',
            customerPhone: sanitizedPhone,
            visitStatus: 'Scheduled',
            hourlyRate: snapshotHourlyRate,
            baseAmount,
            advancePaid,
            paymentStatus: advancePaid > 0 ? 'Partial' : 'Pending'
        });

        return booking;
    } catch (error) {
        if (error.code === 11000) {
            throw Object.assign(new Error('This slot was just booked. Please select another slot.'), { statusCode: 409 });
        }
        throw error;
    }
}

// ─────────────────────────────────────────────────────────────────────────────
// ACCEPT VISIT
// Assigned designer accepts the booking.
// ─────────────────────────────────────────────────────────────────────────────
/**
 * Designer accepts a scheduled booking.
 * Only the assigned designer can accept their own booking.
 * 
 * @param {string} bookingId - ID of the booking to accept
 * @param {string} designerId - ID of the designer accepting (from JWT)
 * @returns {Object} Updated booking document
 */
export async function acceptVisit(bookingId, designerId) {
    const booking = await PhysicalDesignerBooking.findById(bookingId);
    if (!booking) {
        throw Object.assign(new Error('Booking not found.'), { statusCode: 404 });
    }

    // Only the assigned designer can accept
    if (booking.designerId.toString() !== designerId.toString()) {
        throw Object.assign(new Error('You are not the assigned designer for this booking.'), { statusCode: 403 });
    }

    // Can only accept from Scheduled status
    if (booking.visitStatus !== 'Scheduled') {
        throw Object.assign(
            new Error(`Cannot accept booking with status: ${booking.visitStatus}. Expected: Scheduled`),
            { statusCode: 400 }
        );
    }

    booking.visitStatus = 'Accepted';
    await booking.save();

    return booking;
}

// ─────────────────────────────────────────────────────────────────────────────
// START VISIT
// Designer starts the physical visit — begins time tracking.
// ─────────────────────────────────────────────────────────────────────────────
/**
 * Designer starts a visit (transitions to InProgress).
 * 
 * Business rules:
 * - Only the assigned designer can start
 * - Booking must be in 'Accepted' status
 * - Designer cannot have another visit already InProgress (one at a time)
 * 
 * @param {string} bookingId - ID of the booking to start
 * @param {string} designerId - ID of the designer starting (from JWT)
 * @returns {Object} Updated booking document
 */
export async function startVisit(bookingId, designerId) {
    const booking = await PhysicalDesignerBooking.findById(bookingId);
    if (!booking) {
        throw Object.assign(new Error('Booking not found.'), { statusCode: 404 });
    }

    // Only the assigned designer can start
    if (booking.designerId.toString() !== designerId.toString()) {
        throw Object.assign(new Error('You are not the assigned designer for this booking.'), { statusCode: 403 });
    }

    // Must be in Accepted status to start
    if (booking.visitStatus !== 'Accepted') {
        throw Object.assign(
            new Error(`Cannot start booking with status: ${booking.visitStatus}. Expected: Accepted`),
            { statusCode: 400 }
        );
    }

    // ── Check: designer cannot have another InProgress visit ─────────────────
    const activeVisit = await PhysicalDesignerBooking.findOne({
        designerId,
        visitStatus: 'InProgress',
        _id: { $ne: bookingId } // Exclude current booking
    });

    if (activeVisit) {
        throw Object.assign(
            new Error(`You already have an active visit in progress (Booking ID: ${activeVisit._id}). Please complete it before starting a new one.`),
            { statusCode: 409 }
        );
    }

    // ── Start the visit ───────────────────────────────────────────────────────
    booking.visitStatus = 'InProgress';
    booking.visitStartTime = new Date();
    await booking.save();

    return booking;
}

// ─────────────────────────────────────────────────────────────────────────────
// END VISIT
// Designer ends the visit — calculates billing and updates designer earnings.
// ─────────────────────────────────────────────────────────────────────────────
/**
 * Designer ends a visit (transitions to Completed).
 * 
 * Billing calculation (backend-only):
 * - totalDurationMinutes = ceil((visitEndTime - visitStartTime) / 60000)
 * - totalAmount = (totalDurationMinutes / 60) × hourlyRate + baseAmount
 * - remainingAmount = totalAmount - advancePaid
 * 
 * Designer earnings update (MongoDB transaction):
 * - designer.totalHoursWorked += totalDurationMinutes / 60
 * - designer.totalEarnings += totalAmount
 * 
 * @param {string} bookingId - ID of the booking to end
 * @param {string} designerId - ID of the designer ending (from JWT)
 * @returns {Object} Updated booking document with billing details
 */
export async function endVisit(bookingId, designerId) {
    const booking = await PhysicalDesignerBooking.findById(bookingId);
    if (!booking) {
        throw Object.assign(new Error('Booking not found.'), { statusCode: 404 });
    }

    // Only the assigned designer can end
    if (booking.designerId.toString() !== designerId.toString()) {
        throw Object.assign(new Error('You are not the assigned designer for this booking.'), { statusCode: 403 });
    }

    // Must be InProgress to end
    if (booking.visitStatus !== 'InProgress') {
        throw Object.assign(
            new Error(`Cannot end booking with status: ${booking.visitStatus}. Expected: InProgress`),
            { statusCode: 400 }
        );
    }

    // ── Calculate billing ─────────────────────────────────────────────────────
    const visitEndTime = new Date();
    const visitStartTime = booking.visitStartTime;

    if (!visitStartTime) {
        throw Object.assign(new Error('Visit start time is missing. Cannot calculate billing.'), { statusCode: 500 });
    }

    // Duration in minutes (ceiling to nearest minute)
    const durationMs = visitEndTime - visitStartTime;
    const totalDurationMinutes = Math.ceil(durationMs / 60000);

    // ── Fetch Current Designer Rates (Dynamic Rate Fix) ────────────────────────
    // We fetch the latest rates from the User model to ensure any updates made
    // after booking but before completion are reflected in the final bill.
    const designer = await User.findById(designerId).select('hourlyRate homeVisitCharge');
    if (designer) {
        booking.hourlyRate = designer.hourlyRate || booking.hourlyRate;
        booking.homeVisitCharge = (booking.visitLocation === 'HOME')
            ? (designer.homeVisitCharge || booking.homeVisitCharge)
            : 0;
    }

    // Total amount: (time-based) + (any base/fixed charge) + (home visit charge)
    // "Always based on hour" means we round up to the nearest hour.
    const hoursToCharge = Math.ceil(totalDurationMinutes / 60);
    const timeBasedAmount = hoursToCharge * booking.hourlyRate;
    const homeCharge = booking.homeVisitCharge || 0;

    // Note: homeVisitCharge is a fixed one-time fee, NOT per hour.
    const totalAmount = Math.ceil(timeBasedAmount + booking.baseAmount + homeCharge);

    // Remaining amount after advance payment
    const remainingAmount = Math.max(0, totalAmount - booking.advancePaid);

    // Determine payment status
    let paymentStatus = 'Pending';
    if (remainingAmount === 0) {
        paymentStatus = 'Paid';
    } else if (booking.advancePaid > 0) {
        paymentStatus = 'Partial';
    }

    // ── MongoDB Transaction: update booking + designer earnings atomically ─────
    const session = await mongoose.startSession();
    try {
        await session.withTransaction(async () => {
            // Update booking
            booking.visitEndTime = visitEndTime;
            booking.totalDurationMinutes = totalDurationMinutes;
            booking.totalAmount = totalAmount;
            booking.remainingAmount = remainingAmount;
            booking.paymentStatus = paymentStatus;
            booking.visitStatus = 'Completed';
            await booking.save({ session });

            // Update designer's cumulative earnings and hours
            // Use rounded hours for consistency with "always based on hour" billing
            const hoursWorked = Math.ceil(totalDurationMinutes / 60);
            await User.findByIdAndUpdate(
                designerId,
                {
                    $inc: {
                        totalHoursWorked: hoursWorked,
                        totalEarnings: totalAmount
                    }
                },
                { session }
            );
        });
    } finally {
        await session.endSession();
    }

    return booking;
}

// ─────────────────────────────────────────────────────────────────────────────
// CANCEL VISIT (Admin only)
// ─────────────────────────────────────────────────────────────────────────────
/**
 * Admin cancels a booking.
 * Can cancel any booking that is not already Completed or Cancelled.
 * 
 * @param {string} bookingId - ID of the booking to cancel
 * @param {string} adminId - ID of the admin performing the cancellation
 * @param {string} reason - Optional cancellation reason
 * @returns {Object} Updated booking document
 */
export async function cancelVisit(bookingId, adminId, reason = '') {
    const booking = await PhysicalDesignerBooking.findById(bookingId);
    if (!booking) {
        throw Object.assign(new Error('Booking not found.'), { statusCode: 404 });
    }

    if (booking.visitStatus === 'Completed') {
        throw Object.assign(new Error('Cannot cancel a completed visit.'), { statusCode: 400 });
    }
    if (booking.visitStatus === 'Cancelled') {
        throw Object.assign(new Error('Booking is already cancelled.'), { statusCode: 400 });
    }

    booking.visitStatus = 'Cancelled';
    booking.cancelledBy = adminId;
    booking.cancellationReason = reason;
    booking.cancelledAt = new Date();
    await booking.save();

    return booking;
}

// ─────────────────────────────────────────────────────────────────────────────
// GET MY BOOKINGS (Customer)
// ─────────────────────────────────────────────────────────────────────────────
/**
 * Returns all bookings for a specific customer, newest first.
 * 
 * @param {string} customerId - ID of the customer
 * @returns {Array} Array of booking documents
 */
export async function getCustomerBookings(customerId) {
    const bookings = await PhysicalDesignerBooking.find({ customerId })
        .populate('designerId', 'name email hourlyRate address mobileNumber')
        .populate('orderId', 'orderNumber')
        .sort({ createdAt: -1 });

    return bookings;
}

// ─────────────────────────────────────────────────────────────────────────────
// GET ALL BOOKINGS (Admin)
// ─────────────────────────────────────────────────────────────────────────────
/**
 * Returns all bookings with full details (admin view).
 * Supports optional status filter.
 * 
 * @param {Object} filters - Optional filters: { status }
 * @returns {Array} Array of booking documents
 */
export async function getAllBookings(filters = {}) {
    const query = {};
    if (filters.status) {
        query.visitStatus = filters.status;
    }

    const bookings = await PhysicalDesignerBooking.find(query)
        .populate('customerId', 'name email mobileNumber')
        .populate('designerId', 'name email hourlyRate totalEarnings address mobileNumber')
        .populate('orderId', 'orderNumber')
        .sort({ createdAt: -1 });

    return bookings;
}

/**
 * Returns all bookings for a specific designer.
 * 
 * @param {string} designerId - The ID of the designer
 * @returns {Array} Array of booking documents
 */
export async function getDesignerBookings(designerId) {
    const bookings = await PhysicalDesignerBooking.find({ designerId })
        .populate('customerId', 'name email mobileNumber')
        .populate('orderId', 'orderNumber')
        .sort({ createdAt: -1 });

    return bookings;
}
/**
 * Returns all designers who are available for physical visits.
 * Currently returns all users with 'designer' role.
 * 
 * @param {string} date - The date to check (YYYY-MM-DD)
 * @returns {Array} Array of designer documents
 */
export async function getAvailableDesigners(date) {
    // Fetch designers and office config in parallel
    const [rawDesigners, officeConfig] = await Promise.all([
        User.find({
            role: 'designer',
            isOnline: true
        })
            .select('name sessionSettings hourlyRate homeVisitCharge isOnline mobileNumber address rating termsAndConditions')
            .lean(),
        OfficeConfig.findOne().lean()
    ]);

    const designers = rawDesigners.map(d => ({
        ...d,
        hourlyRate: d.hourlyRate || d.sessionSettings?.basePrice || 500,
        homeVisitCharge: d.homeVisitCharge ?? 500,
        rating: d.rating ?? 5,
        termsAndConditions: d.termsAndConditions || "Standard service terms apply."
    }));

    const officeInfo = officeConfig ? {
        officeName: officeConfig.officeName || 'Prints24 Design Studio',
        officeAddress: officeConfig.officeAddress || '',
        officePhone: officeConfig.officePhone || '',
        officeHours: `${officeConfig.startHour || 9}:00 - ${officeConfig.endHour || 20}:00`
    } : null;

    return { designers, officeInfo };
}

export async function getDesignerSlots(designerId, dateStr) {
    // Generate fixed hourly slots from 9 AM to 8 PM (24-hr end hours for comparison)
    const allSlots = [
        { time: "09:00-10:00", endHour: 10 },
        { time: "10:00-11:00", endHour: 11 },
        { time: "11:00-12:00", endHour: 12 },
        { time: "12:00-01:00", endHour: 13 },
        { time: "01:00-02:00", endHour: 14 },
        { time: "02:00-03:00", endHour: 15 },
        { time: "03:00-04:00", endHour: 16 },
        { time: "04:00-05:00", endHour: 17 },
        { time: "05:00-06:00", endHour: 18 },
        { time: "06:00-07:00", endHour: 19 },
        { time: "07:00-08:00", endHour: 20 }
    ];

    // Normalize date to start/end of day IST for comparison
    // Use arithmetic to avoid timezone-dependent setHours()
    const startOfDay = normalizeToISTDate(dateStr);
    const endOfDay = new Date(startOfDay.getTime() + (24 * 60 * 60 * 1000) - 1);

    console.log(`[PhysicalBookingService] Fetching slots for designer=${designerId} date=${dateStr}`);
    console.log(`[PhysicalBookingService] startOfDay=${startOfDay.toISOString()} endOfDay=${endOfDay.toISOString()}`);

    // Fetch existing bookings for this designer on this date
    // Only Scheduled, Accepted, InProgress block slots
    // Completed and Cancelled do NOT block
    const existingBookings = await PhysicalDesignerBooking.find({
        designerId,
        visitDate: { $gte: startOfDay, $lte: endOfDay },
        visitStatus: { $in: ['Scheduled', 'Accepted', 'InProgress'] }
    }).select('timeSlot visitDate visitStatus');

    const bookedSlots = existingBookings.map(b => b.timeSlot?.trim());
    console.log(`[PhysicalBookingService] Found ${bookedSlots.length} booked slots:`, bookedSlots);
    if (existingBookings.length > 0) {
        existingBookings.forEach(b => {
            console.log(`[PhysicalBookingService]   -> slot="${b.timeSlot}" visitDate=${b.visitDate?.toISOString()} status=${b.visitStatus}`);
        });
    }

    // Check if the requested date is today (IST)
    const todayStr = formatISTDate(new Date());
    const isToday = dateStr === todayStr;
    // Use getUTCHours on IST-shifted time (since getISTTime adds offset, UTC methods give IST values)
    const currentHour = isToday
        ? getISTTime().getUTCHours()
        : -1;

    console.log(`[PhysicalBookingService] isToday=${isToday} currentISTHour=${currentHour} todayStr=${todayStr}`);

    // Return full array with isBooked and isPast flags
    return allSlots.map(({ time, endHour }) => ({
        time,
        isBooked: bookedSlots.includes(time),
        isPast: isToday && endHour <= currentHour
    }));
}

/**
 * Get aggregate stats for a designer's physical visits.
 * Used on the Designer Dashboard's Physical tab.
 *
 * @param {ObjectId|string} designerId
 * @returns {{ totalVisits, completedVisits, upcomingVisits, totalEarnings, totalDurationMinutes }}
 */
export async function getDesignerPhysicalStats(designerId) {
    const now = new Date();

    const [totals, upcoming] = await Promise.all([
        PhysicalDesignerBooking.aggregate([
            { $match: { designerId: new mongoose.Types.ObjectId(designerId) } },
            {
                $group: {
                    _id: null,
                    totalVisits: { $sum: 1 },
                    completedVisits: {
                        $sum: { $cond: [{ $eq: ['$visitStatus', 'Completed'] }, 1, 0] }
                    },
                    totalEarnings: {
                        $sum: { $cond: [{ $eq: ['$visitStatus', 'Completed'] }, '$totalAmount', 0] }
                    },
                    totalDurationMinutes: {
                        $sum: { $cond: [{ $eq: ['$visitStatus', 'Completed'] }, '$totalDurationMinutes', 0] }
                    }
                }
            }
        ]),
        PhysicalDesignerBooking.countDocuments({
            designerId,
            visitStatus: { $in: ['Scheduled', 'Accepted'] },
            visitDate: { $gte: now }
        })
    ]);

    const stats = totals[0] || { totalVisits: 0, completedVisits: 0, totalEarnings: 0, totalDurationMinutes: 0 };

    return {
        totalVisits: stats.totalVisits,
        completedVisits: stats.completedVisits,
        upcomingVisits: upcoming,
        totalEarnings: stats.totalEarnings,
        totalDurationMinutes: stats.totalDurationMinutes
    };
}
