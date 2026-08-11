import React, { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { apiUrl } from './lib/api';
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
      const response = await fetch(apiUrl('/api/auth/login'), {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password }),
      });

      // Safe JSON parse — Hugging Face returns an HTML page while the
      // container is rebuilding. Detect this and show a friendly message.
      let data;
      const contentType = response.headers.get('content-type') || '';
      if (!contentType.includes('application/json')) {
        throw new Error('Server is starting up. Please wait 30 seconds and try again.');
      }
      data = await response.json();

      if (response.ok) {
        localStorage.setItem('authToken', data.token);
        localStorage.setItem('userId', data.user._id);
        navigate('/dashboard', { replace: true });
      } else {
        alert(`Login failed: ${data.message || data.error || 'Unknown error'}`);
      }
    } catch (error) {
      if (error.message.includes('Unexpected token') || error.message.includes('not valid JSON')) {
        alert('Server is starting up after a recent update. Please wait 30 seconds and try again.');
      } else {
        alert(`Network error: ${error.message}`);
      }
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

        <div className="login-creds" style={{ marginTop: 14 }}>
          <h4>New here?</h4>
          <p><Link to="/signup" style={{ color: '#7aacf8', textDecoration: 'none' }}>Create your account</Link></p>
        </div>
      </div>
    </div>
  );
};

export default LoginForm;
