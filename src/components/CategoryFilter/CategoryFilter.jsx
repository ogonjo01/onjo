// src/components/CategoryFilter/CategoryFilter.jsx
import React, { useEffect, useState } from 'react';
import { motion } from 'framer-motion';
import { supabase } from '../../supabase/supabaseClient';
import './CategoryFilter.css';

/* ── Fetch every distinct non-null category ──────────────────
   Pages through in batches of 1000 to bypass Supabase's
   default 1000-row cap, then deduplicates in JS.
──────────────────────────────────────────────────────────── */
const fetchAllCategories = async () => {
  const PAGE = 1000;
  let from = 0;
  const allCategories = new Set();

  while (true) {
    const { data, error } = await supabase
      .from('book_summaries')
      .select('category')
      .not('category', 'is', null)
      .range(from, from + PAGE - 1);

    if (error) throw error;
    if (!data || data.length === 0) break;

    data.forEach(row => {
      const cat = (row.category || '').toString().trim();
      if (cat) allCategories.add(cat);
    });

    if (data.length < PAGE) break;
    from += PAGE;
  }

  return Array.from(allCategories).sort((a, b) =>
    a.localeCompare(b, undefined, { sensitivity: 'base' })
  );
};

const CategoryFilter = ({
  selectedCategory = 'For You',
  onSelectCategory,
  isHomePage,
  isHidden,
  onRoleLoaded,
}) => {
  const [categories, setCategories] = useState(['For You']);
  const [loading, setLoading]       = useState(true);

  useEffect(() => {
    let mounted = true;

    const init = async () => {
      setLoading(true);
      try {
        // 1. Get user role
        const { data: { user } = {} } = await supabase.auth.getUser();
        let role = 'user';
        if (user?.id) {
          const { data: profile } = await supabase
            .from('profiles')
            .select('role')
            .eq('id', user.id)
            .maybeSingle();
          role = profile?.role || 'user';
        }
        if (mounted && typeof onRoleLoaded === 'function') onRoleLoaded(role);

        // 2. Fetch ALL categories via pagination
        const unique = await fetchAllCategories();

        if (mounted) {
          const draftTab = (role === 'admin' || role === 'team') ? ['📝 Drafts'] : [];
          setCategories([...draftTab, 'For You', ...unique]);
          setLoading(false);
        }
      } catch (err) {
        console.error('CategoryFilter init failed:', err);
        if (mounted) setLoading(false);
      }
    };

    init();
    return () => { mounted = false; };
  }, [onRoleLoaded]);

  const handleKey = (e, category) => {
    if (e.key === 'Enter' || e.key === ' ') {
      e.preventDefault();
      if (typeof onSelectCategory === 'function') onSelectCategory(category);
    }
  };

  const containerClassName = [
    'category-filter-container',
    !isHomePage ? 'category-filter-container--scrollable' : '',
    isHidden    ? 'category-filter-container--hidden'     : '',
  ].filter(Boolean).join(' ');

  return (
    <nav className={containerClassName} role="navigation" aria-label="Categories">
      {loading ? (
        <div className="category-loading" aria-live="polite">Loading categories…</div>
      ) : (
        categories.map((c) => (
          <motion.button
            key={c}
            type="button"
            data-category={c}
            className={`category-item ${selectedCategory === c ? 'active' : ''} ${c === '📝 Drafts' ? 'category-item--drafts' : ''}`}
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