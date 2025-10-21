// src/components/HorizontalCarousel/HorizontalCarousel.jsx
import React, { useRef } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import './HorizontalCarousel.css';

const CardSkeleton = () => (
  <div className="card-skeleton" aria-hidden>
    <div className="s-cover" />
    <div className="s-lines">
      <div className="s-line short" />
      <div className="s-line" />
      <div className="s-line narrow" />
    </div>
  </div>
);

const isExternal = (url) => {
  try {
    return /^https?:\/\//i.test(url);
  } catch (e) {
    return false;
  }
};

const HorizontalCarousel = ({
  title,
  children,
  items = [],
  viewAllLink = null,
  loading = false,
  skeletonCount = 6,
  emptyMessage = 'No items',
}) => {
  const scrollerRef = useRef(null);
  const navigate = useNavigate();

  const handleScrollBy = (delta) => {
    const s = scrollerRef.current;
    if (!s) return;
    s.scrollBy({ left: delta, behavior: 'smooth' });
  };

  const handleViewAll = (e) => {
    if (!viewAllLink) return;
    // if external, open in new tab
    if (isExternal(viewAllLink)) {
      window.open(viewAllLink, '_blank', 'noopener,noreferrer');
      return;
    }
    // otherwise navigate within the app
    // keep normal behavior if viewAllLink is object/string pathname
    try {
      navigate(viewAllLink);
    } catch (err) {
      // fallback to Link (in case navigate fails for some reason)
      console.debug('navigate failed for viewAllLink:', viewAllLink, err);
    }
  };

  return (
    <section className="hf-carousel" aria-roledescription="carousel" aria-label={title}>
      <div className="hf-carousel-header">
        <h3 className="hf-title">{title}</h3>
        <div className="hf-actions">
          <button
            type="button"
            className="hf-btn"
            onClick={() => handleScrollBy(-320)}
            aria-label={`Scroll ${title} left`}
          >
            ◀
          </button>

          <button
            type="button"
            className="hf-btn"
            onClick={() => handleScrollBy(320)}
            aria-label={`Scroll ${title} right`}
          >
            ▶
          </button>

          {/* View all: programmatic navigation (robust inside complex layouts) */}
          {viewAllLink ? (
            isExternal(viewAllLink) ? (
              <a className="hf-viewall" href={viewAllLink} target="_blank" rel="noopener noreferrer" aria-label={`View all ${title}`}>
                View all
              </a>
            ) : (
              <button
                type="button"
                className="hf-viewall"
                onClick={handleViewAll}
                aria-label={`View all ${title}`}
                title={`View all ${title}`}
              >
                View all
              </button>
            )
          ) : null}
        </div>
      </div>

      <div className="hf-scroller" ref={scrollerRef} tabIndex={0} role="list" aria-label={`${title} items`}>
        {loading ? (
          <div className="hf-items">
            {Array.from({ length: skeletonCount }).map((_, i) => <CardSkeleton key={i} />)}
          </div>
        ) : (
          (items && items.length > 0) ? (
            <div className="hf-items">{children}</div>
          ) : (
            <div className="hf-empty">{emptyMessage}</div>
          )
        )}
      </div>
    </section>
  );
};

export default HorizontalCarousel;
