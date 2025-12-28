import React from 'react';

/* ================= HEADER ================= */
const Header = () => (
  <header style={{ padding: '1rem', backgroundColor: '#2f7d6d', color: '#ffffff', textAlign: 'center' }}>
    <h1 style={{ margin: 0, letterSpacing: 1 }}>ONJO TECH</h1>
  </header>
);

/* ================= FOOTER ================= */
const Footer = () => (
  <footer style={{ padding: '2rem', backgroundColor: '#1f5f54', color: '#ffffff', textAlign: 'center' }}>
    <p>© 2025 ONJO TECH. Building clarity in a complex technological world.</p>
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
          <h1 className="about-title">About ONJO TECH</h1>
          <p className="about-subtitle"><em>Empowering innovators with actionable knowledge in electronics, programming, AI, cybersecurity, and more.</em></p>
        </section>

        <section className="about-content-section">
          {/* What ONJO TECH Is */}
          <div className="content-block reveal delay-1">
            <h2 className="content-heading">What ONJO TECH Is</h2>
            <p className="content-paragraph">
              ONJO TECH is an educational technology platform focused on breaking down complex systems into clear, structured, and practical knowledge for learners, developers, and innovators.
            </p>
          </div>

          {/* Knowledge Pillars */}
          <div className="content-block reveal delay-2">
            <h2 className="content-heading">Our Knowledge Pillars</h2>
            <ul className="values-list">
              <li><span className="value-name">Electronics</span>Circuits, transistors, embedded systems</li>
              <li><span className="value-name">Telecommunications</span>Signals, networks, wireless infrastructure</li>
              <li><span className="value-name">Programming</span>Logic, coding, system-level architecture</li>
              <li><span className="value-name">Artificial Intelligence</span>Machine learning, neural networks, NLP</li>
              <li><span className="value-name">Cybersecurity</span>Encryption, threat modeling, network defense</li>
              <li><span className="value-name">Emerging Tech</span>IoT, robotics, blockchain, quantum computing</li>
              <li><span className="value-name">Cloud & DevOps</span>Deployment, CI/CD, scalable infrastructure</li>
              <li><span className="value-name">Data Science</span>Data modeling, analytics, visualization</li>
              <li><span className="value-name">Web & Mobile Dev</span>Frontend, backend, frameworks, UI/UX</li>
              <li><span className="value-name">Human-Machine Interfaces</span>AR/VR, interactive systems, user experience</li>
            </ul>
          </div>

          {/* Audience */}
          <div className="content-block reveal delay-3">
            <h2 className="content-heading">Who ONJO TECH Is For</h2>
            <div className="team-grid">
              <div className="team-member">
                <h3 className="member-name">Learners</h3>
                <p className="member-bio">Students and enthusiasts seeking deep understanding</p>
              </div>
              <div className="team-member">
                <h3 className="member-name">Developers</h3>
                <p className="member-bio">System-level thinkers and builders</p>
              </div>
              <div className="team-member">
                <h3 className="member-name">Engineers</h3>
                <p className="member-bio">Designers of scalable systems and innovative solutions</p>
              </div>
              <div className="team-member">
                <h3 className="member-name">Educators</h3>
                <p className="member-bio">Teachers simplifying complex technology for learners</p>
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
