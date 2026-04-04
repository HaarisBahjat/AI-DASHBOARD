import React from 'react';
import { Link } from 'react-router-dom';
import '../styles/LandingPage.css';

function LandingPage() {
  return (
    <div className="landing-page">
      {/* Header Navigation */}
      <header className="landing-header">
        <div className="landing-container">
          <div className="logo">ConvDash</div>
          <nav className="nav-links">
            <a href="#features">Features</a>
            <a href="#how-it-works">How It Works</a>
            <div className="nav-actions">
              <Link to="/login" className="btn-link login-btn">Login</Link>
              <Link to="/signup" className="btn-link signup-btn">Sign Up</Link>
            </div>
          </nav>
        </div>
      </header>

      {/* Hero Section */}
      <section className="hero">
        <div className="landing-container hero-content">
          <div className="hero-text">
            <h1>AI-Powered Collections Made Easy</h1>
            <p className="hero-subtitle">Automate your dues reminders with intelligent voice and text conversations. Recover payments faster with zero manual effort.</p>
            <div className="hero-cta">
              <Link to="/signup" className="btn btn-primary">Get Started Free</Link>
              <Link to="/login" className="btn btn-secondary">Sign In</Link>
            </div>
          </div>
          <div className="hero-visual">
            <div className="hero-icon">📞</div>
          </div>
        </div>
      </section>

      {/* Features Section */}
      <section className="features" id="features">
        <div className="landing-container">
          <h2>Why ConvDash?</h2>
          <div className="features-grid">
            <div className="feature-card">
              <div className="feature-icon">🎤</div>
              <h3>Voice Collections</h3>
              <p>AI agents make natural voice calls to remind customers about pending dues.</p>
            </div>
            <div className="feature-card">
              <div className="feature-icon">⏰</div>
              <h3>Smart Reminders</h3>
              <p>Automated reminders via voice, text, and email based on due dates and overdue status.</p>
            </div>
            <div className="feature-card">
              <div className="feature-icon">📊</div>
              <h3>Real-Time Analytics</h3>
              <p>Track payment status, overdue exposure, and collections performance instantly.</p>
            </div>
            <div className="feature-card">
              <div className="feature-icon">💰</div>
              <h3>Payment Tracking</h3>
              <p>Mark payments as paid, snooze reminders, and manage aging invoices effortlessly.</p>
            </div>
            <div className="feature-card">
              <div className="feature-icon">🤖</div>
              <h3>Intelligent Conversations</h3>
              <p>Multi-turn voice conversations to explain dues, negotiate, and confirm payments.</p>
            </div>
            <div className="feature-card">
              <div className="feature-icon">🔄</div>
              <h3>Seamless Integration</h3>
              <p>Works with payment gateways and WhatsApp/SMS for omni-channel collections.</p>
            </div>
          </div>
        </div>
      </section>

      {/* How It Works Section */}
      <section className="how-it-works" id="how-it-works">
        <div className="landing-container">
          <h2>How It Works</h2>
          <div className="steps-grid">
            <div className="step">
              <div className="step-number">1</div>
              <h3>Upload Your Dues</h3>
              <p>Add customers and their pending invoices to your dashboard.</p>
            </div>
            <div className="step">
              <div className="step-number">2</div>
              <h3>AI Reminders Begin</h3>
              <p>Automated voice, text, and email reminders go out based on your rules.</p>
            </div>
            <div className="step">
              <div className="step-number">3</div>
              <h3>Track & Manage</h3>
              <p>See payment status, snooze reminders, and manage follow-ups in real-time.</p>
            </div>
            <div className="step">
              <div className="step-number">4</div>
              <h3>Get Paid Faster</h3>
              <p>View analytics, optimize strategies, and recover payments 30% faster.</p>
            </div>
          </div>
        </div>
      </section>

      {/* Benefits Section */}
      <section className="benefits">
        <div className="landing-container">
          <h2>Proven Results</h2>
          <div className="benefits-grid">
            <div className="benefit-stat">
              <div className="stat-number">30%</div>
              <p>Faster recovery</p>
            </div>
            <div className="benefit-stat">
              <div className="stat-number">80%</div>
              <p>Automation</p>
            </div>
            <div className="benefit-stat">
              <div className="stat-number">24/7</div>
              <p>Collections</p>
            </div>
            <div className="benefit-stat">
              <div className="stat-number">0</div>
              <p>Manual calls</p>
            </div>
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="cta-final">
        <div className="landing-container">
          <h2>Ready to Transform Your Collections?</h2>
          <p>Start your free trial today. No credit card required.</p>
          <Link to="/signup" className="btn btn-primary btn-large">Create Your Account</Link>
        </div>
      </section>

      {/* Footer */}
      <footer className="landing-footer">
        <div className="landing-container">
          <div className="footer-content">
            <div className="footer-section">
              <h4>ConvDash</h4>
              <p>AI-powered collections platform</p>
            </div>
            <div className="footer-section">
              <h4>Product</h4>
              <ul>
                <li><a href="#features">Features</a></li>
                <li><a href="#how-it-works">How It Works</a></li>
                <li><a href="#pricing">Pricing</a></li>
              </ul>
            </div>
            <div className="footer-section">
              <h4>Company</h4>
              <ul>
                <li><a href="/about">About</a></li>
                <li><a href="/blog">Blog</a></li>
                <li><a href="/contact">Contact</a></li>
              </ul>
            </div>
            <div className="footer-section">
              <h4>Legal</h4>
              <ul>
                <li><a href="/privacy">Privacy Policy</a></li>
                <li><a href="/terms">Terms of Service</a></li>
              </ul>
            </div>
          </div>
          <div className="footer-copyright">
            <p>&copy; 2026 ConvDash. All rights reserved.</p>
          </div>
        </div>
      </footer>
    </div>
  );
}

export default LandingPage;
