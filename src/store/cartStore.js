import { create } from 'zustand';
import { cartAPI } from '../services/api';
import toast from 'react-hot-toast';

const useCartStore = create((set, get) => ({
  cart: null,
  loading: false,
  cartCount: 0,

  // Fetch cart
  fetchCart: async () => {
    set({ loading: true });
    try {
      const response = await cartAPI.getCart();
      const cart = response.data.cart;
      set({ 
        cart, 
        cartCount: cart.items.reduce((total, item) => total + item.quantity, 0),
        loading: false 
      });
    } catch (error) {
      set({ loading: false });
      console.error('Fetch cart error:', error);
    }
  },

  // Add to cart
  addToCart: async (productData) => {
    try {
      const response = await cartAPI.addToCart(productData);
      const cart = response.data.cart;
      set({ 
        cart,
        cartCount: cart.items.reduce((total, item) => total + item.quantity, 0)
      });
      toast.success('Added to cart!');
      return { success: true };
    } catch (error) {
      const message = error.response?.data?.message || 'Failed to add to cart';
      toast.error(message);
      return { success: false };
    }
  },

  // Update cart item
  updateCartItem: async (itemId, quantity) => {
    try {
      const response = await cartAPI.updateCartItem(itemId, { quantity });
      const cart = response.data.cart;
      set({ 
        cart,
        cartCount: cart.items.reduce((total, item) => total + item.quantity, 0)
      });
      toast.success('Cart updated');
      return { success: true };
    } catch (error) {
      const message = error.response?.data?.message || 'Failed to update cart';
      toast.error(message);
      return { success: false };
    }
  },

  // Remove from cart
  removeFromCart: async (itemId) => {
    try {
      const response = await cartAPI.removeFromCart(itemId);
      const cart = response.data.cart;
      set({ 
        cart,
        cartCount: cart.items.reduce((total, item) => total + item.quantity, 0)
      });
      toast.success('Item removed from cart');
      return { success: true };
    } catch (error) {
      toast.error('Failed to remove item');
      return { success: false };
    }
  },

  // Clear cart
  clearCart: async () => {
    try {
      await cartAPI.clearCart();
      set({ cart: { items: [], totalPrice: 0 }, cartCount: 0 });
      toast.success('Cart cleared');
      return { success: true };
    } catch (error) {
      toast.error('Failed to clear cart');
      return { success: false };
    }
  },
}));

export default useCartStore;