

import React, { useRef } from 'react';
import { Link } from 'react-router-dom';
import './ContentFeed.css';

const SkeletonCard = () => (
  <div className="summary-card skeleton" aria-hidden>
    <div className="cover-wrap" />
    <div className="card-content">
      <div className="s-line title" />
      <div className="s-line author" />
      <div className="s-line summary short" />
      <div className="card-footer">
        <div className="s-chip" />
        <div className="s-chip" />
        <div className="s-chip" />
      </div>
    </div>
  </div>
);

const HorizontalCarousel = ({
  title,
  children,
  items = [],
  viewAllLink = '#',
  loading = false,
  emptyMessage = 'No items',
  skeletonCount = 6,
}) => {
  const scrollerRef = useRef(null);
  const handleScrollBy = (delta) => {
    const s = scrollerRef.current;
    if (!s) return;
    s.scrollBy({ left: delta, behavior: 'smooth' });
  };

  // show skeletons while `loading` is true
  if (loading) {
    return (
      <section className="hf-carousel" aria-roledescription="carousel" aria-label={title}>
        <div className="hf-carousel-header">
          <h3 className="hf-title">{title}</h3>
          <div className="hf-actions">
            <button className="hf-btn" onClick={() => handleScrollBy(-320)} aria-label="scroll left">◀</button>
            <button className="hf-btn" onClick={() => handleScrollBy(320)} aria-label="scroll right">▶</button>
            <Link className="hf-viewall" to={viewAllLink}>View all</Link>
          </div>
        </div>

        <div className="hf-scroller" ref={scrollerRef} tabIndex={0} role="list">
          <div className="hf-items">
            {Array.from({ length: skeletonCount }).map((_, i) => <SkeletonCard key={i} />)}
          </div>
        </div>
      </section>
    );
  }

  // not loading: render items or empty state
  return (
    <section className="hf-carousel" aria-roledescription="carousel" aria-label={title}>
      <div className="hf-carousel-header">
        <h3 className="hf-title">{title}</h3>
        <div className="hf-actions">
          <button className="hf-btn" onClick={() => handleScrollBy(-320)} aria-label="scroll left">◀</button>
          <button className="hf-btn" onClick={() => handleScrollBy(320)} aria-label="scroll right">▶</button>
          <Link className="hf-viewall" to={viewAllLink}>View all</Link>
        </div>
      </div>

      <div className="hf-scroller" ref={scrollerRef} tabIndex={0} role="list">
        {items && items.length > 0 ? (
          <div className="hf-items" role="listbox" aria-label={`${title} items`}>
            {children}
          </div>
        ) : (
          <div className="hf-empty">{emptyMessage}</div>
        )}
      </div>
    </section>
  );
};

export default HorizontalCarousel;
