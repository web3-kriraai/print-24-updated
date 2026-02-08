import React from 'react';
import { Link } from 'react-router-dom';
// Layout is handled by the route configuration

const PMSDashboard: React.FC = () => {
    return (
        <div className="p-6 bg-gray-50 min-h-screen">
            <div className="mb-8">
                <h1 className="text-3xl font-bold text-gray-900">Privilege Management System</h1>
                <p className="text-gray-600 mt-2">Manage user types, privileges, view styles, and system access.</p>
            </div>

            {/* Quick Actions Grid */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 mb-8">

                <Link to="/admin/pms/user-types" className="block p-6 bg-white rounded-lg shadow hover:shadow-md transition-shadow border-l-4 border-blue-500">
                    <div className="flex items-center justify-between pointer-events-none">
                        <div>
                            <h3 className="text-lg font-semibold text-gray-900">User Types</h3>
                            <p className="text-sm text-gray-500 mt-1">Manage user hierarchies and roles</p>
                        </div>
                        <div className="text-blue-500 text-2xl">Create</div>
                    </div>
                </Link>

                <Link to="/admin/pms/privileges" className="block p-6 bg-white rounded-lg shadow hover:shadow-md transition-shadow border-l-4 border-green-500">
                    <div className="flex items-center justify-between pointer-events-none">
                        <div>
                            <h3 className="text-lg font-semibold text-gray-900">Privilege Bundles</h3>
                            <p className="text-sm text-gray-500 mt-1">Define reusable permission sets</p>
                        </div>
                        <div className="text-green-500 text-2xl">Manage</div>
                    </div>
                </Link>

                <Link to="/admin/pms/view-styles" className="block p-6 bg-white rounded-lg shadow hover:shadow-md transition-shadow border-l-4 border-purple-500">
                    <div className="flex items-center justify-between pointer-events-none">
                        <div>
                            <h3 className="text-lg font-semibold text-gray-900">View Styles</h3>
                            <p className="text-sm text-gray-500 mt-1">Customize UI configurations</p>
                        </div>
                        <div className="text-purple-500 text-2xl">Design</div>
                    </div>
                </Link>

                <Link to="/admin/pms/assignments" className="block p-6 bg-white rounded-lg shadow hover:shadow-md transition-shadow border-l-4 border-orange-500">
                    <div className="flex items-center justify-between pointer-events-none">
                        <div>
                            <h3 className="text-lg font-semibold text-gray-900">Assignments</h3>
                            <p className="text-sm text-gray-500 mt-1">Assign users to types</p>
                        </div>
                        <div className="text-orange-500 text-2xl">Assign</div>
                    </div>
                </Link>

                <Link to="/admin/pms/resources" className="block p-6 bg-white rounded-lg shadow hover:shadow-md transition-shadow border-l-4 border-red-500">
                    <div className="flex items-center justify-between pointer-events-none">
                        <div>
                            <h3 className="text-lg font-semibold text-gray-900">Resource Registry</h3>
                            <p className="text-sm text-gray-500 mt-1">System resources & actions</p>
                        </div>
                        <div className="text-red-500 text-2xl">View</div>
                    </div>
                </Link>

                <Link to="/admin/pms/features" className="block p-6 bg-white rounded-lg shadow hover:shadow-md transition-shadow border-l-4 border-indigo-500">
                    <div className="flex items-center justify-between pointer-events-none">
                        <div>
                            <h3 className="text-lg font-semibold text-gray-900">Feature Flags</h3>
                            <p className="text-sm text-gray-500 mt-1">Manage feature toggles</p>
                        </div>
                        <div className="text-indigo-500 text-2xl">Toggle</div>
                    </div>
                </Link>

                <Link to="/admin/pms/audit" className="block p-6 bg-white rounded-lg shadow hover:shadow-md transition-shadow border-l-4 border-gray-500">
                    <div className="flex items-center justify-between pointer-events-none">
                        <div>
                            <h3 className="text-lg font-semibold text-gray-900">Audit Logs</h3>
                            <p className="text-sm text-gray-500 mt-1">View change history</p>
                        </div>
                        <div className="text-gray-500 text-2xl">Log</div>
                    </div>
                </Link>

            </div>

        </div>
    );
};

export default PMSDashboard;
