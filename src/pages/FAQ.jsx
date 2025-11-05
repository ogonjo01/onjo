import React, { useState } from 'react';
import { ChevronDown } from 'lucide-react';

// Mock Header component to keep all code in a single file
const Header = () => (
  <header className="header">
    <div className="header-container">
      <h1 className="header-title">ONJO</h1> {/* Unchanged: Brand consistency */}
    </div>
  </header>
);

// Mock Footer component to keep all code in a single file
const Footer = () => (
  <footer className="footer">
    <div className="footer-container">
      <p>&copy; {new Date().getFullYear()} ONJO. All rights reserved.</p> {/* Unchanged: Brand alignment */}
    </div>
  </footer>
);

// Mock components to keep the app self-contained and runnable
const Card = ({ children }) => <div className="card">{children}</div>;
const CardContent = ({ children }) => <div className="card-content">{children}</div>;
const Accordion = ({ children }) => <div className="accordion-root">{children}</div>;

const AccordionItem = ({ children, value }) => {
  const [isOpen, setIsOpen] = useState(false);
  return (
    <div className="accordion-item">
      {React.Children.map(children, child => {
        if (child.type.name === 'AccordionTrigger') {
          return React.cloneElement(child, { onClick: () => setIsOpen(!isOpen), isOpen });
        }
        if (child.type.name === 'AccordionContent' && isOpen) {
          return child;
        }
        return null;
      })}
    </div>
  );
};

const AccordionTrigger = ({ children, onClick, isOpen }) => (
  <button className="accordion-trigger" onClick={onClick}>
    {children}
    <ChevronDown className={`accordion-icon ${isOpen ? 'rotate' : ''}`} />
  </button>
);

const AccordionContent = ({ children }) => (
  <div className="accordion-content">
    {children}
  </div>
);

const FAQ = () => {
  const faqs = [
    {
      question: "What is ONJO?", // Unchanged: Core brand question
      answer: "ONJO is a storytelling brand forged in the collision of ambition and emotion—crafting entrepreneurial romance novels that expose the human scars behind empires, heartbreaks, and unbreakable resolve." // Refined Nov 05, 2025: From products to draft's "collision," "empires," "hearts break," "rebuild"
    },
    {
      question: "How is ONJO free?", // Unchanged: Monetization query
      answer: "Our worlds are open to all, no barriers to entry. We sustain through subtle partnerships that honor transparency, ensuring every tale reaches you unfiltered and true." // Refined: From affiliates to "worlds" and "true" echoing "feels real"; subtle mission tie
    },
    {
      question: "Can I download the stories?", // Refined: From guides to stories
      answer: "Our novels are crafted for immersive, on-site discovery to preserve their emotional pulse. Full downloads aren't available yet—but exclusive chapter PDFs for deep reflections are on the horizon. Dive in anytime." // Refined: "Emotional pulse" nods to "heart race"; forward-looking to "worlds"
    },
    {
      question: "How often are new stories released?", // Refined: From guides to stories
      answer: "We release fresh installments monthly, drawn from reader echoes—tales of boardroom fires and whispered longings. Follow our drops to chase the next empire's rise." // Refined: Cadence to monthly for novels; themes from "business...passion," "hunger for greatness"
    },
    {
      question: "What if I have more questions?", // Unchanged: General
      answer: "We're building this journey together. For deeper dives or tale suggestions, reach out via our Connect page—we're eager to hear your reflections." // Refined: "Journey together" evokes community; "reflections" from draft's "mind reflect"
    }
  ];

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
          
          .faq-page-container {
            display: flex;
            flex-direction: column;
            min-height: 100vh;
            background-color: #f0f4f8;
          }
          
          .header {
            background-color: #ffffff;
            box-shadow: 0 2px 4px rgba(0, 0, 0, 0.05);
            padding: 1rem 0;
          }

          .header-container {
            max-width: 1200px;
            margin: 0 auto;
            padding: 0 1rem;
          }

          .header-title {
            font-family: 'Montserrat', sans-serif;
            font-size: 1.5rem;
            font-weight: 700;
            color: #4a5568;
          }

          .main-content {
            flex: 1;
            max-width: 1280px;
            margin: 0 auto;
            padding: 4rem 1rem;
          }
          
          .hero-section {
            text-align: center;
            margin-bottom: 4rem;
          }

          .page-title {
            font-family: 'Montserrat', sans-serif;
            font-weight: 700;
            font-size: 2.5rem;
            color: #2d3748;
            margin-bottom: 1.5rem;
          }
          
          .page-subtitle {
            font-family: 'Roboto', sans-serif;
            font-size: 1.25rem;
            color: #718096;
            max-width: 48rem;
            margin: 0 auto;
            line-height: 1.6;
          }

          .card {
            max-width: 64rem;
            margin: 0 auto;
            background-color: #ffffff;
            border-radius: 12px;
            box-shadow: 0 10px 15px rgba(0, 0, 0, 0.1);
            overflow: hidden;
          }

          .card-content {
            padding: 2rem;
          }
          
          .accordion-root {
            display: flex;
            flex-direction: column;
            gap: 1rem;
          }

          .accordion-item {
            border: 1px solid #e2e8f0;
            border-radius: 8px;
            padding: 0.5rem 1rem;
          }

          .accordion-trigger {
            font-family: 'Montserrat', sans-serif;
            font-weight: 600;
            font-size: 1rem;
            color: #2d3748;
            background: none;
            border: none;
            cursor: pointer;
            width: 100%;
            text-align: left;
            padding: 1rem 0;
            display: flex;
            justify-content: space-between;
            align-items: center;
            transition: color 0.2s;
          }
          
          .accordion-trigger:hover {
            color: #4299e1;
          }

          .accordion-icon {
            transition: transform 0.3s;
          }
          
          .accordion-icon.rotate {
            transform: rotate(180deg);
          }

          .accordion-content {
            font-family: 'Roboto', sans-serif;
            color: #718096;
            line-height: 1.6;
            padding-bottom: 1rem;
          }

          .contact-cta-section {
            text-align: center;
            margin-top: 4rem;
          }

          .contact-cta-text {
            font-family: 'Roboto', sans-serif;
            color: #718096;
            margin-bottom: 1rem;
          }
          
          .contact-link {
            font-family: 'Roboto', sans-serif;
            color: #4299e1;
            transition: color 0.2s;
            text-decoration: none;
            border-bottom: 1px solid transparent;
          }
          
          .contact-link:hover {
            color: #2b6cb0;
            border-bottom: 1px solid #2b6cb0;
          }

          .footer {
            background-color: #2d3748;
            color: #e2e8f0;
            text-align: center;
            padding: 1.5rem 0;
            font-size: 0.875rem;
          }

          @media (min-width: 768px) {
            .page-title {
              font-size: 3rem;
            }
          }
        `}
      </style>
      <div className="faq-page-container">
        <Header />
        
        <main className="main-content">
          <div className="hero-section">
            <h1 className="page-title">Frequently Asked Questions</h1>
            <p className="page-subtitle">
              Unpack the mysteries of our story worlds, emotional arcs, and the raw truths of ambition. {/* Refined: From products to "story worlds," "emotional arcs," tying to draft's "mirror of life’s reality" */}
            </p>
          </div>

          <Card>
            <CardContent>
              <Accordion>
                {faqs.map((faq, index) => (
                  <AccordionItem key={index} value={`item-${index}`}>
                    <AccordionTrigger>
                      {faq.question}
                    </AccordionTrigger>
                    <AccordionContent>
                      {faq.answer}
                    </AccordionContent>
                  </AccordionItem>
                ))}
              </Accordion>
            </CardContent>
          </Card>

          <div className="contact-cta-section">
            <p className="contact-cta-text">
              Still have questions? {/* Unchanged: Simple CTA */}
            </p>
            <a 
              href="/contact" 
              className="contact-link"
            >
              Connect on your journey {/* Refined: From "Contact our support team" to immersive "journey" echo of draft's "chasing your own empire" */}
            </a>
          </div>
        </main>

        <Footer />
      </div>
    </>
  );
};

export default FAQ;