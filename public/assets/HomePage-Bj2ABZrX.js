import{i as e,l as t,s as n,t as r}from"./index-BrmJLYJY.js";import{n as i,t as a}from"./MarketingLayout--bX8xOLc.js";var o=t(n(),1),s=r(),c=`
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
    position: relative;
    overflow: hidden;
  }

  .hp-testimonials::before {
    content: '';
    position: absolute;
    top: -200px;
    left: 50%;
    transform: translateX(-50%);
    width: 900px;
    height: 500px;
    background: radial-gradient(ellipse, rgba(79,142,247,0.06) 0%, transparent 70%);
    pointer-events: none;
  }

  .hp-test-header { text-align: center; margin-bottom: 56px; }

  .hp-test-subline {
    font-size: 14px;
    color: var(--mk-muted);
    margin-top: 12px;
    display: flex;
    align-items: center;
    justify-content: center;
    gap: 6px;
  }

  .hp-test-subline-dot {
    width: 5px; height: 5px; border-radius: 50%; background: #22c55e; display: inline-block;
  }

  .hp-test-grid {
    display: grid;
    grid-template-columns: repeat(3, 1fr);
    gap: 20px;
    max-width: 1100px;
    margin: 0 auto 40px;
  }

  .hp-test-card {
    background: var(--mk-surface);
    border: 1px solid var(--mk-border);
    border-radius: var(--mk-radius-lg);
    padding: 28px;
    transition: border-color 0.2s, transform 0.2s, box-shadow 0.2s;
    position: relative;
    overflow: hidden;
  }

  .hp-test-card::before {
    content: '“';
    position: absolute;
    top: -10px;
    right: 20px;
    font-size: 100px;
    font-family: Georgia, serif;
    color: rgba(79,142,247,0.07);
    line-height: 1;
    pointer-events: none;
  }

  .hp-test-card:hover {
    border-color: rgba(79,142,247,0.28);
    transform: translateY(-3px);
    box-shadow: 0 16px 48px rgba(4,8,16,0.5);
  }

  .hp-test-card-top {
    display: flex;
    align-items: center;
    justify-content: space-between;
    margin-bottom: 14px;
  }

  .hp-test-stars { color: #fbbf24; font-size: 15px; letter-spacing: 1px; }

  .hp-verified-badge {
    display: inline-flex;
    align-items: center;
    gap: 4px;
    background: rgba(34,197,94,0.1);
    border: 1px solid rgba(34,197,94,0.25);
    color: #22c55e;
    font-size: 10.5px;
    font-weight: 600;
    font-family: var(--mk-font-mono);
    padding: 3px 8px;
    border-radius: 999px;
    letter-spacing: 0.02em;
  }

  .hp-test-quote {
    color: var(--mk-fg2);
    font-size: 14.5px;
    line-height: 1.7;
    margin-bottom: 18px;
    font-style: italic;
  }

  .hp-test-metrics {
    display: flex;
    gap: 10px;
    margin-bottom: 18px;
    flex-wrap: wrap;
  }

  .hp-test-metric {
    background: rgba(79,142,247,0.08);
    border: 1px solid rgba(79,142,247,0.16);
    border-radius: 8px;
    padding: 7px 11px;
    flex: 1;
    min-width: 90px;
  }

  .hp-test-metric-label {
    font-size: 10px;
    color: var(--mk-muted);
    font-family: var(--mk-font-mono);
    margin-bottom: 3px;
    text-transform: uppercase;
    letter-spacing: 0.04em;
  }

  .hp-test-metric-val {
    font-size: 14px;
    font-weight: 700;
    color: #4f8ef7;
    font-family: var(--mk-font-display);
  }

  .hp-test-metric-val.green { color: #22c55e; }

  .hp-test-author {
    display: flex;
    align-items: center;
    gap: 12px;
    border-top: 1px solid var(--mk-border);
    padding-top: 16px;
  }

  .hp-test-avatar {
    width: 40px;
    height: 40px;
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
    border: 2px solid rgba(79,142,247,0.3);
  }

  .hp-test-name { font-size: 14px; font-weight: 600; color: var(--mk-fg); }
  .hp-test-role { font-size: 12px; color: var(--mk-muted); }

  /* ── Submit Review CTA ── */
  .hp-review-cta {
    max-width: 1100px;
    margin: 0 auto;
    display: flex;
    align-items: center;
    justify-content: space-between;
    flex-wrap: wrap;
    gap: 16px;
    background: linear-gradient(135deg, rgba(29,78,216,0.12), rgba(79,142,247,0.06));
    border: 1px solid rgba(79,142,247,0.2);
    border-radius: var(--mk-radius-lg);
    padding: 24px 32px;
  }

  .hp-review-cta-text h3 {
    font-family: var(--mk-font-display);
    font-size: 17px;
    font-weight: 600;
    color: var(--mk-fg);
    margin-bottom: 4px;
    letter-spacing: -0.01em;
  }

  .hp-review-cta-text p {
    font-size: 13.5px;
    color: var(--mk-muted);
  }

  .hp-review-submit-btn {
    padding: 11px 24px;
    font-size: 14px;
    font-weight: 600;
    font-family: var(--mk-font-body);
    border-radius: var(--mk-radius-pill);
    border: none;
    background: linear-gradient(135deg, #1d4ed8, #4f8ef7);
    color: #fff;
    cursor: pointer;
    display: inline-flex;
    align-items: center;
    gap: 8px;
    box-shadow: 0 4px 20px rgba(79,142,247,0.35);
    transition: all 0.18s;
    white-space: nowrap;
    flex-shrink: 0;
  }
  .hp-review-submit-btn:hover { transform: translateY(-2px); box-shadow: 0 8px 32px rgba(79,142,247,0.5); }

  /* ── Review Modal ── */
  .hp-modal-overlay {
    position: fixed;
    inset: 0;
    background: rgba(4,8,16,0.75);
    backdrop-filter: blur(6px);
    -webkit-backdrop-filter: blur(6px);
    z-index: 1000;
    display: flex;
    align-items: center;
    justify-content: center;
    padding: 20px;
    animation: fadeIn 0.2s ease;
  }

  @keyframes fadeIn { from { opacity: 0; } to { opacity: 1; } }
  @keyframes slideUp { from { opacity: 0; transform: translateY(24px); } to { opacity: 1; transform: translateY(0); } }

  .hp-modal {
    background: #0a1528;
    border: 1px solid rgba(79,142,247,0.25);
    border-radius: 20px;
    padding: 36px;
    width: 100%;
    max-width: 520px;
    box-shadow: 0 40px 100px rgba(4,8,16,0.8), 0 0 0 1px rgba(79,142,247,0.1);
    animation: slideUp 0.25s ease;
    position: relative;
  }

  .hp-modal-close {
    position: absolute;
    top: 16px;
    right: 16px;
    background: rgba(255,255,255,0.06);
    border: 1px solid rgba(255,255,255,0.1);
    border-radius: 8px;
    color: var(--mk-muted);
    font-size: 16px;
    width: 32px;
    height: 32px;
    display: flex;
    align-items: center;
    justify-content: center;
    cursor: pointer;
    transition: all 0.15s;
  }
  .hp-modal-close:hover { color: var(--mk-fg); background: rgba(255,255,255,0.1); }

  .hp-modal h3 {
    font-family: var(--mk-font-display);
    font-size: 22px;
    font-weight: 700;
    color: var(--mk-fg);
    letter-spacing: -0.02em;
    margin-bottom: 4px;
  }

  .hp-modal-sub {
    font-size: 14px;
    color: var(--mk-muted);
    margin-bottom: 28px;
  }

  .hp-modal-field { margin-bottom: 18px; }

  .hp-modal-label {
    font-size: 12px;
    font-weight: 600;
    color: var(--mk-fg2);
    font-family: var(--mk-font-mono);
    text-transform: uppercase;
    letter-spacing: 0.05em;
    margin-bottom: 7px;
    display: block;
  }

  .hp-modal-input, .hp-modal-textarea {
    width: 100%;
    background: rgba(255,255,255,0.04);
    border: 1px solid rgba(79,142,247,0.2);
    border-radius: 10px;
    color: var(--mk-fg);
    font-family: var(--mk-font-body);
    font-size: 14px;
    padding: 11px 14px;
    outline: none;
    transition: border-color 0.15s;
    box-sizing: border-box;
  }
  .hp-modal-input:focus, .hp-modal-textarea:focus {
    border-color: rgba(79,142,247,0.5);
    background: rgba(79,142,247,0.04);
  }
  .hp-modal-textarea { resize: vertical; min-height: 100px; line-height: 1.6; }

  .hp-modal-star-row {
    display: flex;
    gap: 6px;
    margin-bottom: 4px;
  }

  .hp-modal-star {
    font-size: 28px;
    cursor: pointer;
    transition: transform 0.12s, color 0.12s;
    user-select: none;
    color: rgba(251,191,36,0.25);
    line-height: 1;
  }
  .hp-modal-star.active { color: #fbbf24; }
  .hp-modal-star:hover { transform: scale(1.2); }

  .hp-modal-star-label {
    font-size: 12px;
    color: var(--mk-muted);
    margin-top: 6px;
    min-height: 16px;
  }

  .hp-modal-actions {
    display: flex;
    gap: 10px;
    margin-top: 24px;
  }

  .hp-modal-cancel {
    flex: 1;
    padding: 11px;
    font-size: 14px;
    font-family: var(--mk-font-body);
    border-radius: 10px;
    border: 1px solid rgba(255,255,255,0.1);
    background: transparent;
    color: var(--mk-muted);
    cursor: pointer;
    transition: all 0.15s;
  }
  .hp-modal-cancel:hover { background: rgba(255,255,255,0.05); color: var(--mk-fg); }

  .hp-modal-send {
    flex: 2;
    padding: 11px;
    font-size: 14px;
    font-weight: 600;
    font-family: var(--mk-font-body);
    border-radius: 10px;
    border: none;
    background: linear-gradient(135deg, #1d4ed8, #4f8ef7);
    color: #fff;
    cursor: pointer;
    transition: all 0.18s;
    box-shadow: 0 4px 16px rgba(79,142,247,0.3);
  }
  .hp-modal-send:hover { box-shadow: 0 6px 24px rgba(79,142,247,0.5); transform: translateY(-1px); }
  .hp-modal-send:disabled { opacity: 0.5; cursor: not-allowed; transform: none; }

  .hp-modal-success {
    text-align: center;
    padding: 20px 0;
  }

  .hp-modal-success-icon {
    font-size: 48px;
    margin-bottom: 16px;
    display: block;
    animation: popIn 0.4s cubic-bezier(0.34, 1.56, 0.64, 1);
  }
  @keyframes popIn { from { transform: scale(0.5); opacity: 0; } to { transform: scale(1); opacity: 1; } }

  .hp-modal-success h4 {
    font-family: var(--mk-font-display);
    font-size: 20px;
    font-weight: 700;
    color: var(--mk-fg);
    margin-bottom: 8px;
    letter-spacing: -0.01em;
  }

  .hp-modal-success p {
    font-size: 14px;
    color: var(--mk-muted);
    line-height: 1.6;
  }

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
`;function l({q:e,a:t}){let[n,r]=o.useState(!1);return(0,s.jsxs)(`div`,{className:`hp-faq-item${n?` open`:``}`,children:[(0,s.jsxs)(`button`,{className:`hp-faq-q`,onClick:()=>r(!n),children:[e,(0,s.jsx)(`span`,{className:`hp-faq-chevron`,children:`▼`})]}),n&&(0,s.jsx)(`div`,{className:`hp-faq-a`,children:t})]})}var u=[``,`Poor`,`Fair`,`Good`,`Great`,`Outstanding!`],d=[{quote:`We used to have a full-time person just for payment follow-ups. ConvDash handled the same workload in the first week — and recovered more.`,name:`Priya S.`,role:`Finance Manager, EduTech Startup`,initials:`PS`,stars:5,metrics:[{label:`Recovery Time`,before:`42 days`,after:`14 days`,isGood:!0},{label:`Manual Calls`,before:`80/week`,after:`0/week`,isGood:!0}],avatarGrad:`linear-gradient(135deg, #1d4ed8, #7c3aed)`},{quote:`The voice AI is shockingly natural. Our customers actually pick up and respond. We never had that response rate with SMS reminders.`,name:`Rahul M.`,role:`Founder, Collection Agency`,initials:`RM`,stars:5,metrics:[{label:`Pick-up Rate`,before:`18%`,after:`61%`,isGood:!0},{label:`Monthly Recovered`,before:`₹1.2L`,after:`₹4.8L`,isGood:!0}],avatarGrad:`linear-gradient(135deg, #0d9488, #1d4ed8)`},{quote:`The analytics tab alone saved us from two missed payment cycles. I now open ConvDash before my email every single morning.`,name:`Ankit J.`,role:`CFO, Housing Society`,initials:`AJ`,stars:5,metrics:[{label:`Missed Cycles`,before:`3/quarter`,after:`0/quarter`,isGood:!0},{label:`Overdue Amount`,before:`₹8.4L`,after:`₹1.1L`,isGood:!0}],avatarGrad:`linear-gradient(135deg, #b45309, #d97706)`}];function f({onClose:e}){let[t,n]=o.useState(0),[r,i]=o.useState(0),[a,c]=o.useState(``),[l,d]=o.useState(``),[f,p]=o.useState(``),[m,h]=o.useState(!1),g=r||t,_=t>0&&a.trim().length>0&&f.trim().length>10;function v(){_&&h(!0)}function y(t){t.target===t.currentTarget&&e()}return o.useEffect(()=>{let t=t=>{t.key===`Escape`&&e()};return window.addEventListener(`keydown`,t),()=>window.removeEventListener(`keydown`,t)},[e]),(0,s.jsx)(`div`,{className:`hp-modal-overlay`,onClick:y,children:(0,s.jsxs)(`div`,{className:`hp-modal`,children:[(0,s.jsx)(`button`,{className:`hp-modal-close`,onClick:e,"aria-label":`Close`,children:`✕`}),m?(0,s.jsxs)(`div`,{className:`hp-modal-success`,children:[(0,s.jsx)(`span`,{className:`hp-modal-success-icon`,children:`🎉`}),(0,s.jsxs)(`h4`,{children:[`Thank you, `,a.split(` `)[0],`!`]}),(0,s.jsx)(`p`,{children:`Your review has been submitted and will appear on this page after a quick verification. We really appreciate you taking the time.`})]}):(0,s.jsxs)(s.Fragment,{children:[(0,s.jsx)(`h3`,{children:`Share Your Experience`}),(0,s.jsx)(`p`,{className:`hp-modal-sub`,children:`Your honest feedback helps other teams discover ConvDash.`}),(0,s.jsxs)(`div`,{className:`hp-modal-field`,children:[(0,s.jsx)(`span`,{className:`hp-modal-label`,children:`Your Rating`}),(0,s.jsx)(`div`,{className:`hp-modal-star-row`,children:[1,2,3,4,5].map(e=>(0,s.jsx)(`span`,{className:`hp-modal-star${g>=e?` active`:``}`,onClick:()=>n(e),onMouseEnter:()=>i(e),onMouseLeave:()=>i(0),children:`★`},e))}),(0,s.jsx)(`div`,{className:`hp-modal-star-label`,children:g>0?u[g]:`Click to rate`})]}),(0,s.jsxs)(`div`,{className:`hp-modal-field`,children:[(0,s.jsx)(`label`,{className:`hp-modal-label`,htmlFor:`rev-name`,children:`Full Name`}),(0,s.jsx)(`input`,{id:`rev-name`,className:`hp-modal-input`,placeholder:`e.g. Priya Sharma`,value:a,onChange:e=>c(e.target.value)})]}),(0,s.jsxs)(`div`,{className:`hp-modal-field`,children:[(0,s.jsx)(`label`,{className:`hp-modal-label`,htmlFor:`rev-role`,children:`Role & Company`}),(0,s.jsx)(`input`,{id:`rev-role`,className:`hp-modal-input`,placeholder:`e.g. Finance Manager, EduTech Startup`,value:l,onChange:e=>d(e.target.value)})]}),(0,s.jsxs)(`div`,{className:`hp-modal-field`,children:[(0,s.jsx)(`label`,{className:`hp-modal-label`,htmlFor:`rev-text`,children:`Your Review`}),(0,s.jsx)(`textarea`,{id:`rev-text`,className:`hp-modal-textarea`,placeholder:`Tell us how ConvDash changed your collections workflow...`,value:f,onChange:e=>p(e.target.value)})]}),(0,s.jsxs)(`div`,{className:`hp-modal-actions`,children:[(0,s.jsx)(`button`,{className:`hp-modal-cancel`,onClick:e,children:`Cancel`}),(0,s.jsx)(`button`,{className:`hp-modal-send`,disabled:!_,onClick:v,children:`✦ Submit Review`})]})]})]})})}function p(){let[e,t]=o.useState(!1);return(0,s.jsxs)(`section`,{className:`hp-testimonials`,children:[(0,s.jsxs)(`div`,{className:`hp-test-header mk-reveal`,children:[(0,s.jsx)(`div`,{className:`mk-eyebrow`,style:{margin:`0 auto 20px`},children:`Wall of Love`}),(0,s.jsxs)(`h2`,{className:`mk-heading-lg`,children:[`What teams are `,(0,s.jsx)(`span`,{className:`mk-blue-gradient`,children:`saying`})]}),(0,s.jsxs)(`div`,{className:`hp-test-subline`,children:[(0,s.jsx)(`span`,{className:`hp-test-subline-dot`}),`All reviews are verified ConvDash users`]})]}),(0,s.jsx)(`div`,{className:`hp-test-grid`,children:d.map((e,t)=>(0,s.jsxs)(`div`,{className:`hp-test-card mk-reveal mk-reveal-delay-${t+1}`,children:[(0,s.jsxs)(`div`,{className:`hp-test-card-top`,children:[(0,s.jsx)(`div`,{className:`hp-test-stars`,children:`★`.repeat(e.stars)}),(0,s.jsx)(`span`,{className:`hp-verified-badge`,children:`✓ Verified User`})]}),(0,s.jsxs)(`p`,{className:`hp-test-quote`,children:[`"`,e.quote,`"`]}),(0,s.jsx)(`div`,{className:`hp-test-metrics`,children:e.metrics.map((e,t)=>(0,s.jsxs)(`div`,{className:`hp-test-metric`,children:[(0,s.jsx)(`div`,{className:`hp-test-metric-label`,children:e.label}),(0,s.jsx)(`div`,{className:`hp-test-metric-val`,style:{color:`#94a3b8`,textDecoration:`line-through`,fontSize:11,fontWeight:400},children:e.before}),(0,s.jsx)(`div`,{className:`hp-test-metric-val${e.isGood?` green`:``}`,children:e.after})]},t))}),(0,s.jsxs)(`div`,{className:`hp-test-author`,children:[(0,s.jsx)(`div`,{className:`hp-test-avatar`,style:{background:e.avatarGrad},children:e.initials}),(0,s.jsxs)(`div`,{children:[(0,s.jsx)(`div`,{className:`hp-test-name`,children:e.name}),(0,s.jsx)(`div`,{className:`hp-test-role`,children:e.role})]})]})]},t))}),(0,s.jsxs)(`div`,{className:`hp-review-cta mk-reveal`,children:[(0,s.jsxs)(`div`,{className:`hp-review-cta-text`,children:[(0,s.jsx)(`h3`,{children:`Using ConvDash? We'd love your story.`}),(0,s.jsx)(`p`,{children:`Share your experience and get featured on this page. Takes less than 2 minutes.`})]}),(0,s.jsx)(`button`,{id:`open-review-modal-btn`,className:`hp-review-submit-btn`,onClick:()=>t(!0),children:`✦ Write a Review`})]}),e&&(0,s.jsx)(f,{onClose:()=>t(!1)})]})}function m(){return i(),(0,s.jsxs)(a,{children:[(0,s.jsx)(`style`,{children:c}),(0,s.jsxs)(`section`,{className:`hp-hero`,children:[(0,s.jsx)(`div`,{className:`hp-hero-bg`}),(0,s.jsxs)(`div`,{className:`hp-hero-inner`,children:[(0,s.jsx)(`div`,{className:`mk-eyebrow mk-reveal`,children:`Voice-First AI Collection Platform`}),(0,s.jsxs)(`h1`,{className:`hp-hero-tagline mk-reveal mk-reveal-delay-1`,children:[`Stop chasing payments.`,(0,s.jsx)(`br`,{}),`Let AI `,(0,s.jsx)(`span`,{className:`mk-blue-gradient`,children:`call for you.`})]}),(0,s.jsx)(`p`,{className:`hp-hero-sub mk-reveal mk-reveal-delay-2`,children:`ConvDash turns overdue bills into resolved conversations — automatically. AI voice reminders, real-time tracking, and smart collections for businesses that have better things to do than follow up manually.`}),(0,s.jsxs)(`div`,{className:`hp-hero-actions mk-reveal mk-reveal-delay-3`,children:[(0,s.jsxs)(e,{to:`/signup`,className:`hp-try-btn`,children:[`Start for Free`,(0,s.jsxs)(`svg`,{width:`14`,height:`14`,viewBox:`0 0 16 16`,fill:`currentColor`,children:[(0,s.jsx)(`path`,{d:`M3 8h10M9 4l4 4-4 4`}),(0,s.jsx)(`path`,{d:`M9 4l4 4-4 4`,stroke:`currentColor`,strokeWidth:`1.5`,fill:`none`})]})]}),(0,s.jsx)(e,{to:`/features`,className:`hp-watch-btn`,children:`▶ See how it works`})]}),(0,s.jsxs)(`div`,{className:`hp-mockup mk-reveal mk-reveal-delay-4`,children:[(0,s.jsxs)(`div`,{className:`hp-mockup-bar`,children:[(0,s.jsx)(`div`,{className:`hp-mockup-dot red`}),(0,s.jsx)(`div`,{className:`hp-mockup-dot amber`}),(0,s.jsx)(`div`,{className:`hp-mockup-dot green`}),(0,s.jsx)(`div`,{className:`hp-mockup-url`,children:`app.convdash.ai/dashboard`})]}),(0,s.jsxs)(`div`,{className:`hp-mockup-body`,children:[(0,s.jsxs)(`div`,{className:`hp-mockup-sidebar`,children:[(0,s.jsx)(`div`,{className:`hp-mockup-nav active`,children:`Conversations`}),(0,s.jsx)(`div`,{className:`hp-mockup-nav`,children:`Finance`}),(0,s.jsx)(`div`,{className:`hp-mockup-nav`,children:`Analytics`}),(0,s.jsx)(`div`,{className:`hp-mockup-nav`,children:`Settings`})]}),(0,s.jsx)(`div`,{className:`hp-mockup-main`,children:[{title:`Electricity Bill`,pill:`Active`,pillClass:`blue`,amount:`₹2,340`},{title:`Rent — April`,pill:`Overdue`,pillClass:`amber`,amount:`₹15,000`},{title:`Netflix`,pill:`Paid`,pillClass:`green`,amount:`₹499`}].map((e,t)=>(0,s.jsxs)(`div`,{className:`hp-mockup-card`,children:[(0,s.jsxs)(`div`,{style:{display:`flex`,justifyContent:`space-between`,alignItems:`center`,marginBottom:8},children:[(0,s.jsx)(`div`,{className:`hp-mockup-line w70`,style:{margin:0}}),(0,s.jsx)(`span`,{className:`hp-mockup-pill ${e.pillClass}`,children:e.pill})]}),(0,s.jsx)(`div`,{className:`hp-mockup-line w50`}),(0,s.jsxs)(`div`,{style:{display:`flex`,justifyContent:`space-between`,alignItems:`center`},children:[(0,s.jsx)(`div`,{className:`hp-mockup-line w40`,style:{marginBottom:0}}),(0,s.jsx)(`span`,{style:{fontSize:11,fontFamily:`var(--mk-font-mono)`,color:`#7aacf8`},children:e.amount})]})]},t))})]})]})]})]}),(0,s.jsx)(`div`,{className:`hp-proof`,children:[`500+ businesses trust ConvDash`,`Avg 3× faster collection`,`Zero cold-call awkwardness`,`Voice + Text channels`,`99.9% uptime SLA`].map((e,t)=>(0,s.jsx)(`div`,{className:`hp-proof-item`,children:e},t))}),(0,s.jsxs)(`section`,{className:`hp-pain`,children:[(0,s.jsx)(`div`,{style:{position:`absolute`,top:0,left:`30%`,width:500,height:400,borderRadius:`50%`,background:`radial-gradient(circle, rgba(29,78,216,0.07), transparent)`,pointerEvents:`none`}}),(0,s.jsxs)(`div`,{className:`hp-pain-grid mk-container`,children:[(0,s.jsxs)(`div`,{children:[(0,s.jsx)(`div`,{className:`mk-eyebrow mk-reveal`,children:`The Old Way`}),(0,s.jsxs)(`h2`,{className:`mk-heading-lg mk-reveal mk-reveal-delay-1`,style:{marginBottom:0},children:[`Manual follow-ups`,(0,s.jsx)(`br`,{}),`are `,(0,s.jsx)(`span`,{style:{color:`#f87171`},children:`killing`}),` your cash flow`]}),(0,s.jsx)(`div`,{className:`hp-pain-list`,children:[[``,`Hours spent on phone calls that go unanswered`],[``,`Spreadsheets full of overdue dues with no action plan`],[``,`Forgetting who you called and what was agreed`],[``,`Late payments snowballing into cash flow crises`]].map(([e,t],n)=>(0,s.jsxs)(`div`,{className:`hp-pain-item mk-reveal mk-reveal-delay-${n+1}`,children:[(0,s.jsx)(`span`,{className:`hp-pain-item-icon`}),(0,s.jsx)(`p`,{children:t})]},n))})]}),(0,s.jsxs)(`div`,{children:[(0,s.jsx)(`div`,{className:`mk-eyebrow mk-reveal`,children:`The ConvDash Way`}),(0,s.jsxs)(`h2`,{className:`mk-heading-lg mk-reveal mk-reveal-delay-1`,style:{marginBottom:0},children:[`AI handles it.`,(0,s.jsx)(`br`,{}),`You just `,(0,s.jsx)(`span`,{className:`mk-blue-gradient`,children:`collect.`})]}),(0,s.jsx)(`div`,{className:`hp-sol-list`,children:[[``,`AI voice assistant calls and speaks in the user's language`],[``,`Real-time dashboard tracks every due, every reminder`],[``,`Automatic smart reminders — voice, text, multi-channel`],[``,`Snooze, pay, or dismiss — one click or one word`]].map(([e,t],n)=>(0,s.jsxs)(`div`,{className:`hp-sol-item mk-reveal mk-reveal-delay-${n+1}`,children:[(0,s.jsx)(`span`,{className:`hp-sol-item-icon`}),(0,s.jsx)(`p`,{children:t})]},n))})]})]})]}),(0,s.jsx)(`section`,{style:{padding:`100px 5%`,background:`var(--mk-bg)`},children:(0,s.jsxs)(`div`,{className:`mk-container`,children:[(0,s.jsxs)(`div`,{className:`hp-how-header mk-reveal`,children:[(0,s.jsx)(`div`,{className:`mk-eyebrow`,style:{margin:`0 auto 20px`},children:`How It Works`}),(0,s.jsxs)(`h2`,{className:`mk-heading-lg`,children:[`From due to done in`,(0,s.jsx)(`br`,{}),(0,s.jsx)(`span`,{className:`mk-blue-gradient`,children:`four simple steps`})]})]}),(0,s.jsxs)(`div`,{className:`hp-how-grid`,children:[(0,s.jsx)(`div`,{className:`mk-steps`,children:[[`01`,`Add your dues`,`Create due entries manually or import from your billing system. Add title, amount, due date, and customer contact.`],[`02`,`AI takes over reminders`,`ConvDash's voice assistant automatically calls or messages customers before and after due dates.`],[`03`,`Customer responds by voice`,`Customers speak naturally — "pay now", "snooze 7 days", "dispute" — and AI understands and acts.`],[`04`,`You track everything`,`Dashboard updates in real-time. See what's paid, what's pending, what needs your attention.`]].map(([e,t,n],r)=>(0,s.jsxs)(`div`,{className:`mk-step mk-reveal mk-reveal-delay-${r+1}`,children:[(0,s.jsxs)(`div`,{className:`mk-step-left`,children:[(0,s.jsx)(`div`,{className:`mk-step-dot`,children:e}),r<3&&(0,s.jsx)(`div`,{className:`mk-step-line`})]}),(0,s.jsxs)(`div`,{className:`mk-step-body`,children:[(0,s.jsx)(`h3`,{children:t}),(0,s.jsx)(`p`,{children:n})]})]},r))}),(0,s.jsx)(`div`,{className:`mk-reveal mk-reveal-right`,style:{position:`sticky`,top:`100px`,display:`flex`,flexDirection:`column`,gap:`16px`},children:[{label:`Reminder sent`,time:`09:00 AM`,detail:`Electricity Bill — ₹2,340 due today`,color:`#4f8ef7`},{label:`Customer replied`,time:`09:04 AM`,detail:`"Snooze it for 3 days please"`,color:`#2dd4bf`},{label:`AI confirmed`,time:`09:04 AM`,detail:`Snoozed until April 6th. Reminder set.`,color:`#22c55e`}].map((e,t)=>(0,s.jsxs)(`div`,{className:`mk-card`,style:{padding:`18px 20px`,borderLeft:`3px solid ${e.color}`},children:[(0,s.jsxs)(`div`,{style:{display:`flex`,justifyContent:`space-between`,marginBottom:6},children:[(0,s.jsx)(`span`,{style:{fontSize:12,fontWeight:600,color:e.color},children:e.label}),(0,s.jsx)(`span`,{style:{fontSize:11,fontFamily:`var(--mk-font-mono)`,color:`var(--mk-dim)`},children:e.time})]}),(0,s.jsx)(`p`,{style:{fontSize:13.5,color:`var(--mk-fg2)`,lineHeight:1.5},children:e.detail})]},t))})]})]})}),(0,s.jsx)(`section`,{className:`hp-stats`,children:(0,s.jsx)(`div`,{className:`hp-stats-grid`,children:[[`3×`,`Faster recovery vs manual calling`],[`80%`,`Reduction in follow-up time`],[`₹0`,`Cost per automated voice reminder`],[`24/7`,`AI available, even on weekends`]].map(([e,t],n)=>(0,s.jsxs)(`div`,{className:`hp-stat-cell mk-reveal mk-reveal-delay-${n+1}`,children:[(0,s.jsx)(`div`,{className:`hp-stat-num`,children:e}),(0,s.jsx)(`div`,{className:`hp-stat-label`,children:t})]},n))})}),(0,s.jsxs)(`section`,{className:`hp-features`,children:[(0,s.jsxs)(`div`,{className:`hp-features-header mk-reveal`,children:[(0,s.jsx)(`div`,{className:`mk-eyebrow`,style:{margin:`0 auto 20px`},children:`Everything You Need`}),(0,s.jsxs)(`h2`,{className:`mk-heading-lg`,children:[`Built for serious`,(0,s.jsx)(`br`,{}),(0,s.jsx)(`span`,{className:`mk-blue-gradient`,children:`collections teams`})]}),(0,s.jsx)(`p`,{className:`mk-body`,style:{marginTop:16},children:`No more duct-taping spreadsheets and phone calls together.`})]}),(0,s.jsx)(`div`,{className:`hp-feat-grid`,children:[[``,`Voice-First AI`,`Conversational voice reminders in natural language. Customers respond by speaking, not typing forms.`],[``,`Real-Time Dashboard`,`See every due, every reminder, every outcome — live. No refresh required.`],[``,`Smart Automation`,`Reminder rules, escalation paths, snooze handling — all automated based on customer responses.`],[``,`Analytics Built In`,`Track recovery rates, payment delays, and cash flow trends without a separate BI tool.`],[``,`Secure by Design`,`JWT auth, encrypted storage, role-based access. Your data never leaves your account.`],[``,`Multi-Channel Ready`,`Voice today. WhatsApp, SMS, and email coming. One platform, every channel.`]].map(([e,t,n],r)=>(0,s.jsxs)(`div`,{className:`hp-feat-card mk-reveal mk-reveal-delay-${r%3+1}`,children:[(0,s.jsx)(`span`,{className:`hp-feat-icon`}),(0,s.jsx)(`h3`,{children:t}),(0,s.jsx)(`p`,{children:n})]},r))})]}),(0,s.jsx)(p,{}),(0,s.jsx)(`section`,{style:{padding:`100px 5%`,background:`var(--mk-bg)`},children:(0,s.jsxs)(`div`,{style:{maxWidth:780,margin:`0 auto`},children:[(0,s.jsxs)(`div`,{className:`mk-reveal`,style:{textAlign:`center`,marginBottom:48},children:[(0,s.jsx)(`div`,{className:`mk-eyebrow`,style:{margin:`0 auto 20px`},children:`Common Questions`}),(0,s.jsx)(`h2`,{className:`mk-heading-lg`,children:`FAQ`})]}),[[`Do I need to set up a call center?`,`No. ConvDash's AI voice system handles all outbound reminder calls automatically. No human agents required.`],[`What languages does the AI support?`,`English is fully supported. Hindi, Tamil, and regional language support is on the roadmap for Q3 2026.`],[`What happens if the voice AI fails?`,`The system gracefully falls back to text reminders. Every reminder event is logged regardless of delivery channel.`],[`Can I customize reminder scripts?`,`Yes. You control the tone, timing, and content of each reminder type — upcoming, due today, and overdue.`],[`Is my customer data safe?`,`Fully. We use JWT authentication, encrypted databases, and never share customer data with third parties.`],[`Can this integrate with my existing billing system?`,`Import via CSV today. API and webhook integrations for Tally, Zoho, and QuickBooks are coming in the next release.`]].map(([e,t],n)=>(0,s.jsx)(l,{q:e,a:t},n))]})}),(0,s.jsx)(`section`,{className:`hp-cta`,children:(0,s.jsx)(`div`,{className:`hp-cta-inner`,children:(0,s.jsxs)(`div`,{className:`mk-cta-band mk-reveal`,children:[(0,s.jsx)(`div`,{className:`mk-eyebrow`,style:{margin:`0 auto 20px`},children:`Ready to stop chasing?`}),(0,s.jsxs)(`h2`,{className:`mk-heading-lg`,style:{marginBottom:16},children:[`Start recovering payments`,(0,s.jsx)(`br`,{}),(0,s.jsx)(`span`,{className:`mk-blue-gradient`,children:`while you sleep.`})]}),(0,s.jsx)(`p`,{className:`mk-body`,style:{maxWidth:500,margin:`0 auto 36px`},children:`Free to start. No credit card. No code. Just a smarter way to collect.`}),(0,s.jsxs)(`div`,{style:{display:`flex`,gap:14,justifyContent:`center`,flexWrap:`wrap`},children:[(0,s.jsx)(e,{to:`/signup`,className:`hp-try-btn`,children:`Get Started Free →`}),(0,s.jsx)(e,{to:`/pricing`,className:`hp-watch-btn`,children:`View Pricing`})]})]})})})]})}export{m as default};