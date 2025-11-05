import { useState, useEffect } from 'react';
import { Trash2, Shield, User } from 'lucide-react';
import { adminAPI } from '../../services/api';
import Loading from '../../components/common/Loading';
import toast from 'react-hot-toast';

const UserManagement = () => {
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filterRole, setFilterRole] = useState('all');

  useEffect(() => {
    fetchUsers();
  }, []);

  const fetchUsers = async () => {
    try {
      const response = await adminAPI.getAllUsers();
      setUsers(response.data.users);
    } catch (error) {
      console.error('Error fetching users:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleRoleUpdate = async (userId, newRole) => {
    if (!window.confirm(`Change user role to ${newRole}?`)) return;

    try {
      await adminAPI.updateUserRole(userId, { role: newRole });
      toast.success('User role updated successfully');
      fetchUsers();
    } catch (error) {
      toast.error('Failed to update role');
    }
  };

  const handleDeleteUser = async (userId) => {
    if (!window.confirm('Are you sure you want to delete this user?')) return;

    try {
      await adminAPI.deleteUser(userId);
      toast.success('User deleted successfully');
      fetchUsers();
    } catch (error) {
      toast.error(error.response?.data?.message || 'Failed to delete user');
    }
  };

  const formatDate = (date) => {
    return new Date(date).toLocaleDateString('en-IN', {
      year: 'numeric',
      month: 'short',
      day: 'numeric'
    });
  };

  const filteredUsers = filterRole === 'all' 
    ? users 
    : users.filter(user => user.role === filterRole);

  if (loading) return <Loading fullScreen />;

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-white shadow">
        <div className="container-custom py-6">
          <h1 className="text-3xl font-display font-bold">User Management</h1>
          <p className="text-gray-600 mt-2">Manage user accounts and permissions</p>
        </div>
      </div>

      <div className="container-custom py-8">
        {/* Stats Cards */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
          <div className="card">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-gray-600 text-sm mb-1">Total Users</p>
                <p className="text-3xl font-bold">{users.length}</p>
              </div>
              <User className="text-blue-500" size={40} />
            </div>
          </div>

          <div className="card">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-gray-600 text-sm mb-1">Customers</p>
                <p className="text-3xl font-bold">
                  {users.filter(u => u.role === 'customer').length}
                </p>
              </div>
              <User className="text-green-500" size={40} />
            </div>
          </div>

          <div className="card">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-gray-600 text-sm mb-1">Admins</p>
                <p className="text-3xl font-bold">
                  {users.filter(u => u.role === 'admin').length}
                </p>
              </div>
              <Shield className="text-orange-500" size={40} />
            </div>
          </div>
        </div>

        {/* Filter Tabs */}
        <div className="card mb-6">
          <div className="flex gap-2">
            {['all', 'customer', 'admin'].map((role) => (
              <button
                key={role}
                onClick={() => setFilterRole(role)}
                className={`px-4 py-2 rounded-lg font-medium capitalize ${
                  filterRole === role
                    ? 'bg-primary-600 text-white'
                    : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                }`}
              >
                {role}
              </button>
            ))}
          </div>
        </div>

        {/* Users Table */}
        <div className="card overflow-x-auto">
          <table className="w-full">
            <thead className="bg-gray-50 border-b">
              <tr>
                <th className="px-4 py-3 text-left text-sm font-semibold">User</th>
                <th className="px-4 py-3 text-left text-sm font-semibold">Email</th>
                <th className="px-4 py-3 text-left text-sm font-semibold">Role</th>
                <th className="px-4 py-3 text-left text-sm font-semibold">Joined</th>
                <th className="px-4 py-3 text-right text-sm font-semibold">Actions</th>
              </tr>
            </thead>
            <tbody>
              {filteredUsers.map((user) => (
                <tr key={user._id} className="border-b hover:bg-gray-50">
                  <td className="px-4 py-4">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-full bg-primary-100 flex items-center justify-center">
                        <User size={20} className="text-primary-600" />
                      </div>
                      <div>
                        <div className="font-medium">{user.name}</div>
                        {user.phone && (
                          <div className="text-sm text-gray-600">{user.phone}</div>
                        )}
                      </div>
                    </div>
                  </td>
                  <td className="px-4 py-4 text-sm">{user.email}</td>
                  <td className="px-4 py-4">
                    <select
                      value={user.role}
                      onChange={(e) => handleRoleUpdate(user._id, e.target.value)}
                      className={`badge cursor-pointer ${
                        user.role === 'admin' ? 'badge-warning' : 'badge-info'
                      }`}
                    >
                      <option value="customer">Customer</option>
                      <option value="admin">Admin</option>
                    </select>
                  </td>
                  <td className="px-4 py-4 text-sm">{formatDate(user.createdAt)}</td>
                  <td className="px-4 py-4 text-right">
                    <button
                      onClick={() => handleDeleteUser(user._id)}
                      disabled={user.role === 'admin'}
                      className="text-red-600 hover:text-red-700 disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      <Trash2 size={18} />
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>

          {filteredUsers.length === 0 && (
            <div className="text-center py-12 text-gray-600">
              No users found
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default UserManagement;