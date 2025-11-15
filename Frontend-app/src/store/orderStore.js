import { create } from 'zustand';

const useOrderStore = create((set, get) => ({
  // State
  orders: [],
  currentOrder: null,
  loading: false,
  error: null,

  // Actions
  createOrder: async (orderData) => {
    set({ loading: true, error: null });
    try {
      // Simulate API call - replace with your actual API
      const response = await fetch('/api/orders', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(orderData),
      });
      
      const newOrder = await response.json();
      
      set((state) => ({
        orders: [...state.orders, newOrder],
        currentOrder: newOrder,
        loading: false,
      }));
      
      return newOrder;
    } catch (error) {
      set({ error: error.message, loading: false });
      throw error;
    }
  },

  fetchOrders: async () => {
    set({ loading: true });
    try {
      const response = await fetch('/api/orders');
      const orders = await response.json();
      set({ orders, loading: false });
    } catch (error) {
      set({ error: error.message, loading: false });
    }
  },

  clearCurrentOrder: () => set({ currentOrder: null }),
  clearError: () => set({ error: null }),
}));

export default useOrderStore;