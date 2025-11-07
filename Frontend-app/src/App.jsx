import React from 'react';
import ReactDOM from 'react-dom/client';
import { createBrowserRouter, RouterProvider } from 'react-router-dom';
import App from './App.jsx';
import './index.css';

// Import all pages and route components needed for configuration (explicit .jsx added)
import Home from './pages/Home.jsx';
import Products from './pages/Products.jsx';
import ProductDetail from './pages/ProductDetail.jsx';
import Cart from './pages/Cart.jsx';
import Checkout from './pages/Checkout.jsx';
import Login from './pages/Login.jsx';
import Register from './pages/Register.jsx';
import Profile from './pages/Profile.jsx';
import Orders from './pages/Orders.jsx';
import OrderDetail from './pages/OrderDetail.jsx';
import ProtectedRoute from './components/common/ProtectedRoute.jsx';
import AdminRoute from './components/common/AdminRoute.jsx';

// Admin Pages
import AdminDashboard from './pages/admin/Dashboard.jsx';
import ProductManagement from './pages/admin/ProductManagement.jsx';
import OrderManagement from './pages/admin/OrderManagement.jsx';
import UserManagement from './pages/admin/UserManagement.jsx';

// Define the Router Configuration using the Data Router API
const router = createBrowserRouter([
  {
    // The root path uses the App component as the main layout/wrapper
    path: '/',
    element: <App />, 
    children: [
      // --- Public Routes ---
      { index: true, element: <Home /> }, 
      { path: 'products', element: <Products /> },
      { path: 'products/:id', element: <ProductDetail /> },
      { path: 'login', element: <Login /> },
      { path: 'register', element: <Register /> },
      
      // --- Protected Routes ---
      { path: 'cart', element: <ProtectedRoute><Cart /></ProtectedRoute> },
      { path: 'checkout', element: <ProtectedRoute><Checkout /></ProtectedRoute> },
      { path: 'profile', element: <ProtectedRoute><Profile /></ProtectedRoute> },
      { path: 'orders', element: <ProtectedRoute><Orders /></ProtectedRoute> },
      { path: 'orders/:id', element: <ProtectedRoute><OrderDetail /></ProtectedRoute> },

      // --- Admin Routes ---
      { path: 'admin', element: <AdminRoute><AdminDashboard /></AdminRoute> },
      { path: 'admin/products', element: <AdminRoute><ProductManagement /></AdminRoute> },
      { path: 'admin/orders', element: <AdminRoute><OrderManagement /></AdminRoute> },
      { path: 'admin/users', element: <AdminRoute><UserManagement /></AdminRoute> },
    ],
  },
], {
  // ✅ FIX: Enable v7 future flags to resolve the console warnings
  future: {
    v7_startTransition: true,
    v7_relativeSplatPath: true,
  },
});

ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    
    <RouterProvider router={router} /> 
  </React.StrictMode>
);

