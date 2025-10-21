import React, { useEffect, useRef, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { supabase } from '../../supabase/supabaseClient';
import { FaHeart, FaStar, FaComment, FaEye } from 'react-icons/fa';
import CommentsSection from '../CommentsSection/CommentsSection';
import DOMPurify from 'dompurify';
import './SummaryModal.css';

/**
 * Defensive modal that forces header/category to slide by setting inline styles with !important.
 * This avoids CSS specificity issues and selector mismatch problems.
 */

const HEADER_SELECTORS = ['.og-header', '.app-header', '.header', 'header'];
const CATEGORY_SELECTOR = '.category-filter-container';

export default function SummaryModal() {
  const { id } = useParams();
  const navigate = useNavigate();

  const [summary, setSummary] = useState(null);
  const [isLoading, setIsLoading] = useState(true);

  // engagement / rating states
  const [likes, setLikes] = useState(0);
  const [userHasLiked, setUserHasLiked] = useState(false);
  const [views, setViews] = useState(0);
  const [commentsCount, setCommentsCount] = useState(0);
  const [averageRating, setAverageRating] = useState(0);
  const [userRating, setUserRating] = useState(0);
  const [hoverRating, setHoverRating] = useState(0);
  const [savingRating, setSavingRating] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');

  // UI refs
  const modalRef = useRef(null);
  const imageRef = useRef(null);
  const tickingRef = useRef(false);
  const [imageCollapsed, setImageCollapsed] = useState(false);

  // store original inline style attribute for global nodes so we can restore
  const originalInlineMapRef = useRef(new Map());

  // lock body scroll while modal open (but we will forcibly transform header via JS)
  useEffect(() => {
    const prev = document.body.style.overflow || '';
    document.body.style.overflow = 'hidden';
    // ensure body does not already have hide class
    document.body.classList.remove('modal-open-hide-global');
    return () => {
      document.body.style.overflow = prev;
      document.body.classList.remove('modal-open-hide-global');
      // restore inline styles on unmount
      restoreGlobalInlineStyles();
    };
  }, []);

  // fetch summary + counts + ratings
  useEffect(() => {
    let mounted = true;
    const load = async () => {
      setIsLoading(true);
      setErrorMsg('');
      try {
        const { data, error } = await supabase
          .from('book_summaries')
          .select(`
            *,
            likes_count:likes!likes_post_id_fkey(count),
            views_count:views!views_post_id_fkey(count),
            comments_count:comments!comments_post_id_fkey(count)
          `)
          .eq('id', id)
          .single();

        if (error) throw error;

        const formatted = {
          ...data,
          likes_count: data?.likes_count?.[0]?.count || 0,
          views_count: data?.views_count?.[0]?.count || 0,
          comments_count: data?.comments_count?.[0]?.count || 0,
        };

        if (!mounted) return;

        setSummary(formatted);
        setLikes(formatted.likes_count);
        setViews(formatted.views_count);
        setCommentsCount(formatted.comments_count);

        // get avg rating
        try {
          const { data: ratingData, error: ratingErr } = await supabase.rpc('get_average_rating', { p_post_id: id });
          if (!ratingErr && ratingData?.[0]?.average_rating !== null) {
            setAverageRating(Math.round(Number(ratingData[0].average_rating) * 10) / 10);
          }
        } catch (rpcErr) {
          console.warn('rpc avg rating error', rpcErr);
        }

        // check user-specific like & rating
        const { data: { user } } = await supabase.auth.getUser();
        if (user) {
          const [{ data: likeRows }, { data: myRatingRow }] = await Promise.all([
            supabase.from('likes').select('id').eq('post_id', id).eq('user_id', user.id),
            supabase.from('ratings').select('rating').eq('post_id', id).eq('user_id', user.id).single(),
          ]);
          if (likeRows && likeRows.length > 0) setUserHasLiked(true);
          if (myRatingRow && myRatingRow.rating) setUserRating(myRatingRow.rating);
        }

        // increment views (best-effort)
        try {
          await supabase.rpc('increment_views', { post_id: id });
          setViews((v) => (Number(v) || 0) + 1);
        } catch (_) {}
      } catch (err) {
        console.error('Error loading summary modal:', err);
        setErrorMsg('Failed to load summary. Please try again.');
      } finally {
        if (mounted) setIsLoading(false);
      }
    };

    load();
    return () => { mounted = false; };
  }, [id]);

  // small helper: save original inline style attribute for node
  const saveOriginalInline = (node) => {
    if (!node) return;
    if (!originalInlineMapRef.current.has(node)) {
      originalInlineMapRef.current.set(node, node.getAttribute('style') || '');
    }
  };

  // restore original inline styles from saved map
  const restoreGlobalInlineStyles = () => {
    originalInlineMapRef.current.forEach((styleText, node) => {
      try {
        if (styleText) node.setAttribute('style', styleText);
        else node.removeAttribute('style');
      } catch (e) {
        // ignore
      }
    });
    originalInlineMapRef.current.clear();
    // also remove body class as defensive
    document.body.classList.remove('modal-open-hide-global');
  };

  // apply forced inline styles using setProperty with priority 'important'
  const forceSlideUpGlobalNodes = () => {
    // also add the body class (your CSS may respond to it)
    document.body.classList.add('modal-open-hide-global');

    // find header nodes and category nodes
    const nodes = [];
    HEADER_SELECTORS.forEach((s) => {
      document.querySelectorAll(s).forEach((n) => nodes.push(n));
    });
    document.querySelectorAll(CATEGORY_SELECTOR).forEach((n) => nodes.push(n));

    nodes.forEach((n) => {
      saveOriginalInline(n);
      try {
        // add a smooth transition if missing
        if (!n.style.transition) n.style.setProperty('transition', 'transform 220ms cubic-bezier(.2,.9,.2,1), opacity 180ms ease', 'important');
        n.style.setProperty('transform', 'translateY(-120%)', 'important');
        n.style.setProperty('opacity', '0', 'important');
        n.style.setProperty('pointer-events', 'none', 'important');
      } catch (e) {
        // ignore
      }
    });
  };

  // remove forced styles and restore saved inline style
  const unforceSlideUpGlobalNodes = () => {
    // restore inline attributes saved earlier
    restoreGlobalInlineStyles();
  };

  // compute threshold using image height
  const getThreshold = () => {
    return Math.max(40, (imageRef.current?.offsetHeight || 240) - 120);
  };

  // robust scroll detection (modal scroll + window fallback)
  useEffect(() => {
    const el = modalRef.current;
    if (!el) return;

    // ensure scrollable
    el.style.overflowY = el.style.overflowY || 'auto';
    el.style.webkitOverflowScrolling = 'touch';

    tickingRef.current = false;

    const checkAndToggle = (scrollTop) => {
      const threshold = getThreshold();
      const shouldCollapse = scrollTop > threshold;

      // collapse image UI
      setImageCollapsed(shouldCollapse);

      if (shouldCollapse) {
        forceSlideUpGlobalNodes();
      } else {
        unforceSlideUpGlobalNodes();
      }
    };

    const rafWrap = (fn) => {
      if (tickingRef.current) return;
      tickingRef.current = true;
      requestAnimationFrame(() => {
        try { fn(); } finally { tickingRef.current = false; }
      });
    };

    const onModalScroll = () => rafWrap(() => checkAndToggle(el.scrollTop || 0));
    const onWheel = (e) => rafWrap(() => checkAndToggle(el.scrollTop + (e.deltaY || 0)));
    const onTouch = () => rafWrap(() => checkAndToggle(el.scrollTop || 0));
    const onWindowScroll = () => rafWrap(() => {
      const scrollTop = el.scrollTop || Math.max(0, -el.getBoundingClientRect().top);
      checkAndToggle(scrollTop);
    });

    el.addEventListener('scroll', onModalScroll, { passive: true });
    el.addEventListener('wheel', onWheel, { passive: true });
    el.addEventListener('touchmove', onTouch, { passive: true });
    window.addEventListener('scroll', onWindowScroll, { passive: true, capture: true });

    // initial measurement
    requestAnimationFrame(() => {
      const initialTop = el.scrollTop || Math.max(0, -el.getBoundingClientRect().top);
      checkAndToggle(initialTop);
    });

    return () => {
      el.removeEventListener('scroll', onModalScroll);
      el.removeEventListener('wheel', onWheel);
      el.removeEventListener('touchmove', onTouch);
      window.removeEventListener('scroll', onWindowScroll, { capture: true });
      // restore on cleanup
      restoreGlobalInlineStyles();
    };
  }, [summary]);

  // like handling
  const handleLike = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        alert('Please sign in to like this summary.');
        return;
      }
      if (userHasLiked) {
        const { error } = await supabase.from('likes').delete().eq('post_id', id).eq('user_id', user.id);
        if (error) throw error;
        setUserHasLiked(false);
        setLikes((l) => Math.max(0, l - 1));
      } else {
        const { error } = await supabase.from('likes').insert([{ post_id: id, user_id: user.id }]);
        if (error) throw error;
        setUserHasLiked(true);
        setLikes((l) => (Number(l) || 0) + 1);
      }
    } catch (err) {
      console.error('Like error:', err);
      alert('Could not update like. Please try again.');
    }
  };

  // rating handling
  const handleSetRating = async (value) => {
    setErrorMsg('');
    setHoverRating(0);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        alert('Please sign in to rate this summary.');
        return;
      }
      setSavingRating(true);
      const { data: existing, error: existingErr } = await supabase
        .from('ratings')
        .select('id,rating')
        .eq('post_id', id)
        .eq('user_id', user.id)
        .single();
      if (existingErr && existingErr.code !== 'PGRST116') console.warn('existing rating check error', existingErr);
      if (existing?.id) {
        const { error } = await supabase.from('ratings').update({ rating: value }).eq('id', existing.id);
        if (error) throw error;
      } else {
        const { error } = await supabase.from('ratings').insert([{ post_id: id, user_id: user.id, rating: value }]);
        if (error) throw error;
      }
      setUserRating(value);

      // refresh avg
      try {
        const { data: ratingData, error: ratingErr } = await supabase.rpc('get_average_rating', { p_post_id: id });
        if (!ratingErr && ratingData?.[0] && ratingData[0].average_rating !== null) {
          setAverageRating(Math.round(Number(ratingData[0].average_rating) * 10) / 10);
        }
      } catch (rpcErr) {}
    } catch (err) {
      console.error('Error saving rating:', err);
      setErrorMsg('Failed to save rating. Please try again.');
    } finally {
      setSavingRating(false);
    }
  };

  // render stars
  const renderStars = () => {
    const stars = [];
    const activeValue = hoverRating || userRating;
    for (let i = 1; i <= 5; i++) {
      const isActive = i <= activeValue;
      stars.push(
        <button
          key={i}
          type="button"
          className={`star-button ${isActive ? 'active' : ''}`}
          onMouseEnter={() => setHoverRating(i)}
          onMouseLeave={() => setHoverRating(0)}
          onFocus={() => setHoverRating(i)}
          onBlur={() => setHoverRating(0)}
          onClick={() => handleSetRating(i)}
          title={`${i} star${i > 1 ? 's' : ''}`}
          disabled={savingRating}
        >
          <FaStar />
        </button>
      );
    }
    return stars;
  };

  if (isLoading) {
    return (
      <div className="modal-backdrop" onClick={() => navigate(-1)}>
        <div className="modal-content modal-loading">Loading...</div>
      </div>
    );
  }

  if (!summary) {
    return (
      <div className="modal-backdrop" onClick={() => navigate(-1)}>
        <div className="modal-content">Summary not found.</div>
      </div>
    );
  }

  const affiliateLink = summary.affiliate_link || null;

  return (
    <div className="modal-backdrop" onClick={() => navigate(-1)}>
      <div className="modal-content" onClick={(e) => e.stopPropagation()} ref={modalRef} style={{ overflowY: 'auto' }}>
        <button className="close-btn" onClick={() => navigate(-1)}>✖</button>

        {summary.image_url && (
          <div className="modal-image-wrap">
            <img
              ref={imageRef}
              src={summary.image_url}
              alt={summary.title}
              className={imageCollapsed ? 'modal-image collapsed' : 'modal-image'}
            />
          </div>
        )}

        <div className="modal-title-sticky">
          <div className="title-row">
            <div className="title-left">
              <h2 className="modal-title">{summary.title}</h2>
              <p className="modal-author">by {summary.author}</p>
            </div>

            {affiliateLink && (
              <a className="affiliate-mini" href={affiliateLink} target="_blank" rel="noopener noreferrer">Get Book</a>
            )}
          </div>

          <div className="eng-row">
            <div className="eng-left">
              <button className={`eng-btn like-btn ${userHasLiked ? 'liked' : ''}`} onClick={handleLike} title="Like">
                <FaHeart /><span>{likes}</span>
              </button>

              <div className="eng-item"><FaComment /><span>{commentsCount}</span></div>
              <div className="eng-item"><FaEye /><span>{views}</span></div>

              <div className="rating-block">
                <div className="rating-stars">{renderStars()}</div>
                <div className="avg-text">{averageRating ? averageRating.toFixed(1) : '0.0'}</div>
              </div>
            </div>
          </div>
        </div>

        {errorMsg && <div className="modal-error">{errorMsg}</div>}

        <div className="modal-body" dangerouslySetInnerHTML={{ __html: DOMPurify.sanitize(summary.summary) }} />

        <div className="modal-comments"><h4>Comments</h4><CommentsSection postId={id} /></div>
      </div>
    </div>
  );
}
