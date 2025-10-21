import React from 'react';

const Header = () => (
  <header className="header">
    <div className="header-container">
      <h1 className="header-title">OGONJO</h1>
    </div>
  </header>
);

const Footer = () => (
  <footer className="footer">
    <div className="footer-container">
      <p>&copy; {new Date().getFullYear()} OGONJO. All rights reserved.</p>
    </div>
  </footer>
);

const Contact = () => {
  return (
    <>
      <style>
        {`
          @import url('https://fonts.googleapis.com/css2?family=Roboto:wght@400;500;700&family=Montserrat:wght@600;700&display=swap');

          body {
            margin: 0;
            font-family: 'Roboto', sans-serif;
            background-color: #f0f4f8;
            color: #1a202c;
          }

          .header {
            background-color: #ffffff;
            box-shadow: 0 2px 4px rgba(0, 0, 0, 0.05);
            padding: 1rem 0;
          }

          .header-title {
            font-family: 'Montserrat', sans-serif;
            font-size: 1.5rem;
            font-weight: 700;
            color: #4a5568;
            text-align: center;
          }

          .main-content {
            max-width: 800px;
            margin: 3rem auto;
            padding: 0 1rem;
            text-align: center;
          }

          .page-title {
            font-family: 'Montserrat', sans-serif;
            font-weight: 700;
            font-size: 2.5rem;
            color: #2d3748;
            margin-bottom: 1rem;
          }

          .page-description {
            font-size: 1.2rem;
            color: #718096;
            margin-bottom: 2rem;
            line-height: 1.6;
          }

          .contact-email {
            font-size: 1.25rem;
            font-weight: 500;
            color: #2d3748;
            text-decoration: none;
          }

          .footer {
            background-color: #2d3748;
            color: #e2e8f0;
            text-align: center;
            padding: 1.5rem 0;
            font-size: 0.875rem;
          }
        `}
      </style>

      <div className="contact-page-container">
        <Header />
        <main className="main-content">
          <h1 className="page-title">Contact Us</h1>
          <p className="page-description">
            Have questions or feedback? Feel free to reach out to us directly via email. 
            We'll do our best to respond within 24 hours.
          </p>
          <a className="contact-email" href="mailto:ogonjo.info@gmail.com">
            ogonjo.info@gmail.com
          </a>
        </main>
        <Footer />
      </div>
    </>
  );
};

export default Contact;
