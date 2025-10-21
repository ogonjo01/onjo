// src/components/SummaryView/SummaryView.jsx
import React, { useEffect, useRef, useState, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { supabase } from '../../supabase/supabaseClient';
import { FaHeart, FaStar, FaComment, FaEye } from 'react-icons/fa';
import CommentsSection from '../CommentsSection/CommentsSection';
import HorizontalCarousel from '../HorizontalCarousel/HorizontalCarousel';
import BookSummaryCard from '../BookSummaryCard/BookSummaryCard';
import DOMPurify from 'dompurify';
import './SummaryView.css';

const SELECT_WITH_COUNTS = `
  *,
  likes_count:likes!likes_post_id_fkey(count),
  views_count:views!views_post_id_fkey(count),
  comments_count:comments!comments_post_id_fkey(count)
`;

const normalizeRow = (r = {}) => {
  const toNum = (v) => {
    if (v == null) return 0;
    if (Array.isArray(v)) return Number(v[0]?.count ?? 0);
    if (typeof v === 'object' && 'count' in v) return Number(v.count || 0);
    return Number(v || 0);
  };

  return {
    id: r.id,
    slug: r.slug ?? null,
    title: r.title,
    author: r.author,
    summary: r.summary,
    category: r.category,
    image_url: r.image_url,
    affiliate_link: r.affiliate_link,
    likes_count: toNum(r.likes_count),
    views_count: toNum(r.views_count),
    comments_count: toNum(r.comments_count),
    avg_rating: Number(r.avg_rating ?? 0),
    created_at: r.created_at ?? null,
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

  useEffect(() => {
    let mounted = true;

    const loadMinimalSummary = async () => {
      setIsLoading(true);
      setSummary(null);
      setPostId(null);

      try {
        const { data: slugData, error: slugError } = await supabase
          .from('book_summaries')
          .select('id, slug, title, author, summary, category, image_url, affiliate_link, created_at')
          .eq('slug', param)
          .maybeSingle();

        if (slugError) console.warn('Slug fetch error (will try id):', slugError);

        let data = slugData ?? null;
        let fetchedBy = null;

        if (data) {
          fetchedBy = 'slug';
        } else {
          const { data: idData, error: idError } = await supabase
            .from('book_summaries')
            .select('id, slug, title, author, summary, category, image_url, affiliate_link, created_at')
            .eq('id', param)
            .maybeSingle();

          if (idError) console.error('ID fetch error:', idError);
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

        setSummary({
          ...data,
          category: (data?.category == null) ? '' : String(data.category).trim(),
        });
        setPostId(data.id);

        setLikes(0);
        setViews(0);
        setCommentsCount(0);

        setIsLoading(false);

        backgroundFetchFollowups(data.id, data.category).catch((e) => console.debug('[backgroundFetchFollowups] error', e));
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
      const { data, error } = await supabase
        .from('book_summaries')
        .select(SELECT_WITH_COUNTS)
        .eq('id', resolvedPostId)
        .single();

      if (!error && data) {
        const formatted = {
          ...data,
          likes_count: Array.isArray(data?.likes_count) ? Number(data?.likes_count?.[0]?.count ?? 0) : Number(data?.likes_count ?? 0),
          views_count: Array.isArray(data?.views_count) ? Number(data?.views_count?.[0]?.count ?? 0) : Number(data?.views_count ?? 0),
          comments_count: Array.isArray(data?.comments_count) ? Number(data?.comments_count?.[0]?.count ?? 0) : Number(data?.comments_count ?? 0),
          category: (data?.category == null) ? '' : String(data.category).trim(),
        };
        setSummary((prev) => prev ? { ...prev, ...formatted } : formatted);
        setLikes(formatted.likes_count || 0);
        setViews(formatted.views_count || 0);
        setCommentsCount(formatted.comments_count || 0);
      } else if (error) console.debug('counts fetch error', error);

      try {
        const { data: ratingData, error: ratingErr } = await supabase.rpc('get_average_rating', { p_post_id: resolvedPostId });
        if (!ratingErr && Array.isArray(ratingData) && ratingData[0] && ratingData[0].average_rating !== null) {
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

      if ((category ?? '').trim()) fetchRecommended(category, 10, resolvedPostId).catch(() => {});
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
        const { data: ratingData, error: ratingErr } = await supabase.rpc('get_average_rating', { p_post_id: postId });
        if (!ratingErr && Array.isArray(ratingData) && ratingData[0] && ratingData[0].average_rating !== null) {
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
      const catRaw = category ?? '';
      const cat = String(catRaw).trim();
      if (!cat) {
        setRecommendedContent([]);
        return [];
      }

      try {
        const rpcRes = await supabase.rpc('get_top_viewed_by_category', { p_limit: limit, p_category: cat });
        if (!rpcRes.error && Array.isArray(rpcRes.data)) {
          const rows = (rpcRes.data || []).map(normalizeRow).filter(r => String(r.id) !== String(resolvedPostId));
          setRecommendedContent(rows.slice(0, limit));
          return rows.slice(0, limit);
        }
      } catch (rpcErr) {}

      const { data, error } = await supabase
        .from('book_summaries')
        .select(SELECT_WITH_COUNTS)
        .neq('id', resolvedPostId)
        .eq('category', cat)
        .limit(500);

      if (error) throw error;

      const rows = (data || []).map(normalizeRow).filter(r => String(r.id) !== String(resolvedPostId));
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
      console.error('Error fetching recommended content:', err);
      setRecError('Unable to load recommendations.');
      setRecommendedContent([]);
      return [];
    } finally {
      setIsRecommending(false);
    }
  }, []);

  useEffect(() => {
    if (!summary) return;
    if (summary.category) {
      fetchRecommended(summary.category, 10, summary.id);
    } else {
      setRecommendedContent([]);
    }
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

  if (!summary) {
    return <div style={{ padding: 28 }}>Summary not found.</div>;
  }

  const affiliateLink = summary.affiliate_link || null;
  const processedSummary = summary.summary || '';

  return (
    <div
      className={`summary-page ${collapsed ? 'title-collapsed' : ''}`}
      ref={pageRef}
      data-collapsed={collapsed ? '1' : '0'}
    >
      <div className="summary-top-spacer" aria-hidden="true" />
      <header
        className={`summary-header ${collapsed ? 'collapsed' : ''}`}
        ref={headerRef}
        role="banner"
        aria-expanded={!collapsed}
      >
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
        <div className="summary-actions">
          {affiliateLink && (
            <a className="affiliate-btn" href={affiliateLink} target="_blank" rel="noopener noreferrer">Get Book</a>
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

      <article className="summary-body" dangerouslySetInnerHTML={{ __html: processedSummary }} />

      {(isRecommending || (recommendedContent && recommendedContent.length > 0)) && (
        <HorizontalCarousel
          title={`More from ${summary.category || 'this category'}`}
          items={recommendedContent}
          loading={isRecommending}
          skeletonCount={4}
          viewAllLink={`/explore?category=${encodeURIComponent(summary.category || '')}`}
        >
          {recommendedContent.map(item => <BookSummaryCard key={item.id} summary={item} />)}
        </HorizontalCarousel>
      )}

      {!isRecommending && recommendedContent && recommendedContent.length === 0 && !recError && (
        <div className="rec-empty" style={{ padding: '12px 16px', color: '#6b7280' }}>No popular items found in this category.</div>
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
    </div>
  );
};

export default SummaryView;