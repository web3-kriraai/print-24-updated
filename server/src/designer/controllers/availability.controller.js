import DesignerAvailability from '../models/DesignerAvailability.js';
import PhysicalDesignerBooking from '../models/PhysicalDesignerBooking.js';
import { generateSlots } from '../utils/slotGenerator.js';
import { normalizeToISTDate, formatISTDate, getISTTime } from '../../utils/dateUtils.js';

/**
 * GET /api/physical/availability
 * Fetch logged-in designer's availability settings.
 */
export const getMyAvailability = async (req, res) => {
    try {
        const designerId = req.user._id;
        let availability = await DesignerAvailability.findOne({ designerId });

        if (!availability) {
            // Return default settings if not exists
            availability = {
                inTime: '09:00',
                outTime: '18:00',
                slotDuration: 60,
                breakDuration: 0,
                weeklySchedule: [1, 2, 3, 4, 5, 6],
                disabledDates: []
            };
        }

        return res.status(200).json({
            success: true,
            availability
        });
    } catch (error) {
        console.error('[AvailabilityController] getMyAvailability error:', error.message);
        return res.status(500).json({ success: false, error: 'Failed to fetch availability.' });
    }
};

/**
 * POST /api/physical/availability
 * Update logged-in designer's availability settings.
 */
export const updateMyAvailability = async (req, res) => {
    try {
        const designerId = req.user._id;
        const { inTime, outTime, slotDuration, breakDuration, weeklySchedule, disabledDates } = req.body;

        const availability = await DesignerAvailability.findOneAndUpdate(
            { designerId },
            {
                $set: {
                    inTime,
                    outTime,
                    slotDuration,
                    breakDuration,
                    weeklySchedule,
                    disabledDates
                }
            },
            { new: true, upsert: true }
        );

        return res.status(200).json({
            success: true,
            message: 'Availability updated successfully.',
            availability
        });
    } catch (error) {
        console.error('[AvailabilityController] updateMyAvailability error:', error.message);
        return res.status(500).json({ success: false, error: 'Failed to update availability.' });
    }
};

/**
 * Internal helper for getAvailableSlots
 */
export const getSlotsForDesigner = async (designerId, dateStr) => {
    // 1. Fetch Availability Settings
    let availability = await DesignerAvailability.findOne({ designerId });
    if (!availability) {
        availability = {
            inTime: '09:00',
            outTime: '18:00',
            slotDuration: 60,
            breakDuration: 0,
            weeklySchedule: [1, 2, 3, 4, 5, 6],
            disabledDates: []
        };
    }

    const date = new Date(dateStr);
    const dayOfWeek = date.getDay();

    // 2. Check if day is disabled (weekly schedule or specific date)
    const isDayOff = !availability.weeklySchedule.includes(dayOfWeek);
    const isDateDisabled = availability.disabledDates.includes(dateStr);

    if (isDayOff || isDateDisabled) {
        return [];
    }

    // 3. Generate all possible slots
    const allSlots = generateSlots(
        availability.inTime,
        availability.outTime,
        availability.slotDuration,
        availability.breakDuration
    );

    // 4. Fetch existing bookings for this designer on this date
    const startOfDay = normalizeToISTDate(dateStr);
    const endOfDay = new Date(startOfDay.getTime() + (24 * 60 * 60 * 1000) - 1);

    const existingBookings = await PhysicalDesignerBooking.find({
        designerId,
        visitDate: { $gte: startOfDay, $lte: endOfDay },
        visitStatus: { $in: ['Scheduled', 'Accepted', 'InProgress'] }
    }).select('timeSlot isFullDay');

    // Check if FULL_DAY booking exists
    if (existingBookings.some(b => b.isFullDay)) {
        return [];
    }

    const bookedSlotTimes = existingBookings.map(b => b.timeSlot);

    // 5. Filter/Mark slots (Booked or Past)
    const todayStr = formatISTDate(new Date());
    const isToday = dateStr === todayStr;
    const isPastDate = dateStr < todayStr;
    const currentIST = getISTTime();
    const currentHourMin = `${String(currentIST.getUTCHours()).padStart(2, '0')}:${String(currentIST.getUTCMinutes()).padStart(2, '0')}`;

    return allSlots.map(slot => {
        const isBooked = bookedSlotTimes.includes(slot.time);

        // Slot is past if it's a past date, or if it's today and slot START time < current time
        const isPast = isPastDate || (isToday && slot.start < currentHourMin);

        return {
            ...slot,
            isBooked,
            isPast
        };
    });
};
