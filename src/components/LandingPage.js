// src/components/LandingPage.js

import React from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import './LandingPage.css'; // Import the dedicated CSS for the landing page

const LandingPage = () => {
  const { user, loading } = useAuth();
  const navigate = useNavigate();

  const handleNavigation = (path) => {
    if (!user && path !== '/login' && path !== '/register') {
      navigate('/login', { state: { from: { pathname: path } } });
    } else {
      navigate(path);
    }
  };

  if (loading) {
    return (
      <div className="loading-container">
        <div className="loading-spinner"></div>
        <p>Loading...</p>
      </div>
    );
  }

  return (
    <div className="landing-page-container">
      <div className="landing-content">
        <h1 className="main-title">SMART AGRICONNECT</h1>
        <p className="tagline">Empowering Farmers with Intelligence and Community</p>
        
        <nav className="landing-nav">
          {!user ? (
            <>
              <Link to="/login" className="nav-box">
                <span className="nav-icon">🔑</span>
                <span className="nav-text">Login</span>
              </Link>
              <Link to="/register" className="nav-box">
                <span className="nav-icon">➕</span>
                <span className="nav-text">Sign Up</span>
              </Link>
            </>
          ) : (
            <>
              <div onClick={() => handleNavigation('/dashboard')} className="nav-box">
                <span className="nav-icon">📊</span>
                <span className="nav-text">Dashboard</span>
              </div>
              <div onClick={() => handleNavigation('/forum')} className="nav-box">
                <span className="nav-icon">💬</span>
                <span className="nav-text">Community Forum</span>
              </div>
              <div onClick={() => handleNavigation('/chatbot')} className="nav-box">
                <span className="nav-icon">🤖</span>
                <span className="nav-text">Agri-Chatbot</span>
              </div>
            </>
          )}
        </nav>
      </div>
    </div>
  );
};

export default LandingPage;