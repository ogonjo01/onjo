import React from 'react';

// Mock Header component to keep all code in a single file
const Header = () => (
  <header className="header">
    <div className="header-container">
      <h1 className="header-title">ONJO</h1> {/* Unchanged: Brand consistency */}
    </div>
  </header>
);

// Mock Footer component to keep all code in a single file
const Footer = () => (
  <footer className="footer">
    <div className="footer-container">
      <p>&copy; {new Date().getFullYear()} ONJO. All rights reserved.</p> {/* Unchanged: Brand alignment */}
    </div>
  </footer>
);

const Terms = () => {
  return (
    <>
      <style>
        {`
        @import url('https://fonts.googleapis.com/css2?family=Roboto:wght@400;500;700&family=Montserrat:wght@600;700&display=swap');

        body {
          margin: 0;
          font-family: 'Roboto', sans-serif;
          background-color: #f0f4f8; /* Light gray background */
          color: #1a202c; /* Dark text for readability */
        }
        
        .header {
          background-color: #ffffff;
          box-shadow: 0 2px 4px rgba(0, 0, 0, 0.05);
          padding: 1rem 0;
        }

        .header-container {
          max-width: 1200px;
          margin: 0 auto;
          padding: 0 1rem;
        }

        .header-title {
          font-family: 'Montserrat', sans-serif;
          font-size: 1.5rem;
          font-weight: 700;
          color: #4a5568;
        }

        .main-content {
          flex: 1;
          padding: 2rem 1rem;
          max-width: 960px;
          margin: 0 auto;
        }

        .hero-section {
          text-align: center;
          margin-bottom: 3rem;
        }

        .page-title {
          font-family: 'Montserrat', sans-serif;
          font-size: 2.5rem;
          font-weight: 700;
          color: #2d3748;
          margin-bottom: 0.5rem;
        }

        .last-updated {
          font-size: 1rem;
          color: #718096;
        }

        .content-card {
          background-color: #ffffff;
          border-radius: 12px;
          box-shadow: 0 10px 15px rgba(0, 0, 0, 0.1);
          padding: 2rem;
          line-height: 1.6;
        }

        .section {
          margin-bottom: 2rem;
        }

        .section-title {
          font-family: 'Montserrat', sans-serif;
          font-size: 1.5rem;
          font-weight: 600;
          color: #2d3748;
          margin-bottom: 1rem;
        }

        .section-content {
          font-size: 1rem;
          color: #4a5568;
        }

        .list {
          list-style-type: disc;
          margin-left: 2rem;
          padding: 0;
        }

        .footer {
          background-color: #2d3748;
          color: #e2e8f0;
          text-align: center;
          padding: 1.5rem 0;
          font-size: 0.875rem;
        }

        @media (min-width: 768px) {
          .page-title {
            font-size: 3rem;
          }

          .content-card {
            padding: 3rem;
          }
        }
        `}
      </style>
      <div className="flex flex-col min-h-screen">
        <Header />
        <main className="main-content">
          <div className="hero-section">
            <h1 className="page-title">Terms of Service</h1>
            <p className="last-updated">Last updated: November 04, 2025</p> {/* Refined: Current date */}
          </div>
          
          <div className="content-card">
            <div className="section">
              <h2 className="section-title">Introduction</h2> {/* Unchanged: Standard legal */}
              <p className="section-content">
                Welcome to ONJO, a storytelling brand crafting novels that explore the collision of ambition and emotion. By accessing or using our Service, you agree to be bound by these Terms of Service ("Terms"). If you do not agree with any part of these Terms, you may not use our Service. {/* Refined: From products to storytelling/novels; echoes About hook */}
              </p>
            </div>
            
            <div className="section">
              <h2 className="section-title">1. Intellectual Property & Content</h2>
              <p className="section-content">
                All content on the Service, including novels, stories, text, graphics, and logos, is our property or the property of our content suppliers and is protected by copyright and intellectual property laws. The stories and narratives are intended for personal, inspirational use only. You may not reproduce, distribute, modify, or create derivative works from our content without our explicit written permission. {/* Refined: To novels/stories/narratives; ties to "inspirational" mission */}
              </p>
            </div>
            
            <div className="section">
              <h2 className="section-title">2. Disclaimers and Limitation of Liability</h2>
              <p className="section-content">
                The Service is provided on an "as is" and "as available" basis. We do not make any warranties, express or implied, regarding the accuracy, reliability, or completeness of the stories and narratives. The insights provided are not a substitute for professional advice on ambition, relationships, or personal growth. We are not liable for any decisions made based on the reflections from our Service. {/* Refined: From products/shopping to stories/narratives; adapts to emotional themes */}
              </p>
            </div>
            
            <div className="section">
              <h2 className="section-title">3. Prohibited Use</h2>
              <p className="section-content">
                You agree not to use the Service for any unlawful or prohibited purpose. This includes, but is not limited to:
              </p>
              <ul className="list">
                <li>Copying, distributing, or reselling the novels, stories, or content from our website.</li> {/* Refined: To novels/stories */}
                <li>Attempting to gain unauthorized access to our systems.</li>
                <li>Using any automated means (e.g., bots, scrapers) to collect or access our content or links.</li> {/* Minor: Generalize from affiliates */}
                <li>Using the Service in any way that could harm, disable, or overburden our website or servers.</li>
              </ul>
            </div>
            
            <div className="section">
              <h2 className="section-title">4. Changes to the Terms</h2>
              <p className="section-content">
                We reserve the right to modify these Terms at any time. We will post the updated Terms on this page. Your continued use of the Service after any changes constitutes your acceptance of the new Terms. {/* Unchanged: Boilerplate */}
              </p>
            </div>
            
            <div className="section">
              <h2 className="section-title">5. Governing Law</h2>
              <p className="section-content">
                These Terms are governed by the laws of the United States, without regard to its conflict of law provisions. Any legal action related to these Terms will be brought in the courts of the United States. {/* Unchanged: Legal standard */}
              </p>
            </div>
          </div>
        </main>
        <Footer />
      </div>
    </>
  );
};

export default Terms;