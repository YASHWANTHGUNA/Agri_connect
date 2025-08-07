// agriconnect2.0/src/components/PrivateRoute.js

import React from 'react';
import { Navigate, useLocation } from 'react-router-dom';
import { useAuth } from '../context/AuthContext'; // Adjust path if AuthContext is elsewhere

const PrivateRoute = ({ children }) => {
  const { user, loading, error, refreshTokens } = useAuth(); // Fixed: using useAuth hook correctly
  const location = useLocation();

  // Show loading state
  if (loading) {
    return (
      <div className="loading-container">
        <div className="loading-spinner"></div>
        <p>Loading...</p>
      </div>
    );
  }

  // Handle network errors
  if (error && error.includes("Network error")) {
    return (
      <div className="error-container">
        <h2>Connection Error</h2>
        <p>Please check your internet connection and try again.</p>
        <button 
          onClick={() => window.location.reload()}
          className="retry-button"
        >
          Retry
        </button>
      </div>
    );
  }

  // Redirect to login if not authenticated
  if (!user) {
    return <Navigate to="/login" state={{ from: location }} replace />;
  }

  // Render children if authenticated
  return children;
};

export default PrivateRoute;