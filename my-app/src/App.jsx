import React, { lazy, Suspense, useState, useEffect } from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { apiUrl } from './lib/api';

const HomePage = lazy(() => import('./pages/HomePage'));
const FeaturesPage = lazy(() => import('./pages/FeaturesPage'));
const PricingPage = lazy(() => import('./pages/PricingPage'));
const AboutPage = lazy(() => import('./pages/AboutPage'));
const LoginForm = lazy(() => import('./LoginForm'));
const SignupForm = lazy(() => import('./SignupForm'));
const VoiceChat = lazy(() => import('./VoiceChat'));
const VoiceAssistant = lazy(() => import('./VoiceAssistant'));
import './App.css';

function RouteLoader() {
  return (
    <div style={{ minHeight: '100vh', display: 'grid', placeItems: 'center', background: 'var(--bg)', color: 'var(--body)' }}>
      Loading...
    </div>
  );
}

// ── Auth guard ───────────────────────────────────────────
function ProtectedRoute({ children }) {
  const token = localStorage.getItem('authToken');
  if (!token) return <Navigate to="/login" replace />;
  return children;
}

function PublicRoute({ children }) {
  const token = localStorage.getItem('authToken');
  if (token) return <Navigate to="/dashboard" replace />;
  return children;
}

// ── Dashboard shell ──────────────────────────────────────
function DashboardShell() {
  const [activeView, setActiveView] = useState(
    () => localStorage.getItem('activeView') || 'voiceChat'
  );
  const [userId, setUserId] = useState(localStorage.getItem('userId') || '');
  const [profile, setProfile] = useState({ name: 'User', role: 'Member' });

  useEffect(() => {
    localStorage.setItem('activeView', activeView);
  }, [activeView]);

  useEffect(() => {
    const token = localStorage.getItem('authToken');
    if (!token) return;
    (async () => {
      try {
        const res = await fetch(apiUrl('/api/auth/profile'), {
          headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        });
        if (!res.ok) return;
        const data = await res.json();
        const user = data?.user || {};
        setProfile({ name: (user.name || 'User').trim(), role: user.role === 'ADMIN' ? 'Admin Pro' : 'Member' });
      } catch {}
    })();
    setUserId(localStorage.getItem('userId') || '');
  }, []);

  const handleLogout = () => {
    localStorage.removeItem('authToken');
    localStorage.removeItem('userId');
    localStorage.removeItem('activeView');
    window.location.href = '/';
  };

  return (
    <div className="app-shell">
      <div className={`app-authenticated-layout${activeView === 'voiceChat' ? ' dashboard-mode' : ''}`}>
        {activeView !== 'voiceChat' && (
          <div className="app-top-controls">
            <div className="app-view-toggle-wrap">
              <button onClick={() => setActiveView('voiceChat')} className={`app-view-toggle${activeView === 'voiceChat' ? ' active' : ''}`}>
                <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor"><path d="M20 2H4a2 2 0 0 0-2 2v18l4-4h14a2 2 0 0 0 2-2V4a2 2 0 0 0-2-2zm-3 11H7v-2h10v2zm0-4H7V7h10v2z"/></svg>
                Voice Chat
              </button>
              <button onClick={() => setActiveView('voiceAssistant')} className={`app-view-toggle${activeView === 'voiceAssistant' ? ' active' : ''}`}>
                <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor"><path d="M12 2a3 3 0 0 1 3 3v6a3 3 0 0 1-6 0V5a3 3 0 0 1 3-3zm7 9a1 1 0 0 1 1 1 8 8 0 0 1-7 7.938V22h-2v-2.062A8 8 0 0 1 4 12a1 1 0 1 1 2 0 6 6 0 0 0 12 0 1 1 0 0 1 1-1z"/></svg>
                Voice Assistant
              </button>
            </div>
            <button onClick={handleLogout} className="app-logout-btn">
              <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4M16 17l5-5-5-5M21 12H9"/></svg>
              Logout
            </button>
          </div>
        )}
        <div className={`app-content-wrap${activeView === 'voiceChat' ? ' full-bleed' : ''}`}>
          {activeView === 'voiceChat'
            ? <VoiceChat onLogout={handleLogout} profile={profile} />
            : <VoiceAssistant userId={userId} profile={profile} />
          }
        </div>
      </div>
    </div>
  );
}

export default function App() {
  return (
    <BrowserRouter>
      <Suspense fallback={<RouteLoader />}>
        <Routes>
          <Route path="/"         element={<HomePage />} />
          <Route path="/features" element={<FeaturesPage />} />
          <Route path="/pricing"  element={<PricingPage />} />
          <Route path="/about"    element={<AboutPage />} />
          <Route path="/login"    element={<LoginForm />} />
          <Route path="/signup"   element={<SignupForm />} />
          <Route path="/dashboard" element={<ProtectedRoute><DashboardShell /></ProtectedRoute>} />
          <Route path="*"         element={<Navigate to="/" replace />} />
        </Routes>
      </Suspense>
    </BrowserRouter>
  );
}
