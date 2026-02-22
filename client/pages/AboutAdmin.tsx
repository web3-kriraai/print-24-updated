import React from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowLeft } from 'lucide-react';
import AboutManagement from './admin/components/AboutManagement';

const AboutAdmin: React.FC = () => {
    const navigate = useNavigate();

    return (
        <div className="min-h-screen bg-gray-50 pt-20">
            {/* Header */}
            <div className="bg-white shadow-sm border-b border-gray-200 mb-8">
                <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
                    <div className="flex items-center gap-4">
                        <button
                            onClick={() => navigate('/admin/dashboard')}
                            className="flex items-center gap-2 text-gray-600 hover:text-gray-900 transition-colors"
                        >
                            <ArrowLeft size={20} />
                            <span>Back to Admin Dashboard</span>
                        </button>
                        <div className="flex-1">
                            <h1 className="text-2xl font-bold text-gray-900">About Section Management</h1>
                            <p className="text-sm text-gray-600 mt-1">
                                Manage content for the About Us page
                            </p>
                        </div>
                    </div>
                </div>
            </div>

            {/* Content */}
            <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
                <AboutManagement />
            </div>
        </div>
    );
};

export default AboutAdmin;
