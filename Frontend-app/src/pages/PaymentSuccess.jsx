import { useState, useEffect } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { CheckCircle, Package, ArrowRight, Loader2, XCircle, Home, MapPin } from 'lucide-react';
import toast from 'react-hot-toast';

const API_URL = import.meta.env.VITE_API_URL || 'https://anime-api-backend-u42d.onrender.com/api';

export default function PaymentSuccess() {
  const [order, setOrder] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();

  useEffect(() => {
    verifyPayment();
  }, []);

  const verifyPayment = async () => {
    try {
      const sessionId = searchParams.get('session_id');

      if (!sessionId) {
        setError('Invalid payment session');
        setLoading(false);
        return;
      }

      console.log('🔍 Verifying payment for session:', sessionId);

      const token = localStorage.getItem('token');
      const response = await fetch(`${API_URL}/payment/verify/${sessionId}`, {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || 'Payment verification failed');
      }

      const data = await response.json();

      if (data.success && data.order) {
        setOrder(data.order);
        toast.success('Payment successful! Order confirmed!');
      } else {
        setError(data.message || 'Payment verification failed');
      }
    } catch (err) {
      console.error('Payment verification error:', err);
      setError(err.message || 'Failed to verify payment');
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-purple-900 via-blue-900 to-black flex items-center justify-center px-4">
        <div className="text-center">
          <Loader2 className="w-16 h-16 text-purple-400 animate-spin mx-auto mb-4" />
          <p className="text-white text-xl">Verifying your payment...</p>
          <p className="text-gray-400 text-sm mt-2">Please don't close this window</p>
        </div>
      </div>
    );
  }

  if (error || !order) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-purple-900 via-blue-900 to-black flex items-center justify-center p-4">
        <div className="bg-black/40 backdrop-blur-lg rounded-2xl border border-red-500/30 p-6 max-w-md w-full text-center">
          <XCircle className="w-16 h-16 text-red-400 mx-auto mb-4" />
          <h1 className="text-2xl font-bold text-white mb-4">Payment Verification Failed</h1>
          <p className="text-gray-400 mb-6 text-sm">
            {error || 'Unable to retrieve order details. Please check your orders page.'}
          </p>
          <div className="flex gap-3 flex-col">
            <button
              onClick={() => navigate('/orders')}
              className="px-6 py-3 bg-purple-600 text-white rounded-lg hover:bg-purple-700 transition text-sm"
            >
              Check Orders
            </button>
            <button
              onClick={() => navigate('/')}
              className="px-6 py-3 bg-black/50 border border-purple-500/30 text-purple-400 rounded-lg hover:bg-black/70 transition text-sm"
            >
              Go Home
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-purple-900 via-blue-900 to-black py-4 px-3">
      <div className="max-w-4xl mx-auto">
        {/* Success Header */}
        <div className="text-center mb-6">
          <div className="inline-flex items-center justify-center w-20 h-20 bg-green-500/20 border-4 border-green-500 rounded-full mb-4">
            <CheckCircle className="w-12 h-12 text-green-400" />
          </div>
          <h1 className="text-2xl md:text-4xl font-bold text-white mb-2">
            Payment Successful!
          </h1>
          <p className="text-gray-400 text-base md:text-lg">
            Thank you for your purchase! 🎉
          </p>
        </div>

        <div className="grid lg:grid-cols-3 gap-4 md:gap-6">
          {/* Order Details */}
          <div className="lg:col-span-2 space-y-4 md:space-y-6">
            <div className="bg-black/40 backdrop-blur-lg rounded-xl md:rounded-2xl border border-purple-500/30 p-4 md:p-6">
              <div className="flex items-center gap-2 mb-4">
                <Package className="w-5 h-5 md:w-6 md:h-6 text-purple-400" />
                <h2 className="text-lg md:text-xl font-semibold text-white">Order Details</h2>
              </div>
              
              {/* Order Info */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 md:gap-4 mb-4 md:mb-6">
                <div>
                  <p className="text-gray-400 text-xs md:text-sm">Order ID</p>
                  <p className="text-white font-mono text-sm md:text-base">#{order._id?.slice(-8).toUpperCase()}</p>
                </div>
                <div>
                  <p className="text-gray-400 text-xs md:text-sm">Order Date</p>
                  <p className="text-white text-sm md:text-base">
                    {new Date(order.createdAt).toLocaleDateString('en-US', {
                      year: 'numeric',
                      month: 'long',
                      day: 'numeric'
                    })}
                  </p>
                </div>
                <div>
                  <p className="text-gray-400 text-xs md:text-sm">Status</p>
                  <p className="text-yellow-400 font-semibold text-sm md:text-base capitalize">
                    {order.orderStatus}
                  </p>
                </div>
                <div>
                  <p className="text-gray-400 text-xs md:text-sm">Payment</p>
                  <p className="text-green-400 font-semibold text-sm md:text-base capitalize">
                    {order.isPaid ? 'Paid' : 'Pending'}
                  </p>
                </div>
              </div>

              {/* Order Items */}
              <div className="mb-4 md:mb-6">
                <h3 className="text-base md:text-lg font-semibold text-white mb-3">Items Ordered</h3>
                <div className="space-y-2 max-h-60 overflow-y-auto">
                  {order.orderItems?.map((item, index) => (
                    <div key={index} className="flex items-center gap-3 bg-black/30 p-3 rounded-lg border border-purple-500/20">
                      <img 
                        src={item.image || 'https://via.placeholder.com/60'} 
                        alt={item.name}
                        className="w-12 h-12 md:w-16 md:h-16 object-cover rounded"
                        onError={(e) => {
                          e.target.src = 'https://via.placeholder.com/60';
                        }}
                      />
                      <div className="flex-1 min-w-0">
                        <p className="text-white font-medium text-sm md:text-base truncate">{item.name}</p>
                        <p className="text-gray-400 text-xs md:text-sm">
                          ${item.price?.toFixed(2)} × {item.quantity}
                        </p>
                      </div>
                      <p className="text-purple-400 font-bold text-base md:text-lg">
                        ${((item.price || 0) * (item.quantity || 1)).toFixed(2)}
                      </p>
                    </div>
                  ))}
                </div>
              </div>

              {/* Price Breakdown */}
              <div className="border-t border-purple-500/30 pt-3 md:pt-4 space-y-1 md:space-y-2">
                <div className="flex justify-between text-gray-300 text-sm md:text-base">
                  <span>Items Total</span>
                  <span>${order.itemsPrice?.toFixed(2)}</span>
                </div>
                <div className="flex justify-between text-gray-300 text-sm md:text-base">
                  <span>Shipping</span>
                  <span>${order.shippingPrice?.toFixed(2)}</span>
                </div>
                <div className="flex justify-between text-gray-300 text-sm md:text-base">
                  <span>Tax</span>
                  <span>${order.taxPrice?.toFixed(2)}</span>
                </div>
                <div className="border-t border-purple-500/30 pt-2 md:pt-3">
                  <div className="flex justify-between items-center text-lg md:text-xl font-bold">
                    <span className="text-white">Total Amount</span>
                    <span className="text-purple-400 text-xl md:text-2xl">
                      ${order.totalPrice?.toFixed(2)}
                    </span>
                  </div>
                </div>
              </div>
            </div>

            {/* Shipping Address */}
            {order.shippingAddress && (
              <div className="bg-black/40 backdrop-blur-lg rounded-xl md:rounded-2xl border border-purple-500/30 p-4 md:p-6">
                <div className="flex items-center gap-2 mb-3">
                  <MapPin className="w-5 h-5 md:w-6 md:h-6 text-purple-400" />
                  <h3 className="text-base md:text-lg font-semibold text-white">Shipping Address</h3>
                </div>
                <div className="text-gray-300 space-y-1 text-sm md:text-base">
                  <p>{order.shippingAddress.street}</p>
                  <p>
                    {order.shippingAddress.city}, {order.shippingAddress.state} {order.shippingAddress.zipCode}
                  </p>
                  <p>{order.shippingAddress.country}</p>
                  {order.shippingAddress.phone && (
                    <p className="mt-2">📞 {order.shippingAddress.phone}</p>
                  )}
                </div>
              </div>
            )}
          </div>

          {/* Sidebar - Actions & Info */}
          <div className="lg:col-span-1">
            <div className="bg-black/40 backdrop-blur-lg rounded-xl md:rounded-2xl border border-purple-500/30 p-4 md:p-6">
              {/* Confirmation Message */}
              <div className="bg-blue-500/10 border border-blue-500/30 rounded-lg p-3 mb-4">
                <p className="text-blue-400 text-xs md:text-sm">
                  📧 A confirmation email has been sent to your registered email address.
                </p>
              </div>

              {/* Next Steps */}
              <div className="mb-4">
                <h4 className="text-white font-semibold mb-2 text-sm md:text-base">What's Next?</h4>
                <ul className="text-gray-400 text-xs md:text-sm space-y-1">
                  <li>• Order confirmation email sent</li>
                  <li>• Order processing started</li>
                  <li>• Shipping notification in 1-2 days</li>
                  <li>• Expected delivery: 3-5 business days</li>
                </ul>
              </div>

              {/* Action Buttons */}
              <div className="space-y-2">
                <button
                  onClick={() => navigate('/orders')}
                  className="w-full flex items-center justify-center gap-2 px-3 py-2 md:px-4 md:py-3 bg-gradient-to-r from-purple-600 to-blue-600 text-white font-semibold rounded-lg hover:from-purple-700 hover:to-blue-700 transition text-sm md:text-base"
                >
                  <Package className="w-4 h-4 md:w-5 md:h-5" />
                  View My Orders
                </button>
                <button
                  onClick={() => navigate('/products')}
                  className="w-full flex items-center justify-center gap-2 px-3 py-2 md:px-4 md:py-3 bg-black/50 border border-purple-500/30 text-purple-400 font-semibold rounded-lg hover:bg-black/70 transition text-sm md:text-base"
                >
                  Continue Shopping
                  <ArrowRight className="w-4 h-4 md:w-5 md:h-5" />
                </button>
                <button
                  onClick={() => navigate('/')}
                  className="w-full flex items-center justify-center gap-2 px-3 py-2 md:px-4 md:py-3 text-gray-400 hover:text-purple-400 transition text-sm md:text-base"
                >
                  <Home className="w-4 h-4" />
                  Back to Homepage
                </button>
              </div>

              {/* Support Info */}
              <div className="mt-4 pt-3 border-t border-purple-500/30">
                <p className="text-gray-500 text-xs text-center">
                  Need help? Contact our support team
                </p>
                <p className="text-purple-400 text-xs text-center font-medium">
                  support@animestore.com
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}