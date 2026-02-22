/**
 * Robust date utility for IST (Asia/Kolkata) normalization.
 * IST is UTC+5:30
 */

const IST_OFFSET = 5.5 * 60 * 60 * 1000;

/**
 * Normalizes any date input to a Date object representing the start of that day in IST.
 * Returns a standard Date object which internally represents 18:30 UTC of the previous day,
 * which is 00:00 IST of the target day.
 */
export function normalizeToISTDate(input) {
    const date = input ? new Date(input) : new Date();

    // Get IST components using offset
    const istTime = new Date(date.getTime() + IST_OFFSET);
    const day = istTime.getUTCDate();
    const month = istTime.getUTCMonth();
    const year = istTime.getUTCFullYear();

    // Create UTC midnight for that day
    const utcMidnight = Date.UTC(year, month, day);

    // Subtract IST offset to get IST midnight in UTC terms
    return new Date(utcMidnight - IST_OFFSET);
}

/**
 * Gets the current or specified time as a Date object whose components
 * reflect IST when accessed via UTC methods.
 */
export function getISTTime(input) {
    const date = input ? new Date(input) : new Date();
    return new Date(date.getTime() + IST_OFFSET);
}

/**
 * Formats a date as YYYY-MM-DD in IST.
 */
export function formatISTDate(input) {
    const istDate = getISTTime(input);
    const year = istDate.getUTCFullYear();
    const month = String(istDate.getUTCMonth() + 1).padStart(2, '0');
    const day = String(istDate.getUTCDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
}
