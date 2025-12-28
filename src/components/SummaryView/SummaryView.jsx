// src/components/SummaryView/SummaryView.jsx
import React, { useEffect, useRef, useState, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { supabase } from '../../supabase/supabaseClient';
import { FaHeart, FaStar, FaComment, FaEye } from 'react-icons/fa';
import CommentsSection from '../CommentsSection/CommentsSection';
import HorizontalCarousel from '../HorizontalCarousel/HorizontalCarousel';
import BookSummaryCard from '../BookSummaryCard/BookSummaryCard';
import DOMPurify from 'dompurify';
import EditSummaryForm from '../EditSummaryForm/EditSummaryForm';
import './SummaryView.css';

const SELECT_WITH_COUNTS = `*,
  likes_count:likes!likes_post_id_fkey(count),
  views_count:views!views_post_id_fkey(count),
  comments_count:comments!comments_post_id_fkey(count)
`;

/* normalizeRow (keeps minimal shape) */
const normalizeRow = (r = {}) => {
  const toNum = (v) => {
    if (v == null) return 0;
    if (Array.isArray(v)) return Number(v[0]?.count ?? 0);
    if (typeof v === 'object' && 'count' in v) return Number(v.count || 0);
    return Number(v || 0);
  };

  const tags = Array.isArray(r.tags)
    ? r.tags.map(t => (typeof t === 'string' ? t.trim().toLowerCase() : String(t)))
    : [];

  return {
    id: r.id,
    slug: r.slug ?? null,
    title: r.title,
    author: r.author,
    summary: r.summary ?? null,
    description: r.description ?? null,
    category: r.category,
    image_url: r.image_url,
    affiliate_link: r.affiliate_link,
    youtube_url: r.youtube_url ?? null,
    tags,
    user_id: r.user_id ?? null,
    likes_count: toNum(r.likes_count),
    views_count: toNum(r.views_count),
    comments_count: toNum(r.comments_count),
    avg_rating: Number(r.avg_rating ?? 0),
    created_at: r.created_at ?? null,
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

// strip HTML (simple), used as fallback
const stripHtml = (html = '') => String(html || '').replace(/<[^>]*>/g, '').trim();

// sanitize + truncate helper for card descriptions
const makeSafeDescription = (raw = '', maxLen = 140) => {
  const cleaned = DOMPurify.sanitize(String(raw || ''), { ALLOWED_TAGS: [] });
  const plain = stripHtml(cleaned);
  return plain.length > maxLen ? `${plain.slice(0, maxLen)}…` : plain;
};

/* Helper: build a lightweight card object (NO `summary` field) */
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
    user_id: nr.user_id || null,
    created_at: nr.created_at || null,
  };
};

const SummaryView = () => {
  const { param } = useParams();
  const navigate = useNavigate();
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

  const pageRef = useRef(null);
  const headerRef = useRef(null);

  const [recommendedContent, setRecommendedContent] = useState([]);
  const [isRecommending, setIsRecommending] = useState(false);
  const [recError, setRecError] = useState(null);

  const [ownerId, setOwnerId] = useState(null);
  const [currentUserId, setCurrentUserId] = useState(null);
  const [showEdit, setShowEdit] = useState(false);

  useEffect(() => {
    (async () => {
      try {
        const { data } = await supabase.auth.getUser();
        setCurrentUserId(data?.user?.id ?? null);
      } catch (e) {
        setCurrentUserId(null);
      }
    })();
  }, []);

  useEffect(() => {
    try {
      if (pageRef && pageRef.current && typeof pageRef.current.scrollTo === 'function') {
        pageRef.current.scrollTo({ top: 0, behavior: 'smooth' });
      } else if (typeof window !== 'undefined' && typeof window.scrollTo === 'function') {
        window.scrollTo({ top: 0, behavior: 'smooth' });
      }
    } catch (e) {}
  }, [param]);

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

        setIsLoading(false);

        backgroundFetchFollowups(normalized.id, normalized.category).catch((e) => console.debug(e));
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
  }, [param, navigate]);

  const backgroundFetchFollowups = async (resolvedPostId, category = '') => {
    try {
      if (!resolvedPostId) return;

      try {
        const { data, error } = await supabase
          .from('book_summaries')
          .select(SELECT_WITH_COUNTS)
          .eq('id', resolvedPostId)
          .single();

        if (!error && data) {
          const formatted = normalizeRow(data);
          formatted.category = (formatted?.category == null) ? '' : String(formatted.category).trim();
          setSummary(prev => prev ? { ...prev, ...formatted } : formatted);
          setOwnerId(formatted.user_id ?? null);
          setLikes(formatted.likes_count || 0);
          setViews(formatted.views_count || 0);
          setCommentsCount(formatted.comments_count || 0);
        }
      } catch (e) {
        console.warn('[backgroundFetchFollowups] initial counts fetch error', e);
      }

      try {
        const { data: ratingData, error: ratingErr } = await supabase.rpc('get_average_rating', { p_post_id: resolvedPostId });
        if (!ratingErr && Array.isArray(ratingData) && ratingData[0] && ratingData[0].average_rating !== null) {
          setAvgRating(Math.round(Number(ratingData[0].average_rating) * 10) / 10);
        } else if (ratingErr) {
          console.warn('[backgroundFetchFollowups] get_average_rating error', ratingErr);
        }
      } catch (e) {
        console.warn('[backgroundFetchFollowups] get_average_rating unexpected error', e);
      }

      try {
        const { data: { user } } = await supabase.auth.getUser();
        if (user) {
          try {
            const [likesRes, ratingRes] = await Promise.all([
              supabase.from('likes').select('id').eq('post_id', resolvedPostId).eq('user_id', user.id),
              supabase.from('ratings').select('rating').eq('post_id', resolvedPostId).eq('user_id', user.id).maybeSingle(),
            ]);
            if (likesRes?.data && likesRes.data.length) setUserHasLiked(true);
            if (ratingRes?.data && ratingRes.data.rating) setUserRating(ratingRes.data.rating);
          } catch (e) {
            console.warn('[backgroundFetchFollowups] user-specific queries error', e);
          }
        }
      } catch (e) {
        console.warn('[backgroundFetchFollowups] auth.getUser error', e);
      }

      try {
        const insertPayload = [{ post_id: resolvedPostId, user_id: currentUserId ?? null }];
        console.log('[backgroundFetchFollowups] inserting view for', resolvedPostId, 'payload:', insertPayload);
        const { data: insertData, error: insertErr } = await supabase
          .from('views')
          .insert(insertPayload);

        if (insertErr) {
          console.error('[backgroundFetchFollowups] views insert error', insertErr);
          setViews((v) => (Number(v) || 0) + 1);
        } else {
          setViews((v) => (Number(v) || 0) + 1);

          try {
            const { data: refreshed, error: refreshErr } = await supabase
              .from('book_summaries')
              .select('views_count, likes_count, comments_count')
              .eq('id', resolvedPostId)
              .maybeSingle();

            if (refreshErr) {
              console.warn('[backgroundFetchFollowups] could not refresh counts', refreshErr);
            } else if (refreshed) {
              const authoritativeViews = Number(refreshed.views_count ?? 0);
              console.log('[backgroundFetchFollowups] refreshed views_count from DB:', authoritativeViews);
              setViews(authoritativeViews);
              setSummary(prev => prev ? { ...prev, views_count: authoritativeViews } : prev);
              setLikes(Number(refreshed.likes_count ?? 0));
              setCommentsCount(Number(refreshed.comments_count ?? 0));
            }
          } catch (e) {
            console.error('[backgroundFetchFollowups] unexpected error while re-fetching counts', e);
          }
        }
      } catch (e) {
        console.error('[backgroundFetchFollowups] unexpected error inserting view', e);
        setViews((v) => (Number(v) || 0) + 1);
      }

      if ((category ?? '').trim()) {
        fetchRecommended(category, 10, resolvedPostId).catch(err => {
          console.warn('[backgroundFetchFollowups] fetchRecommended error', err);
        });
      }
    } catch (err) {
      console.error('backgroundFetchFollowups error:', err);
    }
  };

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

  const fetchRecommended = useCallback(async (category, limit = 10, resolvedPostId = null) => {
    setIsRecommending(true);
    setRecError(null);
    try {
      const cat = String(category ?? '').trim();
      if (!cat) { setRecommendedContent([]); return []; }

      // TEMPORARILY DISABLED RPC - it doesn't return comments_count
      // try {
      //   const rpcRes = await supabase.rpc('get_top_viewed_by_category', { p_limit: limit, p_category: cat });
      //   if (!rpcRes.error && Array.isArray(rpcRes.data)) {
      //     let rows = (rpcRes.data || []).map(d => {
      //       console.log('[fetchRecommended RPC] Raw data from RPC:', d);
      //       const nr = normalizeRow(d);
      //       console.log('[fetchRecommended RPC] After normalizeRow:', nr);
      //       const light = buildLightItem(nr, d);
      //       console.log('[fetchRecommended RPC] After buildLightItem:', light);
      //       return light;
      //     }).filter(r => String(r.id) !== String(resolvedPostId));

      //     rows = rows.map(r => {
      //       const copy = { ...r };
      //       if ('summary' in copy) delete copy.summary;
      //       copy.description = makeSafeDescription(copy.description || '', 140);
      //       return copy;
      //     });

      //     console.log('[fetchRecommended RPC] Final rows being set:', rows);
      //     setRecommendedContent(rows.slice(0, limit));
      //     return rows.slice(0, limit);
      //   }
      // } catch (rpcErr) {
      //   console.debug('RPC recommended failed, fallback to select', rpcErr);
      // }

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

      console.log('[fetchRecommended FALLBACK] Raw data from Supabase:', data);

      let rows = (data || []).map(d => {
        console.log('[fetchRecommended FALLBACK] Processing item:', {
          id: d.id,
          title: d.title,
          raw_comments_count: d.comments_count,
          raw_likes_count: d.likes_count,
          raw_views_count: d.views_count
        });
        
        const nr = normalizeRow(d);
        console.log('[fetchRecommended FALLBACK] After normalizeRow:', {
          id: nr.id,
          title: nr.title,
          comments_count: nr.comments_count,
          likes_count: nr.likes_count,
          views_count: nr.views_count
        });
        
        const light = buildLightItem(nr, d);
        console.log('[fetchRecommended FALLBACK] After buildLightItem:', {
          id: light.id,
          title: light.title,
          comments_count: light.comments_count,
          likes_count: light.likes_count,
          views_count: light.views_count
        });
        
        return light;
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

      const curTags = Array.isArray(summary?.tags) ? summary.tags.map(t => (t || '').toLowerCase()) : [];
      if (curTags.length > 0) {
        const tagSet = new Set(curTags);
        rows = rows
          .map(r => {
            const itemTags = Array.isArray(r.tags) ? r.tags.map(t => (t || '').toLowerCase()) : [];
            const matchCount = itemTags.reduce((acc, t) => acc + (tagSet.has(t) ? 1 : 0), 0);
            return { r, matchCount };
          })
          .sort((a, b) => {
            if (b.matchCount !== a.matchCount) return b.matchCount - a.matchCount;
            return (b.r.views_count || 0) - (a.r.views_count || 0);
          })
          .map(x => x.r);
      }

      rows = rows.map(r => {
        const copy = { ...r };
        if ('summary' in copy) delete copy.summary;
        copy.description = makeSafeDescription(copy.description || '', 140);
        return copy;
      });

      const top = rows.slice(0, limit);
      console.log('[fetchRecommended FALLBACK] Final rows being set:', top);
      setRecommendedContent(top);
      return top;
    } catch (err) {
      console.error('Error fetching recommended content:', err);
      setRecError('Unable to load recommendations.');
      setRecommendedContent([]);
      return [];
    } finally {
      setIsRecommending(false);
    }
  }, [summary]);

  useEffect(() => {
    if (!summary) return;
    if (summary.category) fetchRecommended(summary.category, 10, summary.id);
    else setRecommendedContent([]);
  }, [summary, fetchRecommended]);

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
  const affiliateLink = summary.affiliate_link || null;
  const youtubeId = extractYouTubeId(summary.youtube_url);

  const onClickTag = (tag) => { if (!tag) return; navigate(`/explore?tag=${encodeURIComponent(tag)}`); };

  const handleEditSaved = (updatedRow) => {
    if (!updatedRow) { setShowEdit(false); return; }
    const normalized = normalizeRow(updatedRow);
    setSummary(prev => prev ? { ...prev, ...normalized } : normalized);
    backgroundFetchFollowups(normalized.id, normalized.category).catch(() => {});
    try { window.dispatchEvent(new CustomEvent('summary:updated', { detail: { id: normalized.id } })); } catch (e) {}
    setShowEdit(false);
  };

  return (
    <div className={`summary-page ${collapsed ? 'title-collapsed' : ''}`} ref={pageRef} data-collapsed={collapsed ? '1' : '0'}>
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
          {affiliateLink && <a className="affiliate-btn" href={affiliateLink} target="_blank" rel="noopener noreferrer">Get Book</a>}
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
        {summary.description ? (
          <div
            className="summary-description-block"
            style={{ marginBottom: 12, color: '#374151', fontWeight: 600 }}
            dangerouslySetInnerHTML={{ __html: DOMPurify.sanitize(String(summary.description)) }}
          />
        ) : null}

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
          title={`More from ${summary.category || 'this category'}`}
          items={recommendedContent}
          loading={isRecommending}
          skeletonCount={4}
          viewAllLink={`/explore?category=${encodeURIComponent(summary.category || '')}`}
        >
          {recommendedContent.map(item => {
            const card = {
              ...item,
              likes_count: Number(item.likes_count) || 0,
              views_count: Number(item.views_count) || 0,
              comments_count: Number(item.comments_count) || 0,
              avg_rating: Number(item.avg_rating) || 0,
              description: makeSafeDescription(item.description || '', 140)
            };

            console.log('[SummaryView] Passing to BookSummaryCard:', {
              title: card.title,
              comments_count: card.comments_count,
              likes_count: card.likes_count,
              views_count: card.views_count
            });

            return (
              <BookSummaryCard
                key={String(item.id || item.slug)}
                summary={card}
              />
            );
          })}
        </HorizontalCarousel>
      )}

      {!isRecommending && recommendedContent && recommendedContent.length === 0 && !recError && (
        <div className="rec-empty" style={{ padding: '12px 16px', color: '#6b7280' }}>
          No popular items found in this category.
        </div>
      )}

      {recError && (
        <div className="rec-error" style={{ padding: '12px 16px', color: '#b45309' }}>
          {recError} <button onClick={() => fetchRecommended(summary.category, 10, summary.id)}>Retry</button>
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