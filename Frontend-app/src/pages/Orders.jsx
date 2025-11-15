import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { Package, Clock, CheckCircle, XCircle, Image as ImageIcon, Trash2 } from 'lucide-react';
import Loading from '../components/common/Loading';
import toast from 'react-hot-toast';

const API_URL = import.meta.env.VITE_API_URL || 'https://anime-api-backend-u42d.onrender.com/api';

const Orders = () => {
  const [orders, setOrders] = useState([]);
  const [loading, setLoading] = useState(true);
  const [deletingOrderId, setDeletingOrderId] = useState(null);

  useEffect(() => {
    fetchOrders();
  }, []);

  const fetchOrders = async () => {
    try {
      const token = localStorage.getItem('token');
      if (!token) {
        throw new Error('No authentication token found');
      }

      console.log('🔧 Fetching orders from:', `${API_URL}/orders/myorders`);
      
      const response = await fetch(`${API_URL}/orders/myorders`, {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      });

      console.log('📦 Response status:', response.status);

      if (!response.ok) {
        throw new Error(`Failed to fetch orders: ${response.status}`);
      }

      const data = await response.json();
      console.log('✅ Orders data received:', data);

      // Set orders based on your API response structure
      if (data.orders && Array.isArray(data.orders)) {
        setOrders(data.orders);
      } else if (Array.isArray(data)) {
        setOrders(data);
      } else {
        console.warn('Unexpected API response structure:', data);
        setOrders([]);
      }

    } catch (error) {
      console.error('❌ Error fetching orders:', error);
      toast.error(error.message || 'Failed to load orders');
      setOrders([]);
    } finally {
      setLoading(false);
    }
  };

  const handleDeleteOrder = async (orderId) => {
    if (!window.confirm('Are you sure you want to delete this order? This action cannot be undone.')) {
      return;
    }

    try {
      setDeletingOrderId(orderId);
      const token = localStorage.getItem('token');
      
      console.log('🗑️ Deleting order:', `${API_URL}/orders/${orderId}`);
      
      const response = await fetch(`${API_URL}/orders/${orderId}`, {
        method: 'DELETE',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      });

      console.log('📦 Delete response status:', response.status);

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({ 
          message: `Server error: ${response.status}` 
        }));
        throw new Error(errorData.message || `Failed to delete order: ${response.status}`);
      }

      const data = await response.json();
      console.log('✅ Order deleted successfully:', data);
      
      toast.success('Order deleted successfully');
      
      // Remove the order from the local state
      setOrders(prevOrders => prevOrders.filter(order => order._id !== orderId));
      
    } catch (error) {
      console.error('❌ Error deleting order:', error);
      toast.error(error.message || 'Failed to delete order. Please try again.');
    } finally {
      setDeletingOrderId(null);
    }
  };

  const getStatusIcon = (status) => {
    if (!status) return <Package size={16} className="text-gray-600" />;
    
    switch (status.toLowerCase()) {
      case 'delivered':
        return <CheckCircle size={16} className="text-green-600" />;
      case 'cancelled':
        return <XCircle size={16} className="text-red-600" />;
      case 'processing':
      case 'pending':
        return <Clock size={16} className="text-yellow-600" />;
      default:
        return <Package size={16} className="text-gray-600" />;
    }
  };

  const getStatusColor = (status) => {
    if (!status) return 'text-gray-600 bg-gray-50 border-gray-200';
    
    const statusLower = status.toLowerCase();
    const colors = {
      pending: 'text-yellow-600 bg-yellow-50 border-yellow-200',
      processing: 'text-blue-600 bg-blue-50 border-blue-200',
      shipped: 'text-purple-600 bg-purple-50 border-purple-200',
      delivered: 'text-green-600 bg-green-50 border-green-200',
      cancelled: 'text-red-600 bg-red-50 border-red-200'
    };
    return colors[statusLower] || 'text-gray-600 bg-gray-50 border-gray-200';
  };

  const formatDate = (date) => {
    if (!date) return 'Date not available';
    return new Date(date).toLocaleDateString('en-IN', {
      year: 'numeric',
      month: 'short',
      day: 'numeric'
    });
  };

  // Function to get proper image URL - using reliable Unsplash images
  const getProductImage = (item) => {
    console.log('🖼️ Processing image for item:', item.name, 'Image data:', item.image);
    
    // Check if the current image is a placeholder or broken URL
    const currentImage = item.image;
    const isPlaceholder = currentImage && (
      currentImage.includes('via.placeholder.com') ||
      currentImage.includes('placeholder.com') ||
      currentImage.includes('example.com') ||
      currentImage === '' ||
      currentImage === 'undefined'
    );

    // If it's a placeholder or empty, use our reliable fallback
    if (!currentImage || isPlaceholder) {
      const name = item.name?.toLowerCase() || '';
      let fallbackUrl = '';
      
      if (name.includes('hoodie') || name.includes('sweatshirt') || name.includes('jujutsu')) {
        fallbackUrl = 'https://images.unsplash.com/photo-1556821840-3a63f95609a7?w=200&h=200&fit=crop&auto=format';
      } else if (name.includes('tshirt') || name.includes('shirt')) {
        fallbackUrl = 'https://images.unsplash.com/photo-1521572163474-6864f9cf17ab?w=200&h=200&fit=crop&auto=format';
      } else if (name.includes('poster') || name.includes('print')) {
        fallbackUrl = 'https://images.unsplash.com/photo-1563089145-599997674d42?w=200&h=200&fit=crop&auto=format';
      } else if (name.includes('figure') || name.includes('statue')) {
        fallbackUrl = 'https://images.unsplash.com/photo-1587590227261-2fa20c59f0db?w=200&h=200&fit=crop&auto=format';
      } else {
        fallbackUrl = 'https://images.unsplash.com/photo-1544947950-fa07a98d237f?w=200&h=200&fit=crop&auto=format';
      }
      
      console.log('🔄 Using reliable fallback image:', fallbackUrl);
      return fallbackUrl;
    }
    
    // If we have a valid non-placeholder image, use it
    console.log('✅ Using stored image:', currentImage);
    return currentImage;
  };

  // Handle image loading errors
  const handleImageError = (e, item) => {
    console.log('❌ Image failed to load, switching to fallback for:', item.name);
    
    // Get a reliable fallback image
    const fallbackUrl = getProductImage({ ...item, image: null });
    
    // Replace the broken image with fallback
    e.target.src = fallbackUrl;
    e.target.style.display = 'block';
    
    // Hide the fallback icon
    const fallbackDiv = e.target.nextSibling;
    if (fallbackDiv) {
      fallbackDiv.style.display = 'none';
    }
  };

  // Check if order can be deleted (only cancelled or delivered orders)
  const canDeleteOrder = (order) => {
    return order.orderStatus === 'cancelled' || order.orderStatus === 'delivered';
  };

  if (loading) return <Loading fullScreen />;

  return (
    <div className="bg-gray-50 min-h-screen py-8">
      <div className="container-custom">
        <div className="mb-8">
          <h1 className="text-3xl font-display font-bold mb-2">My Orders</h1>
          <p className="text-gray-600">View and manage your orders</p>
        </div>

        {orders.length === 0 ? (
          <div className="text-center py-12">
            <Package size={64} className="mx-auto text-gray-400 mb-4" />
            <h2 className="text-xl font-semibold mb-2">No orders found</h2>
            <p className="text-gray-600 mb-6">
              {loading ? 'Loading...' : 'You haven\'t placed any orders yet'}
            </p>
            <Link to="/products" className="btn btn-primary">
              Start Shopping
            </Link>
          </div>
        ) : (
          <div className="space-y-6">
            {orders.map((order) => (
              <div key={order._id} className="bg-white rounded-lg shadow-sm border border-gray-200 overflow-hidden">
                {/* Order Header */}
                <div className="border-b border-gray-200 p-6">
                  <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
                    <div>
                      <h3 className="text-lg font-semibold text-gray-900">
                        Order #{order._id ? order._id.slice(-8) : 'N/A'}
                      </h3>
                      <p className="text-sm text-gray-600 mt-1">
                        Placed on {formatDate(order.createdAt)}
                      </p>
                    </div>
                    <div className="flex items-center gap-4">
                      <div className={`inline-flex items-center gap-2 px-3 py-1 rounded-full border text-sm font-medium ${getStatusColor(order.orderStatus)}`}>
                        {getStatusIcon(order.orderStatus)}
                        <span className="capitalize">{order.orderStatus || 'Unknown'}</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <Link
                          to={`/orders/${order._id}`}
                          className="text-primary-600 hover:text-primary-700 font-medium text-sm"
                        >
                          View Details
                        </Link>
                        {canDeleteOrder(order) && (
                          <button
                            onClick={() => handleDeleteOrder(order._id)}
                            disabled={deletingOrderId === order._id}
                            className="text-red-600 hover:text-red-700 font-medium text-sm flex items-center gap-1 disabled:opacity-50 disabled:cursor-not-allowed"
                            title="Delete Order"
                          >
                            <Trash2 size={16} />
                            {deletingOrderId === order._id ? 'Deleting...' : 'Delete'}
                          </button>
                        )}
                      </div>
                    </div>
                  </div>
                </div>

                {/* Order Items */}
                <div className="p-6">
                  <div className="space-y-4">
                    {/* Support both old format (orderItems) and new format (items) */}
                    {(order.orderItems || order.items || []).map((item, index) => (
                      <div key={item._id || index} className="flex items-start gap-4 pb-4 border-b border-gray-100 last:border-0 last:pb-0">
                        {/* Product Image */}
                        <div className="flex-shrink-0">
                          <div className="w-20 h-20 rounded-lg border border-gray-200 overflow-hidden bg-gray-100 flex items-center justify-center">
                            <img
                              src={getProductImage(item)}
                              alt={item.name || 'Product image'}
                              className="w-full h-full object-cover"
                              onError={(e) => handleImageError(e, item)}
                              onLoad={() => console.log('✅ Image loaded successfully for:', item.name)}
                            />
                            <div className="hidden w-full h-full items-center justify-center text-gray-400 bg-gray-200">
                              <ImageIcon size={24} />
                            </div>
                          </div>
                        </div>
                        
                        {/* Product Details */}
                        <div className="flex-1 min-w-0">
                          <h4 className="font-semibold text-gray-900 text-lg mb-1">
                            {item.name || 'Unnamed Item'}
                          </h4>
                          <div className="flex flex-wrap items-center gap-4 text-sm text-gray-600 mb-2">
                            {item.size && (
                              <span className="bg-gray-100 px-2 py-1 rounded">Size: {item.size}</span>
                            )}
                            {item.color && (
                              <span className="bg-gray-100 px-2 py-1 rounded">Color: {item.color}</span>
                            )}
                            <span className="font-medium">Qty: {item.quantity || 1}</span>
                          </div>
                          <div className="text-sm text-gray-600">
                            <span className="font-semibold text-gray-900">
                              ₹{((item.quantity || 1) * (item.price || 0)).toFixed(2)}
                            </span>
                            <span className="mx-2">•</span>
                            <span>₹{(item.price || 0).toFixed(2)} each</span>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>

                  {/* Order Footer */}
                  <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mt-6 pt-6 border-t border-gray-200">
                    <div className="text-sm text-gray-600">
                      <span className="font-semibold text-gray-900">
                        {(order.orderItems?.length || order.items?.length || 0)} 
                      </span> item(s) • Total: {' '}
                      <span className="font-bold text-lg text-gray-900">
                        ₹{((order.totalPrice || order.totalAmount) || 0).toFixed(2)}
                      </span>
                    </div>
                    
                    <div className="flex items-center gap-3">
                      {order.orderStatus === 'delivered' && (
                        <button className="btn btn-outline btn-sm text-primary-600 border-primary-600 hover:bg-primary-600 hover:text-white">
                          Buy Again
                        </button>
                      )}
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

export default Orders;