import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Loader2, ArrowLeft, MapPin, ShieldCheck, CreditCard } from 'lucide-react';
import toast from 'react-hot-toast';
import useCartStore from '../store/cartStore';
import useAuthStore from '../store/authStore';
import { authAPI, orderAPI, paymentAPI } from '../services/api';

const Checkout = () => {
  const { cart, loading, fetchCart, getCartDetails } = useCartStore();
  const { user, getProfile } = useAuthStore();
  const [checkoutLoading, setCheckoutLoading] = useState(false);
  const [isSavingAddress, setIsSavingAddress] = useState(false);
  const navigate = useNavigate();

  // Get calculated values from the store
  const { subtotal, shipping, tax, total } = getCartDetails();
  
  // Safety check for cart items
  const cartItems = cart?.items || [];

  const [formData, setFormData] = useState({
    firstName: '', lastName: '', email: '', phone: '',
    address: '', city: '', state: '', zipCode: '', country: 'India',
  });

  useEffect(() => {
    fetchCart();
    if (!user) getProfile();
  }, [fetchCart, getProfile, user]);

  useEffect(() => {
    if (user) {
      const names = user.name?.split(' ') || [];
      setFormData(prev => ({
        ...prev,
        firstName: names[0] || '',
        lastName: names.slice(1).join(' ') || '',
        email: user.email || '',
        address: user.shippingAddress?.address || '',
        city: user.shippingAddress?.city || '',
        state: user.shippingAddress?.state || '',
        zipCode: user.shippingAddress?.zipCode || '',
        phone: user.shippingAddress?.phone || user.phone || '',
      }));
    }
  }, [user]);

  const handleSaveAddress = async () => {
    if (!formData.address || !formData.phone) return toast.error("Fill address & phone first");
    setIsSavingAddress(true);
    try {
      await authAPI.updateProfile({ shippingAddress: formData });
      toast.success("Default address updated!");
    } catch (err) {
      toast.error("Could not save address.");
    } finally {
      setIsSavingAddress(false);
    }
  };

  const handleCheckout = async () => {
    if (!formData.address || !formData.phone) return toast.error("Shipping address is required");
    
    setCheckoutLoading(true);
    try {
      // 1. Create the Order in your database
      const orderData = {
        orderItems: cartItems.map(item => ({
          product: item.product._id,
          quantity: item.quantity,
          price: item.product.price
        })),
        shippingAddress: formData,
        totalPrice: total,
      };
      await orderAPI.createOrder(orderData);

      // 2. Initiate Stripe Payment
      const response = await paymentAPI.createCheckoutSession({
        items: cartItems,
        shippingAddress: formData
      });

      if (response.data.url) {
        window.location.href = response.data.url;
      }
    } catch (error) {
      console.error("Checkout Error:", error);
      toast.error(error.response?.data?.message || "Payment initiation failed");
      setCheckoutLoading(false);
    }
  };

  if (loading) return (
    <div className="min-h-screen bg-[#0f172a] flex items-center justify-center">
      <Loader2 className="animate-spin text-blue-500" size={40} />
    </div>
  );

  return (
    <div className="min-h-screen bg-[#0f172a] text-white py-8 px-4">
      {/* PROCESSING OVERLAY */}
      {checkoutLoading && (
        <div className="fixed inset-0 bg-black/90 z-50 flex flex-col items-center justify-center">
          <Loader2 className="animate-spin text-blue-500 mb-4" size={60} />
          <h2 className="text-2xl font-bold">Redirecting to Stripe...</h2>
          <p className="text-gray-400 mt-2">Please do not refresh the page.</p>
        </div>
      )}

      <div className="max-w-6xl mx-auto grid lg:grid-cols-3 gap-8">
        {/* LEFT COLUMN: FORM */}
        <div className="lg:col-span-2 space-y-6">
          <button onClick={() => navigate('/cart')} className="flex items-center gap-2 text-gray-400 hover:text-white transition">
            <ArrowLeft size={20} /> Back to Cart
          </button>
          
          <div className="bg-[#1e293b] p-8 rounded-2xl border border-slate-700 shadow-xl">
             <div className="flex justify-between items-center mb-8">
                <h2 className="text-2xl font-bold flex items-center gap-2">
                  <MapPin className="text-blue-500" /> Shipping Details
                </h2>
                <button 
                  onClick={handleSaveAddress}
                  disabled={isSavingAddress}
                  className="text-xs bg-slate-700 hover:bg-slate-600 px-3 py-2 rounded-lg transition flex items-center gap-2"
                >
                  {isSavingAddress ? <Loader2 size={12} className="animate-spin" /> : <ShieldCheck size={12} />}
                  Save as Default
                </button>
             </div>

             <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                <div className="flex flex-col gap-2">
                  <label className="text-sm text-gray-400">First Name</label>
                  <input className="bg-[#0f172a] p-3 rounded-lg border border-slate-700 focus:border-blue-500 outline-none" value={formData.firstName} onChange={(e) => setFormData({...formData, firstName: e.target.value})} />
                </div>
                <div className="flex flex-col gap-2">
                  <label className="text-sm text-gray-400">Last Name</label>
                  <input className="bg-[#0f172a] p-3 rounded-lg border border-slate-700 focus:border-blue-500 outline-none" value={formData.lastName} onChange={(e) => setFormData({...formData, lastName: e.target.value})} />
                </div>
                <div className="col-span-full flex flex-col gap-2">
                  <label className="text-sm text-gray-400">Street Address</label>
                  <input className="bg-[#0f172a] p-3 rounded-lg border border-slate-700 focus:border-blue-500 outline-none" value={formData.address} onChange={(e) => setFormData({...formData, address: e.target.value})} />
                </div>
                <div className="flex flex-col gap-2">
                  <label className="text-sm text-gray-400">Phone</label>
                  <input className="bg-[#0f172a] p-3 rounded-lg border border-slate-700 focus:border-blue-500 outline-none" value={formData.phone} onChange={(e) => setFormData({...formData, phone: e.target.value})} />
                </div>
                <div className="flex flex-col gap-2">
                  <label className="text-sm text-gray-400">City</label>
                  <input className="bg-[#0f172a] p-3 rounded-lg border border-slate-700 focus:border-blue-500 outline-none" value={formData.city} onChange={(e) => setFormData({...formData, city: e.target.value})} />
                </div>
                <div className="flex flex-col gap-2">
                  <label className="text-sm text-gray-400">State</label>
                  <input className="bg-[#0f172a] p-3 rounded-lg border border-slate-700 focus:border-blue-500 outline-none" value={formData.state} onChange={(e) => setFormData({...formData, state: e.target.value})} />
                </div>
                <div className="flex flex-col gap-2">
                  <label className="text-sm text-gray-400">Zip Code</label>
                  <input className="bg-[#0f172a] p-3 rounded-lg border border-slate-700 focus:border-blue-500 outline-none" value={formData.zipCode} onChange={(e) => setFormData({...formData, zipCode: e.target.value})} />
                </div>
             </div>
          </div>
        </div>

        {/* RIGHT COLUMN: SUMMARY */}
        <div className="lg:col-span-1">
          <div className="bg-[#1e293b] p-6 rounded-2xl border border-slate-700 sticky top-20 shadow-2xl">
            <h2 className="text-xl font-bold mb-6 border-b border-slate-700 pb-4">Order Summary</h2>
            
            <div className="space-y-4 mb-6">
              <div className="flex justify-between text-gray-400">
                <span>Subtotal</span>
                <span>₹{subtotal.toFixed(2)}</span>
              </div>
              <div className="flex justify-between text-gray-400">
                <span>Tax (GST 18%)</span>
                <span>₹{tax.toFixed(2)}</span>
              </div>
              <div className="flex justify-between text-gray-400">
                <span>Shipping</span>
                <span className={shipping === 0 ? "text-green-400 font-bold" : ""}>
                  {shipping === 0 ? 'FREE' : `₹${shipping.toFixed(2)}`}
                </span>
              </div>
              <div className="flex justify-between items-center pt-4 border-t border-slate-700 font-bold text-xl text-white">
                <span>Total</span>
                <span className="text-blue-400">₹{total.toFixed(2)}</span>
              </div>
            </div>

            <button 
              onClick={handleCheckout} 
              disabled={checkoutLoading}
              className="w-full bg-blue-600 hover:bg-blue-500 py-4 rounded-xl font-bold uppercase transition flex items-center justify-center gap-3 shadow-lg shadow-blue-900/20"
            >
              <CreditCard size={20} />
              Pay Now
            </button>
            
            <div className="mt-6 space-y-2">
               <p className="text-center text-[10px] text-gray-500 flex items-center justify-center gap-1 uppercase tracking-widest">
                <ShieldCheck size={12} className="text-green-500" /> Secure Payment Gateway
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Checkout;