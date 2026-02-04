/**
 * COMPLAINT MANAGEMENT SYSTEM - Staff Time Limit Utilities
 * Created: 2026-02-04
 * 
 * Purpose: Calculate time limits for complaint registration based on user role
 * Per Spec:
 * - Customer: 7 days
 * - Agent/Distributor: 15 days
 * - Support Officer: 15-20 days (random)
 * - Senior Support/Team Leader: 25 days
 * - Manager: 30 days
 * - Admin: No limit
 */

/**
 * Get allowed complaint registration days for staff members
 * @param {string} staffLevel - Staff level from User.staffLevel
 * @returns {number|null} Number of days allowed, or null for unlimited (Admin)
 */
export const getStaffTimeLimit = (staffLevel) => {
    const limits = {
        SUPPORT_OFFICER: () => 15 + Math.floor(Math.random() * 6), // Random 15-20 days
        SENIOR_SUPPORT: 25,
        TEAM_LEADER: 25,
        MANAGER: 30,
        ADMIN: null, // No time limit
    };

    if (!staffLevel) return null;

    if (staffLevel === 'SUPPORT_OFFICER') {
        return limits.SUPPORT_OFFICER();
    }

    return limits[staffLevel] !== undefined ? limits[staffLevel] : null;
};

/**
 * Get time limit based on user type
 * @param {string} userType - 'CUSTOMER', 'AGENT', 'DISTRIBUTOR', 'PRINTS24_STAFF'
 * @param {string} staffLevel - Staff level (if PRINTS24_STAFF)
 * @returns {number|null} Number of days allowed
 */
export const getTimeLimitForUser = (userType, staffLevel = null) => {
    if (userType === 'PRINTS24_STAFF' && staffLevel) {
        return getStaffTimeLimit(staffLevel);
    }

    const timeLimits = {
        CUSTOMER: 7,
        AGENT: 15,
        DISTRIBUTOR: 15,
    };

    return timeLimits[userType] || 7; // Default to customer limit
};

/**
 * Check if current time is within complaint registration time limit
 * Per Spec: Time limit starts from DELIVERY date only
 * Complaints CAN be registered before delivery (for order delays)
 * 
 * @param {Date} deliveryDate - Order delivery date
 * @param {string} userType - User type
 * @param {string} staffLevel - Staff level (optional)
 * @returns {boolean} True if within time limit
 */
export const isWithinTimeLimit = (deliveryDate, userType, staffLevel = null) => {
    // If no delivery date, complaint can be registered (order delays, etc.)
    if (!deliveryDate) {
        return true;
    }

    const timeLimitDays = getTimeLimitForUser(userType, staffLevel);

    // Admin has no time limit
    if (timeLimitDays === null) {
        return true;
    }

    const complaintDeadline = new Date(deliveryDate);
    complaintDeadline.setDate(complaintDeadline.getDate() + timeLimitDays);

    return new Date() <= complaintDeadline;
};

/**
 * Get remaining days to register complaint
 * @param {Date} deliveryDate - Order delivery date
 * @param {string} userType - User type
 * @param {string} staffLevel - Staff level (optional)
 * @returns {number|null} Remaining days, or null if no limit/not delivered
 */
export const getRemainingDays = (deliveryDate, userType, staffLevel = null) => {
    if (!deliveryDate) {
        return null; // Order not delivered yet
    }

    const timeLimitDays = getTimeLimitForUser(userType, staffLevel);

    if (timeLimitDays === null) {
        return null; // No limit
    }

    const complaintDeadline = new Date(deliveryDate);
    complaintDeadline.setDate(complaintDeadline.getDate() + timeLimitDays);

    const now = new Date();
    const diffTime = complaintDeadline - now;
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

    return diffDays > 0 ? diffDays : 0;
};

/**
 * Get user-friendly time limit message
 * @param {string} userType - User type
 * @param {string} staffLevel - Staff level (optional)
 * @returns {string} Message describing time limit
 */
export const getTimeLimitMessage = (userType, staffLevel = null) => {
    const days = getTimeLimitForUser(userType, staffLevel);

    if (days === null) {
        return 'No time limit (Admin access)';
    }

    if (userType === 'CUSTOMER') {
        return `Customers can register complaints within ${days} days after delivery.`;
    }

    if (userType === 'AGENT' || userType === 'DISTRIBUTOR') {
        return `Agents/Distributors can register complaints within ${days} days after delivery.`;
    }

    if (userType === 'PRINTS24_STAFF') {
        return `Staff (${staffLevel}) can register complaints within ${days} days after order date.`;
    }

    return `Complaint can be registered within ${days} days after delivery.`;
};

/**
 * Validate complaint eligibility with detailed response
 * @param {Date} deliveryDate - Order delivery date
 * @param {string} orderStatus - Current order status
 * @param {string} userType - User type
 * @param {string} staffLevel - Staff level (optional)
 * @returns {Object} Eligibility result with message
 */
export const validateComplaintEligibility = (deliveryDate, orderStatus, userType, staffLevel = null) => {
    // Check if within time limit
    const withinLimit = isWithinTimeLimit(deliveryDate, userType, staffLevel);

    if (!withinLimit) {
        const message = userType === 'CUSTOMER'
            ? 'The complaint time limit for this order has expired as per company policy. Customers can complain within 7 days.'
            : userType === 'AGENT' || userType === 'DISTRIBUTOR'
                ? 'The complaint time limit for this order has expired as per company policy. Agents/Distributors within 15 days from delivery.'
                : 'The complaint time limit for this order has expired.';

        return {
            eligible: false,
            reason: 'TIME_LIMIT_EXCEEDED',
            message,
        };
    }

    return {
        eligible: true,
        message: 'Complaint can be registered.',
        remainingDays: getRemainingDays(deliveryDate, userType, staffLevel),
    };
};
