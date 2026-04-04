import React, { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import './LoginForm.css';

const LoginForm = () => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const navigate = useNavigate();

  const handleLogin = async (e) => {
    e.preventDefault();
    setIsLoading(true);
    try {
      const response = await fetch('http://localhost:3004/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password }),
      });
      const data = await response.json();
      if (response.ok) {
        localStorage.setItem('authToken', data.token);
        localStorage.setItem('userId', data.user._id);
        navigate('/dashboard', { replace: true });
      } else {
        alert(`❌ Login failed: ${data.message}`);
      }
    } catch (error) {
      alert(`❌ Network error: ${error.message}`);
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
          <h2>Sign In</h2>
          <p>Access your daily due conversations and continue where you left off.</p>
        </div>

        <form className="login-form" onSubmit={handleLogin}>
          <label htmlFor="email">Email</label>
          <input id="email" type="email" value={email} onChange={(e) => setEmail(e.target.value)} required placeholder="you@example.com" />
          <label htmlFor="password">Password</label>
          <input id="password" type="password" value={password} onChange={(e) => setPassword(e.target.value)} required placeholder="Enter your password" />
          <button type="submit" disabled={isLoading}>{isLoading ? 'Signing in…' : 'Sign In'}</button>
        </form>

        <div className="login-creds">
          <h4>Demo Credentials</h4>
          <p>Email: test@example.com</p>
          <p>Password: test123</p>
        </div>
      </div>
    </div>
  );
};

export default LoginForm;
