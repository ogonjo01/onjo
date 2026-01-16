import { Link } from 'react-router-dom';
import React from 'react';
import './Footer.css';

const Footer = () => {
  return (
    <footer className="ogonjo-footer">
      <div className="ogonjo-footer-container">
        <div className="ogonjo-footer-grid">
          {/* Branding */}
          <div className="ogonjo-footer-brand">
            <Link to="/">
              <h1>ONJO Reviews</h1>
            </Link>
            <p>
              Honest product reviews and recommendations designed to help people
              make better buying decisions through clear insights and comparisons.
            </p>
          </div>

          {/* Explore Links */}
          <div className="ogonjo-footer-link-group">
            <h3>Explore</h3>
            <div>
              <Link to="/categories" className="ogonjo-footer-link">
                Categories
              </Link>
              <Link to="/about" className="ogonjo-footer-link">
                About ONJO Reviews
              </Link>
              <Link to="/resources" className="ogonjo-footer-link">
                Buying Guides
              </Link>
              <Link to="/contact" className="ogonjo-footer-link">
                Contact
              </Link>
            </div>
          </div>

          {/* Support Links */}
          <div className="ogonjo-footer-link-group">
            <h3>Support</h3>
            <div>
              <Link to="/terms" className="ogonjo-footer-link">
                Terms of Service
              </Link>
              <Link to="/privacy" className="ogonjo-footer-link">
                Privacy Policy
              </Link>
              <Link to="/faq" className="ogonjo-footer-link">
                FAQ
              </Link>
            </div>
          </div>

          {/* Subscription Button */}
          <div className="ogonjo-footer-subscribe">
            <h3>Stay Updated</h3>
            <p>
              Get new reviews, comparisons, and product insights delivered
              directly to your inbox.
            </p>
            <button
              className="ogonjo-subscribe-button"
              onClick={() =>
                window.open(
                  'https://onjotech.gumroad.com/',
                  '_blank',
                  'noopener,noreferrer'
                )
              }
            >
              Subscribe
            </button>
          </div>

          {/* Social Media */}
          <div className="ogonjo-footer-social">
            <h3>Follow</h3>
            <div className="ogonjo-social-links">
              <a
                href="https://x.com/ogonjo_"
                className="ogonjo-social-icon-link"
                aria-label="X — product reviews and updates"
              >
                X
              </a>
              <a
                href="https://linkedin.com/in/ogonjo-info-9851b736b"
                className="ogonjo-social-icon-link"
                aria-label="LinkedIn — product insights and discussions"
              >
                LinkedIn
              </a>
              <a
                href="https://www.facebook.com/profile.php?id=61577435602195"
                className="ogonjo-social-icon-link"
                aria-label="Facebook — product reviews community"
              >
                Facebook
              </a>
            </div>
          </div>
        </div>

        <div className="ogonjo-footer-separator">
          <p className="ogonjo-footer-copyright">
            © 2025 ONJO Reviews. Helping you choose better.
          </p>
        </div>
      </div>
    </footer>
  );
};

export default Footer;
