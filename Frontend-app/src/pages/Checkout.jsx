import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { CreditCard, Loader2, ArrowLeft, ShieldCheck, MapPin } from 'lucide-react';
import toast from 'react-hot-toast';
import useCartStore from '../store/cartStore';
import useAuthStore from '../store/authStore';
// Import your central API services
import { authAPI, orderAPI, paymentAPI } from '../services/api';

const Checkout = () => {
  const { cart, fetchCart, getCartDetails, clearCart } = useCartStore();
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
        address: user.shippingAddress?.address || '',
        city: user.shippingAddress?.city || '',
        state: user.shippingAddress?.state || '',
        zipCode: user.shippingAddress?.zipCode || '',
        phone: user.shippingAddress?.phone || user.phone || '',
      }));
    }
  }, [user]);

  /**
   * 🛠️ INSTRUCTION: Save Address using centralized API
   * This avoids the 404 error by hitting /api/auth/profile instead of /api/users/profile
   */
  const handleSaveAddress = async () => {
    if (!formData.address || !formData.phone || !formData.city) {
      return toast.error("Please fill address details before saving");
    }

    setIsSavingAddress(true);
    try {
      await authAPI.updateProfile({ shippingAddress: formData });
      toast.success("Shipping address saved to your profile!");
    } catch (err) {
      console.error("Save Address Error:", err);
      toast.error("Could not save address. Try again later.");
    } finally {
      setIsSavingAddress(false);
    }
  };

  /**
   * 🛠️ INSTRUCTION: Handle Checkout Process
   * 1. Creates the Order in DB. 2. Creates Stripe Session. 3. Redirects.
   */
  const handleCheckout = async () => {
    if (!formData.address || !formData.phone) {
      return toast.error("Shipping address and phone are required");
    }
    
    setCheckoutLoading(true);
    try {
      // 1. Prepare Order Data
      const orderData = {
        orderItems: cart.map(item => ({
          product: item.product._id,
          quantity: item.quantity,
          price: item.product.price
        })),
        shippingAddress: formData,
        totalPrice: total,
      };

      // 2. Create the order in your database
      await orderAPI.createOrder(orderData);

      // 3. Initiate Payment (Stripe)
      const response = await paymentAPI.createCheckoutSession({
        items: cart,
        shippingAddress: formData
      });

      // 4. Redirect to Stripe's hosted page
      if (response.data.url) {
        window.location.href = response.data.url;
      } else {
        throw new Error("No redirect URL received from payment gateway");
      }

    } catch (error) {
      console.error("Checkout process failed:", error);
      toast.error(error.response?.data?.message || "Something went wrong. Please try again.");
      setCheckoutLoading(false); // STOP THE SPINNER on failure
    }
  };

  // Loading state for cart fetching
  if (!cart.length && !checkoutLoading) {
    return (
      <div className="min-h-screen bg-[#0f172a] flex items-center justify-center">
        <Loader2 className="animate-spin text-blue-500" size={40} />
      </div>
    );
  }

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
              <input className="bg-[#334155] p-3 rounded-lg text-white outline-none focus:ring-2 focus:ring-blue-500" placeholder="First Name" value={formData.firstName} onChange={(e) => setFormData({...formData, firstName: e.target.value})} />
              <input className="bg-[#334155] p-3 rounded-lg text-white outline-none focus:ring-2 focus:ring-blue-500" placeholder="Last Name" value={formData.lastName} onChange={(e) => setFormData({...formData, lastName: e.target.value})} />
              <input className="col-span-full bg-[#334155] p-3 rounded-lg text-white outline-none focus:ring-2 focus:ring-blue-500" placeholder="Street Address" value={formData.address} onChange={(e) => setFormData({...formData, address: e.target.value})} />
              <input className="bg-[#334155] p-3 rounded-lg text-white outline-none focus:ring-2 focus:ring-blue-500" placeholder="Phone" value={formData.phone} onChange={(e) => setFormData({...formData, phone: e.target.value})} />
              <input className="bg-[#334155] p-3 rounded-lg text-white outline-none focus:ring-2 focus:ring-blue-500" placeholder="City" value={formData.city} onChange={(e) => setFormData({...formData, city: e.target.value})} />
              <input className="bg-[#334155] p-3 rounded-lg text-white outline-none focus:ring-2 focus:ring-blue-500" placeholder="State" value={formData.state} onChange={(e) => setFormData({...formData, state: e.target.value})} />
              <input className="bg-[#334155] p-3 rounded-lg text-white outline-none focus:ring-2 focus:ring-blue-500" placeholder="Zip Code" value={formData.zipCode} onChange={(e) => setFormData({...formData, zipCode: e.target.value})} />
            </div>
          </div>
        </div>

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
            <button 
              onClick={handleCheckout} 
              disabled={checkoutLoading}
              className="w-full bg-blue-600 hover:bg-blue-500 py-4 rounded-xl font-bold uppercase transition disabled:opacity-50 flex justify-center items-center"
            >
              {checkoutLoading ? <Loader2 className="animate-spin" /> : "Proceed to Payment"}
            </button>
            <div className="mt-4 flex items-center justify-center gap-2 text-xs text-gray-400">
              <ShieldCheck size={14} className="text-green-500" />
              Secure SSL Encrypted Checkout
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Checkout;