import React, { useEffect, useRef, useState, useCallback, useMemo } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { supabase } from '../../supabase/supabaseClient';
import { FaHeart, FaStar, FaComment, FaEye } from 'react-icons/fa';
import CommentsSection from '../CommentsSection/CommentsSection';
import HorizontalCarousel from '../HorizontalCarousel/HorizontalCarousel';
import BookSummaryCard from '../BookSummaryCard/BookSummaryCard';
import DOMPurify from 'dompurify';
import EditSummaryForm from '../EditSummaryForm/EditSummaryForm';
import { Helmet } from 'react-helmet-async';
import './SummaryView.css';

const SELECT_WITH_COUNTS = `*,
  likes_count:likes!likes_post_id_fkey(count),
  views_count:views!views_post_id_fkey(count),
  comments_count:comments!comments_post_id_fkey(count)
`;

/* ---------- Utilities ---------- */
const toNum = (v) => {
  if (v == null) return 0;
  if (Array.isArray(v)) return Number(v[0]?.count ?? 0);
  if (typeof v === 'object' && 'count' in v) return Number(v.count || 0);
  return Number(v || 0);
};

const normalizeRow = (r = {}) => {
  const tags = Array.isArray(r.tags)
    ? r.tags.map(t => (typeof t === 'string' ? t.trim().toLowerCase() : String(t)))
    : [];

  const ratingCountRaw = r.rating_count
    ?? r.ratings_count
    ?? (Array.isArray(r.rating_count_aggregate) ? (r.rating_count_aggregate[0]?.count ?? 0) : 0)
    ?? 0;

  return {
    id: r.id,
    slug: r.slug ?? null,
    title: r.title ?? '',
    author: r.author ?? '',
    summary: r.summary ?? null,
    description: r.description ?? null,
    category: r.category ?? null,
    image_url: r.image_url ?? null,
    affiliate_link: r.affiliate_link ?? null,
    youtube_url: r.youtube_url ?? null,
    tags,
    user_id: r.user_id ?? null,
    likes_count: toNum(r.likes_count),
    views_count: toNum(r.views_count),
    comments_count: toNum(r.comments_count),
    avg_rating: Number(r.avg_rating ?? 0),
    rating_count: Number(ratingCountRaw),
    created_at: r.created_at ?? null,
    updated_at: r.updated_at ?? null,
  };
};

const extractYouTubeId = (url = '') => {
  if (!url || typeof url !== 'string') return null;
  const patterns = [
    /[?&]v=([0-9A-Za-z_-]{11})/,
    /youtu\.be\/([0-9A-Za-z_-]{11})/,
    /\/embed\/([0-9A-Za-z_-]{11})/,
    /\/v\/([0-9A-Za-z_-]{11})/,
    /\/watch\/([0-9A-Za-z_-]{11})/,
  ];
  for (const re of patterns) {
    const m = url.match(re);
    if (m && m[1]) return m[1];
  }
  const anyMatch = url.match(/([0-9A-Za-z_-]{11})/);
  return anyMatch ? anyMatch[1] : null;
};

const stripHtml = (html = '') => String(html || '').replace(/<[^>]*>/g, '').trim();

const makeSafeDescription = (raw = '', maxLen = 140) => {
  const cleaned = DOMPurify.sanitize(String(raw || ''), { ALLOWED_TAGS: [] });
  const plain = stripHtml(cleaned);
  return plain.length > maxLen ? `${plain.slice(0, maxLen)}…` : plain;
};

const buildLightItem = (nr = {}, src = {}) => {
  let rawDesc =
    (src.description !== undefined ? src.description : null) ??
    (nr.description !== undefined ? nr.description : null) ??
    src.desc ??
    src.blurb ??
    src.short_description ??
    null;

  let description = String(rawDesc || '').trim();
  const safeDesc = makeSafeDescription(description, 140);

  return {
    id: nr.id,
    slug: nr.slug,
    title: nr.title,
    author: nr.author,
    description: safeDesc,
    category: nr.category,
    image_url: nr.image_url,
    avg_rating: nr.avg_rating || 0,
    likes_count: nr.likes_count || 0,
    views_count: nr.views_count || 0,
    comments_count: nr.comments_count || 0,
    tags: nr.tags || [],
    user_id: nr.user_id ?? null,
    created_at: nr.created_at ?? null,
  };
};

/* ---------- Component ---------- */
const SummaryView = () => {
  const { param } = useParams();
  const navigate = useNavigate();

  /* States */
  const [summary, setSummary] = useState(null);
  const [postId, setPostId] = useState(null);
  const [isLoading, setIsLoading] = useState(true);

  const [likes, setLikes] = useState(0);
  const [userHasLiked, setUserHasLiked] = useState(false);
  const [views, setViews] = useState(0);
  const [commentsCount, setCommentsCount] = useState(0);
  const [avgRating, setAvgRating] = useState(0);
  const [userRating, setUserRating] = useState(0);
  const [hoverRating, setHoverRating] = useState(0);
  const [savingRating, setSavingRating] = useState(false);
  const [collapsed, setCollapsed] = useState(false);

  const [recommendedContent, setRecommendedContent] = useState([]);
  const [isRecommending, setIsRecommending] = useState(false);
  const [recError, setRecError] = useState(null);

  const [ownerId, setOwnerId] = useState(null);
  const [currentUserId, setCurrentUserId] = useState(null);
  const [showEdit, setShowEdit] = useState(false);

  /* Refs */
  const pageRef = useRef(null);
  const headerRef = useRef(null);

  /* ---------- Hooks (always called, in fixed order) ---------- */

  // Get current user id (if logged in)
  useEffect(() => {
    (async () => {
      try {
        const { data } = await supabase.auth.getUser();
        setCurrentUserId(data?.user?.id ?? null);
      } catch {
        setCurrentUserId(null);
      }
    })();
  }, []);

  // Scroll to top when param changes — robust across SPA scroll containers and browsers
  useEffect(() => {
    try {
      const scrollToTop = () => {
        try {
          // If there's a dedicated main-content scroll container, prefer that
          const main = document.querySelector('.main-content');
          if (main && typeof main.scrollTo === 'function') {
            main.scrollTo({ top: 0, behavior: 'auto' });
            return;
          }

          // If the summary page wrapper is scrollable, reset that
          if (pageRef && pageRef.current && typeof pageRef.current.scrollTo === 'function') {
            pageRef.current.scrollTo({ top: 0, behavior: 'auto' });
            return;
          }

          // Fallback to window/document
          if (typeof window !== 'undefined' && typeof window.scrollTo === 'function') {
            window.scrollTo(0, 0);
            // also reset common fallbacks
            if (document && document.documentElement) document.documentElement.scrollTop = 0;
            if (document && document.body) document.body.scrollTop = 0;
          }
        } catch (e) {
          // non-fatal
          // console.debug('scrollToTop inner error', e);
        }
      };

      // run immediately when route param changes
      scrollToTop();
    } catch (e) {
      // swallow — scroll is best-effort
    }
  }, [param]);

  /* Recommendation functions (defined before use) */

  const fetchRecommendedByTags = useCallback(async (tags = [], limit = 10, resolvedPostId = null) => {
    setIsRecommending(true);
    setRecError(null);
    try {
      const lowerTags = (Array.isArray(tags) ? tags : [])
        .map(t => (t || '').toLowerCase().trim())
        .filter(Boolean);

      if (lowerTags.length === 0) {
        setRecommendedContent([]);
        return [];
      }

      const { data, error } = await supabase
        .from('book_summaries')
        .select(
          `id,
           title,
           author,
           description,
           image_url,
           slug,
           category,
           avg_rating,
           likes_count:likes!likes_post_id_fkey(count),
           views_count:views!views_post_id_fkey(count),
           comments_count:comments!comments_post_id_fkey(count),
           tags,
           user_id,
           created_at`
        )
        .neq('id', resolvedPostId)
        .limit(500);

      if (error) throw error;

      const rows = (data || [])
        .map(d => {
          const nr = normalizeRow(d);
          return buildLightItem(nr, d);
        })
        .filter(r => {
          const postTags = Array.isArray(r.tags) ? r.tags.map(t => (t || '').toLowerCase().trim()) : [];
          return postTags.some(t => lowerTags.includes(t));
        })
        .map(r => {
          const postTags = Array.isArray(r.tags) ? r.tags.map(t => (t || '').toLowerCase().trim()) : [];
          const matchCount = postTags.filter(t => lowerTags.includes(t)).length;
          return { r, matchCount };
        });

      rows.sort((a, b) => {
        if (b.matchCount !== a.matchCount) return b.matchCount - a.matchCount;
        if ((b.r.views_count || 0) !== (a.r.views_count || 0)) return (b.r.views_count || 0) - (a.r.views_count || 0);
        if ((b.r.likes_count || 0) !== (a.r.likes_count || 0)) return (b.r.likes_count || 0) - (a.r.likes_count || 0);
        const tb = b.r.created_at ? new Date(b.r.created_at).getTime() : 0;
        const ta = a.r.created_at ? new Date(a.r.created_at).getTime() : 0;
        return tb - ta;
      });

      const top = rows.map(x => x.r).slice(0, limit);
      setRecommendedContent(top);
      return top;
    } catch (err) {
      console.error('Error fetching recommendations by tags:', err);
      setRecError('Unable to load recommendations.');
      setRecommendedContent([]);
      return [];
    } finally {
      setIsRecommending(false);
    }
  }, []);

  const fetchRecommendedByCategory = useCallback(async (category, limit = 10, resolvedPostId = null) => {
    setIsRecommending(true);
    setRecError(null);
    try {
      const cat = String(category ?? '').trim();
      if (!cat) { setRecommendedContent([]); return []; }

      const { data, error } = await supabase
        .from('book_summaries')
        .select(
          `id,
           title,
           author,
           description,
           image_url,
           slug,
           category,
           avg_rating,
           likes_count:likes!likes_post_id_fkey(count),
           views_count:views!views_post_id_fkey(count),
           comments_count:comments!comments_post_id_fkey(count),
           tags,
           user_id,
           created_at`
        )
        .neq('id', resolvedPostId)
        .eq('category', cat)
        .limit(500);

      if (error) throw error;

      const rows = (data || []).map(d => {
        const nr = normalizeRow(d);
        return buildLightItem(nr, d);
      }).filter(r => String(r.id) !== String(resolvedPostId));

      rows.sort((a, b) => {
        const vb = Number(b.views_count || 0);
        const va = Number(a.views_count || 0);
        if (vb !== va) return vb - va;
        const lb = Number(b.likes_count || 0);
        const la = Number(a.likes_count || 0);
        if (lb !== la) return lb - la;
        const tb = b.created_at ? new Date(b.created_at).getTime() : 0;
        const ta = a.created_at ? new Date(a.created_at).getTime() : 0;
        return tb - ta;
      });

      const top = rows.slice(0, limit);
      setRecommendedContent(top);
      return top;
    } catch (err) {
      console.error('Error fetching recommendations by category:', err);
      setRecError('Unable to load recommendations.');
      setRecommendedContent([]);
      return [];
    } finally {
      setIsRecommending(false);
    }
  }, []);

  /* ---------- Data loading ---------- */

  useEffect(() => {
    let mounted = true;
    const loadMinimalSummary = async () => {
      setIsLoading(true);
      setSummary(null);
      setPostId(null);

      try {
        const { data: slugData } = await supabase
          .from('book_summaries')
          .select(
            `id,
             slug,
             title,
             author,
             description,
             category,
             image_url,
             affiliate_link,
             youtube_url,
             tags,
             user_id,
             created_at`
          )
          .eq('slug', param)
          .maybeSingle();

        let data = slugData ?? null;
        let fetchedBy = null;
        if (data) fetchedBy = 'slug';
        else {
          const { data: idData } = await supabase
            .from('book_summaries')
            .select(
              `id,
               slug,
               title,
               author,
               description,
               category,
               image_url,
               affiliate_link,
               youtube_url,
               tags,
               user_id,
               created_at`
            )
            .eq('id', param)
            .maybeSingle();
          data = idData ?? null;
          if (data) fetchedBy = 'id';
        }

        if (!mounted) return;
        if (!data) {
          setIsLoading(false);
          setSummary(null);
          return;
        }

        if (fetchedBy === 'id' && data.slug && data.slug !== param) {
          navigate(`/summary/${data.slug}`, { replace: true });
          return;
        }

        const normalized = normalizeRow(data);
        normalized.category = (normalized?.category == null) ? '' : String(normalized.category).trim();

        setSummary(normalized);
        setPostId(normalized.id);
        setOwnerId(normalized.user_id ?? null);

        setLikes(0);
        setViews(0);
        setCommentsCount(0);

        setIsLoading(false);

        // fetch followups (counts, ratings, views increment, recommendations)
        backgroundFetchFollowups(normalized.id, normalized.category, normalized.tags).catch((e) => console.debug(e));
      } catch (err) {
        console.error('Error loading minimal summary:', err);
        if (mounted) {
          setIsLoading(false);
          setSummary(null);
          setPostId(null);
        }
      }
    };

    loadMinimalSummary();
    return () => { mounted = false; };
  }, [param, navigate]); // end useEffect loadMinimalSummary

  /* backgroundFetchFollowups placed after recommendation functions to ensure they exist */
  const backgroundFetchFollowups = async (resolvedPostId, category = '', tags = []) => {
    try {
      const { data, error } = await supabase
        .from('book_summaries')
        .select(SELECT_WITH_COUNTS)
        .eq('id', resolvedPostId)
        .single();

      if (!error && data) {
        const formatted = normalizeRow(data);
        formatted.category = (formatted?.category == null) ? '' : String(formatted.category).trim();
        setSummary((prev) => prev ? { ...prev, ...formatted } : formatted);
        setOwnerId(formatted.user_id ?? null);
        setLikes(formatted.likes_count || 0);
        setViews(formatted.views_count || 0);
        setCommentsCount(formatted.comments_count || 0);
      }

      try {
        const { data: ratingData } = await supabase.rpc('get_average_rating', { p_post_id: resolvedPostId });
        if (Array.isArray(ratingData) && ratingData[0] && ratingData[0].average_rating !== null) {
          setAvgRating(Math.round(Number(ratingData[0].average_rating) * 10) / 10);
        }
      } catch (e) {}

      try {
        const { data: { user } } = await supabase.auth.getUser();
        if (user) {
          const [likesRes, ratingRes] = await Promise.all([
            supabase.from('likes').select('id').eq('post_id', resolvedPostId).eq('user_id', user.id),
            supabase.from('ratings').select('rating').eq('post_id', resolvedPostId).eq('user_id', user.id).maybeSingle(),
          ]);
          if (likesRes?.data && likesRes.data.length) setUserHasLiked(true);
          if (ratingRes?.data && ratingRes.data.rating) setUserRating(ratingRes.data.rating);
        }
      } catch (e) {}

      try {
        await supabase.rpc('increment_views', { post_id: resolvedPostId });
        setViews((v) => (Number(v) || 0) + 1);
      } catch (e) {}

      // Use tags-based recommendations if available; fallback to category if not
      if (Array.isArray(tags) && tags.length > 0) {
        fetchRecommendedByTags(tags, 10, resolvedPostId).catch(() => {});
      } else if ((category ?? '').trim()) {
        fetchRecommendedByCategory(category, 10, resolvedPostId).catch(() => {});
      } else {
        setRecommendedContent([]);
      }
    } catch (err) {
      console.error('backgroundFetchFollowups error', err);
    }
  };

  /* ---------- Interaction handlers ---------- */

  const handleLike = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) { alert('Please sign in to like summaries.'); return; }
      if (!postId) { alert('Post not ready. Please try again.'); return; }

      if (userHasLiked) {
        const { error } = await supabase.from('likes').delete().eq('post_id', postId).eq('user_id', user.id);
        if (error) throw error;
        setUserHasLiked(false);
        setLikes((l) => Math.max(0, l - 1));
      } else {
        const { error } = await supabase.from('likes').insert([{ post_id: postId, user_id: user.id }]);
        if (error) throw error;
        setUserHasLiked(true);
        setLikes((l) => (Number(l) || 0) + 1);
      }
    } catch (err) {
      console.error('Like error', err);
      alert('Could not update like. Try again.');
    }
  };

  const saveRating = async (value) => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) { alert('Please sign in to rate'); return false; }
      if (!postId) { alert('Post not ready. Try again later.'); return false; }

      setSavingRating(true);
      const { data, error } = await supabase.rpc('rate_post', {
        p_post_id: postId,
        p_user_id: user.id,
        p_rating: value
      });

      if (error) {
        console.error('rate_post rpc error', error);
        alert('Could not save rating. Try again later.');
        return false;
      }

      try {
        const { data: ratingData } = await supabase.rpc('get_average_rating', { p_post_id: postId });
        if (Array.isArray(ratingData) && ratingData[0] && ratingData[0].average_rating !== null) {
          setAvgRating(Math.round(Number(ratingData[0].average_rating) * 10) / 10);
        }
      } catch (e) {}

      setUserRating(value);
      return true;
    } catch (err) {
      console.error('Save rating error', err);
      alert('Could not save rating. Try again.');
      return false;
    } finally {
      setSavingRating(false);
    }
  };

  const handleSetRating = async (value) => {
    setHoverRating(0);
    await saveRating(value);
  };

  const renderStars = (size = 'md') => {
    const active = hoverRating || userRating;
    const arr = [];
    for (let i = 1; i <= 5; i++) {
      const on = i <= active;
      arr.push(
        <button
          key={i}
          type="button"
          className={`star-button ${on ? 'active' : ''} ${size === 'sm' ? 'small' : ''}`}
          onMouseEnter={() => setHoverRating(i)}
          onMouseLeave={() => setHoverRating(0)}
          onFocus={() => setHoverRating(i)}
          onBlur={() => setHoverRating(0)}
          onClick={() => handleSetRating(i)}
          disabled={savingRating}
          aria-label={`Rate ${i} star${i > 1 ? 's' : ''}`}
        >
          <FaStar />
        </button>
      );
    }
    return arr;
  };

  /* Scroll collapsed header logic */
  useEffect(() => {
    const scroller = document.querySelector('.main-content') || window;
    let ticking = false;

    const getScrollValue = () => {
      if (scroller === window) {
        if (!pageRef.current) return window.scrollY || 0;
        const rect = pageRef.current.getBoundingClientRect();
        return Math.max(0, -rect.top);
      } else {
        return scroller.scrollTop;
      }
    };

    const t = 100;
    const onScroll = () => {
      if (ticking) return;
      ticking = true;
      requestAnimationFrame(() => {
        const sc = getScrollValue();
        setCollapsed(sc < t);
        ticking = false;
      });
    };

    if (scroller === window) {
      window.addEventListener('scroll', onScroll, { passive: true });
      window.addEventListener('wheel', onScroll, { passive: true });
      window.addEventListener('touchmove', onScroll, { passive: true });
    } else {
      scroller.addEventListener('scroll', onScroll, { passive: true });
      scroller.addEventListener('wheel', onScroll, { passive: true });
      scroller.addEventListener('touchmove', onScroll, { passive: true });
    }

    requestAnimationFrame(onScroll);
    return () => {
      if (scroller === window) {
        window.removeEventListener('scroll', onScroll);
        window.removeEventListener('wheel', onScroll);
        window.removeEventListener('touchmove', onScroll);
      } else {
        scroller.removeEventListener('scroll', onScroll);
        scroller.removeEventListener('wheel', onScroll);
        scroller.removeEventListener('touchmove', onScroll);
      }
    };
  }, [summary]);

  /* ---------- Derived / memoized values (always defined) ---------- */
  const BRAND = 'OGONJO';
  const SITE_DEFAULT_OG = useMemo(() => {
    try {
      if (typeof window !== 'undefined' && window.location.origin) {
        return `${window.location.origin}/ogonjo.jpg`;
      }
    } catch (e) {}
    return 'https://your-ogonjo-app.netlify.app/ogonjo.jpg';
  }, []);

  const metaTitle = useMemo(() => `${summary?.title || 'Loading…'} – Book Summary | ${BRAND}`, [summary?.title]);
  const metaDescription = useMemo(
    () => makeSafeDescription(summary?.description || summary?.summary || '', 160),
    [summary?.description, summary?.summary]
  );

  const pageUrl = useMemo(() => {
    try {
      if (typeof window !== 'undefined') {
        const u = new URL(window.location.href);
        return `${u.origin}${u.pathname}`;
      }
    } catch (e) {}
    return `https://ogonjo.com/summary/${summary?.slug || summary?.id || ''}`;
  }, [summary?.slug, summary?.id]);

  const ogImage = summary?.image_url || SITE_DEFAULT_OG;

  // Extended JSON-LD: includes publisher, aggregateRating, breadcrumb
  const ldJson = useMemo(() => {
    const ratingValue = avgRating || summary?.avg_rating || undefined;
    const ratingCount = summary?.rating_count || undefined;
    const reviewCount = commentsCount || (summary?.comments_count || undefined);

    const base = {
      "@context": "https://schema.org",
      "@type": "Article",
      "headline": summary?.title || BRAND,
      "description": metaDescription,
      "author": { "@type": "Person", "name": summary?.author || BRAND },
      "datePublished": summary?.created_at || undefined,
      "dateModified": summary?.updated_at || summary?.created_at || undefined,
      "image": ogImage,
      "mainEntityOfPage": {
        "@type": "WebPage",
        "@id": pageUrl
      },
      "publisher": {
        "@type": "Organization",
        "name": BRAND,
        "logo": {
          "@type": "ImageObject",
          "url": SITE_DEFAULT_OG
        }
      }
    };

    if (ratingValue || ratingCount || reviewCount) {
      base.aggregateRating = {
        "@type": "AggregateRating",
        ...(ratingValue ? { "ratingValue": Number(ratingValue).toFixed(1) } : {}),
        ...(ratingCount ? { "ratingCount": Number(ratingCount) } : {}),
        ...(reviewCount ? { "reviewCount": Number(reviewCount) } : {})
      };
    }

    // BreadcrumbList
    try {
      const origin = (typeof window !== 'undefined' && window.location.origin) ? window.location.origin : '';
      base.breadcrumb = {
        "@type": "BreadcrumbList",
        "itemListElement": [
          { "@type": "ListItem", "position": 1, "name": "Home", "item": `${origin || ''}/` },
          { "@type": "ListItem", "position": 2, "name": "Summaries", "item": `${origin || ''}/explore` },
          { "@type": "ListItem", "position": 3, "name": summary?.title || "Summary", "item": pageUrl }
        ]
      };
    } catch (e) {
      // ignore
    }

    return base;
  }, [summary, metaDescription, ogImage, pageUrl, SITE_DEFAULT_OG, BRAND, avgRating, commentsCount]);

  // Use the first tag for explore links (consistency with ExplorePage which expects `tag`)
  const viewAllLinkForTags = useMemo(() => {
    const tagsArr = Array.isArray(summary?.tags) ? summary.tags.map(t => (t || '').trim()).filter(Boolean) : [];
    if (tagsArr.length === 0) return `/explore`;
    return `/explore?tag=${encodeURIComponent(tagsArr[0])}`;
  }, [summary?.tags]);

  /* ---------- Render ---------- */

  if (isLoading) {
    return (
      <div className="centered-loader-viewport" role="status" aria-live="polite">
        <div className="centered-loader">
          <div className="spinner" />
          <div className="loader-text">Loading…</div>
        </div>
      </div>
    );
  }

  if (!summary) return <div style={{ padding: 28 }}>Summary not found.</div>;

  const processedSummary = summary.summary ? DOMPurify.sanitize(summary.summary) : '';
  const youtubeId = extractYouTubeId(summary.youtube_url);

  // Affiliate parsing (kept defensive)
  let affiliateUrl = null;
  let affiliateLabel = null;
  let affiliateType = null;
  const rawAffiliate = summary?.affiliate_link ?? null;
  if (rawAffiliate) {
    try {
      if (typeof rawAffiliate === 'string') {
        const parts = rawAffiliate.split('|', 2).map(p => (p || '').trim());
        if (parts.length === 2 && parts[1]) {
          affiliateType = (parts[0] || '').toLowerCase();
          affiliateUrl = parts[1];
        } else {
          affiliateType = 'book';
          affiliateUrl = rawAffiliate.trim();
        }
      } else if (typeof rawAffiliate === 'object' && rawAffiliate !== null) {
        if (rawAffiliate.url) {
          affiliateUrl = String(rawAffiliate.url);
          affiliateType = (rawAffiliate.type || 'book').toLowerCase();
        } else if (rawAffiliate.link) {
          affiliateUrl = String(rawAffiliate.link);
          affiliateType = (rawAffiliate.type || 'book').toLowerCase();
        }
      }
    } catch (e) {
      try {
        affiliateUrl = String(rawAffiliate);
        affiliateType = 'book';
      } catch (ee) {
        affiliateUrl = null;
        affiliateType = null;
      }
    }
  }

  if (affiliateUrl) {
    affiliateLabel =
      affiliateType === 'pdf' ? 'Get PDF' :
      affiliateType === 'app' ? 'Open App' :
      'Get Book';
  }

  const onClickTag = (tag) => { if (!tag) return; navigate(`/explore?tag=${encodeURIComponent(tag)}`); };

  const handleEditSaved = (updatedRow) => {
    if (!updatedRow) { setShowEdit(false); return; }
    const normalized = normalizeRow(updatedRow);
    setSummary(prev => prev ? { ...prev, ...normalized } : normalized);
    backgroundFetchFollowups(normalized.id, normalized.category, normalized.tags).catch(() => {});
    try { window.dispatchEvent(new CustomEvent('summary:updated', { detail: { id: normalized.id } })); } catch (e) {}
    setShowEdit(false);
  };

  return (
    <div className={`summary-page ${collapsed ? 'title-collapsed' : ''}`} ref={pageRef} data-collapsed={collapsed ? '1' : '0'}>
      <Helmet>
        <title>{metaTitle}</title>
        <meta name="description" content={metaDescription} />
        <link rel="canonical" href={pageUrl} />

        {/* Open Graph */}
        <meta property="og:site_name" content={BRAND} />
        <meta property="og:title" content={metaTitle} />
        <meta property="og:description" content={metaDescription} />
        <meta property="og:type" content="article" />
        <meta property="og:url" content={pageUrl} />
        <meta property="og:image" content={ogImage} />
        {summary?.created_at && <meta property="article:published_time" content={summary.created_at} />}
        {(summary?.updated_at || summary?.created_at) && <meta property="article:modified_time" content={summary?.updated_at || summary?.created_at} />}
        {summary?.author && <meta property="article:author" content={summary.author} />}

        {/* article:tag — multiple meta tags for each tag */}
        {Array.isArray(summary?.tags) && summary.tags.map((t) => (
          <meta key={`og-tag-${t}`} property="article:tag" content={t} />
        ))}

        {/* Twitter */}
        <meta name="twitter:card" content="summary_large_image" />
        <meta name="twitter:title" content={metaTitle} />
        <meta name="twitter:description" content={metaDescription} />
        <meta name="twitter:image" content={ogImage} />

        <meta name="robots" content="index, follow" />

        {/* JSON-LD */}
        <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(ldJson) }} />
      </Helmet>

      <div className="summary-top-spacer" aria-hidden="true" />
      <header className={`summary-header ${collapsed ? 'collapsed' : ''}`} ref={headerRef} role="banner" aria-expanded={!collapsed}>
        <div className="summary-thumb-wrap" aria-hidden="true">
          {summary.image_url ? (
            <img className={`summary-thumb ${collapsed ? 'collapsed' : ''}`} src={summary.image_url} alt={summary.title} />
          ) : (
            <div className={`summary-thumb placeholder ${collapsed ? 'collapsed' : ''}`} />
          )}
        </div>

        <div className="summary-title-left">
          <h1 className="summary-title" title={summary.title}>{summary.title}</h1>
          <div className="summary-author">by {summary.author}</div>
        </div>

        <div className="summary-actions" style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
          {affiliateUrl && affiliateLabel && (
            <a
              className={`affiliate-btn ${affiliateType ? `affiliate-${affiliateType}` : ''}`}
              href={affiliateUrl}
              target="_blank"
              rel="noopener noreferrer"
            >
              {affiliateLabel}
            </a>
          )}
          {ownerId && currentUserId && ownerId === currentUserId && (
            <button className="hf-btn" type="button" onClick={() => setShowEdit(true)}>Edit</button>
          )}
        </div>

        <div className="summary-engagement" role="group" aria-label="Engagement">
          <button className={`eng-btn like-btn ${userHasLiked ? 'liked' : ''}`} onClick={handleLike} aria-pressed={userHasLiked} title="Like">
            <FaHeart /> <span>{likes ?? 0}</span>
          </button>
          <div className="eng-item" title="Comments"><FaComment /> <span>{commentsCount ?? 0}</span></div>
          <div className="eng-item" title="Views"><FaEye /> <span>{views ?? 0}</span></div>
          <div className="rating-block" title={`Average rating ${avgRating || 0}`}>
            <div className="rating-stars">{renderStars('md')}</div>
            <div className="avg-text">{avgRating ? Number(avgRating).toFixed(1) : '0.0'}</div>
          </div>
        </div>
      </header>

     
      <div style={{ maxWidth: 980, margin: '10px auto', padding: '0 18px' }}>
        

        {youtubeId && (
          <div className="youtube-embed" style={{ marginBottom: 12 }}>
            <div className="embed-inner">
              <iframe
                className="youtube-iframe"
                title="YouTube clip"
                src={`https://www.youtube-nocookie.com/embed/${youtubeId}`}
                frameBorder="0"
                allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                allowFullScreen
              />
            </div>
          </div>
        )}
        
      </div>
         <article className="summary-body" dangerouslySetInnerHTML={{ __html: processedSummary }} />
      {(isRecommending || (recommendedContent && recommendedContent.length > 0)) && (
        <HorizontalCarousel
          title={`More like this`}
          items={recommendedContent}
          loading={isRecommending}
          skeletonCount={4}
          viewAllLink={viewAllLinkForTags}
        >
          {recommendedContent.map(item => (
            <BookSummaryCard
              key={String(item.id || item.slug)}
              summary={item}
            />
          ))}
        </HorizontalCarousel>
      )}

      {!isRecommending && recommendedContent && recommendedContent.length === 0 && !recError && (
        <div className="rec-empty" style={{ padding: '12px 16px', color: '#6b7280' }}>
          No similar items found.
        </div>
      )}

      {recError && (
        <div className="rec-error" style={{ padding: '12px 16px', color: '#b45309' }}>
          {recError} <button onClick={() => {
            if (Array.isArray(summary?.tags) && summary.tags.length > 0) fetchRecommendedByTags(summary.tags, 10, summary.id);
            else if (summary.category) fetchRecommendedByCategory(summary.category, 10, summary.id);
          }}>Retry</button>
        </div>
      )}

      <section className="summary-comments">
        <h3>Comments</h3>
        <CommentsSection postId={summary.id} />
      </section>

      {showEdit && (
        <EditSummaryForm
          summary={summary}
          onClose={() => setShowEdit(false)}
          onUpdate={(updatedRow) => handleEditSaved(updatedRow)}
        />
      )}
    </div>
  );
};

export default SummaryView;
