import{i as e,l as t,s as n,t as r}from"./index-CJXNVBts.js";import{n as i,t as a}from"./MarketingLayout-BTLRiZwT.js";n();var o=r(),s=`
  .ap-hero {
    padding: 100px 5% 80px;
    text-align: center;
    position: relative;
    overflow: hidden;
    background:
      radial-gradient(ellipse 700px 400px at 50% -10%, rgba(29,78,216,0.2) 0%, transparent 60%),
      var(--mk-bg);
  }

  .ap-hero-bg {
    position: absolute;
    inset: 0;
    background-image: radial-gradient(rgba(79,142,247,0.06) 1px, transparent 1px);
    background-size: 30px 30px;
    pointer-events: none;
  }

  .ap-hero-inner { position: relative; z-index: 1; max-width: 720px; margin: 0 auto; }

  /* ── Story ── */
  .ap-story { padding: 100px 5%; background: var(--mk-bg2); }

  .ap-story-grid {
    display: grid;
    grid-template-columns: 1fr 1fr;
    gap: 72px;
    align-items: start;
    max-width: 1100px;
    margin: 0 auto;
  }

  .ap-story-text { display: flex; flex-direction: column; gap: 20px; }
  .ap-story-text p { color: var(--mk-fg2); font-size: 15px; line-height: 1.8; }
  .ap-story-text p strong { color: var(--mk-fg); font-weight: 600; }

  .ap-story-aside {
    position: sticky;
    top: 90px;
    display: flex;
    flex-direction: column;
    gap: 16px;
  }

  .ap-aside-card {
    background: var(--mk-surface);
    border: 1px solid var(--mk-border);
    border-radius: var(--mk-radius-lg);
    padding: 24px;
  }

  .ap-aside-card-icon { font-size: 28px; margin-bottom: 12px; }
  .ap-aside-card h4 {
    font-family: var(--mk-font-display);
    font-size: 16px;
    font-weight: 600;
    color: var(--mk-fg);
    letter-spacing: -0.01em;
    margin-bottom: 8px;
  }
  .ap-aside-card p { color: var(--mk-muted); font-size: 13.5px; line-height: 1.6; }

  /* ── Mission & Vision ── */
  .ap-mv { padding: 100px 5%; }

  .ap-mv-grid {
    display: grid;
    grid-template-columns: 1fr 1fr;
    gap: 24px;
    max-width: 1000px;
    margin: 0 auto;
  }

  .ap-mv-card {
    border-radius: var(--mk-radius-lg);
    padding: 40px;
    position: relative;
    overflow: hidden;
  }

  .ap-mv-card.mission {
    background: linear-gradient(135deg, #061230, #0a1f4e);
    border: 1px solid rgba(79,142,247,0.25);
  }

  .ap-mv-card.vision {
    background: linear-gradient(135deg, #061c1a, #082520);
    border: 1px solid rgba(45,212,191,0.2);
  }

  .ap-mv-label {
    font-size: 10.5px;
    font-family: var(--mk-font-mono);
    letter-spacing: 0.1em;
    text-transform: uppercase;
    margin-bottom: 14px;
    display: flex;
    align-items: center;
    gap: 6px;
  }

  .ap-mv-card.mission .ap-mv-label { color: var(--mk-blue-light); }
  .ap-mv-card.vision  .ap-mv-label { color: #2dd4bf; }

  .ap-mv-card h2 {
    font-family: var(--mk-font-display);
    font-size: 22px;
    font-weight: 700;
    letter-spacing: -0.02em;
    color: var(--mk-fg);
    margin-bottom: 14px;
    line-height: 1.25;
  }

  .ap-mv-card p { color: var(--mk-fg2); font-size: 15px; line-height: 1.75; }

  .ap-mv-glow {
    position: absolute;
    bottom: -60px;
    right: -60px;
    width: 200px;
    height: 200px;
    border-radius: 50%;
    filter: blur(70px);
    opacity: 0.18;
    pointer-events: none;
  }

  /* ── Timeline ── */
  .ap-timeline { padding: 100px 5%; background: var(--mk-bg2); }
  .ap-timeline-header { text-align: center; margin-bottom: 64px; }

  .ap-timeline-track {
    max-width: 760px;
    margin: 0 auto;
    position: relative;
  }

  .ap-timeline-track::before {
    content: '';
    position: absolute;
    left: 20px;
    top: 0;
    bottom: 0;
    width: 1px;
    background: linear-gradient(to bottom, rgba(79,142,247,0.5) 0%, rgba(79,142,247,0.05) 100%);
  }

  .ap-tl-item {
    display: flex;
    gap: 28px;
    align-items: flex-start;
    margin-bottom: 40px;
    position: relative;
  }

  .ap-tl-item:last-child { margin-bottom: 0; }

  .ap-tl-dot {
    width: 42px;
    height: 42px;
    border-radius: 50%;
    background: var(--mk-surface2);
    border: 2px solid rgba(79,142,247,0.3);
    display: flex;
    align-items: center;
    justify-content: center;
    font-size: 18px;
    flex-shrink: 0;
    position: relative;
    z-index: 1;
  }

  .ap-tl-content { padding-top: 6px; }

  .ap-tl-date {
    font-size: 11px;
    font-family: var(--mk-font-mono);
    color: var(--mk-blue-light);
    letter-spacing: 0.06em;
    text-transform: uppercase;
    margin-bottom: 6px;
  }

  .ap-tl-title {
    font-family: var(--mk-font-display);
    font-size: 18px;
    font-weight: 600;
    color: var(--mk-fg);
    letter-spacing: -0.01em;
    margin-bottom: 6px;
  }

  .ap-tl-desc { color: var(--mk-muted); font-size: 14px; line-height: 1.65; }

  /* ── Values ── */
  .ap-values { padding: 100px 5%; }
  .ap-values-header { text-align: center; margin-bottom: 56px; }

  .ap-values-grid {
    display: grid;
    grid-template-columns: repeat(3, 1fr);
    gap: 20px;
    max-width: 1060px;
    margin: 0 auto;
  }

  .ap-value-card {
    background: var(--mk-surface);
    border: 1px solid var(--mk-border);
    border-radius: var(--mk-radius-lg);
    padding: 28px;
    transition: all 0.2s;
  }

  .ap-value-card:hover { border-color: var(--mk-border-mid); transform: translateY(-3px); }

  .ap-value-num {
    font-family: var(--mk-font-display);
    font-size: 48px;
    font-weight: 800;
    color: rgba(79,142,247,0.12);
    letter-spacing: -0.04em;
    line-height: 1;
    margin-bottom: 10px;
  }

  .ap-value-card h3 {
    font-family: var(--mk-font-display);
    font-size: 18px;
    font-weight: 700;
    color: var(--mk-fg);
    letter-spacing: -0.01em;
    margin-bottom: 10px;
  }

  .ap-value-card p { color: var(--mk-muted); font-size: 13.5px; line-height: 1.65; }

  /* ── Team ── */
  .ap-team { padding: 100px 5%; background: var(--mk-bg2); }
  .ap-team-header { text-align: center; margin-bottom: 56px; }

  .ap-team-grid {
    display: grid;
    grid-template-columns: repeat(3, 1fr);
    gap: 24px;
    max-width: 900px;
    margin: 0 auto;
  }

  .ap-team-card {
    background: var(--mk-surface);
    border: 1px solid var(--mk-border);
    border-radius: var(--mk-radius-lg);
    padding: 28px;
    text-align: center;
    transition: all 0.2s;
  }

  .ap-team-card:hover { border-color: var(--mk-border-mid); transform: translateY(-3px); }

  .ap-team-avatar {
    width: 72px;
    height: 72px;
    border-radius: 50%;
    background: linear-gradient(135deg, #1d4ed8, #4f8ef7);
    display: flex;
    align-items: center;
    justify-content: center;
    font-family: var(--mk-font-display);
    font-size: 26px;
    font-weight: 700;
    color: #fff;
    margin: 0 auto 16px;
    border: 2px solid rgba(79,142,247,0.3);
  }

  .ap-team-name {
    font-family: var(--mk-font-display);
    font-size: 17px;
    font-weight: 700;
    color: var(--mk-fg);
    letter-spacing: -0.01em;
    margin-bottom: 4px;
  }

  .ap-team-role { font-size: 12.5px; color: var(--mk-blue-light); font-family: var(--mk-font-mono); margin-bottom: 12px; }
  .ap-team-bio { font-size: 13px; color: var(--mk-muted); line-height: 1.6; }

  /* ── Future ── */
  .ap-future { padding: 80px 5%; }
  .ap-future-header { text-align: center; margin-bottom: 48px; }

  .ap-future-grid {
    display: grid;
    grid-template-columns: repeat(4, 1fr);
    gap: 16px;
    max-width: 1060px;
    margin: 0 auto;
  }

  .ap-future-item {
    background: var(--mk-surface);
    border: 1px solid var(--mk-border);
    border-radius: var(--mk-radius);
    padding: 20px;
    display: flex;
    flex-direction: column;
    gap: 8px;
  }

  .ap-future-quarter {
    font-size: 10px;
    font-family: var(--mk-font-mono);
    color: var(--mk-blue-light);
    letter-spacing: 0.08em;
    text-transform: uppercase;
  }

  .ap-future-item h4 {
    font-family: var(--mk-font-display);
    font-size: 15px;
    font-weight: 600;
    color: var(--mk-fg);
    letter-spacing: -0.01em;
  }

  .ap-future-item p { font-size: 12.5px; color: var(--mk-muted); line-height: 1.55; }

  .ap-future-tag {
    display: inline-flex;
    align-items: center;
    gap: 4px;
    font-size: 10px;
    font-family: var(--mk-font-mono);
    padding: 3px 8px;
    border-radius: var(--mk-radius-pill);
    width: fit-content;
  }

  .ap-future-tag.shipped { background: rgba(34,197,94,0.12); color: #22c55e; border: 1px solid rgba(34,197,94,0.2); }
  .ap-future-tag.building { background: rgba(79,142,247,0.1); color: #7aacf8; border: 1px solid rgba(79,142,247,0.2); }
  .ap-future-tag.planned { background: rgba(251,191,36,0.1); color: #fbbf24; border: 1px solid rgba(251,191,36,0.2); }

  /* ── Footer contact ── */
  .ap-contact-band {
    padding: 80px 5%;
    background: var(--mk-bg2);
    border-top: 1px solid var(--mk-border);
  }

  @media (max-width: 900px) {
    .ap-story-grid { grid-template-columns: 1fr; }
    .ap-story-aside { position: static; }
    .ap-mv-grid { grid-template-columns: 1fr; }
    .ap-values-grid { grid-template-columns: 1fr 1fr; }
    .ap-team-grid { grid-template-columns: 1fr; }
    .ap-future-grid { grid-template-columns: 1fr 1fr; }
  }

  @media (max-width: 540px) {
    .ap-values-grid { grid-template-columns: 1fr; }
    .ap-future-grid { grid-template-columns: 1fr; }
  }
`;function c(){return i(),(0,o.jsxs)(a,{children:[(0,o.jsx)(`style`,{children:s}),(0,o.jsxs)(`section`,{className:`ap-hero`,children:[(0,o.jsx)(`div`,{className:`ap-hero-bg`}),(0,o.jsxs)(`div`,{className:`ap-hero-inner`,children:[(0,o.jsx)(`div`,{className:`mk-eyebrow mk-reveal`,style:{margin:`0 auto 20px`},children:`About ConvDash`}),(0,o.jsxs)(`h1`,{className:`mk-heading-xl mk-reveal mk-reveal-delay-1`,children:[`Built by people who`,(0,o.jsx)(`br`,{}),(0,o.jsx)(`span`,{className:`mk-blue-gradient`,children:`got tired of chasing.`})]}),(0,o.jsx)(`p`,{className:`mk-body mk-reveal mk-reveal-delay-2`,style:{maxWidth:540,margin:`20px auto 0`},children:`ConvDash was born from a frustrating weekend of spreadsheet scrolling and unanswered phone calls. We knew AI could fix this. So we built it.`})]})]}),(0,o.jsx)(`section`,{className:`ap-story`,children:(0,o.jsxs)(`div`,{className:`ap-story-grid`,children:[(0,o.jsxs)(`div`,{className:`ap-story-text`,children:[(0,o.jsx)(`div`,{className:`mk-eyebrow mk-reveal`,children:`Our Story`}),(0,o.jsxs)(`h2`,{className:`mk-topic-head mk-heading-lg mk-reveal mk-reveal-delay-1`,children:[`From frustration`,(0,o.jsx)(`br`,{}),`to a platform`]}),(0,o.jsx)(`div`,{className:`mk-topic-line`}),(0,o.jsxs)(`p`,{className:`mk-reveal mk-reveal-delay-2`,children:[`It started with a housing society treasurer drowning in WhatsApp messages and sticky notes. `,(0,o.jsx)(`strong`,{children:`Three months overdue. Eight residents. Forty follow-ups.`}),`The problem wasn't laziness — it was the tools. Or rather, the complete absence of tools.`]}),(0,o.jsx)(`p`,{className:`mk-reveal mk-reveal-delay-3`,children:`We asked: what if AI could make the phone calls? What if the reminder system understood "snooze till next week" as naturally as a human would? What if you never had to type "friendly reminder" into a WhatsApp group again?`}),(0,o.jsxs)(`p`,{className:`mk-reveal mk-reveal-delay-4`,children:[`That question became a weekend prototype. The prototype became a system. The system started `,(0,o.jsx)(`strong`,{children:`actually recovering payments`}),` for real businesses in our network. And that's when we knew we had to build ConvDash properly.`]}),(0,o.jsx)(`p`,{className:`mk-reveal mk-reveal-delay-5`,children:`Today, ConvDash combines speech recognition (ASR), language intelligence (LLM), and voice synthesis (TTS) into a seamless collection automation platform — designed specifically for Indian businesses, where voice is the most natural channel and manual follow-up is the biggest operational drain.`})]}),(0,o.jsx)(`div`,{className:`ap-story-aside`,children:[[``,`Where it started`,`A housing society treasurer chasing 8 residents across WhatsApp for 3 months straight.`],[``,`The "what if" moment`,`"What if AI just... called them?" That question started everything.`],[``,`What it became`,`A full-stack AI voice platform that handles reminders, disputes, snoozes, and analytics — automatically.`]].map(([e,t,n],r)=>(0,o.jsxs)(`div`,{className:`ap-aside-card mk-reveal mk-reveal-delay-${r+1}`,children:[(0,o.jsx)(`div`,{className:`ap-aside-card-icon`}),(0,o.jsx)(`h4`,{children:t}),(0,o.jsx)(`p`,{children:n})]},r))})]})}),(0,o.jsxs)(`section`,{className:`ap-mv`,children:[(0,o.jsxs)(`div`,{style:{textAlign:`center`,marginBottom:48},children:[(0,o.jsx)(`div`,{className:`mk-eyebrow mk-reveal`,style:{margin:`0 auto 20px`},children:`What We Stand For`}),(0,o.jsxs)(`h2`,{className:`mk-heading-lg mk-reveal mk-reveal-delay-1`,children:[`Mission & `,(0,o.jsx)(`span`,{className:`mk-blue-gradient`,children:`Vision`})]})]}),(0,o.jsxs)(`div`,{className:`ap-mv-grid`,children:[(0,o.jsxs)(`div`,{className:`ap-mv-card mission mk-reveal mk-reveal-left mk-reveal-delay-1`,children:[(0,o.jsx)(`div`,{className:`ap-mv-label`,children:`Mission`}),(0,o.jsx)(`h2`,{children:`Eliminate manual payment follow-ups for every business in India.`}),(0,o.jsx)(`p`,{children:`We believe that no business owner should spend hours chasing payments that are rightfully theirs. Our mission is to make intelligent, voice-first collection automation accessible to every business — from a one-person freelancer to a multi-branch NBFC.`}),(0,o.jsx)(`div`,{className:`ap-mv-glow`,style:{background:`radial-gradient(circle, #1d4ed8, transparent)`}})]}),(0,o.jsxs)(`div`,{className:`ap-mv-card vision mk-reveal mk-reveal-right mk-reveal-delay-2`,children:[(0,o.jsx)(`div`,{className:`ap-mv-label`,style:{color:`#2dd4bf`},children:`Vision`}),(0,o.jsx)(`h2`,{children:`A world where cash flow is never held hostage by a missed call.`}),(0,o.jsx)(`p`,{children:`In 5 years, we want ConvDash to be the default infrastructure for how businesses in South Asia manage receivables — the way Stripe became the default for payments. Voice-first, multi-lingual, deeply contextual, and built for Bharat — not just for metros.`}),(0,o.jsx)(`div`,{className:`ap-mv-glow`,style:{background:`radial-gradient(circle, #0d9488, transparent)`}})]})]})]}),(0,o.jsxs)(`section`,{className:`ap-timeline`,children:[(0,o.jsxs)(`div`,{className:`ap-timeline-header mk-reveal`,children:[(0,o.jsx)(`div`,{className:`mk-eyebrow`,style:{margin:`0 auto 20px`},children:`Our Journey`}),(0,o.jsxs)(`h2`,{className:`mk-heading-lg`,children:[`From idea to`,(0,o.jsx)(`br`,{}),(0,o.jsx)(`span`,{className:`mk-blue-gradient`,children:`shipped product`})]})]}),(0,o.jsx)(`div`,{className:`ap-timeline-track`,children:[[``,`Jan 2026`,`The Problem Discovered`,`A housing society treasurer spends 3 months chasing 8 people for maintenance dues. The pain was real. The idea was born.`],[``,`Feb 2026`,`First Prototype`,`Built a basic voice reminder loop over a weekend — Whisper for STT, Gemini for intent, a janky TTS. It worked well enough to get excited.`],[``,`Mar 2026`,`Core Platform Built`,`Full-stack app: auth, dues CRUD, conversation system, voice pipeline, real-time socket updates, analytics. Messy but functional.`],[``,`Apr 2026`,`Product Polish`,`Redesigned the full UI — dark navy theme, bill-threaded conversations, Finance tab, analytics charts. Started building the marketing site.`],[``,`Q3 2026`,`Beta Launch (Target)`,`Public beta for 100 businesses. WhatsApp channel integration. Payment gateway webhooks. Regional language support.`],[``,`Q4 2026`,`Scale (Target)`,`Multi-tenant SaaS launch, enterprise plans, team features, campaign automation for collection agencies.`]].map(([e,t,n,r],i)=>(0,o.jsxs)(`div`,{className:`ap-tl-item mk-reveal mk-reveal-delay-${i%3+1}`,children:[(0,o.jsx)(`div`,{className:`ap-tl-dot`,children:e}),(0,o.jsxs)(`div`,{className:`ap-tl-content`,children:[(0,o.jsx)(`div`,{className:`ap-tl-date`,children:t}),(0,o.jsx)(`div`,{className:`ap-tl-title`,children:n}),(0,o.jsx)(`div`,{className:`ap-tl-desc`,children:r})]})]},i))})]}),(0,o.jsxs)(`section`,{className:`ap-values`,children:[(0,o.jsxs)(`div`,{className:`ap-values-header mk-reveal`,children:[(0,o.jsx)(`div`,{className:`mk-eyebrow`,style:{margin:`0 auto 20px`},children:`Core Values`}),(0,o.jsxs)(`h2`,{className:`mk-heading-lg`,children:[`What we optimize for`,(0,o.jsx)(`br`,{}),(0,o.jsx)(`span`,{className:`mk-blue-gradient`,children:`every day`})]})]}),(0,o.jsx)(`div`,{className:`ap-values-grid`,children:[[`01`,`Builder Honesty`,`We ship real features, not demos. If it doesn't work reliably, it doesn't go in the product. We'd rather underpromise and overdeliver.`],[`02`,`Voice as Default`,`We believe voice is the most human channel. Text is backup. Everything we build starts with "what if the user just spoke?".`],[`03`,`Bharat-First Design`,`Our users are often running WhatsApp-based businesses or housing societies. We design for them, not for SF startup aesthetics.`],[`04`,`Graceful Failures`,`Systems fail. Our philosophy: when they do, the user should still get value. Text works when voice fails. Data shows even when charts don't.`],[`05`,`Obsessive Simplicity`,`A collection system should feel as simple as WhatsApp. If a feature requires a manual, it's not ready.`],[`06`,`Privacy as Architecture`,`Audio never leaves your server. Auth is JWTs, not magic links. We treat your customer data like it's ours.`]].map(([e,t,n],r)=>(0,o.jsxs)(`div`,{className:`ap-value-card mk-reveal mk-reveal-delay-${r%3+1}`,children:[(0,o.jsx)(`div`,{className:`ap-value-num`,children:e}),(0,o.jsx)(`h3`,{children:t}),(0,o.jsx)(`p`,{children:n})]},r))})]}),(0,o.jsxs)(`section`,{className:`ap-team`,children:[(0,o.jsxs)(`div`,{className:`ap-team-header mk-reveal`,children:[(0,o.jsx)(`div`,{className:`mk-eyebrow`,style:{margin:`0 auto 20px`},children:`The Team`}),(0,o.jsxs)(`h2`,{className:`mk-heading-lg`,children:[`Small team.`,(0,o.jsx)(`br`,{}),(0,o.jsx)(`span`,{className:`mk-blue-gradient`,children:`Serious builders.`})]}),(0,o.jsx)(`p`,{className:`mk-body`,style:{maxWidth:440,margin:`14px auto 0`},children:`We're a lean founding team that ships fast and talks to users constantly.`})]}),(0,o.jsx)(`div`,{className:`ap-team-grid`,children:[{initials:`HM`,name:`Haaris Malick`,role:`Founder & CEO`,bio:`Product + engineering. Obsessed with AI voice UX and the problem of payment recovery in Bharat.`},{initials:`AI`,name:`AI Co-Pilot`,role:`Intelligence Layer`,bio:`Powered by Whisper, Gemini, and local TTS. Handles every reminder, every intent, every voice reply.`},{initials:`OS`,name:`Open Source`,role:`Foundation`,bio:`Built on Node.js, React, MongoDB, Socket.IO, and the shoulders of the open-source community.`}].map((e,t)=>(0,o.jsxs)(`div`,{className:`ap-team-card mk-reveal mk-reveal-delay-${t+1}`,children:[(0,o.jsx)(`div`,{className:`ap-team-avatar`,children:e.initials}),(0,o.jsx)(`div`,{className:`ap-team-name`,children:e.name}),(0,o.jsx)(`div`,{className:`ap-team-role`,children:e.role}),(0,o.jsx)(`div`,{className:`ap-team-bio`,children:e.bio})]},t))})]}),(0,o.jsxs)(`section`,{className:`ap-future`,children:[(0,o.jsxs)(`div`,{className:`ap-future-header mk-reveal`,children:[(0,o.jsx)(`div`,{className:`mk-eyebrow`,style:{margin:`0 auto 20px`},children:`Roadmap`}),(0,o.jsxs)(`h2`,{className:`mk-heading-lg`,children:[`Where we're`,(0,o.jsx)(`br`,{}),(0,o.jsx)(`span`,{className:`mk-blue-gradient`,children:`headed next`})]})]}),(0,o.jsx)(`div`,{className:`ap-future-grid`,children:[{quarter:`Q1–Q2 2026`,title:`Core Platform`,desc:`Voice pipeline, bill threading, analytics, Finance tab, AI reminders.`,tag:`shipped`},{quarter:`Q3 2026`,title:`Multi-Channel`,desc:`WhatsApp Business API. SMS. Email digest. One platform, every channel.`,tag:`building`},{quarter:`Q3 2026`,title:`Payments`,desc:`Razorpay & Stripe integration. Pay-now CTA in reminder messages.`,tag:`building`},{quarter:`Q4 2026`,title:`Languages`,desc:`Hindi, Tamil, Telugu, Marathi. Voice reminders in the customer's language.`,tag:`planned`}].map((e,t)=>(0,o.jsxs)(`div`,{className:`ap-future-item mk-reveal mk-reveal-delay-${t+1}`,children:[(0,o.jsx)(`div`,{className:`ap-future-quarter`,children:e.quarter}),(0,o.jsx)(`h4`,{children:e.title}),(0,o.jsx)(`p`,{children:e.desc}),(0,o.jsx)(`div`,{className:`ap-future-tag ${e.tag}`,children:e.tag===`shipped`?`Shipped`:e.tag===`building`?`Building`:`Planned`})]},t))})]}),(0,o.jsx)(`section`,{className:`ap-contact-band`,children:(0,o.jsx)(`div`,{style:{maxWidth:1060,margin:`0 auto`},children:(0,o.jsxs)(`div`,{className:`mk-cta-band mk-reveal`,children:[(0,o.jsx)(`div`,{className:`mk-eyebrow`,style:{margin:`0 auto 18px`},children:`Join Us`}),(0,o.jsxs)(`h2`,{className:`mk-heading-lg`,style:{marginBottom:14},children:[`We're just getting`,(0,o.jsx)(`br`,{}),(0,o.jsx)(`span`,{className:`mk-blue-gradient`,children:`started.`})]}),(0,o.jsx)(`p`,{className:`mk-body`,style:{maxWidth:440,margin:`0 auto 32px`},children:`Early users help shape the product. Your feedback goes directly to the founder. Start free and tell us what you need.`}),(0,o.jsxs)(`div`,{style:{display:`flex`,gap:14,justifyContent:`center`,flexWrap:`wrap`},children:[(0,o.jsx)(e,{to:`/login`,className:`mk-btn-primary`,style:{fontSize:15,padding:`13px 28px`},children:`Try ConvDash Free →`}),(0,o.jsx)(`a`,{href:`mailto:support@convdash.ai`,className:`mk-btn-ghost`,style:{fontSize:15,padding:`12px 24px`},children:`Contact the Founder`})]})]})})})]})}export{c as default};