/**
 * Status Transition Validation
 * Defines valid status transitions for complaint workflow
 */

// All possible complaint statuses
export const COMPLAINT_STATUS = {
    NEW: 'NEW',
    UNDER_REVIEW: 'UNDER_REVIEW',
    WAITING_FOR_CUSTOMER: 'WAITING_FOR_CUSTOMER',
    APPROVED_FOR_REPRINT: 'APPROVED_FOR_REPRINT',
    RESOLVED: 'RESOLVED',
    CLOSED: 'CLOSED',
    REJECTED: 'REJECTED',
    REOPENED: 'REOPENED'
};

// Valid status transition matrix
// Each status maps to array of allowed next statuses
export const STATUS_TRANSITIONS = {
    [COMPLAINT_STATUS.NEW]: [
        COMPLAINT_STATUS.UNDER_REVIEW,
        COMPLAINT_STATUS.REJECTED
    ],
    [COMPLAINT_STATUS.UNDER_REVIEW]: [
        COMPLAINT_STATUS.WAITING_FOR_CUSTOMER,
        COMPLAINT_STATUS.APPROVED_FOR_REPRINT,
        COMPLAINT_STATUS.REJECTED
    ],
    [COMPLAINT_STATUS.WAITING_FOR_CUSTOMER]: [
        COMPLAINT_STATUS.UNDER_REVIEW
    ],
    [COMPLAINT_STATUS.APPROVED_FOR_REPRINT]: [
        COMPLAINT_STATUS.RESOLVED
    ],
    [COMPLAINT_STATUS.RESOLVED]: [
        COMPLAINT_STATUS.CLOSED
    ],
    [COMPLAINT_STATUS.CLOSED]: [
        COMPLAINT_STATUS.REOPENED  // Only for staff
    ],
    [COMPLAINT_STATUS.REOPENED]: [
        COMPLAINT_STATUS.UNDER_REVIEW
    ],
    [COMPLAINT_STATUS.REJECTED]: []  // Terminal state
};

/**
 * Check if a status transition is valid
 * @param {string} currentStatus - Current complaint status
 * @param {string} newStatus - Desired new status
 * @returns {boolean} - True if transition is valid
 */
export const isValidTransition = (currentStatus, newStatus) => {
    if (!currentStatus || !newStatus) {
        return false;
    }

    // Same status is always valid (no change)
    if (currentStatus === newStatus) {
        return true;
    }

    const allowedStatuses = STATUS_TRANSITIONS[currentStatus];

    if (!allowedStatuses) {
        return false;
    }

    return allowedStatuses.includes(newStatus);
};

/**
 * Get allowed next statuses for current status
 * @param {string} currentStatus - Current complaint status
 * @param {object} user - User object with role info
 * @returns {array} - Array of allowed next statuses
 */
export const getAllowedNextStatuses = (currentStatus, user = null) => {
    if (!currentStatus) {
        return [];
    }

    let allowedStatuses = STATUS_TRANSITIONS[currentStatus] || [];

    // Special case: CLOSED → REOPENED only for staff
    if (currentStatus === COMPLAINT_STATUS.CLOSED && user) {
        const isStaff = user.role === 'admin' || user.role === 'emp';
        if (!isStaff) {
            allowedStatuses = allowedStatuses.filter(s => s !== COMPLAINT_STATUS.REOPENED);
        }
    }

    return allowedStatuses;
};

/**
 * Get user-friendly error message for invalid transition
 * @param {string} currentStatus - Current status
 * @param {string} newStatus - Attempted new status
 * @returns {string} - Error message
 */
export const getTransitionErrorMessage = (currentStatus, newStatus) => {
    const allowedStatuses = STATUS_TRANSITIONS[currentStatus] || [];

    if (allowedStatuses.length === 0) {
        return `Status "${currentStatus}" is a terminal state and cannot be changed.`;
    }

    const allowedList = allowedStatuses.join(', ');
    return `Invalid status transition from "${currentStatus}" to "${newStatus}". ` +
        `Allowed transitions: ${allowedList}`;
};

/**
 * Check if status requires specific role
 * @param {string} newStatus - Status being set
 * @param {object} user - User object
 * @returns {object} - { allowed: boolean, reason: string }
 */
export const checkStatusPermission = (newStatus, user) => {
    // APPROVED_FOR_REPRINT requires Team Lead or higher
    // For now, we only have admin/emp, so allow admin/emp
    if (newStatus === COMPLAINT_STATUS.APPROVED_FOR_REPRINT) {
        const isStaff = user.role === 'admin' || user.role === 'emp';
        if (!isStaff) {
            return {
                allowed: false,
                reason: 'Only staff can approve reprints'
            };
        }
    }

    // REOPENED requires staff
    if (newStatus === COMPLAINT_STATUS.REOPENED) {
        const isStaff = user.role === 'admin' || user.role === 'emp';
        if (!isStaff) {
            return {
                allowed: false,
                reason: 'Only staff can reopen complaints'
            };
        }
    }

    return { allowed: true };
};
