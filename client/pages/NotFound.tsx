import React from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Home, ArrowLeft, Search } from 'lucide-react';

/**
 * NotFound (404) Page
 * 
 * Displays a user-friendly 404 error page when a route doesn't exist.
 */
const NotFound: React.FC = () => {
    const navigate = useNavigate();

    return (
        <div className="min-h-screen bg-linear-to-br from-cream-50 to-cream-100 flex items-center justify-center px-4">
            <div className="max-w-md w-full text-center">
                {/* Animated 404 Text */}
                <div className="relative mb-8">
                    <h1 className="text-9xl font-bold text-cream-200 select-none">
                        404
                    </h1>
                    <div className="absolute inset-0 flex items-center justify-center">
                        <div className="bg-cream-900 text-white px-6 py-2 rounded-full shadow-lg">
                            <span className="text-lg font-semibold">Page Not Found</span>
                        </div>
                    </div>
                </div>

                {/* Message */}
                <h2 className="text-2xl font-bold text-cream-900 mb-4">
                    Oops! Looks like you're lost
                </h2>
                <p className="text-cream-600 mb-8 leading-relaxed">
                    The page you're looking for doesn't exist or has been moved.
                    Don't worry, let's get you back on track!
                </p>

                {/* Action Buttons */}
                <div className="flex flex-col sm:flex-row gap-4 justify-center">
                    <button
                        onClick={() => navigate(-1)}
                        className="flex items-center justify-center gap-2 px-6 py-3 bg-white border-2 border-cream-300 text-cream-700 rounded-lg font-semibold hover:bg-cream-50 hover:border-cream-400 transition-all shadow-sm"
                    >
                        <ArrowLeft className="w-5 h-5" />
                        Go Back
                    </button>
                    <Link
                        to="/"
                        className="flex items-center justify-center gap-2 px-6 py-3 bg-cream-900 text-white rounded-lg font-semibold hover:bg-cream-800 transition-all shadow-lg"
                    >
                        <Home className="w-5 h-5" />
                        Home Page
                    </Link>
                </div>

                {/* Quick Links */}
                <div className="mt-12 pt-8 border-t border-cream-200">
                    <p className="text-sm text-cream-500 mb-4">Popular destinations:</p>
                    <div className="flex flex-wrap gap-3 justify-center">
                        <Link to="/digital-print" className="text-cream-600 hover:text-cream-900 text-sm font-medium hover:underline">
                            Digital Print
                        </Link>
                        <span className="text-cream-300">•</span>
                        <Link to="/about" className="text-cream-600 hover:text-cream-900 text-sm font-medium hover:underline">
                            About Us
                        </Link>
                        <span className="text-cream-300">•</span>
                        <Link to="/contact" className="text-cream-600 hover:text-cream-900 text-sm font-medium hover:underline">
                            Contact
                        </Link>
                        <span className="text-cream-300">•</span>
                        <Link to="/reviews" className="text-cream-600 hover:text-cream-900 text-sm font-medium hover:underline">
                            Reviews
                        </Link>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default NotFound;
