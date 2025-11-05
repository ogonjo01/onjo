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
      setLoading(true);
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
            <span className="sp-pill"><Check size={14} /> Curated for dream-chasers</span> {/* Refined Nov 05, 2025: From choosers to draft's "dreamers" */}

            <h1 className="sp-title">Novels of empire-builders and forbidden passions — delivered to awaken your soul.</h1> {/* Refined: From products to novels/ambition-emotion hook */}

            <p className="sp-sub">Heart-racing tales of entrepreneurial fire, betrayals that scar, and rebuilds that redefine victory — fiction that mirrors your deepest hungers.</p> {/* Refined: Echo draft's "hearts break," "what we lose," "feels real" */}

            <div className="sp-cta-row">
              <a href="#subscribe" className="sp-cta-primary"><Mail size={16} /> Subscribe free</a> {/* Unchanged: CTA urgency fits */}
              <a href="#features" className="sp-cta-ghost">Explore our worlds</a> {/* Refined: From "See what's inside" to immersive tease */}
            </div>

            <ul className="sp-benefits">
              <li><strong>Pulse-pounding previews</strong><span>Exclusive first chapters that ignite your ambition — and linger.</span></li> {/* Refined: From breakdowns to story teases; ties to "heart race" */}
              <li><strong>Emotional reflections</strong><span>Behind-the-scenes on power plays and passion's cost — insights for your own empire.</span></li> {/* Refined: From how-tos to draft's "human side," "rebuild" */}
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
                <h3 className="sp-card-title">Join 10,000+ soul-stirrers</h3> {/* Refined: From shoppers to draft's "soul remember" readers */}
                <p className="sp-card-sub">Monthly novel drops + exclusive story worlds</p> {/* Refined: From newsletter/guides to novels/worlds */}
              </div>
              <div className="sp-muted">No spoilers • Unsubscribe anytime</div> {/* Refined: Playful nod to fiction */}
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
                  placeholder="you@dreams.com"
                  type="email"
                /> {/* Refined: Placeholder evokes aspiration */}

                <select
                  value={plan}
                  onChange={(e) => setPlan(e.target.value)}
                  className="sp-select"
                  aria-label="Subscription tier"
                >
                  <option value="monthly">Monthly Previews (free)</option> {/* Refined: From weekly to monthly for novel cadence */}
                  <option value="pro">Premium Worlds — $9/mo</option> {/* Refined: From pro to immersive tiers */}
                </select>
              </div>

              {error && <p className="sp-error">{error}</p>}
              {message && <p className="sp-success">{message}</p>}

              <button
                type="submit"
                disabled={loading}
                className="sp-submit"
              >
                {loading ? 'Subscribing…' : 'Dive into the collision'} {/* Refined: From "Get insights" to draft's "ambition and emotion" hook */}
              </button>

              <p className="sp-legal">By subscribing, you agree to receive story awakenings. We respect your privacy. <a href="https://www.onjo.life">Explore more at onjo.life</a>.</p> {/* Refined: Integrate URL; from affiliates to privacy/story focus */}
            </form>

            <div className="sp-grid-2">
              <div className="sp-mini"> 
                <Star size={16} />
                <div>
                  <div className="mini-title">Novel Teasers</div> {/* Refined: From newsletter to fiction previews */}
                  <div className="mini-sub">First looks at empires rising</div> {/* Refined: Draft's "build empires" */}
                </div>
              </div>

              <div className="sp-mini">
                <Check size={16} />
                <div>
                  <div className="mini-title">Reflection Prompts</div> {/* Refined: From guides to introspective ties */}
                  <div className="mini-sub">Questions to unpack betrayal's ache</div> {/* Refined: Draft's "ache of betrayal" */}
                </div>
              </div>
            </div>
          </motion.aside>
        </motion.header>

        <section id="features" className="sp-section">
          <h2 className="sp-h2">Why subscribe?</h2>
          <p className="sp-p">We craft fiction that bleeds truth — tales that expose the scars of success, stir your reflections, and fuel your own rebuilds.</p> {/* Refined: Direct from draft's "bleeds truth," "rebuild," "reflect" */}

          <div className="sp-feature-grid">
            <article className="sp-feature">
              <h4>Empire Teasers</h4> {/* Refined: From how-tos to thematic previews */}
              <p>Opening chapters of boardroom seductions and whispered pacts — hooks that demand more.</p> {/* Refined: Draft's "forbidden passion," "power" */}
            </article>

            <article className="sp-feature">
              <h4>Monthly Muse</h4> {/* Refined: From digest to inspirational drop */}
              <p>Curated snippets from dreamers' falls — short bursts to mirror your hungers.</p> {/* Refined: Draft's "hunger for greatness" */}
            </article>

            <article className="sp-feature">
              <h4>Exclusive Echoes</h4> {/* Refined: From deep-dives to emotional extensions */}
              <p>Subscriber-only alternate endings and author notes on heartbreak's rebuild.</p> {/* Refined: Ties to "second chances," "redefine winning" */}
            </article>
          </div>
        </section>

        <section className="sp-section sp-reviews">
          <div>
            <h2 className="sp-h2">Reader Reflections</h2> {/* Refined: From testimonials to draft's "reflect" */}
            <blockquote className="sp-quote">“These stories cracked open my own empire scars — raw, real, and utterly alive.”<cite>— Alex, Aspiring Founder</cite></blockquote> {/* Refined: From home setup to emotional resonance; role to draft's "dreamers" */}
            <blockquote className="sp-quote">“The ache of betrayal hit like my boardroom losses — now I'm chasing rebuilds.”<cite>— Jordan, Entrepreneur</cite></blockquote> {/* Refined: From tools to personal ties; evokes "ache," "rebuild" */}
          </div>

          <div>
            <h2 className="sp-h2">FAQ</h2>
            <div className="sp-faq">
              <details>
                <summary>Are the monthly previews free?</summary> {/* Refined: From weekly to monthly */}
                <div>Yes — the standard teaser drops are free. Premium unlocks full worlds and alternate paths.</div> {/* Refined: From checklists to fiction extras */}
              </details>

              <details>
                <summary>How often will I receive stories?</summary> {/* Refined: From emails to stories */}
                <div>Monthly novel installments + occasional passion-prompt alerts (2–4 deliveries/month).</div> {/* Refined: From trends to thematic "prompts" */}
              </details>
            </div>
          </div>
        </section>

        <footer className="sp-footer">© {new Date().getFullYear()} ONJO • Where ambition crashes into emotion</footer> {/* Refined: Echo draft tagline */}
      </main>
    </div>
  );
}