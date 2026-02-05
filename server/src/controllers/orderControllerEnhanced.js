// Enhanced Order API - Advanced Filtering & Bulk Operations
// Add these functions to your orderController.js

import Order from '../models/orderModal.js';
import Complaint from '../models/complaintModal.js'; // Assuming this exists

/**
 * Get Orders with Advanced Filtering (Enhanced getAllOrders)
 * Supports: search, status filters, payment filters, date range, amount range, etc.
 */
export const getOrdersWithFilters = async (req, res) => {
    try {
        const {
            page = 1,
            limit = 20,
            search = '',
            status = '',
            paymentStatus = '',
            startDate = '',
            endDate = '',
            minAmount = 0,
            maxAmount = 0,
            deliveryStatus = '',
            hasComplaint = '',
            activeComplaint = '',
            customerType = '',
            sortBy = 'createdAt',
            sortOrder = 'desc',
        } = req.query;

        // Build filter query
        const filter = {};

        // Search filter (order number, customer name, email, product name)
        if (search) {
            filter.$or = [
                { orderNumber: { $regex: search, $options: 'i' } },
                { 'user.name': { $regex: search, $options: 'i' } },
                { 'user.email': { $regex: search, $options: 'i' } },
                { 'user.mobileNumber': { $regex: search, $options: 'i' } },
            ];
        }

        // Status filter (multiple)
        if (status) {
            const statuses = status.split(',').map(s => s.trim());
            filter.status = { $in: statuses };
        }

        // Payment status filter (multiple)
        if (paymentStatus) {
            const paymentStatuses = paymentStatus.split(',').map(s => s.trim());
            filter.paymentStatus = { $in: paymentStatuses };
        }

        // Date range filter
        if (startDate || endDate) {
            filter.createdAt = {};
            if (startDate) filter.createdAt.$gte = new Date(startDate);
            if (endDate) {
                const end = new Date(endDate);
                end.setHours(23, 59, 59, 999); // End of day
                filter.createdAt.$lte = end;
            }
        }

        // Amount range filter
        if (minAmount > 0 || maxAmount > 0) {
            filter['priceSnapshot.totalPayable'] = {};
            if (minAmount > 0) filter['priceSnapshot.totalPayable'].$gte = Number(minAmount);
            if (maxAmount > 0) filter['priceSnapshot.totalPayable'].$lte = Number(maxAmount);
        }

        // Delivery status filter (multiple)
        if (deliveryStatus) {
            const deliveryStatuses = deliveryStatus.split(',').map(s => s.trim());
            filter.deliveryStatus = { $in: deliveryStatuses };
        }

        // Customer type filter
        if (customerType) {
            const types = customerType.split(',').map(t => t.trim());
            filter['user.role'] = { $in: types };
        }

        // Build populate and projection
        const orders = await Order.find(filter)
            .populate({
                path: 'product',
                select: 'name image',
            })
            .populate({
                path: 'user',
                select: 'name email mobileNumber role',
            })
            .sort({ [sortBy]: sortOrder === 'asc' ? 1 : -1 })
            .limit(Number(limit))
            .skip((Number(page) - 1) * Number(limit))
            .lean();

        // If hasComplaint or activeComplaint filter is set, fetch complaints
        let filteredOrders = orders;
        if (hasComplaint === 'true' || activeComplaint === 'true') {
            const orderIds = orders.map(o => o._id);
            const complaints = await Complaint.find({ order: { $in: orderIds } })
                .select('order status')
                .lean();

            const complaintsMap = {};
            complaints.forEach(c => {
                complaintsMap[c.order.toString()] = c;
            });

            filteredOrders = orders.filter(order => {
                const complaint = complaintsMap[order._id.toString()];
                if (hasComplaint === 'true' && !complaint) return false;
                if (activeComplaint === 'true') {
                    if (!complaint) return false;
                    const activeStatuses = ['REGISTERED', 'IN_PROGRESS', 'WAITING_FOR_CUSTOMER'];
                    if (!activeStatuses.includes(complaint.status)) return false;
                }
                // Attach complaint to order
                if (complaint) {
                    order.complaint = complaint;
                }
                return true;
            });
        }

        // Get total count
        const total = await Order.countDocuments(filter);

        res.status(200).json({
            orders: filteredOrders,
            pagination: {
                page: Number(page),
                limit: Number(limit),
                total,
                pages: Math.ceil(total / Number(limit)),
            },
        });
    } catch (error) {
        console.error('Get orders with filters error:', error);
        res.status(500).json({ error: 'Failed to fetch orders' });
    }
};

/**
 * Get Order Statistics
 */
export const getOrderStats = async (req, res) => {
    try {
        // Total orders
        const totalOrders = await Order.countDocuments();

        // Pending payment
        const pendingPayment = await Order.aggregate([
            { $match: { paymentStatus: { $in: ['PENDING', 'PARTIAL'] } } },
            {
                $group: {
                    _id: null,
                    count: { $sum: 1 },
                    amount: { $sum: '$priceSnapshot.totalPayable' },
                },
            },
        ]);

        // Active complaints
        const complaints = await Complaint.find({
            status: { $in: ['REGISTERED', 'IN_PROGRESS', 'WAITING_FOR_CUSTOMER'] },
        });
        const activeComplaints = complaints.length;

        // Today's revenue
        const today = new Date();
        today.setHours(0, 0, 0, 0);
        const todayRevenue = await Order.aggregate([
            {
                $match: {
                    createdAt: { $gte: today },
                    paymentStatus: 'COMPLETED',
                },
            },
            {
                $group: {
                    _id: null,
                    total: { $sum: '$priceSnapshot.totalPayable' },
                },
            },
        ]);

        // Average processing time (delivered orders)
        const deliveredOrders = await Order.find({
            status: 'DELIVERED',
            actualDeliveryDate: { $exists: true },
        })
            .select('createdAt actualDeliveryDate')
            .lean();

        let avgProcessingTime = 0;
        if (deliveredOrders.length > 0) {
            const totalDays = deliveredOrders.reduce((sum, order) => {
                const days = Math.floor(
                    (new Date(order.actualDeliveryDate) - new Date(order.createdAt)) /
                    (1000 * 60 * 60 * 24)
                );
                return sum + days;
            }, 0);
            avgProcessingTime = Math.round(totalDays / deliveredOrders.length * 10) / 10;
        }

        res.status(200).json({
            totalOrders,
            pendingPayment: {
                count: pendingPayment[0]?.count || 0,
                amount: pendingPayment[0]?.amount || 0,
            },
            activeComplaints,
            todayRevenue: todayRevenue[0]?.total || 0,
            avgProcessingTime,
        });
    } catch (error) {
        console.error('Get order stats error:', error);
        res.status(500).json({ error: 'Failed to fetch stats' });
    }
};

/**
 * Bulk Update Orders
 */
export const bulkUpdateOrders = async (req, res) => {
    try {
        const { orderIds, action, payload } = req.body;

        if (!orderIds || !Array.isArray(orderIds) || orderIds.length === 0) {
            return res.status(400).json({ error: 'Invalid order IDs' });
        }

        let updateData = {};

        switch (action) {
            case 'UPDATE_STATUS':
                if (!payload.status) {
                    return res.status(400).json({ error: 'Status is required' });
                }
                updateData.status = payload.status;
                // Auto-set actualDeliveryDate if status is DELIVERED
                if (payload.status === 'DELIVERED') {
                    updateData.actualDeliveryDate = new Date();
                }
                break;

            case 'UPDATE_PAYMENT':
                if (!payload.paymentStatus) {
                    return res.status(400).json({ error: 'Payment status is required' });
                }
                updateData.paymentStatus = payload.paymentStatus;
                break;

            case 'ASSIGN_DEPARTMENT':
                if (!payload.departmentId) {
                    return res.status(400).json({ error: 'Department ID is required' });
                }
                updateData.currentDepartment = payload.departmentId;
                break;

            default:
                return res.status(400).json({ error: 'Invalid action' });
        }

        // Update all orders
        const result = await Order.updateMany(
            { _id: { $in: orderIds } },
            { $set: updateData }
        );

        res.status(200).json({
            message: `Successfully updated ${result.modifiedCount} orders`,
            modifiedCount: result.modifiedCount,
        });
    } catch (error) {
        console.error('Bulk update error:', error);
        res.status(500).json({ error: 'Failed to bulk update orders' });
    }
};

/**
 * Bulk Delete Orders
 */
export const bulkDeleteOrders = async (req, res) => {
    try {
        const { orderIds } = req.body;

        if (!orderIds || !Array.isArray(orderIds) || orderIds.length === 0) {
            return res.status(400).json({ error: 'Invalid order IDs' });
        }

        // Delete orders
        const result = await Order.deleteMany({ _id: { $in: orderIds } });

        res.status(200).json({
            message: `Successfully deleted ${result.deletedCount} orders`,
            deletedCount: result.deletedCount,
        });
    } catch (error) {
        console.error('Bulk delete error:', error);
        res.status(500).json({ error: 'Failed to bulk delete orders' });
    }
};

/**
 * Export Orders (Excel)
 */
export const exportOrders = async (req, res) => {
    try {
        const { orderIds } = req.body;

        let query = {};
        if (orderIds && Array.isArray(orderIds) && orderIds.length > 0) {
            query._id = { $in: orderIds };
        }

        const orders = await Order.find(query)
            .populate('product', 'name')
            .populate('user', 'name email')
            .lean();

        // Create CSV data
        const csvHeaders = [
            'Order Number',
            'Customer Name',
            'Customer Email',
            'Product',
            'Quantity',
            'Amount',
            'Status',
            'Payment Status',
            'Created Date',
        ];

        const csvRows = orders.map(order => [
            order.orderNumber,
            order.user?.name || '',
            order.user?.email || '',
            order.product?.name || '',
            order.quantity,
            order.priceSnapshot?.totalPayable || 0,
            order.status,
            order.paymentStatus,
            new Date(order.createdAt).toLocaleDateString('en-IN'),
        ]);

        const csvContent = [
            csvHeaders.join(','),
            ...csvRows.map(row => row.map(cell => `"${cell}"`).join(',')),
        ].join('\n');

        res.setHeader('Content-Type', 'text/csv');
        res.setHeader(
            'Content-Disposition',
            `attachment; filename=orders_export_${new Date().toISOString().split('T')[0]}.csv`
        );
        res.status(200).send(csvContent);
    } catch (error) {
        console.error('Export orders error:', error);
        res.status(500).json({ error: 'Failed to export orders' });
    }
};
