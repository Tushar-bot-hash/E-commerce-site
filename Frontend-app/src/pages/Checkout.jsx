import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Loader2, ArrowLeft, ShieldCheck, MapPin } from 'lucide-react';
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

  const { subtotal, shipping, tax, total } = getCartDetails();
  
  // ✅ SAFETY: Ensure we are looking at items even if cart is still loading
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

  const handleCheckout = async () => {
    if (!formData.address || !formData.phone) return toast.error("Please fill address and phone");
    
    setCheckoutLoading(true);
    try {
      // 1. Create Order in DB
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

      // 2. Get Stripe Redirect URL
      const response = await paymentAPI.createCheckoutSession({
        items: cartItems,
        shippingAddress: formData
      });

      if (response.data.url) {
        window.location.href = response.data.url;
      }
    } catch (error) {
      toast.error(error.response?.data?.message || "Checkout failed");
      setCheckoutLoading(false);
    }
  };

  // ✅ LOADING STATE
  if (loading) return <div className="min-h-screen bg-[#0f172a] flex items-center justify-center"><Loader2 className="animate-spin text-blue-500" size={40} /></div>;

  // ✅ EMPTY CART CHECK (Prevents crashes)
  if (cartItems.length === 0 && !checkoutLoading) {
    return (
      <div className="min-h-screen bg-[#0f172a] flex flex-col items-center justify-center text-white">
        <h2 className="text-xl mb-4">Your cart is empty</h2>
        <button onClick={() => navigate('/')} className="bg-blue-600 px-6 py-2 rounded-lg">Go Shopping</button>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#0f172a] text-white py-8 px-4">
      {/* PROCESSING OVERLAY */}
      {checkoutLoading && (
        <div className="fixed inset-0 bg-black/80 z-50 flex flex-col items-center justify-center">
          <Loader2 className="animate-spin text-blue-500 mb-4" size={50} />
          <h2 className="text-2xl font-bold">Initiating Secure Payment...</h2>
        </div>
      )}

      <div className="max-w-6xl mx-auto grid lg:grid-cols-3 gap-8">
        <div className="lg:col-span-2 space-y-6">
          <button onClick={() => navigate('/cart')} className="flex items-center gap-2 text-gray-400 hover:text-white transition">
            <ArrowLeft size={20} /> Back to Cart
          </button>
          
          <div className="bg-[#1e293b] p-8 rounded-2xl border border-slate-700">
             <h2 className="text-2xl font-bold flex items-center gap-2 mb-6">
               <MapPin className="text-blue-500" /> Shipping Information
             </h2>
             <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <input className="bg-[#334155] p-3 rounded-lg" placeholder="First Name" value={formData.firstName} onChange={(e) => setFormData({...formData, firstName: e.target.value})} />
                <input className="bg-[#334155] p-3 rounded-lg" placeholder="Last Name" value={formData.lastName} onChange={(e) => setFormData({...formData, lastName: e.target.value})} />
                <input className="col-span-full bg-[#334155] p-3 rounded-lg" placeholder="Street Address" value={formData.address} onChange={(e) => setFormData({...formData, address: e.target.value})} />
                <input className="bg-[#334155] p-3 rounded-lg" placeholder="Phone" value={formData.phone} onChange={(e) => setFormData({...formData, phone: e.target.value})} />
                <input className="bg-[#334155] p-3 rounded-lg" placeholder="City" value={formData.city} onChange={(e) => setFormData({...formData, city: e.target.value})} />
                <input className="bg-[#334155] p-3 rounded-lg" placeholder="Zip Code" value={formData.zipCode} onChange={(e) => setFormData({...formData, zipCode: e.target.value})} />
             </div>
          </div>
        </div>

        <div className="lg:col-span-1">
          <div className="bg-[#1e293b] p-6 rounded-2xl border border-slate-700">
            <h2 className="text-xl font-bold mb-6 border-b border-slate-700 pb-4">Summary</h2>
            <div className="space-y-3 mb-6">
              <div className="flex justify-between"><span>Subtotal</span><span>₹{subtotal.toFixed(2)}</span></div>
              <div className="flex justify-between"><span>Total</span><span className="text-blue-400 font-bold">₹{total.toFixed(2)}</span></div>
            </div>
            <button 
              onClick={handleCheckout} 
              disabled={checkoutLoading}
              className="w-full bg-blue-600 hover:bg-blue-500 py-4 rounded-xl font-bold transition"
            >
              Pay Now
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Checkout;