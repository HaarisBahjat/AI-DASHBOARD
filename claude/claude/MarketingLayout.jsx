import React, { useEffect, useRef } from 'react';
import { Link, useLocation } from 'react-router-dom';
import './Marketing.css';

/* ── Scroll reveal hook ─────────────────────────────── */
export function useScrollReveal() {
  useEffect(() => {
    const els = document.querySelectorAll('.mk-reveal');
    if (!els.length) return;

    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            entry.target.classList.add('visible');
            observer.unobserve(entry.target);
          }
        });
      },
      { threshold: 0.12, rootMargin: '0px 0px -40px 0px' }
    );

    els.forEach((el) => observer.observe(el));
    return () => observer.disconnect();
  }, []);
}

/* ── Mic icon ────────────────────────────────────────── */
const LogoIcon = () => (
  <svg viewBox="0 0 24 24" fill="white">
    <path d="M12 2a3 3 0 0 1 3 3v6a3 3 0 0 1-6 0V5a3 3 0 0 1 3-3zm7 9a1 1 0 0 1 1 1 8 8 0 0 1-7 7.938V22h-2v-2.062A8 8 0 0 1 4 12a1 1 0 1 1 2 0 6 6 0 0 0 12 0 1 1 0 0 1 1-1z"/>
  </svg>
);

/* ── Nav ─────────────────────────────────────────────── */
function MarketingNav() {
  const loc = useLocation();

  const links = [
    { to: '/',        label: 'Home' },
    { to: '/features', label: 'Features' },
    { to: '/pricing',  label: 'Pricing' },
    { to: '/about',    label: 'About' },
  ];

  return (
    <nav className="mk-nav">
      <Link to="/" className="mk-nav-brand">
        <div className="mk-nav-logo"><LogoIcon /></div>
        <span className="mk-nav-wordmark">ConvDash</span>
      </Link>

      <ul className="mk-nav-links">
        {links.map(l => (
          <li key={l.to}>
            <Link
              to={l.to}
              className={`mk-nav-link${loc.pathname === l.to ? ' active' : ''}`}
            >
              {l.label}
            </Link>
          </li>
        ))}
      </ul>

      <div className="mk-nav-actions">
        <Link to="/login" className="mk-btn-ghost">Log in</Link>
        <Link to="/login" className="mk-btn-primary">Get Started →</Link>
      </div>
    </nav>
  );
}

/* ── Footer ──────────────────────────────────────────── */
function MarketingFooter() {
  return (
    <footer className="mk-footer">
      <div className="mk-container">
        <div className="mk-footer-grid">
          {/* Brand */}
          <div className="mk-footer-brand">
            <Link to="/" className="mk-nav-brand" style={{ textDecoration: 'none' }}>
              <div className="mk-nav-logo"><LogoIcon /></div>
              <span className="mk-nav-wordmark">ConvDash</span>
            </Link>
            <p>
              AI-powered voice reminder platform for collections, billing, and
              payment recovery. Built for businesses that refuse to chase payments manually.
            </p>
            <div style={{ display: 'flex', gap: '10px', marginTop: '20px' }}>
              <span className="mk-tag">Voice-First</span>
              <span className="mk-tag">AI-Powered</span>
              <span className="mk-tag">Real-time</span>
            </div>
          </div>

          {/* Product */}
          <div className="mk-footer-col">
            <h4>Product</h4>
            <ul className="mk-footer-links">
              <li><Link to="/features">Features</Link></li>
              <li><Link to="/pricing">Pricing</Link></li>
              <li><a href="#">Changelog</a></li>
              <li><a href="#">Roadmap</a></li>
              <li><a href="#">Integrations</a></li>
            </ul>
          </div>

          {/* Company */}
          <div className="mk-footer-col">
            <h4>Company</h4>
            <ul className="mk-footer-links">
              <li><Link to="/about">About Us</Link></li>
              <li><a href="#">Blog</a></li>
              <li><a href="#">Careers</a></li>
              <li><a href="#">Press</a></li>
              <li><a href="#">Contact</a></li>
            </ul>
          </div>

          {/* Legal */}
          <div className="mk-footer-col">
            <h4>Legal</h4>
            <ul className="mk-footer-links">
              <li><a href="#">Privacy Policy</a></li>
              <li><a href="#">Terms of Service</a></li>
              <li><a href="#">Cookie Policy</a></li>
              <li><a href="#">Security</a></li>
              <li><a href="#">Compliance</a></li>
            </ul>
          </div>
        </div>

        <div className="mk-footer-bottom">
          <span className="mk-footer-copy">© {new Date().getFullYear()} ConvDash. All rights reserved.</span>
          <div className="mk-footer-badges">
            <span className="mk-footer-badge">v1.0</span>
            <span className="mk-footer-badge">Built in India 🇮🇳</span>
          </div>
        </div>
      </div>
    </footer>
  );
}

/* ── Layout wrapper ──────────────────────────────────── */
export default function MarketingLayout({ children }) {
  return (
    <div className="mk-shell">
      <MarketingNav />
      <main>{children}</main>
      <MarketingFooter />
    </div>
  );
}
