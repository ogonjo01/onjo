import { Link } from 'react-router-dom';
import React, { useState } from 'react';
import './Footer.css'; // Import the new CSS file

const Footer = () => {
  const [email, setEmail] = useState('');
  const [message, setMessage] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setMessage('');
    setIsSubmitting(true);

    try {
      // This is the only change you need to make!
      // Replace the localhost URL with your live Railway URL.
      const response = await fetch('https://ogonjo-idea-vault1-production.up.railway.app/subscribe', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ email }),
      });

      const data = await response.json();

      if (response.ok) {
        setMessage('🎉 You are all set! Check your inbox to confirm.');
        setEmail('');
      } else {
        setMessage(`Oops! ${data.message || 'Something went wrong. Please try again.'}`);
      }
    } catch (error) {
      setMessage('An error occurred. Please check your network and try again.');
      console.error('Subscription error:', error);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <footer className="ogonjo-footer">
      <div className="ogonjo-footer-container">
        <div className="ogonjo-footer-grid">
          {/* Logo/Branding Section */}
          <div className="ogonjo-footer-brand">
            <Link to="/">
              <h1>ONJO</h1> {/* Unchanged: Core brand */}
            </Link>
            <p>
              {/* Refined Nov 04, 2025: Align with About ONJO—storytelling collision of ambition & emotion */}
             creates powerful stories about the price of success — love, betrayal, ambition, and everything that makes us human.
            </p>
          </div>

          {/* Explore Links */}
          <div className="ogonjo-footer-link-group">
            <h3>Explore</h3>
            <div>
              <Link to="/stories" className="ogonjo-footer-link">Our Novels</Link> {/* Refined: Shift from /features to storytelling focus; update route if needed */}
              <Link to="/about" className="ogonjo-footer-link">About ONJO</Link> {/* Refined: Match enhanced page title */}
              <Link to="/worlds" className="ogonjo-footer-link">Story Worlds</Link> {/* Refined: From /guides—evoke immersive fiction; adjust route as fits */}
              <Link to="/contact" className="ogonjo-footer-link">Connect</Link> {/* Minor: Softer CTA for emotional tie-in */}
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
          
          {/* Subscription Box */}
          <div className="ogonjo-footer-subscribe">
            <h3>Stay Immersed</h3> {/* Refined: From "Stay Updated"—evoke story depth */}
            {/* Refined: Tie to mission—real-fiction awakenings via email */}
            <p>Receive exclusive previews, ambition-fueled tales, and reflections on power & passion.</p>
            <form onSubmit={handleSubmit} className="ogonjo-subscribe-form">
              <input
                type="email"
                placeholder="Enter your email" /* Unchanged: Space limits tweaks; could be "Email for empire-building stories" if CSS allows */
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                disabled={isSubmitting}
                className="ogonjo-subscribe-input"
              />
              <button
                type="submit"
                disabled={isSubmitting}
                className="ogonjo-subscribe-button"
              >
                {isSubmitting ? 'Subscribing...' : 'Join the Journey'} {/* Refined: From "Subscribe Now"—more narrative urgency */}
              </button>
            </form>
            {message && <p className="ogonjo-subscribe-message">{message}</p>}
          </div>

          {/* Social Media */}
          <div className="ogonjo-footer-social">
            <h3>Follow Us</h3>
            {/* Refined: Keep URLs; enhance labels for emotional community feel */}
            <div className="ogonjo-social-links">
              <a href="https://x.com/ogonjo_" className="ogonjo-social-icon-link" aria-label="X (formerly Twitter)—join ambition conversations">
                <svg fill="currentColor" viewBox="0 0 24 24">
                  <path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z" />
                </svg>
                <span>X</span>
              </a>
              <a href="https://linkedin.com/in/ogonjo-info-9851b736b" className="ogonjo-social-icon-link" aria-label="LinkedIn—network with empire-builders">
                <svg fill="currentColor" viewBox="0 0 24 24">
                  <path d="M20.447 20.452h-3.554v-5.569c0-1.328-.027-3.037-1.852-3.037-1.853 0-2.136 1.445-2.136 2.939v5.667H9.351V9h3.414v1.561h.046c.477-.9 1.637-1.85 3.37-1.85 3.601 0 4.267 2.37 4.267 5.455v6.286zM5.337 7.433c-1.144 0-2.063-.926-2.063-2.065 0-1.138.92-2.063 2.063-2.063 1.14 0 2.064.925 2.064 2.063 0 1.139-.925 2.065-2.064 2.065zm1.782 13.019H3.555V9h3.564v11.452zM22.225 0H1.771C.792 0 0 .774 0 1.729v20.542C0 23.227.792 24 1.771 24h20.451C23.2 24 24 23.227 24 22.271V1.729C24 .774 23.2 0 22.222 0h.003z" />
                </svg>
                <span>LinkedIn</span>
              </a>
              <a href="https://www.facebook.com/profile.php?id=61577435602195" className="ogonjo-social-icon-link" aria-label="Facebook—share your story reflections">
                <svg fill="currentColor" viewBox="0 0 24 24">
                  <path d="M24 12.073c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.99 4.388 10.954 10.125 11.854v-8.385H7.078v-3.47h3.047V9.43c0-3.007 1.792-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.47h-2.796v8.385C19.612 23.027 24 18.062 24 12.073z" />
                </svg>
                <span>Facebook</span>
              </a>
            </div>
          </div>
        </div>

        {/* Copyright */}
        <div className="ogonjo-footer-separator">
          <p className="ogonjo-footer-copyright">
            {/* Refined: Echo tagline for closure */}
            © 2025 ONJO. Where ambition meets emotion.
          </p>
        </div>
      </div>
    </footer>
  );
};

export default Footer;