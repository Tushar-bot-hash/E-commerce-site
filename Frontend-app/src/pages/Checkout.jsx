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

      // Log prices for debugging
      console.log("💰 Frontend Price Calculation:", {
        subtotal: subtotal,
        tax: tax,
        shipping: shipping,
        total: total,
        items: cartItems.map(item => ({
          name: item.product.name,
          price: item.product.price,
          quantity: item.quantity,
          itemTotal: item.product.price * item.quantity
        }))
      });

      // Step 2: Create the order in the database
      console.log("🔄 Creating order in database...");
      const orderResponse = await orderAPI.createOrder(orderData);
      console.log("✅ Order created successfully:", orderResponse.data);
      
      // Extract the order ID from the response
      const orderId = orderResponse.data.order?._id || orderResponse.data._id;
      console.log("📋 Order ID:", orderId);

      // Step 3: Create Stripe payment session
      console.log("💳 Creating Stripe payment session...");
      
      // 🛠️ FIX: Send ALL calculated prices to ensure consistency with Stripe
      const paymentResponse = await paymentAPI.createCheckoutSession({
        orderId: orderId,
        items: orderData.orderItems,
        totalAmount: total,
        // 🛠️ CRITICAL: Send calculated prices to prevent mismatch
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

  // ... (Rest of the JSX remains exactly the same as before)
  // Only the handleCheckout function was updated above
  return (
    <div className="min-h-screen bg-[#0f172a] text-white py-8 px-4 font-sans">
      {/* Loading overlay and JSX remains unchanged */}
      {/* ... */}
    </div>
  );
};

export default Checkout;