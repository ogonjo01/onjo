// src/components/CategoryFilter/CategoryFilter.jsx
import React, { useEffect, useState } from 'react';
import { motion } from 'framer-motion';
import { supabase } from '../../supabase/supabaseClient';
import './CategoryFilter.css';

const CategoryFilter = ({ selectedCategory = 'For You', onSelectCategory, isHomePage, isHidden }) => {
  const [categories, setCategories] = useState(['For You']);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let mounted = true;

    const fetch = async () => {
      setLoading(true);
      try {
        const { data, error } = await supabase
          .from('book_summaries')
          .select('category')
          .not('category', 'is', null)
          .limit(200);

        if (error) {
          console.error('Error fetching categories', error);
          if (mounted) setLoading(false);
          return;
        }

        const unique = Array.from(
          new Set(
            (data || [])
              .map((d) => (d.category || '').toString().trim())
              .filter(Boolean)
          )
        ).sort((a, b) => a.localeCompare(b, undefined, { sensitivity: 'base' }));

        if (mounted) {
          setCategories(['For You', ...unique]);
          setLoading(false);
        }
      } catch (err) {
        console.error('Fetch categories failed', err);
        if (mounted) setLoading(false);
      }
    };

    fetch();
    return () => { mounted = false; };
  }, []);

  const handleKey = (e, category) => {
    if (e.key === 'Enter' || e.key === ' ') {
      e.preventDefault();
      if (typeof onSelectCategory === 'function') onSelectCategory(category);
    }
  };

  const containerClassName = `category-filter-container ${isHomePage ? '' : 'category-filter-container--scrollable'} ${isHidden ? 'category-filter-container--hidden' : ''}`;

  return (
    <nav
      className={containerClassName}
      role="navigation"
      aria-label="Categories"
    >
      {loading ? (
        <div className="category-loading" aria-live="polite">Loading categories…</div>
      ) : (
        categories.map((c) => (
          <motion.button
            key={c}
            type="button"
            data-category={c}
            className={`category-item ${selectedCategory === c ? 'active' : ''}`}
            onClick={() => typeof onSelectCategory === 'function' && onSelectCategory(c)}
            onKeyDown={(e) => handleKey(e, c)}
            whileHover={{ scale: 1.03 }}
            aria-pressed={selectedCategory === c}
            title={`Show ${c}`}
          >
            {c}
          </motion.button>
        ))
      )}
    </nav>
  );
};

export default CategoryFilter;