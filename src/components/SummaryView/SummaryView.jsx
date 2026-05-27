// src/components/SummaryView/SummaryView.jsx
// ─────────────────────────────────────────────────────────────────────────────
// CHANGES from original (File 3):
//   1. Reading UX layer added: theme toggle (day/night), font-size controls,
//      Times New Roman editorial typography, justified text, drop-cap, tag pills,
//      themed engagement bar, themed comments section.
//   2. Link style: colored + underline + slight fade on hover (via T.accent).
//   3. All ad/workbook logic, data fetching, and business logic are IDENTICAL
//      to the original File 3 — only visual/style layer changed.
// ─────────────────────────────────────────────────────────────────────────────

import React, { useEffect, useRef, useState, useCallback, useMemo } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { supabase } from '../../supabase/supabaseClient';
import { FaHeart, FaStar, FaComment, FaEye, FaPlus, FaMinus, FaPaintBrush, FaShareAlt, FaArrowLeft } from 'react-icons/fa';
import CommentsSection from '../CommentsSection/CommentsSection';
import HorizontalCarousel from '../HorizontalCarousel/HorizontalCarousel';
import BookSummaryCard from '../BookSummaryCard/BookSummaryCard';
import DOMPurify from 'dompurify';
import EditSummaryForm from '../EditSummaryForm/EditSummaryForm';
import { Helmet } from 'react-helmet-async';

// ── AD IMPORTS (unchanged from File 3) ──────────────────────────────────────
import AdSlot from '../Ad/Ad';
import { injectAds } from '../../utils/injectAds';
import { fetchWorkbookRecommendations } from '../../utils/fetchWorkbookRecommendations';
// ────────────────────────────────────────────────────────────────────────────

import './SummaryView.css';

const AD_SLOT_ID = null; // unused with Ezoic

/* ---------- Constants ---------- */
const SELECT_WITH_COUNTS = `*,
  likes_count:likes!likes_post_id_fkey(count),
  views_count:views!views_post_id_fkey(count),
  comments_count:comments!comments_post_id_fkey(count)
`;

/* ---------- Theme tokens ---------- */
const THEMES = {
  white: {
    bg: '#ffffff',
    articleBg: '#ffffff',
    text: '#1a1209',
    muted: '#6b5f4a',
    accent: '#8b5e3c',
    border: '#e8ddd0',
    headerBg: 'rgba(255,255,255,0.97)',
    shadow: '0 8px 32px rgba(139,94,60,0.08)',
    engBg: '#fdf8f4',
    tagBg: '#f5ede3',
    tagColor: '#7a4f2d',
  },
  brown: {
    bg: '#2c1f14',
    articleBg: '#1e1510',
    text: '#f0e6d6',
    muted: '#b5997c',
    accent: '#d4956a',
    border: '#4a3320',
    headerBg: 'rgba(44,31,20,0.97)',
    shadow: '0 8px 32px rgba(0,0,0,0.4)',
    engBg: '#261a10',
    tagBg: '#3d2910',
    tagColor: '#d4956a',
  },
};

/* ---------- Small utilities (identical to File 3) ---------- */
const toNum = (v) => {
  if (v == null) return 0;
  if (Array.isArray(v)) return Number(v[0]?.count ?? 0);
  if (typeof v === 'object' && 'count' in v) return Number(v.count || 0);
  return Number(v || 0);
};

const normalizeRow = (r = {}) => {
  const tags = Array.isArray(r.tags) ? r.tags.map(t => (typeof t === 'string' ? t.trim().toLowerCase() : String(t))) : [];

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
    difficulty_level: r.difficulty_level ?? null,
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
    (src.description !== undefined ? src.description : null) ?? (nr.description !== undefined ? nr.description : null) ?? src.desc ?? src.blurb ?? src.short_description ?? null;

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
    difficulty_level: nr.difficulty_level ?? null,
  };
};

/* ---------- Loader component (unchanged from File 3) ---------- */
const InlineLoader = ({ label = 'Loading content' }) => (
  <div className="summary-inline-loader" aria-live="polite" aria-busy="true" role="status" style={{ textAlign: 'center', padding: 20 }}>
    <div className="dots" aria-hidden="true" style={{ display: 'inline-flex', gap: 6, alignItems: 'center' }}>
      <span className="dot" />
      <span className="dot" />
      <span className="dot" />
    </div>
    <div style={{ marginTop: 8, color: '#6b7280' }}>{label}…</div>
    <style>{`
      .summary-inline-loader .dot {
        width: 10px; height: 10px; border-radius: 50%; background: #2563eb;
        display: inline-block; transform: translateY(0);
        animation: summary-dot 1s infinite ease-in-out;
      }
      .summary-inline-loader .dot:nth-child(2) { animation-delay: 0.12s; }
      .summary-inline-loader .dot:nth-child(3) { animation-delay: 0.24s; }
      @keyframes summary-dot {
        0% { transform: translateY(0); opacity: 0.4; }
        40% { transform: translateY(-8px); opacity: 1; }
        80% { transform: translateY(0); opacity: 0.6; }
        100% { transform: translateY(0); opacity: 0.4; }
      }
    `}</style>
  </div>
);

/* ---------- Component ---------- */
const SummaryView = () => {
  const { param } = useParams();
  const navigate = useNavigate();

  /* ---------- State ---------- */
  // ── READING UX STATE ──────────────────────────────────────────────────────
  const [theme, setTheme] = useState('white');   // 'white' | 'brown'
  const [fontSize, setFontSize] = useState(18);  // px
  const T = THEMES[theme];
  // ─────────────────────────────────────────────────────────────────────────

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

  const [processedSummaryHtml, setProcessedSummaryHtml] = useState('');
  const [slotWorkbooks, setSlotWorkbooks] = useState([]);

  useEffect(() => {
    if (!summary?.id) return;
    if (summary?.category === 'Workbooks') { setSlotWorkbooks([]); return; }
    fetchWorkbookRecommendations(summary, 8)
      .then(workbooks => setSlotWorkbooks(workbooks))
      .catch(() => setSlotWorkbooks([]));
  }, [summary?.id]);

  const articleSegments = useMemo(
    () => injectAds(processedSummaryHtml),
    [processedSummaryHtml]
  );

  useEffect(() => {
    if (!articleSegments || articleSegments.length === 0) return;
    const adSegments = articleSegments.filter(s => s.type === 'ad');
    if (adSegments.length === 0) return;

    const ezoicIds = adSegments
      .filter(s => !slotWorkbooks[s.adIndex - 1])
      .map(s => 100 + s.adIndex);

    if (ezoicIds.length === 0) return;

    try {
      window.ezstandalone = window.ezstandalone || {};
      window.ezstandalone.cmd = window.ezstandalone.cmd || [];
      window.ezstandalone.cmd.push(function () {
        window.ezstandalone.destroyAll();
        window.ezstandalone.showAds(...ezoicIds);
      });
    } catch (e) {}

    return () => {
      try {
        window.ezstandalone.cmd.push(function () { window.ezstandalone.destroyAll(); });
      } catch (e) {}
    };
  }, [articleSegments, slotWorkbooks]);

  /* ---------- Refs ---------- */
  const pageRef = useRef(null);
  const headerRef = useRef(null);
  const slugCache = useRef(new Map());

  /* ---------- Auth ---------- */
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

  /* ---------- Scroll to top ---------- */
  const scrollToTop = useCallback((behavior = 'auto') => {
    try {
      const mainEl = document.querySelector('.main-content');
      const scrollEl = (mainEl && typeof mainEl.scrollTo === 'function')
        ? mainEl
        : (pageRef.current && typeof pageRef.current.scrollTo === 'function') ? pageRef.current
        : (document.scrollingElement || document.documentElement || document.body);

      if (window && window.location && window.location.hash) {
        const urlNoHash = window.location.pathname + window.location.search;
        try { window.history.replaceState(null, '', urlNoHash); } catch (e) {}
      }

      if (scrollEl && typeof scrollEl.scrollTo === 'function') {
        try { scrollEl.scrollTo({ top: 0, left: 0, behavior }); } catch (e) { scrollEl.scrollTop = 0; }
      } else if (typeof window.scrollTo === 'function') {
        try { window.scrollTo({ top: 0, left: 0, behavior }); } catch (e) { window.scrollTo(0, 0); }
      } else {
        if (document && document.documentElement) document.documentElement.scrollTop = 0;
        if (document && document.body) document.body.scrollTop = 0;
      }
    } catch (e) {
      try { window.scrollTo(0, 0); } catch (ee) {}
    }
  }, []);

  useEffect(() => {
    scrollToTop('auto');
    requestAnimationFrame(() => scrollToTop('smooth'));
    const t = setTimeout(() => scrollToTop('auto'), 120);
    return () => clearTimeout(t);
  }, [param, scrollToTop]);

  /* ---------- Recommendation functions (identical to File 3) ---------- */
  const fetchRecommendedByTags = useCallback(async (tags = [], limit = 10, resolvedPostId = null) => {
    setIsRecommending(true);
    setRecError(null);
    try {
      const lowerTags = (Array.isArray(tags) ? tags : []).map(t => (t || '').toLowerCase().trim()).filter(Boolean);
      if (lowerTags.length === 0) { setRecommendedContent([]); return []; }

      const { data, error } = await supabase
        .from('book_summaries')
        .select(`id, title, author, description, image_url, slug, category, difficulty_level, avg_rating,
           likes_count:likes!likes_post_id_fkey(count),
           views_count:views!views_post_id_fkey(count),
           comments_count:comments!comments_post_id_fkey(count),
           tags, user_id, created_at`)
        .neq('id', resolvedPostId)
        .limit(500);

      if (error) throw error;

      const rows = (data || []).map(d => buildLightItem(normalizeRow(d), d))
        .filter(r => (Array.isArray(r.tags) ? r.tags.map(t => (t||'').toLowerCase()) : []).some(t => lowerTags.includes(t)))
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
        .select(`id, title, author, description, image_url, slug, category, difficulty_level, avg_rating,
           likes_count:likes!likes_post_id_fkey(count),
           views_count:views!views_post_id_fkey(count),
           comments_count:comments!comments_post_id_fkey(count),
           tags, user_id, created_at`)
        .neq('id', resolvedPostId)
        .eq('category', cat)
        .limit(500);

      if (error) throw error;

      const rows = (data || []).map(d => buildLightItem(normalizeRow(d), d)).filter(r => String(r.id) !== String(resolvedPostId));

      rows.sort((a, b) => {
        const vb = Number(b.views_count || 0); const va = Number(a.views_count || 0);
        if (vb !== va) return vb - va;
        const lb = Number(b.likes_count || 0); const la = Number(a.likes_count || 0);
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

  /* ---------- Data followups (identical to File 3) ---------- */
  const backgroundFetchFollowups = useCallback(async (resolvedPostId, category = '', tags = []) => {
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
        const { getGeo, getSource } = await import('../../utils/trackView');
        const [geo, source] = await Promise.all([getGeo(), Promise.resolve(getSource())]);
        await supabase.rpc('increment_views', { post_id: resolvedPostId, country: geo.country, city: geo.city, source });
        setViews((v) => (Number(v) || 0) + 1);
      } catch (e) {
        try {
          await supabase.rpc('increment_views', { post_id: resolvedPostId });
          setViews((v) => (Number(v) || 0) + 1);
        } catch (e2) {}
      }

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
  }, [fetchRecommendedByCategory, fetchRecommendedByTags]);

  /* ---------- Data loading (identical to File 3) ---------- */
  useEffect(() => {
    let mounted = true;
    const loadMinimalSummary = async () => {
      setIsLoading(true);
      setSummary(null);
      setPostId(null);

      try {
        const { data: slugData } = await supabase
          .from('book_summaries')
          .select(`id, slug, title, author, description, category, image_url, affiliate_link, youtube_url, tags, difficulty_level, user_id, created_at`)
          .eq('slug', param)
          .maybeSingle();

        let data = slugData ?? null;
        let fetchedBy = null;

        if (data) fetchedBy = 'slug';
        else {
          const { data: idData } = await supabase
            .from('book_summaries')
            .select(`id, slug, title, author, description, category, image_url, affiliate_link, youtube_url, tags, difficulty_level, user_id, created_at`)
            .eq('id', param)
            .maybeSingle();
          data = idData ?? null;
          if (data) fetchedBy = 'id';
        }

        if (!mounted) return;
        if (!data) { setIsLoading(false); setSummary(null); return; }

        if (fetchedBy === 'id' && data.slug && data.slug !== param) {
          navigate(`/summary/${data.slug}`, { replace: true });
          return;
        }

        const normalized = normalizeRow(data);
        normalized.category = (normalized?.category == null) ? '' : String(normalized.category).trim();

        setSummary(normalized);
        setPostId(normalized.id);
        setOwnerId(normalized.user_id ?? null);
        setLikes(0); setViews(0); setCommentsCount(0);
        setIsLoading(false);

        backgroundFetchFollowups(normalized.id, normalized.category, normalized.tags).catch((e) => console.debug(e));
      } catch (err) {
        console.error('Error loading content:', err);
        if (mounted) { setIsLoading(false); setSummary(null); setPostId(null); }
      }
    };

    loadMinimalSummary();
    return () => { mounted = false; };
  }, [param, navigate, backgroundFetchFollowups]);

  /* ---------- Interaction handlers (identical to File 3) ---------- */
  const handleLike = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) { alert('Please sign in to like content.'); return; }
      if (!postId) { alert('Content not ready. Please try again.'); return; }

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
      if (!postId) { alert('Content not ready. Try again later.'); return false; }

      setSavingRating(true);
      const { error } = await supabase.rpc('rate_post', { p_post_id: postId, p_user_id: user.id, p_rating: value });

      if (error) { console.error('rate_post rpc error', error); alert('Could not save rating. Try again later.'); return false; }

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
          key={i} type="button"
          className={`star-button ${on ? 'active' : ''} ${size === 'sm' ? 'small' : ''}`}
          onMouseEnter={() => setHoverRating(i)} onMouseLeave={() => setHoverRating(0)}
          onFocus={() => setHoverRating(i)} onBlur={() => setHoverRating(0)}
          onClick={() => handleSetRating(i)} disabled={savingRating}
          aria-label={`Rate ${i} star${i > 1 ? 's' : ''}`}
        >
          <FaStar />
        </button>
      );
    }
    return arr;
  };

  const handleBackToArticle = () => {
    if (window.history.length > 1) navigate(-1);
    else navigate('/explore');
  };

  const handleExploreRelated = () => {
    const tagsArr = Array.isArray(summary?.tags) ? summary.tags.map(t => (t || '').trim()).filter(Boolean) : [];
    if (tagsArr.length > 0) navigate(`/explore?tag=${encodeURIComponent(tagsArr[0])}`);
    else if (summary?.category) navigate(`/explore?category=${encodeURIComponent(summary.category)}`);
    else navigate('/explore');
  };

  /* ---------- Link resolution (identical to File 3) ---------- */
  const resolveInternalLinksInHtml = useCallback(async (html) => {
    if (!html) return '';
    const sanitized = DOMPurify.sanitize(html, { ADD_ATTR: ['data-summary-id'] });
    const container = document.createElement('div');
    container.innerHTML = sanitized;

    const anchors = Array.from(container.querySelectorAll('a[data-summary-id]'));
    const fallbackAnchors = anchors.length === 0 ? Array.from(container.querySelectorAll('a[href*="#summary-"]')) : [];
    const targets = new Map();

    anchors.forEach(a => {
      const id = String(a.getAttribute('data-summary-id') || '').trim();
      if (id) { if (!targets.has(id)) targets.set(id, []); targets.get(id).push(a); }
    });

    fallbackAnchors.forEach(a => {
      const href = a.getAttribute('href') || '';
      const m = href.match(/#summary-([0-9a-fA-F-]+)/);
      if (m && m[1]) {
        const key = String(m[1]);
        a.setAttribute('data-summary-id', key);
        if (!targets.has(key)) targets.set(key, []);
        targets.get(key).push(a);
      }
    });

    if (targets.size === 0) return container.innerHTML;

    const idsToFetch = Array.from(targets.keys()).filter(id => !slugCache.current.has(id));
    let fetched = [];
    if (idsToFetch.length > 0) {
      try {
        const { data, error } = await supabase.from('book_summaries').select('id, slug').in('id', idsToFetch);
        if (!error && Array.isArray(data)) fetched = data;
      } catch (e) { console.error('Error fetching slugs for internal links', e); }

      (fetched || []).forEach(r => { try { slugCache.current.set(String(r.id), r.slug || null); } catch (e) {} });
      idsToFetch.forEach(id => { if (!slugCache.current.has(id)) slugCache.current.set(id, null); });
    }

    targets.forEach((anchorNodes, id) => {
      const slug = slugCache.current.get(id) || null;
      anchorNodes.forEach(a => {
        if (slug) {
          a.setAttribute('href', `/summary/${slug}`);
          a.setAttribute('data-summary-slug', slug);
          a.classList.add('internal-summary-link');
        } else {
          a.removeAttribute('href');
          a.classList.add('internal-summary-link-broken');
          a.setAttribute('aria-disabled', 'true');
          a.title = a.title || 'Linked content not found';
        }
      });
    });

    return container.innerHTML;
  }, []);

  useEffect(() => {
    let cancelled = false;
    const run = async () => {
      if (!summary?.summary) { setProcessedSummaryHtml(''); return; }
      try {
        const resolved = await resolveInternalLinksInHtml(summary.summary);
        if (!cancelled) setProcessedSummaryHtml(resolved);
      } catch (e) {
        console.error('Could not process content HTML', e);
        if (!cancelled) setProcessedSummaryHtml(DOMPurify.sanitize(summary.summary));
      }
    };
    run();
    return () => { cancelled = true; };
  }, [summary?.summary, resolveInternalLinksInHtml]);

  /* ---------- Intercept article clicks (identical to File 3) ---------- */
  const onArticleClick = (e) => {
    const a = e.target && e.target.closest && e.target.closest('a');
    if (!a) return;
    const href = a.getAttribute('href') || '';
    const dataSlug = a.getAttribute('data-summary-slug');
    const isExternal = /^[a-zA-Z][a-zA-Z\d+\-.]*:/.test(href);
    if (isExternal) return;
    const isInternal = dataSlug || href.startsWith('/summary/');
    if (!isInternal) return;
    e.preventDefault();
    const slug = dataSlug || href.replace(/^\/summary\//, '').split(/[/?#]/)[0] || null;
    if (slug) {
      navigate(`/summary/${slug}`);
      setTimeout(() => scrollToTop('auto'), 10);
      requestAnimationFrame(() => scrollToTop('smooth'));
      setTimeout(() => scrollToTop('auto'), 150);
    }
  };

  /* ---------- Share (identical to File 3) ---------- */
  const handleShare = async () => {
    if (!summary) return;
    const title = summary.title || 'Check this out on OGONJO';
    const description = makeSafeDescription(summary.description || summary.summary || '', 140);
    const shareText = `${title}\n\n${description}\n\nRead more on OGONJO:\n${pageUrl}`;

    if (navigator.share) {
      try { await navigator.share({ title, text: description, url: pageUrl }); return; } catch (e) {}
    }
    if (navigator.clipboard && navigator.clipboard.writeText) {
      try { await navigator.clipboard.writeText(shareText); alert('Link + description copied to clipboard!'); return; } catch (e) {}
    }
    try { window.prompt('Copy the text below to share:', shareText); } catch (e) {
      alert('Unable to copy automatically. Please copy the URL: ' + pageUrl);
    }
  };

  /* ---------- Meta (identical to File 3) ---------- */
  const BRAND = 'OGONJO';
  const SITE_DEFAULT_OG = useMemo(() => {
    try { if (typeof window !== 'undefined' && window.location.origin) return `${window.location.origin}/ogonjo.jpg`; } catch (e) {}
    return 'https://your-ogonjo-app.netlify.app/ogonjo.jpg';
  }, []);

  const metaTitle = useMemo(() => `${summary?.title || 'Loading…'} – ${BRAND}`, [summary?.title]);
  const metaDescription = useMemo(() => makeSafeDescription(summary?.description || summary?.summary || '', 160), [summary?.description, summary?.summary]);

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

  const ldJson = useMemo(() => {
    const ratingValue = avgRating || summary?.avg_rating || undefined;
    const ratingCount = summary?.rating_count || undefined;
    const reviewCount = commentsCount || (summary?.comments_count || undefined);
    const base = {
      "@context": "https://schema.org", "@type": "Article",
      "headline": summary?.title || BRAND, "description": metaDescription,
      "author": { "@type": "Person", "name": summary?.author || BRAND },
      "datePublished": summary?.created_at || undefined,
      "dateModified": summary?.updated_at || summary?.created_at || undefined,
      "image": ogImage,
      "mainEntityOfPage": { "@type": "WebPage", "@id": pageUrl },
      "publisher": { "@type": "Organization", "name": BRAND, "logo": { "@type": "ImageObject", "url": SITE_DEFAULT_OG } }
    };
    if (ratingValue || ratingCount || reviewCount) {
      base.aggregateRating = { "@type": "AggregateRating", ...(ratingValue ? { "ratingValue": Number(ratingValue).toFixed(1) } : {}), ...(ratingCount ? { "ratingCount": Number(ratingCount) } : {}), ...(reviewCount ? { "reviewCount": Number(reviewCount) } : {}) };
    }
    try {
      const origin = (typeof window !== 'undefined' && window.location.origin) ? window.location.origin : '';
      base.breadcrumb = {
        "@type": "BreadcrumbList",
        "itemListElement": [
          { "@type": "ListItem", "position": 1, "name": "Home", "item": `${origin}/` },
          { "@type": "ListItem", "position": 2, "name": "Library", "item": `${origin}/explore` },
          { "@type": "ListItem", "position": 3, "name": summary?.title || "Content", "item": pageUrl }
        ]
      };
    } catch(e) {}
    return base;
  }, [summary, metaDescription, ogImage, pageUrl, SITE_DEFAULT_OG, BRAND, avgRating, commentsCount]);

  const viewAllLinkForTags = useMemo(() => {
    const tagsArr = Array.isArray(summary?.tags) ? summary.tags.map(t => (t || '').trim()).filter(Boolean) : [];
    if (tagsArr.length === 0) return `/explore`;
    return `/explore?tag=${encodeURIComponent(tagsArr[0])}`;
  }, [summary?.tags]);

  const handleEditSaved = (updatedRow) => {
    if (!updatedRow) { setShowEdit(false); return; }
    const normalized = normalizeRow(updatedRow);
    setSummary(prev => prev ? { ...prev, ...normalized } : normalized);
    backgroundFetchFollowups(normalized.id, normalized.category, normalized.tags).catch(() => {});
    try { window.dispatchEvent(new CustomEvent('summary:updated', { detail: { id: normalized.id } })); } catch (e) {}
    setShowEdit(false);
  };

  const renderDifficultyBadge = (lvl) => {
    if (!lvl) return null;
    const text = String(lvl);
    const cls = `difficulty-label difficulty-${text.toLowerCase().replace(/\s+/g, '-')}`;
    return <span className={cls} aria-hidden="false">{text}</span>;
  };

  /* ---------- Derived flags ---------- */
  const showLoading = Boolean(isLoading);
  const showNotFound = !isLoading && !summary;
  const headerTitle = summary?.title || (showLoading ? 'Loading…' : 'Content Under Development');
  const headerAuthor = summary?.author || '';
  const headerImage = summary?.image_url || null;

  /* ---------- Inline styles (theme-driven) ---------- */
  const pageStyle = {
    background: T.bg,
    color: T.text,
    minHeight: '100vh',
    transition: 'background 0.35s, color 0.35s',
  };

  const articleBodyStyle = {
    fontFamily: '"Times New Roman", Times, serif',
    fontSize: `${fontSize}px`,
    lineHeight: 1.85,
    textAlign: 'justify',
    hyphens: 'auto',
    WebkitHyphens: 'auto',
    color: T.text,
    background: T.articleBg,
    maxWidth: 780,
    margin: '0 auto',
    padding: '36px 40px',
    borderRadius: 4,
    boxShadow: T.shadow,
    wordBreak: 'break-word',
    transition: 'background 0.35s, color 0.35s, box-shadow 0.35s',
  };

  /* ======================================================================== */
  /*  RENDER                                                                   */
  /* ======================================================================== */
  return (
    <>
      {/* ── Global article typography overrides (theme-driven) ── */}
      <style>{`
        .onjo-article-body p {
          margin: 0 0 1.4em 0;
          text-align: justify;
          hyphens: auto;
          -webkit-hyphens: auto;
        }
        .onjo-article-body h1,
        .onjo-article-body h2,
        .onjo-article-body h3,
        .onjo-article-body h4 {
          font-family: "Times New Roman", Times, serif;
          font-weight: 700;
          letter-spacing: -0.01em;
          margin: 1.8em 0 0.6em;
          line-height: 1.3;
          color: ${T.text};
        }
        .onjo-article-body h2 {
          font-size: 1.45em;
          border-bottom: 1px solid ${T.border};
          padding-bottom: 0.3em;
        }
        .onjo-article-body h3 { font-size: 1.2em; }
        .onjo-article-body blockquote {
          border-left: 4px solid ${T.accent};
          margin: 1.6em 0;
          padding: 0.8em 1.4em;
          background: ${T.tagBg};
          border-radius: 0 4px 4px 0;
          font-style: italic;
          color: ${T.muted};
        }
        .onjo-article-body ul,
        .onjo-article-body ol {
          padding-left: 1.6em;
          margin: 0 0 1.4em;
        }
        .onjo-article-body li { margin-bottom: 0.5em; }

        /* ── LINK STYLE: colored + underline + slight fade on hover ── */
        .onjo-article-body a {
          color: ${T.accent};
          text-decoration: underline;
          text-underline-offset: 3px;
          transition: opacity 0.18s ease;
        }
        .onjo-article-body a:hover {
          opacity: 0.65;
          text-decoration: underline;
        }
        /* ────────────────────────────────────────────────────────── */

        .onjo-article-body img {
          max-width: 100%;
          border-radius: 6px;
          margin: 1.2em 0;
          display: block;
        }
        .onjo-article-body strong { color: ${T.text}; }
        .onjo-article-body em { font-style: italic; }
        .onjo-article-body hr {
          border: none;
          border-top: 1px solid ${T.border};
          margin: 2em 0;
        }

        /* Theme-toggle button */
        .onjo-theme-btn {
          display: inline-flex;
          align-items: center;
          gap: 6px;
          padding: 6px 14px;
          border-radius: 20px;
          border: 1.5px solid ${T.border};
          background: ${T.engBg};
          color: ${T.muted};
          font-size: 13px;
          font-family: "Times New Roman", Times, serif;
          cursor: pointer;
          transition: all 0.2s;
          white-space: nowrap;
        }
        .onjo-theme-btn:hover { border-color: ${T.accent}; color: ${T.accent}; }

        /* Font-size controls */
        .onjo-font-ctrl {
          display: inline-flex;
          align-items: center;
          gap: 4px;
        }
        .onjo-font-ctrl button {
          width: 28px; height: 28px;
          border-radius: 50%;
          border: 1.5px solid ${T.border};
          background: ${T.engBg};
          color: ${T.muted};
          font-size: 14px;
          cursor: pointer;
          display: flex; align-items: center; justify-content: center;
          transition: all 0.2s;
        }
        .onjo-font-ctrl button:hover { border-color: ${T.accent}; color: ${T.accent}; }
        .onjo-font-ctrl span {
          font-size: 12px;
          color: ${T.muted};
          min-width: 36px;
          text-align: center;
          font-family: "Times New Roman", Times, serif;
        }

        /* Reading toolbar */
        .onjo-reading-toolbar {
          display: flex;
          align-items: center;
          justify-content: flex-end;
          gap: 12px;
          max-width: 820px;
          margin: 12px auto 0;
          padding: 0 20px;
          flex-wrap: wrap;
        }

        /* Tag pills */
        .onjo-tag {
          display: inline-block;
          padding: 3px 10px;
          border-radius: 12px;
          background: ${T.tagBg};
          color: ${T.tagColor};
          font-size: 12px;
          font-family: "Times New Roman", Times, serif;
          letter-spacing: 0.03em;
          margin: 2px 3px 2px 0;
          text-transform: capitalize;
        }

        /* Engagement bar */
        .onjo-eng-bar {
          display: flex;
          align-items: center;
          gap: 16px;
          flex-wrap: wrap;
          padding: 10px 16px;
          background: ${T.engBg};
          border-top: 1px solid ${T.border};
          border-bottom: 1px solid ${T.border};
          transition: background 0.35s;
        }

        /* Decorative drop-cap for first paragraph */
        .onjo-article-body > div:first-child > p:first-child::first-letter,
        .onjo-article-body > p:first-child::first-letter {
          float: left;
          font-size: 3.6em;
          line-height: 0.78;
          font-weight: 700;
          color: ${T.accent};
          font-family: "Times New Roman", Times, serif;
          margin: 0.06em 0.1em 0 0;
          padding: 0;
        }

        @keyframes onjo-spin { to { transform: rotate(360deg); } }

        @media (max-width: 600px) {
          .onjo-article-body-wrap { padding: 0 4px !important; }
          .onjo-article-body { padding: 20px 16px !important; }
        }
      `}</style>

      <div
        className={`summary-page ${collapsed ? 'title-collapsed' : ''}`}
        ref={pageRef}
        data-collapsed={collapsed ? '1' : '0'}
        style={pageStyle}
      >
        <Helmet>
          <title>{metaTitle}</title>
          <meta name="description" content={metaDescription} />
          <link rel="canonical" href={pageUrl} />
          <meta property="og:site_name" content={BRAND} />
          <meta property="og:title" content={metaTitle} />
          <meta property="og:description" content={metaDescription} />
          <meta property="og:type" content="article" />
          <meta property="og:url" content={pageUrl} />
          <meta property="og:image" content={ogImage} />
          {summary?.created_at && <meta property="article:published_time" content={summary.created_at} />}
          {(summary?.updated_at || summary?.created_at) && <meta property="article:modified_time" content={summary?.updated_at || summary?.created_at} />}
          {summary?.author && <meta property="article:author" content={summary.author} />}
          {Array.isArray(summary?.tags) && summary.tags.map((t) => (<meta key={`og-tag-${t}`} property="article:tag" content={t} />))}
          <meta name="twitter:card" content="summary_large_image" />
          <meta name="twitter:title" content={metaTitle} />
          <meta name="twitter:description" content={metaDescription} />
          <meta name="twitter:image" content={ogImage} />
          <meta name="robots" content="index, follow" />
          <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(ldJson) }} />
        </Helmet>

        <div className="summary-top-spacer" aria-hidden="true" />

        {/* ── HEADER ── */}
        <header
          className={`summary-header ${collapsed ? 'collapsed' : ''}`}
          ref={headerRef}
          role="banner"
          aria-expanded={!collapsed}
          style={{ background: T.headerBg, borderBottom: `1px solid ${T.border}` }}
        >
          <div className="summary-thumb-wrap" aria-hidden="true">
            {headerImage ? (
              <img
                className={`summary-thumb ${collapsed ? 'collapsed' : ''}`}
                src={headerImage}
                alt={headerTitle}
                style={{ borderRadius: 4, boxShadow: '0 2px 12px rgba(0,0,0,0.15)' }}
              />
            ) : (
              <div
                className={`summary-thumb placeholder ${collapsed ? 'collapsed' : ''}`}
                style={{ background: T.tagBg }}
              />
            )}
          </div>

          <div className="summary-title-left">
            <h1
              className="summary-title"
              title={headerTitle}
              style={{ fontFamily: '"Times New Roman", Times, serif', color: T.text, letterSpacing: '-0.01em' }}
            >
              {headerTitle}
            </h1>
            <div className="summary-meta-row" aria-hidden="false">
              <div
                className="summary-author"
                title={headerAuthor || ''}
                style={{ fontFamily: '"Times New Roman", Times, serif', color: T.muted, fontStyle: 'italic' }}
              >
                <span className="author-prefix">by&nbsp;</span>
                <span className="author-name">{headerAuthor}</span>
              </div>
              <div className="summary-difficulty-inline">
                {renderDifficultyBadge(summary?.difficulty_level)}
              </div>
            </div>

            {/* Tags row */}
            {Array.isArray(summary?.tags) && summary.tags.length > 0 && (
              <div style={{ marginTop: 6 }}>
                {summary.tags.slice(0, 5).map((tag) => (
                  <span key={tag} className="onjo-tag">{tag}</span>
                ))}
              </div>
            )}
          </div>

          <div className="summary-actions" style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
            {(() => {
              let affiliateUrl = null, affiliateLabel = null, affiliateType = null;
              const rawAffiliate = summary?.affiliate_link ?? null;
              if (rawAffiliate) {
                try {
                  if (typeof rawAffiliate === 'string') {
                    const parts = rawAffiliate.split('|', 2).map(p => (p || '').trim());
                    if (parts.length === 2 && parts[1]) { affiliateType = (parts[0] || '').toLowerCase(); affiliateUrl = parts[1]; }
                    else { affiliateType = 'book'; affiliateUrl = rawAffiliate.trim(); }
                  } else if (typeof rawAffiliate === 'object' && rawAffiliate !== null) {
                    if (rawAffiliate.url) { affiliateUrl = String(rawAffiliate.url); affiliateType = (rawAffiliate.type || 'book').toLowerCase(); }
                    else if (rawAffiliate.link) { affiliateUrl = String(rawAffiliate.link); affiliateType = (rawAffiliate.type || 'book').toLowerCase(); }
                  }
                } catch (e) {
                  try { affiliateUrl = String(rawAffiliate); affiliateType = 'book'; } catch (ee) { affiliateUrl = null; affiliateType = null; }
                }
              }
              if (affiliateUrl) {
                affiliateLabel = affiliateType === 'pdf' ? 'Get PDF' : (affiliateType === 'app' ? 'Open App' : 'Get Book');
              }
              return affiliateUrl && affiliateLabel ? (
                <a
                  className={`affiliate-btn ${affiliateType ? `affiliate-${affiliateType}` : ''}`}
                  href={affiliateUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  style={{
                    background: T.accent,
                    color: '#fff',
                    borderRadius: 4,
                    padding: '7px 16px',
                    fontFamily: '"Times New Roman", Times, serif',
                    fontWeight: 700,
                    fontSize: 13,
                    textDecoration: 'none',
                    letterSpacing: '0.03em',
                  }}
                >
                  {affiliateLabel}
                </a>
              ) : null;
            })()}

            <button className="hf-btn share-btn" type="button" onClick={handleShare} title="Share" aria-label="Share this content">
              <FaShareAlt />
            </button>

            {ownerId && currentUserId && ownerId === currentUserId && (
              <button
                className="hf-btn"
                type="button"
                onClick={() => setShowEdit(true)}
                style={{ fontFamily: '"Times New Roman", Times, serif' }}
              >
                Edit
              </button>
            )}
          </div>

          {/* ── ENGAGEMENT ROW ── */}
          <div className="onjo-eng-bar" role="group" aria-label="Engagement">
            <button
              className={`eng-btn like-btn ${userHasLiked ? 'liked' : ''}`}
              onClick={handleLike}
              aria-pressed={userHasLiked}
              title="Like"
              style={{ color: userHasLiked ? '#c0392b' : T.muted }}
            >
              <FaHeart /> <span>{likes ?? 0}</span>
            </button>
            <div className="eng-item" title="Comments" style={{ color: T.muted }}>
              <FaComment /> <span>{commentsCount ?? 0}</span>
            </div>
            <div className="eng-item" title="Views" style={{ color: T.muted }}>
              <FaEye /> <span>{views ?? 0}</span>
            </div>
            <div className="rating-block" title={`Average rating ${avgRating || 0}`}>
              <div className="rating-stars">{renderStars('md')}</div>
              <div
                className="avg-text"
                style={{ color: T.accent, fontFamily: '"Times New Roman", Times, serif', fontWeight: 700 }}
              >
                {avgRating ? Number(avgRating).toFixed(1) : '0.0'}
              </div>
            </div>
          </div>
        </header>

        {/* ── READING TOOLBAR ── */}
        {!showLoading && (
          <div className="onjo-reading-toolbar">
            {/* Theme toggle */}
            <button
              className="onjo-theme-btn"
              onClick={() => setTheme(t => (t === 'white' ? 'brown' : 'white'))}
              aria-label="Toggle reading theme"
            >
              {theme === 'white' ? '☾ Night' : '☀ Day'}
            </button>

            {/* Font size */}
            <div className="onjo-font-ctrl">
              <button
                onClick={() => setFontSize(s => Math.max(13, s - 1))}
                aria-label="Decrease font size"
                title="Smaller text"
              >
                A−
              </button>
              <span>{fontSize}px</span>
              <button
                onClick={() => setFontSize(s => Math.min(28, s + 1))}
                aria-label="Increase font size"
                title="Larger text"
              >
                A+
              </button>
            </div>
          </div>
        )}

        {/* ── YOUTUBE EMBED ── */}
        {!showLoading && extractYouTubeId(summary?.youtube_url) && (
          <div style={{ maxWidth: 820, margin: '16px auto', padding: '0 20px' }}>
            <div className="youtube-embed" style={{ marginBottom: 12 }}>
              <div className="embed-inner">
                <iframe
                  className="youtube-iframe"
                  title="YouTube clip"
                  src={`https://www.youtube-nocookie.com/embed/${extractYouTubeId(summary?.youtube_url)}`}
                  frameBorder="0"
                  allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                  allowFullScreen
                />
              </div>
            </div>
          </div>
        )}

        {/* ── ARTICLE BODY ── */}
        <div className="onjo-article-body-wrap" style={{ maxWidth: 820, margin: '20px auto 32px', padding: '0 20px' }}>
          {showLoading ? (
            <div style={articleBodyStyle}>
              <InlineLoader label="Loading content" />
            </div>
          ) : showNotFound ? (
            <div style={{ ...articleBodyStyle, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', color: T.muted, textAlign: 'center', padding: '40px 32px' }}>
              <div style={{ fontSize: 42, marginBottom: 16, opacity: 0.7 }}>📖</div>
              <div style={{ fontSize: 20, fontWeight: 600, marginBottom: 10, color: T.text, fontFamily: '"Times New Roman", Times, serif' }}>Content Under Development</div>
              <div style={{ fontSize: 15, lineHeight: 1.6, color: T.muted, marginBottom: 6, maxWidth: 480, fontFamily: '"Times New Roman", Times, serif' }}>
                This resource is being carefully curated to ensure the highest quality insights.
              </div>
              <div style={{ fontSize: 14, lineHeight: 1.6, color: T.muted, marginBottom: 6, maxWidth: 460, fontFamily: '"Times New Roman", Times, serif' }}>
                We prioritize depth and accuracy over speed.
              </div>
              <div style={{ display: 'flex', gap: 12, alignItems: 'center', flexWrap: 'wrap', justifyContent: 'center' }}>
                <button
                  onClick={handleBackToArticle}
                  className="hf-btn"
                  style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '12px 24px', fontSize: 15, fontWeight: 500, backgroundColor: T.accent, color: '#fff', border: 'none', borderRadius: 8, cursor: 'pointer', transition: 'all 0.2s', fontFamily: '"Times New Roman", Times, serif' }}
                >
                  <FaArrowLeft /> Back to Article
                </button>
              </div>
              <div style={{ fontSize: 14, lineHeight: 1.6, color: T.accent, fontWeight: 700, marginTop: 16, marginBottom: 24, maxWidth: 460, fontFamily: '"Times New Roman", Times, serif' }}>
                Explore related content below while we expand our library.
              </div>
            </div>
          ) : (
            // ── Segmented article render with inline ads (identical logic to File 3) ──
            <article
              className="summary-body onjo-article-body"
              style={articleBodyStyle}
              onClick={onArticleClick}
            >
              {articleSegments.map((segment, idx) => {
                if (segment.type === 'ad') {
                  const workbook = slotWorkbooks[segment.adIndex - 1] ?? null;
                  if (!workbook) return null;
                  return (
                    <AdSlot
                      key={`ad-${idx}`}
                      index={segment.adIndex}
                      workbook={workbook}
                    />
                  );
                }
                return (
                  <div
                    key={`para-${idx}`}
                    dangerouslySetInnerHTML={{ __html: segment.content }}
                  />
                );
              })}
            </article>
          )}
        </div>

        {/* ── RECOMMENDATIONS ── */}
        {(isRecommending || (recommendedContent && recommendedContent.length > 0)) && (
          <HorizontalCarousel
            title="More like this"
            items={recommendedContent}
            loading={isRecommending}
            skeletonCount={4}
            tag={summary?.tags && summary.tags.length > 0 ? summary.tags[0] : null}
            sortKey="views"
          >
            {recommendedContent.map(item => (
              <BookSummaryCard key={String(item.id || item.slug)} summary={item} />
            ))}
          </HorizontalCarousel>
        )}

        {!isRecommending && recommendedContent && recommendedContent.length === 0 && !recError && (
          <div className="rec-empty" style={{ padding: '12px 16px', color: T.muted, fontFamily: '"Times New Roman", Times, serif' }}>
            No similar items found.
          </div>
        )}

        {recError && (
          <div className="rec-error" style={{ padding: '12px 16px', color: '#b45309' }}>
            {recError}{' '}
            <button onClick={() => {
              if (Array.isArray(summary?.tags) && summary.tags.length > 0) fetchRecommendedByTags(summary.tags, 10, summary.id);
              else if (summary?.category) fetchRecommendedByCategory(summary.category, 10, summary.id);
            }}>Retry</button>
          </div>
        )}

        {/* ── COMMENTS ── */}
        <section
          className="summary-comments"
          style={{ maxWidth: 820, margin: '0 auto', padding: '0 20px 40px' }}
        >
          <h3 style={{
            fontFamily: '"Times New Roman", Times, serif',
            color: T.text,
            borderBottom: `1px solid ${T.border}`,
            paddingBottom: 8,
            marginBottom: 20,
          }}>
            Comments
          </h3>
          {summary?.id
            ? <CommentsSection postId={summary.id} />
            : <div style={{ color: T.muted, fontFamily: '"Times New Roman", Times, serif' }}>Comments will appear once the content loads.</div>
          }
        </section>

        {showEdit && (
          <EditSummaryForm
            summary={summary}
            onClose={() => setShowEdit(false)}
            onUpdate={(updatedRow) => handleEditSaved(updatedRow)}
          />
        )}
      </div>
    </>
  );
};

export default SummaryView;