import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { CreditCard, Loader2, ArrowLeft, ShieldCheck } from 'lucide-react';
import toast from 'react-hot-toast';
import useCartStore from '../store/cartStore';
import useAuthStore from '../store/authStore';

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000/api';

const Checkout = () => {
  const { cart, loading, fetchCart, getCartDetails } = useCartStore();
  const { user, getProfile } = useAuthStore();
  const [checkoutLoading, setCheckoutLoading] = useState(false);
  const navigate = useNavigate();

  // Pulling synchronized data from the store logic
  const { subtotal, shipping, tax, total } = getCartDetails();

  const [formData, setFormData] = useState({
    firstName: '',
    lastName: '',
    email: '',
    phone: '',
    address: '',
    city: '',
    state: '',
    zipCode: '',
    country: 'India',
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
      return toast.error("Please provide shipping address and phone number");
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
        headers: { 
          'Authorization': `Bearer ${token}`, 
          'Content-Type': 'application/json' 
        },
        body: JSON.stringify(checkoutPayload)
      });

      const data = await response.json();
      if (data.url) {
        window.location.href = data.url;
      } else {
        toast.error(data.message || 'Payment initialization failed');
      }
    } catch (err) {
      toast.error('Network error. Please try again.');
    } finally {
      setCheckoutLoading(false);
    }
  };

  if (loading) return <div className="flex justify-center py-20"><Loader2 className="animate-spin" /></div>;

  return (
    <div className="min-h-screen bg-[#0f172a] text-white py-8 px-4">
      <div className="max-w-6xl mx-auto grid lg:grid-cols-3 gap-8">
        
        {/* Left Side: Shipping Form */}
        <div className="lg:col-span-2 space-y-6">
          <button 
            onClick={() => navigate('/cart')} 
            className="flex items-center gap-2 text-gray-400 hover:text-white transition"
          >
            <ArrowLeft size={20} /> Back to Cart
          </button>
          
          <div className="bg-[#1e293b] p-8 rounded-2xl shadow-xl border border-slate-700">
            <h2 className="text-2xl font-bold mb-6 flex items-center gap-2">
              <ShieldCheck className="text-blue-500" /> Shipping Information
            </h2>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="space-y-2">
                <label className="text-sm text-gray-400">First Name *</label>
                <input className="w-full bg-[#334155] border-none p-3 rounded-lg text-white focus:ring-2 focus:ring-blue-500" placeholder="Enter first name" value={formData.firstName} onChange={(e) => setFormData({...formData, firstName: e.target.value})} />
              </div>
              <div className="space-y-2">
                <label className="text-sm text-gray-400">Last Name *</label>
                <input className="w-full bg-[#334155] border-none p-3 rounded-lg text-white focus:ring-2 focus:ring-blue-500" placeholder="Enter last name" value={formData.lastName} onChange={(e) => setFormData({...formData, lastName: e.target.value})} />
              </div>
              <div className="space-y-2 col-span-full">
                <label className="text-sm text-gray-400">Email Address *</label>
                <input className="w-full bg-[#334155] border-none p-3 rounded-lg text-white" value={formData.email} disabled />
              </div>
              <div className="space-y-2 col-span-full">
                <label className="text-sm text-gray-400">Street Address *</label>
                <input className="w-full bg-[#334155] border-none p-3 rounded-lg text-white focus:ring-2 focus:ring-blue-500" placeholder="House number, street name" value={formData.address} onChange={(e) => setFormData({...formData, address: e.target.value})} />
              </div>
              <div className="space-y-2">
                <label className="text-sm text-gray-400">Phone Number *</label>
                <input className="w-full bg-[#334155] border-none p-3 rounded-lg text-white focus:ring-2 focus:ring-blue-500" placeholder="10-digit mobile number" value={formData.phone} onChange={(e) => setFormData({...formData, phone: e.target.value})} />
              </div>
              <div className="space-y-2">
                <label className="text-sm text-gray-400">City *</label>
                <input className="w-full bg-[#334155] border-none p-3 rounded-lg text-white focus:ring-2 focus:ring-blue-500" placeholder="City" value={formData.city} onChange={(e) => setFormData({...formData, city: e.target.value})} />
              </div>
            </div>
          </div>
        </div>

        {/* Right Side: Order Summary */}
        <div className="lg:col-span-1">
          <div className="bg-gradient-to-b from-[#4f46e5] to-[#3b82f6] p-1 rounded-2xl shadow-2xl sticky top-20">
            <div className="bg-[#1e293b] p-6 rounded-[calc(1rem-1px)]">
              <h2 className="text-xl font-bold mb-6 border-b border-slate-700 pb-4">Order Summary</h2>
              
              {/* Items List */}
              <div className="space-y-4 mb-6 max-h-48 overflow-y-auto pr-2 custom-scrollbar">
                {cart.items.map((item) => (
                  <div key={item._id} className="flex justify-between items-center text-sm">
                    <div className="flex flex-col">
                      <span className="font-medium text-gray-200">{item.name}</span>
                      <span className="text-xs text-gray-400">₹{item.price} × {item.quantity}</span>
                    </div>
                    <span className="font-bold text-blue-400">₹{(item.price * item.quantity).toFixed(2)}</span>
                  </div>
                ))}
              </div>

              {/* Price Breakdown */}
              <div className="space-y-3 border-t border-slate-700 pt-4 mb-6">
                <div className="flex justify-between text-gray-400">
                  <span>Subtotal</span>
                  <span className="text-white">₹{subtotal.toFixed(2)}</span>
                </div>
                <div className="flex justify-between text-gray-400">
                  <span>Tax (GST 18%)</span>
                  <span className="text-white">₹{tax.toFixed(2)}</span>
                </div>
                <div className="flex justify-between text-gray-400">
                  <span>Shipping</span>
                  <span className={shipping === 0 ? "text-green-400 font-bold" : "text-white"}>
                    {shipping === 0 ? 'FREE' : `₹${shipping.toFixed(2)}`}
                  </span>
                </div>
                <div className="flex justify-between items-center pt-2 border-t border-slate-700">
                  <span className="text-lg font-bold">Total</span>
                  <span className="text-2xl font-black text-white">₹{total.toFixed(2)}</span>
                </div>
              </div>

              <button
                onClick={handleCheckout}
                disabled={checkoutLoading}
                className="w-full bg-blue-600 hover:bg-blue-500 disabled:bg-slate-600 text-white py-4 rounded-xl font-bold transition-all shadow-lg flex items-center justify-center gap-3 uppercase tracking-wider"
              >
                {checkoutLoading ? <Loader2 className="animate-spin" /> : <><CreditCard size={20} /> Proceed to Payment</>}
              </button>

              <div className="mt-4 flex items-center justify-center gap-2 text-xs text-gray-500 bg-[#0f172a] p-3 rounded-lg">
                <ShieldCheck size={14} className="text-green-500" />
                Secure payment powered by Stripe
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Checkout;