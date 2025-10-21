import React from 'react';

// Mock Header component to keep all code in a single file
const Header = () => (
  <header className="header">
    <div className="header-container">
      <h1 className="header-title">ONJO</h1> {/* Updated Oct 15, 2025: Brand consistency */}
    </div>
  </header>
);

// Mock Footer component to keep all code in a single file
const Footer = () => (
  <footer className="footer">
    <div className="footer-container">
      <p>&copy; {new Date().getFullYear()} ONJO. All rights reserved.</p> {/* Updated: Brand alignment */}
    </div>
  </footer>
);

// Mock components to keep the app self-contained and runnable
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
            background-color: #f8f9fa;
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
            box-shadow: 0 4px 12px rgba(0, 0, 0, 0.08);
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
            <p className="last-updated">
              Last updated: October 15, 2025 {/* Updated: Current date */}
            </p>
          </div>

          <Card>
            <CardContent>
              <div>
                <h2 className="section-title">
                  Information We Collect {/* Unchanged: Standard privacy */}
                </h2>
                <p className="section-text">
                  We collect information you provide when you interact with our platform. This may include your email address if you choose to sign up for updates or save preferences. We also collect usage data such as pages viewed, product guides and reviews accessed, and interactions within the platform, along with device information and IP addresses for analytics and to ensure platform stability. {/* Updated: From books to product guides/reviews */}
                </p>
              </div>

              <div>
                <h2 className="section-title">
                  How We Use Your Information
                </h2>
                <p className="section-text">
                  Your information helps us operate and improve our free service. We use it to: {/* Unchanged: Structure fits */}
                </p>
                <ul className="list">
                  <li className="list-item">Provide and maintain the platform.</li>
                  <li className="list-item">Analyze usage patterns to improve the quality and relevance of our product guides and reviews.</li> {/* Updated: To products/guides */}
                  <li className="list-item">Personalize your experience (e.g., suggesting relevant niche products you might like).</li> {/* Updated: From books to niche products */}
                  <li className="list-item">Communicate with you regarding service updates or other important information.</li>
                </ul>
                <p className="section-text">
                  We will never sell your personal data. We may use anonymized, aggregated data for research or analytics to better understand our audience and content performance. {/* Unchanged: Transparency aligns */}
                </p>
              </div>

              <div>
                <h2 className="section-title">
                  Cookies and Tracking
                </h2>
                <p className="section-text">
                  We use cookies and similar technologies to keep you logged in, save your preferences, and track site usage. These tools help us improve functionality and personalize content without collecting personally identifiable information for advertising. You can configure your browser to reject cookies, but this may affect certain features of the platform. {/* Unchanged: General, fits non-ad focus */}
                </p>
              </div>

              <div>
                <h2 className="section-title">
                  Third-Party Services
                </h2>
                <p className="section-text">
                  As a free service, we may use third-party services to support our operations, such as for hosting and analytics. These providers may collect data according to their own privacy policies. For example, we use analytics tools to understand platform usage and traffic sources. We encourage you to review their policies. We do not share your personal data with third parties beyond what is necessary to operate and analyze our service. {/* Updated: Minor—ties to affiliate transparency from About Us */}
                </p>
              </div>
              
              <div>
                <h2 className="section-title">
                  Your Privacy Rights
                </h2>
                <p className="section-text">
                  Depending on your location, you may have specific rights regarding your personal data. These can include the right to access, correct, or delete your data, and the right to object to or restrict its processing. To exercise these rights or for any privacy concerns, please contact us at privacy@onjo.com. We will respond to all requests in accordance with applicable law. {/* Updated: Email to match brand */}
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