import React, { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { apiUrl } from './lib/api';
import './LoginForm.css';

const SignupForm = () => {
  const [username, setUsername] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const navigate = useNavigate();

  const handleSignup = async (e) => {
    e.preventDefault();

    if (password !== confirmPassword) {
      alert('Passwords do not match');
      return;
    }

    setIsLoading(true);
    try {
      const response = await fetch(apiUrl('/api/auth/signup'), {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username, email, password }),
      });

      const data = await response.json();
      if (response.ok) {
        alert('Account created successfully. Please sign in.');
        navigate('/login', { replace: true });
      } else {
        alert(`Signup failed: ${data.message}`);
      }
    } catch (error) {
      alert(`Network error: ${error.message}`);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="login-shell">
      <div className="login-card">
        <div className="login-header">
          <Link to="/" className="login-back">← Back to home</Link>
          <span className="login-chip">Voice Assistant</span>
          <h2>Create Account</h2>
          <p>Set up your workspace so the assistant can start handling reminders for your users.</p>
        </div>

        <form className="login-form" onSubmit={handleSignup}>
          <label htmlFor="username">Full Name</label>
          <input id="username" type="text" value={username} onChange={(e) => setUsername(e.target.value)} required placeholder="Your name" />
          <label htmlFor="email">Email</label>
          <input id="email" type="email" value={email} onChange={(e) => setEmail(e.target.value)} required placeholder="you@example.com" />
          <label htmlFor="password">Password</label>
          <input id="password" type="password" value={password} onChange={(e) => setPassword(e.target.value)} required placeholder="Create a password" />
          <label htmlFor="confirmPassword">Confirm Password</label>
          <input id="confirmPassword" type="password" value={confirmPassword} onChange={(e) => setConfirmPassword(e.target.value)} required placeholder="Repeat your password" />
          <button type="submit" disabled={isLoading}>{isLoading ? 'Creating account…' : 'Sign Up'}</button>
        </form>

        <div className="login-creds">
          <h4>Already have an account?</h4>
          <p><Link to="/login" style={{ color: '#7aacf8', textDecoration: 'none' }}>Sign in here</Link></p>
        </div>
      </div>
    </div>
  );
};

export default SignupForm;