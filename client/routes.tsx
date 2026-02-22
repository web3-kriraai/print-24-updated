import React from 'react';
import { Navigate } from 'react-router-dom';
import Layout from './components/Layout';
import ErrorBoundary from './components/ErrorBoundary';
import Home from './pages/Home';
import Services from './pages/Services';
import VisitingCards from './pages/VisitingCards';
import GlossProductSelection from './pages/GlossProductSelection';
import Upload from './pages/Upload';
import About from './pages/About';
import Policy from './pages/Policy';
import Contact from './pages/Contact';
import Login from './pages/Login';
import SignUp from './pages/SignUp';
import Reviews from './pages/Reviews';
import Profile from './pages/Profile';
import OrderDetails from './pages/OrderDetails';
import MyOrders from './pages/MyOrders';
import DepartmentPortal from './pages/DepartmentPortal';
import EmployeeDashboard from './pages/EmployeeDashboard';
import AdminDashboard from './pages/AdminDashboard';
import ServiceAdmin from './pages/ServiceAdmin';
import AboutAdmin from './pages/AboutAdmin';
import NotFound from './pages/NotFound';
import PaymentTestPage from './pages/PaymentTestPage';
import RegisterComplaint from './pages/RegisterComplaint';
import ComplaintDetails from './pages/ComplaintDetails';
import AdminComplaintManagement from './pages/admin/AdminComplaintManagement';
import BulkOrderStatus from './pages/BulkOrderStatus';
import BulkOrdersPage from './pages/BulkOrdersPage';
import ClientDashboard from './pages/ClientDashboard';
import DesignerDashboard from './pages/designer/DesignerDashboard';
import ActiveSession from './pages/designer/ActiveSession';

import ProtectedRoute from './components/ProtectedRoute';

// Shared routes configuration for both SSR and client
export const routes = [
  {
    path: '/',
    element: <Layout />,
    errorElement: <ErrorBoundary />,
    children: [
      { index: true, element: <Home />, errorElement: <ErrorBoundary /> },
      // Redirect /home/allservices to homepage
      { path: 'home/allservices', element: <Navigate to="/" replace /> },
      { path: 'home/allservices/:categoryId', element: <VisitingCards />, errorElement: <ErrorBoundary /> },
      { path: 'home/allservices/:categoryId/gloss-finish', element: <GlossProductSelection />, errorElement: <ErrorBoundary /> },
      // Product detail routes - must come before subcategory routes to match correctly
      // Support nested subcategories: /categoryId/subCategoryId/nestedSubCategoryId/productId
      // Subcategory products list - must come BEFORE product detail routes to handle ambiguous 3-segment paths correctly
      // Support nested subcategories: /categoryId/subCategoryId/nestedSubCategoryId
      // VisitingCards will detect if the 3rd segment is a product and render GlossProductSelection if needed
      { path: 'home/allservices/:categoryId/:subCategoryId/:nestedSubCategoryId', element: <VisitingCards />, errorElement: <ErrorBoundary /> },
      { path: 'home/allservices/:categoryId/:subCategoryId', element: <VisitingCards />, errorElement: <ErrorBoundary /> },

      // Product detail routes
      // Support nested subcategories: /categoryId/subCategoryId/nestedSubCategoryId/productId
      { path: 'home/allservices/:categoryId/:subCategoryId/:nestedSubCategoryId/:productId', element: <GlossProductSelection />, errorElement: <ErrorBoundary /> },
      // Product detail with subcategory: /categoryId/subCategoryId/productId
      { path: 'home/allservices/:categoryId/:subCategoryId/:productId', element: <GlossProductSelection />, errorElement: <ErrorBoundary /> },
      // Product detail without subcategory: /categoryId/productId
      { path: 'home/allservices/:categoryId/:productId', element: <GlossProductSelection />, errorElement: <ErrorBoundary /> },
      { path: 'upload', element: <Upload />, errorElement: <ErrorBoundary /> },
      { path: 'about', element: <About />, errorElement: <ErrorBoundary /> },
      { path: 'policy', element: <Policy />, errorElement: <ErrorBoundary /> },
      { path: 'contact', element: <Contact />, errorElement: <ErrorBoundary /> },
      { path: 'login', element: <Login />, errorElement: <ErrorBoundary /> },
      { path: 'signup', element: <SignUp />, errorElement: <ErrorBoundary /> },

      // Protected User Routes
      {
        path: 'profile',
        element: <ProtectedRoute><Profile /></ProtectedRoute>,
        errorElement: <ErrorBoundary />
      },
      {
        path: 'my-orders',
        element: <ProtectedRoute><MyOrders /></ProtectedRoute>,
        errorElement: <ErrorBoundary />
      },
      {
        path: 'orders/:orderId',
        element: <ProtectedRoute><OrderDetails /></ProtectedRoute>,
        errorElement: <ErrorBoundary />
      },
      {
        path: 'order/:orderId',
        element: <ProtectedRoute><OrderDetails /></ProtectedRoute>,
        errorElement: <ErrorBoundary />
      },

      // Admin Only Routes
      {
        path: 'admin/dashboard',
        element: <ProtectedRoute allowedRoles={['admin']}><AdminDashboard /></ProtectedRoute>,
        errorElement: <ErrorBoundary />
      },
      {
        path: 'admin/services',
        element: <ProtectedRoute allowedRoles={['admin']}><ServiceAdmin /></ProtectedRoute>,
        errorElement: <ErrorBoundary />
      },
      {
        path: 'admin/about',
        element: <ProtectedRoute allowedRoles={['admin']}><AboutAdmin /></ProtectedRoute>,
        errorElement: <ErrorBoundary />
      },
      {
        path: 'admin/test-payment',
        element: <ProtectedRoute allowedRoles={['admin']}><PaymentTestPage /></ProtectedRoute>,
        errorElement: <ErrorBoundary />
      },
      {
        path: 'admin/complaints',
        element: <ProtectedRoute allowedRoles={['admin']}><AdminComplaintManagement /></ProtectedRoute>,
        errorElement: <ErrorBoundary />
      },

      // Employee Routes
      {
        path: 'employee/dashboard',
        element: <ProtectedRoute allowedRoles={['emp', 'admin']}><EmployeeDashboard /></ProtectedRoute>,
        errorElement: <ErrorBoundary />
      },
      {
        path: 'department-portal',
        element: <ProtectedRoute allowedRoles={['emp', 'admin']}><DepartmentPortal /></ProtectedRoute>,
        errorElement: <ErrorBoundary />
      },

      // Complaint Routes
      {
        path: 'complaints/register/:orderId',
        element: <ProtectedRoute><RegisterComplaint /></ProtectedRoute>,
        errorElement: <ErrorBoundary />
      },
      {
        path: 'complaints/:id',
        element: <ProtectedRoute><ComplaintDetails /></ProtectedRoute>,
        errorElement: <ErrorBoundary />
      },

      // Bulk Order Routes
      {
        path: 'bulk-order/:id/status',
        element: <ProtectedRoute><BulkOrderStatus /></ProtectedRoute>,
        errorElement: <ErrorBoundary />
      },
      {
        path: 'bulk-orders',
        element: <ProtectedRoute><BulkOrdersPage /></ProtectedRoute>,
        errorElement: <ErrorBoundary />
      },
      {
        path: 'bulk-orders/:id',
        element: <ProtectedRoute><BulkOrdersPage /></ProtectedRoute>,
        errorElement: <ErrorBoundary />
      },

      // Client Dashboard
      {
        path: 'client-dashboard',
        element: <ProtectedRoute allowedRoles={['user', 'customer']}><ClientDashboard /></ProtectedRoute>,
        errorElement: <ErrorBoundary />
      },

      // Designer Routes
      {
        path: 'designer',
        element: <ProtectedRoute allowedRoles={['designer', 'admin']}><DesignerDashboard /></ProtectedRoute>,
        errorElement: <ErrorBoundary />
      },
      {
        path: 'session/:sessionId',
        element: <ProtectedRoute allowedRoles={['designer', 'admin', 'user', 'customer']}><ActiveSession /></ProtectedRoute>,
        errorElement: <ErrorBoundary />
      },

      { path: 'reviews', element: <Reviews />, errorElement: <ErrorBoundary /> },
      // 404 catch-all route - must be last
      { path: '*', element: <NotFound /> },
    ],
  },
];
