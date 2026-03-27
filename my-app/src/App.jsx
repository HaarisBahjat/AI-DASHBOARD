import React, { useState, useEffect } from 'react';
import VoiceChat from './VoiceChat';
import VoiceAssistant from './VoiceAssistant';
import LoginForm from './LoginForm';
import './App.css';

function App() {
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const [activeView, setActiveView] = useState('voiceChat');
  const [userId, setUserId] = useState(localStorage.getItem('userId') || '');

  useEffect(() => {
    const token = localStorage.getItem('authToken');
    if (token) {
      setIsLoggedIn(true);
      setUserId(localStorage.getItem('userId') || '');
    }
  }, []);

  const handleLogin = () => {
    setIsLoggedIn(true);
    setUserId(localStorage.getItem('userId') || '');
  };

  const handleLogout = () => {
    localStorage.removeItem('authToken');
    localStorage.removeItem('userId');
    setIsLoggedIn(false);
    setUserId('');
  };

  return (
    <div className="app-shell">
      {isLoggedIn ? (
        <div className="app-authenticated-layout">
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
          <div className="app-content-wrap">
            {activeView === 'voiceChat' ? <VoiceChat /> : <VoiceAssistant userId={userId} />}
          </div>
        </div>
      ) : (
        <LoginForm onLogin={handleLogin} />
      )}
    </div>
  );
}

export default App;