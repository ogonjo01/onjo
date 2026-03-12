// src/components/ContentFeed/ContentFeed.jsx
import React, { useState, useEffect, useCallback, useRef } from 'react';
import { useLocation } from 'react-router-dom';
import { supabase } from '../../supabase/supabaseClient';
import BookSummaryCard from '../BookSummaryCard/BookSummaryCard';
import HorizontalCarousel from '../HorizontalCarousel/HorizontalCarousel';
import DraftPanel from '../DraftPanel/DraftPanel';
import './ContentFeed.css';

const ITEMS_PER_CAROUSEL = 12;
const CATEGORY_BATCH = 3;
const MIN_LOAD_MS = 350;
const DRAFTS_TAB = '📝 Drafts';
const FOR_YOU_TAB = 'For You';

const LIGHT_SELECT = `
  id,
  created_at,
  title,
  author,
  description,
  category,
  tags,
  user_id,
  image_url,
  affiliate_link,
  avg_rating,
  slug
`;

const SELECT_WITH_COUNTS = `
  id,
  created_at,
  title,
  author,
  description,
  category,
  tags,
  user_id,
  image_url,
  affiliate_link,
  likes_count:likes!likes_post_id_fkey(count),
  views_count:views!views_post_id_fkey(count),
  comments_count:comments!comments_post_id_fkey(count),
  avg_rating,
  slug
`;

const safeData = (d) => (d?.data ?? d ?? []);

const parseNumber = (v) => {
  if (v == null) return 0;
  if (typeof v === 'number') return v;
  if (typeof v === 'string') {
    const n = Number(v);
    return Number.isFinite(n) ? n : 0;
  }
  if (Array.isArray(v) && v.length) {
    const first = v[0];
    if (first == null) return 0;
    if (typeof first === 'object' && 'count' in first) {
      return Number(first.count) || 0;
    }
    return parseNumber(first.avg ?? first.count ?? first.value ?? first.avg_rating ?? first.rating ?? first);
  }
  if (typeof v === 'object') {
    return parseNumber(v.avg ?? v.count ?? v.value ?? v.avg_rating ?? v.rating ?? v.rating_count);
  }
  return 0;
};

const _safeString = (v) => {
  if (v === null || v === undefined) return '';
  if (typeof v !== 'string') return String(v);
  return v.trim();
};

const normalizeRow = (r = {}) => {
  const likes = parseNumber(r.likes_count);
  const views = parseNumber(r.views_count);
  const comments = parseNumber(r.comments_count);
  const avg_rating = parseNumber(r.avg_rating ?? r.avg ?? r.rating ?? r.average_rating);
  const rating_count = parseNumber(r.rating_count ?? r.ratings_count ?? r.rating_count_aggregate ?? r.count ?? r.rating_count_value);
  const safeTitle = _safeString(r.title) || 'Untitled';
  const safeAuthor = _safeString(r.author) || _safeString(r.creator_name) || _safeString(r.creator) || '';
  const safeImage = _safeString(r.image_url) || _safeString(r.cover) || _safeString(r.cover_url) || null;
  const rawTags = r.tags || [];
  const tags = Array.isArray(rawTags) ? rawTags.map(t => (typeof t === 'string' ? t.trim().toLowerCase() : String(t).toLowerCase())) : [];
  return {
    id: r.id,
    slug: r.slug ?? null,
    title: safeTitle,
    author: safeAuthor,
    description: r.description ?? null,
    summary: r.summary ?? null,
    category: r.category,
    tags,
    image_url: safeImage,
    affiliate_link: r.affiliate_link,
    likes_count: Number(likes || 0),
    views_count: Number(views || 0),
    comments_count: Number(comments || 0),
    avg_rating: Number(avg_rating || 0),
    rating_count: Number(rating_count || 0),
    created_at: r.created_at ?? null,
  };
};

const sleep = (ms) => new Promise((res) => setTimeout(res, ms));

const fetchRpcOrFallback = async (rpcName, { limit = ITEMS_PER_CAROUSEL, category = null } = {}) => {
  try {
    let q = supabase.from('book_summaries').select(SELECT_WITH_COUNTS);
    if (category) q = q.eq('category', category);
    q = q.limit(500);
    const { data, error } = await q;
    if (error) throw error;
    const rows = (data || []).map(normalizeRow);
    let sorted = rows.slice();
    if (rpcName.includes('new')) sorted.sort((a, b) => new Date(b.created_at) - new Date(a.created_at));
    else if (rpcName.includes('liked')) sorted.sort((a, b) => (b.likes_count || 0) - (a.likes_count || 0));
    else if (rpcName.includes('rated')) sorted.sort((a, b) => (b.avg_rating || 0) - (a.avg_rating || 0));
    else if (rpcName.includes('view')) sorted.sort((a, b) => (b.views_count || 0) - (a.views_count || 0));
    return sorted.slice(0, limit);
  } catch (err) {
    console.error('[fallback] fetch error', err);
    return [];
  }
};

const fetchTopCategories = async (limit = 50) => {
  try {
    const { data, error } = await supabase
      .from('book_summaries')
      .select('category')
      .not('category', 'is', null)
      .limit(2000);
    if (error) throw error;
    const counts = (data || []).reduce((acc, r) => {
      const key = (r.category || 'Uncategorized').trim();
      if (!key) return acc;
      acc[key] = (acc[key] || 0) + 1;
      return acc;
    }, {});
    return Object.keys(counts).sort((a, b) => counts[b] - counts[a]).slice(0, limit);
  } catch (err) {
    console.error('fetchTopCategories error', err);
    return [];
  }
};

const ContentFeed = ({
  selectedCategory = FOR_YOU_TAB,
  onEdit,
  onDelete,
  searchQuery = '',
  userRole = 'user',   // 'user' | 'team' | 'admin' — passed from parent
}) => {
  const location = useLocation();

  // Site origin used for constructing canonical review links in JSON-LD
  const SITE_ORIGIN = (typeof window !== 'undefined' && window.location && window.location.origin)
    ? window.location.origin.replace(/\/$/, '')
    : 'https://your-onjo-app.netlify.app';

  const [loadingGlobal, setLoadingGlobal] = useState(true);
  const [globalContent, setGlobalContent] = useState({
    newest: [],
    mostLiked: [],
    highestRated: [],
    mostViewed: [],
  });

  const [categoryQueue, setCategoryQueue] = useState([]);
  const [loadedCategoryBlocks, setLoadedCategoryBlocks] = useState([]);
  const [loadingCategories, setLoadingCategories] = useState(false);
  const [hasMoreCategories, setHasMoreCategories] = useState(false);

  const [availableTags, setAvailableTags] = useState([]);
  const [selectedTags, setSelectedTags] = useState([]);
  const [taggedResults, setTaggedResults] = useState(null);
  const [taggedLoading, setTaggedLoading] = useState(false);

  const [tagsReloadKey, setTagsReloadKey] = useState(0);

  const rootRef = useRef(null);
  const sentinelRef = useRef(null);
  const mountedRef = useRef(true);
  const fastCacheRef = useRef(new Map());

  /* ── derived flags ── */
  const isDraftTab   = selectedCategory === DRAFTS_TAB;
  const isForYou     = !isDraftTab && (selectedCategory === FOR_YOU_TAB || selectedCategory === 'All');
  const canSeeDrafts = userRole === 'admin' || userRole === 'team';

  useEffect(() => { mountedRef.current = true; return () => { mountedRef.current = false; }; }, []);

  // SPA scroll-to-top on route change
  useEffect(() => {
    try {
      window.scrollTo({ top: 0, behavior: 'auto' });
    } catch (_) {}
  }, [location.pathname]);

  useEffect(() => {
    const go = () => {
      try {
        const el = rootRef.current;
        if (el) {
          const header = document.querySelector('header');
          const headerH = header ? (header.offsetHeight || 0) : 0;
          const top = Math.max(0, el.getBoundingClientRect().top + window.pageYOffset - headerH - 8);
          window.scrollTo({ top, behavior: 'auto' });
        } else {
          window.scrollTo({ top: 0, behavior: 'auto' });
        }
      } catch (err) {
        try { window.scrollTo({ top: 0, behavior: 'auto' }); } catch (e) {}
      }
    };
    go();
    const t = setTimeout(go, 120);
    return () => clearTimeout(t);
  }, [selectedCategory, searchQuery]);

  useEffect(() => {
    if (isDraftTab) return;
    (async () => {
      try {
        let q = supabase
          .from('book_summaries')
          .select('tags')
          .limit(5000);
        if (!isForYou) q = q.eq('category', selectedCategory);
        const { data, error } = await q;
        if (error) throw error;
        const set = new Set();
        (data || []).forEach(row => {
          const arr = row?.tags || [];
          if (Array.isArray(arr)) arr.forEach(t => { if (t && typeof t === 'string') set.add(t.trim().toLowerCase()); });
        });
        const list = Array.from(set).sort();
        if (mountedRef.current) {
          setAvailableTags(list);
          setSelectedTags(prev => {
            if (!Array.isArray(prev) || prev.length === 0) return [];
            const avail = new Set(list);
            return prev.filter(t => avail.has(t.toLowerCase()));
          });
        }
      } catch (err) {
        console.warn('Could not load tags for chips bar', err);
      }
    })();
  }, [selectedCategory, tagsReloadKey, isDraftTab, isForYou]);

  const fastFetchList = useCallback(async (limit = ITEMS_PER_CAROUSEL, category = null) => {
    const cacheKey = category ? `cat:${category}` : `global`;
    const cache = fastCacheRef.current.get(cacheKey);
    if (cache) return cache;
    try {
      let q = supabase
        .from('book_summaries')
        .select(LIGHT_SELECT)
        .order('created_at', { ascending: false })
        .limit(limit);
      if (category) q = q.eq('category', category);
      const { data, error } = await q;
      if (error) throw error;
      const normalized = (data || []).map((r) => normalizeRow(r));
      fastCacheRef.current.set(cacheKey, normalized);
      return normalized;
    } catch (err) {
      console.warn('fastFetchList failed', err);
      return [];
    }
  }, []);

  const fetchContentBlock = useCallback(async (category = null) => {
    try {
      const start = Date.now();
      const [newest, mostLiked, highestRated, mostViewed] = await Promise.all([
        fetchRpcOrFallback('get_newest', { category }),
        fetchRpcOrFallback('get_top_liked', { category }),
        fetchRpcOrFallback('get_highest_rated', { category }),
        fetchRpcOrFallback('get_top_viewed', { category }),
      ]);
      const elapsed = Date.now() - start;
      if (elapsed < 50) await sleep(50);
      return {
        category,
        newest: newest || [],
        mostLiked: mostLiked || [],
        highestRated: highestRated || [],
        mostViewed: mostViewed || [],
      };
    } catch (err) {
      console.error('fetchContentBlock error for', category, err);
      return { category, newest: [], mostLiked: [], highestRated: [], mostViewed: [] };
    }
  }, []);

  const replaceCategoryBlock = useCallback((newBlock) => {
    setLoadedCategoryBlocks((prev) => {
      const idx = prev.findIndex((b) => String(b.category) === String(newBlock.category));
      if (idx === -1) return [...prev, newBlock];
      const copy = prev.slice();
      copy[idx] = newBlock;
      return copy;
    });
  }, []);

  const rankItemsWithBoost = useCallback((items = [], selectedTags = [], sortKey = 'newest') => {
    if (!items || items.length === 0) return [];
    if (!selectedTags || selectedTags.length === 0) {
      if (sortKey === 'newest') return items.slice().sort((a, b) => new Date(b.created_at) - new Date(a.created_at));
      if (sortKey === 'likes') return items.slice().sort((a, b) => (b.likes_count || 0) - (a.likes_count || 0));
      if (sortKey === 'rating') return items.slice().sort((a, b) => (b.avg_rating || 0) - (a.avg_rating || 0));
      if (sortKey === 'views') return items.slice().sort((a, b) => (b.views_count || 0) - (a.views_count || 0));
      return items.slice();
    }
    const tagSet = new Set(selectedTags.map(t => t.toLowerCase()));
    const scored = items.map(it => {
      const itemTags = Array.isArray(it.tags) ? it.tags.map(t => (t || '').toLowerCase()) : [];
      const matchCount = itemTags.reduce((acc, t) => acc + (tagSet.has(t) ? 1 : 0), 0);
      return { it, matchCount };
    });
    return scored.sort((a, b) => {
      if (b.matchCount !== a.matchCount) return b.matchCount - a.matchCount;
      if (sortKey === 'newest') return new Date(b.it.created_at) - new Date(a.it.created_at);
      if (sortKey === 'likes') return (b.it.likes_count || 0) - (a.it.likes_count || 0);
      if (sortKey === 'rating') return (b.it.avg_rating || 0) - (a.it.avg_rating || 0);
      if (sortKey === 'views') return (b.it.views_count || 0) - (a.it.views_count || 0);
      return 0;
    }).map(s => s.it);
  }, []);

  const loadNextCategoryBatch = useCallback(async () => {
    if (loadingCategories) return;
    if (!categoryQueue || categoryQueue.length === 0) { setHasMoreCategories(false); return; }
    setLoadingCategories(true);
    const batch = categoryQueue.slice(0, CATEGORY_BATCH);
    const rest = categoryQueue.slice(batch.length);
    setCategoryQueue(rest);
    try {
      const placeholderPromises = batch.map((c) => fastFetchList(4, c).then((items) => ({
        category: c, newest: items, mostLiked: items, highestRated: items, mostViewed: items,
      })));
      const placeholders = await Promise.all(placeholderPromises);
      if (!mountedRef.current) return;
      setLoadedCategoryBlocks((prev) => [...prev, ...placeholders]);
      (async () => {
        try {
          const blocks = await Promise.all(batch.map((c) => fetchContentBlock(c)));
          if (!mountedRef.current) return;
          blocks.filter(b => (b.newest.length || b.mostLiked.length || b.highestRated.length || b.mostViewed.length))
            .forEach((blk) => replaceCategoryBlock(blk));
        } catch (err) { console.error('background load batch error', err); }
      })();
      setHasMoreCategories(rest.length > 0);
    } catch (err) {
      console.error('loadNextCategoryBatch err', err);
    } finally {
      if (mountedRef.current) setLoadingCategories(false);
    }
  }, [categoryQueue, loadingCategories, fetchContentBlock, fastFetchList, replaceCategoryBlock]);

  useEffect(() => {
    // Draft tab: DraftPanel handles its own data fetching
    if (isDraftTab) { setLoadingGlobal(false); return; }

    (async () => {
      setLoadingGlobal(true);
      setLoadedCategoryBlocks([]);
      setCategoryQueue([]);
      setHasMoreCategories(false);
      setGlobalContent({ newest: [], mostLiked: [], highestRated: [], mostViewed: [] });

      if (searchQuery && searchQuery.trim()) {
        const start = Date.now();
        try {
          const fast = await fastFetchList(ITEMS_PER_CAROUSEL);
          if (mountedRef.current) {
            setGlobalContent({ newest: fast, mostLiked: fast, highestRated: fast, mostViewed: fast });
          }
          const { data, error } = await supabase.rpc('book_summaries_search_prefix', { q: searchQuery, lim: 500 });
          if (error) throw error;
          const rows = safeData(data).map(normalizeRow);
          if (mountedRef.current) setGlobalContent({ newest: rows, mostLiked: [], highestRated: [], mostViewed: [] });
          setTagsReloadKey(k => k + 1);
        } catch (err) {
          console.error('search error', err);
        } finally {
          const elapsed = Date.now() - start;
          if (elapsed < MIN_LOAD_MS) await sleep(MIN_LOAD_MS - elapsed);
          if (mountedRef.current) setLoadingGlobal(false);
        }
        return;
      }

      if (!isForYou) {
        const start = Date.now();
        try {
          const placeholder = await fastFetchList(ITEMS_PER_CAROUSEL, selectedCategory);
          if (mountedRef.current) {
            setLoadedCategoryBlocks([{ category: selectedCategory, newest: placeholder, mostLiked: placeholder, highestRated: placeholder, mostViewed: placeholder }]);
          }
          (async () => {
            try {
              const block = await fetchContentBlock(selectedCategory);
              if (!mountedRef.current) return;
              setLoadedCategoryBlocks((block.newest.length || block.mostLiked.length || block.highestRated.length || block.mostViewed.length) ? [block] : []);
              setTagsReloadKey(k => k + 1);
            } catch (err) { console.error('specific category background fetch error', err); }
          })();
        } catch (err) {
          console.error('specific category fetch error', err);
        } finally {
          const elapsed = Date.now() - start;
          if (elapsed < MIN_LOAD_MS) await sleep(MIN_LOAD_MS - elapsed);
          if (mountedRef.current) setLoadingGlobal(false);
        }
        return;
      }

      const start = Date.now();
      try {
        const fast = await fastFetchList(ITEMS_PER_CAROUSEL);
        if (!mountedRef.current) return;
        setGlobalContent({ newest: fast, mostLiked: fast, highestRated: fast, mostViewed: fast });
        (async () => {
          try {
            const [globalBlock, cats] = await Promise.all([fetchContentBlock(), fetchTopCategories(200)]);
            if (!mountedRef.current) return;
            setGlobalContent(globalBlock);
            setTagsReloadKey(k => k + 1);
            setCategoryQueue(cats);
            setHasMoreCategories(cats.length > 0);
            const initialBatch = cats.slice(0, CATEGORY_BATCH);
            const rest = cats.slice(initialBatch.length);
            if (initialBatch.length) {
              const placeholderPromises = initialBatch.map((c) => fastFetchList(4, c).then((items) => ({
                category: c, newest: items, mostLiked: items, highestRated: items, mostViewed: items,
              })));
              const placeholders = await Promise.all(placeholderPromises);
              if (!mountedRef.current) return;
              setLoadedCategoryBlocks(placeholders);
              setCategoryQueue(rest);
              setHasMoreCategories(rest.length > 0);
              (async () => {
                try {
                  const blocks = await Promise.all(initialBatch.map((c) => fetchContentBlock(c)));
                  if (!mountedRef.current) return;
                  blocks.filter(b => (b.newest.length || b.mostLiked.length || b.highestRated.length || b.mostViewed.length))
                    .forEach((blk) => replaceCategoryBlock(blk));
                } catch (err) { console.error('background initial category fetch failed', err); }
              })();
            }
          } catch (err) { console.error('background load failed', err); }
        })();
      } catch (err) {
        console.error('Initial global fast load failed:', err);
      } finally {
        const elapsed = Date.now() - start;
        if (elapsed < MIN_LOAD_MS) await sleep(MIN_LOAD_MS - elapsed);
        if (mountedRef.current) setLoadingGlobal(false);
      }
    })();
  }, [selectedCategory, searchQuery, isDraftTab, isForYou, fastFetchList, fetchContentBlock, replaceCategoryBlock]);

  useEffect(() => {
    if (!sentinelRef.current) return;
    const node = sentinelRef.current;
    const obs = new IntersectionObserver((entries) => {
      entries.forEach((entry) => {
        if (entry.isIntersecting && hasMoreCategories && !loadingCategories) loadNextCategoryBatch();
      });
    }, { root: null, rootMargin: '600px', threshold: 0.1 });
    obs.observe(node);
    return () => obs.disconnect();
  }, [hasMoreCategories, loadingCategories, loadNextCategoryBatch]);

  const fetchTaggedContent = useCallback(async (tag, category = null, limit = ITEMS_PER_CAROUSEL) => {
    if (!tag) return [];
    try {
      let q = supabase
        .from('book_summaries')
        .select(SELECT_WITH_COUNTS)
        .contains('tags', [tag])
        .order('created_at', { ascending: false })
        .limit(limit);
      if (category) q = q.eq('category', category);
      const { data, error } = await q;
      if (error) throw error;
      return (data || []).map(normalizeRow);
    } catch (err) {
      console.error('fetchTaggedContent error', err);
      return [];
    }
  }, []);

  const buildViewAllLink = (sortKey = 'newest', category = null, tag = null) => {
    const params = new URLSearchParams();
    if (sortKey) params.set('sort', sortKey);
    if (category) params.set('category', category);
    if (tag) { params.set('tag', tag); params.set('tag_only', '1'); }
    return `/explore?${params.toString()}`;
  };

  const buildSeeMoreText = ({ sortKey = 'newest', category = null, tag = null } = {}) => {
    const sortMap = {
      newest: 'Newest Reviews', likes: 'Most Liked Reviews',
      rating: 'Highest Rated Reviews', views: 'Most Viewed Reviews',
    };
    const base = sortMap[sortKey] || 'more reviews';
    if (tag) return `Explore more ${base} related to "${tag}"`;
    if (category) return `Explore more ${base} in ${category}`;
    return `Explore more ${base}`;
  };

  const SeeMoreCTA = ({ href, text, ariaLabel }) => {
    if (!href) return null;
    return (
      <div className="see-more-wrapper" aria-hidden={false}>
        <a href={href} className="see-more-btn" role="button" rel="noopener noreferrer" aria-label={ariaLabel || text}>
          {text}
        </a>
      </div>
    );
  };

  useEffect(() => {
    let mounted = true;
    (async () => {
      if (!selectedTags || selectedTags.length === 0) { setTaggedResults(null); setTaggedLoading(false); return; }
      const tag = selectedTags[0];
      setTaggedLoading(true);
      try {
        const rows = await fetchTaggedContent(tag, !isForYou ? selectedCategory : null, ITEMS_PER_CAROUSEL);
        if (!mountedRef.current || !mounted) return;
        setTaggedResults(rows || []);
      } catch (err) {
        if (mountedRef.current && mounted) setTaggedResults([]);
      } finally {
        if (mountedRef.current && mounted) setTaggedLoading(false);
      }
    })();
    return () => { mounted = false; };
  }, [selectedTags, selectedCategory, fetchTaggedContent, isForYou]);

  const toggleTag = (tag) => {
    const lower = tag.toLowerCase();
    setSelectedTags(prev => {
      const cur = Array.isArray(prev) ? prev : [];
      if (cur.length > 0 && cur[0] === lower) return [];
      return [lower];
    });
  };

  const clearTags = () => setSelectedTags([]);

  const renderCards = (items, sortKey) => {
    const ranked = rankItemsWithBoost(items || [], selectedTags, sortKey);
    return (ranked || []).map((summary) => (
      <BookSummaryCard key={String(summary.id ?? summary.slug)} summary={summary} onEdit={onEdit} onDelete={onDelete} />
    ));
  };

  /* ── SEO JSON-LD ── */
  const generateJsonLd = useCallback(() => {
    try {
      const lists = [];
      const makeItemListElement = (items = [], name = 'Reviews') => {
        const max = Math.min(items.length, 10);
        const itemListElement = [];
        for (let i = 0; i < max; i++) {
          const it = items[i];
          if (!it) continue;
          const slugOrId = it.slug ? it.slug : String(it.id);
          itemListElement.push({
            "@type": "ListItem", position: i + 1,
            url: `${SITE_ORIGIN}/review/${encodeURIComponent(slugOrId)}`,
            name: it.title || `Review ${slugOrId}`,
            image: it.image_url || undefined,
            description: it.description || undefined,
          });
        }
        if (!itemListElement.length) return null;
        return { "@type": "ItemList", name, itemListElement };
      };
      if (globalContent?.newest?.length) { const el = makeItemListElement(globalContent.newest, 'Newest Reviews'); if (el) lists.push(el); }
      if (globalContent?.mostLiked?.length) { const el = makeItemListElement(globalContent.mostLiked, 'Most Liked Reviews'); if (el) lists.push(el); }
      if (globalContent?.highestRated?.length) { const el = makeItemListElement(globalContent.highestRated, 'Highest Rated Reviews'); if (el) lists.push(el); }
      if (globalContent?.mostViewed?.length) { const el = makeItemListElement(globalContent.mostViewed, 'Most Viewed Reviews'); if (el) lists.push(el); }
      (loadedCategoryBlocks || []).forEach((blk) => {
        if (!blk) return;
        const el = makeItemListElement(blk.newest, `Newest in ${blk.category || 'Category'}`);
        if (el) lists.push(el);
      });
      if (!lists.length) return null;
      return JSON.stringify({
        "@context": "https://schema.org", "@type": "WebPage",
        "url": SITE_ORIGIN + (typeof window !== 'undefined' ? window.location.pathname : '/'),
        "name": "ONJO Reviews — Product Reviews & Recommendations",
        "description": "ONJO Reviews is a product review and recommendation platform that evaluates tools through real-world use, clear pros and cons, and side-by-side comparisons.",
        "mainEntity": lists,
      });
    } catch (err) { console.warn('generateJsonLd error', err); return null; }
  }, [SITE_ORIGIN, globalContent, loadedCategoryBlocks]);

  useEffect(() => {
    const jsonld = generateJsonLd();
    const id = 'onjo-jsonld-contentfeed';
    if (!jsonld) { const existing = document.getElementById(id); if (existing) existing.remove(); return; }
    let script = document.getElementById(id);
    if (!script) {
      script = document.createElement('script');
      script.type = 'application/ld+json';
      script.id = id;
      document.head.appendChild(script);
    }
    script.text = jsonld;
  }, [generateJsonLd]);

  /* ─────────────────────────────────────────────────────
     DRAFT TAB — render DraftPanel, skip everything else
  ───────────────────────────────────────────────────── */
  if (isDraftTab && canSeeDrafts) {
    return (
      <div className="content-feed-root" ref={rootRef}>
        <DraftPanel onEdit={onEdit} />
      </div>
    );
  }

  if (isDraftTab && !canSeeDrafts) {
    return (
      <div className="content-feed-root" ref={rootRef}>
        <p style={{ padding: '2rem', textAlign: 'center', color: '#6b7280' }}>
          You don't have permission to view drafts.
        </p>
      </div>
    );
  }

  /* ─────────────────────────────────────────────────────
     NORMAL FEED
  ───────────────────────────────────────────────────── */
  return (
    <div className="content-feed-root" ref={rootRef}>
      <h1 style={{ position: 'absolute', width: '1px', height: '1px', padding: 0, margin: '-1px', overflow: 'hidden', clip: 'rect(0,0,0,0)', border: 0 }}>
        ONJO Reviews — Product evaluation and recommendation platform
      </h1>

      <section className="intro-banner" role="region" aria-label="ONJO Reviews mission" aria-live="polite">
        <div className="intro-banner-inner">
          <div className="intro-banner-icon" aria-hidden="true">
            <svg width="36" height="36" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" focusable="false" role="img" aria-hidden="true">
              <path d="M3 6c0 6 4 10 9 12 5-2 9-6 9-12-4 0-7 3-9 3S7 6 3 6z" fill="white" opacity="0.15" />
              <path d="M12 2c-.9 1.3-3.6 3.1-8 3v2c4.2 0 7 2 8 3 1-1 3.8-3 8-3V5c-4.4 0-7.1-1.7-8-3z" fill="white" opacity="0.08" />
            </svg>
          </div>
          <div className="intro-banner-text">
            <div className="intro-banner-title">ONJO Reviews</div>
            <div className="intro-banner-subtitle">We review, compare, and break down products to help people make better buying decisions.</div>
          </div>
          <div className="intro-banner-cta">
            <a className="btn-mini" href="/about" title="Learn more about ONJO Reviews mission" aria-label="Learn more about ONJO Reviews mission">Learn more</a>
          </div>
        </div>
      </section>

      <div className="categories-bar" style={{ alignItems: 'center', justifyContent: 'space-between' }}>
        <div style={{ display: 'flex', gap: 8, overflowX: 'auto' }}>
          {availableTags.length === 0 ? (
            <div className="hf-loading" role="status" aria-live="polite">
              {!isForYou ? 'No tags for this category.' : 'Loading tags…'}
            </div>
          ) : (
            availableTags.map((tag) => {
              const active = selectedTags.includes(tag.toLowerCase());
              return (
                <button key={tag} className={`category-chip ${active ? 'active' : ''}`}
                  onClick={() => toggleTag(tag)} aria-pressed={active} type="button"
                  title={`Filter reviews by ${tag}`}>{tag}</button>
              );
            })
          )}
        </div>
        <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
          {selectedTags.length > 0 && (
            <button className="hf-btn" type="button" onClick={clearTags} aria-label={`Clear selected tags (${selectedTags.length})`}>
              Clear tags ({selectedTags.length})
            </button>
          )}
        </div>
      </div>

      {selectedTags.length > 0 && (
        <section className="feed-section" aria-labelledby="tag-results-heading">
          <HorizontalCarousel title={`Tag: ${selectedTags[0]} — Reviews`} items={taggedResults || []} loading={taggedLoading} skeletonCount={6}>
            {renderCards(taggedResults || [], 'newest')}
          </HorizontalCarousel>
          <SeeMoreCTA
            href={buildViewAllLink('newest', !isForYou ? selectedCategory : null, selectedTags[0])}
            text={buildSeeMoreText({ sortKey: 'newest', category: !isForYou ? selectedCategory : null, tag: selectedTags[0] })}
          />
        </section>
      )}

      {searchQuery && searchQuery.trim() && (
        <section className="feed-section" aria-labelledby="search-results-heading">
          <HorizontalCarousel title={`Search results for "${searchQuery}" — Reviews`} items={globalContent.newest} loading={loadingGlobal} skeletonCount={6}>
            {renderCards(globalContent.newest, 'newest')}
          </HorizontalCarousel>
          <SeeMoreCTA href={`/explore?q=${encodeURIComponent(searchQuery)}`} text={`Explore more results for "${searchQuery}"`} />
        </section>
      )}

      {(!isForYou && !searchQuery) && loadedCategoryBlocks.length > 0 && (
        <div key={loadedCategoryBlocks[0].category}>
          {['newest', 'mostLiked', 'highestRated', 'mostViewed'].map((k) => {
            const titleMap = {
              newest: `Newest in ${loadedCategoryBlocks[0].category} — Reviews`,
              mostLiked: `Most Liked in ${loadedCategoryBlocks[0].category} — Reviews`,
              highestRated: `Highest Rated in ${loadedCategoryBlocks[0].category} — Reviews`,
              mostViewed: `Most Viewed in ${loadedCategoryBlocks[0].category} — Reviews`,
            };
            const items = loadedCategoryBlocks[0][k];
            const sortKey = k === 'newest' ? 'newest' : (k === 'mostLiked' ? 'likes' : (k === 'highestRated' ? 'rating' : 'views'));
            return (
              <section className="feed-section" key={k}>
                <HorizontalCarousel title={titleMap[k]} items={items} loading={loadingGlobal} skeletonCount={6}>
                  {renderCards(items, sortKey)}
                </HorizontalCarousel>
                <SeeMoreCTA
                  href={buildViewAllLink(sortKey, loadedCategoryBlocks[0].category)}
                  text={buildSeeMoreText({ sortKey, category: loadedCategoryBlocks[0].category })}
                />
              </section>
            );
          })}
        </div>
      )}

      {isForYou && !searchQuery && (
        <>
          {[
            { key: 'newest',       title: 'Newest Reviews',        sortKey: 'newest' },
            { key: 'mostLiked',    title: 'Most Liked Reviews',     sortKey: 'likes'  },
            { key: 'highestRated', title: 'Highest Rated Reviews',  sortKey: 'rating' },
            { key: 'mostViewed',   title: 'Most Viewed Reviews',    sortKey: 'views'  },
          ].map(({ key, title, sortKey }) => (
            <section className="feed-section" key={key}>
              <HorizontalCarousel title={title} items={globalContent[key]} loading={loadingGlobal} skeletonCount={6}>
                {renderCards(globalContent[key], sortKey)}
              </HorizontalCarousel>
              <SeeMoreCTA href={buildViewAllLink(sortKey, null)} text={buildSeeMoreText({ sortKey })} />
            </section>
          ))}

          {loadedCategoryBlocks.map((block) => (
            <section className="category-block" key={block.category}>
              <div className="category-block-header">
                <h3 className="cat-title">{block.category}</h3>
              </div>
              {[
                { key: 'newest',       title: 'Newest',        sortKey: 'newest' },
                { key: 'mostLiked',    title: 'Most Liked',    sortKey: 'likes'  },
                { key: 'highestRated', title: 'Highest Rated', sortKey: 'rating' },
                { key: 'mostViewed',   title: 'Most Viewed',   sortKey: 'views'  },
              ].map(({ key, title, sortKey }) => (
                <section className="feed-section" key={`${block.category}-${key}`}>
                  <HorizontalCarousel title={`${title} in ${block.category} — Reviews`} items={block[key]} loading={loadingGlobal} skeletonCount={4}>
                    {renderCards(block[key], sortKey)}
                  </HorizontalCarousel>
                  <SeeMoreCTA
                    href={buildViewAllLink(sortKey, block.category)}
                    text={buildSeeMoreText({ sortKey, category: block.category })}
                  />
                </section>
              ))}
            </section>
          ))}

          <div ref={sentinelRef} style={{ height: 1, width: '100%' }} aria-hidden="true" />
          {loadingCategories && <div className="categories-loading" role="status" aria-live="polite">Loading more categories...</div>}
          {!hasMoreCategories && !loadingCategories && loadedCategoryBlocks.length > 0 && (
            <div className="categories-end" role="status" aria-live="polite">You've reached the end of the line.</div>
          )}
        </>
      )}
    </div>
  );
};

export default ContentFeed;