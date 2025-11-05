import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { CreditCard, Smartphone, Banknote } from 'lucide-react';
import useCartStore from '../store/cartStore';
import useAuthStore from '../store/authStore';
import { orderAPI } from '../services/api';
import toast from 'react-hot-toast';
import Loading from '../components/common/Loading';

const Checkout = () => {
  const { cart, fetchCart, clearCart } = useCartStore();
  const { user } = useAuthStore();
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);

  const [shippingAddress, setShippingAddress] = useState({
    street: '',
    city: '',
    state: '',
    zipCode: '',
    country: 'India',
    phone: ''
  });

  const [paymentMethod, setPaymentMethod] = useState('card');

  useEffect(() => {
    fetchCart();
    
    // Pre-fill from user's saved address if available
    if (user?.addresses?.length > 0) {
      const defaultAddress = user.addresses.find(addr => addr.isDefault) || user.addresses[0];
      setShippingAddress({
        street: defaultAddress.street,
        city: defaultAddress.city,
        state: defaultAddress.state,
        zipCode: defaultAddress.zipCode,
        country: defaultAddress.country,
        phone: defaultAddress.phone
      });
    }
  }, []);

  const handleAddressChange = (e) => {
    setShippingAddress({
      ...shippingAddress,
      [e.target.name]: e.target.value
    });
  };

  const handlePlaceOrder = async (e) => {
    e.preventDefault();
    
    // Validation
    if (!cart || cart.items.length === 0) {
      toast.error('Your cart is empty');
      return;
    }

    const requiredFields = ['street', 'city', 'state', 'zipCode', 'phone'];
    for (let field of requiredFields) {
      if (!shippingAddress[field]) {
        toast.error(`Please provide ${field}`);
        return;
      }
    }

    setLoading(true);
    try {
      const orderData = {
        orderItems: cart.items.map(item => ({
          product: item.product._id,
          name: item.name,
          image: item.image,
          price: item.price,
          quantity: item.quantity,
          size: item.size,
          color: item.color
        })),
        shippingAddress,
        paymentMethod,
        itemsPrice: cart.totalPrice,
        taxPrice: cart.totalPrice * 0.18,
        shippingPrice: cart.totalPrice > 1000 ? 0 : 50,
        totalPrice: cart.totalPrice + (cart.totalPrice * 0.18) + (cart.totalPrice > 1000 ? 0 : 50)
      };

      const response = await orderAPI.createOrder(orderData);
      
      if (response.data.success) {
        toast.success('Order placed successfully!');
        await clearCart();
        navigate(`/orders/${response.data.order._id}`);
      }
    } catch (error) {
      console.error('Order error:', error);
      toast.error(error.response?.data?.message || 'Failed to place order');
    } finally {
      setLoading(false);
    }
  };

  if (!cart) return <Loading fullScreen />;

  const subtotal = cart.totalPrice;
  const shipping = subtotal > 1000 ? 0 : 50;
  const tax = subtotal * 0.18;
  const total = subtotal + shipping + tax;

  return (
    <div className="bg-gray-50 min-h-screen py-8">
      <div className="container-custom">
        <h1 className="text-3xl font-display font-bold mb-8">Checkout</h1>

        <form onSubmit={handlePlaceOrder}>
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
            {/* Left Column - Forms */}
            <div className="lg:col-span-2 space-y-6">
              {/* Shipping Address */}
              <div className="card">
                <h2 className="text-xl font-bold mb-4">Shipping Address</h2>
                
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="md:col-span-2">
                    <label className="block text-sm font-medium mb-2">Street Address</label>
                    <input
                      type="text"
                      name="street"
                      value={shippingAddress.street}
                      onChange={handleAddressChange}
                      className="input"
                      required
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium mb-2">City</label>
                    <input
                      type="text"
                      name="city"
                      value={shippingAddress.city}
                      onChange={handleAddressChange}
                      className="input"
                      required
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium mb-2">State</label>
                    <input
                      type="text"
                      name="state"
                      value={shippingAddress.state}
                      onChange={handleAddressChange}
                      className="input"
                      required
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium mb-2">ZIP Code</label>
                    <input
                      type="text"
                      name="zipCode"
                      value={shippingAddress.zipCode}
                      onChange={handleAddressChange}
                      className="input"
                      required
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium mb-2">Phone</label>
                    <input
                      type="tel"
                      name="phone"
                      value={shippingAddress.phone}
                      onChange={handleAddressChange}
                      className="input"
                      required
                    />
                  </div>
                </div>
              </div>

              {/* Payment Method */}
              <div className="card">
                <h2 className="text-xl font-bold mb-4">Payment Method</h2>
                
                <div className="space-y-3">
                  <label className="flex items-center p-4 border-2 rounded-lg cursor-pointer hover:bg-gray-50 transition">
                    <input
                      type="radio"
                      name="paymentMethod"
                      value="card"
                      checked={paymentMethod === 'card'}
                      onChange={(e) => setPaymentMethod(e.target.value)}
                      className="mr-3"
                    />
                    <CreditCard className="mr-3 text-gray-600" size={24} />
                    <div>
                      <div className="font-semibold">Credit/Debit Card</div>
                      <div className="text-sm text-gray-600">Pay securely with your card</div>
                    </div>
                  </label>

                  <label className="flex items-center p-4 border-2 rounded-lg cursor-pointer hover:bg-gray-50 transition">
                    <input
                      type="radio"
                      name="paymentMethod"
                      value="upi"
                      checked={paymentMethod === 'upi'}
                      onChange={(e) => setPaymentMethod(e.target.value)}
                      className="mr-3"
                    />
                    <Smartphone className="mr-3 text-gray-600" size={24} />
                    <div>
                      <div className="font-semibold">UPI</div>
                      <div className="text-sm text-gray-600">Google Pay, PhonePe, Paytm</div>
                    </div>
                  </label>

                  <label className="flex items-center p-4 border-2 rounded-lg cursor-pointer hover:bg-gray-50 transition">
                    <input
                      type="radio"
                      name="paymentMethod"
                      value="cod"
                      checked={paymentMethod === 'cod'}
                      onChange={(e) => setPaymentMethod(e.target.value)}
                      className="mr-3"
                    />
                    <Banknote className="mr-3 text-gray-600" size={24} />
                    <div>
                      <div className="font-semibold">Cash on Delivery</div>
                      <div className="text-sm text-gray-600">Pay when you receive</div>
                    </div>
                  </label>
                </div>
              </div>
            </div>

            {/* Right Column - Order Summary */}
            <div className="lg:col-span-1">
              <div className="card sticky top-20">
                <h2 className="text-xl font-bold mb-4">Order Summary</h2>

                {/* Order Items */}
                <div className="space-y-3 mb-4 max-h-48 overflow-y-auto">
                  {cart.items.map((item) => (
                    <div key={item._id} className="flex gap-3">
                      <img
                        src={item.image}
                        alt={item.name}
                        className="w-16 h-16 object-cover rounded"
                      />
                      <div className="flex-1">
                        <div className="font-medium text-sm">{item.name}</div>
                        <div className="text-sm text-gray-600">
                          Qty: {item.quantity} × ₹{item.price}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>

                <div className="border-t pt-4 space-y-2 mb-4">
                  <div className="flex justify-between text-sm">
                    <span>Subtotal</span>
                    <span>₹{subtotal.toFixed(2)}</span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span>Shipping</span>
                    <span>{shipping === 0 ? 'FREE' : `₹${shipping.toFixed(2)}`}</span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span>Tax (GST)</span>
                    <span>₹{tax.toFixed(2)}</span>
                  </div>
                </div>

                <div className="border-t pt-4 mb-6">
                  <div className="flex justify-between items-center">
                    <span className="text-lg font-bold">Total</span>
                    <span className="text-2xl font-bold text-primary-600">
                      ₹{total.toFixed(2)}
                    </span>
                  </div>
                </div>

                <button
                  type="submit"
                  disabled={loading}
                  className="w-full btn btn-primary py-3"
                >
                  {loading ? 'Processing...' : 'Place Order'}
                </button>

                <p className="text-xs text-gray-600 text-center mt-4">
                  By placing this order, you agree to our Terms & Conditions
                </p>
              </div>
            </div>
          </div>
        </form>
      </div>
    </div>
  );
};

export default Checkout;