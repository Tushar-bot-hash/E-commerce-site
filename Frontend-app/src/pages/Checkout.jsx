import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { CreditCard, ShoppingCart, Loader2, AlertCircle, ArrowLeft, MapPin, Plus } from 'lucide-react';
import toast from 'react-hot-toast';
import useCartStore from '../store/cartStore';
import useAuthStore from '../store/authStore';
import { authAPI } from '../services/api';

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000/api';

export default function Checkout() {
  const { cart, loading, fetchCart } = useCartStore();
  const { user, getProfile } = useAuthStore();
  const [checkoutLoading, setCheckoutLoading] = useState(false);
  const [savedAddresses, setSavedAddresses] = useState([]);
  const [showAddressModal, setShowAddressModal] = useState(false);
  const [selectedAddressId, setSelectedAddressId] = useState('');
  const navigate = useNavigate();

  // Form state
  const [formData, setFormData] = useState({
    // Shipping Address
    firstName: '',
    lastName: '',
    email: '',
    phone: '',
    address: '',
    city: '',
    state: '',
    zipCode: '',
    country: 'India',
    
    // Shipping Method
    shippingMethod: 'standard',
  });

  const [newAddress, setNewAddress] = useState({
    street: '',
    city: '',
    state: '',
    zipCode: '',
    phone: '',
    isDefault: false
  });

  const [formErrors, setFormErrors] = useState({});

  useEffect(() => {
    fetchCart();
    getProfile();
  }, [fetchCart, getProfile]);

  useEffect(() => {
    if (user?.addresses) {
      setSavedAddresses(user.addresses);
      // Auto-select default address if available
      const defaultAddress = user.addresses.find(addr => addr.isDefault);
      if (defaultAddress) {
        handleAddressSelect(defaultAddress);
        setSelectedAddressId(defaultAddress._id);
      }
    }
  }, [user]);

  const cartItems = cart?.items || [];

  const calculateSubtotal = () => {
    return cartItems.reduce((total, item) => {
      const price = item.price || item.product?.price || 0;
      return total + (price * item.quantity);
    }, 0);
  };

  const calculateTax = () => {
    return calculateSubtotal() * 0.1;
  };

  const calculateShipping = () => {
    return formData.shippingMethod === 'express' ? 10 : 5;
  };

  const calculateTotal = () => {
    return calculateSubtotal() + calculateTax() + calculateShipping();
  };

  const handleInputChange = (e) => {
    const { name, value, type, checked } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: type === 'checkbox' ? checked : value
    }));
    
    // Clear error when user starts typing
    if (formErrors[name]) {
      setFormErrors(prev => ({
        ...prev,
        [name]: ''
      }));
    }
  };

  const handleAddressSelect = (address) => {
    setFormData(prev => ({
      ...prev,
      firstName: user?.name?.split(' ')[0] || '',
      lastName: user?.name?.split(' ').slice(1).join(' ') || '',
      email: user?.email || '',
      phone: address.phone,
      address: address.street,
      city: address.city,
      state: address.state,
      zipCode: address.zipCode,
    }));
    setSelectedAddressId(address._id);
  };

  const handleNewAddressInput = (e) => {
    const { name, value, type, checked } = e.target;
    setNewAddress(prev => ({
      ...prev,
      [name]: type === 'checkbox' ? checked : value
    }));
  };

  const handleAddAddress = async (e) => {
    e.preventDefault();
    
    // Validate new address
    if (!newAddress.street || !newAddress.city || !newAddress.state || !newAddress.zipCode || !newAddress.phone) {
      toast.error('Please fill all address fields');
      return;
    }

    try {
      await authAPI.addAddress(newAddress);
      toast.success('Address added successfully');
      await getProfile(); // Refresh user data
      setShowAddressModal(false);
      setNewAddress({
        street: '',
        city: '',
        state: '',
        zipCode: '',
        phone: '',
        isDefault: false
      });
    } catch (error) {
      toast.error(error.response?.data?.message || 'Failed to add address');
    }
  };

  const validateForm = () => {
    const errors = {};
    const requiredFields = [
      'firstName', 'lastName', 'email', 'phone', 
      'address', 'city', 'state', 'zipCode'
    ];

    // Check required fields
    requiredFields.forEach(field => {
      if (!formData[field].trim()) {
        const fieldName = field.replace(/([A-Z])/g, ' $1').toLowerCase();
        errors[field] = `${fieldName} is required`;
      }
    });

    // Email validation
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (formData.email && !emailRegex.test(formData.email)) {
      errors.email = 'Please enter a valid email address';
    }

    // Phone validation (Indian phone numbers)
    const phoneRegex = /^[6-9]\d{9}$/;
    const cleanPhone = formData.phone.replace(/\D/g, '');
    if (formData.phone && !phoneRegex.test(cleanPhone)) {
      errors.phone = 'Please enter a valid 10-digit Indian phone number';
    }

    // ZIP code validation (Indian pincode)
    const zipRegex = /^\d{6}$/;
    if (formData.zipCode && !zipRegex.test(formData.zipCode)) {
      errors.zipCode = 'Please enter a valid 6-digit pincode';
    }

    setFormErrors(errors);
    return Object.keys(errors).length === 0;
  };

  const handleCheckout = async () => {
    if (!validateForm()) {
      toast.error('Please fix the form errors before proceeding');
      return;
    }

    setCheckoutLoading(true);
    try {
      const token = localStorage.getItem('token');
      
      if (!token) {
        toast.error('Please login to continue');
        navigate('/login');
        return;
      }

      if (!cartItems || cartItems.length === 0) {
        toast.error('Your cart is empty');
        return;
      }

      // Prepare items for backend
      const items = cartItems.map(item => {
        const productPrice = item.price || item.product?.price || 0;
        const productName = item.name || item.product?.name || 'Unknown Item';
        const productQuantity = item.quantity || 0;

        return {
          productId: item.product?._id || item.productId,
          quantity: productQuantity,
          price: productPrice,
          name: productName,
        };
      });

      // Prepare shipping info for backend
      const shippingInfo = {
        firstName: formData.firstName.trim(),
        lastName: formData.lastName.trim(),
        email: formData.email.trim(),
        phone: formData.phone.replace(/\D/g, ''), // Clean phone number
        address: formData.address.trim(),
        city: formData.city.trim(),
        state: formData.state.trim(),
        zipCode: formData.zipCode.trim(),
        country: formData.country.trim(),
      };

      const checkoutPayload = {
        items,
        shippingInfo,
        shippingMethod: formData.shippingMethod,
        totalAmount: calculateTotal()
      };

      console.log('🛒 Sending checkout payload:', JSON.stringify(checkoutPayload, null, 2));

      const response = await fetch(`${API_URL}/payment/create-checkout-session`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(checkoutPayload)
      });

      if (!response.ok) {
        const errorText = await response.text();
        console.error('❌ Server response:', response.status, errorText);
        throw new Error(`Payment session creation failed: ${response.status}`);
      }

      const data = await response.json();
      console.log('✅ Checkout response:', data);

      if (data.success && data.url) {
        // Clear cart from localStorage before redirecting
        localStorage.removeItem('cart');
        // Redirect to Stripe Checkout
        window.location.href = data.url;
      } else {
        toast.error(data.message || 'Payment session creation failed'); 
      }
    } catch (err) {
      console.error('❌ Checkout error:', err);
      toast.error(err.message || 'Network error. Please try again.');
    } finally {
      setCheckoutLoading(false);
    }
  };

  // Use loading from cart store
  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-purple-900 via-blue-900 to-black flex items-center justify-center">
        <div className="text-center">
          <Loader2 className="w-12 h-12 text-purple-400 animate-spin mx-auto mb-4" />
          <p className="text-purple-300">Loading your cart...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-purple-900 via-blue-900 to-black py-12 px-4">
      <div className="max-w-6xl mx-auto">
        {/* Back Button */}
        <button
          onClick={() => navigate('/cart')}
          className="flex items-center gap-2 text-purple-400 hover:text-purple-300 mb-6 transition"
        >
          <ArrowLeft className="w-5 h-5" />
          Back to Cart
        </button>

        <div className="grid lg:grid-cols-3 gap-8">
          {/* Left Column - Shipping & Billing Info */}
          <div className="lg:col-span-2 space-y-6">
            {/* Saved Addresses Section */}
            {savedAddresses.length > 0 && (
              <div className="bg-black/40 backdrop-blur-lg rounded-2xl border border-purple-500/30 shadow-2xl overflow-hidden">
                <div className="bg-gradient-to-r from-purple-600 to-blue-600 p-6">
                  <h2 className="text-xl font-bold text-white flex items-center gap-3">
                    <MapPin className="w-6 h-6" />
                    Select Saved Address
                  </h2>
                </div>
                
                <div className="p-6 space-y-4">
                  {savedAddresses.map((address) => (
                    <label 
                      key={address._id}
                      className={`flex items-start space-x-3 cursor-pointer p-4 rounded-lg border transition ${
                        selectedAddressId === address._id 
                          ? 'border-purple-500 bg-purple-500/10' 
                          : 'border-purple-500/30 hover:border-purple-500/50'
                      }`}
                    >
                      <input
                        type="radio"
                        name="savedAddress"
                        checked={selectedAddressId === address._id}
                        onChange={() => handleAddressSelect(address)}
                        className="text-purple-600 focus:ring-purple-500 mt-1"
                      />
                      <div className="flex-1">
                        <div className="flex items-center gap-2 mb-2">
                          <span className="text-white font-medium">
                            {address.isDefault && 'Default Address'}
                          </span>
                          {address.isDefault && (
                            <span className="badge badge-success text-xs">Default</span>
                          )}
                        </div>
                        <p className="text-gray-300">{address.street}</p>
                        <p className="text-gray-400 text-sm">
                          {address.city}, {address.state} - {address.zipCode}
                        </p>
                        <p className="text-gray-400 text-sm">Phone: {address.phone}</p>
                      </div>
                    </label>
                  ))}
                  
                  <button
                    onClick={() => setShowAddressModal(true)}
                    className="w-full flex items-center justify-center gap-2 p-4 border-2 border-dashed border-purple-500/30 rounded-lg text-purple-400 hover:border-purple-500/50 hover:text-purple-300 transition"
                  >
                    <Plus className="w-5 h-5" />
                    Add New Address
                  </button>
                </div>
              </div>
            )}

            {/* Shipping Information */}
            <div className="bg-black/40 backdrop-blur-lg rounded-2xl border border-purple-500/30 shadow-2xl overflow-hidden">
              <div className="bg-gradient-to-r from-purple-600 to-blue-600 p-6">
                <h2 className="text-xl font-bold text-white flex items-center gap-3">
                  <MapPin className="w-6 h-6" />
                  Shipping Information
                </h2>
              </div>
              
              <div className="p-6 grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-gray-300 text-sm font-medium mb-2">
                    First Name *
                  </label>
                  <input
                    type="text"
                    name="firstName"
                    value={formData.firstName}
                    onChange={handleInputChange}
                    className={`w-full bg-black/30 border rounded-lg px-4 py-3 text-white focus:outline-none ${
                      formErrors.firstName ? 'border-red-500' : 'border-purple-500/30 focus:border-purple-500'
                    }`}
                    placeholder="Enter your first name"
                  />
                  {formErrors.firstName && (
                    <p className="text-red-400 text-sm mt-1">{formErrors.firstName}</p>
                  )}
                </div>
                
                <div>
                  <label className="block text-gray-300 text-sm font-medium mb-2">
                    Last Name *
                  </label>
                  <input
                    type="text"
                    name="lastName"
                    value={formData.lastName}
                    onChange={handleInputChange}
                    className={`w-full bg-black/30 border rounded-lg px-4 py-3 text-white focus:outline-none ${
                      formErrors.lastName ? 'border-red-500' : 'border-purple-500/30 focus:border-purple-500'
                    }`}
                    placeholder="Enter your last name"
                  />
                  {formErrors.lastName && (
                    <p className="text-red-400 text-sm mt-1">{formErrors.lastName}</p>
                  )}
                </div>
                
                <div className="md:col-span-2">
                  <label className="block text-gray-300 text-sm font-medium mb-2">
                    Email Address *
                  </label>
                  <input
                    type="email"
                    name="email"
                    value={formData.email}
                    onChange={handleInputChange}
                    className={`w-full bg-black/30 border rounded-lg px-4 py-3 text-white focus:outline-none ${
                      formErrors.email ? 'border-red-500' : 'border-purple-500/30 focus:border-purple-500'
                    }`}
                    placeholder="your.email@example.com"
                  />
                  {formErrors.email && (
                    <p className="text-red-400 text-sm mt-1">{formErrors.email}</p>
                  )}
                </div>
                
                <div className="md:col-span-2">
                  <label className="block text-gray-300 text-sm font-medium mb-2">
                    Phone Number *
                  </label>
                  <input
                    type="tel"
                    name="phone"
                    value={formData.phone}
                    onChange={handleInputChange}
                    className={`w-full bg-black/30 border rounded-lg px-4 py-3 text-white focus:outline-none ${
                      formErrors.phone ? 'border-red-500' : 'border-purple-500/30 focus:border-purple-500'
                    }`}
                    placeholder="10-digit mobile number"
                  />
                  {formErrors.phone && (
                    <p className="text-red-400 text-sm mt-1">{formErrors.phone}</p>
                  )}
                </div>
                
                <div className="md:col-span-2">
                  <label className="block text-gray-300 text-sm font-medium mb-2">
                    Street Address *
                  </label>
                  <input
                    type="text"
                    name="address"
                    value={formData.address}
                    onChange={handleInputChange}
                    className={`w-full bg-black/30 border rounded-lg px-4 py-3 text-white focus:outline-none ${
                      formErrors.address ? 'border-red-500' : 'border-purple-500/30 focus:border-purple-500'
                    }`}
                    placeholder="House number, street name"
                  />
                  {formErrors.address && (
                    <p className="text-red-400 text-sm mt-1">{formErrors.address}</p>
                  )}
                </div>
                
                <div>
                  <label className="block text-gray-300 text-sm font-medium mb-2">
                    City *
                  </label>
                  <input
                    type="text"
                    name="city"
                    value={formData.city}
                    onChange={handleInputChange}
                    className={`w-full bg-black/30 border rounded-lg px-4 py-3 text-white focus:outline-none ${
                      formErrors.city ? 'border-red-500' : 'border-purple-500/30 focus:border-purple-500'
                    }`}
                    placeholder="Your city"
                  />
                  {formErrors.city && (
                    <p className="text-red-400 text-sm mt-1">{formErrors.city}</p>
                  )}
                </div>
                
                <div>
                  <label className="block text-gray-300 text-sm font-medium mb-2">
                    State *
                  </label>
                  <input
                    type="text"
                    name="state"
                    value={formData.state}
                    onChange={handleInputChange}
                    className={`w-full bg-black/30 border rounded-lg px-4 py-3 text-white focus:outline-none ${
                      formErrors.state ? 'border-red-500' : 'border-purple-500/30 focus:border-purple-500'
                    }`}
                    placeholder="Your state"
                  />
                  {formErrors.state && (
                    <p className="text-red-400 text-sm mt-1">{formErrors.state}</p>
                  )}
                </div>
                
                <div>
                  <label className="block text-gray-300 text-sm font-medium mb-2">
                    ZIP Code *
                  </label>
                  <input
                    type="text"
                    name="zipCode"
                    value={formData.zipCode}
                    onChange={handleInputChange}
                    className={`w-full bg-black/30 border rounded-lg px-4 py-3 text-white focus:outline-none ${
                      formErrors.zipCode ? 'border-red-500' : 'border-purple-500/30 focus:border-purple-500'
                    }`}
                    placeholder="6-digit pincode"
                  />
                  {formErrors.zipCode && (
                    <p className="text-red-400 text-sm mt-1">{formErrors.zipCode}</p>
                  )}
                </div>
                
                <div>
                  <label className="block text-gray-300 text-sm font-medium mb-2">
                    Country
                  </label>
                  <input
                    type="text"
                    name="country"
                    value={formData.country}
                    onChange={handleInputChange}
                    className="w-full bg-black/30 border border-purple-500/30 rounded-lg px-4 py-3 text-white focus:border-purple-500 focus:outline-none"
                    disabled
                  />
                </div>
              </div>
            </div>

            {/* Shipping Method */}
            <div className="bg-black/40 backdrop-blur-lg rounded-2xl border border-purple-500/30 shadow-2xl overflow-hidden">
              <div className="bg-gradient-to-r from-purple-600 to-blue-600 p-6">
                <h2 className="text-xl font-bold text-white">Shipping Method</h2>
              </div>
              
              <div className="p-6 space-y-4">
                <label className="flex items-center space-x-3 cursor-pointer p-4 rounded-lg border border-purple-500/30 hover:border-purple-500/50 transition">
                  <input
                    type="radio"
                    name="shippingMethod"
                    value="standard"
                    checked={formData.shippingMethod === 'standard'}
                    onChange={handleInputChange}
                    className="text-purple-600 focus:ring-purple-500"
                  />
                  <div className="flex-1">
                    <span className="text-white font-medium">Standard Shipping</span>
                    <p className="text-gray-400 text-sm">5-7 business days - $5.00</p>
                  </div>
                  <span className="text-purple-400 font-semibold">$5.00</span>
                </label>
                
                <label className="flex items-center space-x-3 cursor-pointer p-4 rounded-lg border border-purple-500/30 hover:border-purple-500/50 transition">
                  <input
                    type="radio"
                    name="shippingMethod"
                    value="express"
                    checked={formData.shippingMethod === 'express'}
                    onChange={handleInputChange}
                    className="text-purple-600 focus:ring-purple-500"
                  />
                  <div className="flex-1">
                    <span className="text-white font-medium">Express Shipping</span>
                    <p className="text-gray-400 text-sm">2-3 business days - $10.00</p>
                  </div>
                  <span className="text-purple-400 font-semibold">$10.00</span>
                </label>
              </div>
            </div>
          </div>

          {/* Right Column - Order Summary */}
          <div className="lg:col-span-1">
            <div className="bg-black/40 backdrop-blur-lg rounded-2xl border border-purple-500/30 shadow-2xl overflow-hidden sticky top-4">
              <div className="bg-gradient-to-r from-purple-600 to-blue-600 p-4">
                <h2 className="text-xl font-bold text-white">Order Summary</h2>
              </div>

              <div className="p-6">
                {/* Cart Items */}
                <div className="space-y-4 mb-6">
                  <h3 className="text-lg font-medium text-white mb-3">Items in Cart</h3>
                  {cartItems.length === 0 ? (
                    <p className="text-gray-400 text-center py-4">Your cart is empty</p>
                  ) : (
                    cartItems.map((item, index) => {
                      const productName = item.name || item.product?.name || 'Unknown Product';
                      const productPrice = item.price || item.product?.price || 0;
                      const quantity = item.quantity || 1;

                      return (
                        <div key={item._id || index} className="flex justify-between items-center text-sm">
                          <div className="flex-1">
                            <p className="text-white truncate">{productName}</p>
                            <p className="text-gray-400">
                              ${productPrice.toFixed(2)} × {quantity}
                            </p>
                          </div>
                          <p className="text-purple-400 font-semibold">
                            ${(productPrice * quantity).toFixed(2)}
                          </p>
                        </div>
                      );
                    })
                  )}
                </div>

                {/* Price Breakdown */}
                <div className="border-t border-purple-500/30 pt-4 space-y-2">
                  <div className="flex justify-between text-gray-300">
                    <span>Subtotal</span>
                    <span>${calculateSubtotal().toFixed(2)}</span>
                  </div>
                  
                  <div className="flex justify-between text-gray-300">
                    <span>Tax (10%)</span>
                    <span>${calculateTax().toFixed(2)}</span>
                  </div>
                  
                  <div className="flex justify-between text-gray-300">
                    <span>Shipping</span>
                    <span>${calculateShipping().toFixed(2)}</span>
                  </div>

                  <div className="border-t border-purple-500/30 pt-2">
                    <div className="flex justify-between items-center text-xl font-bold">
                      <span className="text-white">Total</span>
                      <span className="text-purple-400">${calculateTotal().toFixed(2)}</span>
                    </div>
                  </div>
                </div>

                {/* Pay Button */}
                <button
                  onClick={handleCheckout}
                  disabled={checkoutLoading || cartItems.length === 0}
                  className="w-full mt-6 bg-gradient-to-r from-purple-600 to-blue-600 text-white font-bold py-4 rounded-xl hover:from-purple-700 hover:to-blue-700 transition-all transform hover:scale-105 disabled:opacity-50 disabled:cursor-not-allowed disabled:transform-none flex items-center justify-center gap-2 shadow-lg"
                >
                  {checkoutLoading ? (
                    <>
                      <Loader2 className="w-5 h-5 animate-spin" />
                      Processing...
                    </>
                  ) : (
                    <>
                      <CreditCard className="w-5 h-5" />
                      Proceed to Payment
                    </>
                  )}
                </button>

                {/* Security Info */}
                <div className="bg-blue-500/10 border border-blue-500/30 rounded-lg p-4 mt-4">
                  <p className="text-blue-400 text-sm flex items-center gap-2">
                    <AlertCircle className="w-4 h-4 flex-shrink-0" />
                    <span>🔒 Secure payment powered by Stripe</span>
                  </p>
                </div>

                <div className="text-center text-gray-400 text-xs mt-4">
                  <p>By proceeding, you agree to our</p>
                  <p className="text-purple-400">Terms of Service & Privacy Policy</p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Add Address Modal */}
      {showAddressModal && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center p-4 z-50">
          <div className="bg-gray-900 rounded-2xl border border-purple-500/30 max-w-md w-full p-6">
            <h3 className="text-xl font-bold text-white mb-4">Add New Address</h3>
            <form onSubmit={handleAddAddress} className="space-y-4">
              <input
                type="text"
                name="street"
                value={newAddress.street}
                onChange={handleNewAddressInput}
                className="w-full bg-black/30 border border-purple-500/30 rounded-lg px-4 py-3 text-white focus:border-purple-500 focus:outline-none"
                placeholder="Street Address"
                required
              />
              <div className="grid grid-cols-2 gap-4">
                <input
                  type="text"
                  name="city"
                  value={newAddress.city}
                  onChange={handleNewAddressInput}
                  className="w-full bg-black/30 border border-purple-500/30 rounded-lg px-4 py-3 text-white focus:border-purple-500 focus:outline-none"
                  placeholder="City"
                  required
                />
                <input
                  type="text"
                  name="state"
                  value={newAddress.state}
                  onChange={handleNewAddressInput}
                  className="w-full bg-black/30 border border-purple-500/30 rounded-lg px-4 py-3 text-white focus:border-purple-500 focus:outline-none"
                  placeholder="State"
                  required
                />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <input
                  type="text"
                  name="zipCode"
                  value={newAddress.zipCode}
                  onChange={handleNewAddressInput}
                  className="w-full bg-black/30 border border-purple-500/30 rounded-lg px-4 py-3 text-white focus:border-purple-500 focus:outline-none"
                  placeholder="ZIP Code"
                  required
                />
                <input
                  type="tel"
                  name="phone"
                  value={newAddress.phone}
                  onChange={handleNewAddressInput}
                  className="w-full bg-black/30 border border-purple-500/30 rounded-lg px-4 py-3 text-white focus:border-purple-500 focus:outline-none"
                  placeholder="Phone"
                  required
                />
              </div>
              <label className="flex items-center text-gray-300">
                <input
                  type="checkbox"
                  name="isDefault"
                  checked={newAddress.isDefault}
                  onChange={handleNewAddressInput}
                  className="mr-2 text-purple-600"
                />
                Set as default address
              </label>
              <div className="flex gap-3 pt-4">
                <button
                  type="submit"
                  className="flex-1 btn btn-primary"
                >
                  Save Address
                </button>
                <button
                  type="button"
                  onClick={() => setShowAddressModal(false)}
                  className="flex-1 btn btn-outline"
                >
                  Cancel
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}