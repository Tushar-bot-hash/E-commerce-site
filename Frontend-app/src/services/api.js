import axios from 'axios';

// 🚨 TEMPORARY FIX: Direct URL to your Render backend
const API_URL = 'https://anime-api-backend-u42d.onrender.com/api';

console.log('🔧 API Configuration:', {
  envVariable: 'Using direct Render URL',
  finalURL: API_URL,
  mode: import.meta.env.MODE
});

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
    console.error('API Error:', {
      message: error.message,
      status: error.response?.status,
      data: error.response?.data,
      url: error.config?.url
    });

    if (error.response?.status === 401) {
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
  getAllOrders: () => api.get('/orders'),
  updateOrderStatus: (id, data) => api.put(`/orders/${id}/status`, data),
};

// Payment API
export const paymentAPI = {
  createCheckoutSession: (data) => api.post('/payment/create-checkout-session', data),
  verifyPayment: (sessionId) => api.get(`/payment/verify/${sessionId}`),
  testPayment: () => api.get('/payment/test'),
};

// Review API
export const reviewAPI = {
  // Get reviews for a product
  getProductReviews: (productId, page = 1, limit = 10) => 
    api.get(`/reviews/product/${productId}?page=${page}&limit=${limit}`),
  
  // Get user's reviews
  getUserReviews: (page = 1, limit = 10) => 
    api.get(`/reviews/user?page=${page}&limit=${limit}`),
  
  // Create a new review
  createReview: (data) => api.post('/reviews', data),
  
  // Update a review
  updateReview: (reviewId, data) => api.put(`/reviews/${reviewId}`, data),
  
  // Delete a review
  deleteReview: (reviewId) => api.delete(`/reviews/${reviewId}`),
  
  // Mark review as helpful
  markHelpful: (reviewId) => api.post(`/reviews/${reviewId}/helpful`),
  
  // Check if user can review a product (has purchased it)
  canReviewProduct: (productId) => api.get(`/reviews/can-review/${productId}`),
  
  // Get review statistics for a product
  getReviewStats: (productId) => api.get(`/reviews/stats/${productId}`),
};

// Admin API
export const adminAPI = {
  getStats: () => api.get('/admin/stats'),
  getAllUsers: () => api.get('/admin/users'),
  deleteUser: (id) => api.delete(`/admin/users/${id}`),
  updateUserRole: (id, data) => api.put(`/admin/users/${id}/role`, data),
};

export default api;