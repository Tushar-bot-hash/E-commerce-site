import { Link, useNavigate } from 'react-router-dom';
import { ShoppingCart, User, Menu, X, LogOut, Package, LayoutDashboard } from 'lucide-react';
import { useState } from 'react';
import useAuthStore from '../../store/authStore';
import useCartStore from '../../store/cartStore';

const Navbar = () => {
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const { user, isAuthenticated, logout } = useAuthStore();
  const { cartCount } = useCartStore();
  const navigate = useNavigate();

  const handleLogout = () => {
    logout();
    navigate('/');
  };

  return (
    <nav className="bg-white shadow-md sticky top-0 z-50">
      <div className="container-custom">
        <div className="flex items-center justify-between h-16">
          {/* Logo */}
          <Link to="/" className="flex items-center space-x-2">
            <span className="text-2xl font-display font-bold text-primary-600">
              AnimeStore
            </span>
          </Link>

          {/* Desktop Navigation */}
          <div className="hidden md:flex items-center space-x-8">
            <Link to="/" className="text-gray-700 hover:text-primary-600 transition">
              Home
            </Link>
            <Link to="/products" className="text-gray-700 hover:text-primary-600 transition">
              Products
            </Link>
            <Link to="/products?category=clothing" className="text-gray-700 hover:text-primary-600 transition">
              Clothing
            </Link>
            <Link to="/products?category=figures" className="text-gray-700 hover:text-primary-600 transition">
              Figures
            </Link>
          </div>

          {/* Right Side */}
          <div className="hidden md:flex items-center space-x-4">
            {/* Cart */}
            <Link to="/cart" className="relative p-2 text-gray-700 hover:text-primary-600 transition">
              <ShoppingCart size={24} />
              {cartCount > 0 && (
                <span className="absolute -top-1 -right-1 bg-primary-600 text-white text-xs rounded-full w-5 h-5 flex items-center justify-center">
                  {cartCount}
                </span>
              )}
            </Link>

            {/* User Menu */}
            {isAuthenticated ? (
              <div className="relative group">
                <button className="flex items-center space-x-2 p-2 text-gray-700 hover:text-primary-600 transition">
                  <User size={24} />
                  <span className="font-medium">{user?.name}</span>
                </button>
                
                {/* Dropdown */}
                <div className="absolute right-0 mt-2 w-48 bg-white rounded-lg shadow-lg opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all duration-200">
                  <div className="py-2">
                    <Link to="/profile" className="flex items-center px-4 py-2 text-gray-700 hover:bg-gray-100">
                      <User size={18} className="mr-2" />
                      Profile
                    </Link>
                    <Link to="/orders" className="flex items-center px-4 py-2 text-gray-700 hover:bg-gray-100">
                      <Package size={18} className="mr-2" />
                      Orders
                    </Link>
                    {user?.role === 'admin' && (
                      <Link to="/admin" className="flex items-center px-4 py-2 text-gray-700 hover:bg-gray-100">
                        <LayoutDashboard size={18} className="mr-2" />
                        Admin Panel
                      </Link>
                    )}
                    <button
                      onClick={handleLogout}
                      className="flex items-center w-full px-4 py-2 text-red-600 hover:bg-gray-100"
                    >
                      <LogOut size={18} className="mr-2" />
                      Logout
                    </button>
                  </div>
                </div>
              </div>
            ) : (
              <div className="flex items-center space-x-2">
                <Link to="/login" className="btn btn-outline">
                  Login
                </Link>
                <Link to="/register" className="btn btn-primary">
                  Sign Up
                </Link>
              </div>
            )}
          </div>

          {/* Mobile Menu Button */}
          <button
            onClick={() => setIsMenuOpen(!isMenuOpen)}
            className="md:hidden p-2 text-gray-700"
          >
            {isMenuOpen ? <X size={24} /> : <Menu size={24} />}
          </button>
        </div>

        {/* Mobile Menu */}
        {isMenuOpen && (
          <div className="md:hidden py-4 border-t animate-fade-in">
            <div className="flex flex-col space-y-4">
              <Link to="/" className="text-gray-700 hover:text-primary-600" onClick={() => setIsMenuOpen(false)}>
                Home
              </Link>
              <Link to="/products" className="text-gray-700 hover:text-primary-600" onClick={() => setIsMenuOpen(false)}>
                Products
              </Link>
              <Link to="/cart" className="text-gray-700 hover:text-primary-600" onClick={() => setIsMenuOpen(false)}>
                Cart ({cartCount})
              </Link>
              
              {isAuthenticated ? (
                <>
                  <Link to="/profile" className="text-gray-700 hover:text-primary-600" onClick={() => setIsMenuOpen(false)}>
                    Profile
                  </Link>
                  <Link to="/orders" className="text-gray-700 hover:text-primary-600" onClick={() => setIsMenuOpen(false)}>
                    Orders
                  </Link>
                  {user?.role === 'admin' && (
                    <Link to="/admin" className="text-gray-700 hover:text-primary-600" onClick={() => setIsMenuOpen(false)}>
                      Admin Panel
                    </Link>
                  )}
                  <button onClick={handleLogout} className="text-left text-red-600">
                    Logout
                  </button>
                </>
              ) : (
                <>
                  <Link to="/login" className="text-gray-700 hover:text-primary-600" onClick={() => setIsMenuOpen(false)}>
                    Login
                  </Link>
                  <Link to="/register" className="text-gray-700 hover:text-primary-600" onClick={() => setIsMenuOpen(false)}>
                    Sign Up
                  </Link>
                </>
              )}
            </div>
          </div>
        )}
      </div>
    </nav>
  );
};

export default Navbar;