import React from 'react';
import { useNavigate } from 'react-router-dom';
import { DollarSign, TrendingUp, Settings, BarChart3 } from 'lucide-react';

/**
 * Admin Pricing Hub
 * 
 * Central navigation page for all pricing-related features
 */

const AdminPricingHub = () => {
  const navigate = useNavigate();

  const pricingFeatures = [
    {
      title: 'Virtual Price Books',
      description: 'Manage hierarchical pricing with Smart View Matrix',
      icon: DollarSign,
      path: '/admin/pricing',
      color: 'bg-indigo-600',
      features: ['Smart View Matrix', 'Conflict Resolution', 'Zone & Segment Pricing']
    },
    {
      title: 'Traditional Pricing',
      description: 'Manage price books, modifiers, and rules',
      icon: Settings,
      path: '/admin/dashboard#pricing-books',
      color: 'bg-green-600',
      features: ['Price Books', 'Modifiers', 'Geo Zones', 'User Segments']
    },
    {
      title: 'Audit Logs',
      description: 'View pricing change history and logs',
      icon: TrendingUp,
      path: '/admin/dashboard#pricing-logs',
      color: 'bg-purple-600',
      features: ['Change History', 'User Actions', 'System Events']
    }
  ];

  return (
    <div className="min-h-screen bg-gray-50 py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="text-center mb-12">
          <h1 className="text-4xl font-bold text-gray-900 mb-4">
            💰 Pricing Management Hub
          </h1>
          <p className="text-lg text-gray-600">
            Choose a pricing management tool to get started
          </p>
        </div>

        {/* Feature Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
          {pricingFeatures.map((feature, index) => {
            const Icon = feature.icon;
            return (
              <div
                key={index}
                onClick={() => navigate(feature.path)}
                className="bg-white rounded-xl shadow-md hover:shadow-xl transition-all duration-300 cursor-pointer transform hover:-translate-y-1 overflow-hidden"
              >
                <div className={`${feature.color} p-6`}>
                  <div className="flex items-center gap-4">
                    <div className="bg-white bg-opacity-20 p-3 rounded-lg">
                      <Icon className="w-8 h-8 text-white" />
                    </div>
                    <div>
                      <h2 className="text-2xl font-bold text-white">
                        {feature.title}
                      </h2>
                    </div>
                  </div>
                </div>

                <div className="p-6">
                  <p className="text-gray-600 mb-4">
                    {feature.description}
                  </p>

                  <div className="space-y-2">
                    <p className="text-sm font-semibold text-gray-700 mb-2">
                      Features:
                    </p>
                    {feature.features.map((item, idx) => (
                      <div key={idx} className="flex items-center gap-2">
                        <div className="w-1.5 h-1.5 bg-gray-400 rounded-full"></div>
                        <span className="text-sm text-gray-600">{item}</span>
                      </div>
                    ))}
                  </div>

                  <button className="mt-6 w-full py-2 px-4 bg-gray-100 hover:bg-gray-200 text-gray-800 font-semibold rounded-lg transition-colors">
                    Open →
                  </button>
                </div>
              </div>
            );
          })}
        </div>

        {/* Quick Links */}
        <div className="mt-12 bg-white rounded-xl shadow-md p-6">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">
            Quick Actions
          </h3>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <button
              onClick={() => navigate('/admin/pricing')}
              className="py-3 px-4 bg-indigo-50 hover:bg-indigo-100 text-indigo-700 font-medium rounded-lg transition-colors text-left"
            >
              <div className="font-semibold">Create Virtual Price</div>
              <div className="text-sm text-indigo-600">Smart View Matrix</div>
            </button>
            <button
              onClick={() => navigate('/admin/dashboard#pricing-modifiers')}
              className="py-3 px-4 bg-green-50 hover:bg-green-100 text-green-700 font-medium rounded-lg transition-colors text-left"
            >
              <div className="font-semibold">Add Modifier Rule</div>
              <div className="text-sm text-green-600">Pricing Modifiers</div>
            </button>
            <button
              onClick={() => navigate('/admin/dashboard#pricing-preview')}
              className="py-3 px-4 bg-blue-50 hover:bg-blue-100 text-blue-700 font-medium rounded-lg transition-colors text-left"
            >
              <div className="font-semibold">Test Pricing</div>
              <div className="text-sm text-blue-600">Preview Panel</div>
            </button>
          </div>
        </div>

        {/* Back Button */}
        <div className="mt-8 text-center">
          <button
            onClick={() => navigate('/admin/dashboard')}
            className="text-gray-600 hover:text-gray-900 font-medium"
          >
            ← Back to Admin Dashboard
          </button>
        </div>
      </div>
    </div>
  );
};

export default AdminPricingHub;
