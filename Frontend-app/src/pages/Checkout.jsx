import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { CreditCard, Loader2, ArrowLeft } from 'lucide-react';
import toast from 'react-hot-toast';
import useCartStore from '../store/cartStore';
import useAuthStore from '../store/authStore';

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000/api';

const Checkout = () => {
  const { cart, loading, fetchCart, getCartDetails } = useCartStore();
  const { user, getProfile } = useAuthStore();
  const [checkoutLoading, setCheckoutLoading] = useState(false);
  const navigate = useNavigate();

  // Pulling the EXACT same data from the store
  const { subtotal, shipping, tax, total } = getCartDetails();

  const [formData, setFormData] = useState({
    firstName: '', lastName: '', email: '', phone: '',
    address: '', city: '', state: '', zipCode: '', country: 'India',
  });

  useEffect(() => {
    fetchCart();
    getProfile();
  }, [fetchCart, getProfile]);

  useEffect(() => {
    if (user) {
      const names = user.name?.split(' ') || [];
      setFormData(prev => ({
        ...prev,
        firstName: names[0] || '',
        lastName: names.slice(1).join(' ') || '',
        email: user.email || '',
      }));
    }
  }, [user]);

  const handleCheckout = async () => {
    if (!formData.address || !formData.phone) {
      return toast.error("Please fill in shipping details");
    }
    setCheckoutLoading(true);
    try {
      const token = localStorage.getItem('token');
      const checkoutPayload = {
        items: cart.items.map(item => ({
          productId: item.product?._id,
          quantity: item.quantity,
          price: item.price,
          name: item.name,
        })),
        shippingInfo: formData,
        subtotal,
        shippingFee: shipping,
        tax,
        totalAmount: total 
      };

      const response = await fetch(`${API_URL}/payment/create-checkout-session`, {
        method: 'POST',
        headers: { 'Authorization': `Bearer ${token}`, 'Content-Type': 'application/json' },
        body: JSON.stringify(checkoutPayload)
      });

      const data = await response.json();
      if (data.url) window.location.href = data.url;
      else toast.error(data.message || 'Payment failed');
    } catch (err) {
      toast.error('Network error. Please try again.');
    } finally {
      setCheckoutLoading(false);
    }
  };

  if (loading) return <div className="flex justify-center py-20"><Loader2 className="animate-spin" /></div>;

  return (
    <div className="min-h-screen bg-gray-50 py-8 px-4">
      <div className="max-w-6xl mx-auto grid lg:grid-cols-3 gap-8">
        <div className="lg:col-span-2 space-y-6">
          <button onClick={() => navigate('/cart')} className="flex items-center gap-2 text-gray-600 hover:text-black">
            <ArrowLeft size={20} /> Back to Cart
          </button>
          
          <div className="bg-white p-6 rounded-xl shadow-sm border">
            <h2 className="text-xl font-bold mb-6">Shipping Information</h2>
            <div className="grid grid-cols-2 gap-4">
              <input className="border p-3 rounded-lg" placeholder="First Name" value={formData.firstName} onChange={(e) => setFormData({...formData, firstName: e.target.value})} />
              <input className="border p-3 rounded-lg" placeholder="Last Name" value={formData.lastName} onChange={(e) => setFormData({...formData, lastName: e.target.value})} />
              <input className="border p-3 rounded-lg col-span-2" placeholder="Address" value={formData.address} onChange={(e) => setFormData({...formData, address: e.target.value})} />
              <input className="border p-3 rounded-lg" placeholder="Phone" value={formData.phone} onChange={(e) => setFormData({...formData, phone: e.target.value})} />
            </div>
          </div>
        </div>

        <div className="lg:col-span-1">
          <div className="bg-white p-6 rounded-xl shadow-sm border sticky top-20">
            <h2 className="text-xl font-bold mb-4">Order Summary</h2>
            <div className="space-y-3 pb-4 border-b">
              <div className="flex justify-between">
                <span className="text-gray-600">Subtotal</span>
                <span className="font-semibold">₹{subtotal.toFixed(2)}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-600">Shipping</span>
                <span className="font-semibold text-green-600">{shipping === 0 ? 'FREE' : `₹${shipping.toFixed(2)}`}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-600">GST (18%)</span>
                <span className="font-semibold">₹{tax.toFixed(2)}</span>
              </div>
            </div>
            <div className="flex justify-between items-center pt-4 mb-6">
              <span className="text-lg font-bold">Total</span>
              <span className="text-2xl font-bold text-primary-600">₹{total.toFixed(2)}</span>
            </div>

            <button
              onClick={handleCheckout}
              disabled={checkoutLoading}
              className="w-full bg-black text-white py-4 rounded-xl font-bold hover:bg-gray-800 transition flex items-center justify-center gap-2"
            >
              {checkoutLoading ? <Loader2 className="animate-spin" /> : <><CreditCard size={20} /> Pay Now</>}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Checkout;