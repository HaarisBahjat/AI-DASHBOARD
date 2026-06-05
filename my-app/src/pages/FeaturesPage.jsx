import React from 'react';
import { Link } from 'react-router-dom';
import MarketingLayout, { useScrollReveal } from '../components/MarketingLayout';

const featStyles = `
  .fp-hero {
    padding: 100px 5% 80px;
    text-align: center;
    position: relative;
    overflow: hidden;
    background:
      radial-gradient(ellipse 800px 400px at 50% -5%, rgba(29,78,216,0.2) 0%, transparent 60%),
      var(--mk-bg);
  }

  .fp-hero-bg-dots {
    position: absolute;
    inset: 0;
    background-image: radial-gradient(rgba(79,142,247,0.07) 1px, transparent 1px);
    background-size: 28px 28px;
    pointer-events: none;
  }

  .fp-hero-inner { position: relative; z-index: 1; max-width: 760px; margin: 0 auto; }

  /* ── Tech trio ── */
  .fp-tech { padding: 100px 5%; background: var(--mk-bg2); }
  .fp-tech-header { text-align: center; margin-bottom: 64px; }

  .fp-tech-grid {
    display: grid;
    grid-template-columns: repeat(3, 1fr);
    gap: 24px;
    max-width: 1100px;
    margin: 0 auto 64px;
  }

  .fp-tech-card {
    background: var(--mk-surface);
    border: 1px solid var(--mk-border);
    border-radius: var(--mk-radius-lg);
    padding: 32px 28px;
    position: relative;
    overflow: hidden;
    transition: all 0.2s;
  }

  .fp-tech-card:hover {
    border-color: var(--mk-border-mid);
    transform: translateY(-4px);
    box-shadow: 0 20px 60px rgba(4,8,16,0.6);
  }

  .fp-tech-badge {
    display: inline-flex;
    align-items: center;
    gap: 6px;
    font-size: 10.5px;
    font-family: var(--mk-font-mono);
    letter-spacing: 0.08em;
    color: var(--mk-blue-light);
    background: rgba(79,142,247,0.1);
    border: 1px solid rgba(79,142,247,0.2);
    border-radius: var(--mk-radius-pill);
    padding: 4px 10px;
    margin-bottom: 16px;
    text-transform: uppercase;
  }

  .fp-tech-card h3 {
    font-family: var(--mk-font-display);
    font-size: 22px;
    font-weight: 700;
    letter-spacing: -0.02em;
    color: var(--mk-fg);
    margin-bottom: 12px;
  }

  .fp-tech-card p { color: var(--mk-fg2); font-size: 14.5px; line-height: 1.7; margin-bottom: 20px; }

  .fp-tech-detail {
    display: flex;
    flex-direction: column;
    gap: 9px;
    border-top: 1px solid var(--mk-border);
    padding-top: 18px;
  }

  .fp-tech-detail-row {
    display: flex;
    align-items: flex-start;
    gap: 10px;
    font-size: 13px;
    color: var(--mk-muted);
    line-height: 1.5;
  }

  .fp-tech-detail-row::before { content: '→'; color: var(--mk-blue); flex-shrink: 0; font-size: 12px; margin-top: 1px; }

  .fp-tech-glow {
    position: absolute;
    bottom: -40px;
    right: -40px;
    width: 160px;
    height: 160px;
    border-radius: 50%;
    filter: blur(60px);
    opacity: 0.15;
    pointer-events: none;
  }

  /* pipeline diagram */
  .fp-pipeline {
    max-width: 900px;
    margin: 0 auto;
    padding: 32px;
    background: var(--mk-surface2);
    border: 1px solid var(--mk-border-mid);
    border-radius: var(--mk-radius-lg);
  }

  .fp-pipeline-title {
    font-family: var(--mk-font-mono);
    font-size: 11px;
    letter-spacing: 0.1em;
    color: var(--mk-muted);
    text-transform: uppercase;
    margin-bottom: 24px;
    text-align: center;
  }

  .fp-pipeline-steps {
    display: flex;
    align-items: center;
    justify-content: center;
    gap: 0;
    flex-wrap: wrap;
    row-gap: 16px;
  }

  .fp-pipeline-step {
    display: flex;
    flex-direction: column;
    align-items: center;
    gap: 8px;
    min-width: 110px;
  }

  .fp-pipeline-box {
    padding: 10px 16px;
    border-radius: 10px;
    font-size: 12px;
    font-family: var(--mk-font-mono);
    font-weight: 500;
    text-align: center;
    line-height: 1.4;
  }

  .fp-pipeline-box.mic    { background: rgba(79,142,247,0.15); border: 1px solid rgba(79,142,247,0.3); color: #7aacf8; }
  .fp-pipeline-box.stt    { background: rgba(29,78,216,0.2);   border: 1px solid rgba(29,78,216,0.4);  color: #93c5fd; }
  .fp-pipeline-box.llm    { background: rgba(99,102,241,0.18); border: 1px solid rgba(99,102,241,0.35);color: #a5b4fc; }
  .fp-pipeline-box.tts    { background: rgba(13,148,136,0.18); border: 1px solid rgba(13,148,136,0.35);color: #2dd4bf; }
  .fp-pipeline-box.speaker{ background: rgba(79,142,247,0.1);  border: 1px solid rgba(79,142,247,0.2); color: #7aacf8; }

  .fp-pipeline-label { font-size: 10px; font-family: var(--mk-font-mono); color: var(--mk-dim); text-align: center; }

  .fp-pipeline-arrow {
    font-size: 18px;
    color: var(--mk-border-mid);
    padding: 0 4px;
    align-self: center;
    margin-bottom: 24px;
  }

  /* ── Conversation grouping ── */
  .fp-conv { padding: 100px 5%; }
  .fp-conv-inner { max-width: 1100px; margin: 0 auto; }

  .fp-conv-grid {
    display: grid;
    grid-template-columns: 1fr 1fr;
    gap: 60px;
    align-items: center;
    margin-top: 56px;
  }

  .fp-chat-demo {
    background: var(--mk-surface);
    border: 1px solid var(--mk-border);
    border-radius: var(--mk-radius-lg);
    overflow: hidden;
  }

  .fp-chat-header {
    padding: 14px 18px;
    border-bottom: 1px solid var(--mk-border);
    background: var(--mk-surface2);
    display: flex;
    align-items: center;
    justify-content: space-between;
  }

  .fp-chat-header-title { font-family: var(--mk-font-display); font-size: 15px; font-weight: 600; color: var(--mk-fg); }
  .fp-chat-header-sub { font-size: 11px; font-family: var(--mk-font-mono); color: var(--mk-muted); }

  .fp-chat-messages { padding: 16px; display: flex; flex-direction: column; gap: 10px; }

  .fp-msg {
    display: flex;
    flex-direction: column;
    max-width: 78%;
    gap: 3px;
  }

  .fp-msg.user   { align-self: flex-end; align-items: flex-end; }
  .fp-msg.ai     { align-self: flex-start; align-items: flex-start; }
  .fp-msg.system { align-self: center; align-items: center; }

  .fp-msg-label {
    font-size: 9.5px;
    font-family: var(--mk-font-mono);
    text-transform: uppercase;
    letter-spacing: 0.06em;
    color: var(--mk-dim);
  }

  .fp-msg-bubble {
    padding: 9px 13px;
    border-radius: 12px;
    font-size: 13px;
    line-height: 1.55;
  }

  .fp-msg.user .fp-msg-bubble {
    background: linear-gradient(135deg, #1d4ed8, #4f8ef7);
    color: #eef5ff;
    border-bottom-right-radius: 4px;
  }

  .fp-msg.ai .fp-msg-bubble {
    background: var(--mk-surface2);
    border: 1px solid var(--mk-border);
    color: var(--mk-fg2);
    border-bottom-left-radius: 4px;
  }

  .fp-msg.system .fp-msg-bubble {
    background: rgba(45,212,191,0.08);
    border: 1px solid rgba(45,212,191,0.2);
    color: #2dd4bf;
    font-size: 11.5px;
    font-family: var(--mk-font-mono);
  }

  .fp-conv-points { display: flex; flex-direction: column; gap: 24px; }

  .fp-conv-point {
    display: flex;
    gap: 16px;
    align-items: flex-start;
  }

  .fp-conv-point-icon {
    width: 40px;
    height: 40px;
    border-radius: 10px;
    background: linear-gradient(135deg, rgba(29,78,216,0.35), rgba(79,142,247,0.2));
    border: 1px solid rgba(79,142,247,0.2);
    display: flex;
    align-items: center;
    justify-content: center;
    font-size: 18px;
    flex-shrink: 0;
  }

  .fp-conv-point-body h3 {
    font-family: var(--mk-font-display);
    font-size: 17px;
    font-weight: 600;
    color: var(--mk-fg);
    letter-spacing: -0.01em;
    margin-bottom: 6px;
  }

  .fp-conv-point-body p { color: var(--mk-muted); font-size: 14px; line-height: 1.65; }

  /* ── USPs ── */
  .fp-usp { padding: 100px 5%; background: var(--mk-bg2); }

  .fp-usp-header { text-align: center; margin-bottom: 60px; }

  .fp-usp-grid {
    display: grid;
    grid-template-columns: repeat(2, 1fr);
    gap: 20px;
    max-width: 1100px;
    margin: 0 auto;
  }

  .fp-usp-card {
    background: var(--mk-surface);
    border: 1px solid var(--mk-border);
    border-radius: var(--mk-radius-lg);
    padding: 28px;
    display: flex;
    gap: 20px;
    align-items: flex-start;
    transition: all 0.2s;
  }

  .fp-usp-card:hover { border-color: var(--mk-border-mid); transform: translateY(-2px); }

  .fp-usp-icon-wrap {
    width: 50px;
    height: 50px;
    border-radius: 14px;
    background: linear-gradient(135deg, rgba(29,78,216,0.35), rgba(79,142,247,0.2));
    border: 1px solid rgba(79,142,247,0.2);
    display: flex;
    align-items: center;
    justify-content: center;
    font-size: 22px;
    flex-shrink: 0;
  }

  .fp-usp-body h3 {
    font-family: var(--mk-font-display);
    font-size: 18px;
    font-weight: 600;
    letter-spacing: -0.01em;
    color: var(--mk-fg);
    margin-bottom: 8px;
  }

  .fp-usp-body p { color: var(--mk-muted); font-size: 14px; line-height: 1.65; }

  /* ── Comparison table ── */
  .fp-compare { padding: 100px 5%; }
  .fp-compare-header { text-align: center; margin-bottom: 56px; }

  .fp-compare-table {
    max-width: 900px;
    margin: 0 auto;
    border: 1px solid var(--mk-border);
    border-radius: var(--mk-radius-lg);
    overflow: hidden;
  }

  .fp-compare-head {
    display: grid;
    grid-template-columns: 2fr 1fr 1fr;
    background: var(--mk-surface2);
    border-bottom: 1px solid var(--mk-border);
    padding: 14px 24px;
    gap: 12px;
  }

  .fp-compare-head-cell {
    font-family: var(--mk-font-display);
    font-size: 13px;
    font-weight: 600;
    text-transform: uppercase;
    letter-spacing: 0.05em;
    color: var(--mk-muted);
  }

  .fp-compare-head-cell.highlight { color: var(--mk-blue-light); }

  .fp-compare-row {
    display: grid;
    grid-template-columns: 2fr 1fr 1fr;
    padding: 14px 24px;
    gap: 12px;
    border-bottom: 1px solid var(--mk-border);
    align-items: center;
  }

  .fp-compare-row:last-child { border-bottom: none; }
  .fp-compare-row:nth-child(even) { background: rgba(255,255,255,0.015); }

  .fp-compare-feature { font-size: 14px; color: var(--mk-fg2); }

  .fp-compare-cell {
    font-size: 13px;
    font-family: var(--mk-font-mono);
    display: flex;
    align-items: center;
    gap: 5px;
  }

  .fp-compare-cell.yes { color: #22c55e; }
  .fp-compare-cell.no  { color: #f87171; }
  .fp-compare-cell.partial { color: #fbbf24; }

  @media (max-width: 900px) {
    .fp-tech-grid { grid-template-columns: 1fr; }
    .fp-conv-grid { grid-template-columns: 1fr; }
    .fp-usp-grid  { grid-template-columns: 1fr; }
    .fp-pipeline-steps { justify-content: flex-start; }
    .fp-compare-head, .fp-compare-row { grid-template-columns: 1fr 1fr; }
    .fp-compare-feature { grid-column: 1 / -1; font-weight: 600; }
  }
`;

export default function FeaturesPage() {
  useScrollReveal();

  return (
    <MarketingLayout>
      <style>{featStyles}</style>

      {/* ── Hero ── */}
      <section className="fp-hero">
        <div className="fp-hero-bg-dots" />
        <div className="fp-hero-inner">
          <div className="mk-eyebrow mk-reveal" style={{ margin: '0 auto 20px' }}>Platform Features</div>
          <h1 className="mk-heading-xl mk-reveal mk-reveal-delay-1">
            The tech behind<br /><span className="mk-blue-gradient">AI-powered collections</span>
          </h1>
          <p className="mk-body mk-reveal mk-reveal-delay-2" style={{ maxWidth: 560, margin: '20px auto 0' }}>
            Built on state-of-the-art speech recognition, language understanding, and
            voice synthesis — explained simply for everyone who isn't an AI engineer.
          </p>
        </div>
      </section>

      {/* ── Voice Tech Trio ── */}
      <section className="fp-tech">
        <div className="fp-tech-header mk-reveal">
          <div className="mk-eyebrow" style={{ margin: '0 auto 20px' }}>The Voice Stack</div>
          <h2 className="mk-heading-lg">
            Three AIs working<br /><span className="mk-blue-gradient">together, seamlessly</span>
          </h2>
          <p className="mk-body" style={{ maxWidth: 520, margin: '16px auto 0' }}>
            When you speak into ConvDash, three specialized AI systems activate in under a second.
          </p>
        </div>

        <div className="fp-tech-grid">
          {/* ASR */}
          <div className="fp-tech-card mk-reveal">
            <div className="fp-tech-badge">ASR</div>
            <h3>Speech Recognition</h3>
            <p>
              Automatic Speech Recognition (ASR) is the AI that listens. It converts your spoken
              words into text in real-time — the same way human ears do, but faster and in multiple
              languages. We use Whisper, one of the most accurate open-source ASR models in the world,
              running locally for privacy.
            </p>
            <div className="fp-tech-detail">
              <div className="fp-tech-detail-row">You say "electricity bill" → AI writes "electricity bill"</div>
              <div className="fp-tech-detail-row">Works even with accents and background noise</div>
              <div className="fp-tech-detail-row">Runs on your server — audio never leaves your infra</div>
              <div className="fp-tech-detail-row">Powered by OpenAI Whisper (local deployment)</div>
            </div>
            <div className="fp-tech-glow" style={{ background: 'radial-gradient(circle, #1d4ed8, transparent)' }} />
          </div>

          {/* LLM */}
          <div className="fp-tech-card mk-reveal mk-reveal-delay-2">
            <div className="fp-tech-badge">LLM</div>
            <h3>Language Understanding</h3>
            <p>
              Large Language Models (LLM) are the AI that thinks. Once your words are transcribed,
              an LLM interprets your intent — "did they say pay, snooze, or dispute?" — and decides
              what action to take. We use Google Gemini for this, which gives us deep contextual
              understanding and multi-turn conversation memory.
            </p>
            <div className="fp-tech-detail">
              <div className="fp-tech-detail-row">"Snooze it for next week" → SNOOZE intent detected</div>
              <div className="fp-tech-detail-row">Understands context across multiple messages</div>
              <div className="fp-tech-detail-row">Can handle complex disambiguation ("which bill?")</div>
              <div className="fp-tech-detail-row">Powered by Google Gemini</div>
            </div>
            <div className="fp-tech-glow" style={{ background: 'radial-gradient(circle, #6366f1, transparent)' }} />
          </div>

          {/* TTS */}
          <div className="fp-tech-card mk-reveal mk-reveal-delay-3">
            <div className="fp-tech-badge">TTS</div>
            <h3>Voice Synthesis</h3>
            <p>
              Text-to-Speech (TTS) is the AI that speaks. Once the LLM decides what to say, TTS
              converts that text reply into natural-sounding audio and plays it back instantly.
              Think of it as giving the AI a human voice — without robotic monotone.
              If TTS is unavailable, text replies still show in chat.
            </p>
            <div className="fp-tech-detail">
              <div className="fp-tech-detail-row">AI response text → natural voice audio</div>
              <div className="fp-tech-detail-row">Graceful fallback to text if voice fails</div>
              <div className="fp-tech-detail-row">Customizable voice tone and speed (coming soon)</div>
              <div className="fp-tech-detail-row">Local TTS server — low latency</div>
            </div>
            <div className="fp-tech-glow" style={{ background: 'radial-gradient(circle, #0d9488, transparent)' }} />
          </div>
        </div>

        {/* Pipeline diagram */}
        <div className="fp-pipeline mk-reveal">
          <div className="fp-pipeline-title">Complete Voice Pipeline — under 2 seconds end-to-end</div>
          <div className="fp-pipeline-steps">
            {[
              { box: 'Mic\nInput', cls: 'mic', label: 'User speaks' },
              null,
              { box: 'ASR\nWhisper', cls: 'stt', label: 'Speech → Text' },
              null,
              { box: 'LLM\nGemini', cls: 'llm', label: 'Intent detection' },
              null,
              { box: 'TTS\nVoice', cls: 'tts', label: 'Text → Audio' },
              null,
              { box: 'Playback', cls: 'speaker', label: 'User hears reply' },
            ].map((item, i) => {
              if (item === null) return <div key={i} className="fp-pipeline-arrow">→</div>;
              return (
                <div key={i} className="fp-pipeline-step">
                  <div className={`fp-pipeline-box ${item.cls}`} style={{ whiteSpace: 'pre-line' }}>{item.box}</div>
                  <div className="fp-pipeline-label">{item.label}</div>
                </div>
              );
            })}
          </div>
        </div>
      </section>

      {/* ── Conversation grouping ── */}
      <section className="fp-conv">
        <div className="fp-conv-inner">
          <div className="mk-reveal">
            <div className="mk-eyebrow" style={{ marginBottom: 20 }}>Conversation Management</div>
            <h2 className="mk-topic-head mk-heading-lg">
              Bills are threads.<br /><span className="mk-blue-gradient">Not random chat logs.</span>
            </h2>
            <div className="mk-topic-line" />
          </div>

          <div className="fp-conv-grid">
            {/* Live chat demo */}
            <div className="fp-chat-demo mk-reveal">
              <div className="fp-chat-header">
                <div>
                  <div className="fp-chat-header-title">Electricity Bill — April 2026</div>
                  <div className="fp-chat-header-sub">₹2,340 · Due Apr 5 · Active</div>
                </div>
                <span className="mk-tag">Today</span>
              </div>
              <div className="fp-chat-messages">
                <div className="fp-msg system">
                  <div className="fp-msg-bubble">Overdue reminder sent — Apr 5, 2026</div>
                </div>
                <div className="fp-msg ai">
                  <div className="fp-msg-label">Assistant</div>
                  <div className="fp-msg-bubble">Your Electricity Bill of ₹2,340 is overdue. Would you like to pay now, snooze, or dispute?</div>
                </div>
                <div className="fp-msg user">
                  <div className="fp-msg-label">You</div>
                  <div className="fp-msg-bubble">Snooze it for 3 days</div>
                </div>
                <div className="fp-msg ai">
                  <div className="fp-msg-label">Assistant</div>
                  <div className="fp-msg-bubble">Done! Reminder moved to April 8th. I'll check in again then.</div>
                </div>
                <div className="fp-msg system">
                  <div className="fp-msg-bubble">Snoozed until Apr 8 · Reminder set</div>
                </div>
              </div>
            </div>

            {/* Explanation points */}
            <div className="fp-conv-points">
              {[
                ['', 'Bill-Threaded Conversations', 'Each bill gets its own chat thread.'],
                ['', 'Date-Grouped Messages', 'Messages are grouped by date inside threads.'],
                ['', 'Bill Identity', 'Each thread is tied to a unique bill ID.'],
                ['', 'Optimistic UI', 'UI updates immediately on command.'],
              ].map(([icon, title, desc], i) => (
                <div className={`fp-conv-point mk-reveal mk-reveal-delay-${i + 1}`} key={i}>
                  <div className="fp-conv-point-icon">{icon}</div>
                  <div className="fp-conv-point-body">
                    <h3>{title}</h3>
                    <p>{desc}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* ── USPs ── */}
      <section className="fp-usp">
        <div className="fp-usp-header mk-reveal">
          <div className="mk-eyebrow" style={{ margin: '0 auto 20px' }}>Why ConvDash</div>
          <h2 className="mk-heading-lg">
            Unique selling points<br /><span className="mk-blue-gradient">that actually matter</span>
          </h2>
        </div>

        <div className="fp-usp-grid">
          {[
            ['', 'Voice-First Reminder Automation', 'Most collection tools send SMS or email. We call. AI voice reminders have higher response rates because people actually pick up and respond to a voice they can reply to.'],
            ['', 'WhatsApp-Style Bill Threading', 'Every bill becomes a conversation thread with full history. No more disconnected reminder logs. Understand the complete journey of every payment in one view.'],
            ['', 'Midnight-Boundary Daily Sessions', 'Same bill, same day = same conversation. Cross midnight = fresh session, same context. You never lose continuity, and the UI never becomes cluttered.'],
            ['', 'Realtime Push Without Refresh', 'Socket-powered live updates. When AI sends a reminder at 9 AM, it appears in your dashboard instantly — no page reload, no polling, no delay.'],
            ['', 'Graceful Degradation', 'If voice synthesis goes down, text still works. If speech recognition fails, the conversation records the error and continues. The system never goes fully silent.'],
            ['', 'Privacy-First Architecture', 'ASR runs locally. Audio never leaves your server. JWT-authenticated APIs. Role-based access. GDPR-ready by design.'],
          ].map(([icon, title, desc], i) => (
            <div className={`fp-usp-card mk-reveal mk-reveal-delay-${(i % 2) + 1}`} key={i}>
              <div className="fp-usp-icon-wrap">{icon}</div>
              <div className="fp-usp-body">
                <h3>{title}</h3>
                <p>{desc}</p>
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* ── Comparison ── */}
      <section className="fp-compare">
        <div className="fp-compare-header mk-reveal">
          <div className="mk-eyebrow" style={{ margin: '0 auto 20px' }}>How We Compare</div>
          <h2 className="mk-heading-lg">ConvDash vs <span className="mk-blue-gradient">The Alternatives</span></h2>
        </div>

        <div className="fp-compare-table mk-reveal mk-reveal-delay-1">
          <div className="fp-compare-head">
            <div className="fp-compare-head-cell">Feature</div>
            <div className="fp-compare-head-cell highlight">ConvDash</div>
            <div className="fp-compare-head-cell">Manual / Traditional</div>
          </div>

          {[
            ['AI voice reminders',             'Yes',       'No'],
            ['Conversational response (speak)', 'Yes',       'No'],
            ['Bill-threaded chat history',      'Yes',       'No'],
            ['Real-time dashboard',             'Yes',       'Partial'],
            ['Automated overdue detection',     'Yes',       'No'],
            ['Snooze / escalation logic',       'Yes',       'No'],
            ['Analytics & delay tracking',      'Yes',       'Partial'],
            ['Multi-channel (voice + text)',    'Coming Q3', 'SMS only'],
            ['Local ASR (no cloud audio)',      'Yes',       'N/A'],
          ].map(([feat, ours, theirs], i) => (
            <div key={i} className="fp-compare-row">
              <div className="fp-compare-feature">{feat}</div>
              <div className={`fp-compare-cell ${ours === 'Yes' ? 'yes' : ours === 'No' ? 'no' : 'partial'}`}>{ours}</div>
              <div className={`fp-compare-cell ${theirs === 'Yes' ? 'yes' : theirs === 'No' ? 'no' : 'partial'}`}>{theirs}</div>
            </div>
          ))}
        </div>
      </section>

      {/* ── Final CTA ── */}
      <section style={{ padding: '80px 5%' }}>
        <div style={{ maxWidth: 1100, margin: '0 auto' }}>
          <div className="mk-cta-band mk-reveal">
            <div className="mk-eyebrow" style={{ margin: '0 auto 20px' }}>Try it yourself</div>
            <h2 className="mk-heading-lg" style={{ marginBottom: 16 }}>
              All of this, ready for you<br /><span className="mk-blue-gradient">right now.</span>
            </h2>
            <p className="mk-body" style={{ maxWidth: 440, margin: '0 auto 32px' }}>
              No complex setup. No vendor lock-in. Start recovering bills with AI voice in under 5 minutes.
            </p>
            <Link to="/login" className="mk-btn-primary" style={{ fontSize: 15, padding: '13px 28px' }}>
              Get Started Free →
            </Link>
          </div>
        </div>
      </section>
    </MarketingLayout>
  );
}
