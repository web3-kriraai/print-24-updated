import React from 'react';
import Layout from './components/Layout';
import ErrorBoundary from './components/ErrorBoundary';
import Home from './pages/Home';
import DigitalPrint from './pages/DigitalPrint';
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
import PaymentGatewayManager from './src/components/admin/PaymentGatewayManager';
import PaymentTestPage from './src/pages/PaymentTestPage';
import PaymentSuccess from './pages/PaymentSuccess';
import PaymentFailure from './pages/PaymentFailure';
import NotFound from './pages/NotFound';
// AdminPricingDashboard and AdminPricingHub removed - functionality consolidated into AdminDashboard

// Shared routes configuration for both SSR and client
export const routes = [
  {
    path: '/',
    element: <Layout />,
    errorElement: <ErrorBoundary />,
    children: [
      { index: true, element: <Home />, errorElement: <ErrorBoundary /> },
      { path: 'digital-print', element: <DigitalPrint />, errorElement: <ErrorBoundary /> },
      { path: 'digital-print/:categoryId', element: <VisitingCards />, errorElement: <ErrorBoundary /> },
      { path: 'digital-print/:categoryId/gloss-finish', element: <GlossProductSelection />, errorElement: <ErrorBoundary /> },
      // Product detail routes - must come before subcategory routes to match correctly
      // Support nested subcategories: /categoryId/subCategoryId/nestedSubCategoryId/productId
      // Subcategory products list - must come BEFORE product detail routes to handle ambiguous 3-segment paths correctly
      // Support nested subcategories: /categoryId/subCategoryId/nestedSubCategoryId
      // VisitingCards will detect if the 3rd segment is a product and render GlossProductSelection if needed
      { path: 'digital-print/:categoryId/:subCategoryId/:nestedSubCategoryId', element: <VisitingCards />, errorElement: <ErrorBoundary /> },
      { path: 'digital-print/:categoryId/:subCategoryId', element: <VisitingCards />, errorElement: <ErrorBoundary /> },

      // Product detail routes
      // Support nested subcategories: /categoryId/subCategoryId/nestedSubCategoryId/productId
      { path: 'digital-print/:categoryId/:subCategoryId/:nestedSubCategoryId/:productId', element: <GlossProductSelection />, errorElement: <ErrorBoundary /> },
      // Product detail with subcategory: /categoryId/subCategoryId/productId
      { path: 'digital-print/:categoryId/:subCategoryId/:productId', element: <GlossProductSelection />, errorElement: <ErrorBoundary /> },
      // Product detail without subcategory: /categoryId/productId
      { path: 'digital-print/:categoryId/:productId', element: <GlossProductSelection />, errorElement: <ErrorBoundary /> },
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
      { path: 'admin/payment-gateways', element: <PaymentGatewayManager />, errorElement: <ErrorBoundary /> },
      { path: 'admin/test-payment', element: <PaymentTestPage />, errorElement: <ErrorBoundary /> },
      // admin/pricing and admin/pricing-hub removed - use admin/dashboard Pricing tabs instead
      { path: 'employee/dashboard', element: <EmployeeDashboard />, errorElement: <ErrorBoundary /> },
      { path: 'department-portal', element: <DepartmentPortal />, errorElement: <ErrorBoundary /> },
      { path: 'reviews', element: <Reviews />, errorElement: <ErrorBoundary /> },
      // Payment result pages
      { path: 'payment/success', element: <PaymentSuccess />, errorElement: <ErrorBoundary /> },
      { path: 'payment/failure', element: <PaymentFailure />, errorElement: <ErrorBoundary /> },
      // Catch-all 404 route - must be last
      { path: '*', element: <NotFound />, errorElement: <ErrorBoundary /> },
    ],
  },
];
