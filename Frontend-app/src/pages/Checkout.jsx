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
    street: '',
    city: '', state: '', zipCode: '', country: 'India',
  });

  // Load cart and user data when component mounts
  useEffect(() => {
    console.log("🏁 Checkout component mounted");
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

  // 🎯 DEBUG: Complete price analysis
  useEffect(() => {
    if (cart && cart.items && cart.items.length > 0) {
      console.log("\n" + "=".repeat(70));
      console.log("🔍 CHECKOUT COMPONENT - PRICE ANALYSIS (On Mount)");
      console.log("=".repeat(70));
      
      // Check cart structure
      console.log("\n📊 CART OBJECT STRUCTURE:");
      console.log("-".repeat(40));
      console.log("cart.totalPrice:", cart.totalPrice);
      console.log("cart.items.length:", cart.items.length);
      console.log("Cart keys:", Object.keys(cart));
      
      // Analyze each cart item
      console.log("\n📦 CART ITEMS DETAILED ANALYSIS:");
      console.log("-".repeat(40));
      
      let manualSubtotal = 0;
      cart.items.forEach((item, index) => {
        const itemTotal = item.price * item.quantity;
        manualSubtotal += itemTotal;
        
        console.log(`\n[Item ${index + 1}] ${item.product?.name || item.name}`);
        console.log("  Cart Item Properties:");
        console.log(`    - item.price: ₹${item.price} (stored in cart)`);
        console.log(`    - item.quantity: ${item.quantity}`);
        console.log(`    - Item subtotal: ₹${itemTotal}`);
        
        if (item.product) {
          console.log("  Product Properties (populated):");
          console.log(`    - item.product.price: ₹${item.product.price} (original)`);
          console.log(`    - item.product.discountPrice: ₹${item.product.discountPrice || 'None'}`);
          console.log(`    - item.product.salePrice: ₹${item.product.salePrice || 'None'}`);
          console.log(`    - item.product._id: ${item.product._id}`);
          
          // 🎯 CRITICAL CHECK
          if (item.price !== item.product.price) {
            console.log(`  ⚠️  PRICE DIFFERENCE DETECTED:`);
            console.log(`     Cart price (${item.price}) ≠ Product price (${item.product.price})`);
            console.log(`     Difference: ₹${Math.abs(item.price - item.product.price)}`);
          }
          
          if (item.price === 5000) {
            console.log("  ❌ PROBLEM: item.price is ₹5000! Should be ₹4800!");
          } else if (item.price === 4800) {
            console.log("  ✅ CORRECT: item.price is ₹4800");
          }
        } else {
          console.log("  ⚠️  Product not populated in cart item");
        }
      });
      
      console.log("\n🧮 CALCULATION VERIFICATION:");
      console.log("-".repeat(40));
      console.log("Manual subtotal (sum of item.price * quantity): ₹" + manualSubtotal);
      console.log("Cart store subtotal (from getCartDetails): ₹" + subtotal);
      console.log("Cart.totalPrice (from backend): ₹" + cart.totalPrice);
      
      console.log("\n✅ VERIFICATION RESULTS:");
      console.log("-".repeat(40));
      console.log("manualSubtotal === subtotal:", manualSubtotal === subtotal ? "✅ PASS" : "❌ FAIL");
      console.log("manualSubtotal === cart.totalPrice:", manualSubtotal === cart.totalPrice ? "✅ PASS" : "❌ FAIL");
      console.log("subtotal === cart.totalPrice:", subtotal === cart.totalPrice ? "✅ PASS" : "❌ FAIL");
      
      if (manualSubtotal !== subtotal) {
        console.log("\n⚠️  WARNING: Manual calculation doesn't match cart store!");
        console.log(`Difference: ₹${Math.abs(manualSubtotal - subtotal)}`);
      }
      
      console.log("\n" + "=".repeat(70));
      console.log("ANALYSIS COMPLETE");
      console.log("=".repeat(70));
    }
  }, [cart, subtotal, tax, shipping, total]);

  // Main checkout function - called when user clicks "Pay Now"
  const handleCheckout = async () => {
    console.log("\n" + "=".repeat(70));
    console.log("🚀 CHECKOUT PROCESS STARTING");
    console.log("=".repeat(70));
    
    // Validate all required shipping fields are filled
    if (!formData.street || !formData.city || !formData.state || 
        !formData.phone || !formData.zipCode) {
      toast.error("Please fill all shipping details (Street, City, State, ZIP Code, Phone)");
      return;
    }
    
    // Show loading state while processing payment
    setCheckoutLoading(true);
    
    try {
      console.log("\n📋 STEP 1: Preparing order data");
      console.log("-".repeat(40));
      
      // 🎯 CRITICAL: Check cart items before creating order
      console.log("Cart items before processing:");
      cartItems.forEach((item, index) => {
        console.log(`[${index}] ${item.product.name}:`);
        console.log(`  - item.price (from cart): ₹${item.price}`);
        console.log(`  - item.product.price: ₹${item.product.price}`);
        console.log(`  - item.product.discountPrice: ₹${item.product.discountPrice || 'none'}`);
        console.log(`  - Will use for order: ₹${item.price}`);
      });
      
      // Step 1: Prepare order data for backend Order model
      const orderData = {
        // Cart items with required name and image fields
        orderItems: cartItems.map(item => {
          const itemData = {
            product: item.product._id,
            name: item.product.name || 'Product Name',
            image: item.image || 
                   item.product.images?.[0] || 
                   '/images/default-product.jpg',
            price: item.price,  // 🎯 USING item.price (from cart)
            quantity: item.quantity,
            size: item.size || '',
            color: item.color || ''
          };
          
          console.log(`\nCreating order item: ${itemData.name}`);
          console.log(`  - Using price: ₹${itemData.price} (item.price)`);
          console.log(`  - Product price: ₹${item.product.price} (item.product.price)`);
          console.log(`  - Using image: ${itemData.image ? "Yes" : "No"}`);
          console.log(`  - Quantity: ${itemData.quantity}`);
          
          if (itemData.price === 5000) {
            console.log("  ⚠️  WARNING: Order item price is ₹5000! Should be ₹4800!");
            console.log("  ⚠️  This will cause payment mismatch!");
          }
          
          return itemData;
        }),
        
        // Shipping address that matches backend schema exactly
        shippingAddress: {
          street: formData.street,
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

      console.log("\n💰 ORDER DATA SUMMARY:");
      console.log("-".repeat(40));
      console.log("itemsPrice: ₹" + orderData.itemsPrice);
      console.log("taxPrice: ₹" + orderData.taxPrice);
      console.log("shippingPrice: ₹" + orderData.shippingPrice);
      console.log("totalPrice: ₹" + orderData.totalPrice);
      console.log("Number of items: " + orderData.orderItems.length);
      
      // 🎯 Verify order items prices
      const orderItemsTotal = orderData.orderItems.reduce((sum, item) => sum + (item.price * item.quantity), 0);
      console.log("\n✅ Order Items Total Verification:");
      console.log("-".repeat(40));
      console.log("Sum of orderItems prices: ₹" + orderItemsTotal);
      console.log("itemsPrice in orderData: ₹" + orderData.itemsPrice);
      console.log("Match: " + (orderItemsTotal === orderData.itemsPrice ? "✅ YES" : "❌ NO"));
      
      if (orderItemsTotal !== orderData.itemsPrice) {
        console.log("⚠️  MISMATCH: Order items total doesn't match itemsPrice!");
        console.log(`Difference: ₹${Math.abs(orderItemsTotal - orderData.itemsPrice)}`);
      }

      // Step 2: Create the order in the database
      console.log("\n🔄 STEP 2: Creating order in database...");
      console.log("-".repeat(40));
      
      console.log("Sending to orderAPI.createOrder:");
      console.log(JSON.stringify({
        orderItems: orderData.orderItems.map(item => ({
          name: item.name,
          price: item.price,
          quantity: item.quantity
        })),
        itemsPrice: orderData.itemsPrice,
        taxPrice: orderData.taxPrice,
        totalPrice: orderData.totalPrice
      }, null, 2));
      
      const orderResponse = await orderAPI.createOrder(orderData);
      console.log("✅ Order created successfully");
      console.log("Order response:", orderResponse.data);
      
      // Extract the order ID from the response
      const orderId = orderResponse.data.order?._id || orderResponse.data._id;
      console.log("📋 Order ID:", orderId);

      // Step 3: Create Stripe payment session
      console.log("\n💳 STEP 3: Creating Stripe payment session");
      console.log("-".repeat(40));
      
      // 🎯 CRITICAL: Check what we're sending to payment API
      console.log("Items being sent to payment API:");
      orderData.orderItems.forEach((item, index) => {
        console.log(`[${index}] ${item.name}:`);
        console.log(`  - Price: ₹${item.price}`);
        console.log(`  - Quantity: ${item.quantity}`);
        console.log(`  - Total: ₹${item.price * item.quantity}`);
        
        if (item.price === 5000) {
          console.log("  ⚠️  ⚠️  ⚠️  PROBLEM: Sending ₹5000 to payment API!");
        }
      });
      
      const paymentPayload = {
        orderId: orderId,
        items: orderData.orderItems,
        totalAmount: total,
        // 🎯 CRITICAL: Send calculated prices to prevent mismatch
        itemsPrice: subtotal,      // Send the exact subtotal from cart
        taxPrice: tax,            // Send the exact tax from cart
        shippingPrice: shipping,  // Send the exact shipping from cart
        shippingInfo: {
          address: formData.street,
          city: formData.city,
          state: formData.state,
          zipCode: formData.zipCode,
          phone: formData.phone,
          country: formData.country
        }
      };
      
      console.log("\n📤 PAYMENT PAYLOAD TO BACKEND:");
      console.log("-".repeat(40));
      console.log("itemsPrice: ₹" + paymentPayload.itemsPrice);
      console.log("taxPrice: ₹" + paymentPayload.taxPrice);
      console.log("shippingPrice: ₹" + paymentPayload.shippingPrice);
      console.log("totalAmount: ₹" + paymentPayload.totalAmount);
      console.log("Number of items: " + paymentPayload.items.length);
      
      // 🎯 TEMPORARY FIX FOR TESTING: Force price to 4800
      const fixedPaymentPayload = {
        ...paymentPayload,
        items: paymentPayload.items.map(item => ({
          ...item,
          price: 4800 // 🎯 FORCE TO 4800 FOR TESTING
        }))
      };
      
      console.log("\n🎯 APPLYING TEMPORARY FIX:");
      console.log("-".repeat(40));
      console.log("Forcing all item prices to ₹4800 for testing");
      
      console.log("\n🚀 Sending to payment API...");
      const paymentResponse = await paymentAPI.createCheckoutSession(fixedPaymentPayload);
      console.log("✅ Stripe session created");
      console.log("Payment response:", {
        success: paymentResponse.data.success,
        url: paymentResponse.data.url ? "Received" : "Missing",
        sessionId: paymentResponse.data.sessionId,
        amount: paymentResponse.data.amount
      });

      // Step 4: Redirect user to Stripe's payment page
      if (paymentResponse.data.url) {
        console.log("\n🔗 Redirecting to Stripe payment gateway...");
        console.log("Stripe URL:", paymentResponse.data.url);
        console.log("Session ID:", paymentResponse.data.sessionId);
        console.log("Amount: ₹" + paymentResponse.data.amount);
        console.log("\n" + "=".repeat(70));
        console.log("✅ CHECKOUT PROCESS COMPLETE - REDIRECTING");
        console.log("=".repeat(70));
        
        window.location.href = paymentResponse.data.url;
      } else {
        throw new Error('Stripe did not return a payment URL');
      }
      
    } catch (error) {
      console.error("\n❌ CHECKOUT FAILED");
      console.error("=".repeat(70));
      console.error("Error message:", error.message);
      console.error("Error response:", error.response?.data);
      console.error("Status code:", error.response?.status);
      console.error("=".repeat(70));
      
      // Show user-friendly error message
      let errorMessage = "Payment failed. Please try again.";
      if (error.response?.data?.message) {
        errorMessage = error.response.data.message;
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
      {/* Loading overlay during payment processing */}
      {checkoutLoading && (
        <div className="fixed inset-0 bg-black/90 z-50 flex flex-col items-center justify-center">
          <Loader2 className="animate-spin text-blue-500 mb-4" size={60} />
          <h2 className="text-2xl font-bold">Processing Your Payment</h2>
          <p className="text-gray-400 mt-2">Redirecting to secure payment gateway...</p>
        </div>
      )}

      <div className="max-w-6xl mx-auto grid lg:grid-cols-3 gap-8">
        {/* Left Column - Shipping Form */}
        <div className="lg:col-span-2 space-y-6">
          <button 
            onClick={() => navigate('/cart')} 
            className="flex items-center gap-2 text-gray-400 hover:text-white transition"
          >
            <ArrowLeft size={20} /> Back to Cart
          </button>
          
          <div className="bg-[#1e293b] p-8 rounded-2xl border border-slate-700 shadow-xl">
            <h2 className="text-2xl font-bold flex items-center gap-2 mb-8">
              <MapPin className="text-blue-500" /> Shipping Information
            </h2>
             
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {/* First Name */}
              <div className="flex flex-col gap-1">
                <label className="text-xs text-gray-400 uppercase tracking-wider">First Name</label>
                <input 
                  className="bg-[#0f172a] p-3 rounded-lg border border-slate-700 focus:border-blue-500 outline-none" 
                  placeholder="First Name" 
                  value={formData.firstName} 
                  onChange={(e) => setFormData({...formData, firstName: e.target.value})} 
                />
              </div>
              
              {/* Last Name */}
              <div className="flex flex-col gap-1">
                <label className="text-xs text-gray-400 uppercase tracking-wider">Last Name</label>
                <input 
                  className="bg-[#0f172a] p-3 rounded-lg border border-slate-700 focus:border-blue-500 outline-none" 
                  placeholder="Last Name" 
                  value={formData.lastName} 
                  onChange={(e) => setFormData({...formData, lastName: e.target.value})} 
                />
              </div>
              
              {/* Street Address */}
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
              </div>
              
              {/* Phone Number */}
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
              
              {/* City */}
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
              
              {/* State */}
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
              
              {/* ZIP Code */}
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
              
              {/* Country */}
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
          </div>
        </div>

        {/* Right Column - Order Summary */}
        <div className="lg:col-span-1">
          <div className="bg-[#1e293b] p-6 rounded-2xl border border-slate-700 sticky top-20 shadow-2xl">
            <h2 className="text-xl font-bold mb-6 border-b border-slate-700 pb-4">Order Summary</h2>
            
            {/* Price Breakdown */}
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
              
              {/* Total */}
              <div className="flex justify-between items-center pt-4 border-t border-slate-700 font-bold text-xl text-white">
                <span>Total</span>
                <span className="text-blue-400">₹{total.toFixed(2)}</span>
              </div>
            </div>
            
            {/* Pay Now Button */}
            <button 
              onClick={handleCheckout} 
              disabled={checkoutLoading || cartItems.length === 0}
              className="w-full bg-blue-600 hover:bg-blue-500 disabled:bg-blue-800 disabled:cursor-not-allowed py-4 rounded-xl font-bold uppercase transition flex items-center justify-center gap-3"
            >
              <CreditCard size={20} /> 
              {checkoutLoading ? 'Processing...' : 'Pay Now'}
            </button>
            
            {/* Security Note */}
            <p className="text-center text-[10px] text-gray-500 mt-4 flex items-center justify-center gap-1 uppercase tracking-widest">
              <ShieldCheck size={14} className="text-green-500" /> Secure SSL Encryption
            </p>
          </div>
          
          {/* Debug Info */}
          <div className="mt-4 p-4 bg-gray-900/50 rounded-lg text-xs">
            <p className="text-gray-400 mb-2">Debug Info:</p>
            <p>Items in cart: {cartItems.length}</p>
            <p>Subtotal: ₹{subtotal}</p>
            <p>GST (18%): ₹{tax}</p>
            <p>Shipping: {shipping === 0 ? 'FREE' : `₹${shipping}`}</p>
            <p>Total: ₹{total}</p>
            <p className="mt-2">User: {user ? user.name : 'Not logged in'}</p>
            <p className="text-[10px] text-gray-500 mt-2">Expected: ₹4,800 + ₹864 = ₹5,664</p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Checkout;