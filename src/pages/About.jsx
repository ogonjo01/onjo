import React from 'react';

/* ================= HEADER ================= */
const Header = () => (
  <header style={{ padding: '1rem', backgroundColor: '#2f7d6d', color: '#ffffff', textAlign: 'center' }}>
    <h1 style={{ margin: 0, letterSpacing: 1 }}>ONJO Reviews</h1>
  </header>
);

/* ================= FOOTER ================= */
const Footer = () => (
  <footer style={{ padding: '2rem', backgroundColor: '#1f5f54', color: '#ffffff', textAlign: 'center' }}>
    <p>© 2025 ONJO Reviews. Helping you choose better.</p>
  </footer>
);

const About = () => {
  return (
    <div className="about-page-container fade-in">
      <style>{`
        :root {
          --green-dark: #1f5f54;
          --green-mid: #2f7d6d;
          --green-soft: #4fae9b;
          --green-bg: #f3faf8;
          --text-main: #1e2d2b;
          --text-muted: #5f7772;
          --radius: 14px;
        }

        /* BASE */
        .about-page-container { background: var(--green-bg); min-height: 100vh; font-family: 'Inter', system-ui, sans-serif; color: var(--text-main); }
        .main-content { max-width: 1200px; margin: 0 auto; padding: 4rem 1.5rem; }

        /* ANIMATIONS */
        @keyframes fadeUp { from { opacity:0; transform: translateY(24px);} to {opacity:1; transform: translateY(0);} }
        .fade-in { animation: fadeUp 0.9s ease forwards; }
        .reveal { opacity: 0; animation: fadeUp 0.8s ease forwards; }
        .reveal.delay-1 { animation-delay: 0.15s; }
        .reveal.delay-2 { animation-delay: 0.3s; }
        .reveal.delay-3 { animation-delay: 0.45s; }
        .reveal.delay-4 { animation-delay: 0.6s; }

        /* HERO */
        .about-hero-section { text-align: center; padding: 3rem 2rem; border-radius: var(--radius); background: linear-gradient(180deg,#ffffff,#eef7f5); margin-bottom:4rem; box-shadow:0 10px 30px rgba(0,0,0,0.05);}
        .about-title { font-size: 3rem; font-weight: 800; margin-bottom: 0.5rem; color: var(--green-dark); }
        .about-subtitle { font-size:1.2rem; color: var(--text-muted); }

        /* CONTENT BLOCKS */
        .about-content-section { display:flex; flex-direction:column; gap:3rem; }
        .content-block { background:#fff; padding:2.5rem; border-radius:var(--radius); box-shadow:0 8px 24px rgba(0,0,0,0.04); transition: transform 0.35s ease, box-shadow 0.35s ease; }
        .content-block:hover { transform: translateY(-6px); box-shadow:0 16px 36px rgba(0,0,0,0.08);}
        .content-heading { font-size:2rem; margin-bottom:1.5rem; color: var(--green-dark); }
        .content-paragraph { font-size:1rem; line-height:1.8; color: var(--text-muted); margin-bottom:1.3rem; }

        /* PILLARS */
        .values-list { list-style:none; padding:0; display:grid; grid-template-columns:repeat(auto-fit, minmax(240px,1fr)); gap:1.5rem; }
        .values-list li { background:#f8fefe; padding:1.6rem; border-radius:12px; border-left:5px solid var(--green-soft); transition: transform 0.3s ease, background 0.3s ease; }
        .values-list li:hover { transform: translateY(-5px); background:#fff; }
        .value-name { font-weight:700; color:var(--green-mid); display:block; margin-bottom:0.4rem; }

        /* AUDIENCE */
        .team-grid { display:grid; grid-template-columns:repeat(auto-fit,minmax(240px,1fr)); gap:2rem; }
        .team-member { background:#fff; padding:2rem; border-radius:14px; text-align:center; transition: transform 0.35s ease, box-shadow 0.35s ease; }
        .team-member:hover { transform: translateY(-8px); box-shadow:0 14px 34px rgba(0,0,0,0.08); }
        .member-name { font-size:1.25rem; font-weight:700; color:var(--green-dark); margin-bottom:0.5rem; }
        .member-bio { font-size:0.95rem; color:var(--text-muted); }

        @media (prefers-reduced-motion: reduce) { * { animation:none !important; transition:none !important; } }
      `}</style>

      <Header />

      <main className="main-content">
        {/* HERO */}
        <section className="about-hero-section reveal">
          <h1 className="about-title">About ONJO Reviews</h1>
          <p className="about-subtitle">
            <em>Honest product reviews and recommendations to help people make better buying decisions.</em>
          </p>
        </section>

        <section className="about-content-section">
          {/* What ONJO Reviews Is */}
          <div className="content-block reveal delay-1">
            <h2 className="content-heading">What ONJO Reviews Is</h2>
            <p className="content-paragraph">
              ONJO Reviews is a product review and recommendation platform built to simplify decision-making.
              We evaluate products through clear explanations, practical insights, and transparent pros and cons
              so people can choose with confidence.
            </p>
          </div>

          {/* Review Focus Areas */}
          <div className="content-block reveal delay-2">
            <h2 className="content-heading">What We Review</h2>
            <ul className="values-list">
              <li><span className="value-name">Technology & Gadgets</span>Devices, hardware, and everyday tech tools</li>
              <li><span className="value-name">Software & SaaS</span>Productivity, business, and creative software</li>
              <li><span className="value-name">AI Tools</span>Automation, content, and workflow enhancement tools</li>
              <li><span className="value-name">Developer Tools</span>Platforms, services, and technical solutions</li>
              <li><span className="value-name">Online Services</span>Digital platforms and subscription services</li>
              <li><span className="value-name">Product Comparisons</span>Side-by-side analysis to clarify choices</li>
              <li><span className="value-name">Buying Guides</span>Clear recommendations for specific needs</li>
              <li><span className="value-name">Use-Case Reviews</span>How products perform in real-world scenarios</li>
            </ul>
          </div>

          {/* Audience */}
          <div className="content-block reveal delay-3">
            <h2 className="content-heading">Who ONJO Reviews Is For</h2>
            <div className="team-grid">
              <div className="team-member">
                <h3 className="member-name">Everyday Buyers</h3>
                <p className="member-bio">People who want clear answers before making a purchase</p>
              </div>
              <div className="team-member">
                <h3 className="member-name">Professionals</h3>
                <p className="member-bio">Users choosing tools for work, business, or productivity</p>
              </div>
              <div className="team-member">
                <h3 className="member-name">Creators & Builders</h3>
                <p className="member-bio">Those selecting software, services, and platforms to build with</p>
              </div>
              <div className="team-member">
                <h3 className="member-name">Curious Researchers</h3>
                <p className="member-bio">People comparing options before committing time or money</p>
              </div>
            </div>
          </div>
        </section>
      </main>

      <Footer />
    </div>
  );
};

export default About;
