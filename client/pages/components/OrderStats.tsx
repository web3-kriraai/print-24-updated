import React, { useState, useEffect } from 'react';
import { ShoppingBag, Clock, DollarSign, AlertCircle, TrendingUp } from 'lucide-react';
import { API_BASE_URL } from '../../lib/apiConfig';

interface Stats {
    totalOrders: number;
    pendingOrders: number;
    todayOrders: number;
    totalRevenue: number;
    activeComplaints: number;
}

interface OrderStatsProps {
    refreshTrigger?: any;
}

const OrderStats: React.FC<OrderStatsProps> = ({ refreshTrigger }) => {
    const [stats, setStats] = useState<Stats | null>(null);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const fetchStats = async () => {
            try {
                const token = localStorage.getItem('token');
                const response = await fetch(`${API_BASE_URL}/api/admin/orders/stats`, {
                    headers: {
                        'Authorization': `Bearer ${token}`,
                    }
                });
                if (response.ok) {
                    const data = await response.json();
                    setStats(data);
                }
            } catch (err) {
                console.error('Error fetching order stats:', err);
            } finally {
                setLoading(false);
            }
        };

        fetchStats();
    }, [refreshTrigger]);

    const statCards = [
        {
            label: 'Total Orders',
            value: stats?.totalOrders || 0,
            icon: ShoppingBag,
            color: 'text-blue-600',
            bg: 'bg-blue-50',
        },
        {
            label: 'Pending Approval',
            value: stats?.pendingOrders || 0,
            icon: Clock,
            color: 'text-orange-600',
            bg: 'bg-orange-50',
        },
        {
            label: 'Today\'s Orders',
            value: stats?.todayOrders || 0,
            icon: TrendingUp,
            color: 'text-green-600',
            bg: 'bg-green-50',
        },
        {
            label: 'Active Complaints',
            value: stats?.activeComplaints || 0,
            icon: AlertCircle,
            color: 'text-red-600',
            bg: 'bg-red-50',
        }
    ];

    if (loading) {
        return (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                {[...Array(4)].map((_, i) => (
                    <div key={i} className="bg-white p-6 rounded-xl shadow-sm border border-gray-100 animate-pulse">
                        <div className="h-4 w-24 bg-gray-200 rounded mb-4"></div>
                        <div className="h-8 w-16 bg-gray-200 rounded"></div>
                    </div>
                ))}
            </div>
        );
    }

    return (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            {statCards.map((stat, index) => (
                <div key={index} className="bg-white p-6 rounded-xl shadow-sm border border-gray-100 hover:shadow-md transition-shadow">
                    <div className="flex items-center justify-between">
                        <div>
                            <p className="text-sm font-medium text-gray-500">{stat.label}</p>
                            <h3 className="mt-1 text-2xl font-bold text-gray-900">{stat.value}</h3>
                        </div>
                        <div className={`p-3 rounded-lg ${stat.bg}`}>
                            <stat.icon className={stat.color} size={24} />
                        </div>
                    </div>
                </div>
            ))}
        </div>
    );
};

export default OrderStats;
