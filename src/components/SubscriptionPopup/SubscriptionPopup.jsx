import React, { useState, useEffect } from "react";
import { Mail, Check, Star, X } from "lucide-react";
import { motion } from "framer-motion";
import './SubscriptionPopup.css';

const SubscriptionPopup = ({ onClose }) => {
  const [email, setEmail] = useState("");
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState(null);
  const [error, setError] = useState(null);

  useEffect(() => {
    const handleEscape = (e) => {
      if (e.key === 'Escape') handleClose();
    };
    window.addEventListener('keydown', handleEscape);
    return () => window.removeEventListener('keydown', handleEscape);
  }, []);

  const handleClose = () => {
    localStorage.setItem('popupDismissedAt', Date.now());
    onClose();
  };

  const submit = async (e) => {
    e.preventDefault();
    setMessage(null);
    setError(null);
    if (!email || email.indexOf('@') === -1) {
      setError('Please enter a valid email.');
      return;
    }
    setLoading(true);
    try {
      const response = await fetch('https://ogonjo-idea-vault1-production.up.railway.app/subscribe', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email })
      });

      let data = null;
      try { data = await response.json(); } catch (err) {}

      if (response.ok) {
        setMessage('🎉 You\'re in! Expect fresh reviews delivered to your inbox.');
        localStorage.setItem('subscribedAt', Date.now());
        setEmail('');
        setTimeout(handleClose, 3000);
      } else {
        setError('Oops! ' + (data?.message || 'Try again.'));
      }
    } catch (err) {
      setError('Network error. Try again.');
      console.error('Subscription error:', err);
    } finally {
      setLoading(false);
    }
  };

  return (
    <motion.div
      className="sp-popup-overlay"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      onClick={handleClose}
    >
      <motion.div
        className="sp-popup"
        initial={{ scale: 0.95, y: 20 }}
        animate={{ scale: 1, y: 0 }}
        exit={{ scale: 0.95, y: 20 }}
        transition={{ duration: 0.3 }}
        onClick={(e) => e.stopPropagation()}
      >
        <button className="sp-popup-close" onClick={handleClose}>
          <X size={20} />
        </button>

        <div className="sp-popup-content">
          <h2 className="sp-popup-title">Make Smarter Buying Decisions</h2>
          <p className="sp-popup-sub">Get the latest product reviews, comparisons, and buying guides — delivered straight to your inbox, free.</p>

          <ul className="sp-popup-benefits">
            <li><Check size={16} /> In-depth reviews on tech, software & AI tools</li>
            <li><Check size={16} /> Side-by-side comparisons to clarify your choices</li>
            <li><Check size={16} /> Buying guides tailored to real-world needs</li>
            <li><Check size={16} /> Honest pros & cons — no fluff, no bias</li>
            <li><Check size={16} /> Early access to new reviews and features</li>
          </ul>

          <form onSubmit={submit} className="sp-popup-form">
            <div className="sp-popup-input-group">
              <Mail size={18} className="sp-popup-icon" />
              <input
                type="email"
                placeholder="your@email.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                disabled={loading}
                className="sp-popup-input"
              />
            </div>

            <button
              type="submit"
              disabled={loading}
              className="sp-popup-submit"
            >
              {loading ? 'Subscribing...' : 'Get Free Reviews'}
            </button>
          </form>

          {error && <p className="sp-popup-error">{error}</p>}
          {message && <p className="sp-popup-success">{message}</p>}

          <div className="sp-popup-testimonial">
            <Star size={16} className="sp-popup-star" />
            <p>"ONJO Reviews saved me hours of research — clear, honest, and straight to the point." — James, Product Manager</p>
          </div>

          <p className="sp-popup-legal">No spam • Unsubscribe anytime</p>
        </div>
      </motion.div>
    </motion.div>
  );
};

export default SubscriptionPopup;