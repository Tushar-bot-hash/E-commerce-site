import { create } from 'zustand';
import { cartAPI } from '../services/api';
import toast from 'react-hot-toast';

const useCartStore = create((set, get) => ({
  cart: null,
  loading: false,
  cartCount: 0,
  error: null,

  // --- CENTRALIZED CALCULATION LOGIC ---
  // This ensures Cart and Checkout always show the same values
  getCartDetails: () => {
    const cart = get().cart;
    const subtotal = cart?.totalPrice || 0;
    
    // 1. Shipping Logic: Free over ₹1000, else ₹50 (0 if cart is empty)
    const shipping = (subtotal > 1000 || subtotal === 0) ? 0 : 50;
    
    // 2. Tax Logic: 18% GST
    const tax = subtotal * 0.18;
    
    // 3. Final Total
    const total = subtotal + shipping + tax;

    return {
      subtotal,
      shipping,
      tax,
      total,
      freeShippingThreshold: 1000,
      amountToFreeShipping: Math.max(0, 1000 - subtotal)
    };
  },

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
      if (error.response?.status !== 401) {
        toast.error(errorMessage);
      }
    }
  },

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
      toast.error(message);
      return { success: false, error: message };
    }
  },

  updateCartItem: async (itemId, quantity) => {
    try {
      const response = await cartAPI.updateCartItem(itemId, { quantity });
      const cart = response.data.cart;
      set({ 
        cart,
        cartCount: cart.items.reduce((total, item) => total + item.quantity, 0),
        error: null
      });
      toast.success(quantity === 0 ? 'Item removed' : 'Cart updated');
      return { success: true };
    } catch (error) {
      const message = error.response?.data?.message || 'Failed to update cart';
      toast.error(message);
      return { success: false, error: message };
    }
  },

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
      toast.error(message);
      return { success: false, error: message };
    }
  },

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
      toast.error(message);
      return { success: false, error: message };
    }
  },

  isCartEmpty: () => {
    const cart = get().cart;
    return !cart || !cart.items || cart.items.length === 0;
  }
}));

export default useCartStore;