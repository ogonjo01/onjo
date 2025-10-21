import React, { useState } from "react";
import { Mail, Check, Star } from "lucide-react";
import { motion } from "framer-motion";
import './SubscriptionPage.css';

export default function SubscriptionPage() {
  const [email, setEmail] = useState("");
  const [plan, setPlan] = useState("monthly");
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
        setMessage('🎉 You are all set! Check your inbox to confirm.');
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
            <span className="sp-pill"><Check size={14} /> Curated for everyday choosers</span> {/* Updated Oct 15, 2025: From founders to users */}

            <h1 className="sp-title">Niche product guides, review breakdowns — delivered weekly.</h1> {/* Updated: From books/playbooks to products/guides */}

            <p className="sp-sub">Pros/cons insights, step-by-step how-tos, and vetted top picks — built to save you time and frustration on smart buys.</p> {/* Updated: Align with niche value */}

            <div className="sp-cta-row">
              <a href="#subscribe" className="sp-cta-primary"><Mail size={16} /> Subscribe free</a> {/* Unchanged: CTA fits */}
              <a href="#features" className="sp-cta-ghost">See what's inside</a>
            </div>

            <ul className="sp-benefits">
              <li><strong>5-minute breakdowns</strong><span>High-signal pros/cons you can action today.</span></li> {/* Updated: Shorter for reviews; actionable tie-in */}
              <li><strong>Niche how-tos</strong><span>Shopping workflows, eco-picks, gadget tests — tips included.</span></li> {/* Updated: From playbooks to how-tos */}
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
                <h3 className="sp-card-title">Join 10,000+ smart shoppers</h3> {/* Updated: From builders to shoppers */}
                <p className="sp-card-sub">Weekly newsletter + exclusive guides</p> {/* Unchanged: Fits guides */}
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
                  placeholder="you@company.com"
                  type="email"
                />

                <select
                  value={plan}
                  onChange={(e) => setPlan(e.target.value)}
                  className="sp-select"
                  aria-label="Subscription tier"
                >
                  <option value="monthly">Weekly (free)</option>
                  <option value="pro">Pro — $9/mo</option> {/* Unchanged: Plans fit; pro for premium guides */}
                </select>
              </div>

              {error && <p className="sp-error">{error}</p>}
              {message && <p className="sp-success">{message}</p>}

              <button
                type="submit"
                disabled={loading}
                className="sp-submit"
              >
                {loading ? 'Subscribing…' : 'Get insights in your inbox'} {/* Unchanged: Generic CTA */}
              </button>

              <p className="sp-legal">By subscribing, you agree to receive emails. We respect your privacy. Affiliates disclosed transparently.</p> {/* Updated: Add affiliate nod from About Us */}
            </form>

            <div className="sp-grid-2">
              <div className="sp-mini"> 
                <Star size={16} />
                <div>
                  <div className="mini-title">Newsletter</div> {/* Unchanged: Core */}
                  <div className="mini-sub">Curated review takeaways</div> {/* Updated: From books to reviews */}
                </div>
              </div>

              <div className="sp-mini">
                <Check size={16} />
                <div>
                  <div className="mini-title">Guides</div> {/* Updated: From playbooks to guides */}
                  <div className="mini-sub">Step-by-step breakdowns</div> {/* Updated: Product focus */}
                </div>
              </div>
            </div>
          </motion.aside>
        </motion.header>

        <section id="features" className="sp-section">
          <h2 className="sp-h2">Why subscribe?</h2>
          <p className="sp-p">We craft high-signal, actionable guides that strip away the hype. Expect real-review patterns, vetted alternatives, and checklists to help you choose confidently.</p> {/* Updated: From fluff/business to hype/products */}

          <div className="sp-feature-grid">
            <article className="sp-feature">
              <h4>Actionable How-Tos</h4> {/* Updated: From templates to how-tos */}
              <p>Pros/cons lists, shopping checklists, eco-alternatives — ready to use.</p> {/* Updated: Niche examples */}
            </article>

            <article className="sp-feature">
              <h4>Weekly Digest</h4>
              <p>Top insights from real reviews and trends — short and structured.</p> {/* Updated: From books to reviews/trends */}
            </article>

            <article className="sp-feature">
              <h4>Exclusive Deep-Dives</h4>
              <p>Subscriber-only guides that walk you through niche picks and tests.</p> {/* Updated: Execution to picks/tests */}
            </article>
          </div>
        </section>

        <section className="sp-section sp-reviews">
          <div>
            <h2 className="sp-h2">Testimonials</h2>
            <blockquote className="sp-quote">“The weekly guides helped us upgrade our home setup without buyer's remorse—saved hours!”<cite>— Maya, Parent & Hobbyist</cite></blockquote> {/* Updated: From MRR/founder to home/products; role tie-in */}
            <blockquote className="sp-quote">“Concise breakdowns perfect for busy pros scouting workflow tools.”<cite>— Jules, Remote Worker</cite></blockquote> {/* Updated: From PM to pro; books to tools */}
          </div>

          <div>
            <h2 className="sp-h2">FAQ</h2>
            <div className="sp-faq">
              <details>
                <summary>Is the weekly newsletter free?</summary> {/* Unchanged: Structure fits */}
                <div>Yes — the standard weekly digest is free. Pro plan unlocks deep-dive guides and premium checklists.</div> {/* Updated: From deep dives/templates to guides/checklists */}
              </details>

              <details>
                <summary>How often will I receive emails?</summary>
                <div>Weekly digest + occasional niche trend alerts (2–4 emails/month).</div> {/* Updated: From experiments to trends */}
              </details>
            </div>
          </div>
        </section>

        <footer className="sp-footer">© {new Date().getFullYear()} ONJO • Built for smart choosers & everyday explorers</footer> {/* Updated: Brand + tagline from "builders & founders" */}
      </main>
    </div>
  );
}