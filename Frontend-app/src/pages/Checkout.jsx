import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Loader2, ArrowLeft, MapPin, ShieldCheck, CreditCard } from 'lucide-react';
import toast from 'react-hot-toast';
import useCartStore from '../store/cartStore';
import useAuthStore from '../store/authStore';
import { orderAPI, paymentAPI } from '../services/api';

const Checkout = () => {
  const { cart, loading, fetchCart, getCartDetails } = useCartStore();
  const { user, getProfile } = useAuthStore();
  const [checkoutLoading, setCheckoutLoading] = useState(false);
  const navigate = useNavigate();

  const { subtotal, shipping, tax, total } = getCartDetails();
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
    // 1. Validation based on your Schema Requirements
    if (!formData.address || !formData.city || !formData.state || !formData.phone || !formData.zipCode) {
      return toast.error("Please fill all shipping details (Street, City, State, Zip, Phone)");
    }
    
    setCheckoutLoading(true);
    try {
      // 2. Map data to match your Mongoose Order Schema exactly
      const orderData = {
        orderItems: cartItems.map(item => ({
          product: item.product._id,
          name: item.product.name,      // Required by Schema
          image: item.product.image || item.product.images?.[0], // Required by Schema
          price: item.product.price,    // Required by Schema
          quantity: item.quantity,      // Required by Schema
        })),
        shippingAddress: {
          street: formData.address,    // Fixed: Schema uses 'street'
          city: formData.city,
          state: formData.state,       // Required by Schema
          zipCode: formData.zipCode,
          country: formData.country || 'India',
          phone: formData.phone        // Required by Schema
        },
        paymentMethod: 'card',         // Fixed: Must be 'card', 'upi', or 'cod'
        itemsPrice: subtotal,          // Required by Schema
        taxPrice: tax,                 // Required by Schema
        shippingPrice: shipping,       // Required by Schema
        totalPrice: total,             // Required by Schema
      };

      console.log("📤 Submitting Order:", orderData);

      // 3. Create the Order
      const orderResponse = await orderAPI.createOrder(orderData);
      const orderId = orderResponse.data.order?._id || orderResponse.data._id;

      // 4. Initiate Stripe Payment
      const paymentResponse = await paymentAPI.createCheckoutSession({
        orderId: orderId,
        items: orderData.orderItems,
        totalAmount: total
      });

      if (paymentResponse.data.url) {
        window.location.href = paymentResponse.data.url;
      }
    } catch (error) {
      console.error("❌ Checkout Error Details:", error.response?.data || error.message);
      toast.error(error.response?.data?.message || "Order creation failed. Check console.");
      setCheckoutLoading(false);
    }
  };

  if (loading) return <div className="min-h-screen bg-[#0f172a] flex items-center justify-center"><Loader2 className="animate-spin text-blue-500" size={40} /></div>;

  return (
    <div className="min-h-screen bg-[#0f172a] text-white py-8 px-4 font-sans">
      {checkoutLoading && (
        <div className="fixed inset-0 bg-black/90 z-50 flex flex-col items-center justify-center">
          <Loader2 className="animate-spin text-blue-500 mb-4" size={60} />
          <h2 className="text-2xl font-bold">Connecting to Secure Payment...</h2>
        </div>
      )}

      <div className="max-w-6xl mx-auto grid lg:grid-cols-3 gap-8">
        <div className="lg:col-span-2 space-y-6">
          <button onClick={() => navigate('/cart')} className="flex items-center gap-2 text-gray-400 hover:text-white transition">
            <ArrowLeft size={20} /> Back to Cart
          </button>
          
          <div className="bg-[#1e293b] p-8 rounded-2xl border border-slate-700 shadow-xl">
             <h2 className="text-2xl font-bold flex items-center gap-2 mb-8">
               <MapPin className="text-blue-500" /> Shipping Information
             </h2>
             
             <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="flex flex-col gap-1">
                  <label className="text-xs text-gray-400 uppercase tracking-wider">First Name</label>
                  <input className="bg-[#0f172a] p-3 rounded-lg border border-slate-700 focus:border-blue-500 outline-none" placeholder="First Name" value={formData.firstName} onChange={(e) => setFormData({...formData, firstName: e.target.value})} />
                </div>
                <div className="flex flex-col gap-1">
                  <label className="text-xs text-gray-400 uppercase tracking-wider">Last Name</label>
                  <input className="bg-[#0f172a] p-3 rounded-lg border border-slate-700 focus:border-blue-500 outline-none" placeholder="Last Name" value={formData.lastName} onChange={(e) => setFormData({...formData, lastName: e.target.value})} />
                </div>
                <div className="col-span-full flex flex-col gap-1">
                  <label className="text-xs text-gray-400 uppercase tracking-wider">Street Address</label>
                  <input className="bg-[#0f172a] p-3 rounded-lg border border-slate-700 focus:border-blue-500 outline-none" placeholder="123 Anime St." value={formData.address} onChange={(e) => setFormData({...formData, address: e.target.value})} />
                </div>
                <div className="flex flex-col gap-1">
                  <label className="text-xs text-gray-400 uppercase tracking-wider">Phone Number</label>
                  <input className="bg-[#0f172a] p-3 rounded-lg border border-slate-700 focus:border-blue-500 outline-none" placeholder="+91 0000000000" value={formData.phone} onChange={(e) => setFormData({...formData, phone: e.target.value})} />
                </div>
                <div className="flex flex-col gap-1">
                  <label className="text-xs text-gray-400 uppercase tracking-wider">City</label>
                  <input className="bg-[#0f172a] p-3 rounded-lg border border-slate-700 focus:border-blue-500 outline-none" placeholder="City" value={formData.city} onChange={(e) => setFormData({...formData, city: e.target.value})} />
                </div>
                <div className="flex flex-col gap-1">
                  <label className="text-xs text-gray-400 uppercase tracking-wider">State</label>
                  <input className="bg-[#0f172a] p-3 rounded-lg border border-slate-700 focus:border-blue-500 outline-none" placeholder="State" value={formData.state} onChange={(e) => setFormData({...formData, state: e.target.value})} />
                </div>
                <div className="flex flex-col gap-1">
                  <label className="text-xs text-gray-400 uppercase tracking-wider">Zip Code</label>
                  <input className="bg-[#0f172a] p-3 rounded-lg border border-slate-700 focus:border-blue-500 outline-none" placeholder="490001" value={formData.zipCode} onChange={(e) => setFormData({...formData, zipCode: e.target.value})} />
                </div>
             </div>
          </div>
        </div>

        <div className="lg:col-span-1">
          <div className="bg-[#1e293b] p-6 rounded-2xl border border-slate-700 sticky top-20 shadow-2xl">
            <h2 className="text-xl font-bold mb-6 border-b border-slate-700 pb-4">Order Summary</h2>
            <div className="space-y-4 mb-6">
              <div className="flex justify-between text-gray-400 text-sm"><span>Subtotal</span><span>₹{subtotal.toFixed(2)}</span></div>
              <div className="flex justify-between text-gray-400 text-sm"><span>GST (18%)</span><span>₹{tax.toFixed(2)}</span></div>
              <div className="flex justify-between text-gray-400 text-sm"><span>Shipping</span><span>{shipping === 0 ? 'FREE' : `₹${shipping.toFixed(2)}`}</span></div>
              <div className="flex justify-between items-center pt-4 border-t border-slate-700 font-bold text-xl text-white">
                <span>Total</span><span className="text-blue-400">₹{total.toFixed(2)}</span>
              </div>
            </div>
            <button onClick={handleCheckout} disabled={checkoutLoading} className="w-full bg-blue-600 hover:bg-blue-500 py-4 rounded-xl font-bold uppercase transition flex items-center justify-center gap-3">
              <CreditCard size={20} /> Pay Now
            </button>
            <p className="text-center text-[10px] text-gray-500 mt-4 flex items-center justify-center gap-1 uppercase tracking-widest">
              <ShieldCheck size={14} className="text-green-500" /> Secure SSL Encryption
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Checkout;