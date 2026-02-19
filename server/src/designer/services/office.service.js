import OfficeConfig from '../models/OfficeConfig.js';

/**
 * Centrailzed service for Office Hours logic.
 */
export async function getOfficeConfig() {
    try {
        let config = await OfficeConfig.findOne();
        if (!config) {
            // Default config if none exists
            return {
                startHour: 9,
                endHour: 20,
                holidays: [],
                isOpen: true
            };
        }
        return config;
    } catch (error) {
        console.error("[OfficeService] Error fetching config:", error);
        return null;
    }
}

/**
 * Checks if a specific Date object falls within office hours.
 * @param {Date} date - The date/time to check (defaults to current time if null)
 * @returns {Object} - { isAllowed: boolean, message: string }
 */
export async function isWithinOfficeHours(date = new Date()) {
    try {
        const config = await getOfficeConfig();
        // Force 9 AM to 8 PM (20:00) as requested by user
        const startHour = 9;
        const endHour = 20;
        // Get Time in Kolkata
        const kolkataTime = new Date(date.toLocaleString("en-US", { timeZone: "Asia/Kolkata" }));
        const currentHour = kolkataTime.getHours();
        const dayOfWeek = kolkataTime.getDay(); // 0 (Sun) to 6 (Sat)

        console.log(`[OfficeService] Checking hours. Kolkata Time: ${kolkataTime.toISOString()}, Hour: ${currentHour}, Day: ${dayOfWeek}`);

        // ── 1. Check Day of Week (Monday to Saturday) ─────────────────────────
        if (dayOfWeek === 0) {
            return {
                isAllowed: false,
                message: "Designers are away on Sundays. Please book between Monday and Saturday."
            };
        }

        // Format date as YYYY-MM-DD for holidays
        const year = kolkataTime.getFullYear();
        const month = String(kolkataTime.getMonth() + 1).padStart(2, '0');
        const day = String(kolkataTime.getDate()).padStart(2, '0');
        const dateStr = `${year}-${month}-${day}`;

        // ── 2. Check Holidays ──────────────────────────────────────────────────
        if (config?.holidays && config.holidays.includes(dateStr)) {
            return { isAllowed: false, message: `Designers are unavailable on this date (Holiday: ${dateStr}).` };
        }

        // ── 3. Check Hours (9:00 to 20:00) ──────────────────────────────────────
        // We override isOpen here or assume it's meant to be open during these hours
        // per user request "so no error come".
        if (currentHour < startHour || currentHour >= endHour) {
            return {
                isAllowed: false,
                message: `Booking is outside of office hours (${startHour}:00 to ${endHour}:00 IST).`
            };
        }

        return { isAllowed: true };
    } catch (error) {
        console.error("[OfficeService] Error checking hours:", error);
        return { isAllowed: false, message: "Internal error checking office hours" };
    }
}
