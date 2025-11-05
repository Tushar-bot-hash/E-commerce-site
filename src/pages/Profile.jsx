import { useState, useEffect } from 'react';
import { User, Mail, Phone, Lock, MapPin } from 'lucide-react';
import useAuthStore from '../store/authStore';
import { authAPI } from '../services/api';
import toast from 'react-hot-toast';

const Profile = () => {
  const { user, updateProfile, getProfile } = useAuthStore();
  const [activeTab, setActiveTab] = useState('profile');
  const [loading, setLoading] = useState(false);

  const [profileData, setProfileData] = useState({
    name: '',
    phone: '',
    avatar: ''
  });

  const [passwordData, setPasswordData] = useState({
    password: '',
    confirmPassword: ''
  });

  const [newAddress, setNewAddress] = useState({
    street: '',
    city: '',
    state: '',
    zipCode: '',
    phone: '',
    isDefault: false
  });

  useEffect(() => {
    if (user) {
      setProfileData({
        name: user.name || '',
        phone: user.phone || '',
        avatar: user.avatar || ''
      });
    }
  }, [user]);

  const handleProfileUpdate = async (e) => {
    e.preventDefault();
    setLoading(true);
    const result = await updateProfile(profileData);
    setLoading(false);
    if (result.success) {
      await getProfile();
    }
  };

  const handlePasswordUpdate = async (e) => {
    e.preventDefault();
    
    if (passwordData.password !== passwordData.confirmPassword) {
      toast.error('Passwords do not match');
      return;
    }

    if (passwordData.password.length < 6) {
      toast.error('Password must be at least 6 characters');
      return;
    }

    setLoading(true);
    const result = await updateProfile({ password: passwordData.password });
    setLoading(false);
    
    if (result.success) {
      setPasswordData({ password: '', confirmPassword: '' });
    }
  };

  const handleAddAddress = async (e) => {
    e.preventDefault();
    setLoading(true);
    try {
      await authAPI.addAddress(newAddress);
      toast.success('Address added successfully');
      await getProfile();
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
    } finally {
      setLoading(false);
    }
  };

  const handleDeleteAddress = async (addressId) => {
    if (!window.confirm('Delete this address?')) return;
    
    try {
      await authAPI.deleteAddress(addressId);
      toast.success('Address deleted');
      await getProfile();
    } catch (error) {
      toast.error('Failed to delete address');
    }
  };

  return (
    <div className="bg-gray-50 min-h-screen py-8">
      <div className="container-custom">
        <h1 className="text-3xl font-display font-bold mb-8">My Profile</h1>

        <div className="grid grid-cols-1 lg:grid-cols-4 gap-8">
          {/* Sidebar */}
          <div className="lg:col-span-1">
            <div className="card">
              <div className="text-center mb-6">
                <div className="w-24 h-24 mx-auto mb-4 rounded-full bg-primary-100 flex items-center justify-center">
                  <User size={48} className="text-primary-600" />
                </div>
                <h3 className="font-bold text-lg">{user?.name}</h3>
                <p className="text-gray-600 text-sm">{user?.email}</p>
              </div>

              <div className="space-y-2">
                <button
                  onClick={() => setActiveTab('profile')}
                  className={`w-full text-left px-4 py-2 rounded-lg transition ${
                    activeTab === 'profile' ? 'bg-primary-50 text-primary-600 font-semibold' : 'hover:bg-gray-100'
                  }`}
                >
                  Profile Information
                </button>
                <button
                  onClick={() => setActiveTab('password')}
                  className={`w-full text-left px-4 py-2 rounded-lg transition ${
                    activeTab === 'password' ? 'bg-primary-50 text-primary-600 font-semibold' : 'hover:bg-gray-100'
                  }`}
                >
                  Change Password
                </button>
                <button
                  onClick={() => setActiveTab('addresses')}
                  className={`w-full text-left px-4 py-2 rounded-lg transition ${
                    activeTab === 'addresses' ? 'bg-primary-50 text-primary-600 font-semibold' : 'hover:bg-gray-100'
                  }`}
                >
                  Addresses
                </button>
              </div>
            </div>
          </div>

          {/* Content */}
          <div className="lg:col-span-3">
            {/* Profile Tab */}
            {activeTab === 'profile' && (
              <div className="card">
                <h2 className="text-xl font-bold mb-6">Profile Information</h2>
                <form onSubmit={handleProfileUpdate} className="space-y-6">
                  <div>
                    <label className="block text-sm font-medium mb-2">Full Name</label>
                    <div className="relative">
                      <User className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={20} />
                      <input
                        type="text"
                        value={profileData.name}
                        onChange={(e) => setProfileData({ ...profileData, name: e.target.value })}
                        className="input pl-10"
                      />
                    </div>
                  </div>

                  <div>
                    <label className="block text-sm font-medium mb-2">Email (Cannot be changed)</label>
                    <div className="relative">
                      <Mail className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={20} />
                      <input
                        type="email"
                        value={user?.email}
                        disabled
                        className="input pl-10 bg-gray-100"
                      />
                    </div>
                  </div>

                  <div>
                    <label className="block text-sm font-medium mb-2">Phone Number</label>
                    <div className="relative">
                      <Phone className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={20} />
                      <input
                        type="tel"
                        value={profileData.phone}
                        onChange={(e) => setProfileData({ ...profileData, phone: e.target.value })}
                        className="input pl-10"
                      />
                    </div>
                  </div>

                  <button type="submit" disabled={loading} className="btn btn-primary">
                    {loading ? 'Updating...' : 'Update Profile'}
                  </button>
                </form>
              </div>
            )}

            {/* Password Tab */}
            {activeTab === 'password' && (
              <div className="card">
                <h2 className="text-xl font-bold mb-6">Change Password</h2>
                <form onSubmit={handlePasswordUpdate} className="space-y-6">
                  <div>
                    <label className="block text-sm font-medium mb-2">New Password</label>
                    <div className="relative">
                      <Lock className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={20} />
                      <input
                        type="password"
                        value={passwordData.password}
                        onChange={(e) => setPasswordData({ ...passwordData, password: e.target.value })}
                        className="input pl-10"
                        placeholder="••••••••"
                      />
                    </div>
                  </div>

                  <div>
                    <label className="block text-sm font-medium mb-2">Confirm New Password</label>
                    <div className="relative">
                      <Lock className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={20} />
                      <input
                        type="password"
                        value={passwordData.confirmPassword}
                        onChange={(e) => setPasswordData({ ...passwordData, confirmPassword: e.target.value })}
                        className="input pl-10"
                        placeholder="••••••••"
                      />
                    </div>
                  </div>

                  <button type="submit" disabled={loading} className="btn btn-primary">
                    {loading ? 'Updating...' : 'Update Password'}
                  </button>
                </form>
              </div>
            )}

            {/* Addresses Tab */}
            {activeTab === 'addresses' && (
              <div className="space-y-6">
                {/* Existing Addresses */}
                <div className="card">
                  <h2 className="text-xl font-bold mb-4">Saved Addresses</h2>
                  {user?.addresses?.length > 0 ? (
                    <div className="space-y-4">
                      {user.addresses.map((address) => (
                        <div key={address._id} className="border rounded-lg p-4">
                          <div className="flex justify-between items-start mb-2">
                            <div className="flex items-center">
                              <MapPin size={20} className="text-gray-600 mr-2" />
                              {address.isDefault && (
                                <span className="badge badge-success text-xs mr-2">Default</span>
                              )}
                            </div>
                            <button
                              onClick={() => handleDeleteAddress(address._id)}
                              className="text-red-600 text-sm hover:underline"
                            >
                              Delete
                            </button>
                          </div>
                          <p className="text-gray-900">{address.street}</p>
                          <p className="text-gray-600 text-sm">
                            {address.city}, {address.state} - {address.zipCode}
                          </p>
                          <p className="text-gray-600 text-sm">Phone: {address.phone}</p>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <p className="text-gray-600">No saved addresses</p>
                  )}
                </div>

                {/* Add New Address */}
                <div className="card">
                  <h2 className="text-xl font-bold mb-4">Add New Address</h2>
                  <form onSubmit={handleAddAddress} className="space-y-4">
                    <input
                      type="text"
                      placeholder="Street Address"
                      value={newAddress.street}
                      onChange={(e) => setNewAddress({ ...newAddress, street: e.target.value })}
                      className="input"
                      required
                    />
                    <div className="grid grid-cols-2 gap-4">
                      <input
                        type="text"
                        placeholder="City"
                        value={newAddress.city}
                        onChange={(e) => setNewAddress({ ...newAddress, city: e.target.value })}
                        className="input"
                        required
                      />
                      <input
                        type="text"
                        placeholder="State"
                        value={newAddress.state}
                        onChange={(e) => setNewAddress({ ...newAddress, state: e.target.value })}
                        className="input"
                        required
                      />
                    </div>
                    <div className="grid grid-cols-2 gap-4">
                      <input
                        type="text"
                        placeholder="ZIP Code"
                        value={newAddress.zipCode}
                        onChange={(e) => setNewAddress({ ...newAddress, zipCode: e.target.value })}
                        className="input"
                        required
                      />
                      <input
                        type="tel"
                        placeholder="Phone"
                        value={newAddress.phone}
                        onChange={(e) => setNewAddress({ ...newAddress, phone: e.target.value })}
                        className="input"
                        required
                      />
                    </div>
                    <label className="flex items-center">
                      <input
                        type="checkbox"
                        checked={newAddress.isDefault}
                        onChange={(e) => setNewAddress({ ...newAddress, isDefault: e.target.checked })}
                        className="mr-2"
                      />
                      Set as default address
                    </label>
                    <button type="submit" disabled={loading} className="btn btn-primary">
                      {loading ? 'Adding...' : 'Add Address'}
                    </button>
                  </form>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default Profile;