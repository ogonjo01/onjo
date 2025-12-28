import { Link } from 'react-router-dom';
import React, { useState } from 'react';
import './Footer.css';

const Footer = () => {
  return (
    <footer className="ogonjo-footer">
      <div className="ogonjo-footer-container">
        <div className="ogonjo-footer-grid">
          {/* Branding */}
          <div className="ogonjo-footer-brand">
            <Link to="/">
              <h1>ONJO TECH</h1>
            </Link>
            <p>Empowering innovators with actionable knowledge in electronics, programming, AI, cybersecurity, and more.</p>
          </div>

          {/* Explore Links */}
          <div className="ogonjo-footer-link-group">
            <h3>Explore</h3>
            <div>
              <Link to="/categories" className="ogonjo-footer-link">Tech Categories</Link>
              <Link to="/about" className="ogonjo-footer-link">About ONJO TECH</Link>
              <Link to="/resources" className="ogonjo-footer-link">Resources</Link>
              <Link to="/contact" className="ogonjo-footer-link">Connect</Link>
            </div>
          </div>

          {/* Support Links */}
          <div className="ogonjo-footer-link-group">
            <h3>Support</h3>
            <div>
              <Link to="/terms" className="ogonjo-footer-link">Terms of Service</Link>
              <Link to="/privacy" className="ogonjo-footer-link">Privacy Policy</Link>
              <Link to="/faq" className="ogonjo-footer-link">FAQ</Link>
            </div>
          </div>

          {/* Subscription Button */}
          <div className="ogonjo-footer-subscribe">
            <h3>Stay Updated</h3>
            <p>Get the latest tutorials, tech insights, and innovations delivered to your inbox.</p>
            <button
              className="ogonjo-subscribe-button"
              onClick={() => window.open("https://onjotech.gumroad.com/", "_blank", "noopener,noreferrer")}
            >
              Join the Lab
            </button>
          </div>

          {/* Social Media */}
          <div className="ogonjo-footer-social">
            <h3>Follow Us</h3>
            <div className="ogonjo-social-links">
              <a href="https://x.com/ogonjo_" className="ogonjo-social-icon-link" aria-label="X — tech discussions">
                X
              </a>
              <a href="https://linkedin.com/in/ogonjo-info-9851b736b" className="ogonjo-social-icon-link" aria-label="LinkedIn — network with tech professionals">
                LinkedIn
              </a>
              <a href="https://www.facebook.com/profile.php?id=61577435602195" className="ogonjo-social-icon-link" aria-label="Facebook — join our tech community">
                Facebook
              </a>
            </div>
          </div>
        </div>

        <div className="ogonjo-footer-separator">
          <p className="ogonjo-footer-copyright">
            © 2025 ONJO TECH. Empowering knowledge in a technological world.
          </p>
        </div>
      </div>
    </footer>
  );
};

export default Footer;
