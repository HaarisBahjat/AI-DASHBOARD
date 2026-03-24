import React, { useState } from 'react';

const LoginForm = ({ onLogin }) => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  const handleLogin = async (e) => {
    e.preventDefault();
    setIsLoading(true);

    try {
      const response = await fetch('http://localhost:3004/api/auth/login', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ email, password }),
      });

      const data = await response.json();

      if (response.ok) {
        localStorage.setItem('authToken', data.token);
        localStorage.setItem('userId', data.user._id);

        alert('✅ Login successful! You can now use the voice chat.');
        onLogin(data.token);
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
    <div style={{
      maxWidth: '400px',
      margin: '50px auto',
      padding: '20px',
      background: 'rgba(255, 255, 255, 0.1)',
      borderRadius: '10px',
      backdropFilter: 'blur(10px)',
      color: 'white'
    }}>
      <h2>🔐 Login Required</h2>
      <p>You need to login to use the voice chat feature.</p>

      <form onSubmit={handleLogin}>
        <div style={{ marginBottom: '15px' }}>
          <label style={{ display: 'block', marginBottom: '5px' }}>Email:</label>
          <input
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            required
            style={{
              width: '100%',
              padding: '10px',
              borderRadius: '5px',
              border: 'none',
              background: 'rgba(255, 255, 255, 0.2)',
              color: 'white'
            }}
          />
        </div>

        <div style={{ marginBottom: '15px' }}>
          <label style={{ display: 'block', marginBottom: '5px' }}>Password:</label>
          <input
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            required
            style={{
              width: '100%',
              padding: '10px',
              borderRadius: '5px',
              border: 'none',
              background: 'rgba(255, 255, 255, 0.2)',
              color: 'white'
            }}
          />
        </div>

        <button
          type="submit"
          disabled={isLoading}
          style={{
            width: '100%',
            padding: '12px',
            background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
            color: 'white',
            border: 'none',
            borderRadius: '5px',
            cursor: isLoading ? 'not-allowed' : 'pointer',
            fontSize: '16px'
          }}
        >
          {isLoading ? '🔄 Logging in...' : '🚀 Login'}
        </button>
      </form>

      <div style={{ marginTop: '20px', padding: '15px', background: 'rgba(255, 255, 255, 0.1)', borderRadius: '5px' }}>
        <h4>📋 Test Credentials:</h4>
        <p><strong>Email:</strong> test@example.com</p>
        <p><strong>Password:</strong> test123</p>
      </div>
    </div>
  );
};

export default LoginForm;