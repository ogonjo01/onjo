// src/components/EditSummaryForm/EditSummaryForm.jsx
import React, { useState, useEffect, useRef } from 'react';
import { createPortal } from 'react-dom';
import ReactQuill from 'react-quill';
import slugify from 'slugify';
import { supabase } from '../../supabase/supabaseClient';
import 'react-quill/dist/quill.snow.css';
import './EditSummaryForm.css';

const CATEGORIES = [
  "Best Books",
  "Business Strategy & Systems",
  "Courses & Learning Paths",
  "Business Ideas",
  "Book Summaries",
  "Entrepreneurship",
  "Self-Improvement",
  "Marketing & Sales",
  "Money & Productivity",
  "Mindset & Motivation",
  "Career Development",
  "Video Insights",
  "Digital Skills & Technology",
  "Leadership & Management",
  "Strategic Communication"
];

const quillModules = {
  toolbar: [
    [{ header: [1, 2, 3, false] }],
    ['bold', 'italic', 'underline', 'strike'],
    [{ list: 'ordered' }, { list: 'bullet' }],
    ['blockquote', 'code-block'],
    ['link', 'image'],
    ['clean'],
  ],
  clipboard: { matchVisual: false }
};

const quillFormats = [
  'header', 'bold', 'italic', 'underline', 'strike',
  'list', 'bullet', 'blockquote', 'code-block', 'link', 'image'
];

const normalizeTag = (t) => (typeof t === 'string' ? t.trim().toLowerCase() : String(t).trim().toLowerCase());

const EditSummaryForm = ({ summary = {}, onClose = () => {}, onUpdate = () => {} }) => {
  // initialize from passed summary safely
  const [title, setTitle] = useState(summary.title || '');
  const [slug, setSlug] = useState(summary.slug || '');
  const [author, setAuthor] = useState(summary.author || '');
  const [description, setDescription] = useState(summary.description || '');
  const [summaryText, setSummaryText] = useState(summary.summary || '');
  const [category, setCategory] = useState(summary.category || CATEGORIES[0]);
  const [imageUrl, setImageUrl] = useState(summary.image_url || '');
  const [affiliateLink, setAffiliateLink] = useState(summary.affiliate_link || '');
  const [youtubeUrl, setYoutubeUrl] = useState(summary.youtube_url || '');
  const [tags, setTags] = useState(Array.isArray(summary.tags) ? summary.tags.map(normalizeTag) : []);
  const [tagInput, setTagInput] = useState('');
  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');

  // keep a stable ref to avoid race issues if parent re-renders
  const initialIdRef = useRef(summary.id);

  // portal container ref
  const portalElRef = useRef(null);

  // auto-generate slug preview when title changes (does not try to guarantee uniqueness)
  useEffect(() => {
    if (!title) { setSlug(''); return; }
    const generated = slugify(title, { lower: true, replacement: '-', strict: true });
    setSlug(generated);
  }, [title]);

  // create portal element on mount and remove on unmount
  useEffect(() => {
    if (typeof document === 'undefined') return;
    const el = document.createElement('div');
    el.className = 'edit-summary-portal';
    document.body.appendChild(el);
    portalElRef.current = el;
    // prevent body scroll while modal is open
    const prevOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => {
      document.body.style.overflow = prevOverflow || '';
      if (portalElRef.current) {
        document.body.removeChild(portalElRef.current);
        portalElRef.current = null;
      }
    };
  }, []);

  // Tag helpers
  const addTagFromInput = (raw = '') => {
    const value = (raw || tagInput || '').trim();
    if (!value) return;
    // allow comma-separated batch
    const parts = value.split(',').map(p => normalizeTag(p)).filter(Boolean);
    setTags(prev => {
      const s = new Set(prev || []);
      parts.forEach(p => s.add(p));
      return Array.from(s).slice(0, 20); // limit to 20 tags
    });
    setTagInput('');
  };

  const handleTagKey = (e) => {
    if (e.key === 'Enter' || e.key === ',') {
      e.preventDefault();
      addTagFromInput();
    } else if (e.key === 'Backspace' && !tagInput) {
      // remove last tag on backspace when input empty
      setTags(prev => (prev && prev.length ? prev.slice(0, -1) : []));
    }
  };

  const removeTag = (t) => {
    setTags(prev => (prev || []).filter(x => x !== t));
  };

  const validate = () => {
    setErrorMsg('');
    if (!title.trim()) return 'Title is required';
    if (!author.trim()) return 'Author is required';
    if (!category) return 'Category is required';
    // optional: validate youtube url pattern
    return null;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    const v = validate();
    if (v) { setErrorMsg(v); return; }

    setLoading(true);
    setErrorMsg('');

    try {
      // confirm current user (permission check)
      const { data: authData } = await supabase.auth.getUser();
      const user = authData?.user ?? null;
      if (!user) {
        setErrorMsg('You must be signed in to update this summary.');
        setLoading(false);
        return;
      }

      // Prepare payload - only send fields you want to update
      const payload = {
        title: title.trim(),
        author: author.trim(),
        description: description.trim() || null,
        summary: summaryText || null,
        category: category || null,
        image_url: imageUrl || null,
        affiliate_link: affiliateLink || null,
        youtube_url: youtubeUrl || null,
        tags: Array.isArray(tags) ? tags.filter(Boolean) : [],
        slug: slug || null, // DB trigger should ensure uniqueness if necessary
      };

      // run update
      const { data, error } = await supabase
        .from('book_summaries')
        .update(payload)
        .eq('id', summary.id)
        .select()
        .maybeSingle();

      setLoading(false);

      if (error) {
        console.error('Update error', error);
        setErrorMsg(error.message || 'Failed to update');
        return;
      }

      // success -> call onUpdate with latest row
      if (typeof onUpdate === 'function') {
        onUpdate(data ?? null);
      }

      // close modal
      if (typeof onClose === 'function') onClose();
    } catch (err) {
      console.error('Unexpected edit error', err);
      setErrorMsg('Unexpected error. Check console.');
      setLoading(false);
    }
  };

  // small preview for youtube (extract id)
  const extractYouTubeId = (url = '') => {
    if (!url) return null;
    const vMatch = url.match(/[?&]v=([0-9A-Za-z_-]{11})/);
    if (vMatch) return vMatch[1];
    const shortMatch = url.match(/youtu\.be\/([0-9A-Za-z_-]{11})/);
    if (shortMatch) return shortMatch[1];
    const embedMatch = url.match(/\/embed\/([0-9A-Za-z_-]{11})/);
    if (embedMatch) return embedMatch[1];
    return null;
  };

  const youtubeId = extractYouTubeId(youtubeUrl);

  // If portal element hasn't been created yet, render nothing (pre-SSR safe)
  if (!portalElRef.current) return null;

  // Modal JSX
  const modal = (
    <div className="modal-overlay" role="presentation" onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}>
      <div className="modal-content edit-large" role="dialog" aria-modal="true" aria-label="Edit summary">
        <button className="close-button" onClick={onClose} aria-label="Close">&times;</button>
        <h2>Edit Summary</h2>

        <form onSubmit={handleSubmit} className="summary-form" onClick={(e) => e.stopPropagation()}>
          <label htmlFor="title">Title</label>
          <input id="title" type="text" value={title} onChange={e => setTitle(e.target.value)} required />

          <small className="slug-preview">Slug preview: <code>{slug || '(will be generated)'}</code></small>

          <label htmlFor="author">Author</label>
          <input id="author" type="text" value={author} onChange={e => setAuthor(e.target.value)} required />

          <label htmlFor="category">Category</label>
          <select id="category" value={category} onChange={e => setCategory(e.target.value)} required>
            {CATEGORIES.map(c => <option value={c} key={c}>{c}</option>)}
          </select>

          <label htmlFor="description">Short description (feed preview)</label>
          <input id="description" type="text" value={description} onChange={e => setDescription(e.target.value)} placeholder="Short 1-2 sentence description" />

          <label htmlFor="imageUrl">Cover image URL</label>
          <input id="imageUrl" type="url" value={imageUrl} onChange={e => setImageUrl(e.target.value)} placeholder="https://..." />

          <label htmlFor="affiliateLink">Affiliate link</label>
          <input id="affiliateLink" type="url" value={affiliateLink} onChange={e => setAffiliateLink(e.target.value)} placeholder="https://..." />

          <label htmlFor="youtubeUrl">YouTube URL</label>
          <input id="youtubeUrl" type="url" value={youtubeUrl} onChange={e => setYoutubeUrl(e.target.value)} placeholder="https://youtube.com/..." />
          {youtubeId && (
            <div className="youtube-preview">
              <iframe
                title="youtube-preview"
                src={`https://www.youtube.com/embed/${youtubeId}`}
                frameBorder="0"
                allowFullScreen
                style={{ width: '100%', height: 200, borderRadius: 8 }}
              />
            </div>
          )}

          <label htmlFor="tags">Tags</label>
          <div className="tags-input-row">
            <input
              id="tags"
              type="text"
              placeholder="type tag then Enter or comma — e.g. leadership,strategy"
              value={tagInput}
              onChange={e => setTagInput(e.target.value)}
              onKeyDown={handleTagKey}
            />
            <button type="button" className="hf-btn" onClick={() => addTagFromInput(tagInput)}>Add</button>
          </div>

          <div className="tags-list">
            {(tags || []).map(t => (
              <button type="button" key={t} className="tag-chip" onClick={() => removeTag(t)} title="click to remove">
                {t} <span aria-hidden>✕</span>
              </button>
            ))}
          </div>

          <label htmlFor="summaryText">Full summary</label>
          <div className="quill-container">
            <ReactQuill
              theme="snow"
              value={summaryText}
              onChange={setSummaryText}
              modules={quillModules}
              formats={quillFormats}
            />
          </div>

          {errorMsg && <div className="form-error" role="alert">{errorMsg}</div>}

          <div style={{ display: 'flex', gap: 8, marginTop: 12 }}>
            <button className="hf-btn" type="submit" disabled={loading}>{loading ? 'Updating...' : 'Save changes'}</button>
            <button type="button" className="hf-btn" onClick={onClose} disabled={loading}>Cancel</button>
          </div>
        </form>
      </div>
    </div>
  );

  return createPortal(modal, portalElRef.current);
};

export default EditSummaryForm;
