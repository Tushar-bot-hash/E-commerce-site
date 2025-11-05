import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { Users, Package, ShoppingCart, DollarSign, TrendingUp, AlertTriangle } from 'lucide-react';
import { adminAPI } from '../../services/api';
import Loading from '../../components/common/Loading';

const Dashboard = () => {
  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchStats();
  }, []);

  const fetchStats = async () => {
    try {
      const response = await adminAPI.getStats();
      setStats(response.data);
    } catch (error) {
      console.error('Error fetching stats:', error);
    } finally {
      setLoading(false);
    }
  };

  if (loading) return <Loading fullScreen />;

  const statCards = [
    {
      title: 'Total Revenue',
      value: `₹${stats?.stats.totalRevenue.toFixed(2)}`,
      icon: DollarSign,
      color: 'bg-green-500',
      link: '/admin/orders'
    },
    {
      title: 'Total Orders',
      value: stats?.stats.totalOrders,
      icon: ShoppingCart,
      color: 'bg-blue-500',
      link: '/admin/orders'
    },
    {
      title: 'Total Products',
      value: stats?.stats.totalProducts,
      icon: Package,
      color: 'bg-purple-500',
      link: '/admin/products'
    },
    {
      title: 'Total Users',
      value: stats?.stats.totalUsers,
      icon: Users,
      color: 'bg-orange-500',
      link: '/admin/users'
    }
  ];

  const orderStats = [
    { label: 'Pending', value: stats?.stats.pendingOrders, color: 'bg-yellow-500' },
    { label: 'Processing', value: stats?.stats.processingOrders, color: 'bg-blue-500' },
    { label: 'Shipped', value: stats?.stats.shippedOrders, color: 'bg-purple-500' },
    { label: 'Delivered', value: stats?.stats.deliveredOrders, color: 'bg-green-500' }
  ];

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-white shadow">
        <div className="container-custom py-6">
          <h1 className="text-3xl font-display font-bold">Admin Dashboard</h1>
          <p className="text-gray-600 mt-2">Welcome back! Here's what's happening today.</p>
        </div>
      </div>

      <div className="container-custom py-8">
        {/* Stats Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
          {statCards.map((stat, index) => (
            <Link
              key={index}
              to={stat.link}
              className="card hover:shadow-lg transition-all"
            >
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-gray-600 text-sm mb-1">{stat.title}</p>
                  <p className="text-3xl font-bold">{stat.value}</p>
                </div>
                <div className={`${stat.color} p-4 rounded-lg text-white`}>
                  <stat.icon size={32} />
                </div>
              </div>
            </Link>
          ))}
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          {/* Order Status Overview */}
          <div className="card">
            <h2 className="text-xl font-bold mb-6">Order Status</h2>
            <div className="space-y-4">
              {orderStats.map((stat, index) => (
                <div key={index}>
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-gray-700 font-medium">{stat.label}</span>
                    <span className="font-bold">{stat.value}</span>
                  </div>
                  <div className="h-2 bg-gray-200 rounded-full overflow-hidden">
                    <div
                      className={`h-full ${stat.color}`}
                      style={{
                        width: `${(stat.value / stats?.stats.totalOrders) * 100}%`
                      }}
                    />
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Recent Orders */}
          <div className="card">
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-xl font-bold">Recent Orders</h2>
              <Link to="/admin/orders" className="text-primary-600 hover:underline text-sm">
                View All
              </Link>
            </div>
            <div className="space-y-3">
              {stats?.recentOrders.map((order) => (
                <Link
                  key={order._id}
                  to={`/orders/${order._id}`}
                  className="flex items-center justify-between p-3 hover:bg-gray-50 rounded-lg transition"
                >
                  <div>
                    <div className="font-medium">#{order._id.slice(-8)}</div>
                    <div className="text-sm text-gray-600">{order.user.name}</div>
                  </div>
                  <div className="text-right">
                    <div className="font-bold">₹{order.totalPrice.toFixed(2)}</div>
                    <span className={`badge badge-${
                      order.orderStatus === 'delivered' ? 'success' :
                      order.orderStatus === 'cancelled' ? 'danger' : 'warning'
                    } text-xs`}>
                      {order.orderStatus}
                    </span>
                  </div>
                </Link>
              ))}
            </div>
          </div>

          {/* Low Stock Products */}
          <div className="card">
            <div className="flex items-center justify-between mb-6">
              <div className="flex items-center">
                <AlertTriangle className="text-orange-500 mr-2" size={24} />
                <h2 className="text-xl font-bold">Low Stock Alert</h2>
              </div>
              <Link to="/admin/products" className="text-primary-600 hover:underline text-sm">
                Manage
              </Link>
            </div>
            <div className="space-y-3">
              {stats?.lowStockProducts.slice(0, 5).map((product) => (
                <div key={product._id} className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <img
                      src={product.images[0]}
                      alt={product.name}
                      className="w-12 h-12 object-cover rounded"
                    />
                    <div>
                      <div className="font-medium text-sm">{product.name}</div>
                      <div className="text-xs text-gray-600">{product.category}</div>
                    </div>
                  </div>
                  <span className={`badge ${
                    product.stock === 0 ? 'badge-danger' : 'badge-warning'
                  }`}>
                    {product.stock} left
                  </span>
                </div>
              ))}
            </div>
          </div>

          {/* Top Selling Products */}
          <div className="card">
            <div className="flex items-center justify-between mb-6">
              <div className="flex items-center">
                <TrendingUp className="text-green-500 mr-2" size={24} />
                <h2 className="text-xl font-bold">Top Selling</h2>
              </div>
            </div>
            <div className="space-y-3">
              {stats?.topProducts.map((product) => (
                <div key={product._id} className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <img
                      src={product.images[0]}
                      alt={product.name}
                      className="w-12 h-12 object-cover rounded"
                    />
                    <div>
                      <div className="font-medium text-sm">{product.name}</div>
                      <div className="text-xs text-gray-600">₹{product.price}</div>
                    </div>
                  </div>
                  <div className="text-right">
                    <div className="font-bold text-green-600">{product.sold}</div>
                    <div className="text-xs text-gray-600">sold</div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Dashboard;