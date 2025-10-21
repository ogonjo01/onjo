// src/components/ContentFeed/HorizontalSection.jsx
import React from 'react';
import { Link } from 'react-router-dom';
import BookSummaryCard from '../BookSummaryCard/BookSummaryCard';
import './ContentFeed.css';

const HorizontalSection = ({ title, items = [], seeAllLink = '/explore', compact = true }) => {
  return (
    <section className="horizontal-section" aria-labelledby={`h-${title}`}>
      <div className="horizontal-section-header">
        <h3 id={`h-${title}`}>{title}</h3>
        <Link to={seeAllLink} className="see-all-link">View all</Link>
      </div>

      <div className="horizontal-carousel" role="list">
        {items && items.length > 0 ? items.map((it) => (
          <div key={it.id} role="listitem" className="carousel-item">
            <BookSummaryCard summary={it} compact={compact} />
          </div>
        )) : (
          <div className="carousel-empty">No items</div>
        )}
      </div>
    </section>
  );
};

export default HorizontalSection;
