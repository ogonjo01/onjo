import React from 'react';

// Mock Header component to make the page self-contained
const Header = () => (
  <header style={{ padding: '1rem', backgroundColor: '#34495e', color: '#fff', textAlign: 'center' }}>
    <h1 style={{ margin: 0 }}>ONJO</h1> {/* Unchanged: Brand consistency */}
  </header>
);

// Mock Footer component to make the page self-contained
const Footer = () => (
  <footer style={{ padding: '2rem', backgroundColor: '#2c3e50', color: '#fff', textAlign: 'center' }}>
    <p>© 2025 ONJO. Where ambition meets emotion.</p> {/* Refined: Echo tagline for cohesion */}
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
          <h1 className="about-title">About ONJO</h1> {/* Refined: Direct from draft title */}
          <p className="about-subtitle">
            {/* Enhanced: Blockquote-style pull for impact; first para integrated */}
            <em>ONJO is a storytelling brand born from the collision between ambition and emotion.</em>
          </p>
        </section>

        <section className="about-content-section">
          <div className="content-block">
            <h2 className="content-heading">Stories of Empires and Echoes</h2> {/* Refined: Evocative heading tying to draft */}
            <p className="content-paragraph">
              We tell stories about the dreamers who build empires—and the hearts they break along the way. Our novels dive into the worlds of business, entrepreneurship, power, and passion, revealing the human side behind success: love that fades, loyalty that fractures, and dreams that demand sacrifice. {/* Direct from draft: Core narrative */}
            </p>
            <p className="content-paragraph">
              At ONJO, we believe that ambition is not just about winning—it's about what we lose, who we become, and how we rebuild when everything falls apart. Every ONJO story is a mirror of life's reality: the hunger for greatness, the ache of betrayal, and the fragile beauty of second chances. {/* Draft para enhanced with rhythm via colons/dashes */}
            </p>
          </div>

          <div className="content-block values-section">
            <h2 className="content-heading">Our Storytelling Pillars</h2> {/* Refined: From "Why Trust" to mission echoes */}
            <ul className="values-list">
              <li>
                <span className="value-name">Raw Ambition:</span> Narratives that capture the relentless drive of empire-builders, from boardroom battles to whispered alliances. {/* Enhanced: Ties to business/power themes */}
              </li>
              <li>
                <span className="value-name">Emotional Truth:</span> Fiction that bleeds real—heartbreak, sacrifice, and rebirth—crafted for readers who crave depth over escapism. {/* Draft mission: "Feels real" amplified */}
              </li>
              <li>
                <span className="value-name">Reflective Resonance:</span> Stories designed to linger, sparking your own reflections on power, passion, and the cost of chasing dreams. {/* Enhanced: From "soul remember" for introspection */}
              </li>
              <li>
                <span className="value-name">Inclusive Worlds:</span> Diverse voices in entrepreneurial romance, building communities where ambition meets vulnerability. {/* New: Adds inclusivity nod; ties to social/follow */}
              </li>
            </ul>
          </div>

          <div className="content-block team-section">
            <h2 className="content-heading">The Dreamers Behind the Words</h2> {/* Refined: From "Meet Our Team" to creative fit */}
            <div className="team-grid">
              <div className="team-member">
                <img 
                  src="https://placehold.co/200x200/cccccc/333333?text=Alex+Rivera"  /* Unchanged: Reuse; suggest author photo later */
                  alt="Alex Rivera, Founder & Storyteller"  /* Refined: Role update */
                  className="team-photo"
                />
                <h3 className="member-name">Alex Rivera</h3>
                <p className="member-role">Founder & Lead Storyteller</p> {/* Refined: Creative pivot */}
                <p className="member-bio">A former entrepreneur whose own empire crumbled under passion's weight—inspiring novels that turn personal scars into shared triumphs.</p> {/* Enhanced: Echoes draft's loss/rebuild */}
              </div>
              <div className="team-member">
                <img 
                  src="https://placehold.co/200x200/cccccc/333333?text=Sarah+Kim" 
                  alt="Sarah Kim, Editor" 
                  className="team-photo"
                />
                <h3 className="member-name">Sarah Kim</h3>
                <p className="member-role">Editor & Narrative Architect</p> {/* Refined: From content head */}
                <p className="member-bio">Wordsmith with a knack for weaving betrayal's ache into pulse-racing plots, drawing from indie publishing roots to amplify underrepresented dreamers.</p> {/* Enhanced: Ties to emotion/authenticity */}
              </div>
              {/* Optional: Third for balance—adapt as needed */}
              <div className="team-member">
                <img 
                  src="https://placehold.co/200x200/cccccc/333333?text=Raj+Patel" 
                  alt="Raj Patel, Illustrator" 
                  className="team-photo"
                />
                <h3 className="member-name">Raj Patel</h3>
                <p className="member-role">Cover Artist & Visionary</p> {/* Refined: Visual storytelling */}
                <p className="member-bio">Captures the fragile edge of ambition in evocative designs, blending cultural motifs with the raw pulse of entrepreneurial worlds.</p>
              </div>
            </div>
          </div>

          {/* Refined: Forward section as narrative close—preserves pattern */}
          <div className="content-block">
            <h2 className="content-heading">Where Ambition Meets Emotion</h2> {/* Refined: Tagline as heading */}
            <p className="content-paragraph">
              Our mission is to write fiction that feels real—stories that make your heart race, your mind reflect, and your soul remember what it means to feel alive. As we launch our debut novels in 2026, join us in exploring these worlds: from startup seductions to legacy reckonings. {/* Draft mission + teaser enhancement */}
            </p>
            <p className="content-paragraph">
              Ready to dive deeper? <a href="/">Discover Our Stories</a> or follow the journey on <a href="https://www.onjo.life">www.onjo.life</a>. Share your own empire tale at hello@onjo.life—we're building this together. {/* Enhanced: CTAs with URL; community hook */}
            </p>
            <p className="content-paragraph" style={{ fontSize: '0.9rem', color: '#7f8c8d', textAlign: 'center' }}>
              *Last updated: November 04, 2025*  
              *Your Storytellers: The ONJO Collective* {/* Refined: Date + author nod to team */}
            </p>
          </div>
        </section>
      </main>
      <Footer />
    </div>
  );
};

export default About;