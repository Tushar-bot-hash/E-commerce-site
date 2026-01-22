import { create } from 'zustand';
import { authAPI } from '../services/api';
import toast from 'react-hot-toast';

const useAuthStore = create((set, get) => ({
  user: localStorage.getItem('user') ? JSON.parse(localStorage.getItem('user')) : null,
  token: localStorage.getItem('token') || null,
  isAuthenticated: !!localStorage.getItem('token'),
  loading: false,
  isInitialized: false, // New state to track if we've checked the token on load

  // Register
  register: async (data) => {
    set({ loading: true });
    try {
      const response = await authAPI.register(data);
      const { user, token } = response.data;
      
      localStorage.setItem('user', JSON.stringify(user));
      localStorage.setItem('token', token);
      
      set({ user, token, isAuthenticated: true, loading: false });
      toast.success('Registration successful!');
      return { success: true };
    } catch (error) {
      set({ loading: false });
      const message = error.response?.data?.message || 'Registration failed';
      toast.error(message);
      return { success: false, message };
    }
  },

  // Login
  login: async (data) => {
    set({ loading: true });
    try {
      const response = await authAPI.login(data);
      const { user, token } = response.data;
      
      localStorage.setItem('user', JSON.stringify(user));
      localStorage.setItem('token', token);
      
      set({ user, token, isAuthenticated: true, loading: false });
      toast.success('Login successful!');
      return { success: true };
    } catch (error) {
      set({ loading: false });
      const message = error.response?.data?.message || 'Login failed';
      toast.error(message);
      return { success: false, message };
    }
  },

  // Logout
  logout: () => {
    localStorage.removeItem('user');
    localStorage.removeItem('token');
    set({ user: null, token: null, isAuthenticated: false });
    toast.success('Logged out successfully');
  },

  // Get Profile / Check Auth
  getProfile: async () => {
    const token = localStorage.getItem('token');
    if (!token) return { success: false };

    try {
      // If this call fails with 404, you MUST update your server.js 
      // to include: app.use('/api/users', require('./src/routes/auth'));
      const response = await authAPI.getProfile();
      const user = response.data.user;
      
      localStorage.setItem('user', JSON.stringify(user));
      set({ user, isAuthenticated: true, isInitialized: true });
      return { success: true, user };
    } catch (error) {
      // If token is invalid or expired
      if (error.response?.status === 401) {
        get().logout();
      }
      set({ isInitialized: true });
      return { success: false };
    }
  },

  // Update Profile
  updateProfile: async (data) => {
    set({ loading: true });
    try {
      const response = await authAPI.updateProfile(data);
      const user = response.data.user;
      localStorage.setItem('user', JSON.stringify(user));
      set({ user, loading: false });
      toast.success('Profile updated successfully');
      return { success: true };
    } catch (error) {
      set({ loading: false });
      const message = error.response?.data?.message || 'Update failed';
      toast.error(message);
      return { success: false };
    }
  },
}));

export default useAuthStore;