import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { Eye } from 'lucide-react';
import { orderAPI } from '../../services/api';
import Loading from '../../components/common/Loading';
import toast from 'react-hot-toast';

const OrderManagement = () => {
  const [orders, setOrders] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filterStatus, setFilterStatus] = useState('all');

  useEffect(() => {
    fetchOrders();
  }, []);

  const fetchOrders = async () => {
    try {
      console.log('🔄 Fetching orders from admin API...');
      const response = await orderAPI.getAllOrders();
      console.log('📦 Orders data received:', response.data.orders);
      
      // Log first order's product data for debugging
      if (response.data.orders.length > 0) {
        const firstOrder = response.data.orders[0];
        console.log('🔍 First order product data:', {
          orderId: firstOrder._id,
          orderItems: firstOrder.orderItems?.map(item => ({
            name: item.name,
            image: item.image,
            product: item.product,
            hasImages: item.product?.images?.[0]
          }))
        });
      }
      
      setOrders(response.data.orders);
    } catch (error) {
      console.error('❌ Error fetching orders:', error);
      toast.error('Failed to fetch orders');
    } finally {
      setLoading(false);
    }
  };

  const handleStatusUpdate = async (orderId, newStatus) => {
    try {
      await orderAPI.updateOrderStatus(orderId, { orderStatus: newStatus });
      toast.success('Order status updated');
      fetchOrders();
    } catch (error) {
      toast.error('Failed to update status');
    }
  };

  const getStatusColor = (status) => {
    const colors = {
      pending: 'bg-yellow-100 text-yellow-800 border-yellow-200',
      processing: 'bg-blue-100 text-blue-800 border-blue-200',
      shipped: 'bg-purple-100 text-purple-800 border-purple-200',
      delivered: 'bg-green-100 text-green-800 border-green-200',
      cancelled: 'bg-red-100 text-red-800 border-red-200'
    };
    return colors[status] || 'bg-gray-100 text-gray-800 border-gray-200';
  };

  const formatDate = (date) => {
    return new Date(date).toLocaleDateString('en-IN', {
      year: 'numeric',
      month: 'short',
      day: 'numeric'
    });
  };

  // Improved product image handling with multiple fallbacks
  const getProductImage = (item) => {
    // Try multiple possible image sources in priority order
    if (item.product?.images?.[0]) {
      return item.product.images[0];
    }
    if (item.image && item.image !== '' && item.image !== 'undefined') {
      return item.image;
    }
    if (item.images?.[0]) {
      return item.images[0];
    }
    // Fallback placeholder
    return 'https://via.placeholder.com/80x80?text=No+Image';
  };

  // Clean product name formatting
  const formatProductName = (name) => {
    if (!name) return 'Unknown Product';
    const words = name.split(' ').filter(word => word.trim() !== '');
    const uniqueWords = [...new Set(words)];
    return uniqueWords.map(word => 
      word.charAt(0).toUpperCase() + word.slice(1).toLowerCase()
    ).join(' ');
  };

  const filteredOrders = filterStatus === 'all' 
    ? orders 
    : orders.filter(order => order.orderStatus === filterStatus);

  if (loading) return <Loading fullScreen />;

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-white shadow">
        <div className="container-custom py-6">
          <h1 className="text-3xl font-display font-bold">Order Management</h1>
          <p className="text-gray-600 mt-2">Manage and track all customer orders</p>
        </div>
      </div>

      <div className="container-custom py-8">
        {/* Filter Tabs */}
        <div className="card mb-6">
          <div className="flex gap-2 overflow-x-auto pb-2">
            {['all', 'pending', 'processing', 'shipped', 'delivered', 'cancelled'].map((status) => (
              <button
                key={status}
                onClick={() => setFilterStatus(status)}
                className={`px-4 py-2 rounded-lg font-medium capitalize whitespace-nowrap transition-colors ${
                  filterStatus === status
                    ? 'bg-primary-600 text-white'
                    : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                }`}
              >
                {status}
              </button>
            ))}
          </div>
        </div>

        {/* Orders Table - IMPROVED PRODUCT DISPLAY */}
        <div className="card overflow-x-auto">
          <table className="w-full min-w-[1000px]">
            <thead className="bg-gray-50 border-b">
              <tr>
                <th className="px-4 py-4 text-left text-sm font-semibold text-gray-900 w-[120px]">Order ID</th>
                <th className="px-4 py-4 text-left text-sm font-semibold text-gray-900 w-[180px]">Customer</th>
                <th className="px-4 py-4 text-left text-sm font-semibold text-gray-900 w-[110px]">Date</th>
                <th className="px-4 py-4 text-left text-sm font-semibold text-gray-900 w-[300px]">Products</th>
                <th className="px-4 py-4 text-left text-sm font-semibold text-gray-900 w-[120px]">Amount</th>
                <th className="px-4 py-4 text-left text-sm font-semibold text-gray-900 w-[150px]">Status</th>
                <th className="px-4 py-4 text-right text-sm font-semibold text-gray-900 w-[80px]">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200">
              {filteredOrders.map((order) => (
                <tr key={order._id} className="hover:bg-gray-50 transition-colors">
                  {/* Order ID */}
                  <td className="px-4 py-4 whitespace-nowrap">
                    <span className="font-mono text-sm text-gray-900 font-medium">
                      #{order._id?.slice(-8) || 'N/A'}
                    </span>
                  </td>
                  
                  {/* Customer Info */}
                  <td className="px-4 py-4">
                    <div className="space-y-1">
                      <div className="font-medium text-gray-900 truncate">
                        {order.user?.name || 'Unknown Customer'}
                      </div>
                      <div className="text-sm text-gray-600 truncate">
                        {order.user?.email || 'No email'}
                      </div>
                    </div>
                  </td>
                  
                  {/* Date */}
                  <td className="px-4 py-4 whitespace-nowrap">
                    <div className="text-sm text-gray-900">
                      {formatDate(order.createdAt)}
                    </div>
                  </td>
                  
                  {/* Products - IMPROVED WITH BETTER IMAGE HANDLING */}
                  <td className="px-4 py-4">
                    <div className="space-y-3">
                      {order.orderItems?.slice(0, 2).map((item, index) => (
                        <div key={index} className="flex items-center gap-3">
                          {/* Product Image with error handling */}
                          <div className="flex-shrink-0">
                            <img
                              src={getProductImage(item)}
                              alt={item.name}
                              className="w-10 h-10 rounded-lg border border-gray-200 object-cover"
                              onError={(e) => {
                                e.target.src = 'https://via.placeholder.com/80x80?text=No+Image';
                                console.log('🖼️ Image failed to load for:', item.name);
                              }}
                            />
                          </div>
                          
                          {/* Product Details */}
                          <div className="flex-1 min-w-0">
                            <div className="text-sm font-medium text-gray-900 truncate">
                              {formatProductName(item.name)}
                            </div>
                            <div className="text-xs text-gray-500 flex gap-2">
                              <span>Qty: {item.quantity}</span>
                              <span>×</span>
                              <span>₹{item.price?.toFixed(2)}</span>
                            </div>
                            {item.size && (
                              <div className="text-xs text-gray-500">
                                Size: {item.size}
                              </div>
                            )}
                          </div>
                        </div>
                      ))}
                      
                      {/* Show remaining products count */}
                      {order.orderItems?.length > 2 && (
                        <div className="text-xs text-gray-600 bg-gray-100 px-3 py-2 rounded-lg text-center border">
                          + {order.orderItems.length - 2} more products
                        </div>
                      )}
                      
                      {/* Show if no products */}
                      {(!order.orderItems || order.orderItems.length === 0) && (
                        <div className="text-sm text-gray-500 italic bg-gray-50 px-3 py-2 rounded-lg text-center">
                          No products in this order
                        </div>
                      )}
                    </div>
                  </td>
                  
                  {/* Total Amount */}
                  <td className="px-4 py-4 whitespace-nowrap">
                    <div className="space-y-1">
                      <div className="font-semibold text-gray-900">
                        ₹{(order.totalPrice || 0).toFixed(2)}
                      </div>
                      <div className={`text-xs font-medium px-2 py-1 rounded-full ${
                        order.isPaid 
                          ? 'bg-green-100 text-green-800' 
                          : 'bg-orange-100 text-orange-800'
                      }`}>
                        {order.isPaid ? 'Paid' : 'Unpaid'}
                      </div>
                    </div>
                  </td>
                  
                  {/* Status Dropdown */}
                  <td className="px-4 py-4 whitespace-nowrap">
                    <select
                      value={order.orderStatus || 'pending'}
                      onChange={(e) => handleStatusUpdate(order._id, e.target.value)}
                      className={`w-full px-3 py-2 text-sm font-medium rounded-lg border focus:ring-2 focus:ring-primary-500 cursor-pointer transition-colors ${
                        getStatusColor(order.orderStatus)
                      }`}
                    >
                      <option value="pending">Pending</option>
                      <option value="processing">Processing</option>
                      <option value="shipped">Shipped</option>
                      <option value="delivered">Delivered</option>
                      <option value="cancelled">Cancelled</option>
                    </select>
                  </td>
                  
                  {/* Actions - FIXED: Changed to admin order detail route */}
                  <td className="px-4 py-4 text-right whitespace-nowrap">
                    <Link
                      to={`/admin/orders/${order._id}`}
                      className="inline-flex items-center justify-center w-10 h-10 text-gray-600 hover:text-primary-600 hover:bg-primary-50 rounded-lg transition-colors"
                      title="View Order Details"
                    >
                      <Eye size={20} />
                    </Link>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>

          {filteredOrders.length === 0 && (
            <div className="text-center py-12 text-gray-600">
              <div className="text-lg font-medium mb-2">No orders found</div>
              <div className="text-sm text-gray-500">
                {filterStatus === 'all' 
                  ? 'No orders in the system yet.' 
                  : `No orders with status "${filterStatus}".`}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default OrderManagement;