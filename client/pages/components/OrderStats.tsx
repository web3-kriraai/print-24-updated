// OrderStats.tsx - Statistics Cards Component
import React, { useState, useEffect } from 'react';
import {
    ShoppingCart, CreditCard, AlertTriangle, DollarSign, Clock
} from 'lucide-react';
import { API_BASE_URL } from '../../lib/apiConfig';

interface Stats {
    totalOrders: number;
    pendingPayment: { count: number; amount: number };
    activeComplaints: number;
    todayRevenue: number;
    avgProcessingTime: number;
}

const OrderStats: React.FC = () => {
    const [stats, setStats] = useState<Stats>({
        totalOrders: 0,
        pendingPayment: { count: 0, amount: 0 },
        activeComplaints: 0,
        todayRevenue: 0,
        avgProcessingTime: 0,
    });
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        fetchStats();
    }, []);

    const fetchStats = async () => {
        try {
            const token = localStorage.getItem('token');
            const response = await fetch(`${API_BASE_URL}/api/admin/orders/stats`, {
                headers: {
                    'Authorization': `Bearer ${token}`,
                },
            });

            if (response.ok) {
                const data = await response.json();
                setStats(data);
            }
        } catch (err) {
            console.error('Failed to fetch stats:', err);
        } finally {
            setLoading(false);
        }
    };

    const statCards = [
        {
            title: 'Total Orders',
            value: stats.totalOrders.toLocaleString(),
            icon: ShoppingCart,
            color: 'bg-blue-500',
            bgColor: 'bg-blue-50',
            textColor: 'text-blue-600',
        },
        {
            title: 'Pending Payment',
            value: `₹${stats.pendingPayment.amount.toLocaleString()}`,
            subtitle: `${stats.pendingPayment.count} orders`,
            icon: CreditCard,
            color: 'bg-orange-500',
            bgColor: 'bg-orange-50',
            textColor: 'text-orange-600',
        },
        {
            title: 'Active Complaints',
            value: stats.activeComplaints.toString(),
            icon: AlertTriangle,
            color: 'bg-red-500',
            bgColor: 'bg-red-50',
            textColor: 'text-red-600',
        },
        {
            title: "Today's Revenue",
            value: `₹${stats.todayRevenue.toLocaleString()}`,
            icon: DollarSign,
            color: 'bg-green-500',
            bgColor: 'bg-green-50',
            textColor: 'text-green-600',
        },
        {
            title: 'Avg Processing Time',
            value: `${stats.avgProcessingTime} days`,
            icon: Clock,
            color: 'bg-purple-500',
            bgColor: 'bg-purple-50',
            textColor: 'text-purple-600',
        },
    ];

    if (loading) {
        return (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4">
                {[1, 2, 3, 4, 5].map((i) => (
                    <div key={i} className="bg-white rounded-lg shadow p-6 animate-pulse">
                        <div className="h-4 bg-gray-200 rounded w-3/4 mb-4"></div>
                        <div className="h-8 bg-gray-200 rounded w-1/2"></div>
                    </div>
                ))}
            </div>
        );
    }

    return (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4">
            {statCards.map((stat, index) => {
                const Icon = stat.icon;
                return (
                    <div
                        key={index}
                        className="bg-white rounded-lg shadow hover:shadow-md transition-shadow cursor-pointer"
                    >
                        <div className="p-6">
                            <div className="flex items-center justify-between mb-4">
                                <div className={`${stat.bgColor} p-3 rounded-lg`}>
                                    <Icon className={stat.textColor} size={24} />
                                </div>
                            </div>
                            <h3 className="text-sm font-medium text-gray-600 mb-1">
                                {stat.title}
                            </h3>
                            <p className="text-2xl font-bold text-gray-900">{stat.value}</p>
                            {stat.subtitle && (
                                <p className="text-xs text-gray-500 mt-1">{stat.subtitle}</p>
                            )}
                        </div>
                    </div>
                );
            })}
        </div>
    );
};

export default OrderStats;
