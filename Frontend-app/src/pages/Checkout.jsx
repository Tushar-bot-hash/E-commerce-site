import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { CreditCard, Loader2, ArrowLeft, ShieldCheck, MapPin } from 'lucide-react';
import toast from 'react-hot-toast';
import useCartStore from '../store/cartStore';
import useAuthStore from '../store/authStore';

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000/api';

const Checkout = () => {
  const { cart, loading, fetchCart, getCartDetails } = useCartStore();
  const { user, getProfile } = useAuthStore();
  const [checkoutLoading, setCheckoutLoading] = useState(false);
  const [isSavingAddress, setIsSavingAddress] = useState(false);
  const navigate = useNavigate();

  const { subtotal, shipping, tax, total } = getCartDetails();

  const [formData, setFormData] = useState({
    firstName: '', lastName: '', email: '', phone: '',
    address: '', city: '', state: '', zipCode: '', country: 'India',
  });

  useEffect(() => {
    fetchCart();
    if (!user) getProfile();
  }, [fetchCart, getProfile, user]);

  // Auto-fill form if user already has a saved address
  useEffect(() => {
    if (user) {
      const names = user.name?.split(' ') || [];
      setFormData(prev => ({
        ...prev,
        firstName: names[0] || '',
        lastName: names.slice(1).join(' ') || '',
        email: user.email || '',
        // Populate with saved address if it exists in your user model
        address: user.shippingAddress?.address || '',
        city: user.shippingAddress?.city || '',
        state: user.shippingAddress?.state || '',
        zipCode: user.shippingAddress?.zipCode || '',
        phone: user.shippingAddress?.phone || user.phone || '',
      }));
    }
  }, [user]);

  // --- NEW SAVE ADDRESS FUNCTION ---
  const handleSaveAddress = async () => {
    if (!formData.address || !formData.phone || !formData.city) {
      return toast.error("Please fill address details before saving");
    }

    setIsSavingAddress(true);
    try {
      const token = localStorage.getItem('token');
      const response = await fetch(`${API_URL}/users/profile`, {
        method: 'PUT',
        headers: { 
          'Authorization': `Bearer ${token}`, 
          'Content-Type': 'application/json' 
        },
        body: JSON.stringify({ shippingAddress: formData })
      });

      if (response.ok) {
        toast.success("Shipping address saved to your profile!");
      } else {
        throw new Error("Failed to save");
      }
    } catch (err) {
      toast.error("Could not save address. Try again later.");
    } finally {
      setIsSavingAddress(false);
    }
  };

  const handleCheckout = async () => {
    if (!formData.address || !formData.phone) return toast.error("Address is required");
    setCheckoutLoading(true);
    // ... rest of your handleCheckout logic (Stripe fetch)
  };

  if (loading) return <div className="flex justify-center py-20"><Loader2 className="animate-spin" /></div>;

  return (
    <div className="min-h-screen bg-[#0f172a] text-white py-8 px-4">
      <div className="max-w-6xl mx-auto grid lg:grid-cols-3 gap-8">
        
        <div className="lg:col-span-2 space-y-6">
          <button onClick={() => navigate('/cart')} className="flex items-center gap-2 text-gray-400 hover:text-white transition">
            <ArrowLeft size={20} /> Back to Cart
          </button>
          
          <div className="bg-[#1e293b] p-8 rounded-2xl shadow-xl border border-slate-700">
            <div className="flex justify-between items-center mb-6">
              <h2 className="text-2xl font-bold flex items-center gap-2">
                <MapPin className="text-blue-500" /> Shipping Information
              </h2>
              {/* SAVE ADDRESS BUTTON */}
              <button 
                onClick={handleSaveAddress}
                disabled={isSavingAddress}
                className="text-sm bg-slate-700 hover:bg-slate-600 px-4 py-2 rounded-lg transition flex items-center gap-2"
              >
                {isSavingAddress ? <Loader2 size={14} className="animate-spin" /> : <MapPin size={14} />}
                Save as Default
              </button>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <input className="bg-[#334155] p-3 rounded-lg text-white" placeholder="First Name" value={formData.firstName} onChange={(e) => setFormData({...formData, firstName: e.target.value})} />
              <input className="bg-[#334155] p-3 rounded-lg text-white" placeholder="Last Name" value={formData.lastName} onChange={(e) => setFormData({...formData, lastName: e.target.value})} />
              <input className="col-span-full bg-[#334155] p-3 rounded-lg text-white" placeholder="Street Address" value={formData.address} onChange={(e) => setFormData({...formData, address: e.target.value})} />
              <input className="bg-[#334155] p-3 rounded-lg text-white" placeholder="Phone" value={formData.phone} onChange={(e) => setFormData({...formData, phone: e.target.value})} />
              <input className="bg-[#334155] p-3 rounded-lg text-white" placeholder="City" value={formData.city} onChange={(e) => setFormData({...formData, city: e.target.value})} />
              <input className="bg-[#334155] p-3 rounded-lg text-white" placeholder="State" value={formData.state} onChange={(e) => setFormData({...formData, state: e.target.value})} />
              <input className="bg-[#334155] p-3 rounded-lg text-white" placeholder="Zip Code" value={formData.zipCode} onChange={(e) => setFormData({...formData, zipCode: e.target.value})} />
            </div>
          </div>
        </div>

        {/* Order Summary Sidebar - Kept Identical for Pricing Consistency */}
        <div className="lg:col-span-1">
          <div className="bg-[#1e293b] p-6 rounded-2xl shadow-xl border border-slate-700 sticky top-20">
            <h2 className="text-xl font-bold mb-6 border-b border-slate-700 pb-4">Order Summary</h2>
            <div className="space-y-3 mb-6">
              <div className="flex justify-between text-gray-400"><span>Subtotal</span><span>₹{subtotal.toFixed(2)}</span></div>
              <div className="flex justify-between text-gray-400"><span>Tax (GST 18%)</span><span>₹{tax.toFixed(2)}</span></div>
              <div className="flex justify-between text-gray-400"><span>Shipping</span><span className={shipping === 0 ? "text-green-400 font-bold" : ""}>{shipping === 0 ? 'FREE' : `₹${shipping.toFixed(2)}`}</span></div>
              <div className="flex justify-between items-center pt-4 border-t border-slate-700 font-bold text-xl">
                <span>Total</span><span className="text-blue-400">₹{total.toFixed(2)}</span>
              </div>
            </div>
            <button onClick={handleCheckout} className="w-full bg-blue-600 hover:bg-blue-500 py-4 rounded-xl font-bold uppercase transition">
              {checkoutLoading ? <Loader2 className="animate-spin mx-auto" /> : "Proceed to Payment"}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Checkout;