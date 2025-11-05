import axios from 'axios';

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000/api';

// Create axios instance
const api = axios.create({
  baseURL: API_URL,
  headers: {
    'Content-Type': 'application/json',
  },
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

// Admin API
export const adminAPI = {
  getStats: () => api.get('/admin/stats'),
  getAllUsers: () => api.get('/admin/users'),
  deleteUser: (id) => api.delete(`/admin/users/${id}`),
  updateUserRole: (id, data) => api.put(`/admin/users/${id}/role`, data),
};

export default api;