import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { CreditCard, ShoppingCart, Loader2, AlertCircle, ArrowLeft } from 'lucide-react';
import toast from 'react-hot-toast';
import useCartStore from '../store/cartStore';

// 🆕 CORRECT API_URL based on your .env file
const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000';

export default function Checkout() {
  const { cart, loading, fetchCart } = useCartStore();
  const [checkoutLoading, setCheckoutLoading] = useState(false);
  const navigate = useNavigate();

  useEffect(() => {
    fetchCart();
  }, [fetchCart]);

  const cartItems = cart?.items || [];

  const calculateSubtotal = () => {
    return cartItems.reduce((total, item) => {
      // Use the safe logic for price calculation
      const price = item.price || item.product?.price || 0;
      return total + (price * item.quantity);
    }, 0);
  };

  const calculateTax = () => {
    return calculateSubtotal() * 0.1;
  };

  const calculateTotal = () => {
    return calculateSubtotal() + calculateTax();
  };

  const handleCheckout = async () => {
    setCheckoutLoading(true);
    try {
      const token = localStorage.getItem('token');
      
      if (!token) {
        toast.error('Please login to continue');
        navigate('/login');
        return;
      }

      if (!cartItems || cartItems.length === 0) {
        toast.error('Your cart is empty');
        return;
      }

      // 🚨 FIX APPLIED HERE: Including price and name in the payload 🚨
      const checkoutPayload = {
        cartItems: cartItems.map(item => ({
          productId: item.product?._id || item.productId,
          quantity: item.quantity,
          // CRITICAL: Send the unit price so the backend can calculate line_items
          price: item.price || item.product?.price || 0,
          // Optional but recommended: Send the name for Stripe's product data
          name: item.name || item.product?.name || 'Unknown Item',
        })),
        totalAmount: calculateTotal(),
      };

      console.log('Sending checkout payload:', checkoutPayload);

      // 🆕 CORRECT ENDPOINT - Add /api to the URL
      const response = await fetch(`${API_URL}/api/payment/create-checkout-session`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(checkoutPayload)
      });

      const data = await response.json();
      console.log('Checkout response:', data);

      if (response.ok && data.url) {
        window.location.href = data.url;
      } else {
        // Data.message will now contain the specific error from Stripe (if any)
        toast.error(data.message || 'Payment session creation failed'); 
      }
    } catch (err) {
      console.error('Checkout error:', err);
      toast.error('Network error. Please try again.');
    } finally {
      setCheckoutLoading(false);
    }
  };

  // Use loading from cart store
  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-purple-900 via-blue-900 to-black flex items-center justify-center">
        <div className="text-center">
          <Loader2 className="w-12 h-12 text-purple-400 animate-spin mx-auto mb-4" />
          <p className="text-purple-300">Loading your cart...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-purple-900 via-blue-900 to-black py-12 px-4">
      <div className="max-w-6xl mx-auto">
        {/* Back Button */}
        <button
          onClick={() => navigate('/cart')}
          className="flex items-center gap-2 text-purple-400 hover:text-purple-300 mb-6 transition"
        >
          <ArrowLeft className="w-5 h-5" />
          Back to Cart
        </button>

        <div className="grid lg:grid-cols-3 gap-8">
          {/* Cart Items Section */}
          <div className="lg:col-span-2">
            <div className="bg-black/40 backdrop-blur-lg rounded-2xl border border-purple-500/30 shadow-2xl overflow-hidden">
              <div className="bg-gradient-to-r from-purple-600 to-blue-600 p-6">
                <h1 className="text-3xl font-bold text-white flex items-center gap-3">
                  <ShoppingCart className="w-8 h-8" />
                  Order Summary
                </h1>
              </div>

              <div className="p-6">
                {cartItems.length === 0 ? (
                  <div className="text-center py-12">
                    <ShoppingCart className="w-16 h-16 text-gray-500 mx-auto mb-4" />
                    <p className="text-gray-400 text-xl mb-4">Your cart is empty</p>
                    <button 
                      onClick={() => navigate('/products')}
                      className="px-6 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 transition"
                    >
                      Continue Shopping
                    </button>
                  </div>
                ) : (
                  <div className="space-y-4">
                    {cartItems.map((item, index) => {
                      const productName = item.name || item.product?.name || 'Unknown Product';
                      const productPrice = item.price || item.product?.price || 0;
                      const productImage = item.image || item.product?.image || 'https://via.placeholder.com/80';
                      const quantity = item.quantity || 1;

                      return (
                        <div 
                          key={item._id || index} 
                          className="flex items-center gap-4 bg-black/30 p-4 rounded-xl border border-purple-500/20 hover:border-purple-500/40 transition"
                        >
                          <img 
                            src={productImage}
                            alt={productName}
                            className="w-20 h-20 object-cover rounded-lg"
                            onError={(e) => {
                              e.target.src = 'https://via.placeholder.com/80';
                            }}
                          />
                          <div className="flex-1">
                            <h3 className="text-white font-semibold text-lg">{productName}</h3>
                            <p className="text-gray-400 text-sm mt-1">
                              ${productPrice.toFixed(2)} × {quantity}
                            </p>
                          </div>
                          <div className="text-right">
                            <p className="text-purple-400 font-bold text-xl">
                              {(productPrice * quantity).toFixed(2)}
                            </p>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* Order Total Section */}
          <div className="lg:col-span-1">
            <div className="bg-black/40 backdrop-blur-lg rounded-2xl border border-purple-500/30 shadow-2xl overflow-hidden sticky top-4">
              <div className="bg-gradient-to-r from-purple-600 to-blue-600 p-4">
                <h2 className="text-xl font-bold text-white">Order Total</h2>
              </div>

              <div className="p-6 space-y-4">
                <div className="flex justify-between text-gray-300">
                  <span>Subtotal</span>
                  <span>${calculateSubtotal().toFixed(2)}</span>
                </div>
                
                <div className="flex justify-between text-gray-300">
                  <span>Tax (10%)</span>
                  <span>${calculateTax().toFixed(2)}</span>
                </div>

                <div className="border-t border-purple-500/30 pt-4">
                  <div className="flex justify-between items-center text-2xl font-bold">
                    <span className="text-white">Total</span>
                    <span className="text-purple-400">${calculateTotal().toFixed(2)}</span>
                  </div>
                </div>

                <button
                  onClick={handleCheckout}
                  disabled={checkoutLoading || cartItems.length === 0}
                  className="w-full bg-gradient-to-r from-purple-600 to-blue-600 text-white font-bold py-4 rounded-xl hover:from-purple-700 hover:to-blue-700 transition-all transform hover:scale-105 disabled:opacity-50 disabled:cursor-not-allowed disabled:transform-none flex items-center justify-center gap-2 shadow-lg"
                >
                  {checkoutLoading ? (
                    <>
                      <Loader2 className="w-5 h-5 animate-spin" />
                      Processing...
                    </>
                  ) : (
                    <>
                      <CreditCard className="w-5 h-5" />
                      Proceed to Payment
                    </>
                  )}
                </button>

                <div className="bg-blue-500/10 border border-blue-500/30 rounded-lg p-4">
                  <p className="text-blue-400 text-sm flex items-center gap-2">
                    <AlertCircle className="w-4 h-4 flex-shrink-0" />
                    <span>🔒 Secure payment powered by Stripe</span>
                  </p>
                </div>

                <div className="text-center text-gray-400 text-xs">
                  <p>By proceeding, you agree to our</p>
                  <p className="text-purple-400">Terms of Service & Privacy Policy</p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}