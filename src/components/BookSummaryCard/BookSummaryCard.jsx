import React, { useEffect, useState } from 'react';
import { motion } from 'framer-motion';
import { Link } from 'react-router-dom';
import { FaHeart, FaEye, FaComment, FaStar } from 'react-icons/fa';
import './BookSummaryCard.css';

/**
 * Defensive BookSummaryCard
 * - preserves initial author, summary text, and image locally so later empty/null props don't blank UI
 */
const BookSummaryCard = ({ summary = {}, onEdit, onDelete }) => {
  const {
    title = 'Untitled',
    // keep incoming text available
    summary: text = '',
    id,
    slug,
    likes_count = 0,
    views_count = 0,
    comments_count = 0,
    image_url = '',
    avg_rating = 0,
  } = summary || {};

  // Local state to preserve first-seen author, text & image for this card instance (resets when id changes)
  const [initialAuthor, setInitialAuthor] = useState(() => {
    const a = summary?.author;
    return a === null || a === undefined || (typeof a === 'string' && a.trim() === '') ? '' : a;
  });
  const [initialText, setInitialText] = useState(() => (summary?.summary ?? ''));
  const [initialImage, setInitialImage] = useState(() => {
    const img = summary?.image_url;
    return img === null || img === undefined || (typeof img === 'string' && img.trim() === '') ? '' : img;
  });

  // If card is reused for a different summary (id change), reset initial captures
  useEffect(() => {
    const a = summary?.author;
    const authorVal = a === null || a === undefined || (typeof a === 'string' && a.trim() === '') ? '' : a;
    setInitialAuthor(authorVal);

    setInitialText(summary?.summary ?? '');

    const img = summary?.image_url;
    const imageVal = img === null || img === undefined || (typeof img === 'string' && img.trim() === '') ? '' : img;
    setInitialImage(imageVal);

    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [summary?.id]); // reset only when underlying row id changes

  // compute author display with fallback order:
  // 1. current incoming author (if non-empty)
  // 2. initialAuthor captured on mount
  // 3. 'Unknown'
  const currentAuthorRaw = summary ? summary.author : undefined;
  const currentAuthor =
    currentAuthorRaw === null ||
    currentAuthorRaw === undefined ||
    (typeof currentAuthorRaw === 'string' && currentAuthorRaw.trim() === '')
      ? ''
      : currentAuthorRaw;
  const authorDisplay = currentAuthor || initialAuthor || 'Unknown';

  // compute display text: incoming text preferred; fallback to initialText
  const cleanText = (html, maxLength = 140) => {
    const src = html ?? '';
    if (!src) return '';
    const clean = src.replace(/<[^>]*>/g, '');
    return clean.length > maxLength ? clean.substring(0, maxLength) + '…' : clean;
  };
  const displayText = cleanText(text) || cleanText(initialText);

  // compute display image: incoming image_url if non-empty → initialImage → placeholder
  const currentImageRaw = summary ? summary.image_url : undefined;
  const currentImage =
    currentImageRaw === null ||
    currentImageRaw === undefined ||
    (typeof currentImageRaw === 'string' && currentImageRaw.trim() === '')
      ? ''
      : currentImageRaw;
  const displayImage = currentImage || initialImage || '';

  // Helper to get the dynamic path: prefer slug for SEO, fallback to id
  const getSummaryPath = (id, slug) => (slug ? `/summary/${slug}` : `/summary/${id}`);
  const summaryPath = getSummaryPath(id, slug);

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
          <h3 className="book-title" title={title}>
            {title}
          </h3>

          <p className="book-author">by {authorDisplay}</p>

          <p className="summary-text" aria-hidden>
            {displayText}
          </p>

          <div className="card-footer">
            <div className="engagement-item" aria-hidden>
              <FaHeart className="footer-icon" />
              <span className="eng-count">{likes_count || 0}</span>
            </div>

            <div className="engagement-item" aria-hidden>
              <FaComment className="footer-icon" />
              <span className="eng-count">{comments_count || 0}</span>
            </div>

            <div className="engagement-item" aria-hidden>
              <FaEye className="footer-icon" />
              <span className="eng-count">{views_count || 0}</span>
            </div>

            <div className="engagement-item rating" aria-hidden>
              <FaStar className="footer-icon star-icon" />
              <span className="eng-count">{avg_rating ? Number(avg_rating).toFixed(1) : '0.0'}</span>
            </div>
          </div>
        </div>
      </motion.div>
    </Link>
  );
};

export default BookSummaryCard;
