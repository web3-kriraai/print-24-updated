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
      { path: 'profile', element: <Profile />, errorElement: <ErrorBoundary /> },
      { path: 'my-orders', element: <MyOrders />, errorElement: <ErrorBoundary /> },
      { path: 'orders/:orderId', element: <OrderDetails />, errorElement: <ErrorBoundary /> },
      { path: 'order/:orderId', element: <OrderDetails />, errorElement: <ErrorBoundary /> },
      { path: 'admin/dashboard', element: <AdminDashboard />, errorElement: <ErrorBoundary /> },
      { path: 'admin/services', element: <ServiceAdmin />, errorElement: <ErrorBoundary /> },
      { path: 'admin/about', element: <AboutAdmin />, errorElement: <ErrorBoundary /> },
      { path: 'employee/dashboard', element: <EmployeeDashboard />, errorElement: <ErrorBoundary /> },
      { path: 'department-portal', element: <DepartmentPortal />, errorElement: <ErrorBoundary /> },
      { path: 'admin/test-payment', element: <PaymentTestPage />, errorElement: <ErrorBoundary /> },

      // Complaint Routes
      { path: 'complaints/register/:orderId', element: <RegisterComplaint />, errorElement: <ErrorBoundary /> },
      { path: 'complaints/:id', element: <ComplaintDetails />, errorElement: <ErrorBoundary /> },
      { path: 'admin/complaints', element: <AdminComplaintManagement />, errorElement: <ErrorBoundary /> },
      { path: 'bulk-order/:id/status', element: <BulkOrderStatus />, errorElement: <ErrorBoundary /> },
      { path: 'bulk-orders', element: <BulkOrdersPage />, errorElement: <ErrorBoundary /> },
      { path: 'bulk-orders/:id', element: <BulkOrdersPage />, errorElement: <ErrorBoundary /> },

      { path: 'reviews', element: <Reviews />, errorElement: <ErrorBoundary /> },
      // 404 catch-all route - must be last
      { path: '*', element: <NotFound /> },
    ],
  },
];
