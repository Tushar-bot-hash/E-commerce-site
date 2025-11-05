import { create } from 'zustand';
import { authAPI } from '../services/api';
import toast from 'react-hot-toast';

const useAuthStore = create((set) => ({
  user: JSON.parse(localStorage.getItem('user')) || null,
  token: localStorage.getItem('token') || null,
  isAuthenticated: !!localStorage.getItem('token'),
  loading: false,

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

  // Get Profile
  getProfile: async () => {
    try {
      const response = await authAPI.getProfile();
      const user = response.data.user;
      localStorage.setItem('user', JSON.stringify(user));
      set({ user });
      return { success: true, user };
    } catch (error) {
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