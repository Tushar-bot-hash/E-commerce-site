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

  // Form state - using 'street' instead of 'address' to match backend Order model
  const [formData, setFormData] = useState({
    firstName: '', lastName: '', email: '', phone: '',
    street: '',  // 🛠️ Fixed: Backend expects 'street' field, not 'address'
    city: '', state: '', zipCode: '', country: 'India',
  });

  // Load cart and user data on component mount
  useEffect(() => {
    fetchCart();
    if (!user) getProfile();
  }, [fetchCart, getProfile, user]);

  // Populate form with user data when user is available
  useEffect(() => {
    if (user) {
      const names = user.name?.split(' ') || [];
      setFormData(prev => ({
        ...prev,
        firstName: names[0] || '',
        lastName: names.slice(1).join(' ') || '',
        email: user.email || '',
        // 🛠️ Fixed: Map user address data correctly
        street: user.shippingAddress?.street || 
                user.shippingAddress?.address || '', // Supports both field names
        city: user.shippingAddress?.city || '',
        state: user.shippingAddress?.state || '',
        zipCode: user.shippingAddress?.zipCode || '',
        phone: user.shippingAddress?.phone || user.phone || '',
      }));
    }
  }, [user]);

  // Handle checkout process when user clicks "Pay Now"
  const handleCheckout = async () => {
    // 🛠️ Validation: Check all required fields that backend needs
    if (!formData.street || !formData.city || !formData.state || 
        !formData.phone || !formData.zipCode) {
      return toast.error("Please fill all shipping details (Street, City, State, ZIP Code, Phone)");
    }
    
    setCheckoutLoading(true);
    try {
      // 🛠️ Constructing order data that matches backend Order model exactly
      const orderData = {
        // Cart items with required name and image fields
        orderItems: cartItems.map(item => ({
          product: item.product._id,
          name: item.product.name || 'Product Name',  // 🛠️ Required by backend
          image: item.product.image ||                // 🛠️ Required by backend
                 item.product.images?.[0] || 
                 '/images/default-product.jpg',       // 🛠️ Fallback for missing images
          price: item.product.price,
          quantity: item.quantity,
          size: item.size || '',    // Optional fields
          color: item.color || ''   // Optional fields
        })),
        
        // 🛠️ Fixed shipping address structure - matches backend schema
        shippingAddress: {
          street: formData.street,      // 🛠️ Using correct field name
          city: formData.city,          // ✅ Required field
          state: formData.state,        // ✅ Required field  
          zipCode: formData.zipCode,    // ✅ Required field
          country: formData.country || 'India', // ✅ Required field
          phone: formData.phone         // ✅ Required field
          // Note: firstName, lastName, email are not part of shippingAddress in backend
        },
        
        paymentMethod: 'card',  // 🛠️ Required field, must match backend enum
        
        // 🛠️ All pricing fields required by backend
        itemsPrice: subtotal,    // Subtotal of items
        taxPrice: tax,           // Tax amount
        shippingPrice: shipping, // Shipping cost
        totalPrice: total,       // Grand total
      };

      // Log what we're sending to the backend for debugging
      console.log("📤 Sending order data to backend:", orderData);

      // Step 1: Create order in database
      console.log("🔄 Creating order in backend...");
      const orderResponse = await orderAPI.createOrder(orderData);
      console.log("✅ Order created successfully:", orderResponse.data);
      
      const orderId = orderResponse.data.order?._id || orderResponse.data._id;
      if (!orderId) {
        throw new Error('Failed to get order ID from server response');
      }

      // Step 2: Create Stripe payment session
      console.log("🔄 Creating Stripe checkout session...");
      const paymentResponse = await paymentAPI.createCheckoutSession({
        orderId: orderId,
        items: orderData.orderItems,
        totalAmount: total
      });

      console.log("✅ Stripe session created:", paymentResponse.data);

      // Step 3: Redirect user to Stripe payment page
      if (paymentResponse.data.url) {
        console.log("🔗 Redirecting to Stripe payment page...");
        window.location.href = paymentResponse.data.url;
      } else {
        throw new Error('Stripe did not return a payment URL');
      }
      
    } catch (error) {
      // Handle any errors during checkout process
      console.error("❌ Checkout process failed:", {
        error: error.message,
        backendError: error.response?.data,
        statusCode: error.response?.status
      });
      
      // Show user-friendly error message
      const errorMsg = error.response?.data?.message || 
                       "Order creation failed. Please check your details and try again.";
      toast.error(errorMsg);
      
      setCheckoutLoading(false);
    }
  };

  // Show loading screen while cart data is being fetched
  if (loading) {
    return (
      <div className="min-h-screen bg-[#0f172a] flex items-center justify-center">
        <Loader2 className="animate-spin text-blue-500" size={40} />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#0f172a] text-white py-8 px-4 font-sans">
      {/* Loading overlay shown during payment processing */}
      {checkoutLoading && (
        <div className="fixed inset-0 bg-black/90 z-50 flex flex-col items-center justify-center">
          <Loader2 className="animate-spin text-blue-500 mb-4" size={60} />
          <h2 className="text-2xl font-bold">Processing Your Payment...</h2>
          <p className="text-gray-400 mt-2">Please wait while we connect to the payment gateway</p>
        </div>
      )}

      <div className="max-w-6xl mx-auto grid lg:grid-cols-3 gap-8">
        {/* Left column - Shipping information form */}
        <div className="lg:col-span-2 space-y-6">
          {/* Navigation back to cart */}
          <button 
            onClick={() => navigate('/cart')} 
            className="flex items-center gap-2 text-gray-400 hover:text-white transition"
          >
            <ArrowLeft size={20} /> Back to Cart
          </button>
          
          {/* Shipping address form */}
          <div className="bg-[#1e293b] p-8 rounded-2xl border border-slate-700 shadow-xl">
            <h2 className="text-2xl font-bold flex items-center gap-2 mb-8">
              <MapPin className="text-blue-500" /> Shipping Information
            </h2>
             
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {/* Personal information fields */}
              <div className="flex flex-col gap-1">
                <label className="text-xs text-gray-400 uppercase tracking-wider">First Name</label>
                <input 
                  className="bg-[#0f172a] p-3 rounded-lg border border-slate-700 focus:border-blue-500 outline-none" 
                  placeholder="First Name" 
                  value={formData.firstName} 
                  onChange={(e) => setFormData({...formData, firstName: e.target.value})} 
                />
              </div>
              
              <div className="flex flex-col gap-1">
                <label className="text-xs text-gray-400 uppercase tracking-wider">Last Name</label>
                <input 
                  className="bg-[#0f172a] p-3 rounded-lg border border-slate-700 focus:border-blue-500 outline-none" 
                  placeholder="Last Name" 
                  value={formData.lastName} 
                  onChange={(e) => setFormData({...formData, lastName: e.target.value})} 
                />
              </div>
              
              {/* 🛠️ Fixed: Street address field (was previously 'address') */}
              <div className="col-span-full flex flex-col gap-1">
                <label className="text-xs text-gray-400 uppercase tracking-wider">
                  Street Address *
                </label>
                <input 
                  className="bg-[#0f172a] p-3 rounded-lg border border-slate-700 focus:border-blue-500 outline-none" 
                  placeholder="123 Anime Street, Building Name" 
                  value={formData.street}
                  onChange={(e) => setFormData({...formData, street: e.target.value})}
                  required
                />
                <p className="text-xs text-gray-500 mt-1">
                  This maps to the 'street' field in your Order model
                </p>
              </div>
              
              {/* Contact and location fields */}
              <div className="flex flex-col gap-1">
                <label className="text-xs text-gray-400 uppercase tracking-wider">Phone Number *</label>
                <input 
                  className="bg-[#0f172a] p-3 rounded-lg border border-slate-700 focus:border-blue-500 outline-none" 
                  placeholder="+91 0000000000" 
                  value={formData.phone} 
                  onChange={(e) => setFormData({...formData, phone: e.target.value})}
                  required
                />
              </div>
              
              <div className="flex flex-col gap-1">
                <label className="text-xs text-gray-400 uppercase tracking-wider">City *</label>
                <input 
                  className="bg-[#0f172a] p-3 rounded-lg border border-slate-700 focus:border-blue-500 outline-none" 
                  placeholder="Mumbai" 
                  value={formData.city} 
                  onChange={(e) => setFormData({...formData, city: e.target.value})}
                  required
                />
              </div>
              
              <div className="flex flex-col gap-1">
                <label className="text-xs text-gray-400 uppercase tracking-wider">State *</label>
                <input 
                  className="bg-[#0f172a] p-3 rounded-lg border border-slate-700 focus:border-blue-500 outline-none" 
                  placeholder="Maharashtra" 
                  value={formData.state} 
                  onChange={(e) => setFormData({...formData, state: e.target.value})}
                  required
                />
              </div>
              
              <div className="flex flex-col gap-1">
                <label className="text-xs text-gray-400 uppercase tracking-wider">ZIP Code *</label>
                <input 
                  className="bg-[#0f172a] p-3 rounded-lg border border-slate-700 focus:border-blue-500 outline-none" 
                  placeholder="400001" 
                  value={formData.zipCode} 
                  onChange={(e) => setFormData({...formData, zipCode: e.target.value})}
                  required
                />
              </div>
              
              <div className="flex flex-col gap-1">
                <label className="text-xs text-gray-400 uppercase tracking-wider">Country *</label>
                <input 
                  className="bg-[#0f172a] p-3 rounded-lg border border-slate-700 focus:border-blue-500 outline-none" 
                  value={formData.country} 
                  onChange={(e) => setFormData({...formData, country: e.target.value})}
                  required
                />
              </div>
            </div>
            
            {/* Information note about required fields */}
            <div className="mt-6 p-4 bg-blue-900/20 border border-blue-700/30 rounded-lg">
              <p className="text-sm text-blue-300">
                ⚠️ All fields marked with * are required to create an order
              </p>
            </div>
          </div>
        </div>

        {/* Right column - Order summary and payment button */}
        <div className="lg:col-span-1">
          <div className="bg-[#1e293b] p-6 rounded-2xl border border-slate-700 sticky top-20 shadow-2xl">
            <h2 className="text-xl font-bold mb-6 border-b border-slate-700 pb-4">Order Summary</h2>
            
            {/* Price breakdown showing all required pricing fields */}
            <div className="space-y-4 mb-6">
              <div className="flex justify-between text-gray-400 text-sm">
                <span>Subtotal (itemsPrice)</span>
                <span>₹{subtotal.toFixed(2)}</span>
              </div>
              <div className="flex justify-between text-gray-400 text-sm">
                <span>GST (taxPrice)</span>
                <span>₹{tax.toFixed(2)}</span>
              </div>
              <div className="flex justify-between text-gray-400 text-sm">
                <span>Shipping (shippingPrice)</span>
                <span>{shipping === 0 ? 'FREE' : `₹${shipping.toFixed(2)}`}</span>
              </div>
              
              {/* Total price display */}
              <div className="flex justify-between items-center pt-4 border-t border-slate-700 font-bold text-xl text-white">
                <span>Total (totalPrice)</span>
                <span className="text-blue-400">₹{total.toFixed(2)}</span>
              </div>
            </div>
            
            {/* Main checkout button */}
            <button 
              onClick={handleCheckout} 
              disabled={checkoutLoading || cartItems.length === 0}
              className="w-full bg-blue-600 hover:bg-blue-500 disabled:bg-blue-800 disabled:cursor-not-allowed py-4 rounded-xl font-bold uppercase transition flex items-center justify-center gap-3"
            >
              <CreditCard size={20} /> 
              {checkoutLoading ? 'Processing...' : 'Pay Now'}
            </button>
            
            {/* Security assurance for users */}
            <p className="text-center text-[10px] text-gray-500 mt-4 flex items-center justify-center gap-1 uppercase tracking-widest">
              <ShieldCheck size={14} className="text-green-500" /> Secure SSL Encryption
            </p>
          </div>
          
          {/* Debug information panel (can be removed in production) */}
          <div className="mt-4 p-4 bg-gray-900/50 rounded-lg text-xs">
            <p className="text-gray-400 mb-2">Debug Information:</p>
            <p>Cart Items: {cartItems.length}</p>
            <p>Required Fields Check:</p>
            <p>• Street: {formData.street ? '✅ Filled' : '❌ Missing'}</p>
            <p>• City: {formData.city ? '✅ Filled' : '❌ Missing'}</p>
            <p>• State: {formData.state ? '✅ Filled' : '❌ Missing'}</p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Checkout;