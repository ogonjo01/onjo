import React from 'react';
import './Features.css'; // Correctly import CSS

const features = [
  {
    title: "Actionable Insights", // Unchanged: Versatile title
    description: `We break down niche products from real user reviews into clear pros/cons and how-tos. Skip the hype—get verified tips for kitchen gadgets, eco-tools, or tech that fit your life in 2025.`,
    icon: (
      <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 576 512" fill="currentColor">
        <path d="M544 0H32C14.33 0 0 14.33 0 32v448c0 17.67 14.33 32 32 32h512c17.67 0 32-14.33 32-32V32c0-17.67-14.33-32-32-32zM368 416H208v-32h160v32zm0-64H208v-32h160v32zM192 144H64v-64h128v64zm192 0H224v-64h160v64zm128 0H416v-64h96v64zm-128 128H224v-64h160v64zm128 0H416v-64h96v64z"/>
      </svg>
    ),
  },
  {
    title: "Niche Product Foundations", // Updated Oct 14, 2025: From "Foundational Strategies" to product fit
    description: "Dive into breakdowns for everyday essentials like ergonomic desks or urban bike locks. We highlight durable, value-driven picks based on Amazon data and Reddit wisdom to build your smart shopping base.",
    icon: (
      <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 512 512" fill="currentColor">
        <path d="M256 80c-8.84 0-16 7.16-16 16v160c0 8.84 7.16 16 16 16s16-7.16 16-16V96c0-8.84-7.16-16-16-16zM464 256c0-114.69-93.31-208-208-208S48 141.31 48 256s93.31 208 208 208 208-93.31 208-208zM256 416c-88.37 0-160-71.63-160-160s71.63-160 160-160 160 71.63 160 160-71.63 160-160 160z"/>
      </svg>
    ),
  },
  {
    title: "Sustainable Growth Picks", // Updated: From "Growth & Scaling" to eco/product scaling
    description: "Scale your choices sustainably with guides on customer-favorite eco-gadgets and efficient tools. Covering trends like AI-assisted shopping and green alternatives for long-term wins.",
    icon: (
      <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 512 512" fill="currentColor">
        <path d="M256 48c-114.7 0-208 93.3-208 208s93.3 208 208 208 208-93.3 208-208S370.7 48 256 48zm0 384c-97 0-176-79-176-176S159 80 256 80s176 79 176 176-79 176-176 176z"/>
      </svg>
    ),
  },
  {
    title: "Expert Decision Tools", // Updated: From "Mastering Leadership" to decision-making
    description: "Navigate tough picks with confidence—our breakdowns on team-tested products include alt options, cost breakdowns, and user stories to foster smarter, frustration-free buys.",
    icon: (
      <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 512 512" fill="currentColor">
        <path d="M256 0C114.6 0 0 114.6 0 256s114.6 256 256 256 256-114.6 256-256S397.4 0 256 0zm0 480c-123.7 0-224-100.3-224-224S132.3 32 256 32s224 100.3 224 224-100.3 224-224 224z"/>
      </svg>
    ),
  },
  {
    title: "Curated Niche Library", // Updated: From "Strategic Curation" to product curation
    description: "Handpicked guides from 500+ reviews across sources like Wirecutter and forums—quality-focused on your needs, from beginner hacks to pro workflows, no fluff.",
    icon: (
      <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 512 512" fill="currentColor">
        <path d="M256 32C132.3 32 32 132.3 32 256s100.3 224 224 224 224-100.3 224-224S379.7 32 256 32zm0 416c-105.9 0-192-86.1-192-192S150.1 64 256 64s192 86.1 192 192-86.1 192-192 192z"/>
      </svg>
    ),
  },
];

const App = () => {
  return (
    <div className="features-page-container">
      <header className="header">
        <h1 className="header-title">OGONJO</h1> {/* Unchanged: Brand consistent */}
      </header>

      <main className="main-content">
        <section className="hero-section">
          <h1 className="hero-title">Empower Your Everyday Choices</h1> {/* Updated: Aligns with About Us hero */}
          <p className="hero-description">
            Discover niche product guides, pros/cons breakdowns, and actionable insights from real reviews. Cut through the noise for smarter, sustainable decisions.
          </p>
        </section>

        <section className="features-grid-section">
          <div className="features-grid">
            {features.map((feature, idx) => (
              <div key={idx} className="feature-card">
                <div className="feature-icon">{feature.icon}</div>
                <h3 className="feature-title">{feature.title}</h3>
                <p className="feature-description">{feature.description}</p>
              </div>
            ))}
          </div>
        </section>
      </main>

      <footer className="footer">
        <p>&copy; 2025 OGONJO. All rights reserved.</p> {/* Updated: Year + brand match */}
      </footer>
    </div>
  );
};

export default App;