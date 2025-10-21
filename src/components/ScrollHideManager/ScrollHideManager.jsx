// src/components/ScrollHideManager/ScrollHideManager.jsx
import { useEffect, useRef } from 'react';
import { useLocation } from 'react-router-dom';

export default function ScrollHideManager() {
  const { pathname } = useLocation();
  const lastPos = useRef(0);
  const ticking = useRef(false);
  const hidden = useRef(false);
  const scrollerRef = useRef(null);

  useEffect(() => {
    const container = document.querySelector('.main-content') || window;
    scrollerRef.current = container;

    // Reset classes first
    document.body.classList.remove('scroll-hide-global', 'homepage-fixed', 'page-static');
    hidden.current = false;

    // Homepage => fixed header + category; disable scroll-hide entirely
    if (pathname === '/' || pathname === '') {
      document.body.classList.add('homepage-fixed');
      // no scroll-listener needed
      lastPos.current = container === window ? window.scrollY || 0 : container.scrollTop || 0;
      return () => {
        document.body.classList.remove('homepage-fixed');
        document.body.classList.remove('scroll-hide-global');
      };
    }

    // Only enable auto-hide logic on Summary pages
    const isSummaryPage = pathname.startsWith('/summary/');
    if (!isSummaryPage) {
      // non-home, non-summary: keep default (header remains fixed or page static based on your other logic)
      document.body.classList.add('page-static');
      return () => {
        document.body.classList.remove('page-static');
        document.body.classList.remove('scroll-hide-global');
      };
    }

    // For summary pages we want the header+category to slide away
    document.body.classList.add('page-static'); // optional, for semantics
    lastPos.current = container === window ? window.scrollY || 0 : container.scrollTop || 0;

    const HIDE_THRESHOLD = 12; // px delta to consider hide
    const SHOW_THRESHOLD = 8;
    const MIN_TOGGLE_INTERVAL = 120; // ms
    let lastToggle = performance.now();

    const getPos = () => (container === window ? window.scrollY || 0 : container.scrollTop || 0);

    const handler = () => {
      const current = getPos();
      const now = performance.now();

      if (!ticking.current) {
        ticking.current = true;
        requestAnimationFrame(() => {
          const delta = current - lastPos.current;

          // near top -> always show
          if (current <= 40) {
            if (hidden.current) {
              hidden.current = false;
              lastToggle = now;
              document.body.classList.remove('scroll-hide-global');
            }
          } else if (delta > HIDE_THRESHOLD && (now - lastToggle) > MIN_TOGGLE_INTERVAL) {
            // scrolling down
            if (!hidden.current) {
              hidden.current = true;
              lastToggle = now;
              document.body.classList.add('scroll-hide-global');
            }
          } else if (delta < -SHOW_THRESHOLD && (now - lastToggle) > MIN_TOGGLE_INTERVAL) {
            // scrolling up
            if (hidden.current) {
              hidden.current = false;
              lastToggle = now;
              document.body.classList.remove('scroll-hide-global');
            }
          }

          lastPos.current = current;
          ticking.current = false;
        });
      }
    };

    // bind
    if (container === window) {
      window.addEventListener('scroll', handler, { passive: true });
      window.addEventListener('touchmove', handler, { passive: true });
      window.addEventListener('wheel', handler, { passive: true });
    } else {
      container.addEventListener('scroll', handler, { passive: true });
      container.addEventListener('touchmove', handler, { passive: true });
      container.addEventListener('wheel', handler, { passive: true });
    }

    return () => {
      if (container === window) {
        window.removeEventListener('scroll', handler);
        window.removeEventListener('touchmove', handler);
        window.removeEventListener('wheel', handler);
      } else {
        container.removeEventListener('scroll', handler);
        container.removeEventListener('touchmove', handler);
        container.removeEventListener('wheel', handler);
      }
      document.body.classList.remove('scroll-hide-global');
      document.body.classList.remove('page-static');
    };
  }, [pathname]);

  return null;
}
