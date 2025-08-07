// src/components/UserProfile.js
import React, { useEffect, useState } from 'react';
import { useAuth } from '../context/AuthContext'; // Import useAuth to get user
import { Link } from 'react-router-dom';
import { db } from '../firebase'; // Import db
import { doc, getDoc, setDoc } from 'firebase/firestore'; // Import Firestore functions

export default function UserProfile() {
  const { user, currentUser } = useAuth(); // Get user (Firebase Auth object) and currentUser (AuthContext's user)
  const [displayName, setDisplayName] = useState('');
  const [location, setLocation] = useState('');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  useEffect(() => {
    const fetchUserProfile = async () => {
      if (user) {
        setLoading(true);
        setError('');
        try {
          const userDocRef = doc(db, 'users', user.uid); // Reference to user's profile document
          const docSnap = await getDoc(userDocRef);

          if (docSnap.exists()) {
            // If profile exists, load data into state
            const userData = docSnap.data();
            setDisplayName(userData.displayName || '');
            setLocation(userData.location || '');
          } else {
            // If profile doesn't exist yet, it will be created on save
            console.log("No user profile found in Firestore, will create on save.");
          }
        } catch (err) {
          console.error("Error fetching user profile:", err);
          setError("Failed to load profile data.");
        } finally {
          setLoading(false);
        }
      } else {
        setLoading(false);
        setError("You must be logged in to view your profile.");
      }
    };

    fetchUserProfile();
  }, [user]); // Re-run effect if user object changes

  const handleUpdateProfile = async (e) => {
    e.preventDefault();
    setError('');
    setSuccess('');

    if (!user) {
      setError("You must be logged in to update your profile.");
      return;
    }

    setLoading(true);
    try {
      const userDocRef = doc(db, 'users', user.uid); // Reference to user's profile document
      // Use setDoc with merge: true to update fields or create if document doesn't exist
      await setDoc(userDocRef, {
        displayName: displayName.trim(),
        location: location.trim(),
        email: user.email, // Store email for reference, if desired
        lastUpdated: new Date() // Add a timestamp
      }, { merge: true });

      setSuccess("Profile updated successfully!");
    } catch (err) {
      console.error("Error updating user profile:", err);
      setError("Failed to update profile. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return <div className="container" style={{ textAlign: 'center', marginTop: '50px' }}>Loading profile...</div>;
  }

  if (error) {
    return <div className="container alert-error" style={{ textAlign: 'center', marginTop: '50px' }}>{error}</div>;
  }

  return (
    <div className="container">
      <Link to="/dashboard" style={{ textDecoration: "none", color: "#007bff", marginBottom: "20px", display: "block" }}>
        &larr; Back to Dashboard
      </Link>
      <h2 style={{ textAlign: 'center' }}>👤 My Profile</h2>

      <div className="card" style={{ padding: '20px', marginTop: '20px' }}>
        <h3 style={{ marginBottom: '15px' }}>Account Information</h3>
        <p><strong>Email:</strong> {user ? user.email : 'N/A'}</p>
        <p><strong>User ID:</strong> {user ? user.uid : 'N/A'}</p>
        {/* You can add more Firebase Auth specific details here if needed */}

        <h3 style={{ marginTop: '30px', marginBottom: '15px' }}>Edit Public Profile</h3>
        {error && <p className="alert-error">{error}</p>}
        {success && <p className="alert-success">{success}</p>}

        <form onSubmit={handleUpdateProfile}>
          <div style={{ marginBottom: '15px' }}>
            <label style={{ display: 'block', marginBottom: '5px', fontWeight: 'bold' }}>Display Name:</label>
            <input
              type="text"
              value={displayName}
              onChange={(e) => setDisplayName(e.target.value)}
              placeholder="e.g., John Doe"
              style={{ width: '100%', padding: '10px', borderRadius: '4px', border: '1px solid #ddd' }}
            />
          </div>

          <div style={{ marginBottom: '15px' }}>
            <label style={{ display: 'block', marginBottom: '5px', fontWeight: 'bold' }}>Location:</label>
            <input
              type="text"
              value={location}
              onChange={(e) => setLocation(e.target.value)}
              placeholder="e.g., Bengaluru, India"
              style={{ width: '100%', padding: '10px', borderRadius: '4px', border: '1px solid #ddd' }}
            />
          </div>

          <button
            type="submit"
            className="btn-primary"
            disabled={loading}
            style={{ width: '100%', padding: '12px', fontSize: '1.1em', background: loading ? '#6c757d' : '#007bff' }}
          >
            {loading ? 'Saving...' : 'Save Changes'}
          </button>
        </form>
      </div>
    </div>
  );
}