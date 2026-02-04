/**
 * COMPLAINT MANAGEMENT SYSTEM - Email Notification Service
 * Created: 2026-02-04
 * 
 * Handles sending emails for complaint events
 */

import { emailTemplates } from '../templates/complaintEmails.js';
import Complaint from '../models/ComplaintSchema.js';

// Import your existing email service (adjust path as needed)
// Assumed you have a sendEmail function in utils or services
import { sendEmail } from '../utils/emailService.js'; // Adjust import based on your actual email service

/**
 * Send complaint-related emails
 * @param {string} eventType - Type of event: 'registered', 'statusUpdate', 'staffOnBehalf', 'reopened', 'newMessage'
 * @param {object} data - Data for email template
 */
export const sendComplaintEmail = async (eventType, data) => {
    try {
        const template = emailTemplates[eventType];

        if (!template) {
            console.error(`[Email Service] Unknown event type: ${eventType}`);
            return;
        }

        const htmlContent = template(data);

        // Subject lines based on event type
        const subjects = {
            registered: `Complaint Registered - ${data.orderNumber}`,
            statusUpdate: `Complaint Status Updated - ${data.complaintId}`,
            staffOnBehalf: `Complaint Registered on Your Behalf - ${data.orderNumber}`,
            reopened: `Complaint Reopened - ${data.complaintId}`,
            newMessage: `New Message on Your Complaint - ${data.complaintId}`,
        };

        const subject = subjects[eventType] || 'Complaint Update';

        // Send email
        const emailResult = await sendEmail({
            to: data.recipientEmail || data.customerEmail,
            subject,
            html: htmlContent,
        });

        // Log notification in complaint record
        if (data.complaintId) {
            await Complaint.findByIdAndUpdate(data.complaintId, {
                $push: {
                    notificationLogs: {
                        sentAt: new Date(),
                        type: 'EMAIL',
                        recipient: data.recipientEmail || data.customerEmail,
                        subject,
                        body: htmlContent.substring(0, 500), // Store first 500 chars
                        status: emailResult?.success ? 'SENT' : 'FAILED',
                        messageId: emailResult?.messageId,
                        errorMessage: emailResult?.error,
                    },
                },
            });
        }

        return emailResult;
    } catch (error) {
        console.error('[Email Service] Error sending complaint email:', error);

        // Log failed notification
        if (data.complaintId) {
            await Complaint.findByIdAndUpdate(data.complaintId, {
                $push: {
                    notificationLogs: {
                        sentAt: new Date(),
                        type: 'EMAIL',
                        recipient: data.recipientEmail || data.customerEmail,
                        subject: `Complaint Update - ${eventType}`,
                        status: 'FAILED',
                        errorMessage: error.message,
                    },
                },
            }).catch(err => {
                console.error('[Email Service] Failed to log notification error:', err);
            });
        }

        return { success: false, error: error.message };
    }
};

/**
 * Send batch notifications (for bulk status updates, etc.)
 */
export const sendBatchComplaintEmails = async (notifications) => {
    const results = await Promise.allSettled(
        notifications.map(notification =>
            sendComplaintEmail(notification.eventType, notification.data)
        )
    );

    const successful = results.filter(r => r.status === 'fulfilled').length;
    const failed = results.filter(r => r.status === 'rejected').length;

    console.log(`[Email Service] Batch send complete: ${successful} sent, ${failed} failed`);

    return {
        total: notifications.length,
        successful,
        failed,
    };
};
