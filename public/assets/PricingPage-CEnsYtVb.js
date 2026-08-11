import{i as e,l as t,s as n,t as r}from"./index-DobhsK68.js";import{n as i,t as a}from"./MarketingLayout-Bbl8aedM.js";var o=t(n(),1),s=r(),c=`
  .pp-hero {
    padding: 100px 5% 80px;
    text-align: center;
    background:
      radial-gradient(ellipse 700px 350px at 50% -5%, rgba(29,78,216,0.18) 0%, transparent 60%),
      var(--mk-bg);
  }

  .pp-toggle {
    display: inline-flex;
    align-items: center;
    background: var(--mk-surface);
    border: 1px solid var(--mk-border);
    border-radius: var(--mk-radius-pill);
    padding: 4px;
    gap: 2px;
    margin: 28px auto 0;
  }

  .pp-toggle-btn {
    padding: 8px 20px;
    border-radius: var(--mk-radius-pill);
    border: none;
    font-size: 13.5px;
    font-weight: 500;
    font-family: var(--mk-font-body);
    cursor: pointer;
    transition: all 0.18s;
    background: transparent;
    color: var(--mk-muted);
  }

  .pp-toggle-btn.active {
    background: var(--mk-blue);
    color: #fff;
    box-shadow: 0 2px 12px rgba(79,142,247,0.35);
  }

  .pp-discount-badge {
    display: inline-flex;
    align-items: center;
    gap: 4px;
    font-size: 10.5px;
    font-family: var(--mk-font-mono);
    color: #2dd4bf;
    background: rgba(45,212,191,0.1);
    border: 1px solid rgba(45,212,191,0.2);
    border-radius: var(--mk-radius-pill);
    padding: 3px 9px;
    margin-left: 8px;
  }

  /* ── Plans ── */
  .pp-plans { padding: 80px 5%; }

  .pp-plans-grid {
    display: grid;
    grid-template-columns: repeat(3, 1fr);
    gap: 20px;
    max-width: 1060px;
    margin: 0 auto;
    align-items: start;
  }

  .pp-plan {
    background: var(--mk-surface);
    border: 1px solid var(--mk-border);
    border-radius: var(--mk-radius-lg);
    padding: 32px;
    position: relative;
    transition: all 0.2s;
  }

  .pp-plan:hover { box-shadow: 0 16px 60px rgba(4,8,16,0.55); }

  .pp-plan.featured {
    border-color: rgba(79,142,247,0.45);
    background: linear-gradient(160deg, #0c1e3e 0%, #0a1528 100%);
    transform: scale(1.03);
    box-shadow: 0 0 0 1px rgba(79,142,247,0.2) inset, 0 20px 60px rgba(29,78,216,0.2);
  }

  .pp-plan-badge {
    position: absolute;
    top: -13px;
    left: 50%;
    transform: translateX(-50%);
    background: linear-gradient(135deg, #1d4ed8, #4f8ef7);
    color: #fff;
    font-size: 11px;
    font-weight: 600;
    font-family: var(--mk-font-mono);
    letter-spacing: 0.05em;
    padding: 4px 14px;
    border-radius: var(--mk-radius-pill);
  }

  .pp-plan-name {
    font-family: var(--mk-font-display);
    font-size: 20px;
    font-weight: 700;
    color: var(--mk-fg);
    letter-spacing: -0.01em;
    margin-bottom: 6px;
  }

  .pp-plan-desc { font-size: 13.5px; color: var(--mk-muted); margin-bottom: 24px; line-height: 1.55; }

  .pp-plan-price {
    display: flex;
    align-items: baseline;
    gap: 4px;
    margin-bottom: 6px;
  }

  .pp-plan-currency { font-size: 20px; font-weight: 600; color: var(--mk-fg2); font-family: var(--mk-font-display); }

  .pp-plan-amount {
    font-family: var(--mk-font-display);
    font-size: 48px;
    font-weight: 700;
    letter-spacing: -0.03em;
    color: var(--mk-fg);
    line-height: 1;
  }

  .pp-plan-period { font-size: 14px; color: var(--mk-muted); }
  .pp-plan-billed { font-size: 12px; color: var(--mk-dim); font-family: var(--mk-font-mono); margin-bottom: 24px; }

  .pp-plan-btn {
    width: 100%;
    padding: 12px;
    border-radius: var(--mk-radius);
    border: 1px solid var(--mk-border-mid);
    background: transparent;
    color: var(--mk-fg2);
    font-size: 14px;
    font-weight: 600;
    font-family: var(--mk-font-body);
    cursor: pointer;
    text-decoration: none;
    display: flex;
    align-items: center;
    justify-content: center;
    transition: all 0.16s;
    margin-bottom: 24px;
  }

  .pp-plan-btn:hover { background: rgba(79,142,247,0.08); border-color: rgba(79,142,247,0.3); color: var(--mk-fg); }

  .pp-plan-btn.primary {
    background: linear-gradient(135deg, #1d4ed8, #4f8ef7);
    border-color: transparent;
    color: #fff;
    box-shadow: 0 4px 20px rgba(79,142,247,0.35);
  }

  .pp-plan-btn.primary:hover { box-shadow: 0 6px 28px rgba(79,142,247,0.5); transform: translateY(-1px); }

  .pp-plan-divider { border: none; border-top: 1px solid var(--mk-border); margin-bottom: 20px; }

  .pp-feature-list { display: flex; flex-direction: column; gap: 11px; }

  .pp-feature {
    display: flex;
    align-items: flex-start;
    gap: 10px;
    font-size: 13.5px;
    color: var(--mk-fg2);
    line-height: 1.45;
  }

  .pp-feature-check { color: #22c55e; flex-shrink: 0; font-size: 14px; margin-top: 1px; }
  .pp-feature-x     { color: var(--mk-dim); flex-shrink: 0; font-size: 14px; margin-top: 1px; }
  .pp-feature.disabled { color: var(--mk-dim); }

  /* ── ROI ── */
  .pp-roi { padding: 80px 5%; background: var(--mk-bg2); }
  .pp-roi-header { text-align: center; margin-bottom: 56px; }

  .pp-roi-grid {
    display: grid;
    grid-template-columns: repeat(3, 1fr);
    gap: 20px;
    max-width: 1000px;
    margin: 0 auto;
  }

  .pp-roi-card {
    background: linear-gradient(160deg, var(--mk-surface2), var(--mk-surface));
    border: 1px solid var(--mk-border);
    border-radius: var(--mk-radius-lg);
    padding: 28px;
    text-align: center;
  }

  .pp-roi-num {
    font-family: var(--mk-font-display);
    font-size: 42px;
    font-weight: 700;
    letter-spacing: -0.03em;
    background: linear-gradient(135deg, #eef2fb, #7aacf8);
    -webkit-background-clip: text;
    -webkit-text-fill-color: transparent;
    background-clip: text;
    margin-bottom: 8px;
  }

  .pp-roi-label { font-size: 14px; color: var(--mk-fg2); line-height: 1.5; }

  /* ── Comparison table ── */
  .pp-full-compare { padding: 80px 5%; }
  .pp-full-compare-header { text-align: center; margin-bottom: 48px; }

  .pp-table {
    max-width: 980px;
    margin: 0 auto;
    border: 1px solid var(--mk-border);
    border-radius: var(--mk-radius-lg);
    overflow: hidden;
  }

  .pp-table-head {
    display: grid;
    grid-template-columns: 2fr 1fr 1fr 1fr;
    background: var(--mk-surface2);
    border-bottom: 1px solid var(--mk-border);
    padding: 14px 24px;
    gap: 8px;
  }

  .pp-table-head-cell {
    font-family: var(--mk-font-display);
    font-size: 13px;
    font-weight: 600;
    text-transform: uppercase;
    letter-spacing: 0.04em;
    color: var(--mk-muted);
    text-align: center;
  }

  .pp-table-head-cell.highlight { color: var(--mk-blue-light); }
  .pp-table-head-cell:first-child { text-align: left; }

  .pp-table-section-head {
    padding: 10px 24px;
    font-size: 10.5px;
    font-family: var(--mk-font-mono);
    letter-spacing: 0.08em;
    text-transform: uppercase;
    color: var(--mk-dim);
    background: rgba(255,255,255,0.015);
    border-bottom: 1px solid var(--mk-border);
  }

  .pp-table-row {
    display: grid;
    grid-template-columns: 2fr 1fr 1fr 1fr;
    padding: 13px 24px;
    gap: 8px;
    border-bottom: 1px solid var(--mk-border);
    align-items: center;
  }

  .pp-table-row:last-child { border-bottom: none; }
  .pp-table-row:nth-child(even) { background: rgba(255,255,255,0.01); }

  .pp-table-feat { font-size: 13.5px; color: var(--mk-fg2); }
  .pp-table-cell { text-align: center; font-size: 13px; font-family: var(--mk-font-mono); color: var(--mk-muted); }
  .pp-table-cell.yes { color: #22c55e; }
  .pp-table-cell.no  { color: var(--mk-dim); }

  /* ── FAQ ── */
  .pp-faq { padding: 80px 5%; max-width: 780px; margin: 0 auto; }
  .pp-faq-header { text-align: center; margin-bottom: 44px; }

  .pp-faq-item { border-bottom: 1px solid var(--mk-border); padding: 20px 0; }
  .pp-faq-item:first-of-type { border-top: 1px solid var(--mk-border); }

  .pp-faq-q {
    font-family: var(--mk-font-display);
    font-size: 16px;
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

  .pp-faq-q:hover { color: var(--mk-blue-light); }
  .pp-faq-chevron { font-size: 11px; color: var(--mk-muted); transition: transform 0.2s; flex-shrink: 0; }
  .pp-faq-item.open .pp-faq-chevron { transform: rotate(180deg); }
  .pp-faq-a { color: var(--mk-fg2); font-size: 14px; line-height: 1.7; padding-top: 12px; }

  @media (max-width: 900px) {
    .pp-plans-grid { grid-template-columns: 1fr; }
    .pp-plan.featured { transform: none; }
    .pp-roi-grid { grid-template-columns: 1fr; }
    .pp-table-head, .pp-table-row { grid-template-columns: 2fr 1fr 1fr; }
    .pp-table-head .pp-table-head-cell:last-child,
    .pp-table-row .pp-table-cell:last-child { display: none; }
  }
`;function l({q:e,a:t}){let[n,r]=o.useState(!1);return(0,s.jsxs)(`div`,{className:`pp-faq-item${n?` open`:``}`,children:[(0,s.jsxs)(`button`,{className:`pp-faq-q`,onClick:()=>r(!n),children:[e,(0,s.jsx)(`span`,{className:`pp-faq-chevron`,children:`▼`})]}),n&&(0,s.jsx)(`div`,{className:`pp-faq-a`,children:t})]})}function u(){i();let[t,n]=(0,o.useState)(!0),r=[{name:`Starter`,desc:`For solo operators and micro-businesses starting their collection journey.`,monthly:0,annual:0,cta:`Start Free`,featured:!1,features:[[!0,`Up to 25 active dues`],[!0,`Voice reminders (50/month)`],[!0,`Basic analytics`],[!0,`Conversation history (30 days)`],[!1,`Custom reminder scripts`],[!1,`Priority support`],[!1,`Payment gateway integration`],[!1,`API access`]]},{name:`Growth`,desc:`For growing businesses that need full automation and deeper insights.`,monthly:2999,annual:1999,badge:`Most Popular`,cta:`Start 14-day Trial`,featured:!0,features:[[!0,`Up to 500 active dues`],[!0,`Voice reminders (unlimited)`],[!0,`Advanced analytics & delay tracking`],[!0,`Conversation history (1 year)`],[!0,`Custom reminder scripts`],[!0,`Priority email support`],[!0,`Razorpay / Stripe integration (coming)`],[!1,`API access`]]},{name:`Scale`,desc:`For enterprises and agencies with high-volume collection operations.`,monthly:7999,annual:5999,cta:`Contact Sales`,featured:!1,features:[[!0,`Unlimited dues`],[!0,`Voice + WhatsApp + SMS reminders`],[!0,`Full analytics suite + export`],[!0,`Unlimited conversation history`],[!0,`Custom scripts + multi-language`],[!0,`Dedicated support manager`],[!0,`All payment gateway integrations`],[!0,`Full API access + webhooks`]]}],u=e=>e===0?`0`:e.toLocaleString(`en-IN`);return(0,s.jsxs)(a,{children:[(0,s.jsx)(`style`,{children:c}),(0,s.jsxs)(`section`,{className:`pp-hero`,children:[(0,s.jsx)(`div`,{className:`mk-eyebrow mk-reveal`,style:{margin:`0 auto 20px`},children:`Pricing`}),(0,s.jsxs)(`h1`,{className:`mk-heading-xl mk-reveal mk-reveal-delay-1`,children:[`Simple pricing.`,(0,s.jsx)(`br`,{}),(0,s.jsx)(`span`,{className:`mk-blue-gradient`,children:`Serious results.`})]}),(0,s.jsx)(`p`,{className:`mk-body mk-reveal mk-reveal-delay-2`,style:{maxWidth:500,margin:`18px auto 0`},children:`Start free. Upgrade when you're ready. No hidden fees, no per-call charges.`}),(0,s.jsxs)(`div`,{className:`pp-toggle mk-reveal mk-reveal-delay-3`,children:[(0,s.jsx)(`button`,{className:`pp-toggle-btn${t?``:` active`}`,onClick:()=>n(!1),children:`Monthly`}),(0,s.jsxs)(`button`,{className:`pp-toggle-btn${t?` active`:``}`,onClick:()=>n(!0),children:[`Annual`,(0,s.jsx)(`span`,{className:`pp-discount-badge`,children:`Save 33%`})]})]})]}),(0,s.jsx)(`section`,{className:`pp-plans`,children:(0,s.jsx)(`div`,{className:`pp-plans-grid`,children:r.map((n,r)=>(0,s.jsxs)(`div`,{className:`pp-plan mk-reveal mk-reveal-delay-${r+1}${n.featured?` featured`:``}`,children:[n.badge&&(0,s.jsx)(`div`,{className:`pp-plan-badge`,children:n.badge}),(0,s.jsx)(`div`,{className:`pp-plan-name`,children:n.name}),(0,s.jsx)(`div`,{className:`pp-plan-desc`,children:n.desc}),(0,s.jsxs)(`div`,{className:`pp-plan-price`,children:[(0,s.jsx)(`span`,{className:`pp-plan-currency`,children:`₹`}),(0,s.jsx)(`span`,{className:`pp-plan-amount`,children:u(t?n.annual:n.monthly)}),(0,s.jsx)(`span`,{className:`pp-plan-period`,children:`/mo`})]}),(0,s.jsx)(`div`,{className:`pp-plan-billed`,children:n.monthly===0?`Forever free`:t?`Billed ₹${u((t?n.annual:n.monthly)*12)}/yr`:`Billed monthly`}),(0,s.jsxs)(e,{to:`/login`,className:`pp-plan-btn${n.featured?` primary`:``}`,children:[n.cta,` `,n.featured?`→`:``]}),(0,s.jsx)(`hr`,{className:`pp-plan-divider`}),(0,s.jsx)(`div`,{className:`pp-feature-list`,children:n.features.map(([e,t],n)=>(0,s.jsxs)(`div`,{className:`pp-feature${e?``:` disabled`}`,children:[(0,s.jsx)(`span`,{className:e?`pp-feature-check`:`pp-feature-x`,children:e?`Yes`:`No`}),t]},n))})]},r))})}),(0,s.jsxs)(`section`,{className:`pp-roi`,children:[(0,s.jsxs)(`div`,{className:`pp-roi-header mk-reveal`,children:[(0,s.jsx)(`div`,{className:`mk-eyebrow`,style:{margin:`0 auto 20px`},children:`Return on Investment`}),(0,s.jsxs)(`h2`,{className:`mk-heading-lg`,children:[`The numbers speak`,(0,s.jsx)(`br`,{}),(0,s.jsx)(`span`,{className:`mk-blue-gradient`,children:`for themselves`})]})]}),(0,s.jsx)(`div`,{className:`pp-roi-grid`,children:[[`₹0`,`Cost of 50 automated voice reminders on the Starter plan`],[`3×`,`Average improvement in payment recovery speed`],[`80%`,`Reduction in manual follow-up hours per month`]].map(([e,t],n)=>(0,s.jsxs)(`div`,{className:`pp-roi-card mk-reveal mk-reveal-delay-${n+1}`,children:[(0,s.jsx)(`div`,{className:`pp-roi-num`,children:e}),(0,s.jsx)(`div`,{className:`pp-roi-label`,children:t})]},n))})]}),(0,s.jsxs)(`section`,{className:`pp-full-compare`,children:[(0,s.jsxs)(`div`,{className:`pp-full-compare-header mk-reveal`,children:[(0,s.jsx)(`div`,{className:`mk-eyebrow`,style:{margin:`0 auto 20px`},children:`Full Comparison`}),(0,s.jsxs)(`h2`,{className:`mk-heading-lg`,children:[`Everything `,(0,s.jsx)(`span`,{className:`mk-blue-gradient`,children:`side by side`})]})]}),(0,s.jsxs)(`div`,{className:`pp-table mk-reveal mk-reveal-delay-1`,children:[(0,s.jsxs)(`div`,{className:`pp-table-head`,children:[(0,s.jsx)(`div`,{className:`pp-table-head-cell`,children:`Feature`}),(0,s.jsx)(`div`,{className:`pp-table-head-cell`,children:`Starter`}),(0,s.jsx)(`div`,{className:`pp-table-head-cell highlight`,children:`Growth`}),(0,s.jsx)(`div`,{className:`pp-table-head-cell`,children:`Scale`})]}),[{section:`Dues & Reminders`},[`Active dues`,`25`,`500`,`Unlimited`],[`Voice reminders/mo`,`50`,`∞`,`∞`],[`Reminder types`,`3`,`5+`,`Custom`],[`Snooze & escalation`,`Yes`,`Yes`,`Yes`],{section:`Analytics`},[`Basic analytics`,`Yes`,`Yes`,`Yes`],[`Payment delay tracking`,`No`,`Yes`,`Yes`],[`Collection rate chart`,`No`,`Yes`,`Yes`],[`Export CSV/PDF`,`No`,`Yes`,`Yes`],{section:`Integrations`},[`Razorpay / Stripe`,`No`,`Coming`,`Yes`],[`Webhook support`,`No`,`No`,`Yes`],[`API access`,`No`,`No`,`Yes`],{section:`Support`},[`Email support`,`No`,`Yes`,`Yes`],[`Priority support`,`No`,`No`,`Yes`],[`Dedicated manager`,`No`,`No`,`Yes`]].map((e,t)=>{if(e.section)return(0,s.jsx)(`div`,{className:`pp-table-section-head`,children:e.section},t);let[n,r,i,a]=e,o=e=>e===`Yes`?`yes`:e===`No`?`no`:``;return(0,s.jsxs)(`div`,{className:`pp-table-row`,children:[(0,s.jsx)(`div`,{className:`pp-table-feat`,children:n}),(0,s.jsx)(`div`,{className:`pp-table-cell ${o(r)}`,children:r}),(0,s.jsx)(`div`,{className:`pp-table-cell ${o(i)}`,children:i}),(0,s.jsx)(`div`,{className:`pp-table-cell ${o(a)}`,children:a})]},t)})]})]}),(0,s.jsx)(`section`,{style:{padding:`0 0 80px`},children:(0,s.jsxs)(`div`,{className:`pp-faq`,children:[(0,s.jsxs)(`div`,{className:`pp-faq-header mk-reveal`,children:[(0,s.jsx)(`div`,{className:`mk-eyebrow`,style:{margin:`0 auto 16px`},children:`Pricing FAQ`}),(0,s.jsx)(`h2`,{className:`mk-heading-lg`,children:`Questions?`})]}),[[`Is the Starter plan really free forever?`,`Yes. The Starter plan is permanently free for up to 25 dues and 50 voice reminders per month. No credit card required, no trial period.`],[`What happens if I exceed my plan limits?`,`We'll notify you before you hit the limit. You can upgrade at any time. We don't cut off reminders without warning.`],[`Can I cancel anytime?`,`Yes. Monthly plans cancel at end of billing period. Annual plans are non-refundable but you keep full access until the year ends.`],[`Do you charge per voice call?`,`No. Voice reminders are included in your plan quota, not billed per call. Unlimited on Growth and Scale.`],[`Is there a setup fee?`,`Zero. No setup fee, no onboarding fee, no hidden charges.`],[`Do you offer discounts for NGOs or educational institutions?`,`Yes — contact us at support@convdash.ai with your organization details for a custom plan.`]].map(([e,t],n)=>(0,s.jsx)(l,{q:e,a:t},n))]})}),(0,s.jsx)(`section`,{style:{padding:`0 5% 80px`},children:(0,s.jsx)(`div`,{style:{maxWidth:1060,margin:`0 auto`},children:(0,s.jsxs)(`div`,{className:`mk-cta-band mk-reveal`,children:[(0,s.jsx)(`div`,{className:`mk-eyebrow`,style:{margin:`0 auto 16px`},children:`No risk. Start free.`}),(0,s.jsxs)(`h2`,{className:`mk-heading-lg`,style:{marginBottom:14},children:[`Your first 25 dues.`,(0,s.jsx)(`br`,{}),(0,s.jsx)(`span`,{className:`mk-blue-gradient`,children:`On us, forever.`})]}),(0,s.jsx)(`p`,{className:`mk-body`,style:{maxWidth:400,margin:`0 auto 28px`},children:`No credit card. No time limit. Just a smarter way to collect.`}),(0,s.jsx)(e,{to:`/login`,className:`mk-btn-primary`,style:{fontSize:15,padding:`13px 28px`},children:`Get Started Free →`})]})})})]})}export{u as default};