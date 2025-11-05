import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { Eye, Edit } from 'lucide-react';
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
      const response = await orderAPI.getAllOrders();
      setOrders(response.data.orders);
    } catch (error) {
      console.error('Error fetching orders:', error);
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
      pending: 'badge-warning',
      processing: 'badge-info',
      shipped: 'badge-info',
      delivered: 'badge-success',
      cancelled: 'badge-danger'
    };
    return colors[status] || 'badge-info';
  };

  const formatDate = (date) => {
    return new Date(date).toLocaleDateString('en-IN', {
      year: 'numeric',
      month: 'short',
      day: 'numeric'
    });
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
                className={`px-4 py-2 rounded-lg font-medium capitalize whitespace-nowrap ${
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

        {/* Orders Table */}
        <div className="card overflow-x-auto">
          <table className="w-full">
            <thead className="bg-gray-50 border-b">
              <tr>
                <th className="px-4 py-3 text-left text-sm font-semibold">Order ID</th>
                <th className="px-4 py-3 text-left text-sm font-semibold">Customer</th>
                <th className="px-4 py-3 text-left text-sm font-semibold">Date</th>
                <th className="px-4 py-3 text-left text-sm font-semibold">Items</th>
                <th className="px-4 py-3 text-left text-sm font-semibold">Total</th>
                <th className="px-4 py-3 text-left text-sm font-semibold">Status</th>
                <th className="px-4 py-3 text-right text-sm font-semibold">Actions</th>
              </tr>
            </thead>
            <tbody>
              {filteredOrders.map((order) => (
                <tr key={order._id} className="border-b hover:bg-gray-50">
                  <td className="px-4 py-4">
                    <span className="font-mono text-sm">#{order._id.slice(-8)}</span>
                  </td>
                  <td className="px-4 py-4">
                    <div>
                      <div className="font-medium">{order.user.name}</div>
                      <div className="text-sm text-gray-600">{order.user.email}</div>
                    </div>
                  </td>
                  <td className="px-4 py-4 text-sm">{formatDate(order.createdAt)}</td>
                  <td className="px-4 py-4">
                    <div className="flex -space-x-2">
                      {order.orderItems.slice(0, 3).map((item, index) => (
                        <img
                          key={index}
                          src={item.image}
                          alt={item.name}
                          className="w-8 h-8 rounded-full border-2 border-white object-cover"
                        />
                      ))}
                      {order.orderItems.length > 3 && (
                        <div className="w-8 h-8 rounded-full bg-gray-200 border-2 border-white flex items-center justify-center text-xs">
                          +{order.orderItems.length - 3}
                        </div>
                      )}
                    </div>
                  </td>
                  <td className="px-4 py-4">
                    <div className="font-semibold">₹{order.totalPrice.toFixed(2)}</div>
                    <div className={`text-xs ${order.isPaid ? 'text-green-600' : 'text-orange-600'}`}>
                      {order.isPaid ? 'Paid' : 'Unpaid'}
                    </div>
                  </td>
                  <td className="px-4 py-4">
                    <select
                      value={order.orderStatus}
                      onChange={(e) => handleStatusUpdate(order._id, e.target.value)}
                      className={`badge ${getStatusColor(order.orderStatus)} cursor-pointer`}
                    >
                      <option value="pending">Pending</option>
                      <option value="processing">Processing</option>
                      <option value="shipped">Shipped</option>
                      <option value="delivered">Delivered</option>
                      <option value="cancelled">Cancelled</option>
                    </select>
                  </td>
                  <td className="px-4 py-4 text-right">
                    <Link
                      to={`/orders/${order._id}`}
                      className="text-blue-600 hover:text-blue-700"
                    >
                      <Eye size={18} className="inline" />
                    </Link>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>

          {filteredOrders.length === 0 && (
            <div className="text-center py-12 text-gray-600">
              No orders found
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default OrderManagement;