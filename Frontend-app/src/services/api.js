import axios from 'axios';

// 🚨 TEMPORARY FIX: Directly use your Render backend URL
// This will fix the CORS issues immediately
const API_URL = 'https://anime-api-backend-u42d.onrender.com/api';

// Optional: Add console log to verify the URL (remove after testing)
console.log('🔧 API Configuration:', {
  envVariable: 'Using direct Render URL (temporary fix)',
  finalURL: API_URL,
  mode: import.meta.env.MODE
});

// Create axios instance
const api = axios.create({
  baseURL: API_URL,
  headers: {
    'Content-Type': 'application/json',
  },
  // ⚠️ REMOVE THIS LINE TEMPORARILY to fix CORS issues
  // withCredentials: true,
});

// Add token to requests
api.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem('token');
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => {
    return Promise.reject(error);
  }
);

// Handle responses and errors
api.interceptors.response.use(
  (response) => response,
  (error) => {
    // Enhanced error logging
    console.error('API Error:', {
      message: error.message,
      status: error.response?.status,
      data: error.response?.data,
      url: error.config?.url
    });

    if (error.response?.status === 401) {
      // Token expired or invalid
      localStorage.removeItem('token');
      localStorage.removeItem('user');
      window.location.href = '/login';
    }
    return Promise.reject(error);
  }
);

// Auth API
export const authAPI = {
  register: (data) => api.post('/auth/register', data),
  login: (data) => api.post('/auth/login', data),
  getProfile: () => api.get('/auth/profile'),
  updateProfile: (data) => api.put('/auth/profile', data),
  addAddress: (data) => api.post('/auth/address', data),
  deleteAddress: (id) => api.delete(`/auth/address/${id}`),
};

// Product API
export const productAPI = {
  getAllProducts: (params) => api.get('/products', { params }),
  getProductById: (id) => api.get(`/products/${id}`),
  getFeatured: () => api.get('/products/featured'),
  getByCategory: (category) => api.get(`/products/category/${category}`),
  createProduct: (data) => api.post('/products', data),
  updateProduct: (id, data) => api.put(`/products/${id}`, data),
  deleteProduct: (id) => api.delete(`/products/${id}`),
};

// Cart API
export const cartAPI = {
  getCart: () => api.get('/cart'),
  addToCart: (data) => api.post('/cart/add', data),
  updateCartItem: (itemId, data) => api.put(`/cart/update/${itemId}`, data),
  removeFromCart: (itemId) => api.delete(`/cart/remove/${itemId}`),
  clearCart: () => api.delete('/cart/clear'),
};

// Order API
export const orderAPI = {
  createOrder: (data) => api.post('/orders', data),
  getMyOrders: () => api.get('/orders/myorders'),
  getOrderById: (id) => api.get(`/orders/${id}`),
  updateOrderToPaid: (id, data) => api.put(`/orders/${id}/pay`, data),
  cancelOrder: (id) => api.put(`/orders/${id}/cancel`),
  // Admin
  getAllOrders: () => api.get('/orders'),
  updateOrderStatus: (id, data) => api.put(`/orders/${id}/status`, data),
};

// 🆕 PAYMENT API - ADDED THIS SECTION
export const paymentAPI = {
  createCheckoutSession: (data) => api.post('/payment/create-checkout-session', data),
  verifyPayment: (sessionId) => api.get(`/payment/verify/${sessionId}`),
  testPayment: () => api.get('/payment/test'), // For testing if payment routes work
};

// Admin API
export const adminAPI = {
  getStats: () => api.get('/admin/stats'),
  getAllUsers: () => api.get('/admin/users'),
  deleteUser: (id) => api.delete(`/admin/users/${id}`),
  updateUserRole: (id, data) => api.put(`/admin/users/${id}/role`, data),
};

export default api;