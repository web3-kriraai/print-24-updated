/**
 * COMPLAINT MANAGEMENT SYSTEM - Helper Functions
 * Created: 2026-02-04
 * 
 * Purpose: Common helper functions for complaint operations
 */

/**
 * Determine register source based on user role and type
 * @param {Object} user - User object
 * @returns {string} Register source
 */
export const getRegisterSource = (user) => {
    if (user.role === 'ADMIN' || user.role === 'EMP') {
        return 'PRINTS24_STAFF';
    }

    if (user.userType?.name === 'AGENT') {
        return 'AGENT';
    }

    if (user.userType?.name === 'DISTRIBUTOR') {
        return 'DISTRIBUTOR';
    }

    return 'CUSTOMER';
};

/**
 * Generate unique complaint ID
 * @param {string} mongoId - MongoDB ObjectId
 * @returns {string} Human-readable complaint ID
 */
export const generateComplaintId = (mongoId) => {
    const timestamp = Date.now().toString(36).toUpperCase();
    const mongoShort = mongoId.toString().slice(-6).toUpperCase();
    return `COMP-${timestamp}-${mongoShort}`;
};

/**
 * Get status color for UI
 * @param {string} status - Complaint status
 * @returns {string} Color class
 */
export const getStatusColor = (status) => {
    const colors = {
        NEW: 'blue',
        UNDER_REVIEW: 'yellow',
        WAITING_FOR_CUSTOMER: 'orange',
        APPROVED_FOR_REPRINT: 'green',
        RESOLVED: 'green',
        CLOSED: 'gray',
        REJECTED: 'red',
        REOPENED: 'purple',
    };

    return colors[status] || 'gray';
};

/**
 * Get status label for display
 * @param {string} status - Complaint status
 * @returns {string} Display label
 */
export const getStatusLabel = (status) => {
    const labels = {
        NEW: 'New Complaint',
        UNDER_REVIEW: 'Under Review',
        WAITING_FOR_CUSTOMER: 'Awaiting Customer Response',
        APPROVED_FOR_REPRINT: 'Approved for Reprint',
        RESOLVED: 'Resolved',
        CLOSED: 'Closed',
        REJECTED: 'Rejected',
        REOPENED: 'Reopened',
    };

    return labels[status] || status;
};

/**
 * Check if complaint can be reopened
 * @param {Object} complaint - Complaint object
 * @param {Object} user - User object
 * @returns {boolean} True if can reopen
 */
export const canReopenComplaint = (complaint, user) => {
    // Only staff can reopen
    if (user.role !== 'ADMIN' && user.role !== 'EMP') {
        return false;
    }

    // Can only reopen if closed/resolved/rejected
    return ['CLOSED', 'RESOLVED', 'REJECTED'].includes(complaint.status);
};

/**
 * Format time ago
 * @param {Date} date - Date to format
 * @returns {string} Formatted time
 */
export const formatTimeAgo = (date) => {
    const seconds = Math.floor((new Date() - new Date(date)) / 1000);

    let interval = seconds / 31536000;
    if (interval > 1) return Math.floor(interval) + ' years ago';

    interval = seconds / 2592000;
    if (interval > 1) return Math.floor(interval) + ' months ago';

    interval = seconds / 86400;
    if (interval > 1) return Math.floor(interval) + ' days ago';

    interval = seconds / 3600;
    if (interval > 1) return Math.floor(interval) + ' hours ago';

    interval = seconds / 60;
    if (interval > 1) return Math.floor(interval) + ' minutes ago';

    return 'just now';
};

/**
 * Check if SLA is breached (1 hour first response)
 * @param {Date} createdAt - Complaint created time
 * @param {Date} firstResponseTime - First response time
 * @returns {boolean} True if SLA breached
 */
export const isSlaBreached = (createdAt, firstResponseTime) => {
    if (!firstResponseTime) {
        const hoursSinceCreation = (new Date() - new Date(createdAt)) / (1000 * 60 * 60);
        return hoursSinceCreation > 1;
    }

    const responseTimeHours = (new Date(firstResponseTime) - new Date(createdAt)) / (1000 * 60 * 60);
    return responseTimeHours > 1;
};
