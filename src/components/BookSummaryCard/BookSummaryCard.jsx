// src/components/BookSummaryCard/BookSummaryCard.jsx
import React, { useEffect, useState } from 'react';
import { motion } from 'framer-motion';
import { Link } from 'react-router-dom';
import { FaHeart, FaEye, FaComment, FaStar } from 'react-icons/fa';
import DOMPurify from 'dompurify';
import './BookSummaryCard.css';

const BookSummaryCard = ({ summary = {} }) => {
  const {
    title = 'Untitled',
    author,
    description = '',
    summary: fullSummary = '',
    id,
    slug,
    likes_count,
    views_count,
    comments_count,
    image_url = '',
    avg_rating = 0,
  } = summary || {};

  const [initialAuthor, setInitialAuthor] = useState(author || '');
  const [initialText, setInitialText] = useState(description || fullSummary || '');
  const [initialImage, setInitialImage] = useState(image_url || '');

  useEffect(() => {
    setInitialAuthor(author || '');
    setInitialText(description || fullSummary || '');
    setInitialImage(image_url || '');
  }, [id]);

  const parseMaybeCount = (v) => {
    if (v == null) return 0;
    if (typeof v === 'number' && !Number.isNaN(v)) return v;
    if (typeof v === 'string') {
      const n = Number(v);
      return Number.isNaN(n) ? 0 : n;
    }
    if (Array.isArray(v) && v.length > 0) {
      const first = v[0];
      if (first == null) return 0;
      if (typeof first === 'object' && 'count' in first) return Number(first.count) || 0;
      if (typeof first === 'number') return first;
      if (typeof first === 'string') return Number(first) || 0;
    }
    if (typeof v === 'object') {
      if ('count' in v) return Number(v.count) || 0;
      for (const k of Object.keys(v)) {
        const maybe = v[k];
        if (maybe == null) continue;
        if (typeof maybe === 'number') return maybe;
        if (typeof maybe === 'object' && 'count' in maybe) return Number(maybe.count) || 0;
      }
    }
    return 0;
  };

  const likesDisplay = parseMaybeCount(likes_count);
  const viewsDisplay = parseMaybeCount(views_count);
  const commentsDisplay = parseMaybeCount(comments_count);
  const ratingDisplay = avg_rating ? Number(avg_rating).toFixed(1) : '0.0';

  const authorDisplay = (author || initialAuthor || 'Unknown').trim();
  const previewSource = (description || initialText || '').trim();
  const displayImage = (image_url || initialImage || '').trim();
  const summaryPath = slug ? `/review/${slug}` : `/review/${id}`;

  const cleanText = (text, maxLength = 140) => {
    const src = String(text || '');
    const cleaned = DOMPurify.sanitize(src, { ALLOWED_TAGS: [] });
    const plain = cleaned.replace(/<[^>]*>/g, '').trim();
    return plain.length > maxLength ? `${plain.slice(0, maxLength)}…` : plain;
  };

  useEffect(() => {
    console.debug('[BookSummaryCard] summary id=%s counts =>', id, {
      likes_count, likesDisplay,
      views_count, viewsDisplay,
      comments_count, commentsDisplay,
    });
  }, [id, likes_count, views_count, comments_count]);

  return (
    <Link to={summaryPath} className="card-link" aria-label={`Open ${title}`}>
      <motion.div
        className="summary-card"
        data-post-id={id}
        initial={{ opacity: 0, y: 6 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.32 }}
        role="listitem"
      >
        {displayImage ? (
          <div className="cover-wrap" aria-hidden="true">
            <img src={displayImage} alt={`${title} cover`} className="book-cover-image" />
          </div>
        ) : (
          <div className="cover-placeholder" />
        )}

        <div className="card-content">
          <h3 className="book-title" title={title}>{title}</h3>
          <p className="book-author">by {authorDisplay}</p>
          <p className="summary-text" aria-hidden>{cleanText(previewSource)}</p>

          <div className="card-footer">
            <div className="engagement-item" aria-hidden>
              <FaHeart className="footer-icon" />
              <span className="eng-count">{likesDisplay}</span>
            </div>
            <div className="engagement-item" aria-hidden>
              <FaComment className="footer-icon" />
              <span className="eng-count">{commentsDisplay}</span>
            </div>
            <div className="engagement-item" aria-hidden>
              <FaEye className="footer-icon" />
              <span className="eng-count">{viewsDisplay}</span>
            </div>
            <div className="engagement-item rating" aria-hidden>
              <FaStar className="footer-icon star-icon" />
              <span className="eng-count">{ratingDisplay}</span>
            </div>
          </div>
        </div>
      </motion.div>
    </Link>
  );
};

export default BookSummaryCard;
