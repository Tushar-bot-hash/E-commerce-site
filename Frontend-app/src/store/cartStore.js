import { create } from 'zustand';
import { cartAPI } from '../services/api';
import toast from 'react-hot-toast';

const useCartStore = create((set, get) => ({
  cart: null,
  loading: false,
  cartCount: 0,
  error: null,

  // Fetch cart with better error handling
  fetchCart: async () => {
    set({ loading: true, error: null });
    try {
      const response = await cartAPI.getCart();
      const cart = response.data.cart;
      set({ 
        cart, 
        cartCount: cart.items.reduce((total, item) => total + item.quantity, 0),
        loading: false 
      });
    } catch (error) {
      console.error('Fetch cart error:', error);
      const errorMessage = error.response?.data?.message || 'Failed to load cart';
      set({ 
        loading: false, 
        error: errorMessage,
        cart: null,
        cartCount: 0
      });
      
      // Only show toast for non-auth errors
      if (error.response?.status !== 401) {
        toast.error(errorMessage);
      }
    }
  },

  // Add to cart
  addToCart: async (productData) => {
    try {
      const response = await cartAPI.addToCart(productData);
      const cart = response.data.cart;
      set({ 
        cart,
        cartCount: cart.items.reduce((total, item) => total + item.quantity, 0),
        error: null
      });
      toast.success('Added to cart!');
      return { success: true };
    } catch (error) {
      const message = error.response?.data?.message || 'Failed to add to cart';
      set({ error: message });
      toast.error(message);
      return { success: false, error: message };
    }
  },

  // Update cart item
  updateCartItem: async (itemId, quantity) => {
    try {
      const response = await cartAPI.updateCartItem(itemId, { quantity });
      const cart = response.data.cart;
      set({ 
        cart,
        cartCount: cart.items.reduce((total, item) => total + item.quantity, 0),
        error: null
      });
      
      if (quantity === 0) {
        toast.success('Item removed from cart');
      } else {
        toast.success('Cart updated');
      }
      
      return { success: true };
    } catch (error) {
      const message = error.response?.data?.message || 'Failed to update cart';
      set({ error: message });
      toast.error(message);
      return { success: false, error: message };
    }
  },

  // Remove from cart
  removeFromCart: async (itemId) => {
    try {
      const response = await cartAPI.removeFromCart(itemId);
      const cart = response.data.cart;
      set({ 
        cart,
        cartCount: cart.items.reduce((total, item) => total + item.quantity, 0),
        error: null
      });
      toast.success('Item removed from cart');
      return { success: true };
    } catch (error) {
      const message = error.response?.data?.message || 'Failed to remove item';
      set({ error: message });
      toast.error(message);
      return { success: false, error: message };
    }
  },

  // Clear cart
  clearCart: async () => {
    try {
      await cartAPI.clearCart();
      set({ 
        cart: { items: [], totalPrice: 0 }, 
        cartCount: 0,
        error: null 
      });
      toast.success('Cart cleared');
      return { success: true };
    } catch (error) {
      const message = error.response?.data?.message || 'Failed to clear cart';
      set({ error: message });
      toast.error(message);
      return { success: false, error: message };
    }
  },

  // Get cart total price
  getCartTotal: () => {
    const cart = get().cart;
    return cart?.totalPrice || 0;
  },

  // Check if cart is empty
  isCartEmpty: () => {
    const cart = get().cart;
    return !cart || !cart.items || cart.items.length === 0;
  }
}));

export default useCartStore;