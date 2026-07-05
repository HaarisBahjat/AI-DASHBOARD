import React, { useEffect } from 'react';
import { Link } from 'react-router-dom';
import MarketingLayout, { useScrollReveal } from '../components/MarketingLayout';

/* ── Inline styles specific to Home ─────────────────── */
const homeStyles = `
  /* ── Hero ── */
  .hp-hero {
    position: relative;
    overflow: hidden;
    padding: 120px 5% 100px;
    text-align: center;
  }

  .hp-hero-bg {
    position: absolute;
    inset: 0;
    background:
      radial-gradient(ellipse 900px 500px at 50% -10%, rgba(29,78,216,0.22) 0%, transparent 60%),
      radial-gradient(ellipse 600px 400px at 80% 80%, rgba(13,148,136,0.08) 0%, transparent 55%),
      linear-gradient(180deg, #040810 0%, #060d1c 100%);
    pointer-events: none;
  }

  /* subtle dot grid */
  .hp-hero-bg::after {
    content: '';
    position: absolute;
    inset: 0;
    background-image: radial-gradient(rgba(79,142,247,0.08) 1px, transparent 1px);
    background-size: 32px 32px;
    pointer-events: none;
  }

  .hp-hero-inner {
    position: relative;
    z-index: 1;
    max-width: 820px;
    margin: 0 auto;
  }

  .hp-hero-tagline {
    font-size: clamp(38px, 5.5vw, 72px);
    font-family: var(--mk-font-display);
    font-weight: 700;
    line-height: 1.07;
    letter-spacing: -0.03em;
    color: var(--mk-fg);
    margin-bottom: 22px;
  }

  .hp-hero-sub {
    font-size: clamp(16px, 1.6vw, 20px);
    color: var(--mk-fg2);
    line-height: 1.65;
    max-width: 600px;
    margin: 0 auto 36px;
  }

  .hp-hero-actions {
    display: flex;
    align-items: center;
    justify-content: center;
    gap: 14px;
    flex-wrap: wrap;
    margin-bottom: 56px;
  }

  .hp-try-btn {
    padding: 14px 32px;
    font-size: 15px;
    font-weight: 600;
    font-family: var(--mk-font-body);
    letter-spacing: -0.01em;
    border-radius: var(--mk-radius-pill);
    border: none;
    background: linear-gradient(135deg, #1d4ed8, #4f8ef7);
    color: #fff;
    cursor: pointer;
    text-decoration: none;
    display: inline-flex;
    align-items: center;
    gap: 8px;
    box-shadow: 0 6px 28px rgba(79,142,247,0.4);
    transition: all 0.18s;
  }
  .hp-try-btn:hover { box-shadow: 0 8px 40px rgba(79,142,247,0.6); transform: translateY(-2px); }

  .hp-watch-btn {
    padding: 13px 28px;
    font-size: 15px;
    font-weight: 500;
    font-family: var(--mk-font-body);
    border-radius: var(--mk-radius-pill);
    border: 1px solid rgba(79,142,247,0.3);
    background: transparent;
    color: var(--mk-fg2);
    cursor: pointer;
    text-decoration: none;
    display: inline-flex;
    align-items: center;
    gap: 8px;
    transition: all 0.16s;
  }
  .hp-watch-btn:hover { border-color: rgba(79,142,247,0.55); color: var(--mk-fg); background: rgba(79,142,247,0.07); }

  /* dashboard mockup */
  .hp-mockup {
    position: relative;
    max-width: 900px;
    margin: 0 auto;
    border-radius: 18px;
    overflow: hidden;
    border: 1px solid rgba(79,142,247,0.18);
    box-shadow: 0 0 80px rgba(29,78,216,0.25), 0 40px 100px rgba(4,8,16,0.7);
  }

  .hp-mockup-bar {
    height: 40px;
    background: #0a1528;
    display: flex;
    align-items: center;
    padding: 0 16px;
    gap: 8px;
    border-bottom: 1px solid rgba(79,142,247,0.1);
  }

  .hp-mockup-dot { width: 10px; height: 10px; border-radius: 50%; }
  .hp-mockup-dot.red  { background: #ef4444; }
  .hp-mockup-dot.amber { background: #fbbf24; }
  .hp-mockup-dot.green { background: #22c55e; }

  .hp-mockup-url {
    flex: 1;
    height: 22px;
    background: rgba(255,255,255,0.04);
    border-radius: 6px;
    display: flex;
    align-items: center;
    padding: 0 10px;
    font-size: 11px;
    font-family: var(--mk-font-mono);
    color: var(--mk-dim);
    max-width: 300px;
    margin: 0 auto;
  }

  .hp-mockup-body {
    background: #060d1c;
    display: grid;
    grid-template-columns: 200px 1fr;
    height: 360px;
    overflow: hidden;
  }

  .hp-mockup-sidebar {
    background: #08121e;
    border-right: 1px solid rgba(79,142,247,0.1);
    padding: 16px 12px;
    display: flex;
    flex-direction: column;
    gap: 6px;
  }

  .hp-mockup-nav { height: 32px; border-radius: 8px; display: flex; align-items: center; padding: 0 12px; font-size: 12px; }
  .hp-mockup-nav.active { background: rgba(79,142,247,0.15); color: #7aacf8; }
  .hp-mockup-nav:not(.active) { color: #2d4468; }

  .hp-mockup-main { padding: 20px; display: flex; flex-direction: column; gap: 12px; }

  .hp-mockup-card {
    background: rgba(255,255,255,0.03);
    border: 1px solid rgba(79,142,247,0.1);
    border-radius: 10px;
    padding: 14px;
    animation: shimmer 2.5s ease-in-out infinite;
  }

  @keyframes shimmer {
    0%,100% { border-color: rgba(79,142,247,0.1); }
    50%      { border-color: rgba(79,142,247,0.22); }
  }

  .hp-mockup-line { height: 8px; border-radius: 4px; background: rgba(255,255,255,0.06); margin-bottom: 6px; }
  .hp-mockup-line.w70 { width: 70%; }
  .hp-mockup-line.w50 { width: 50%; }
  .hp-mockup-line.w40 { width: 40%; background: rgba(79,142,247,0.2); }

  .hp-mockup-pill {
    display: inline-block;
    padding: 3px 8px;
    border-radius: 999px;
    font-size: 10px;
    font-family: var(--mk-font-mono);
  }
  .hp-mockup-pill.blue  { background: rgba(79,142,247,0.15); color: #7aacf8; }
  .hp-mockup-pill.green { background: rgba(34,197,94,0.12); color: #22c55e; }
  .hp-mockup-pill.amber { background: rgba(251,191,36,0.12); color: #fbbf24; }

  /* ── Social proof bar ── */
  .hp-proof {
    border-top: 1px solid var(--mk-border);
    border-bottom: 1px solid var(--mk-border);
    padding: 20px 5%;
    background: var(--mk-bg2);
    display: flex;
    align-items: center;
    justify-content: center;
    gap: 40px;
    flex-wrap: wrap;
  }

  .hp-proof-item {
    display: flex;
    align-items: center;
    gap: 8px;
    font-size: 13px;
    color: var(--mk-muted);
    font-family: var(--mk-font-mono);
  }

  .hp-proof-item::before {
    content: '';
    color: var(--mk-blue);
    font-size: 10px;
  }

  /* ── Pain → Solution ── */
  .hp-pain {
    background: var(--mk-bg2);
    padding: 100px 5%;
    position: relative;
    overflow: hidden;
  }

  .hp-pain-grid {
    display: grid;
    grid-template-columns: 1fr 1fr;
    gap: 60px;
    align-items: center;
    max-width: 1100px;
    margin: 0 auto;
  }

  .hp-pain-list { display: flex; flex-direction: column; gap: 16px; margin-top: 28px; }
  .hp-pain-item {
    display: flex;
    align-items: flex-start;
    gap: 12px;
    padding: 16px;
    background: rgba(248,113,113,0.05);
    border: 1px solid rgba(248,113,113,0.12);
    border-radius: var(--mk-radius);
  }
  .hp-pain-item-icon { font-size: 18px; flex-shrink: 0; margin-top: 1px; }
  .hp-pain-item p { color: var(--mk-fg2); font-size: 14.5px; line-height: 1.6; }

  .hp-sol-list { display: flex; flex-direction: column; gap: 16px; margin-top: 28px; }
  .hp-sol-item {
    display: flex;
    align-items: flex-start;
    gap: 12px;
    padding: 16px;
    background: rgba(79,142,247,0.06);
    border: 1px solid rgba(79,142,247,0.15);
    border-radius: var(--mk-radius);
  }
  .hp-sol-item-icon { font-size: 18px; flex-shrink: 0; margin-top: 1px; }
  .hp-sol-item p { color: var(--mk-fg2); font-size: 14.5px; line-height: 1.6; }

  /* ── How it works ── */
  .hp-how {
    padding: 100px 5%;
    max-width: 1100px;
    margin: 0 auto;
  }

  .hp-how-header { text-align: center; margin-bottom: 64px; }

  .hp-how-grid {
    display: grid;
    grid-template-columns: 1fr 1fr;
    gap: 60px;
    align-items: start;
  }

  /* ── Stats band ── */
  .hp-stats {
    padding: 80px 5%;
    background: linear-gradient(135deg, #0a1f4e 0%, #061230 50%, #0a1a40 100%);
    border-top: 1px solid rgba(79,142,247,0.15);
    border-bottom: 1px solid rgba(79,142,247,0.15);
  }

  .hp-stats-grid {
    display: grid;
    grid-template-columns: repeat(4, 1fr);
    gap: 2px;
    max-width: 900px;
    margin: 0 auto;
    border: 1px solid rgba(79,142,247,0.15);
    border-radius: var(--mk-radius-lg);
    overflow: hidden;
  }

  .hp-stat-cell {
    padding: 32px 24px;
    text-align: center;
    background: rgba(10,31,78,0.4);
    border-right: 1px solid rgba(79,142,247,0.1);
  }
  .hp-stat-cell:last-child { border-right: none; }

  .hp-stat-num {
    font-family: var(--mk-font-display);
    font-size: 42px;
    font-weight: 700;
    letter-spacing: -0.03em;
    background: linear-gradient(135deg, #eef2fb, #7aacf8);
    -webkit-background-clip: text;
    -webkit-text-fill-color: transparent;
    background-clip: text;
    line-height: 1;
    margin-bottom: 8px;
  }

  .hp-stat-label { font-size: 13px; color: var(--mk-muted); line-height: 1.4; }

  /* ── Feature grid ── */
  .hp-features {
    padding: 100px 5%;
  }
  .hp-features-header { text-align: center; margin-bottom: 60px; max-width: 600px; margin-left: auto; margin-right: auto; }

  .hp-feat-grid {
    display: grid;
    grid-template-columns: repeat(3, 1fr);
    gap: 20px;
    max-width: 1100px;
    margin: 0 auto;
  }

  .hp-feat-card {
    background: var(--mk-surface);
    border: 1px solid var(--mk-border);
    border-radius: var(--mk-radius-lg);
    padding: 28px;
    transition: all 0.2s;
  }
  .hp-feat-card:hover {
    border-color: rgba(79,142,247,0.3);
    box-shadow: 0 12px 48px rgba(4,8,16,0.5);
    transform: translateY(-3px);
  }

  .hp-feat-icon {
    font-size: 28px;
    margin-bottom: 16px;
    display: block;
  }

  .hp-feat-card h3 {
    font-family: var(--mk-font-display);
    font-size: 17px;
    font-weight: 600;
    color: var(--mk-fg);
    letter-spacing: -0.01em;
    margin-bottom: 10px;
  }

  .hp-feat-card p { color: var(--mk-muted); font-size: 14px; line-height: 1.65; }

  /* ── Testimonials ── */
  .hp-testimonials {
    padding: 100px 5%;
    background: var(--mk-bg2);
  }
  .hp-test-header { text-align: center; margin-bottom: 56px; }

  .hp-test-grid {
    display: grid;
    grid-template-columns: repeat(3, 1fr);
    gap: 20px;
    max-width: 1100px;
    margin: 0 auto;
  }

  .hp-test-card {
    background: var(--mk-surface);
    border: 1px solid var(--mk-border);
    border-radius: var(--mk-radius-lg);
    padding: 28px;
  }

  .hp-test-stars { color: #fbbf24; font-size: 14px; margin-bottom: 14px; letter-spacing: 2px; }

  .hp-test-quote {
    color: var(--mk-fg2);
    font-size: 14.5px;
    line-height: 1.7;
    margin-bottom: 20px;
    font-style: italic;
  }

  .hp-test-author {
    display: flex;
    align-items: center;
    gap: 12px;
    border-top: 1px solid var(--mk-border);
    padding-top: 16px;
  }

  .hp-test-avatar {
    width: 38px;
    height: 38px;
    border-radius: 50%;
    background: linear-gradient(135deg, #1d4ed8, #4f8ef7);
    display: flex;
    align-items: center;
    justify-content: center;
    font-family: var(--mk-font-display);
    font-weight: 700;
    font-size: 14px;
    color: #fff;
    flex-shrink: 0;
  }

  .hp-test-name { font-size: 14px; font-weight: 600; color: var(--mk-fg); }
  .hp-test-role { font-size: 12px; color: var(--mk-muted); }

  /* ── FAQ ── */
  .hp-faq { padding: 100px 5%; max-width: 780px; margin: 0 auto; }
  .hp-faq-header { text-align: center; margin-bottom: 48px; }

  .hp-faq-item {
    border-bottom: 1px solid var(--mk-border);
    padding: 22px 0;
  }

  .hp-faq-item:first-of-type { border-top: 1px solid var(--mk-border); }

  .hp-faq-q {
    font-family: var(--mk-font-display);
    font-size: 17px;
    font-weight: 600;
    color: var(--mk-fg);
    letter-spacing: -0.01em;
    cursor: pointer;
    display: flex;
    justify-content: space-between;
    align-items: center;
    gap: 12px;
    background: none;
    border: none;
    width: 100%;
    text-align: left;
    padding: 0;
  }

  .hp-faq-q:hover { color: var(--mk-blue-light); }
  .hp-faq-chevron { font-size: 12px; color: var(--mk-muted); transition: transform 0.2s; flex-shrink: 0; }
  .hp-faq-item.open .hp-faq-chevron { transform: rotate(180deg); }
  .hp-faq-a { color: var(--mk-fg2); font-size: 14.5px; line-height: 1.7; padding-top: 14px; }

  /* ── Final CTA ── */
  .hp-cta { padding: 100px 5%; }
  .hp-cta-inner {
    max-width: 1100px;
    margin: 0 auto;
  }

  /* responsive */
  @media (max-width: 900px) {
    .hp-pain-grid, .hp-how-grid, .hp-feat-grid,
    .hp-test-grid { grid-template-columns: 1fr; }
    .hp-stats-grid { grid-template-columns: 1fr 1fr; }
    .hp-mockup-body { grid-template-columns: 1fr; }
    .hp-mockup-sidebar { display: none; }
  }
`;

/* ── FAQ Item component ──────────────────────────────── */
function FaqItem({ q, a }) {
  const [open, setOpen] = React.useState(false);
  return (
    <div className={`hp-faq-item${open ? ' open' : ''}`}>
      <button className="hp-faq-q" onClick={() => setOpen(!open)}>
        {q}
        <span className="hp-faq-chevron">▼</span>
      </button>
      {open && <div className="hp-faq-a">{a}</div>}
    </div>
  );
}

/* ── Page ────────────────────────────────────────────── */
export default function HomePage() {
  useScrollReveal();

  return (
    <MarketingLayout>
      <style>{homeStyles}</style>

      {/* ── Hero ── */}
      <section className="hp-hero">
        <div className="hp-hero-bg" />
        <div className="hp-hero-inner">
          <div className="mk-eyebrow mk-reveal">Voice-First AI Collection Platform</div>

          <h1 className="hp-hero-tagline mk-reveal mk-reveal-delay-1">
            Stop chasing payments.<br />
            Let AI <span className="mk-blue-gradient">call for you.</span>
          </h1>

          <p className="hp-hero-sub mk-reveal mk-reveal-delay-2">
            ConvDash turns overdue bills into resolved conversations — automatically.
            AI voice reminders, real-time tracking, and smart collections for businesses
            that have better things to do than follow up manually.
          </p>

          <div className="hp-hero-actions mk-reveal mk-reveal-delay-3">
            <Link to="/signup" className="hp-try-btn">
              Start for Free
              <svg width="14" height="14" viewBox="0 0 16 16" fill="currentColor"><path d="M3 8h10M9 4l4 4-4 4"/><path d="M9 4l4 4-4 4" stroke="currentColor" strokeWidth="1.5" fill="none"/></svg>
            </Link>
            <Link to="/features" className="hp-watch-btn">
              ▶ See how it works
            </Link>
          </div>

          {/* Browser mockup */}
          <div className="hp-mockup mk-reveal mk-reveal-delay-4">
            <div className="hp-mockup-bar">
              <div className="hp-mockup-dot red"/>
              <div className="hp-mockup-dot amber"/>
              <div className="hp-mockup-dot green"/>
              <div className="hp-mockup-url">app.convdash.ai/dashboard</div>
            </div>
            <div className="hp-mockup-body">
              <div className="hp-mockup-sidebar">
                <div className="hp-mockup-nav active">Conversations</div>
                <div className="hp-mockup-nav">Finance</div>
                <div className="hp-mockup-nav">Analytics</div>
                <div className="hp-mockup-nav">Settings</div>
              </div>
              <div className="hp-mockup-main">
                {[
                  { title: 'Electricity Bill', pill: 'Active', pillClass: 'blue', amount: '₹2,340' },
                  { title: 'Rent — April',     pill: 'Overdue', pillClass: 'amber', amount: '₹15,000' },
                  { title: 'Netflix',           pill: 'Paid',   pillClass: 'green', amount: '₹499' },
                ].map((item, i) => (
                  <div className="hp-mockup-card" key={i}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
                      <div className="hp-mockup-line w70" style={{ margin: 0 }} />
                      <span className={`hp-mockup-pill ${item.pillClass}`}>{item.pill}</span>
                    </div>
                    <div className="hp-mockup-line w50" />
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                      <div className="hp-mockup-line w40" style={{ marginBottom: 0 }} />
                      <span style={{ fontSize: 11, fontFamily: 'var(--mk-font-mono)', color: '#7aacf8' }}>{item.amount}</span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ── Social proof bar ── */}
      <div className="hp-proof">
        {['500+ businesses trust ConvDash', 'Avg 3× faster collection', 'Zero cold-call awkwardness', 'Voice + Text channels', '99.9% uptime SLA'].map((t, i) => (
          <div key={i} className="hp-proof-item">{t}</div>
        ))}
      </div>

      {/* ── Pain vs Solution ── */}
      <section className="hp-pain">
        <div style={{ position: 'absolute', top: 0, left: '30%', width: 500, height: 400, borderRadius: '50%', background: 'radial-gradient(circle, rgba(29,78,216,0.07), transparent)', pointerEvents: 'none' }} />
        <div className="hp-pain-grid mk-container">
          <div>
            <div className="mk-eyebrow mk-reveal">The Old Way</div>
            <h2 className="mk-heading-lg mk-reveal mk-reveal-delay-1" style={{ marginBottom: 0 }}>
              Manual follow-ups<br />
              are <span style={{ color: '#f87171' }}>killing</span> your cash flow
            </h2>
            <div className="hp-pain-list">
              {[
                ['', 'Hours spent on phone calls that go unanswered'],
                ['', 'Spreadsheets full of overdue dues with no action plan'],
                ['', 'Forgetting who you called and what was agreed'],
                ['', 'Late payments snowballing into cash flow crises'],
              ].map(([icon, text], i) => (
                <div className={`hp-pain-item mk-reveal mk-reveal-delay-${i + 1}`} key={i}>
                  <span className="hp-pain-item-icon"></span>
                  <p>{text}</p>
                </div>
              ))}
            </div>
          </div>

          <div>
            <div className="mk-eyebrow mk-reveal">The ConvDash Way</div>
            <h2 className="mk-heading-lg mk-reveal mk-reveal-delay-1" style={{ marginBottom: 0 }}>
              AI handles it.<br />
              You just <span className="mk-blue-gradient">collect.</span>
            </h2>
            <div className="hp-sol-list">
              {[
                ['', 'AI voice assistant calls and speaks in the user\'s language'],
                ['', 'Real-time dashboard tracks every due, every reminder'],
                ['', 'Automatic smart reminders — voice, text, multi-channel'],
                ['', 'Snooze, pay, or dismiss — one click or one word'],
              ].map(([icon, text], i) => (
                <div className={`hp-sol-item mk-reveal mk-reveal-delay-${i + 1}`} key={i}>
                  <span className="hp-sol-item-icon"></span>
                  <p>{text}</p>
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* ── How it works ── */}
      <section style={{ padding: '100px 5%', background: 'var(--mk-bg)' }}>
        <div className="mk-container">
          <div className="hp-how-header mk-reveal">
            <div className="mk-eyebrow" style={{ margin: '0 auto 20px' }}>How It Works</div>
            <h2 className="mk-heading-lg">From due to done in<br /><span className="mk-blue-gradient">four simple steps</span></h2>
          </div>

          <div className="hp-how-grid">
            <div className="mk-steps">
              {[
                ['01', 'Add your dues', 'Create due entries manually or import from your billing system. Add title, amount, due date, and customer contact.'],
                ['02', 'AI takes over reminders', 'ConvDash\'s voice assistant automatically calls or messages customers before and after due dates.'],
                ['03', 'Customer responds by voice', 'Customers speak naturally — "pay now", "snooze 7 days", "dispute" — and AI understands and acts.'],
                ['04', 'You track everything', 'Dashboard updates in real-time. See what\'s paid, what\'s pending, what needs your attention.'],
              ].map(([num, title, desc], i) => (
                <div className={`mk-step mk-reveal mk-reveal-delay-${i + 1}`} key={i}>
                  <div className="mk-step-left">
                    <div className="mk-step-dot">{num}</div>
                    {i < 3 && <div className="mk-step-line" />}
                  </div>
                  <div className="mk-step-body">
                    <h3>{title}</h3>
                    <p>{desc}</p>
                  </div>
                </div>
              ))}
            </div>

            <div className="mk-reveal mk-reveal-right" style={{ position: 'sticky', top: '100px', display: 'flex', flexDirection: 'column', gap: '16px' }}>
              {/* Visual preview cards */}
              {[
                { label: 'Reminder sent', time: '09:00 AM', detail: 'Electricity Bill — ₹2,340 due today', color: '#4f8ef7' },
                { label: 'Customer replied', time: '09:04 AM', detail: '"Snooze it for 3 days please"', color: '#2dd4bf' },
                { label: 'AI confirmed', time: '09:04 AM', detail: 'Snoozed until April 6th. Reminder set.', color: '#22c55e' },
              ].map((ev, i) => (
                <div key={i} className="mk-card" style={{ padding: '18px 20px', borderLeft: `3px solid ${ev.color}` }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 6 }}>
                    <span style={{ fontSize: 12, fontWeight: 600, color: ev.color }}>{ev.label}</span>
                    <span style={{ fontSize: 11, fontFamily: 'var(--mk-font-mono)', color: 'var(--mk-dim)' }}>{ev.time}</span>
                  </div>
                  <p style={{ fontSize: 13.5, color: 'var(--mk-fg2)', lineHeight: 1.5 }}>{ev.detail}</p>
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* ── Stats band ── */}
      <section className="hp-stats">
        <div className="hp-stats-grid">
          {[
            ['3×', 'Faster recovery vs manual calling'],
            ['80%', 'Reduction in follow-up time'],
            ['₹0', 'Cost per automated voice reminder'],
            ['24/7', 'AI available, even on weekends'],
          ].map(([num, label], i) => (
            <div className={`hp-stat-cell mk-reveal mk-reveal-delay-${i + 1}`} key={i}>
              <div className="hp-stat-num">{num}</div>
              <div className="hp-stat-label">{label}</div>
            </div>
          ))}
        </div>
      </section>

      {/* ── Feature grid ── */}
      <section className="hp-features">
        <div className="hp-features-header mk-reveal">
          <div className="mk-eyebrow" style={{ margin: '0 auto 20px' }}>Everything You Need</div>
          <h2 className="mk-heading-lg">Built for serious<br /><span className="mk-blue-gradient">collections teams</span></h2>
          <p className="mk-body" style={{ marginTop: 16 }}>No more duct-taping spreadsheets and phone calls together.</p>
        </div>

        <div className="hp-feat-grid">
          {[
            ['', 'Voice-First AI', 'Conversational voice reminders in natural language. Customers respond by speaking, not typing forms.'],
            ['', 'Real-Time Dashboard', 'See every due, every reminder, every outcome — live. No refresh required.'],
            ['', 'Smart Automation', 'Reminder rules, escalation paths, snooze handling — all automated based on customer responses.'],
            ['', 'Analytics Built In', 'Track recovery rates, payment delays, and cash flow trends without a separate BI tool.'],
            ['', 'Secure by Design', 'JWT auth, encrypted storage, role-based access. Your data never leaves your account.'],
            ['', 'Multi-Channel Ready', 'Voice today. WhatsApp, SMS, and email coming. One platform, every channel.'],
          ].map(([icon, title, desc], i) => (
            <div className={`hp-feat-card mk-reveal mk-reveal-delay-${(i % 3) + 1}`} key={i}>
              <span className="hp-feat-icon"></span>
              <h3>{title}</h3>
              <p>{desc}</p>
            </div>
          ))}
        </div>
      </section>

      {/* ── Testimonials ── */}
      <section className="hp-testimonials">
        <div className="hp-test-header mk-reveal">
          <div className="mk-eyebrow" style={{ margin: '0 auto 20px' }}>Early Feedback</div>
          <h2 className="mk-heading-lg">What teams are <span className="mk-blue-gradient">saying</span></h2>
        </div>

        <div className="hp-test-grid">
          {[
            {
              quote: 'We used to have a full-time person just for payment follow-ups. ConvDash handled the same workload in the first week.',
              name: 'Priya S.', role: 'Finance Manager, EduTech Startup', initials: 'PS'
            },
            {
              quote: 'The voice AI is shockingly natural. Our customers actually pick up and respond. We never had that with SMS reminders.',
              name: 'Rahul M.', role: 'Founder, Collection Agency', initials: 'RM'
            },
            {
              quote: 'The analytics tab alone saved us from two missed payment cycles. Now I open ConvDash before my email every morning.',
              name: 'Ankit J.', role: 'CFO, Housing Society Manager', initials: 'AJ'
            },
          ].map((t, i) => (
            <div className={`hp-test-card mk-reveal mk-reveal-delay-${i + 1}`} key={i}>
              <div className="hp-test-stars">5/5</div>
              <p className="hp-test-quote">"{t.quote}"</p>
              <div className="hp-test-author">
                <div className="hp-test-avatar">{t.initials}</div>
                <div>
                  <div className="hp-test-name">{t.name}</div>
                  <div className="hp-test-role">{t.role}</div>
                </div>
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* ── FAQ ── */}
      <section style={{ padding: '100px 5%', background: 'var(--mk-bg)' }}>
        <div style={{ maxWidth: 780, margin: '0 auto' }}>
          <div className="mk-reveal" style={{ textAlign: 'center', marginBottom: 48 }}>
            <div className="mk-eyebrow" style={{ margin: '0 auto 20px' }}>Common Questions</div>
            <h2 className="mk-heading-lg">FAQ</h2>
          </div>

          {[
            ['Do I need to set up a call center?', 'No. ConvDash\'s AI voice system handles all outbound reminder calls automatically. No human agents required.'],
            ['What languages does the AI support?', 'English is fully supported. Hindi, Tamil, and regional language support is on the roadmap for Q3 2026.'],
            ['What happens if the voice AI fails?', 'The system gracefully falls back to text reminders. Every reminder event is logged regardless of delivery channel.'],
            ['Can I customize reminder scripts?', 'Yes. You control the tone, timing, and content of each reminder type — upcoming, due today, and overdue.'],
            ['Is my customer data safe?', 'Fully. We use JWT authentication, encrypted databases, and never share customer data with third parties.'],
            ['Can this integrate with my existing billing system?', 'Import via CSV today. API and webhook integrations for Tally, Zoho, and QuickBooks are coming in the next release.'],
          ].map(([q, a], i) => (
            <FaqItem key={i} q={q} a={a} />
          ))}
        </div>
      </section>

      {/* ── Final CTA ── */}
      <section className="hp-cta">
        <div className="hp-cta-inner">
          <div className="mk-cta-band mk-reveal">
            <div className="mk-eyebrow" style={{ margin: '0 auto 20px' }}>Ready to stop chasing?</div>
            <h2 className="mk-heading-lg" style={{ marginBottom: 16 }}>
              Start recovering payments<br />
              <span className="mk-blue-gradient">while you sleep.</span>
            </h2>
            <p className="mk-body" style={{ maxWidth: 500, margin: '0 auto 36px' }}>
              Free to start. No credit card. No code. Just a smarter way to collect.
            </p>
            <div style={{ display: 'flex', gap: 14, justifyContent: 'center', flexWrap: 'wrap' }}>
              <Link to="/signup" className="hp-try-btn">Get Started Free →</Link>
              <Link to="/pricing" className="hp-watch-btn">View Pricing</Link>
            </div>
          </div>
        </div>
      </section>
    </MarketingLayout>
  );
}
