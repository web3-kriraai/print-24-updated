/**
 * Generates time slots based on start time, end time, duration, and break duration.
 * 
 * @param {string} inTime - Start time (HH:mm)
 * @param {string} outTime - End time (HH:mm)
 * @param {number} slotDuration - Duration of each slot in minutes
 * @param {number} breakDuration - Break between slots in minutes
 * @returns {Array} - Array of objects { time: "HH:mm-HH:mm", start: "HH:mm", end: "HH:mm" }
 */
export function generateSlots(inTime, outTime, slotDuration, breakDuration = 0) {
    const slots = [];

    // Parse times into minutes from midnight
    const parseTime = (timeStr) => {
        const [hours, minutes] = timeStr.split(':').map(Number);
        return hours * 60 + minutes;
    };

    const formatTime = (totalMinutes) => {
        const hours = Math.floor(totalMinutes / 60);
        const minutes = totalMinutes % 60;

        // 12-hour format helper if needed, but we use "HH:mm" for logic
        const h = hours % 24;
        const pad = (n) => String(n).padStart(2, '0');

        // Return HH:mm (24h)
        return `${pad(h)}:${pad(minutes)}`;
    };

    const formatTime12 = (totalMinutes) => {
        let hours = Math.floor(totalMinutes / 60);
        const minutes = totalMinutes % 60;
        const ampm = hours >= 12 ? 'PM' : 'AM';
        hours = hours % 12;
        hours = hours ? hours : 12; // the hour '0' should be '12'
        const pad = (n) => String(n).padStart(2, '0');
        return `${pad(hours)}:${pad(minutes)} ${ampm}`;
    };

    let currentTime = parseTime(inTime);
    const endTime = parseTime(outTime);

    while (currentTime + slotDuration <= endTime) {
        const startStr = formatTime(currentTime);
        const endStr = formatTime(currentTime + slotDuration);

        const startStr12 = formatTime12(currentTime);
        const endStr12 = formatTime12(currentTime + slotDuration);

        slots.push({
            time: `${startStr12}-${endStr12}`,
            start: startStr,
            end: endStr
        });

        // Advance current time by slot duration + break
        currentTime += (slotDuration + breakDuration);
    }

    return slots;
}
