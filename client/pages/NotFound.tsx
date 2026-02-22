import React from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Home, ArrowLeft } from 'lucide-react';

/**
 * NotFound (404) Page
 *
 * Displays a user-friendly 404 error page when a route doesn't exist.
 */
const NotFound: React.FC = () => {
    const navigate = useNavigate();

    return (
        <div className="min-h-screen bg-gradient-to-br from-blue-50/80 via-white to-purple-50/80 flex items-center justify-center px-4">
            <div className="max-w-md w-full text-center">
                {/* Animated 404 Text */}
                <div className="relative mb-8">
                    <h1 className="text-9xl font-bold text-slate-200 select-none">
                        404
                    </h1>
                    <div className="absolute inset-0 flex items-center justify-center">
                        <div className="bg-gradient-to-r from-blue-600 to-purple-600 text-white px-6 py-2 rounded-full shadow-lg">
                            <span className="text-lg font-semibold">Page Not Found</span>
                        </div>
                    </div>
                </div>

                {/* Message */}
                <h2 className="text-2xl font-bold text-slate-900 mb-4">
                    Oops! Looks like you're lost
                </h2>
                <p className="text-slate-600 mb-8 leading-relaxed">
                    The page you're looking for doesn't exist or has been moved.
                    Don't worry, let's get you back on track!
                </p>

                {/* Action Buttons */}
                <div className="flex flex-col sm:flex-row gap-4 justify-center">
                    <button
                        onClick={() => navigate(-1)}
                        className="flex items-center justify-center gap-2 px-6 py-3 bg-white border-2 border-slate-300 text-slate-700 rounded-lg font-semibold hover:bg-slate-50 hover:border-slate-400 transition-all shadow-sm"
                    >
                        <ArrowLeft className="w-5 h-5" />
                        Go Back
                    </button>
                    <Link
                        to="/"
                        className="flex items-center justify-center gap-2 px-6 py-3 bg-gradient-to-r from-blue-600 to-purple-600 text-white rounded-lg font-semibold hover:from-blue-700 hover:to-purple-700 transition-all shadow-lg"
                    >
                        <Home className="w-5 h-5" />
                        Home Page
                    </Link>
                </div>

                {/* Quick Links */}
                <div className="mt-12 pt-8 border-t border-slate-200">
                    <p className="text-sm text-slate-500 mb-4">Popular destinations:</p>
                    <div className="flex flex-wrap gap-3 justify-center">
                        <Link to="/home/allservices" className="text-slate-600 hover:text-blue-600 text-sm font-medium hover:underline transition-colors">
                            All Services
                        </Link>
                        <span className="text-slate-300">•</span>
                        <Link to="/about" className="text-slate-600 hover:text-blue-600 text-sm font-medium hover:underline transition-colors">
                            About Us
                        </Link>
                        <span className="text-slate-300">•</span>
                        <Link to="/contact" className="text-slate-600 hover:text-blue-600 text-sm font-medium hover:underline transition-colors">
                            Contact
                        </Link>
                        <span className="text-slate-300">•</span>
                        <Link to="/reviews" className="text-slate-600 hover:text-blue-600 text-sm font-medium hover:underline transition-colors">
                            Reviews
                        </Link>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default NotFound;
