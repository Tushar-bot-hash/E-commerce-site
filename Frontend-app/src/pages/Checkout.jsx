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

  // Form state stores all shipping information
  const [formData, setFormData] = useState({
    firstName: '', lastName: '', email: '', phone: '',
    street: '',  // Fixed: Using 'street' to match backend Order model
    city: '', state: '', zipCode: '', country: 'India',
  });

  // Load cart and user data when component mounts
  useEffect(() => {
    fetchCart();
    if (!user) getProfile();
  }, [fetchCart, getProfile, user]);

  // Populate form with user's saved information if available
  useEffect(() => {
    if (user) {
      const names = user.name?.split(' ') || [];
      setFormData(prev => ({
        ...prev,
        firstName: names[0] || '',
        lastName: names.slice(1).join(' ') || '',
        email: user.email || '',
        street: user.shippingAddress?.street || 
                user.shippingAddress?.address || '',
        city: user.shippingAddress?.city || '',
        state: user.shippingAddress?.state || '',
        zipCode: user.shippingAddress?.zipCode || '',
        phone: user.shippingAddress?.phone || user.phone || '',
      }));
    }
  }, [user]);

  // Main checkout function - called when user clicks "Pay Now"
  const handleCheckout = async () => {
    // Validate all required shipping fields are filled
    if (!formData.street || !formData.city || !formData.state || 
        !formData.phone || !formData.zipCode) {
      return toast.error("Please fill all shipping details (Street, City, State, ZIP Code, Phone)");
    }
    
    // Show loading state while processing payment
    setCheckoutLoading(true);
    
    try {
      // Step 1: Prepare order data for backend Order model
      // This data must match exactly what the backend expects
      const orderData = {
        // Cart items with required name and image fields
        orderItems: cartItems.map(item => ({
          product: item.product._id,
          name: item.product.name || 'Product Name',
          image: item.product.image || 
                 item.product.images?.[0] || 
                 '/images/default-product.jpg',
          price: item.product.price,
          quantity: item.quantity,
          size: item.size || '',
          color: item.color || ''
        })),
        
        // Shipping address that matches backend schema exactly
        shippingAddress: {
          street: formData.street,      // Field name must be 'street' not 'address'
          city: formData.city,
          state: formData.state,  
          zipCode: formData.zipCode,
          country: formData.country || 'India',
          phone: formData.phone
        },
        
        paymentMethod: 'card',
        itemsPrice: subtotal,
        taxPrice: tax,
        shippingPrice: shipping,
        totalPrice: total,
      };

      // Log the order data for debugging
      console.log("📦 Creating order with data:", orderData);

      // Step 2: Create the order in the database
      console.log("🔄 Sending order to backend...");
      const orderResponse = await orderAPI.createOrder(orderData);
      console.log("✅ Order created successfully:", orderResponse.data);
      
      // Extract the order ID from the response
      const orderId = orderResponse.data.order?._id || orderResponse.data._id;
      console.log("📋 Order ID:", orderId);

      // Step 3: Create Stripe payment session
      // 🛠️ FIXED: Now includes shippingInfo which the payment.js backend expects
      console.log("💳 Creating Stripe payment session...");
      
      const paymentResponse = await paymentAPI.createCheckoutSession({
        orderId: orderId,
        items: orderData.orderItems,
        totalAmount: total,
        // 🛠️ CRITICAL FIX: Adding shippingInfo that payment.js requires
        shippingInfo: {
          address: formData.street,    // Street address for Stripe metadata
          city: formData.city,         // City for Stripe metadata
          state: formData.state,       // State for Stripe metadata
          zipCode: formData.zipCode,   // ZIP Code for Stripe metadata
          phone: formData.phone,       // Phone for Stripe metadata
          country: formData.country    // Country for Stripe metadata
        }
      });

      console.log("✅ Stripe session created:", paymentResponse.data);

      // Step 4: Redirect user to Stripe's payment page
      if (paymentResponse.data.url) {
        console.log("🔗 Redirecting to Stripe payment gateway...");
        window.location.href = paymentResponse.data.url;
      } else {
        throw new Error('Stripe did not return a payment URL');
      }
      
    } catch (error) {
      // Handle any errors that occur during the checkout process
      console.error("❌ Checkout failed with error:", {
        message: error.message,
        backendResponse: error.response?.data,
        statusCode: error.response?.status
      });
      
      // Show user-friendly error message
      let errorMessage = "Payment failed. Please try again.";
      if (error.response?.data?.message) {
        errorMessage = error.response.data.message;
      } else if (error.message.includes('shippingInfo')) {
        errorMessage = "Payment configuration error. Please contact support.";
      }
      
      toast.error(errorMessage);
      
      // Hide loading state so user can try again
      setCheckoutLoading(false);
    }
  };

  // Show loading screen while cart data is loading
  if (loading) {
    return (
      <div className="min-h-screen bg-[#0f172a] flex items-center justify-center">
        <Loader2 className="animate-spin text-blue-500" size={40} />
        <span className="ml-3">Loading your cart...</span>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#0f172a] text-white py-8 px-4 font-sans">
      {/* Overlay shown during payment processing */}
      {checkoutLoading && (
        <div className="fixed inset-0 bg-black/90 z-50 flex flex-col items-center justify-center">
          <Loader2 className="animate-spin text-blue-500 mb-4" size={60} />
          <h2 className="text-2xl font-bold">Processing Your Payment</h2>
          <p className="text-gray-400 mt-2">Redirecting to secure payment gateway...</p>
          <p className="text-gray-500 text-sm mt-4">Please do not close this window</p>
        </div>
      )}

      <div className="max-w-6xl mx-auto grid lg:grid-cols-3 gap-8">
        {/* Left column - Shipping information form */}
        <div className="lg:col-span-2 space-y-6">
          {/* Back button to return to cart */}
          <button 
            onClick={() => navigate('/cart')} 
            className="flex items-center gap-2 text-gray-400 hover:text-white transition"
          >
            <ArrowLeft size={20} /> Back to Cart
          </button>
          
          {/* Shipping information form */}
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
              
              {/* Street address field - critical for order creation */}
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
                  This will be sent to both Order API and Payment API
                </p>
              </div>
              
              {/* Contact information */}
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
              
              {/* Location fields */}
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
            
            {/* Information about required fields */}
            <div className="mt-6 p-4 bg-blue-900/20 border border-blue-700/30 rounded-lg">
              <p className="text-sm text-blue-300">
                ⚠️ All fields marked with * are required for order creation and payment processing
              </p>
            </div>
          </div>
        </div>

        {/* Right column - Order summary and payment button */}
        <div className="lg:col-span-1">
          <div className="bg-[#1e293b] p-6 rounded-2xl border border-slate-700 sticky top-20 shadow-2xl">
            <h2 className="text-xl font-bold mb-6 border-b border-slate-700 pb-4">Order Summary</h2>
            
            {/* Price breakdown */}
            <div className="space-y-4 mb-6">
              <div className="flex justify-between text-gray-400 text-sm">
                <span>Subtotal</span>
                <span>₹{subtotal.toFixed(2)}</span>
              </div>
              <div className="flex justify-between text-gray-400 text-sm">
                <span>GST (18%)</span>
                <span>₹{tax.toFixed(2)}</span>
              </div>
              <div className="flex justify-between text-gray-400 text-sm">
                <span>Shipping</span>
                <span>{shipping === 0 ? 'FREE' : `₹${shipping.toFixed(2)}`}</span>
              </div>
              
              {/* Total price */}
              <div className="flex justify-between items-center pt-4 border-t border-slate-700 font-bold text-xl text-white">
                <span>Total</span>
                <span className="text-blue-400">₹{total.toFixed(2)}</span>
              </div>
            </div>
            
            {/* Pay Now button - triggers the checkout process */}
            <button 
              onClick={handleCheckout} 
              disabled={checkoutLoading || cartItems.length === 0}
              className="w-full bg-blue-600 hover:bg-blue-500 disabled:bg-blue-800 disabled:cursor-not-allowed py-4 rounded-xl font-bold uppercase transition flex items-center justify-center gap-3"
            >
              <CreditCard size={20} /> 
              {checkoutLoading ? 'Processing...' : 'Pay Now'}
            </button>
            
            {/* Security assurance */}
            <p className="text-center text-[10px] text-gray-500 mt-4 flex items-center justify-center gap-1 uppercase tracking-widest">
              <ShieldCheck size={14} className="text-green-500" /> Secure SSL Encryption
            </p>
          </div>
          
          {/* Debug information (visible in development) */}
          <div className="mt-4 p-4 bg-gray-900/50 rounded-lg text-xs">
            <p className="text-gray-400 mb-2">Order Status:</p>
            <p>• Items in cart: {cartItems.length}</p>
            <p>• Required fields filled: {
              formData.street && formData.city && formData.state && 
              formData.zipCode && formData.phone ? '✅ All' : '❌ Some missing'
            }</p>
            <p>• Ready for payment: {cartItems.length > 0 && !checkoutLoading ? '✅ Yes' : '❌ No'}</p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Checkout;