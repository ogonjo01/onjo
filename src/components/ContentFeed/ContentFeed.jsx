// src/components/ContentFeed/ContentFeed.jsx
import React, { useState, useEffect, useCallback, useRef } from 'react';
import { supabase } from '../../supabase/supabaseClient';
import BookSummaryCard from '../BookSummaryCard/BookSummaryCard';
import HorizontalCarousel from '../HorizontalCarousel/HorizontalCarousel';
import './ContentFeed.css';

const ITEMS_PER_CAROUSEL = 12;
const CATEGORY_BATCH = 3;
const MIN_LOAD_MS = 350; // minimum skeleton display to avoid flashes

// Added `slug` to the selects so UI receives the slug for SEO-friendly links
const LIGHT_SELECT = `
  id,
  created_at,
  title,
  author,
  summary,
  category,
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
  summary,
  category,
  user_id,
  image_url,
  affiliate_link,
  likes_count:likes!likes_post_id_fkey(count),
  views_count:views!views_post_id_fkey(count),
  comments_count:comments!comments_post_id_fkey(count),
  slug
`;

// helpers
const safeData = (d) => (d?.data ?? d ?? []);

// robust parser for numbers/aggregates
const parseNumber = (v) => {
  if (v == null) return 0;
  if (typeof v === 'number') return v;
  if (typeof v === 'string') {
    const n = Number(v);
    return Number.isFinite(n) ? n : 0;
  }
  if (Array.isArray(v) && v.length) {
    // e.g. [{ avg: '4.2' }] or [{ count: '3' }]
    const first = v[0];
    return parseNumber(first.avg ?? first.count ?? first.value ?? first.avg_rating ?? first.rating ?? first);
  }
  if (typeof v === 'object') {
    // e.g. { avg: '4.2' } or { count: '3' }
    return parseNumber(v.avg ?? v.count ?? v.value ?? v.avg_rating ?? v.rating ?? v.rating_count);
  }
  return 0;
};

const normalizeRow = (r = {}) => {
  const likes = parseNumber(r.likes_count);
  const views = parseNumber(r.views_count);
  const comments = parseNumber(r.comments_count);

  // avg_rating may come as avg_rating, avg, rating or as aggregates
  const avg_rating = parseNumber(r.avg_rating ?? r.avg ?? r.rating ?? r.average_rating);
  // rating_count may come as rating_count, ratings_count, count, or aggregate
  const rating_count = parseNumber(r.rating_count ?? r.ratings_count ?? r.rating_count_aggregate ?? r.count ?? r.rating_count_value);

  return {
    id: r.id,
    slug: r.slug ?? null, // <- include slug so cards can prefer it
    title: r.title,
    author: r.author,
    summary: r.summary,
    category: r.category,
    image_url: r.image_url,
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

/* heavy RPC/fallback (mostly unchanged) */
const fetchRpcOrFallback = async (rpcName, { limit = ITEMS_PER_CAROUSEL, category = null } = {}) => {
  try {
    const args = { p_limit: limit };
    if (category) args.p_category = category;
    const rpcRes = await supabase.rpc(rpcName, args);
    if (!rpcRes.error && rpcRes.data) {
      return safeData(rpcRes.data).map(normalizeRow);
    }
    if (rpcRes.error) {
      // continue to fallback
      console.warn(`[rpc] ${rpcName} error:`, rpcRes.error);
    }
  } catch (e) {
    // fallback below
    console.warn(`[rpc] ${rpcName} threw`, e?.message || e);
  }

  // fallback client-side (heavier)
  try {
    let q = supabase.from('book_summaries').select(SELECT_WITH_COUNTS);
    if (category) q = q.eq('category', category);
    q = q.limit(500);
    const { data, error } = await q;
    if (error) throw error;

    // normalize early
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

const ContentFeed = ({ selectedCategory = 'For You', onEdit, onDelete, searchQuery = '' }) => {
  const [loadingGlobal, setLoadingGlobal] = useState(true);

  // globalContent will first contain fast placeholders, then replaced by heavy results
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

  const sentinelRef = useRef(null);
  const mountedRef = useRef(true);

  // cache for fast placeholders per-category to avoid refetching
  const fastCacheRef = useRef(new Map());

  useEffect(() => { mountedRef.current = true; return () => { mountedRef.current = false; }; }, []);

  // FAST lightweight fetch for immediate UI (by category or global)
  const fastFetchList = useCallback(async (limit = 6, category = null) => {
    // check cache
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

  // heavy fetch (keeps original behavior)
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

  // helper to replace a block in loadedCategoryBlocks by category (used after background heavy fetch)
  const replaceCategoryBlock = useCallback((newBlock) => {
    setLoadedCategoryBlocks((prev) => {
      const idx = prev.findIndex((b) => String(b.category) === String(newBlock.category));
      if (idx === -1) {
        return [...prev, newBlock];
      }
      const copy = prev.slice();
      copy[idx] = newBlock;
      return copy;
    });
  }, []);

  // loadNextCategoryBatch now: quickly add placeholders then background-replace with heavy results
  const loadNextCategoryBatch = useCallback(async () => {
    if (loadingCategories) return;
    if (!categoryQueue || categoryQueue.length === 0) {
      setHasMoreCategories(false);
      return;
    }
    setLoadingCategories(true);
    const batch = categoryQueue.slice(0, CATEGORY_BATCH);
    const rest = categoryQueue.slice(batch.length);
    // optimistic queue update
    setCategoryQueue(rest);

    try {
      // 1) fast placeholders for batch (immediate)
      const placeholderPromises = batch.map((c) => fastFetchList(4, c).then((items) => ({
        category: c,
        newest: items,
        mostLiked: items,
        highestRated: items,
        mostViewed: items,
      })));
      const placeholders = await Promise.all(placeholderPromises);
      if (!mountedRef.current) return;
      // append placeholders quickly
      setLoadedCategoryBlocks((prev) => [...prev, ...placeholders]);

      // 2) start background heavy fetch to replace placeholders
      (async () => {
        try {
          const blocks = await Promise.all(batch.map((c) => fetchContentBlock(c)));
          if (!mountedRef.current) return;
          const nonEmpty = blocks.filter(b => (b.newest.length || b.mostLiked.length || b.highestRated.length || b.mostViewed.length));
          nonEmpty.forEach((blk) => replaceCategoryBlock(blk));
        } catch (err) {
          console.error('background load batch error', err);
        }
      })();

      setHasMoreCategories(rest.length > 0);
    } catch (err) {
      console.error('loadNextCategoryBatch err', err);
    } finally {
      if (mountedRef.current) setLoadingCategories(false);
    }
  }, [categoryQueue, loadingCategories, fetchContentBlock, fastFetchList, replaceCategoryBlock]);

  // MAIN orchestration: similar to your previous flow but initial category loads use placeholders + background replacement
  useEffect(() => {
    (async () => {
      setLoadingGlobal(true);
      setLoadedCategoryBlocks([]);
      setCategoryQueue([]);
      setHasMoreCategories(false);
      setGlobalContent({ newest: [], mostLiked: [], highestRated: [], mostViewed: [] });

      // SEARCH mode
      if (searchQuery && searchQuery.trim()) {
        const start = Date.now();
        try {
          const fast = await fastFetchList(6);
          if (mountedRef.current) {
            setGlobalContent({ newest: fast, mostLiked: fast, highestRated: fast, mostViewed: fast });
          }
          const { data, error } = await supabase.rpc('book_summaries_search_prefix', { q: searchQuery, lim: 500 });
          if (error) throw error;
          const rows = safeData(data).map(normalizeRow);
          if (mountedRef.current) setGlobalContent({ newest: rows, mostLiked: [], highestRated: [], mostViewed: [] });
        } catch (err) {
          console.error('search error', err);
        } finally {
          const elapsed = Date.now() - start;
          if (elapsed < MIN_LOAD_MS) await sleep(MIN_LOAD_MS - elapsed);
          if (mountedRef.current) setLoadingGlobal(false);
        }
        return;
      }

      // SPECIFIC CATEGORY PAGE
      const specific = selectedCategory && selectedCategory !== 'For You' && selectedCategory !== 'All';
      if (specific) {
        const start = Date.now();
        try {
          const placeholder = await fastFetchList(6, selectedCategory);
          if (mountedRef.current) {
            setLoadedCategoryBlocks([{ category: selectedCategory, newest: placeholder, mostLiked: placeholder, highestRated: placeholder, mostViewed: placeholder }]);
          }
          // background heavy fetch & replace
          (async () => {
            try {
              const block = await fetchContentBlock(selectedCategory);
              if (!mountedRef.current) return;
              setLoadedCategoryBlocks((block.newest.length || block.mostLiked.length || block.highestRated.length || block.mostViewed.length) ? [block] : []);
            } catch (err) {
              console.error('specific category background fetch error', err);
            }
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

      // DEFAULT For You flow
      const start = Date.now();
      try {
        // 1) FAST placeholder global content (single cheap request) -> immediate paint
        const fast = await fastFetchList(6);
        if (!mountedRef.current) return;
        setGlobalContent({ newest: fast, mostLiked: fast, highestRated: fast, mostViewed: fast });

        // 2) background: load heavy global block + categories + initial category placeholders -> then replace with heavy blocks
        (async () => {
          try {
            const [globalBlock, cats] = await Promise.all([fetchContentBlock(), fetchTopCategories(200)]);
            if (!mountedRef.current) return;
            setGlobalContent(globalBlock);
            setCategoryQueue(cats);
            setHasMoreCategories(cats.length > 0);

            // initial category placeholders (fast)
            const initialBatch = cats.slice(0, CATEGORY_BATCH);
            const rest = cats.slice(initialBatch.length);
            if (initialBatch.length) {
              const placeholderPromises = initialBatch.map((c) => fastFetchList(4, c).then((items) => ({
                category: c,
                newest: items,
                mostLiked: items,
                highestRated: items,
                mostViewed: items,
              })));
              const placeholders = await Promise.all(placeholderPromises);
              if (!mountedRef.current) return;
              setLoadedCategoryBlocks(placeholders);
              setCategoryQueue(rest);
              setHasMoreCategories(rest.length > 0);

              // background: fetch full blocks & replace placeholders
              (async () => {
                try {
                  const blocks = await Promise.all(initialBatch.map((c) => fetchContentBlock(c)));
                  if (!mountedRef.current) return;
                  const nonEmpty = blocks.filter(b => (b.newest.length || b.mostLiked.length || b.highestRated.length || b.mostViewed.length));
                  nonEmpty.forEach((blk) => replaceCategoryBlock(blk));
                } catch (err) {
                  console.error('background initial category fetch failed', err);
                }
              })();
            }
          } catch (err) {
            console.error('background load failed', err);
          }
        })();
      } catch (err) {
        console.error('Initial global fast load failed:', err);
      } finally {
        const elapsed = Date.now() - start;
        if (elapsed < MIN_LOAD_MS) await sleep(MIN_LOAD_MS - elapsed);
        if (mountedRef.current) setLoadingGlobal(false);
      }
    })();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedCategory, searchQuery, fastFetchList, fetchContentBlock, replaceCategoryBlock]);

  // sentinel observer for loading additional categories
  useEffect(() => {
    if (!sentinelRef.current) return;
    const node = sentinelRef.current;
    const obs = new IntersectionObserver((entries) => {
      entries.forEach((entry) => {
        if (entry.isIntersecting && hasMoreCategories && !loadingCategories) {
          loadNextCategoryBatch();
        }
      });
    }, { root: null, rootMargin: '600px', threshold: 0.1 });
    obs.observe(node);
    return () => obs.disconnect();
  }, [hasMoreCategories, loadingCategories, loadNextCategoryBatch]);

  const renderCards = (items) => (items || []).map((summary) => (
    // use slug || id as key so when slugs are backfilled React keys are stable
    <BookSummaryCard key={String(summary.slug || summary.id)} summary={summary} onEdit={onEdit} onDelete={onDelete} />
  ));

  const isForYou = selectedCategory === 'For You' || selectedCategory === 'All';

  return (
    <div className="content-feed-root">
      {/* SEARCH */}
      {searchQuery && searchQuery.trim() && (
        <HorizontalCarousel
          title={`Search results for "${searchQuery}"`}
          items={globalContent.newest}
          loading={loadingGlobal}
          skeletonCount={6}
          viewAllLink={`/explore?q=${encodeURIComponent(searchQuery)}`}
        >
          {renderCards(globalContent.newest)}
        </HorizontalCarousel>
      )}

      {/* SPECIFIC CATEGORY PAGE */}
      {(!isForYou && !searchQuery) && loadedCategoryBlocks.length > 0 && (
        <div key={loadedCategoryBlocks[0].category}>
          {['newest', 'mostLiked', 'highestRated', 'mostViewed'].map((k) => {
            const titleMap = {
              newest: `Newest in ${loadedCategoryBlocks[0].category}`,
              mostLiked: `Most Liked in ${loadedCategoryBlocks[0].category}`,
              highestRated: `Most Rated in ${loadedCategoryBlocks[0].category}`,
              mostViewed: `Most Viewed in ${loadedCategoryBlocks[0].category}`,
            };
            const items = loadedCategoryBlocks[0][k];
            const sortKey = k === 'newest' ? 'newest' : (k === 'mostLiked' ? 'likes' : (k === 'highestRated' ? 'rating' : 'views'));
            return (
              <HorizontalCarousel
                key={k}
                title={titleMap[k]}
                items={items}
                loading={loadingGlobal}
                skeletonCount={6}
                viewAllLink={`/explore?sort=${sortKey}&category=${encodeURIComponent(loadedCategoryBlocks[0].category)}`}
              >
                {renderCards(items)}
              </HorizontalCarousel>
            );
          })}
        </div>
      )}

      {/* FOR YOU / ALL */}
      {isForYou && !searchQuery && (
        <>
          <HorizontalCarousel
            title="Newest"
            items={globalContent.newest}
            loading={loadingGlobal}
            skeletonCount={6}
            viewAllLink="/explore?sort=newest"
          >
            {renderCards(globalContent.newest)}
          </HorizontalCarousel>
          <HorizontalCarousel
            title="Most Liked"
            items={globalContent.mostLiked}
            loading={loadingGlobal}
            skeletonCount={6}
            viewAllLink="/explore?sort=likes"
          >
            {renderCards(globalContent.mostLiked)}
          </HorizontalCarousel>
          <HorizontalCarousel
            title="Most Rated"
            items={globalContent.highestRated}
            loading={loadingGlobal}
            skeletonCount={6}
            viewAllLink="/explore?sort=rating"
          >
            {renderCards(globalContent.highestRated)}
          </HorizontalCarousel>
          <HorizontalCarousel
            title="Most Viewed"
            items={globalContent.mostViewed}
            loading={loadingGlobal}
            skeletonCount={6}
            viewAllLink="/explore?sort=views"
          >
            {renderCards(globalContent.mostViewed)}
          </HorizontalCarousel>

          {loadedCategoryBlocks.map((block) => (
            <section className="category-block" key={block.category}>
              <div className="category-block-header">
                <h3 className="cat-title">{block.category}</h3>
                <a className="cat-viewall" href={`/explore?category=${encodeURIComponent(block.category)}`}>View all</a>
              </div>

              <HorizontalCarousel
                title={`Newest in ${block.category}`}
                items={block.newest}
                loading={loadingGlobal}
                skeletonCount={4}
                viewAllLink={`/explore?sort=newest&category=${encodeURIComponent(block.category)}`}
              >
                {renderCards(block.newest)}
              </HorizontalCarousel>
              <HorizontalCarousel
                title={`Most Liked in ${block.category}`}
                items={block.mostLiked}
                loading={loadingGlobal}
                skeletonCount={4}
                viewAllLink={`/explore?sort=likes&category=${encodeURIComponent(block.category)}`}
              >
                {renderCards(block.mostLiked)}
              </HorizontalCarousel>
              <HorizontalCarousel
                title={`Highest Rated in ${block.category}`}
                items={block.highestRated}
                loading={loadingGlobal}
                skeletonCount={4}
                viewAllLink={`/explore?sort=rating&category=${encodeURIComponent(block.category)}`}
              >
                {renderCards(block.highestRated)}
              </HorizontalCarousel>
              <HorizontalCarousel
                title={`Most Viewed in ${block.category}`}
                items={block.mostViewed}
                loading={loadingGlobal}
                skeletonCount={4}
                viewAllLink={`/explore?sort=views&category=${encodeURIComponent(block.category)}`}
              >
                {renderCards(block.mostViewed)}
              </HorizontalCarousel>
            </section>
          ))}

          <div ref={sentinelRef} style={{ height: 1, width: '100%' }} aria-hidden="true" />
          {loadingCategories && <div className="categories-loading">Loading more categories...</div>}
          {!hasMoreCategories && !loadingCategories && loadedCategoryBlocks.length > 0 && (
            <div className="categories-end">You've reached the end of the line.</div>
          )}
        </>
      )}
    </div>
  );
};

export default ContentFeed;