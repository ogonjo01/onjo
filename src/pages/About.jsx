import React from 'react';

// Mock Header component to make the page self-contained
const Header = () => (
  <header style={{ padding: '1rem', backgroundColor: '#34495e', color: '#fff', textAlign: 'center' }}>
    <h1 style={{ margin: 0 }}>ONJO</h1> {/* Updated: Brand consistency from OGONJO */}
  </header>
);

// Mock Footer component to make the page self-contained
const Footer = () => (
  <footer style={{ padding: '2rem', backgroundColor: '#2c3e50', color: '#fff', textAlign: 'center' }}>
    <p>© 2025 ONJO. All rights reserved.</p> {/* Updated: Brand + year alignment */}
  </footer>
);

const About = () => {
  return (
    <div className="about-page-container">
      <style>
        {`
          /* --- General Page Layout --- */
          .about-page-container {
            min-height: 100vh;
            display: flex;
            flex-direction: column;
            background-color: #f8f8f8;
            font-family: 'Roboto', sans-serif;
            color: #34495e;
          }
          
          .main-content {
            flex: 1;
            padding: 4rem 1.5rem;
            max-width: 1200px;
            margin: 0 auto;
            width: 100%;
          }
          
          /* --- Hero Section --- */
          .about-hero-section {
            text-align: center;
            margin-bottom: 4rem;
            padding: 2rem 0;
            background-color: #ffffff;
            border-radius: 12px;
            box-shadow: 0 4px 12px rgba(0, 0, 0, 0.05);
          }
          
          .about-title {
            font-family: 'Montserrat', sans-serif;
            font-size: 3rem;
            font-weight: 700;
            color: #2c3e50;
            margin-bottom: 0.5rem;
          }
          
          .about-subtitle {
            font-size: 1.25rem;
            color: #7f8c8d;
          }
          
          /* --- Content Sections --- */
          .about-content-section {
            display: flex;
            flex-direction: column;
            gap: 3rem;
          }
          
          .content-block {
            background-color: #ffffff;
            padding: 2.5rem;
            border-radius: 12px;
            box-shadow: 0 4px 12px rgba(0, 0, 0, 0.05);
          }
          
          .content-heading {
            font-family: 'Montserrat', sans-serif;
            font-size: 2rem;
            font-weight: 600;
            color: #34495e;
            margin-bottom: 1.5rem;
            text-align: center;
          }
          
          .content-paragraph {
            font-size: 1rem;
            line-height: 1.8;
            color: #555;
            margin-bottom: 1.5rem;
          }
          
          /* --- Values Section --- */
          .values-list {
            list-style: none;
            padding: 0;
            display: grid;
            grid-template-columns: repeat(auto-fit, minmax(250px, 1fr));
            gap: 1.5rem;
            text-align: left;
          }
          
          .values-list li {
            background-color: #ecf0f1;
            padding: 1.5rem;
            border-radius: 8px;
            font-size: 1rem;
            line-height: 1.6;
            border-left: 4px solid #3498db;
          }
          
          .value-name {
            font-weight: bold;
            color: #2c3e50;
            display: block;
            margin-bottom: 0.5rem;
          }
          
          /* --- Team Section --- */
          .team-grid {
            display: flex;
            flex-wrap: wrap;
            justify-content: center;
            gap: 2rem;
            margin-top: 2rem;
          }
          
          .team-member {
            display: flex;
            flex-direction: column;
            align-items: center;
            text-align: center;
            max-width: 250px;
          }
          
          .team-photo {
            width: 150px;
            height: 150px;
            border-radius: 50%;
            object-fit: cover;
            border: 4px solid #3498db;
            margin-bottom: 1rem;
          }
          
          .member-name {
            font-family: 'Montserrat', sans-serif;
            font-size: 1.25rem;
            font-weight: 600;
            color: #2c3e50;
            margin: 0.5rem 0;
          }
          
          .member-role {
            font-style: italic;
            color: #7f8c8d;
            margin-bottom: 1rem;
          }
          
          .member-bio {
            font-size: 0.9rem;
            color: #555;
            line-height: 1.6;
          }
          
          /* --- Responsive adjustments --- */
          @media (max-width: 768px) {
            .main-content {
              padding: 2rem 1rem;
            }
            
            .about-title {
              font-size: 2.25rem;
            }
          
            .content-heading {
              font-size: 1.75rem;
            }
          }
        `}
      </style>
      <Header />
      <main className="main-content">
        <section className="about-hero-section">
          <h1 className="about-title">Empowering Everyday Choices with Niche Expertise</h1> {/* Updated Oct 14, 2025: Aligns with new mission */}
          <p className="about-subtitle">
            At <strong>ONJO</strong>, we're your trusted guide through specialized products and smart decisions. {/* Updated: Brand + core promise */}
          </p>
        </section>

        <section className="about-content-section">
          <div className="content-block">
            <h2 className="content-heading">Our Story: From Frustration to Clarity</h2> {/* Updated: New heading from content */}
            <p className="content-paragraph">
              Founded in 2024 by a team of seasoned researchers, marketers, and everyday enthusiasts, our mission is to cut through the noise of overwhelming options and deliver clear, actionable insights that save you time, money, and frustration. Whether you're a busy parent scouting durable kitchen gadgets, a hobbyist hunting the perfect eco-friendly tool, or a professional seeking reliable tech for niche workflows, we believe informed choices lead to better lives. {/* Updated: Founder story + examples */}
            </p>
            <p className="content-paragraph">
              It started with a simple pain point. Our founder, Alex Rivera—a former product manager turned indie entrepreneur—spent endless hours sifting through generic reviews for a compact espresso maker that fit a tiny apartment kitchen. The results? Overpriced duds and vague advice that left more questions than answers. That frustration sparked ONJO: a platform dedicated to high-niche explorations, from "Pros and Cons of Ergonomic Standing Desks for Remote Coders" to "How to Choose Bike Locks That Last in Urban Chaos." {/* Updated: Personal anecdote + examples */}
            </p>
            <p className="content-paragraph">
              Today, with a lean team of 8 (including SEO wizards, data analysts, and freelance writers with backgrounds from Forbes and Wired), we publish weekly deep-dives optimized for your search queries. We're globally minded, adapting insights for diverse audiences—beginners in bustling Asian cities or pros in European startups—while keeping things concise and scannable. And yes, we partner with affiliates like Amazon to keep the lights on, but transparency is non-negotiable: every recommendation is vetted for relevance, with full disclosures upfront. {/* Updated: Team size + global focus */}
            </p>
          </div>

          <div className="content-block values-section">
            <h2 className="content-heading">Why Trust ONJO?</h2> {/* Updated: From "Our Values" to trust factors */}
            <ul className="values-list">
              <li>
                <span className="value-name">Data-Driven Depth:</span> Every guide pulls from 500+ real reviews and sources like Statista or Wirecutter, cited inline for easy verification. {/* Updated: Specific to reviews/sources */}
              </li>
              <li>
                <span className="value-name">Audience-First Approach:</span> Tailored for real people—friendly-expert tone, no jargon, mobile-optimized for on-the-go reading. {/* Updated: User-centric */}
              </li>
              <li>
                <span className="value-name">Monetization with Integrity:</span> Subtle affiliate links only where they add value (e.g., "Get this durable option here"), always with free alternatives. {/* Updated: Transparency emphasis */}
              </li>
              <li>
                <span className="value-name">Community Roots:</span> We're active on X (formerly Twitter) and Reddit, crowdsourcing feedback to refine our content. Join the conversation @NicheWiseHub. {/* Updated: Social tie-in */}
              </li>
            </ul>
          </div>

          <div className="content-block team-section">
            <h2 className="content-heading">Meet Our Team</h2> {/* Unchanged: Heading fits */}
            <div className="team-grid">
              <div className="team-member">
                <img 
                  src="https://placehold.co/200x200/cccccc/333333?text=Alex+Rivera"  /* Updated: Founder name in placeholder */
                  alt="Alex Rivera, Founder"  /* Updated: Descriptive alt */
                />
                <h3 className="member-name">Alex Rivera</h3> {/* Updated: From John Doe */}
                <p className="member-role">Founder & Product Lead</p> {/* Updated: Role to match story */}
                <p className="member-bio">Former product manager turned indie entrepreneur, passionate about turning review chaos into clarity for everyday choices.</p> {/* Updated: Bio alignment */}
              </div>
              <div className="team-member">
                <img 
                  src="https://placehold.co/200x200/cccccc/333333?text=Team+Member"  /* Updated: Generic for team of 8 */
                  alt="Content Specialist" 
                  className="team-photo"
                />
                <h3 className="member-name">Sarah Kim</h3> {/* Updated: Diverse name example */}
                <p className="member-role">Head of Content & Research</p> {/* Updated: Role */}
                <p className="member-bio">SEO wizard and freelance writer from Wired, dedicated to crafting scannable deep-dives on niche gadgets and tools.</p> {/* Updated: Background tie-in */}
              </div>
              {/* Optional: Add third for team nod—grid handles it */}
              <div className="team-member">
                <img 
                  src="https://placehold.co/200x200/cccccc/333333?text=Data+Analyst" 
                  alt="Data Analyst" 
                  className="team-photo"
                />
                <h3 className="member-name">Raj Patel</h3>
                <p className="member-role">Data Analyst</p>
                <p className="member-bio">Cruncher of Amazon/Reddit data, ensuring our insights are backed by real trends and user patterns.</p>
              </div>
            </div>
          </div>

          {/* New: Added section for forward-looking content—fits pattern without structure change */}
          <div className="content-block">
            <h2 className="content-heading">Looking Ahead: Building a Smarter Shopping World</h2> {/* Updated: New heading */}
            <p className="content-paragraph">
              As we grow into 2026, we're expanding with interactive tools—like customizable product quizzes and PDF downloadables for offline reference—while committing to sustainability: 10% of affiliate earnings support eco-initiatives tied to our green product guides. ONJO isn't just about products; it's about empowering you to choose wisely, live fully, and shop sustainably. {/* Updated: Vision + CTA setup */}
            </p>
            <p className="content-paragraph">
              Ready to dive in? <a href="/">Explore Our Guides</a> or download a free starter PDF on "Top Niche Hacks for 2025." Have a topic suggestion? Drop us a line at hello@onjo.com—we're all ears. {/* Updated: CTAs + email; add real PDF link later */}
            </p>
            <p className="content-paragraph" style={{ fontSize: '0.9rem', color: '#7f8c8d', textAlign: 'center' }}> {/* Inline style for note—minimal */}
              *Last updated: October 14, 2025*  
              *Your Site Author: The ONJO Team* {/* Updated: Date + author */}
            </p>
          </div>
        </section>
      </main>
      <Footer />
    </div>
  );
};

export default About;