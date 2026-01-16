import React from 'react';

// Mock Header component
const Header = () => (
  <header className="header">
    <div className="header-container">
      <h1 className="header-title">ONJO Reviews</h1>
    </div>
  </header>
);

// Mock Footer component
const Footer = () => (
  <footer className="footer">
    <div className="footer-container">
      <p>&copy; {new Date().getFullYear()} ONJO Reviews. All rights reserved.</p>
    </div>
  </footer>
);

// Mock card components
const Card = ({ children }) => <div className="card">{children}</div>;
const CardContent = ({ children }) => <div className="card-content">{children}</div>;

const Privacy = () => {
  return (
    <>
      <style>
        {`
          @import url('https://fonts.googleapis.com/css2?family=Roboto:wght@400;500;700&family=Montserrat:wght@600;700&display=swap');

          body {
            margin: 0;
            font-family: 'Roboto', sans-serif;
            background-color: #f8f9fa;
            color: #212529;
          }
          
          .privacy-page-container {
            display: flex;
            flex-direction: column;
            min-height: 100vh;
          }
          
          .header {
            background-color: #ffffff;
            box-shadow: 0 2px 4px rgba(0,0,0,0.05);
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
            color: #495057;
          }

          .main-content {
            flex: 1;
            max-width: 1280px;
            margin: 0 auto;
            padding: 4rem 1rem;
          }
          
          .hero-section {
            text-align: center;
            margin-bottom: 4rem;
          }

          .page-title {
            font-family: 'Montserrat', sans-serif;
            font-weight: 700;
            font-size: 2.5rem;
            color: #343a40;
            margin-bottom: 1.5rem;
          }
          
          .last-updated {
            font-family: 'Roboto', sans-serif;
            font-size: 1rem;
            color: #6c757d;
          }

          .card {
            max-width: 64rem;
            margin: 0 auto;
            background-color: #ffffff;
            border-radius: 12px;
            box-shadow: 0 4px 12px rgba(0,0,0,0.08);
            overflow: hidden;
          }

          .card-content {
            padding: 2.5rem;
            display: flex;
            flex-direction: column;
            gap: 2rem;
          }
          
          .section-title {
            font-family: 'Montserrat', sans-serif;
            font-weight: 600;
            font-size: 1.5rem;
            color: #343a40;
            margin-bottom: 1rem;
          }
          
          .section-text {
            font-family: 'Roboto', sans-serif;
            font-size: 1rem;
            color: #495057;
            line-height: 1.6;
          }

          .list {
            list-style-type: disc;
            margin-left: 1.5rem;
            padding: 0;
            color: #495057;
            font-family: 'Roboto', sans-serif;
            line-height: 1.6;
          }

          .list-item {
            margin-bottom: 0.5rem;
          }
          
          .footer {
            background-color: #212529;
            color: #e9ecef;
            text-align: center;
            padding: 1.5rem 0;
            font-size: 0.875rem;
          }

          @media (min-width: 768px) {
            .page-title {
              font-size: 3rem;
            }
          }
        `}
      </style>

      <div className="privacy-page-container">
        <Header />

        <main className="main-content">
          <div className="hero-section">
            <h1 className="page-title">Privacy Policy</h1>
            <p className="last-updated">Last updated: January 15, 2026</p>
          </div>

          <Card>
            <CardContent>
              <div>
                <h2 className="section-title">Information We Collect</h2>
                <p className="section-text">
                  We collect information you provide when interacting with ONJO Reviews, such as your email for updates or preferences. We also collect usage data, including pages viewed, product categories explored, link clicks, and device information, to improve our recommendations and platform experience.
                </p>
              </div>

              <div>
                <h2 className="section-title">How We Use Your Information</h2>
                <p className="section-text">
                  Your information helps us operate and enhance ONJO Reviews. We use it to:
                </p>
                <ul className="list">
                  <li className="list-item">Provide, maintain, and improve our product reviews and recommendation tools.</li>
                  <li className="list-item">Analyze user interactions to enhance content relevance and quality.</li>
                  <li className="list-item">Personalize your experience by suggesting products or categories of interest.</li>
                  <li className="list-item">Send updates, notifications, or important platform information.</li>
                </ul>
                <p className="section-text">
                  We do not sell your personal data. Aggregated or anonymized data may be used to improve our platform and affiliate product recommendations.
                </p>
              </div>

              <div>
                <h2 className="section-title">Cookies and Tracking</h2>
                <p className="section-text">
                  We use cookies and similar technologies to enhance functionality, remember preferences, and analyze interactions with product reviews. You can disable cookies in your browser, though some features may be limited.
                </p>
              </div>

              <div>
                <h2 className="section-title">Third-Party Services</h2>
                <p className="section-text">
                  ONJO Reviews uses third-party services for hosting, analytics, and affiliate integrations. These providers may collect data according to their privacy policies. Personal data is shared only as necessary for platform operation.
                </p>
              </div>

              <div>
                <h2 className="section-title">Your Privacy Rights</h2>
                <p className="section-text">
                  Depending on your location, you may have rights to access, correct, or delete your data, or restrict processing. Contact us at privacy@onjo.reviews to exercise these rights. We respond in accordance with applicable law.
                </p>
              </div>
            </CardContent>
          </Card>
        </main>

        <Footer />
      </div>
    </>
  );
};

export default Privacy;
