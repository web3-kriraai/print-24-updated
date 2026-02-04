/**
 * COMPLAINT MANAGEMENT SYSTEM - Webhook Routes
 * Created: 2026-02-04
 * 
 * Endpoints for multi-channel complaint registration
 * Sources: Chat (WhatsApp/Website), Call, Email
 */

import express from 'express';
import Complaint from '../models/ComplaintSchema.js';
import Order from '../models/orderModal.js';
import { User } from '../models/User.js';
import { getTimeLimitForUser } from '../utils/complaint/index.js';
import { sendComplaintEmail } from '../services/complaintNotificationService.js';

const router = express.Router();

/**
 * POST /api/webhooks/complaint/chat
 * Register complaint from chat (WhatsApp, Website chat, etc.)
 * Body: {
 *   orderNumber,
 *   customerPhone or customerEmail,
 *   message,
 *   complaintType,
 *   source: 'WHATSAPP' | 'CHAT'
 * }
 */
router.post('/complaint/chat', async (req, res) => {
    try {
        const {
            orderNumber,
            customerPhone,
            customerEmail,
            message,
            complaintType,
            source = 'CHAT',
            images = [],
        } = req.body;

        // Find order
        const order = await Order.findOne({ orderNumber })
            .populate('user', 'name email mobileNumber');

        if (!order) {
            return res.status(404).json({
                error: 'Order not found',
                orderNumber,
            });
        }

        // Check if complaint already exists
        const existing = await Complaint.findOne({ orderNumber });
        if (existing) {
            // Add message to existing complaint instead
            existing.conversations.push({
                message,
                sentBy: order.user._id,
                sentByRole: 'CUSTOMER',
                timestamp: new Date(),
                isInternal: false,
            });
            await existing.save();

            return res.json({
                success: true,
                message: 'Message added to existing complaint',
                complaintId: existing._id,
                isNew: false,
            });
        }

        // Create new complaint from chat
        const complaint = new Complaint({
            order: order._id,
            orderNumber: order.orderNumber,
            raisedBy: order.user._id,
            raisedByEmail: order.user.email,
            raisedByMobile: order.user.mobileNumber || customerPhone,
            registerSource: 'CUSTOMER',
            registeredByRole: 'user',
            complaintSource: source, // 'CHAT' or 'WHATSAPP'
            type: complaintType || 'OTHER',
            description: message,
            images: images.map(img => ({ url: img, uploadedAt: new Date() })),
            policyConfirmed: true, // Auto-confirmed for chat
            timeLimitApplied: 7, // Customer default
            deliveryDate: order.actualDeliveryDate,
            status: 'NEW',
            conversations: [{
                message,
                sentBy: order.user._id,
                sentByRole: 'CUSTOMER',
                timestamp: new Date(),
            }],
        });

        await complaint.save();

        // Send email notification
        await sendComplaintEmail('registered', {
            complaintId: complaint._id,
            orderNumber: order.orderNumber,
            customerName: order.user.name,
            customerEmail: order.user.email,
            complaintType: complaint.type,
            description: message,
            registeredBy: `Customer via ${source}`,
        });

        res.json({
            success: true,
            message: 'Complaint registered from chat',
            complaintId: complaint._id,
            isNew: true,
        });

    } catch (error) {
        console.error('[Webhook] Chat complaint error:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
});

/**
 * POST /api/webhooks/complaint/call
 * Register complaint from phone call (logged by staff)
 * Body: {
 *   orderNumber,
 *   complaintType,
 *   description,
 *   loggedByStaffId,
 *   callRecordingUrl?
 * }
 */
router.post('/complaint/call', async (req, res) => {
    try {
        const {
            orderNumber,
            complaintType,
            description,
            loggedByStaffId,
            callRecordingUrl,
        } = req.body;

        // Find order
        const order = await Order.findOne({ orderNumber })
            .populate('user', 'name email mobileNumber');

        if (!order) {
            return res.status(404).json({
                error: 'Order not found',
                orderNumber,
            });
        }

        // Find staff member
        const staff = await User.findById(loggedByStaffId);
        if (!staff || (staff.role !== 'admin' && staff.role !== 'emp')) {
            return res.status(403).json({
                error: 'Invalid staff member',
            });
        }

        // Check existing complaint
        const existing = await Complaint.findOne({ orderNumber });
        if (existing) {
            // Add note to existing complaint
            existing.conversations.push({
                message: `[PHONE CALL] ${description}${callRecordingUrl ? ` (Recording: ${callRecordingUrl})` : ''}`,
                sentBy: staff._id,
                sentByRole: 'PRINTS24_STAFF',
                timestamp: new Date(),
                isInternal: false,
            });
            await existing.save();

            return res.json({
                success: true,
                message: 'Call details added to existing complaint',
                complaintId: existing._id,
                isNew: false,
            });
        }

        // Create complaint from call
        const complaint = new Complaint({
            order: order._id,
            orderNumber: order.orderNumber,
            raisedBy: order.user._id,
            raisedByEmail: order.user.email,
            raisedByMobile: order.user.mobileNumber,
            registerSource: 'PRINTS24_STAFF',
            registeredByRole: staff.role,
            staffLevel: staff.staffLevel,
            complaintSource: 'CALL',
            type: complaintType,
            description: `[PHONE CALL] ${description}`,
            policyConfirmed: true,
            timeLimitApplied: getTimeLimitForUser('PRINTS24_STAFF', staff.staffLevel),
            deliveryDate: order.actualDeliveryDate,
            status: 'NEW',
            conversations: [{
                message: `Complaint logged from phone call by ${staff.name}.\n\n${description}${callRecordingUrl ? `\n\nCall Recording: ${callRecordingUrl}` : ''}`,
                sentBy: staff._id,
                sentByRole: 'PRINTS24_STAFF',
                timestamp: new Date(),
            }],
        });

        await complaint.save();

        // Send email to customer
        await sendComplaintEmail('staffOnBehalf', {
            complaintId: complaint._id,
            orderNumber: order.orderNumber,
            customerName: order.user.name,
            customerEmail: order.user.email,
            staffName: staff.name,
            complaintType,
        });

        res.json({
            success: true,
            message: 'Complaint registered from phone call',
            complaintId: complaint._id,
            isNew: true,
        });

    } catch (error) {
        console.error('[Webhook] Call complaint error:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
});

/**
 * POST /api/webhooks/complaint/email
 * Register complaint from email
 * Body: {
 *   orderNumber,
 *   fromEmail,
 *   subject,
 *   body,
 *   attachments[]
 * }
 */
router.post('/complaint/email', async (req, res) => {
    try {
        const {
            orderNumber,
            fromEmail,
            subject,
            body,
            attachments = [],
            complaintType = 'OTHER',
        } = req.body;

        // Find order
        const order = await Order.findOne({ orderNumber })
            .populate('user', 'name email mobileNumber');

        if (!order) {
            return res.status(404).json({
                error: 'Order not found',
                orderNumber,
            });
        }

        // Verify email matches customer
        if (order.user.email.toLowerCase() !== fromEmail.toLowerCase()) {
            return res.status(403).json({
                error: 'Email does not match order customer',
            });
        }

        // Check existing complaint
        const existing = await Complaint.findOne({ orderNumber });
        if (existing) {
            existing.conversations.push({
                message: `[EMAIL] Subject: ${subject}\n\n${body}`,
                sentBy: order.user._id,
                sentByRole: 'CUSTOMER',
                attachments,
                timestamp: new Date(),
            });
            await existing.save();

            return res.json({
                success: true,
                message: 'Email added to existing complaint',
                complaintId: existing._id,
                isNew: false,
            });
        }

        // Create complaint from email
        const complaint = new Complaint({
            order: order._id,
            orderNumber: order.orderNumber,
            raisedBy: order.user._id,
            raisedByEmail: order.user.email,
            raisedByMobile: order.user.mobileNumber,
            registerSource: 'CUSTOMER',
            registeredByRole: 'user',
            complaintSource: 'EMAIL',
            type: complaintType,
            description: `Email Subject: ${subject}\n\n${body}`,
            images: attachments.filter(a => a.type?.startsWith('image/')).map(a => ({
                url: a.url,
                uploadedAt: new Date(),
            })),
            policyConfirmed: true,
            timeLimitApplied: 7,
            deliveryDate: order.actualDeliveryDate,
            status: 'NEW',
            conversations: [{
                message: `[EMAIL] Subject: ${subject}\n\n${body}`,
                sentBy: order.user._id,
                sentByRole: 'CUSTOMER',
                attachments,
                timestamp: new Date(),
            }],
        });

        await complaint.save();

        // Send confirmation email
        await sendComplaintEmail('registered', {
            complaintId: complaint._id,
            orderNumber: order.orderNumber,
            customerName: order.user.name,
            customerEmail: order.user.email,
            complaintType,
            description: body,
            registeredBy: 'Customer via Email',
        });

        res.json({
            success: true,
            message: 'Complaint registered from email',
            complaintId: complaint._id,
            isNew: true,
        });

    } catch (error) {
        console.error('[Webhook] Email complaint error:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
});

export default router;
