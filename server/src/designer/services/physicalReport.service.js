import PhysicalDesignerBooking from '../models/PhysicalDesignerBooking.js';

/**
 * physicalReport.service.js
 * 
 * Admin reporting for Physical Designer Visits using MongoDB aggregation.
 * Provides revenue analytics, designer-wise breakdown, and pending payment tracking.
 */

/**
 * Generate admin report for physical designer visits.
 * 
 * Returns:
 * - Total completed visits count
 * - Total revenue (sum of totalAmount for Completed visits)
 * - Designer-wise revenue breakdown (grouped by designerId)
 * - Pending payments (bookings where paymentStatus !== 'Paid')
 * 
 * @param {Object} filters - Optional: { startDate, endDate }
 * @returns {Object} Report data
 */
export async function getAdminReport(filters = {}) {
    const { startDate, endDate } = filters;

    // ── Build date range filter ───────────────────────────────────────────────
    const dateFilter = {};
    if (startDate || endDate) {
        dateFilter.createdAt = {};
        if (startDate) dateFilter.createdAt.$gte = new Date(startDate);
        if (endDate) {
            // Include the full end date by setting to end of day
            const end = new Date(endDate);
            end.setHours(23, 59, 59, 999);
            dateFilter.createdAt.$lte = end;
        }
    }

    // ── 1. Summary aggregation (completed visits + total revenue) ─────────────
    const summaryPipeline = [
        {
            $match: {
                visitStatus: 'Completed',
                ...dateFilter
            }
        },
        {
            $group: {
                _id: null,
                totalCompletedVisits: { $sum: 1 },
                totalRevenue: { $sum: '$totalAmount' },
                totalDurationMinutes: { $sum: '$totalDurationMinutes' }
            }
        }
    ];

    // ── 2. Designer-wise revenue breakdown ────────────────────────────────────
    const designerRevenuePipeline = [
        {
            $match: {
                visitStatus: 'Completed',
                ...dateFilter
            }
        },
        {
            $group: {
                _id: '$designerId',
                totalRevenue: { $sum: '$totalAmount' },
                totalVisits: { $sum: 1 },
                totalDurationMinutes: { $sum: '$totalDurationMinutes' },
                avgHourlyRate: { $avg: '$hourlyRate' }
            }
        },
        {
            // Lookup designer details
            $lookup: {
                from: 'users',
                localField: '_id',
                foreignField: '_id',
                as: 'designerInfo'
            }
        },
        {
            $unwind: {
                path: '$designerInfo',
                preserveNullAndEmpty: true
            }
        },
        {
            $project: {
                _id: 1,
                designerName: '$designerInfo.name',
                designerEmail: '$designerInfo.email',
                totalRevenue: 1,
                totalVisits: 1,
                totalDurationMinutes: 1,
                avgHourlyRate: { $round: ['$avgHourlyRate', 2] }
            }
        },
        {
            $sort: { totalRevenue: -1 } // Highest earning designer first
        }
    ];

    // ── 3. Pending payments ───────────────────────────────────────────────────
    const pendingPaymentsPipeline = [
        {
            $match: {
                visitStatus: 'Completed',
                paymentStatus: { $ne: 'Paid' },
                ...dateFilter
            }
        },
        {
            $lookup: {
                from: 'users',
                localField: 'customerId',
                foreignField: '_id',
                as: 'customerInfo'
            }
        },
        {
            $unwind: {
                path: '$customerInfo',
                preserveNullAndEmpty: true
            }
        },
        {
            $lookup: {
                from: 'users',
                localField: 'designerId',
                foreignField: '_id',
                as: 'designerInfo'
            }
        },
        {
            $unwind: {
                path: '$designerInfo',
                preserveNullAndEmpty: true
            }
        },
        {
            $project: {
                _id: 1,
                customerName: '$customerInfo.name',
                customerEmail: '$customerInfo.email',
                designerName: '$designerInfo.name',
                totalAmount: 1,
                advancePaid: 1,
                remainingAmount: 1,
                paymentStatus: 1,
                visitDate: 1,
                createdAt: 1
            }
        },
        {
            $sort: { remainingAmount: -1 } // Highest pending amount first
        }
    ];

    // ── 4. Status breakdown (all statuses) ────────────────────────────────────
    const statusBreakdownPipeline = [
        {
            $match: { ...dateFilter }
        },
        {
            $group: {
                _id: '$visitStatus',
                count: { $sum: 1 }
            }
        }
    ];

    // ── Run all aggregations in parallel ──────────────────────────────────────
    const [summaryResult, designerRevenue, pendingPayments, statusBreakdown] = await Promise.all([
        PhysicalDesignerBooking.aggregate(summaryPipeline),
        PhysicalDesignerBooking.aggregate(designerRevenuePipeline),
        PhysicalDesignerBooking.aggregate(pendingPaymentsPipeline),
        PhysicalDesignerBooking.aggregate(statusBreakdownPipeline)
    ]);

    // ── Format summary ────────────────────────────────────────────────────────
    const summary = summaryResult[0] || {
        totalCompletedVisits: 0,
        totalRevenue: 0,
        totalDurationMinutes: 0
    };

    // Convert status breakdown array to object for easy consumption
    const statusMap = {};
    statusBreakdown.forEach(item => {
        statusMap[item._id] = item.count;
    });

    return {
        summary: {
            totalCompletedVisits: summary.totalCompletedVisits,
            totalRevenue: summary.totalRevenue,
            totalDurationMinutes: summary.totalDurationMinutes,
            totalDurationHours: parseFloat((summary.totalDurationMinutes / 60).toFixed(2))
        },
        statusBreakdown: statusMap,
        designerRevenue,
        pendingPayments,
        filters: {
            startDate: startDate || null,
            endDate: endDate || null
        },
        generatedAt: new Date().toISOString()
    };
}
