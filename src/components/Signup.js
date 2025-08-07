import { auth } from "../firebase";
import { createUserWithEmailAndPassword } from "firebase/auth";
import { useState } from "react";
import { useNavigate, Link } from "react-router-dom";

export default function Signup() {
  const [email, setEmail] = useState("");
  const [pass, setPass] = useState("");
  const [confirmPass, setConfirmPass] = useState("");
  const [error, setError] = useState("");
  const navigate = useNavigate();

  const handleSignup = async () => {
    setError("");
    if (!email || !pass || !confirmPass) {
      setError("All fields are required.");
      return;
    }
    if (pass !== confirmPass) {
      setError("Passwords do not match.");
      return;
    }
    if (pass.length < 6) {
      setError("Password must be at least 6 characters long.");
      return;
    }
    if (!/\S+@\S+\.\S+/.test(email)) {
      setError("Please enter a valid email address.");
      return;
    }
    try {
      await createUserWithEmailAndPassword(auth, email, pass);
      navigate("/dashboard");
    } catch (err) {
      if (err.code === 'auth/email-already-in-use') {
        setError("This email is already registered. Please login instead.");
      } else if (err.code === 'auth/weak-password') {
        setError("Password is too weak. Please use at least 6 characters.");
      } else if (err.code === 'auth/invalid-email') {
        setError("The email address is not valid.");
      } else {
        setError(`Signup failed: ${err.message}`);
      }
    }
  };

  return (
    <div className="card container" style={{ maxWidth: '400px', margin: '50px auto', padding: '20px', borderRadius: '8px', boxShadow: '0 2px 4px rgba(0,0,0,0.1)', backgroundColor: '#fff' }}>
      <h2 style={{ textAlign: 'center', color: '#333' }}>Sign Up</h2>
      <div style={{ marginBottom: '15px' }}>
        <input
          type="email"
          placeholder="Email"
          onChange={e => setEmail(e.target.value)}
          value={email}
          style={{ width: '100%', padding: '10px', margin: '8px 0', display: 'inline-block', border: '1px solid #ddd', borderRadius: '4px', boxSizing: 'border-box' }}
        />
        <input
          type="password"
          placeholder="Password"
          onChange={e => setPass(e.target.value)}
          value={pass}
          style={{ width: '100%', padding: '10px', margin: '8px 0', display: 'inline-block', border: '1px solid #ddd', borderRadius: '4px', boxSizing: 'border-box' }}
        />
        <input
          type="password"
          placeholder="Confirm Password"
          onChange={e => setConfirmPass(e.target.value)}
          value={confirmPass}
          style={{ width: '100%', padding: '10px', margin: '8px 0', display: 'inline-block', border: '1px solid #ddd', borderRadius: '4px', boxSizing: 'border-box' }}
        />
      </div>
      <button onClick={handleSignup} className="btn-primary" style={{ width: '100%', padding: '10px', border: 'none', borderRadius: '4px', backgroundColor: '#28a745', color: 'white', fontSize: '16px', cursor: 'pointer' }}>
        Sign Up
      </button>
      {error && <p className="alert-error" style={{ color: '#dc3545', marginTop: '15px', textAlign: 'center' }}>{error}</p>}
      <p style={{ textAlign: 'center', marginTop: '20px', fontSize: '0.9em' }}>
        Already have an account? <Link to="/login" style={{ color: '#007bff', textDecoration: 'none' }}>Login</Link>
      </p>
    </div>
  );
}
