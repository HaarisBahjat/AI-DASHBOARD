import React, { useState, useEffect } from 'react';
import VoiceChat from './VoiceChat';
import VoiceAssistant from './VoiceAssistant';
import LoginForm from './LoginForm';
import './App.css';

function App() {
  const [isLoggedIn, setIsLoggedIn] = useState(() => Boolean(localStorage.getItem('authToken')));
  const [activeView, setActiveView] = useState(() => localStorage.getItem('activeView') || 'voiceChat');
  const [userId, setUserId] = useState(localStorage.getItem('userId') || '');
  const [profile, setProfile] = useState({ name: 'User', role: 'Member' });

  useEffect(() => {
    const token = localStorage.getItem('authToken');
    if (token) {
      setIsLoggedIn(true);
      setUserId(localStorage.getItem('userId') || '');
      return;
    }

    setIsLoggedIn(false);
    setUserId('');
  }, []);

  useEffect(() => {
    const token = localStorage.getItem('authToken');
    if (!isLoggedIn || !token) {
      setProfile({ name: 'User', role: 'Member' });
      return;
    }

    const loadProfile = async () => {
      try {
        const response = await fetch('http://localhost:3004/api/auth/profile', {
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${token}`,
          },
        });

        if (!response.ok) return;

        const data = await response.json();
        const user = data?.user || {};
        const resolvedName = (user.name || 'User').trim();
        const resolvedRole = user.role === 'ADMIN' ? 'Admin Pro' : 'Member';
        setProfile({ name: resolvedName, role: resolvedRole });
      } catch {
        // Keep fallback profile on request failure.
      }
    };

    loadProfile();
  }, [isLoggedIn]);

  useEffect(() => {
    localStorage.setItem('activeView', activeView);
  }, [activeView]);

  const handleLogin = () => {
    setIsLoggedIn(true);
    setUserId(localStorage.getItem('userId') || '');
  };

  const handleLogout = () => {
    localStorage.removeItem('authToken');
    localStorage.removeItem('userId');
    localStorage.removeItem('activeView');
    setIsLoggedIn(false);
    setUserId('');
    setActiveView('voiceChat');
    setProfile({ name: 'User', role: 'Member' });
  };

  return (
    <div className="app-shell">
      {isLoggedIn ? (
        <div className={`app-authenticated-layout ${activeView === 'voiceChat' ? 'dashboard-mode' : ''}`}>
          {activeView !== 'voiceChat' && (
            <div className="app-top-controls">
              <button
                onClick={() => setActiveView('voiceChat')}
                className={`app-view-toggle ${activeView === 'voiceChat' ? 'active' : ''}`}
              >
                VoiceChat
              </button>
              <button
                onClick={() => setActiveView('voiceAssistant')}
                className={`app-view-toggle ${activeView === 'voiceAssistant' ? 'active' : ''}`}
              >
                VoiceAssistant
              </button>
              <button
                onClick={handleLogout}
                className="app-logout-btn"
              >
                Logout
              </button>
            </div>
          )}
          <div className={`app-content-wrap ${activeView === 'voiceChat' ? 'full-bleed' : ''}`}>
            {activeView === 'voiceChat'
              ? <VoiceChat onLogout={handleLogout} profile={profile} />
              : <VoiceAssistant userId={userId} profile={profile} />}
          </div>
        </div>
      ) : (
        <LoginForm onLogin={handleLogin} />
      )}
    </div>
  );
}

export default App;