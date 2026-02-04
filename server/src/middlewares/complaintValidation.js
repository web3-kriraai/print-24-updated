/**
 * COMPLAINT MANAGEMENT SYSTEM - Validation Middleware
 * Created: 2026-02-04
 * 
 * Purpose: Validate complaint registration eligibility
 * - Time limit validation (corrected: allows complaints before delivery)
 * - Single complaint per order enforcement
 */

import { isWithinTimeLimit, validateComplaintEligibility } from '../utils/complaint/index.js';
import Order from '../models/orderModal.js';
import Complaint from '../models/ComplaintSchema.js';

/**
 * Validate complaint time limit
 * CORRECTED: Per spec - complaints CAN be registered before delivery (for delays)
 * Time limit only applies after delivery date
 */
export const validateComplaintTimeLimit = async (req, res, next) => {
    try {
        // ✅ FIXED: Properly extract orderId from body or params
        const orderId = req.body.orderId || req.params.orderId;
        const user = req.user;

        console.log('[Complaint Validation] validateComplaintTimeLimit - orderId:', orderId);

        if (!orderId) {
            return res.status(400).json({
                error: 'Order ID is required'
            });
        }

        const order = await Order.findById(orderId);
        if (!order) {
            console.log('[Complaint Validation] Order not found:', orderId);
            return res.status(404).json({
                error: 'Order not found'
            });
        }

        // ✅ CORRECTED: Complaints allowed BEFORE delivery
        // Only check time limit if order is delivered
        if (order.actualDeliveryDate) {
            const userType = user.role === 'ADMIN' || user.role === 'EMP'
                ? 'PRINTS24_STAFF'
                : user.userType?.name || 'CUSTOMER';

            const eligibility = validateComplaintEligibility(
                order.actualDeliveryDate,
                order.status,
                userType,
                user.staffLevel
            );

            if (!eligibility.eligible) {
                return res.status(400).json({
                    error: eligibility.message,
                    reason: eligibility.reason,
                });
            }

            // Attach eligibility info to request
            req.complaintEligibility = eligibility;
        } else {
            // Order not delivered yet - allow complaint (for delays, etc.)
            req.complaintEligibility = {
                eligible: true,
                message: 'Complaint allowed before delivery (order delay/quality concern)',
                remainingDays: null,
            };
        }

        // Attach order to request for later use
        req.order = order;
        next();
    } catch (error) {
        console.error('[Complaint Validation] Time limit error:', error);
        res.status(500).json({
            error: 'Internal server error',
            details: process.env.NODE_ENV === 'development' ? error.message : undefined,
        });
    }
};

/**
 * Validate single complaint rule
 * Per spec: Only ONE complaint allowed per order (unique orderNumber constraint)
 */
export const validateSingleComplaintRule = async (req, res, next) => {
    try {
        // ✅ FIXED: Properly extract orderId from body or params
        const orderId = req.body.orderId || req.params.orderId;

        console.log('[Complaint Validation] validateSingleComplaintRule - orderId:', orderId);

        if (!orderId) {
            return res.status(400).json({
                error: 'Order ID is required'
            });
        }

        const order = await Order.findById(orderId);
        if (!order) {
            console.log('[Complaint Validation] Order not found:', orderId);
            return res.status(404).json({
                error: 'Order not found'
            });
        }

        // Check if complaint already exists for this order
        const existingComplaint = await Complaint.findOne({
            orderNumber: order.orderNumber
        }).lean();

        if (existingComplaint) {
            // Per spec: Different response based on complaint status
            const isClosed = ['CLOSED', 'RESOLVED', 'REJECTED'].includes(existingComplaint.status);

            return res.status(400).json({
                error: isClosed
                    ? 'A closed complaint exists for this order. Please use the reopen option if needed.'
                    : 'A complaint has already been registered for this order.',
                complaintId: existingComplaint._id,
                status: existingComplaint.status,
                redirect: `/complaints/${existingComplaint._id}`,
                canReopen: isClosed,
            });
        }

        next();
    } catch (error) {
        console.error('[Complaint Validation] Single complaint check error:', error);
        res.status(500).json({
            error: 'Internal server error',
            details: process.env.NODE_ENV === 'development' ? error.message : undefined,
        });
    }
};

/**
 * Validate proof of mistake for staff complaints
 * Per spec: Staff must verify order details and proof before registering
 */
export const validateProofOfMistake = async (req, res, next) => {
    try {
        const user = req.user;

        // Only required for staff complaints
        if (user.role !== 'ADMIN' && user.role !== 'EMP') {
            return next();
        }

        const { proofOfMistake } = req.body;

        if (!proofOfMistake || !proofOfMistake.description) {
            return res.status(400).json({
                error: 'Proof of mistake verification required',
                message: 'Staff must provide proof of mistake description and verification',
            });
        }

        next();
    } catch (error) {
        console.error('[Complaint Validation] Proof of mistake error:', error);
        res.status(500).json({
            error: 'Internal server error'
        });
    }
};

/**
 * Validate user permissions for complaint actions
 */
export const validateComplaintPermissions = (action) => {
    return async (req, res, next) => {
        try {
            const user = req.user;
            const { id } = req.params;

            const complaint = await Complaint.findById(id);
            if (!complaint) {
                return res.status(404).json({
                    error: 'Complaint not found'
                });
            }

            // Check permissions based on action
            switch (action) {
                case 'update_status':
                    // Only staff can update status
                    // ✅ FIXED: Use lowercase to match JWT token values
                    if (user.role !== 'admin' && user.role !== 'emp') {
                        console.log('[validateComplaintPermissions] Access DENIED - Role:', user.role);
                        return res.status(403).json({
                            error: 'Unauthorized',
                            message: 'Only staff members can update complaint status',
                        });
                    }
                    console.log('[validateComplaintPermissions] Access GRANTED - Role:', user.role);
                    break;

                case 'reopen':
                    // Only staff can reopen
                    // ✅ FIXED: Use lowercase to match JWT token values
                    if (user.role !== 'admin' && user.role !== 'emp') {
                        return res.status(403).json({
                            error: 'Unauthorized',
                            message: 'Only staff members can reopen complaints',
                        });
                    }

                    // Can only reopen if closed
                    if (!['CLOSED', 'RESOLVED', 'REJECTED'].includes(complaint.status)) {
                        return res.status(400).json({
                            error: 'Invalid action',
                            message: 'Complaint is not closed. Cannot reopen.',
                        });
                    }
                    break;

                case 'add_message':
                    // Anyone involved can add messages
                    // ✅ FIXED: Use lowercase to match JWT token values
                    const isInvolved =
                        complaint.raisedBy.toString() === user._id.toString() ||
                        complaint.assignedTo?.toString() === user._id.toString() ||
                        user.role === 'admin' ||
                        user.role === 'emp';

                    if (!isInvolved) {
                        return res.status(403).json({
                            error: 'Unauthorized',
                            message: 'You are not authorized to interact with this complaint',
                        });
                    }
                    break;

                default:
                    break;
            }

            // Attach complaint to request
            req.complaint = complaint;
            next();
        } catch (error) {
            console.error('[Complaint Validation] Permission error:', error);
            res.status(500).json({
                error: 'Internal server error'
            });
        }
    };
};

/**
 * Validate complaint type and required fields
 */
export const validateComplaintFields = (req, res, next) => {
    try {
        console.log('[Complaint Validation] validateComplaintFields called');
        console.log('[Complaint Validation] Request body:', JSON.stringify(req.body, null, 2));

        const {
            complaintType,
            description,
            policyConfirmed,
        } = req.body;

        // Validate required fields
        if (!complaintType) {
            console.log('[Complaint Validation] Missing complaintType');
            return res.status(400).json({
                error: 'Complaint type is required'
            });
        }

        if (!description || description.trim().length < 10) {
            console.log('[Complaint Validation] Description too short or missing');
            return res.status(400).json({
                error: 'Description must be at least 10 characters'
            });
        }

        if (!policyConfirmed) {
            return res.status(400).json({
                error: 'You must accept the complaint policy to proceed',
                message: 'Please confirm that you understand: if the mistake is from your file or confirmed design, reprint will not be provided.',
            });
        }

        // Validate complaint type
        const validTypes = [
            'PRINTING_QUALITY',
            'WRONG_CONTENT',
            'QUANTITY_ISSUE',
            'ORDER_DELAY',
            'WRONG_PRODUCT',
            'OTHER',
        ];

        if (!validTypes.includes(complaintType)) {
            return res.status(400).json({
                error: 'Invalid complaint type',
                validTypes,
            });
        }

        next();
    } catch (error) {
        console.error('[Complaint Validation] Field validation error:', error);
        res.status(500).json({
            error: 'Internal server error'
        });
    }
};
