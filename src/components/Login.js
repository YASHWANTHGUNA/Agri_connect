// src/components/Login.js
import { signInWithEmailAndPassword } from "firebase/auth";
import { auth } from "../firebase";
import React, { useState, useEffect } from "react";
import { useNavigate, Link, useLocation } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import './Login.css';

export default function Login() {
  const [email, setEmail] = useState("");
  const [pass, setPass] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();
  const location = useLocation();
  const { user, refreshTokens } = useAuth();

  // Redirect if already logged in
  useEffect(() => {
    const checkAuth = async () => {
      if (user) {
        try {
          // Ensure tokens are fresh
          await refreshTokens(user);
          const from = location.state?.from?.pathname || "/dashboard";
          navigate(from, { replace: true });
        } catch (error) {
          console.error("Error refreshing tokens:", error);
          setError("Session expired. Please login again.");
        }
      }
    };
    checkAuth();
  }, [user, navigate, location, refreshTokens]);

  const handleLogin = async (e) => {
    e.preventDefault();
    setError("");

    if (!email || !pass) {
      setError("Email and password are required.");
      return;
    }

    if (!/\S+@\S+\.\S+/.test(email)) {
      setError("Please enter a valid email address.");
      return;
    }

    setLoading(true);
    try {
      const userCredential = await signInWithEmailAndPassword(auth, email, pass);
      // Ensure tokens are refreshed after login
      await refreshTokens(userCredential.user);
      const from = location.state?.from?.pathname || "/dashboard";
      navigate(from, { replace: true });
    } catch (err) {
      console.error("Login error:", err);
      if (err.code === 'auth/invalid-credential' || err.code === 'auth/user-not-found' || err.code === 'auth/wrong-password') {
        setError("Invalid email or password. Please check your credentials.");
      } else if (err.code === 'auth/too-many-requests') {
        setError("Too many failed login attempts. Please try again later.");
      } else if (err.code === 'auth/user-disabled') {
        setError("This account has been disabled. Please contact support.");
      } else if (err.code === 'auth/network-request-failed') {
        setError("Network error. Please check your internet connection.");
      } else {
        setError("Failed to login. Please try again.");
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="login-page-container">
      <div className="login-card">
        <h2>Welcome Back</h2>
        <p className="login-subtitle">Sign in to continue to AgriConnect</p>
        
        {error && <div className="alert-error">{error}</div>}
        
        <form onSubmit={handleLogin} className="login-form">
          <div className="form-group">
            <label htmlFor="email">Email</label>
            <input
              id="email"
              type="email"
              placeholder="Enter your email"
              onChange={e => setEmail(e.target.value)}
              value={email}
              required
              disabled={loading}
              autoComplete="email"
            />
          </div>
          
          <div className="form-group">
            <label htmlFor="password">Password</label>
            <input
              id="password"
              type="password"
              placeholder="Enter your password"
              onChange={e => setPass(e.target.value)}
              value={pass}
              required
              disabled={loading}
              autoComplete="current-password"
            />
          </div>
          
          <button 
            type="submit"
            className="login-button"
            disabled={loading}
          >
            {loading ? 'Signing in...' : 'Sign In'}
          </button>
        </form>

        <div className="login-links">
          <p>Don't have an account? <Link to="/register">Sign Up</Link></p>
          <Link to="/forgot-password" className="forgot-password">Forgot Password?</Link>
        </div>
      </div>
    </div>
  );
}