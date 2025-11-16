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
  timeout: 30000, // 30 seconds timeout for better error handling
});

// Add token to requests
api.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem('token');
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    
    // Log API calls for debugging
    console.log(`🚀 API Call: ${config.method?.toUpperCase()} ${config.url}`);
    
    return config;
  },
  (error) => {
    console.error('❌ Request Interceptor Error:', error);
    return Promise.reject(error);
  }
);

// Handle responses and errors
api.interceptors.response.use(
  (response) => {
    console.log(`✅ API Success: ${response.config.url}`, response.status);
    return response;
  },
  (error) => {
    console.error('❌ API Error:', {
      message: error.message,
      status: error.response?.status,
      data: error.response?.data,
      url: error.config?.url,
      method: error.config?.method
    });

    if (error.response?.status === 401) {
      console.log('🔐 Unauthorized - Redirecting to login');
      localStorage.removeItem('token');
      localStorage.removeItem('user');
      window.location.href = '/login';
    }
    
    // Handle timeout errors
    if (error.code === 'ECONNABORTED') {
      console.error('⏰ Request timeout');
      return Promise.reject(new Error('Request timeout. Please try again.'));
    }
    
    // Handle network errors
    if (!error.response) {
      console.error('🌐 Network error - No response from server');
      return Promise.reject(new Error('Network error. Please check your connection.'));
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
  
  getProductReviews: (productId, page = 1, limit = 10) => 
    api.get(`/products/${productId}/reviews?page=${page}&limit=${limit}`),
  
  getReviewStats: (productId) => 
    api.get(`/products/${productId}/reviews/stats`),
  
  checkCanReview: (productId) => 
    api.get(`/products/${productId}/can-review`),
  
  submitReview: (productId, data) => 
    api.post(`/products/${productId}/reviews`, data),
};

// Cart API
export const cartAPI = {
  getCart: () => api.get('/cart'),
  addToCart: (data) => api.post('/cart/add', data),
  updateCartItem: (itemId, data) => api.put(`/cart/update/${itemId}`, data),
  removeFromCart: (itemId) => api.delete(`/cart/remove/${itemId}`),
  clearCart: () => api.delete('/cart/clear'),
};

// Order API - IMPROVED WITH DEBUGGING
export const orderAPI = {
  createOrder: (data) => {
    console.log('🛒 Creating order with data:', data);
    return api.post('/orders', data);
  },
  getMyOrders: () => {
    console.log('📦 Fetching user orders');
    return api.get('/orders/myorders');
  },
  getOrderById: (id) => {
    console.log(`📦 Fetching order: ${id}`);
    return api.get(`/orders/${id}`);
  },
  updateOrderToPaid: (id, data) => {
    console.log(`💳 Marking order as paid: ${id}`);
    return api.put(`/orders/${id}/pay`, data);
  },
  cancelOrder: (id) => {
    console.log(`❌ Cancelling order: ${id}`);
    return api.put(`/orders/${id}/cancel`);
  },
  getAllOrders: () => {
    console.log('👑 Fetching ALL orders (Admin)');
    return api.get('/orders');
  },
  updateOrderStatus: (id, data) => {
    console.log(`🔄 Updating order status: ${id}`, data);
    return api.put(`/orders/${id}/status`, data);
  },
};

// Payment API
export const paymentAPI = {
  createCheckoutSession: (data) => api.post('/payment/create-checkout-session', data),
  verifyPayment: (sessionId) => api.get(`/payment/verify/${sessionId}`),
  testPayment: () => api.get('/payment/test'),
};

// Review API
export const reviewAPI = {
  getProductReviews: (productId, page = 1, limit = 10) => 
    api.get(`/reviews/product/${productId}?page=${page}&limit=${limit}`),
  
  getUserReviews: (page = 1, limit = 10) => 
    api.get(`/reviews/user?page=${page}&limit=${limit}`),
  
  createReview: (data) => api.post('/reviews', data),
  
  updateReview: (reviewId, data) => api.put(`/reviews/${reviewId}`, data),
  
  deleteReview: (reviewId) => api.delete(`/reviews/${reviewId}`),
  
  markHelpful: (reviewId) => api.post(`/reviews/${reviewId}/helpful`),
  
  canReviewProduct: (productId) => api.get(`/reviews/can-review/${productId}`),
  
  getReviewStats: (productId) => api.get(`/reviews/stats/${productId}`),
};

// Admin API
export const adminAPI = {
  getStats: () => {
    console.log('📊 Fetching admin stats');
    return api.get('/admin/stats');
  },
  getAllUsers: () => {
    console.log('👥 Fetching all users (Admin)');
    return api.get('/admin/users');
  },
  deleteUser: (id) => {
    console.log(`🗑️ Deleting user: ${id}`);
    return api.delete(`/admin/users/${id}`);
  },
  updateUserRole: (id, data) => {
    console.log(`👑 Updating user role: ${id}`, data);
    return api.put(`/admin/users/${id}/role`, data);
  },
};

export default api;