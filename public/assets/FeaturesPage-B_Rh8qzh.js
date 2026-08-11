import{i as e,l as t,s as n,t as r}from"./index-DobhsK68.js";import{n as i,t as a}from"./MarketingLayout-Bbl8aedM.js";n();var o=r(),s=`
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
`;function c(){return i(),(0,o.jsxs)(a,{children:[(0,o.jsx)(`style`,{children:s}),(0,o.jsxs)(`section`,{className:`fp-hero`,children:[(0,o.jsx)(`div`,{className:`fp-hero-bg-dots`}),(0,o.jsxs)(`div`,{className:`fp-hero-inner`,children:[(0,o.jsx)(`div`,{className:`mk-eyebrow mk-reveal`,style:{margin:`0 auto 20px`},children:`Platform Features`}),(0,o.jsxs)(`h1`,{className:`mk-heading-xl mk-reveal mk-reveal-delay-1`,children:[`The tech behind`,(0,o.jsx)(`br`,{}),(0,o.jsx)(`span`,{className:`mk-blue-gradient`,children:`AI-powered collections`})]}),(0,o.jsx)(`p`,{className:`mk-body mk-reveal mk-reveal-delay-2`,style:{maxWidth:560,margin:`20px auto 0`},children:`Built on state-of-the-art speech recognition, language understanding, and voice synthesis — explained simply for everyone who isn't an AI engineer.`})]})]}),(0,o.jsxs)(`section`,{className:`fp-tech`,children:[(0,o.jsxs)(`div`,{className:`fp-tech-header mk-reveal`,children:[(0,o.jsx)(`div`,{className:`mk-eyebrow`,style:{margin:`0 auto 20px`},children:`The Voice Stack`}),(0,o.jsxs)(`h2`,{className:`mk-heading-lg`,children:[`Three AIs working`,(0,o.jsx)(`br`,{}),(0,o.jsx)(`span`,{className:`mk-blue-gradient`,children:`together, seamlessly`})]}),(0,o.jsx)(`p`,{className:`mk-body`,style:{maxWidth:520,margin:`16px auto 0`},children:`When you speak into ConvDash, three specialized AI systems activate in under a second.`})]}),(0,o.jsxs)(`div`,{className:`fp-tech-grid`,children:[(0,o.jsxs)(`div`,{className:`fp-tech-card mk-reveal`,children:[(0,o.jsx)(`div`,{className:`fp-tech-badge`,children:`ASR`}),(0,o.jsx)(`h3`,{children:`Speech Recognition`}),(0,o.jsx)(`p`,{children:`Automatic Speech Recognition (ASR) is the AI that listens. It converts your spoken words into text in real-time — the same way human ears do, but faster and in multiple languages. We use Whisper, one of the most accurate open-source ASR models in the world, running locally for privacy.`}),(0,o.jsxs)(`div`,{className:`fp-tech-detail`,children:[(0,o.jsx)(`div`,{className:`fp-tech-detail-row`,children:`You say "electricity bill" → AI writes "electricity bill"`}),(0,o.jsx)(`div`,{className:`fp-tech-detail-row`,children:`Works even with accents and background noise`}),(0,o.jsx)(`div`,{className:`fp-tech-detail-row`,children:`Runs on your server — audio never leaves your infra`}),(0,o.jsx)(`div`,{className:`fp-tech-detail-row`,children:`Powered by OpenAI Whisper (local deployment)`})]}),(0,o.jsx)(`div`,{className:`fp-tech-glow`,style:{background:`radial-gradient(circle, #1d4ed8, transparent)`}})]}),(0,o.jsxs)(`div`,{className:`fp-tech-card mk-reveal mk-reveal-delay-2`,children:[(0,o.jsx)(`div`,{className:`fp-tech-badge`,children:`LLM`}),(0,o.jsx)(`h3`,{children:`Language Understanding`}),(0,o.jsx)(`p`,{children:`Large Language Models (LLM) are the AI that thinks. Once your words are transcribed, an LLM interprets your intent — "did they say pay, snooze, or dispute?" — and decides what action to take. We use Google Gemini for this, which gives us deep contextual understanding and multi-turn conversation memory.`}),(0,o.jsxs)(`div`,{className:`fp-tech-detail`,children:[(0,o.jsx)(`div`,{className:`fp-tech-detail-row`,children:`"Snooze it for next week" → SNOOZE intent detected`}),(0,o.jsx)(`div`,{className:`fp-tech-detail-row`,children:`Understands context across multiple messages`}),(0,o.jsx)(`div`,{className:`fp-tech-detail-row`,children:`Can handle complex disambiguation ("which bill?")`}),(0,o.jsx)(`div`,{className:`fp-tech-detail-row`,children:`Powered by Google Gemini`})]}),(0,o.jsx)(`div`,{className:`fp-tech-glow`,style:{background:`radial-gradient(circle, #6366f1, transparent)`}})]}),(0,o.jsxs)(`div`,{className:`fp-tech-card mk-reveal mk-reveal-delay-3`,children:[(0,o.jsx)(`div`,{className:`fp-tech-badge`,children:`TTS`}),(0,o.jsx)(`h3`,{children:`Voice Synthesis`}),(0,o.jsx)(`p`,{children:`Text-to-Speech (TTS) is the AI that speaks. Once the LLM decides what to say, TTS converts that text reply into natural-sounding audio and plays it back instantly. Think of it as giving the AI a human voice — without robotic monotone. If TTS is unavailable, text replies still show in chat.`}),(0,o.jsxs)(`div`,{className:`fp-tech-detail`,children:[(0,o.jsx)(`div`,{className:`fp-tech-detail-row`,children:`AI response text → natural voice audio`}),(0,o.jsx)(`div`,{className:`fp-tech-detail-row`,children:`Graceful fallback to text if voice fails`}),(0,o.jsx)(`div`,{className:`fp-tech-detail-row`,children:`Customizable voice tone and speed (coming soon)`}),(0,o.jsx)(`div`,{className:`fp-tech-detail-row`,children:`Local TTS server — low latency`})]}),(0,o.jsx)(`div`,{className:`fp-tech-glow`,style:{background:`radial-gradient(circle, #0d9488, transparent)`}})]})]}),(0,o.jsxs)(`div`,{className:`fp-pipeline mk-reveal`,children:[(0,o.jsx)(`div`,{className:`fp-pipeline-title`,children:`Complete Voice Pipeline — under 2 seconds end-to-end`}),(0,o.jsx)(`div`,{className:`fp-pipeline-steps`,children:[{box:`Mic
Input`,cls:`mic`,label:`User speaks`},null,{box:`ASR
Whisper`,cls:`stt`,label:`Speech → Text`},null,{box:`LLM
Gemini`,cls:`llm`,label:`Intent detection`},null,{box:`TTS
Voice`,cls:`tts`,label:`Text → Audio`},null,{box:`Playback`,cls:`speaker`,label:`User hears reply`}].map((e,t)=>e===null?(0,o.jsx)(`div`,{className:`fp-pipeline-arrow`,children:`→`},t):(0,o.jsxs)(`div`,{className:`fp-pipeline-step`,children:[(0,o.jsx)(`div`,{className:`fp-pipeline-box ${e.cls}`,style:{whiteSpace:`pre-line`},children:e.box}),(0,o.jsx)(`div`,{className:`fp-pipeline-label`,children:e.label})]},t))})]})]}),(0,o.jsx)(`section`,{className:`fp-conv`,children:(0,o.jsxs)(`div`,{className:`fp-conv-inner`,children:[(0,o.jsxs)(`div`,{className:`mk-reveal`,children:[(0,o.jsx)(`div`,{className:`mk-eyebrow`,style:{marginBottom:20},children:`Conversation Management`}),(0,o.jsxs)(`h2`,{className:`mk-topic-head mk-heading-lg`,children:[`Bills are threads.`,(0,o.jsx)(`br`,{}),(0,o.jsx)(`span`,{className:`mk-blue-gradient`,children:`Not random chat logs.`})]}),(0,o.jsx)(`div`,{className:`mk-topic-line`})]}),(0,o.jsxs)(`div`,{className:`fp-conv-grid`,children:[(0,o.jsxs)(`div`,{className:`fp-chat-demo mk-reveal`,children:[(0,o.jsxs)(`div`,{className:`fp-chat-header`,children:[(0,o.jsxs)(`div`,{children:[(0,o.jsx)(`div`,{className:`fp-chat-header-title`,children:`Electricity Bill — April 2026`}),(0,o.jsx)(`div`,{className:`fp-chat-header-sub`,children:`₹2,340 · Due Apr 5 · Active`})]}),(0,o.jsx)(`span`,{className:`mk-tag`,children:`Today`})]}),(0,o.jsxs)(`div`,{className:`fp-chat-messages`,children:[(0,o.jsx)(`div`,{className:`fp-msg system`,children:(0,o.jsx)(`div`,{className:`fp-msg-bubble`,children:`Overdue reminder sent — Apr 5, 2026`})}),(0,o.jsxs)(`div`,{className:`fp-msg ai`,children:[(0,o.jsx)(`div`,{className:`fp-msg-label`,children:`Assistant`}),(0,o.jsx)(`div`,{className:`fp-msg-bubble`,children:`Your Electricity Bill of ₹2,340 is overdue. Would you like to pay now, snooze, or dispute?`})]}),(0,o.jsxs)(`div`,{className:`fp-msg user`,children:[(0,o.jsx)(`div`,{className:`fp-msg-label`,children:`You`}),(0,o.jsx)(`div`,{className:`fp-msg-bubble`,children:`Snooze it for 3 days`})]}),(0,o.jsxs)(`div`,{className:`fp-msg ai`,children:[(0,o.jsx)(`div`,{className:`fp-msg-label`,children:`Assistant`}),(0,o.jsx)(`div`,{className:`fp-msg-bubble`,children:`Done! Reminder moved to April 8th. I'll check in again then.`})]}),(0,o.jsx)(`div`,{className:`fp-msg system`,children:(0,o.jsx)(`div`,{className:`fp-msg-bubble`,children:`Snoozed until Apr 8 · Reminder set`})})]})]}),(0,o.jsx)(`div`,{className:`fp-conv-points`,children:[[``,`Bill-Threaded Conversations`,`Each bill gets its own chat thread.`],[``,`Date-Grouped Messages`,`Messages are grouped by date inside threads.`],[``,`Bill Identity`,`Each thread is tied to a unique bill ID.`],[``,`Optimistic UI`,`UI updates immediately on command.`]].map(([e,t,n],r)=>(0,o.jsxs)(`div`,{className:`fp-conv-point mk-reveal mk-reveal-delay-${r+1}`,children:[(0,o.jsx)(`div`,{className:`fp-conv-point-icon`,children:e}),(0,o.jsxs)(`div`,{className:`fp-conv-point-body`,children:[(0,o.jsx)(`h3`,{children:t}),(0,o.jsx)(`p`,{children:n})]})]},r))})]})]})}),(0,o.jsxs)(`section`,{className:`fp-usp`,children:[(0,o.jsxs)(`div`,{className:`fp-usp-header mk-reveal`,children:[(0,o.jsx)(`div`,{className:`mk-eyebrow`,style:{margin:`0 auto 20px`},children:`Why ConvDash`}),(0,o.jsxs)(`h2`,{className:`mk-heading-lg`,children:[`Unique selling points`,(0,o.jsx)(`br`,{}),(0,o.jsx)(`span`,{className:`mk-blue-gradient`,children:`that actually matter`})]})]}),(0,o.jsx)(`div`,{className:`fp-usp-grid`,children:[[``,`Voice-First Reminder Automation`,`Most collection tools send SMS or email. We call. AI voice reminders have higher response rates because people actually pick up and respond to a voice they can reply to.`],[``,`WhatsApp-Style Bill Threading`,`Every bill becomes a conversation thread with full history. No more disconnected reminder logs. Understand the complete journey of every payment in one view.`],[``,`Midnight-Boundary Daily Sessions`,`Same bill, same day = same conversation. Cross midnight = fresh session, same context. You never lose continuity, and the UI never becomes cluttered.`],[``,`Realtime Push Without Refresh`,`Socket-powered live updates. When AI sends a reminder at 9 AM, it appears in your dashboard instantly — no page reload, no polling, no delay.`],[``,`Graceful Degradation`,`If voice synthesis goes down, text still works. If speech recognition fails, the conversation records the error and continues. The system never goes fully silent.`],[``,`Privacy-First Architecture`,`ASR runs locally. Audio never leaves your server. JWT-authenticated APIs. Role-based access. GDPR-ready by design.`]].map(([e,t,n],r)=>(0,o.jsxs)(`div`,{className:`fp-usp-card mk-reveal mk-reveal-delay-${r%2+1}`,children:[(0,o.jsx)(`div`,{className:`fp-usp-icon-wrap`,children:e}),(0,o.jsxs)(`div`,{className:`fp-usp-body`,children:[(0,o.jsx)(`h3`,{children:t}),(0,o.jsx)(`p`,{children:n})]})]},r))})]}),(0,o.jsxs)(`section`,{className:`fp-compare`,children:[(0,o.jsxs)(`div`,{className:`fp-compare-header mk-reveal`,children:[(0,o.jsx)(`div`,{className:`mk-eyebrow`,style:{margin:`0 auto 20px`},children:`How We Compare`}),(0,o.jsxs)(`h2`,{className:`mk-heading-lg`,children:[`ConvDash vs `,(0,o.jsx)(`span`,{className:`mk-blue-gradient`,children:`The Alternatives`})]})]}),(0,o.jsxs)(`div`,{className:`fp-compare-table mk-reveal mk-reveal-delay-1`,children:[(0,o.jsxs)(`div`,{className:`fp-compare-head`,children:[(0,o.jsx)(`div`,{className:`fp-compare-head-cell`,children:`Feature`}),(0,o.jsx)(`div`,{className:`fp-compare-head-cell highlight`,children:`ConvDash`}),(0,o.jsx)(`div`,{className:`fp-compare-head-cell`,children:`Manual / Traditional`})]}),[[`AI voice reminders`,`Yes`,`No`],[`Conversational response (speak)`,`Yes`,`No`],[`Bill-threaded chat history`,`Yes`,`No`],[`Real-time dashboard`,`Yes`,`Partial`],[`Automated overdue detection`,`Yes`,`No`],[`Snooze / escalation logic`,`Yes`,`No`],[`Analytics & delay tracking`,`Yes`,`Partial`],[`Multi-channel (voice + text)`,`Coming Q3`,`SMS only`],[`Local ASR (no cloud audio)`,`Yes`,`N/A`]].map(([e,t,n],r)=>(0,o.jsxs)(`div`,{className:`fp-compare-row`,children:[(0,o.jsx)(`div`,{className:`fp-compare-feature`,children:e}),(0,o.jsx)(`div`,{className:`fp-compare-cell ${t===`Yes`?`yes`:t===`No`?`no`:`partial`}`,children:t}),(0,o.jsx)(`div`,{className:`fp-compare-cell ${n===`Yes`?`yes`:n===`No`?`no`:`partial`}`,children:n})]},r))]})]}),(0,o.jsx)(`section`,{style:{padding:`80px 5%`},children:(0,o.jsx)(`div`,{style:{maxWidth:1100,margin:`0 auto`},children:(0,o.jsxs)(`div`,{className:`mk-cta-band mk-reveal`,children:[(0,o.jsx)(`div`,{className:`mk-eyebrow`,style:{margin:`0 auto 20px`},children:`Try it yourself`}),(0,o.jsxs)(`h2`,{className:`mk-heading-lg`,style:{marginBottom:16},children:[`All of this, ready for you`,(0,o.jsx)(`br`,{}),(0,o.jsx)(`span`,{className:`mk-blue-gradient`,children:`right now.`})]}),(0,o.jsx)(`p`,{className:`mk-body`,style:{maxWidth:440,margin:`0 auto 32px`},children:`No complex setup. No vendor lock-in. Start recovering bills with AI voice in under 5 minutes.`}),(0,o.jsx)(e,{to:`/login`,className:`mk-btn-primary`,style:{fontSize:15,padding:`13px 28px`},children:`Get Started Free →`})]})})})]})}export{c as default};