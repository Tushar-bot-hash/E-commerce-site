import { Navigate } from 'react-router-dom';
import useAuthStore from '../../store/authStore';
import { useEffect, useState } from 'react';

const ProtectedRoute = ({ children }) => {
  const { user, isAuthenticated, isInitialized, getProfile } = useAuthStore();
  const [isChecking, setIsChecking] = useState(true);

  // Debug logging
  console.log("🔐 ProtectedRoute State:", {
    user: user ? `Yes (${user.name})` : 'No',
    isAuthenticated,
    isInitialized,
    hasToken: !!localStorage.getItem('token'),
    path: window.location.pathname
  });

  // Effect to verify authentication on mount
  useEffect(() => {
    const verifyAuth = async () => {
      // If not initialized yet, check with backend
      if (!isInitialized && localStorage.getItem('token')) {
        console.log("🔄 Checking token validity with backend...");
        await getProfile();
      }
      setIsChecking(false);
    };

    verifyAuth();
  }, [isInitialized, getProfile]);

  // Show loading while checking
  if (isChecking || (!isInitialized && localStorage.getItem('token'))) {
    console.log("⏳ ProtectedRoute: Verifying authentication...");
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500 mx-auto mb-4"></div>
          <p className="text-gray-600">Checking your session...</p>
          <p className="text-gray-400 text-sm mt-2">
            Verifying authentication token
          </p>
        </div>
      </div>
    );
  }

  // If no valid authentication, redirect to login
  if (!user && !isAuthenticated) {
    console.log("🔴 ProtectedRoute: Not authenticated, redirecting to login");
    
    // Save current path for redirect after login
    const currentPath = window.location.pathname;
    if (currentPath !== '/login') {
      sessionStorage.setItem('redirectAfterLogin', currentPath);
      console.log(`📝 Saved redirect path: ${currentPath}`);
    }
    
    return <Navigate to="/login" replace />;
  }

  // User is authenticated
  console.log("✅ ProtectedRoute: Access granted");
  return children;
};

export default ProtectedRoute;