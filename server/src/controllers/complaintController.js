/**
 * COMPLAINT MANAGEMENT SYSTEM - Main Controller
 * Created: 2026-02-04
 * 
 * 9 Main Endpoints:
 * 1. checkComplaintEligibility
 * 2. registerComplaint
 * 3. registerStaffComplaint (on behalf)
 * 4. getComplaints (with filters)
 * 5. getComplaint (single)
 * 6. addMessage
 * 7. updateStatus
 * 8. reopenComplaint
 * 9. getComplaintStats
 */


import Complaint from '../models/ComplaintSchema.js';
import Order from '../models/orderModal.js';
import mongoose from "mongoose";
import {
    getTimeLimitForUser,
    isWithinTimeLimit,
    getRegisterSource,
    isSlaBreached
} from '../utils/complaint/index.js';
import {
    getAllowedNextStatuses,
    isValidTransition,
    checkStatusPermission,
    getTransitionErrorMessage
} from '../utils/complaint/statusTransitions.js';
import { sendComplaintEmail } from '../services/complaintNotificationService.js';

/**
 * 1. CHECK COMPLAINT ELIGIBILITY
 * Per Spec: Check time limit and existing complaints BEFORE showing form
 */
export const checkComplaintEligibility = async (req, res) => {
    try {
        const { orderId } = req.params;
        const user = req.user;

        const order = await Order.findById(orderId)
            .populate('user', 'name email mobileNumber')
            .lean();

        if (!order) {
            return res.status(404).json({ error: 'Order not found' });
        }

        // ✅ CRITICAL: Check existing complaint FIRST
        const existingComplaint = await Complaint.findOne({
            orderNumber: order.orderNumber
        }).lean();

        if (existingComplaint) {
            // ✅ Different messages based on status (per spec)
            const isClosed = ['CLOSED', 'RESOLVED', 'REJECTED'].includes(existingComplaint.status);

            if (isClosed) {
                return res.status(200).json({
                    eligible: false,
                    existingComplaint: { _id: existingComplaint._id },  // ✅ Return as object
                    status: existingComplaint.status,
                    message: "A closed complaint exists for this order. Do you want to reopen it?",
                    options: {
                        canReopen: user.role === 'admin' || user.role === 'emp',  // ✅ Fixed case
                        showViewOnly: true,
                    },
                    complaintId: existingComplaint._id,  // Keep for backward compatibility
                });
            } else {
                return res.status(200).json({
                    eligible: false,
                    existingComplaint: { _id: existingComplaint._id },  // ✅ Return as object
                    status: existingComplaint.status,
                    message: "A complaint for this order is already active.",
                    redirect: `/complaints/${existingComplaint._id}`,
                    complaintId: existingComplaint._id,  // Keep for backward compatibility
                });
            }
        }

        // ✅ CORRECTED: Check time limit ONLY if order is delivered
        if (order.actualDeliveryDate) {
            const userType = user.role === 'ADMIN' || user.role === 'EMP'
                ? 'PRINTS24_STAFF'
                : user.userType?.name || 'CUSTOMER';

            const withinLimit = isWithinTimeLimit(
                order.actualDeliveryDate,
                userType,
                user.staffLevel
            );

            if (!withinLimit) {
                const message = userType === 'CUSTOMER'
                    ? 'The complaint time limit for this order has expired as per company policy. Customers can complain within 7 days.'
                    : (userType === 'AGENT' || userType === 'DISTRIBUTOR')
                        ? 'The complaint time limit for this order has expired as per company policy. Agents/Distributors within 15 days from delivery.'
                        : 'The complaint time limit for this order has expired.';

                return res.status(400).json({
                    eligible: false,
                    message,
                });
            }
        }
        // ✅ If order is NOT delivered yet, complaints are still allowed
        // This handles cases like: wrong design printed, quality issues found during production, etc.

        // Return eligibility with order details
        return res.status(200).json({
            eligible: true,
            canRegister: true,  // ✅ Added for frontend compatibility
            order: {
                id: order._id,
                orderNumber: order.orderNumber,
                productName: order.product?.name,
                deliveryDate: order.actualDeliveryDate,
                orderStatus: order.status,
            },
            timeLimit: getTimeLimitForUser(
                user.role === 'ADMIN' || user.role === 'EMP' ? 'PRINTS24_STAFF' : user.userType?.name || 'CUSTOMER',
                user.staffLevel
            ),
            message: order.actualDeliveryDate
                ? 'You can register a complaint for this order.'
                : 'You can register a complaint for this order (delivery not yet scheduled).',
        });

    } catch (error) {
        console.error('[Complaint Controller] Eligibility check error:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
};

/**
 * 2. REGISTER COMPLAINT (Customer/Agent/Distributor)
 */
export const registerComplaint = async (req, res) => {
    try {
        const {
            orderId,
            complaintType,
            description,
            images = [],
            policyConfirmed,
            source = 'WEBSITE',
        } = req.body;

        const user = req.user;
        const order = req.order; // Attached by middleware

        // Calculate time limit
        const userType = getRegisterSource(user);
        const timeLimitDays = getTimeLimitForUser(
            userType,
            user.staffLevel
        );

        // Create complaint
        const complaint = new Complaint({
            order: order._id,
            orderNumber: order.orderNumber,
            raisedBy: user._id,
            raisedByEmail: user.email,
            raisedByMobile: user.mobileNumber,
            registerSource: userType,
            // ✅ FIXED: Map user.role to enum values (schema expects: CUSTOMER, ADMIN, EMP)
            registeredByRole: user.role === 'user' ? 'CUSTOMER' : user.role.toUpperCase(),
            staffLevel: user.staffLevel,
            complaintSource: source,
            type: complaintType,
            description,
            images: images.map(img => ({
                url: img.url || img,
                thumbnailUrl: img.thumbnailUrl,
                uploadedAt: new Date(),
            })),
            policyConfirmed,
            timeLimitApplied: timeLimitDays,
            deliveryDate: order.actualDeliveryDate,
            status: 'NEW',
            conversations: [{
                message: description,
                sentBy: user._id,
                sentByRole: userType,
                timestamp: new Date(),
                isInternal: false,
            }],
            statusHistory: [{
                status: 'NEW',
                changedBy: user._id,
                changedByRole: userType,
                notes: 'Complaint registered',
                timestamp: new Date(),
            }],
        });

        await complaint.save();

        // Send email notification
        await sendComplaintEmail('registered', {
            complaintId: complaint._id,
            orderNumber: order.orderNumber,
            customerName: order.user?.name || user.name,
            customerEmail: order.user?.email || user.email,
            complaintType,
            description,
            registeredBy: userType,
        });

        res.status(201).json({
            success: true,
            message: 'Complaint registered successfully. Our team will respond within 1 hour.',
            complaintId: complaint._id,
            complaint: {
                id: complaint._id,
                orderNumber: complaint.orderNumber,
                status: complaint.status,
                type: complaint.type,
                registeredAt: complaint.createdAt,
            },
        });

    } catch (error) {
        // Handle duplicate key error (unique orderNumber)
        if (error.code === 11000) {
            return res.status(400).json({
                error: 'A complaint already exists for this order',
                message: 'Please reload and check existing complaints',
            });
        }

        console.error('[Complaint Controller] Register error:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
};

/**
 * 3. REGISTER STAFF COMPLAINT (On Behalf of User)
 */
export const registerStaffComplaint = async (req, res) => {
    try {
        const {
            orderId,
            complaintType,
            description,
            images = [],
            onBehalfOfUserId,
            proofOfMistake,
            source = 'PORTAL',
        } = req.body;

        const staff = req.user;

        // Verify staff permissions
        if (staff.role !== 'ADMIN' && staff.role !== 'EMP') {
            return res.status(403).json({ error: 'Unauthorized' });
        }

        const order = await Order.findById(orderId)
            .populate('user', 'email mobileNumber name');

        if (!order) {
            return res.status(404).json({ error: 'Order not found' });
        }

        // Check existing complaint
        const existing = await Complaint.findOne({ orderNumber: order.orderNumber });
        if (existing) {
            return res.status(400).json({
                error: 'A complaint already exists for this order',
                complaintId: existing._id,
            });
        }

        const complaint = new Complaint({
            order: order._id,
            orderNumber: order.orderNumber,
            raisedBy: onBehalfOfUserId || order.user._id,
            raisedByEmail: order.user.email,
            raisedByMobile: order.user.mobileNumber,
            registerSource: 'PRINTS24_STAFF',
            registeredByRole: staff.role,
            staffLevel: staff.staffLevel,
            complaintSource: source,
            type: complaintType,
            description,
            images: images.map(img => ({
                url: img.url || img,
                uploadedAt: new Date(),
            })),
            policyConfirmed: true, // Staff overrides
            proofOfMistake: proofOfMistake ? {
                ...proofOfMistake,
                verifiedBy: staff._id,
                verifiedAt: new Date(),
            } : undefined,
            timeLimitApplied: getTimeLimitForUser('PRINTS24_STAFF', staff.staffLevel),
            deliveryDate: order.actualDeliveryDate,
            status: 'NEW',
            conversations: [{
                message: `Complaint registered by ${staff.name} on behalf of customer.\n\n${description}`,
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

        res.status(201).json({
            success: true,
            message: 'Complaint registered on behalf of customer',
            complaintId: complaint._id,
        });

    } catch (error) {
        if (error.code === 11000) {
            return res.status(400).json({ error: 'A complaint already exists for this order' });
        }

        console.error('[Complaint Controller] Staff register error:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
};

/**
 * 4. GET COMPLAINTS LIST (Admin - with filters)
 */
export const getComplaints = async (req, res) => {
    try {
        const {
            status,
            type,
            startDate,
            endDate,
            assignedTo,
            registerSource,
            page = 1,
            limit = 20,
            search,
            q, // Alternative search param
        } = req.query;

        const filter = {};

        // Multi-status filter (comma-separated)
        if (status) {
            const statuses = status.split(',').map(s => s.trim());
            filter.status = { $in: statuses };
        }

        if (type) filter.type = type;
        if (assignedTo) filter.assignedTo = assignedTo;
        if (registerSource) filter.registerSource = registerSource;

        // Date range filter
        if (startDate || endDate) {
            filter.createdAt = {};
            if (startDate) filter.createdAt.$gte = new Date(startDate);
            if (endDate) filter.createdAt.$lte = new Date(endDate);
        }

        // Enhanced search by order number, complaint ID, customer name/email/phone
        const searchTerm = search || q;
        if (searchTerm) {
            filter.$or = [
                { orderNumber: { $regex: searchTerm, $options: 'i' } },
                { _id: mongoose.Types.ObjectId.isValid(searchTerm) ? searchTerm : null }
            ];
        }

        const skip = (parseInt(page) - 1) * parseInt(limit);

        const [complaints, total] = await Promise.all([
            Complaint.find(filter)
                .populate('order', 'orderNumber product status')
                .populate('raisedBy', 'name email mobileNumber')
                .populate('assignedTo', 'name email')
                .sort({ createdAt: -1 })
                .skip(skip)
                .limit(parseInt(limit))
                .lean(),
            Complaint.countDocuments(filter),
        ]);

        res.json({
            success: true,
            complaints,
            pagination: {
                page: parseInt(page),
                limit: parseInt(limit),
                total,
                pages: Math.ceil(total / parseInt(limit)),
            },
        });
    } catch (error) {
        console.error('[Complaint Controller] Get complaints error:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
};

/**
 * 5. GET SINGLE COMPLAINT (with conversation)
 */
export const getComplaint = async (req, res) => {
    try {
        const { id } = req.params;
        const user = req.user;

        const complaint = await Complaint.findById(id)
            .populate('order')
            .populate('raisedBy', 'name email mobileNumber userType')
            .populate('assignedTo', 'name email')
            .populate('reprintOrderId', 'orderNumber status')
            .populate('conversations.sentBy', 'name email');

        if (!complaint) {
            return res.status(404).json({ error: 'Complaint not found' });
        }

        // Update last viewed
        complaint.lastViewedBy = user._id;
        complaint.lastViewedAt = new Date();
        await complaint.save();

        // ✅ Filter internal notes for customers
        const isStaff = user.role === 'admin' || user.role === 'emp';
        const complaintData = complaint.toObject(); // Convert to plain object

        if (!isStaff) {
            // Hide internal notes from customers
            complaintData.conversations = complaintData.conversations.filter(
                conv => !conv.isInternal  // ✅ Fixed: Use isInternal (not isInternalNote)
            );
        }

        res.json({
            success: true,
            complaint: complaintData,
        });
    } catch (error) {
        console.error('[Complaint Controller] Get complaint error:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
};

/**
 * 6. ADD MESSAGE TO CONVERSATION
 */
export const addMessage = async (req, res) => {
    try {
        const { id } = req.params;
        const { message, isInternal = false, attachments = [] } = req.body;
        const user = req.user;

        const complaint = await Complaint.findById(id)
            .populate('raisedBy', 'email name');

        if (!complaint) {
            return res.status(404).json({ error: 'Complaint not found' });
        }

        // Determine sender role
        const sentByRole = getRegisterSource(user);

        // Add message to conversation
        complaint.conversations.push({
            message,
            sentBy: user._id,
            sentByRole,
            attachments,
            timestamp: new Date(),
            isInternal,
        });

        // Update first response time if this is the first staff response
        if (sentByRole === 'PRINTS24_STAFF' && !complaint.firstResponseTime) {
            complaint.firstResponseTime = new Date();
            complaint.firstResponseBy = user._id;

            // Check SLA
            complaint.slaBreached = isSlaBreached(complaint.createdAt, complaint.firstResponseTime);
        }

        await complaint.save();

        // Send email notification for customer-facing messages
        if (!isInternal) {
            await sendComplaintEmail('newMessage', {
                complaintId: complaint._id,
                orderNumber: complaint.orderNumber,
                message,
                senderName: user.name,
                recipientEmail: complaint.raisedBy.email,
            });
        }

        res.json({
            success: true,
            message: 'Message added successfully',
            conversation: complaint.conversations[complaint.conversations.length - 1],
        });
    } catch (error) {
        console.error('[Complaint Controller] Add message error:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
};

/**
 * 7. UPDATE COMPLAINT STATUS
 */
export const updateStatus = async (req, res) => {
    try {
        const { id } = req.params;
        const {
            status,
            notes,
            resolutionType,
            resolutionNotes,
            mistakeType,
            assignedTo,
        } = req.body;
        const user = req.user;

        const complaint = await Complaint.findById(id)
            .populate('raisedBy', 'email name');

        if (!complaint) {
            return res.status(404).json({ error: 'Complaint not found' });
        }

        // ✅ Validate status transition
        const currentStatus = complaint.status;

        if (!isValidTransition(currentStatus, status)) {
            return res.status(400).json({
                error: 'Invalid status transition',
                message: getTransitionErrorMessage(currentStatus, status),
                currentStatus,
                attemptedStatus: status
            });
        }

        // ✅ Check role-based permission for this status
        const permissionCheck = checkStatusPermission(status, user);
        if (!permissionCheck.allowed) {
            return res.status(403).json({
                error: 'Permission denied',
                message: permissionCheck.reason
            });
        }

        // Store previous status
        const previousStatus = complaint.status;

        // Update status
        complaint.status = status;
        complaint.previousStatus = previousStatus;

        // Add to status history
        complaint.statusHistory.push({
            status,
            changedBy: user._id,
            changedByRole: user.role === 'ADMIN' || user.role === 'EMP' ? 'PRINTS24_STAFF' : 'CUSTOMER',
            notes,
            timestamp: new Date(),
        });

        // Handle resolution
        if (status === 'RESOLVED' || status === 'CLOSED') {
            complaint.resolutionTime = new Date();
            if (resolutionType) complaint.resolutionType = resolutionType;
            if (resolutionNotes) complaint.resolutionNotes = resolutionNotes;
            if (mistakeType) complaint.mistakeType = mistakeType;
        }

        // Handle rejection
        if (status === 'REJECTED') {
            complaint.resolutionType = 'NO_ACTION';
            complaint.resolutionNotes = resolutionNotes || 'Complaint rejected as per policy';
        }

        // Handle assignment
        if (assignedTo) {
            complaint.assignedTo = assignedTo;
        }

        await complaint.save();

        // Send status update notification
        await sendComplaintEmail('statusUpdate', {
            complaintId: complaint._id,
            orderNumber: complaint.orderNumber,
            newStatus: status,
            notes,
            recipientEmail: complaint.raisedBy.email,
        });

        res.json({
            success: true,
            message: 'Status updated successfully',
            complaint: {
                id: complaint._id,
                status: complaint.status,
                previousStatus,
            },
        });
    } catch (error) {
        console.error('[Complaint Controller] Update status error:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
};

/**
 * 8. REOPEN COMPLAINT (Staff only)
 */
export const reopenComplaint = async (req, res) => {
    try {
        const { id } = req.params;
        const { reason } = req.body;
        const user = req.user;

        const complaint = await Complaint.findById(id)
            .populate('raisedBy', 'email name');

        if (!complaint) {
            return res.status(404).json({ error: 'Complaint not found' });
        }

        // Check if complaint is closed
        if (!['CLOSED', 'RESOLVED', 'REJECTED'].includes(complaint.status)) {
            return res.status(400).json({
                error: 'Complaint is not closed. Cannot reopen.',
            });
        }

        // Reopen the complaint
        complaint.reopenedFromStatus = complaint.status;
        complaint.status = 'REOPENED';
        complaint.previousStatus = complaint.reopenedFromStatus;
        complaint.reopenedCount += 1;
        complaint.lastReopenedAt = new Date();
        complaint.lastReopenedBy = user._id;
        complaint.reopenSource = 'PRINTS24_STAFF';

        // Add to conversation
        complaint.conversations.push({
            message: `Complaint reopened by ${user.name}. Reason: ${reason}`,
            sentBy: user._id,
            sentByRole: 'PRINTS24_STAFF',
            isInternal: false,
            timestamp: new Date(),
        });

        // Add to status history
        complaint.statusHistory.push({
            status: 'REOPENED',
            changedBy: user._id,
            changedByRole: 'PRINTS24_STAFF',
            notes: `Reopened: ${reason}`,
            timestamp: new Date(),
        });

        await complaint.save();

        // Send notification
        await sendComplaintEmail('reopened', {
            complaintId: complaint._id,
            orderNumber: complaint.orderNumber,
            reason,
            reopenedBy: user.name,
            recipientEmail: complaint.raisedBy.email,
        });

        res.json({
            success: true,
            message: 'Complaint reopened successfully',
            complaint: {
                id: complaint._id,
                status: complaint.status,
                reopenedCount: complaint.reopenedCount,
            },
        });
    } catch (error) {
        console.error('[Complaint Controller] Reopen error:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
};

/**
 * 9. GET COMPLAINT STATS (Dashboard)
 */
export const getComplaintStats = async (req, res) => {
    try {
        const { startDate, endDate } = req.query;

        const dateFilter = {};
        if (startDate || endDate) {
            dateFilter.createdAt = {};
            if (startDate) dateFilter.createdAt.$gte = new Date(startDate);
            if (endDate) dateFilter.createdAt.$lte = new Date(endDate);
        }

        const [
            total,
            open,
            resolved,
            rejected,
            delayed,
            today,
            slaStats,
            byType,
            bySource,
        ] = await Promise.all([
            Complaint.countDocuments(dateFilter),
            Complaint.countDocuments({
                ...dateFilter,
                status: { $in: ['NEW', 'UNDER_REVIEW', 'WAITING_FOR_CUSTOMER', 'REOPENED'] }
            }),
            Complaint.countDocuments({
                ...dateFilter,
                status: { $in: ['RESOLVED', 'CLOSED'] }
            }),
            Complaint.countDocuments({
                ...dateFilter,
                status: 'REJECTED'
            }),
            Complaint.countDocuments({
                ...dateFilter,
                type: 'ORDER_DELAY'
            }),
            Complaint.countDocuments({
                createdAt: {
                    $gte: new Date(new Date().setHours(0, 0, 0, 0)),
                    $lte: new Date(new Date().setHours(23, 59, 59, 999)),
                },
            }),
            Complaint.aggregate([
                { $match: dateFilter },
                {
                    $group: {
                        _id: '$slaBreached',
                        count: { $sum: 1 },
                    },
                },
            ]),
            Complaint.aggregate([
                { $match: dateFilter },
                {
                    $group: {
                        _id: '$type',
                        count: { $sum: 1 },
                    },
                },
            ]),
            Complaint.aggregate([
                { $match: dateFilter },
                {
                    $group: {
                        _id: '$registerSource',
                        count: { $sum: 1 },
                    },
                },
            ]),
        ]);

        const slaCompliant = slaStats.find(s => s._id === false)?.count || 0;
        const slaBreached = slaStats.find(s => s._id === true)?.count || 0;

        // ✅ Calculate average response time (in minutes)
        const complaintsWithResponse = await Complaint.find({
            firstResponseTime: { $exists: true },
            ...dateFilter
        });
        let avgResponseTime = 0;
        if (complaintsWithResponse.length > 0) {
            const totalTime = complaintsWithResponse.reduce((sum, c) => {
                return sum + (new Date(c.firstResponseTime) - new Date(c.createdAt));
            }, 0);
            avgResponseTime = Math.round(totalTime / complaintsWithResponse.length / 60000); // in minutes
        }

        res.json({
            success: true,
            stats: {
                total,
                open,
                resolved,
                rejected,
                delayed,
                today,
                resolutionRate: total > 0 ? ((resolved / total) * 100).toFixed(2) : 0,
                sla: {
                    compliant: slaCompliant,
                    breached: slaBreached,
                    complianceRate: (slaCompliant + slaBreached) > 0
                        ? ((slaCompliant / (slaCompliant + slaBreached)) * 100).toFixed(2)
                        : 100,
                    avgResponseTime, // ✅ Added average response time
                },
                byType: byType.reduce((acc, item) => {
                    acc[item._id] = item.count;
                    return acc;
                }, {}),
                bySource: bySource.reduce((acc, item) => {
                    acc[item._id] = item.count;
                    return acc;
                }, {}),
            },
        });
    } catch (error) {
        console.error('[Complaint Controller] Get stats error:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
};
