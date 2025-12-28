import React from 'react';
import './Features.css';

const features = [
  {
    title: "Electronics Foundations",
    description: "Learn the building blocks of modern electronics—transistors, circuits, sensors, and power systems explained clearly for practical applications.",
    icon: (
      <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 512 512" fill="currentColor">
        <path d="M256 0C114.6 0 0 114.6 0 256s114.6 256 256 256 256-114.6 256-256S397.4 0 256 0zm0 480c-123.7 0-224-100.3-224-224S132.3 32 256 32s224 100.3 224 224-100.3 224-224 224z"/>
      </svg>
    ),
  },
  {
    title: "Programming & Logic",
    description: "Master coding fundamentals and system logic. From algorithms to real-world software architecture, build skills for AI, web, and embedded systems.",
    icon: (
      <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 512 512" fill="currentColor">
        <path d="M256 32C132.3 32 32 132.3 32 256s100.3 224 224 224 224-100.3 224-224S379.7 32 256 32zm0 416c-105.9 0-192-86.1-192-192S150.1 64 256 64s192 86.1 192 192-86.1 192-192 192z"/>
      </svg>
    ),
  },
  {
    title: "Telecommunications",
    description: "Understand signals, networking, and communication systems. Learn how data travels globally and how networks are built and secured.",
    icon: (
      <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 512 512" fill="currentColor">
        <path d="M256 48C132.3 48 32 148.3 32 272s100.3 224 224 224 224-100.3 224-224S379.7 48 256 48zm0 384c-88.2 0-160-71.8-160-160s71.8-160 160-160 160 71.8 160 160-71.8 160-160 160z"/>
      </svg>
    ),
  },
  {
    title: "Artificial Intelligence",
    description: "Explore machine learning, language models, and intelligent systems. Learn AI concepts and practical applications for innovation and automation.",
    icon: (
      <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 512 512" fill="currentColor">
        <path d="M256 16C132.3 16 32 116.3 32 240s100.3 224 224 224 224-100.3 224-224S379.7 16 256 16zm0 400c-97 0-176-79-176-176S159 64 256 64s176 79 176 176-79 176-176 176z"/>
      </svg>
    ),
  },
  {
    title: "Cybersecurity",
    description: "Learn to protect systems from attacks. Understand encryption, firewalls, penetration testing, and strategies to secure networks and data.",
    icon: (
      <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 512 512" fill="currentColor">
        <path d="M256 0C114.6 0 0 114.6 0 256s114.6 256 256 256 256-114.6 256-256S397.4 0 256 0zm0 480c-123.7 0-224-100.3-224-224S132.3 32 256 32s224 100.3 224 224-100.3 224-224 224z"/>
      </svg>
    ),
  },
];

const Features = () => {
  return (
    <div className="features-page-container">
      <header className="header">
        <h1 className="header-title">ONJO TECH</h1>
      </header>

      <main className="main-content">
        <section className="hero-section">
          <h1 className="hero-title">Empower Your Technology Skills</h1>
          <p className="hero-description">
            Explore electronics, programming, AI, cybersecurity, and telecommunications. Gain clear, structured knowledge to innovate and build in the modern tech landscape.
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
        <p>&copy; 2025 ONJO TECH. Empowering knowledge in technology.</p>
      </footer>
    </div>
  );
};

export default Features;
