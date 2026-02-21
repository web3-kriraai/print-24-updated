import PhysicalDesignerBooking from '../designer/models/PhysicalDesignerBooking.js';
import { User } from '../models/User.js';
import mongoose from 'mongoose';

/**
 * Get overall designer stats for admin dashboard
 */
export const getDesignerStats = async (req, res) => {
    try {
        const stats = await PhysicalDesignerBooking.aggregate([
            {
                $group: {
                    _id: null,
                    totalAppointments: { $sum: 1 },
                    scheduled: { $sum: { $cond: [{ $eq: ['$visitStatus', 'Scheduled'] }, 1, 0] } },
                    accepted: { $sum: { $cond: [{ $eq: ['$visitStatus', 'Accepted'] }, 1, 0] } },
                    inProgress: { $sum: { $cond: [{ $eq: ['$visitStatus', 'InProgress'] }, 1, 0] } },
                    completed: { $sum: { $cond: [{ $eq: ['$visitStatus', 'Completed'] }, 1, 0] } },
                    cancelled: { $sum: { $cond: [{ $eq: ['$visitStatus', 'Cancelled'] }, 1, 0] } },
                    totalRevenue: { $sum: '$totalAmount' }
                }
            }
        ]);

        const designerCount = await User.countDocuments({ role: 'designer' });

        const result = stats.length > 0 ? stats[0] : {
            totalAppointments: 0,
            scheduled: 0,
            accepted: 0,
            inProgress: 0,
            completed: 0,
            cancelled: 0,
            totalRevenue: 0
        };

        res.status(200).json({
            success: true,
            data: {
                ...result,
                totalDesigners: designerCount
            }
        });
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
};

/**
 * Get report of all designers with their metrics
 */
export const getDesignersReport = async (req, res) => {
    try {
        const report = await User.aggregate([
            { $match: { role: 'designer' } },
            {
                $lookup: {
                    from: 'physicaldesignerbookings',
                    localField: '_id',
                    foreignField: 'designerId',
                    as: 'bookings'
                }
            },
            {
                $project: {
                    _id: 1,
                    name: 1,
                    email: 1,
                    status: {
                        $cond: [{ $eq: ['$isOnline', true] }, 'Active', 'Inactive']
                    },
                    totalAppointments: { $size: '$bookings' },
                    upcoming: {
                        $size: {
                            $filter: {
                                input: '$bookings',
                                as: 'b',
                                cond: { $in: ['$$b.visitStatus', ['Scheduled', 'Accepted']] }
                            }
                        }
                    },
                    completed: {
                        $size: {
                            $filter: {
                                input: '$bookings',
                                as: 'b',
                                cond: { $eq: ['$$b.visitStatus', 'Completed'] }
                            }
                        }
                    },
                    revenue: { $sum: '$bookings.totalAmount' }
                }
            },
            { $sort: { revenue: -1, name: 1 } }
        ]);

        res.status(200).json({ success: true, data: report });
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
};

/**
 * Get detailed bookings for a specific designer
 */
export const getDesignerDetailedReport = async (req, res) => {
    const { id } = req.params;
    const { range } = req.query; // today, week, month

    try {
        const query = { designerId: new mongoose.Types.ObjectId(id) };

        if (range) {
            const now = new Date();
            let startDate = new Date();
            if (range === 'today') startDate.setHours(0, 0, 0, 0);
            else if (range === 'week') startDate.setDate(now.getDate() - 7);
            else if (range === 'month') startDate.setMonth(now.getMonth() - 1);

            query.visitDate = { $gte: startDate };
        }

        const bookings = await PhysicalDesignerBooking.find(query)
            .populate('customerId', 'name email mobileNumber')
            .sort({ visitDate: -1 });

        const stats = await PhysicalDesignerBooking.aggregate([
            { $match: { designerId: new mongoose.Types.ObjectId(id) } },
            {
                $group: {
                    _id: null,
                    totalRevenue: { $sum: '$totalAmount' },
                    totalMinutes: { $sum: '$totalDurationMinutes' },
                    count: { $sum: 1 }
                }
            }
        ]);

        res.status(200).json({
            success: true,
            data: {
                bookings,
                summary: stats[0] || { totalRevenue: 0, totalMinutes: 0, count: 0 }
            }
        });
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
};
