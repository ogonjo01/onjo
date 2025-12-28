import React, { useState } from "react";
import { Mail, Check, Star } from "lucide-react";
import { motion } from "framer-motion";
import './SubscriptionPage.css';

export default function SubscriptionPage() {
  const [email, setEmail] = useState("");
  const [plan, setPlan] = useState("monthly"); // monthly = free, pro = paid (Gumroad)
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState(null);
  const [error, setError] = useState(null);

  const submit = async (e) => {
    e.preventDefault();
    setMessage(null);
    setError(null);

    if (!email || email.indexOf('@') === -1) {
      setError('Please enter a valid email address.');
      return;
    }

    // If user selected the paid plan, redirect to Gumroad storefront (open in new tab)
    if (plan === 'pro') {
      setLoading(true);
      try {
        // Base Gumroad profile URL provided by you
        let gumroadUrl = 'https://onjotech.gumroad.com/';

        // Add email prefill if available (Gumroad supports checkout[email]=... on product pages).
        // For profile root it may not prefill; if you have a direct product link (like /l/your-product),
        // replace gumroadUrl with that product checkout URL to allow prefill.
        if (email) {
          const sep = gumroadUrl.includes('?') ? '&' : '?';
          gumroadUrl = `${gumroadUrl}${sep}checkout[email]=${encodeURIComponent(email)}`;
        }

        // Open Gumroad in a new tab/window
        window.open(gumroadUrl, '_blank', 'noopener,noreferrer');

        setMessage('Redirecting to Gumroad for purchase...');
      } catch (err) {
        console.error('Gumroad redirect error:', err);
        setError('Unable to open Gumroad. Please try again or visit https://onjotech.gumroad.com/');
      } finally {
        setLoading(false);
      }
      return;
    }

    // Free plan: continue with existing backend subscribe flow
    setLoading(true);
    try {
      const response = await fetch('https://ogonjo-idea-vault1-production.up.railway.app/subscribe', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, plan })
      });

      let data = null;
      try { data = await response.json(); } catch (err) { /* ignore non-json */ }

      if (response.ok) {
        setMessage('🎉 You are subscribed! Check your inbox for confirmation.');
        setEmail('');
      } else {
        setError('Oops! ' + (data && data.message ? data.message : 'Something went wrong. Please try again.'));
      }
    } catch (err) {
      console.error('Subscription error:', err);
      setError('An error occurred. Please check your network and try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="sp-root">
      <main className="sp-container">
        <motion.header
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.45 }}
          className="sp-hero"
        >
          <div className="sp-hero-left">
            <span className="sp-pill"><Check size={14} /> Curated for tech enthusiasts</span>

            <h1 className="sp-title">Stay Ahead in Programming, Cybersecurity & Electronics</h1>

            <p className="sp-sub">
              Weekly tips, tutorials, and test-driven challenges to sharpen your tech skills and stay current with industry trends.
            </p>

            <div className="sp-cta-row">
              <a href="#subscribe" className="sp-cta-primary"><Mail size={16} /> Subscribe Free</a>
              <a href="#features" className="sp-cta-ghost">Explore Topics</a>
            </div>

            <ul className="sp-benefits">
              <li><strong>Hands-on Tutorials</strong><span>Practical coding, electronics, and telecom exercises for real-world experience.</span></li>
              <li><strong>Expert Insights</strong><span>Tips from cybersecurity specialists, software engineers, and tech innovators.</span></li>
            </ul>
          </div>

          <motion.aside
            id="subscribe"
            initial={{ opacity: 0, scale: 0.98 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ duration: 0.45 }}
            className="sp-card"
          >
            <div className="sp-card-head">
              <div>
                <h3 className="sp-card-title">Join 10,000+ Tech Learners</h3>
                <p className="sp-card-sub">Weekly tutorials + challenges in programming, cybersecurity, and electronics</p>
              </div>
              <div className="sp-muted">No spam • Unsubscribe anytime</div>
            </div>

            <form onSubmit={submit} className="sp-form" aria-label="Subscribe form">
              <label className="sp-label" htmlFor="email">Email</label>
              <div className="sp-field-row">
                <input
                  id="email"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="sp-input"
                  placeholder="you@techmail.com"
                  type="email"
                />

                <select
                  value={plan}
                  onChange={(e) => setPlan(e.target.value)}
                  className="sp-select"
                  aria-label="Subscription tier"
                >
                  <option value="monthly">Monthly Updates (Free)</option>
                  <option value="pro">Premium Challenges — Purchase on Gumroad</option>
                </select>
              </div>

              {error && <p className="sp-error">{error}</p>}
              {message && <p className="sp-success">{message}</p>}

              <button
                type="submit"
                disabled={loading}
                className="sp-submit"
              >
                {loading ? 'Processing…' : plan === 'pro' ? 'Buy on Gumroad' : 'Join the Lab'}
              </button>

              <p className="sp-legal">By subscribing, you agree to receive tech updates and challenges. We respect your privacy. <a href="https://www.onjo.life">Learn more at onjo.life</a>.</p>
            </form>

            <div className="sp-grid-2">
              <div className="sp-mini">
                <Star size={16} />
                <div>
                  <div className="mini-title">Code Snippets</div>
                  <div className="mini-sub">Reusable examples to accelerate learning</div>
                </div>
              </div>

              <div className="sp-mini">
                <Check size={16} />
                <div>
                  <div className="mini-title">Practice Challenges</div>
                  <div className="mini-sub">Test your skills in real-world scenarios</div>
                </div>
              </div>
            </div>
          </motion.aside>
        </motion.header>

        <section id="features" className="sp-section">
          <h2 className="sp-h2">Why Subscribe?</h2>
          <p className="sp-p">
            Gain hands-on experience in programming, cybersecurity, electronics, and telecommunications with curated tutorials and challenges.
          </p>

          <div className="sp-feature-grid">
            <article className="sp-feature">
              <h4>Programming Tutorials</h4>
              <p>Step-by-step exercises in Python, JavaScript, C++, and more for practical skill-building.</p>
            </article>

            <article className="sp-feature">
              <h4>Cybersecurity Tips</h4>
              <p>Learn ethical hacking, network security, and best practices for protecting systems.</p>
            </article>

            <article className="sp-feature">
              <h4>Electronics & Telecom</h4>
              <p>Projects and labs to understand circuits, IoT, and telecommunications fundamentals.</p>
            </article>
          </div>
        </section>

        <section className="sp-section sp-reviews">
          <div>
            <h2 className="sp-h2">Learner Feedback</h2>
            <blockquote className="sp-quote">“The coding exercises really sharpened my skills and helped me ace technical interviews.”<cite>— Alex, Developer</cite></blockquote>
            <blockquote className="sp-quote">“Cybersecurity labs are practical and very insightful. Highly recommended!”<cite>— Jordan, Security Analyst</cite></blockquote>
          </div>

          <div>
            <h2 className="sp-h2">FAQ</h2>
            <div className="sp-faq">
              <details>
                <summary>Are the updates free?</summary>
                <div>Yes — basic tutorials and practice challenges are free. Premium subscription unlocks advanced labs.</div>
              </details>

              <details>
                <summary>How often will I receive updates?</summary>
                <div>Weekly emails with tutorials, exercises, and tech insights.</div>
              </details>
            </div>
          </div>
        </section>

        <footer className="sp-footer">© {new Date().getFullYear()} ONJO • Tech Learning & Challenges</footer>
      </main>
    </div>
  );
}
