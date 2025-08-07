// agriconnect2.0/src/App.js

import React from 'react';
import { BrowserRouter as Router, Routes, Route, useLocation } from 'react-router-dom';
import { AuthProvider } from './context/AuthContext';
import Register from './components/Register';
import Login from './components/Login';
import Dashboard from './components/Dashboard';
import CommunityForum from './components/CommunityForum';
import Chatbot from './components/Chatbot'; // Keep this import
import LandingPage from './components/LandingPage';
import UserProfile from './components/UserProfile'; // Assuming you have this component
import PrivateRoute from './components/PrivateRoute'; // Assuming you have this component
import './App.css';

// REMOVE ChatbotConditionalRender component entirely

function App() {
  return (
    <Router>
      <AuthProvider>
        <div className="App">
          <Routes>
            {/* Set the LandingPage as the default route */}
            <Route path="/" element={<LandingPage />} />

            <Route path="/register" element={<Register />} />
            <Route path="/login" element={<Login />} />
            
            {/* Protected Routes */}
            <Route path="/dashboard" element={<PrivateRoute><Dashboard /></PrivateRoute>} />
            <Route path="/forum" element={<PrivateRoute><CommunityForum /></PrivateRoute>} />
            <Route path="/chatbot" element={<PrivateRoute><Chatbot /></PrivateRoute>} /> 
            <Route path="/profile" element={<PrivateRoute><UserProfile /></PrivateRoute>} /> {/* Add user profile route */}

            {/* Add other routes here if needed */}
          </Routes>

          {/* Chatbot will only be rendered via its dedicated route /chatbot */}
        </div>
      </AuthProvider>
    </Router>
  );
}

export default App;