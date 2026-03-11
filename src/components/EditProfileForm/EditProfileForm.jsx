// src/components/EditSummaryForm/EditSummaryForm.jsx
import React, { useState, useEffect, useRef, useMemo, useCallback } from 'react';
import { createPortal } from 'react-dom';
import ReactQuill from 'react-quill';
import Quill from 'quill';
import slugify from 'slugify';
import { supabase } from '../../supabase/supabaseClient';
import 'react-quill/dist/quill.snow.css';
import './EditSummaryForm.css';

/* ── constants ────────────────────────────────────────────── */
const REAL_CATEGORIES = [
  "Apps","Best Books","Book Summaries","Business Concepts","Business Giants",
  "Business Ideas","Business Legends","Business Strategy & Systems","Career Development",
  "Companies & Organizations","Concepts","Concepts Abbreviations","Courses & Learning Paths",
  "Digital Skills & Technology","Entrepreneurship","Leadership & Management","Marketing & Sales",
  "Markets & Geography","Mindset & Motivation","Money & Productivity","People","Quotes",
  "Self-Improvement","Strategic Communication","Tools & Software","Video Insights",
];

const DIFFICULTIES = [
  { value: "", label: "Not specified (optional)" },
  { value: "Beginner",     label: "Beginner" },
  { value: "Intermediate", label: "Intermediate" },
  { value: "Advanced",     label: "Advanced" },
];

const DRAFT_SENTINEL = "__DRAFT__";
const KEYWORDS_LIMIT = 8;
const AUTO_SAVE_MS   = 30_000;

const quillFormats = ['header','bold','italic','underline','strike','list','bullet','blockquote','code-block','link','image'];

/* ── pure helpers ─────────────────────────────────────────── */
const normalize = (s = '') => String(s || '').trim().toLowerCase();
const uniqueWords = (s = '') =>
  Array.from(new Set(normalize(s).split(/[^\p{L}\p{N}]+/u).filter(Boolean)));

const wordMatchScore = (a = '', b = '') => {
  const aw = uniqueWords(a), bw = uniqueWords(b);
  if (!aw.length || !bw.length) return 0;
  return aw.filter(w => bw.includes(w)).length / Math.max(aw.length, bw.length);
};

const lcsr = (a = '', b = '') => {
  const A = String(a||''), B = String(b||'');
  const n = A.length, m = B.length;
  if (!n || !m) return 0;
  const dp = new Array(m + 1).fill(0); let best = 0;
  for (let i = 1; i <= n; i++) {
    for (let j = m; j >= 1; j--) {
      if (A[i-1] === B[j-1]) { dp[j] = dp[j-1] + 1; if (dp[j] > best) best = dp[j]; } else dp[j] = 0;
    }
  }
  return best / Math.max(n, m);
};

const combinedScore = (cand = '', q = '') =>
  Math.min(1, 0.55 * wordMatchScore(cand, q) + 0.35 * lcsr(cand, q) + 0.10 * (normalize(cand).startsWith(normalize(q)) ? 1 : 0));

const pluralVariants = (word = '') => {
  const w = normalize(word); if (!w) return [w];
  const v = new Set([w]);
  if (!w.endsWith('s'))  v.add(`${w}s`);
  if (!w.endsWith('es')) v.add(`${w}es`);
  if (w.endsWith('s'))   v.add(w.replace(/s+$/, ''));
  return Array.from(v);
};

const parseAffiliateValue = (raw) => {
  if (!raw) return { type: null, url: null };
  try {
    if (typeof raw === 'string') {
      const parts = raw.split('|').map(p => p.trim());
      if (parts.length === 2 && parts[1]) return { type: (parts[0] || 'book').toLowerCase(), url: parts[1] };
      if (raw.trim()) return { type: 'book', url: raw.trim() };
      return { type: null, url: null };
    }
    if (typeof raw === 'object' && raw !== null) {
      if (raw.url)  return { type: (raw.type  || 'book').toLowerCase(), url: String(raw.url).trim()  };
      if (raw.link) return { type: (raw.type  || 'book').toLowerCase(), url: String(raw.link).trim() };
    }
  } catch (_) {}
  return { type: null, url: null };
};

const parseKeywordsCSV = (input, max = KEYWORDS_LIMIT) => {
  if (!input) return [];
  const seen = new Set(); const uniq = [];
  for (const k of String(input).split(',').map(k => k.trim().toLowerCase()).filter(Boolean)) {
    if (!seen.has(k)) { seen.add(k); uniq.push(k); if (uniq.length >= max) break; }
  }
  return uniq;
};

const toLibraryHref = (row) =>
  row?.slug ? `/library/${row.slug}` : `/library/${row?.id}`;

const extractYouTubeId = (url = '') => {
  if (!url) return null;
  const m = url.match(/[?&]v=([0-9A-Za-z_-]{11})/) ||
            url.match(/youtu\.be\/([0-9A-Za-z_-]{11})/) ||
            url.match(/\/embed\/([0-9A-Za-z_-]{11})/);
  return m ? m[1] : null;
};

/* ── Toast ────────────────────────────────────────────────── */
const Toast = ({ message, type = 'success', onDone }) => {
  useEffect(() => {
    const t = setTimeout(onDone, 3000);
    return () => clearTimeout(t);
  }, [onDone]);
  const bg = type === 'success' ? '#16a34a' : type === 'error' ? '#dc2626' : '#b45309';
  return (
    <div style={{
      position: 'fixed', bottom: 28, left: '50%', transform: 'translateX(-50%)',
      background: bg, color: '#fff', borderRadius: 10, padding: '13px 28px',
      fontWeight: 600, fontSize: 15, zIndex: 99999,
      boxShadow: '0 4px 24px rgba(0,0,0,0.18)',
      display: 'flex', alignItems: 'center', gap: 10,
      animation: 'esf-toast-in 0.22s ease',
      whiteSpace: 'nowrap',
    }}>
      {message}
      <style>{`@keyframes esf-toast-in { from { opacity:0; transform: translateX(-50%) translateY(12px); } to { opacity:1; transform: translateX(-50%) translateY(0); } }`}</style>
    </div>
  );
};

/* ═══════════════════════════════════════════════════════════
   COMPONENT
═══════════════════════════════════════════════════════════ */
const EditSummaryForm = ({ summary = {}, onClose = () => {}, onUpdate = () => {} }) => {
  const isEditing = !!(summary && summary.id);

  /* ── Form fields ──────────────────────────────────────── */
  const [title, setTitle]             = useState(summary.title || '');
  const [slug, setSlug]               = useState(summary.slug || '');
  const [author, setAuthor]           = useState(summary.author || '');
  const [description, setDescription] = useState(summary.description || '');
  const [summaryText, setSummaryText] = useState(summary.summary || '');

  const [category, setCategory] = useState(() => {
    if (summary.category) return summary.category;
    return DRAFT_SENTINEL;
  });

  const [imageUrl, setImageUrl]         = useState(summary.image_url || '');
  const [affiliateLink, setAffiliateLink] = useState('');
  const [affiliateType, setAffiliateType] = useState('book');
  const [youtubeUrl, setYoutubeUrl]     = useState(summary.youtube_url || '');
  const [tags, setTags]                 = useState(
    Array.isArray(summary.tags) ? summary.tags.map(t => String(t).trim().toLowerCase()) : []
  );
  const [tagInput, setTagInput]         = useState('');
  const [keywords, setKeywords]         = useState([]);
  const [keywordInput, setKeywordInput] = useState('');
  const [editedKeywords, setEditedKeywords] = useState(false);
  const [difficulty, setDifficulty]     = useState(summary.difficulty_level || '');

  /* ── Draft / status state ─────────────────────────────── */
  const [draftId, setDraftId]           = useState(summary.id || null);
  const [autoSaveStatus, setAutoSaveStatus] = useState('idle');
  const autoSaveTimer                   = useRef(null);
  const lastSnapshotRef                 = useRef(null);

  /* ── UI state ─────────────────────────────────────────── */
  const [loading, setLoading]           = useState(false);
  // ── NEW: separate state for Save Draft button ──────────
  const [draftSaving, setDraftSaving]   = useState(false);
  const [errorMsg, setErrorMsg]         = useState('');
  const [titleDupeWarning, setTitleDupeWarning] = useState('');
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [deleteLoading, setDeleteLoading] = useState(false);
  // ── NEW: toast ─────────────────────────────────────────
  const [toast, setToast]               = useState(null);

  /* ── Portal / Quill ───────────────────────────────────── */
  const portalElRef = useRef(null);
  const quillRef    = useRef(null);
  const initialIdRef = useRef(summary?.id || null);

  const [showInternalLinkModal, setShowInternalLinkModal] = useState(false);
  const [linkSearch, setLinkSearch]     = useState('');
  const [linkResults, setLinkResults]   = useState([]);
  const [selectedRangeForLink, setSelectedRangeForLink] = useState(null);

  /* ── Init affiliate ───────────────────────────────────── */
  useEffect(() => {
    const parsed = parseAffiliateValue(summary.affiliate_link);
    setAffiliateLink(parsed.url || '');
    setAffiliateType(parsed.type || 'book');
  }, [summary.affiliate_link]);

  /* ── Init keywords ────────────────────────────────────── */
  useEffect(() => {
    const raw = summary?.keywords;
    let incoming = [];
    try {
      if (Array.isArray(raw))        incoming = raw.map(k => String(k||'').trim().toLowerCase()).filter(Boolean);
      else if (raw == null)          incoming = [];
      else if (typeof raw === 'string') {
        try { const p = JSON.parse(raw); incoming = Array.isArray(p) ? p.map(k => String(k||'').trim().toLowerCase()).filter(Boolean) : raw.split(',').map(k => k.trim().toLowerCase()).filter(Boolean); }
        catch { incoming = raw.split(',').map(k => k.trim().toLowerCase()).filter(Boolean); }
      }
    } catch (_) { incoming = []; }
    const uniq = Array.from(new Set(incoming)).slice(0, KEYWORDS_LIMIT);
    setKeywords(uniq);
    setKeywordInput(uniq.length ? uniq.join(', ') : '');
    setEditedKeywords(false);
  }, [summary?.keywords, summary?.id]);

  /* ── Slug from title (only for new) ──────────────────── */
  useEffect(() => {
    if (initialIdRef.current) return;
    if (!title) { setSlug(''); return; }
    setSlug(slugify(title, { lower: true, replacement: '-', strict: true }));
  }, [title]);

  /* ── Portal DOM ───────────────────────────────────────── */
  useEffect(() => {
    if (typeof document === 'undefined') return;
    const el = document.createElement('div');
    el.className = 'edit-summary-portal';
    document.body.appendChild(el);
    portalElRef.current = el;
    const prev = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => {
      document.body.style.overflow = prev || '';
      if (portalElRef.current) { document.body.removeChild(portalElRef.current); portalElRef.current = null; }
    };
  }, []);

  /* ── Quill icon ───────────────────────────────────────── */
  useEffect(() => {
    try { const icons = Quill.import('ui/icons'); icons.internalLink = '<svg viewBox="0 0 18 18"><path d="M7 7h4v1H7z"/></svg>'; } catch (_) {}
  }, []);

  /* ── Tag helpers ──────────────────────────────────────── */
  const normalizeTag = t => (typeof t === 'string' ? t.trim().toLowerCase() : String(t).trim().toLowerCase());
  const addTagFromInput = (raw = '') => {
    const value = (raw || tagInput || '').trim(); if (!value) return;
    const parts = value.split(',').map(p => normalizeTag(p)).filter(Boolean);
    setTags(prev => Array.from(new Set([...(prev||[]), ...parts])).slice(0, 20));
    setTagInput('');
  };
  const handleTagKey = e => {
    if (e.key === 'Enter' || e.key === ',') { e.preventDefault(); addTagFromInput(); }
    else if (e.key === 'Backspace' && !tagInput) setTags(prev => prev?.length ? prev.slice(0,-1) : []);
  };
  const removeTag = t => setTags(prev => (prev||[]).filter(x => x !== t));

  /* ── Keyword helpers ──────────────────────────────────── */
  const addKeywordFromInput = (raw = '') => {
    const value = (raw || keywordInput || '').trim(); if (!value) return;
    const parts = value.split(',').map(p => p.trim().toLowerCase()).filter(Boolean);
    setKeywords(prev => {
      const s = new Set(prev||[]);
      for (const p of parts) { if (s.size >= KEYWORDS_LIMIT) break; s.add(p); }
      const out = Array.from(s);
      if (JSON.stringify(out) !== JSON.stringify(prev||[])) setEditedKeywords(true);
      return out;
    });
    setKeywordInput('');
  };
  const handleKeywordKey = e => {
    if (e.key === 'Enter' || e.key === ',') { e.preventDefault(); addKeywordFromInput(); }
    else if (e.key === 'Backspace' && !keywordInput) {
      setKeywords(prev => { const out = prev?.length ? prev.slice(0,-1) : []; setEditedKeywords(true); return out; });
    } else if (!editedKeywords) setEditedKeywords(true);
  };
  const removeKeyword = k => { setKeywords(prev => { const out = (prev||[]).filter(x => x !== k); setEditedKeywords(true); return out; }); };
  const parsedKeywordsPreview = useMemo(() => (Array.isArray(keywords) ? keywords.slice(0, KEYWORDS_LIMIT) : []), [keywords]);

  const youtubeId = extractYouTubeId(youtubeUrl);

  /* ── Quill modules ────────────────────────────────────── */
  const modules = useMemo(() => ({
    toolbar: {
      container: [
        [{ header: [1,2,3,false] }],
        ['bold','italic','underline','strike'],
        [{ list:'ordered' },{ list:'bullet' }],
        ['blockquote','code-block'],
        ['link','image'],
        ['internalLink'],
        ['clean'],
      ],
      handlers: {
        internalLink: function() {
          const editor = quillRef.current?.getEditor();
          if (!editor) return;
          const range = editor.getSelection();
          if (!range || range.length === 0) { alert('Select the text you want to link, then click "Link to summary".'); return; }
          setSelectedRangeForLink(range);
          setShowInternalLinkModal(true);
        },
      },
    },
    clipboard: { matchVisual: false },
  }), []);

  /* ── Internal link search ─────────────────────────────── */
  useEffect(() => {
    let cancelled = false;
    if (!linkSearch?.trim()) { setLinkResults([]); return; }
    (async () => {
      const { data, error } = await supabase.from('book_summaries').select('id, title, slug').ilike('title', `%${linkSearch}%`).limit(10);
      if (!cancelled) setLinkResults(error ? [] : (data||[]));
    })();
    return () => { cancelled = true; };
  }, [linkSearch]);

  /* ── DB helpers ───────────────────────────────────────── */
  const fetchTitleCandidates = async (text, limit = 200) => {
    const q = String(text||'').trim(); if (!q) return [];
    try { const { data, error } = await supabase.from('book_summaries').select('id, title, slug, keywords').ilike('title', `%${q}%`).limit(limit); return error ? [] : (data||[]); } catch { return []; }
  };

  const fetchKeywordRows = async (limit = 800) => {
    try { const { data, error } = await supabase.from('book_summaries').select('id, title, slug, keywords').not('keywords', 'is', null).limit(limit); return error ? [] : (data||[]); } catch { return []; }
  };

  const searchBestMatch = async (text, opts = {}) => {
    const q = String(text||'').trim(); if (!q) return null;
    const minScore      = opts.minScore        ?? 0.5;
    const limitCandidates = opts.limitCandidates ?? 40;
    try { const { data: ex } = await supabase.from('book_summaries').select('id, title, slug').ilike('title', q).maybeSingle(); if (ex?.id) return ex; } catch (_) {}
    try { const { data: ph } = await supabase.from('book_summaries').select('id, title, slug').ilike('title', `%${q}%`).limit(1).maybeSingle(); if (ph?.id) return ph; } catch (_) {}
    const tokens = uniqueWords(q).slice(0, 6); if (!tokens.length) return null;
    const orFilters = tokens.map(t => `title.ilike.%${t}%`).join(',');
    try {
      const { data: cands = [] } = await supabase.from('book_summaries').select('id, title, slug').or(orFilters).limit(limitCandidates);
      if (!cands?.length) return null;
      const singleWord = q.split(/\s+/).length === 1;
      const qVariants  = singleWord ? pluralVariants(q) : [normalize(q)];
      let best = null, bestScore = 0;
      cands.forEach(c => {
        const score = combinedScore(c.title||'', q);
        if (singleWord && !qVariants.some(v => uniqueWords(c.title||'').includes(v))) return;
        if (score > bestScore) { bestScore = score; best = c; }
      });
      if (best && bestScore >= minScore) return best;
      return (best && bestScore > 0.25) ? best : null;
    } catch { return null; }
  };

  const wrapNodeInAnchor = (node, row) => {
    const href = toLibraryHref(row);
    try {
      if (node.closest?.('a')) return false;
      const a = document.createElement('a');
      a.setAttribute('data-summary-id', row.id);
      a.setAttribute('href', href);
      a.className = 'internal-summary-link';
      a.innerHTML = node.innerHTML;
      node.parentNode.replaceChild(a, node);
      return true;
    } catch { return false; }
  };

  /* ── Auto-link toolbar actions (unchanged) ────────────── */
  const removeLinksAndMakeBold = () => {
    const editor = quillRef.current?.getEditor();
    if (!editor) { alert('Editor not ready'); return; }
    try {
      const container = document.createElement('div');
      container.innerHTML = editor.root.innerHTML;
      const anchors = Array.from(container.querySelectorAll('a[data-summary-id], a[href^="#summary-"], a[href^="/library/"]'));
      if (!anchors.length) { alert('No internal links found.'); return; }
      anchors.forEach(a => { const strong = document.createElement('strong'); strong.innerHTML = a.innerHTML; a.parentNode.replaceChild(strong, a); });
      const delta = editor.clipboard.convert(container.innerHTML);
      editor.setContents(delta, 'user');
      setSummaryText(editor.root.innerHTML);
      alert(`Removed ${anchors.length} link(s) and bolded the text.`);
    } catch { alert('Could not remove links automatically.'); }
  };

  const autoLinkBoldedPhrases = async () => {
    const editor = quillRef.current?.getEditor();
    if (!editor) { alert('Editor not ready'); return; }
    try {
      const container = document.createElement('div');
      container.innerHTML = editor.root.innerHTML;
      const boldNodes = Array.from(container.querySelectorAll('strong, b'));
      const phrases = Array.from(new Set(boldNodes.map(n => (n.textContent||'').trim()).filter(s => s.length >= 2 && s.length <= 200))).slice(0, 40);
      if (!phrases.length) { alert('No bolded phrases found.'); return; }
      const mapping = {};
      for (const phrase of phrases) {
        try { mapping[phrase] = await searchBestMatch(phrase, { limitCandidates: 40, minScore: 0.5 }); } catch { mapping[phrase] = null; }
      }
      let linkedCount = 0;
      boldNodes.forEach(node => {
        const text = (node.textContent||'').trim();
        const match = mapping[text];
        if (match?.id) { if (wrapNodeInAnchor(node, match)) linkedCount++; }
      });
      const newDelta = editor.clipboard.convert(container.innerHTML);
      editor.setContents(newDelta, 'user');
      setSummaryText(editor.root.innerHTML);
      alert(`Auto-link completed. ${linkedCount} phrase(s) linked.`);
    } catch { alert('Auto-link failed. See console.'); }
  };

  const autoLinkBoldToSlug = () => {
    const editor = quillRef.current?.getEditor();
    if (!editor) { alert('Editor not ready'); return; }
    const range = editor.getSelection();
    if (!range || range.length === 0) { alert('Please select the text you want to link.'); return; }
    let selectedText = '';
    try { selectedText = editor.getText(range.index, range.length).trim(); } catch (_) {}
    if (!selectedText) { alert('Selected text is empty.'); return; }
    const generatedSlug = slugify(selectedText, { lower: true, strict: true, replacement: '-' });
    if (!generatedSlug) { alert('Could not generate slug.'); return; }
    try { editor.focus(); editor.deleteText(range.index, range.length); editor.insertText(range.index, selectedText, { link: `/library/${generatedSlug}` }, 'user'); } catch (_) {}
    const tryAttach = (attempt = 0) => {
      try {
        const [leaf] = editor.getLeaf(range.index);
        const anchor = leaf?.domNode?.parentElement?.tagName === 'A' ? leaf.domNode.parentElement : null;
        if (anchor) { anchor.classList.add('slug-summary-link'); anchor.setAttribute('href', `/library/${generatedSlug}`); anchor.setAttribute('data-slug', generatedSlug); return; }
      } catch (_) {}
      if (attempt < 4) { setTimeout(() => tryAttach(attempt + 1), 30 * (attempt + 1)); return; }
      try { const safe = selectedText.replace(/</g,'&lt;').replace(/>/g,'&gt;'); try { editor.deleteText(range.index, selectedText.length); } catch (_) {} editor.clipboard.dangerouslyPasteHTML(range.index, `<a class="slug-summary-link" data-slug="${generatedSlug}" href="/library/${generatedSlug}">${safe}</a>`); } catch (_) {}
    };
    tryAttach(0);
    try { editor.setSelection(range.index + selectedText.length, 0); } catch (_) {}
    try { setSummaryText(editor.root.innerHTML); } catch (_) {}
    alert(`Linked selection to /library/${generatedSlug}`);
  };

  const autoLinkBoldExact = async () => {
    const editor = quillRef.current?.getEditor();
    if (!editor) { alert('Editor not ready'); return; }
    try {
      const container = document.createElement('div');
      container.innerHTML = editor.root.innerHTML;
      const boldNodes = Array.from(container.querySelectorAll('strong, b'));
      const phrases = Array.from(new Set(boldNodes.map(n => (n.textContent||'').trim()).filter(s => s.length >= 2 && s.length <= 200))).slice(0, 200);
      if (!phrases.length) { alert('No bolded phrases found.'); return; }
      let linkedCount = 0;
      for (const phrase of phrases) {
        try {
          const variants = pluralVariants(phrase);
          let matched = null;
          for (const c of await fetchTitleCandidates(phrase, 200)) { if (!c?.title) continue; const nt = normalize(c.title); if (nt === normalize(phrase) || variants.includes(nt)) { matched = c; break; } }
          if (!matched) for (const c of await fetchKeywordRows(400)) { if (!c?.title) continue; const nt = normalize(c.title); if (nt === normalize(phrase) || variants.includes(nt)) { matched = c; break; } }
          if (!matched?.id) continue;
          boldNodes.forEach(node => { if (normalize((node.textContent||'').trim()) !== normalize(phrase)) return; if (wrapNodeInAnchor(node, matched)) linkedCount++; });
        } catch (_) {}
      }
      const newDelta = editor.clipboard.convert(container.innerHTML);
      editor.setContents(newDelta, 'user');
      setSummaryText(editor.root.innerHTML);
      alert(`Exact auto-link complete — ${linkedCount} item(s) linked.`);
    } catch { alert('Exact auto-link failed.'); }
  };

  const autoLinkBoldKeywords = async () => {
    const editor = quillRef.current?.getEditor();
    if (!editor) { alert('Editor not ready'); return; }
    try {
      const container = document.createElement('div');
      container.innerHTML = editor.root.innerHTML;
      const boldNodes = Array.from(container.querySelectorAll('strong, b'));
      const phrases = Array.from(new Set(boldNodes.map(n => (n.textContent||'').trim()).filter(s => s.length >= 2 && s.length <= 200))).slice(0, 200);
      if (!phrases.length) { alert('No bolded phrases found.'); return; }
      let kwSample = [];
      try { kwSample = await fetchKeywordRows(800); } catch (_) {}
      let linkedCount = 0;
      for (const phrase of phrases) {
        try {
          const tokens = uniqueWords(phrase);
          const normalizedTokens = tokens.map(t => normalize(t));
          const titleCands = await fetchTitleCandidates(phrase, 200);
          const kwCands = kwSample.filter(r => {
            try {
              if (!r?.keywords) return false;
              const kws = r.keywords.map(k => normalize(String(k||'')));
              return normalizedTokens.some(t => kws.includes(t) || kws.some(k => k.includes(t))) || kws.includes(normalize(phrase));
            } catch { return false; }
          });
          const byId = new Map();
          titleCands.forEach(c => { if (c?.id) byId.set(c.id, c); });
          kwCands.forEach(c => { if (c?.id && !byId.has(c.id)) byId.set(c.id, c); });
          const merged = Array.from(byId.values()); if (!merged.length) continue;
          let best = null, bestScore = 0;
          for (const c of merged) {
            try {
              let score = combinedScore(c.title||'', phrase);
              if (normalize(c.title) === normalize(phrase)) score = Math.max(score, 0.95);
              if (Array.isArray(c.keywords)) {
                const kws = c.keywords.map(k => normalize(String(k||'')));
                if (kws.includes(normalize(phrase))) score = Math.max(score, score + 0.6);
                else { const matches = normalizedTokens.filter(t => kws.some(k => k === t || k.includes(t))).length; if (matches > 0) score += Math.min(0.35, 0.12 * matches); }
              }
              if (score > 1) score = 1;
              if (score > bestScore) { bestScore = score; best = c; }
            } catch (_) {}
          }
          if (!best?.id || bestScore < 0.65) continue;
          boldNodes.forEach(node => { if (normalize((node.textContent||'').trim()) !== normalize(phrase)) return; if (wrapNodeInAnchor(node, best)) linkedCount++; });
        } catch (_) {}
      }
      const newDelta = editor.clipboard.convert(container.innerHTML);
      editor.setContents(newDelta, 'user');
      setSummaryText(editor.root.innerHTML);
      alert(`Keyword auto-link complete — ${linkedCount} item(s) linked.`);
    } catch { alert('Keyword auto-link failed.'); }
  };

  const resetAndAutoRelink = async () => {
    if (!confirm('This will remove existing internal links, make them bold, then re-link. Continue?')) return;
    removeLinksAndMakeBold();
    await new Promise(r => setTimeout(r, 140));
    await autoLinkBoldedPhrases();
  };

  const insertInternalLink = (summaryItem) => {
    const editor = quillRef.current?.getEditor();
    if (!editor) return;
    const range = selectedRangeForLink || editor.getSelection();
    if (!range) { alert('Unable to determine selection.'); setShowInternalLinkModal(false); return; }
    editor.focus(); editor.setSelection(range.index, range.length);
    const selectedText = (range.length && editor.getText(range.index, range.length).trim()) || summaryItem.title || 'link';
    const linkHref = toLibraryHref(summaryItem);
    editor.deleteText(range.index, range.length);
    editor.insertText(range.index, selectedText, { link: linkHref }, 'user');
    try {
      const [leaf] = editor.getLeaf(range.index);
      const anchor = leaf?.domNode?.parentElement?.tagName === 'A' ? leaf.domNode.parentElement : null;
      if (anchor) { anchor.setAttribute('data-summary-id', summaryItem.id); anchor.classList.add('internal-summary-link'); anchor.setAttribute('href', linkHref); }
      else {
        const safe = selectedText.replace(/</g,'&lt;').replace(/>/g,'&gt;');
        editor.deleteText(range.index, selectedText.length);
        editor.clipboard.dangerouslyPasteHTML(range.index, `<a data-summary-id="${summaryItem.id}" class="internal-summary-link" href="${linkHref}">${safe}</a>`);
      }
    } catch (err) {
      const safe = selectedText.replace(/</g,'&lt;').replace(/>/g,'&gt;');
      try { editor.deleteText(range.index, selectedText.length); } catch (_) {}
      editor.clipboard.dangerouslyPasteHTML(range.index, `<a data-summary-id="${summaryItem.id}" class="internal-summary-link" href="${linkHref}">${safe}</a>`);
    }
    editor.setSelection(range.index + selectedText.length, 0);
    setShowInternalLinkModal(false); setLinkSearch(''); setLinkResults([]); setSelectedRangeForLink(null);
  };

  const copyContentId = async () => {
    if (!summary.id) return;
    try {
      if (navigator.clipboard && window.isSecureContext) await navigator.clipboard.writeText(summary.id);
      else { const ta = document.createElement('textarea'); ta.value = summary.id; ta.style.position = 'fixed'; ta.style.left = '-9999px'; document.body.appendChild(ta); ta.focus(); ta.select(); document.execCommand('copy'); document.body.removeChild(ta); }
      alert('Content ID copied to clipboard');
    } catch { alert('Failed to copy ID'); }
  };

  /* ══════════════════════════════════════════════════════
     AUTO-SAVE  (background, silent — unchanged)
  ══════════════════════════════════════════════════════ */
  const buildSnapshot = useCallback(() =>
    JSON.stringify({ title, author, description, summaryText, category, imageUrl, affiliateLink, affiliateType, youtubeUrl, tags, keywordInput, difficulty }),
    [title, author, description, summaryText, category, imageUrl, affiliateLink, affiliateType, youtubeUrl, tags, keywordInput, difficulty]
  );

  const buildPayload = useCallback(async (status) => {
    const { data: { user } = {} } = await supabase.auth.getUser();
    const affiliateValue = affiliateLink?.trim() ? `${affiliateType}|${affiliateLink.trim()}` : null;
    const difficultyToSave = ['Beginner','Intermediate','Advanced'].includes(difficulty) ? difficulty : null;
    const kws = editedKeywords ? keywords.slice(0, KEYWORDS_LIMIT) : (Array.isArray(summary?.keywords) ? summary.keywords : parseKeywordsCSV(summary?.keywords || ''));
    return {
      title:           title.trim() || 'Untitled Draft',
      author:          author.trim() || '',
      description:     description.trim() || null,
      summary:         summaryText || null,
      category:        category === DRAFT_SENTINEL ? null : category,
      user_id:         user?.id,
      image_url:       imageUrl || null,
      affiliate_link:  affiliateValue,
      youtube_url:     youtubeUrl || null,
      tags:            Array.isArray(tags) ? tags.filter(Boolean) : [],
      keywords:        kws.length ? kws : null,
      difficulty_level: difficultyToSave,
      status,
      auto_saved_at:   status === 'draft' ? new Date().toISOString() : null,
    };
  }, [title, author, description, summaryText, category, imageUrl, affiliateLink, affiliateType, youtubeUrl, tags, keywords, keywordInput, difficulty, editedKeywords, summary]);

  // Background auto-save — does NOT close form, no toast
  const _autoSave = useCallback(async () => {
    if (!title.trim() && !summaryText.trim()) return null;
    setAutoSaveStatus('saving');
    try {
      const payload = await buildPayload('draft');
      if (!payload.user_id) { setAutoSaveStatus('error'); return null; }

      if (draftId) {
        const { error } = await supabase.from('book_summaries').update(payload).eq('id', draftId).eq('user_id', payload.user_id);
        if (error) throw error;
      } else {
        let finalSlug = slug || slugify(title || `draft-${Date.now()}`, { lower: true, strict: true, replacement: '-' });
        try {
          const { data: ex } = await supabase.from('book_summaries').select('id').eq('slug', finalSlug).maybeSingle();
          if (ex) {
            let c = 2;
            while (true) {
              const ns = `${finalSlug}-${c}`;
              const { data: ex2 } = await supabase.from('book_summaries').select('id').eq('slug', ns).maybeSingle();
              if (!ex2) { finalSlug = ns; break; }
              if (++c > 1000) { finalSlug = `${finalSlug}-${Date.now()}`; break; }
            }
          }
        } catch (_) {}
        payload.slug = finalSlug;
        const { data: ins, error } = await supabase.from('book_summaries').insert([payload]).select('id').single();
        if (error) throw error;
        setDraftId(ins.id);
        initialIdRef.current = ins.id;
      }
      lastSnapshotRef.current = buildSnapshot();
      setAutoSaveStatus('saved');
    } catch (err) {
      console.error('Auto-save error:', err);
      setAutoSaveStatus('error');
    }
  }, [title, summaryText, buildPayload, draftId, slug, buildSnapshot]);

  useEffect(() => {
    if (!title.trim() && !summaryText.trim()) return;
    if (buildSnapshot() === lastSnapshotRef.current) return;
    clearTimeout(autoSaveTimer.current);
    autoSaveTimer.current = setTimeout(_autoSave, AUTO_SAVE_MS);
    return () => clearTimeout(autoSaveTimer.current);
  }, [title, author, description, summaryText, category, imageUrl, affiliateLink, affiliateType, youtubeUrl, tags, keywordInput, difficulty, _autoSave, buildSnapshot]);

  useEffect(() => () => clearTimeout(autoSaveTimer.current), []);

  /* ══════════════════════════════════════════════════════
     TITLE EXISTS CHECK  (any status — draft or published)
  ══════════════════════════════════════════════════════ */
  const checkTitleExists = useCallback(async (t, excludeId = null) => {
    if (!t?.trim()) return { exists: false };
    try {
      let q = supabase.from('book_summaries').select('id, status').ilike('title', t.trim());
      if (excludeId) q = q.neq('id', excludeId);
      const { data } = await q.limit(1).maybeSingle();
      return data ? { exists: true, status: data.status } : { exists: false };
    } catch { return { exists: false }; }
  }, []);

  /* ══════════════════════════════════════════════════════
     SAVE DRAFT  (manual button — NEW behaviour)
     • Checks title duplicate across ALL statuses
     • Saves once (draftSaving guard prevents double-click)
     • Closes form
     • Shows toast
  ══════════════════════════════════════════════════════ */
  const handleSaveDraft = useCallback(async () => {
    if (draftSaving) return;
    setTitleDupeWarning('');
    setErrorMsg('');

    if (!title.trim()) {
      setErrorMsg('Please enter a title before saving.');
      return;
    }

    // Title duplicate check — excludes current article's own ID
    const excludeId = draftId || summary.id || null;
    const check = await checkTitleExists(title.trim(), excludeId);
    if (check.exists) {
      setTitleDupeWarning(
        `⚠️ An article called "${title.trim()}" already exists${check.status === 'draft' ? ' (as a draft)' : ' (published)'}. Please use a different title.`
      );
      return;
    }

    setDraftSaving(true);
    try {
      const payload = await buildPayload('draft');
      if (!payload.user_id) throw new Error('You must be logged in.');

      if (draftId) {
        const { error } = await supabase.from('book_summaries')
          .update(payload).eq('id', draftId).eq('user_id', payload.user_id);
        if (error) throw error;
      } else {
        let finalSlug = slug || slugify(title || `draft-${Date.now()}`, { lower: true, strict: true, replacement: '-' });
        try {
          const { data: ex } = await supabase.from('book_summaries').select('id').eq('slug', finalSlug).maybeSingle();
          if (ex) {
            let c = 2;
            while (true) {
              const ns = `${finalSlug}-${c}`;
              const { data: ex2 } = await supabase.from('book_summaries').select('id').eq('slug', ns).maybeSingle();
              if (!ex2) { finalSlug = ns; break; }
              if (++c > 1000) { finalSlug = `${finalSlug}-${Date.now()}`; break; }
            }
          }
        } catch (_) {}
        payload.slug = finalSlug;
        const { data: ins, error } = await supabase.from('book_summaries').insert([payload]).select('id').single();
        if (error) throw error;
        setDraftId(ins.id);
        initialIdRef.current = ins.id;
      }

      // Signal parent refresh, show toast, close
      if (typeof onUpdate === 'function') onUpdate(null);
      setToast({ message: '✅ Draft saved successfully', type: 'success' });
      setTimeout(() => {
        if (typeof onClose === 'function') onClose();
      }, 1200);

    } catch (err) {
      console.error('Save draft error:', err);
      setToast({ message: `❌ Could not save: ${err.message}`, type: 'error' });
      setDraftSaving(false);
    }
  }, [draftSaving, title, draftId, summary.id, checkTitleExists, buildPayload, slug, onUpdate, onClose]);

  /* ══════════════════════════════════════════════════════
     SUBMIT (PUBLISH)
  ══════════════════════════════════════════════════════ */
  const handleSubmit = async (e) => {
    e.preventDefault();
    setErrorMsg(''); setTitleDupeWarning('');
    if (!title.trim())  { setErrorMsg('Title is required'); return; }
    if (!author.trim()) { setErrorMsg('Author is required'); return; }
    if (!category || category === DRAFT_SENTINEL) { setErrorMsg('Category is required to publish.'); return; }

    // Duplicate check for publish — published only
    try {
      let q = supabase.from('book_summaries').select('id').ilike('title', title.trim()).eq('status', 'published');
      const excludeId = draftId || summary.id || null;
      if (excludeId) q = q.neq('id', excludeId);
      const { data } = await q.limit(1).maybeSingle();
      if (data) {
        setTitleDupeWarning(`⚠️ A published article called "${title.trim()}" already exists. Change the title before publishing.`);
        return;
      }
    } catch (_) {}

    setLoading(true);
    try {
      const { data: authData } = await supabase.auth.getUser();
      const user = authData?.user;
      if (!user) { setErrorMsg('You must be signed in.'); setLoading(false); return; }

      const payload = await buildPayload('published');
      payload.user_id = user.id;

      const targetId = draftId || initialIdRef.current;
      if (!targetId) {
        let finalSlug = slug || slugify(title||'', { lower: true, strict: true, replacement: '-' });
        try {
          const { data: ex } = await supabase.from('book_summaries').select('id').eq('slug', finalSlug).maybeSingle();
          if (ex) {
            let c = 2;
            while (true) {
              const ns = `${finalSlug}-${c}`;
              const { data: ex2 } = await supabase.from('book_summaries').select('id').eq('slug', ns).maybeSingle();
              if (!ex2) { finalSlug = ns; break; }
              if (++c > 1000) { finalSlug = `${finalSlug}-${Date.now()}`; break; }
            }
          }
        } catch (_) {}
        payload.slug = finalSlug;
      }

      let resultData = null;
      if (targetId) {
        const { data, error } = await supabase.from('book_summaries').update(payload).eq('id', targetId).select().maybeSingle();
        if (error) { setErrorMsg(error.message || 'Failed to update'); setLoading(false); return; }
        resultData = data || null;
      } else {
        const { data, error } = await supabase.from('book_summaries').insert([payload]).select().maybeSingle();
        if (error) { setErrorMsg(error.message || 'Failed to create'); setLoading(false); return; }
        resultData = data || null;
      }

      if (resultData) {
        const dbKw = Array.isArray(resultData.keywords)
          ? resultData.keywords.map(k => String(k||'').trim().toLowerCase()).filter(Boolean)
          : (typeof resultData.keywords === 'string' ? parseKeywordsCSV(resultData.keywords) : []);
        const uniq = Array.from(new Set(dbKw)).slice(0, KEYWORDS_LIMIT);
        setKeywords(uniq); setKeywordInput(uniq.length ? uniq.join(', ') : ''); setEditedKeywords(false);
      }

      setLoading(false);
      if (typeof onUpdate === 'function') onUpdate(resultData);
      if (typeof onClose  === 'function') onClose();
    } catch (err) {
      console.error('Unexpected edit error', err);
      setErrorMsg('Unexpected error. Check console.');
      setLoading(false);
    }
  };

  /* ══════════════════════════════════════════════════════
     DELETE
  ══════════════════════════════════════════════════════ */
  const handleDelete = async () => {
    const targetId = draftId || summary.id;
    if (!targetId) return;
    setDeleteLoading(true);
    try {
      const { data: { user } = {} } = await supabase.auth.getUser();
      if (!user) throw new Error('Not logged in');
      const { error } = await supabase.from('book_summaries').delete().eq('id', targetId).eq('user_id', user.id);
      if (error) throw error;
      setShowDeleteConfirm(false);
      if (typeof onUpdate === 'function') onUpdate(null);
      if (typeof onClose  === 'function') onClose();
    } catch (err) {
      console.error('Delete error:', err);
      alert(`Could not delete: ${err.message}`);
    } finally { setDeleteLoading(false); }
  };

  /* ── misc ─────────────────────────────────────────────── */
  const isDraftMode = category === DRAFT_SENTINEL;
  const canPublish  = !isDraftMode;
  const autoSaveLabel = { idle:'', saving:'💾 Saving…', saved:'✅ Draft saved', error:'⚠️ Auto-save failed' }[autoSaveStatus];
  const hasId = !!(draftId || summary.id);

  if (!portalElRef.current) return null;

  const modal = (
    <>
      {toast && <Toast message={toast.message} type={toast.type} onDone={() => setToast(null)} />}

      <div
        className="modal-overlay"
        role="presentation"
        onClick={e => { if (e.target === e.currentTarget) onClose(); }}
      >
        <div
          className="modal-content edit-large"
          role="dialog"
          aria-modal="true"
          aria-label="Edit Summary"
          onClick={e => e.stopPropagation()}
        >
          {/* Header */}
          <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between', marginBottom:12 }}>
            <div style={{ display:'flex', alignItems:'center', gap:10 }}>
              <button className="close-button" onClick={onClose} aria-label="Close">&times;</button>
              <h2 style={{ margin:0 }}>{isEditing ? 'Edit Summary' : 'Create Summary'}</h2>
            </div>
            <div style={{ display:'flex', gap:10, alignItems:'center' }}>
              {autoSaveLabel && (
                <span style={{ fontSize:13, color: autoSaveStatus==='error'?'#ef4444':'#6b7280' }}>
                  {autoSaveLabel}
                </span>
              )}
              {isDraftMode && (
                <span style={{ background:'#fef3c7', color:'#92400e', border:'1px solid #fbbf24', borderRadius:20, padding:'2px 10px', fontSize:12, fontWeight:600 }}>
                  DRAFT
                </span>
              )}
            </div>
          </div>

          {errorMsg && <div className="form-error" role="alert">{errorMsg}</div>}
          {titleDupeWarning && (
            <div className="form-error" style={{ background:'#fef3c7', borderColor:'#fbbf24', color:'#92400e' }} role="alert">
              {titleDupeWarning}
            </div>
          )}

          <form onSubmit={handleSubmit} className="summary-form">
            {/* Title */}
            <label htmlFor="es-title">Title</label>
            <input
              id="es-title"
              type="text"
              value={title}
              onChange={e => { setTitle(e.target.value); setTitleDupeWarning(''); setErrorMsg(''); }}
              required
            />
            <small className="slug-preview">Slug: <code>{slug || '(will be generated)'}</code></small>

            {/* Content ID */}
            {summary.id && (
              <div style={{ marginTop:6, marginBottom:8 }}>
                <small>Content ID: <code style={{ wordBreak:'break-all' }}>{summary.id}</code></small>{' '}
                <button type="button" className="hf-btn" onClick={copyContentId} style={{ marginLeft:8 }}>Copy ID</button>
              </div>
            )}

            <label htmlFor="es-author">Author</label>
            <input id="es-author" type="text" value={author} onChange={e => setAuthor(e.target.value)} required />

            <label htmlFor="es-category">
              Category
              <span style={{ color:'#6b7280', fontWeight:400, fontSize:12, marginLeft:6 }}>
                — select a category to enable publishing
              </span>
            </label>
            <select id="es-category" value={category} onChange={e => setCategory(e.target.value)}>
              <option value={DRAFT_SENTINEL}>📝 Keep as Draft (auto-save)</option>
              {REAL_CATEGORIES.map(c => <option key={c} value={c}>{c}</option>)}
            </select>

            <label htmlFor="es-difficulty">Difficulty level (optional)</label>
            <select id="es-difficulty" value={difficulty} onChange={e => setDifficulty(e.target.value)}>
              {DIFFICULTIES.map(d => <option key={d.value} value={d.value}>{d.label}</option>)}
            </select>

            <label htmlFor="es-desc">Short description (feed preview)</label>
            <input id="es-desc" type="text" value={description} onChange={e => setDescription(e.target.value)} placeholder="Short 1-2 sentence description" />

            <label htmlFor="es-img">Cover image URL</label>
            <input id="es-img" type="url" value={imageUrl} onChange={e => setImageUrl(e.target.value)} placeholder="https://..." />

            <label htmlFor="es-aff">Affiliate link</label>
            <div className="affiliate-row-edit" style={{ display:'flex', gap:8, alignItems:'center', width:'100%', marginBottom:6 }}>
              <input id="es-aff" type="url" value={affiliateLink} onChange={e => setAffiliateLink(e.target.value)} placeholder="Paste affiliate link" style={{ flex:1, minWidth:0, padding:'8px 10px' }} />
              <select value={affiliateType} onChange={e => setAffiliateType(e.target.value)} style={{ width:'12%', minWidth:100, padding:'6px 8px' }}>
                <option value="book">Get Book</option>
                <option value="pdf">Get PDF</option>
                <option value="app">Open App</option>
              </select>
            </div>
            <small style={{ display:'block', marginTop:6, color:'#666' }}>Choose the type and paste the link.</small>

            <label htmlFor="es-yt">YouTube URL</label>
            <input id="es-yt" type="url" value={youtubeUrl} onChange={e => setYoutubeUrl(e.target.value)} placeholder="https://youtube.com/..." />
            {youtubeId && (
              <div className="youtube-preview">
                <iframe
                  title="youtube-preview"
                  src={`https://www.youtube.com/embed/${youtubeId}`}
                  frameBorder="0"
                  allowFullScreen
                  style={{ width:'100%', height:200, borderRadius:8 }}
                />
              </div>
            )}

            <label htmlFor="es-tags">Tags</label>
            <div className="tags-input-row">
              <input
                id="es-tags"
                type="text"
                placeholder="type tag then Enter or comma"
                value={tagInput}
                onChange={e => setTagInput(e.target.value)}
                onKeyDown={handleTagKey}
              />
              <button type="button" className="hf-btn" onClick={() => addTagFromInput(tagInput)}>Add</button>
            </div>
            <div className="tags-list">
              {(tags||[]).map(t => (
                <button type="button" key={t} className="tag-chip" onClick={() => removeTag(t)} title="click to remove">
                  {t} <span aria-hidden>✕</span>
                </button>
              ))}
            </div>

            <label htmlFor="es-kw">Keywords (optional)</label>
            <div className="keywords-row" style={{ display:'flex', gap:8, alignItems:'center', flexWrap:'wrap', marginBottom:8 }}>
              <input
                id="es-kw"
                type="text"
                value={keywordInput}
                onChange={e => { setKeywordInput(e.target.value); if (!editedKeywords) setEditedKeywords(true); }}
                onKeyDown={handleKeywordKey}
                placeholder="type keyword then Enter or comma"
                style={{ flex:'1 1 220px', minWidth:0, padding:'8px 10px' }}
              />
              <button type="button" className="hf-btn" onClick={() => addKeywordFromInput(keywordInput)}>Add</button>
              <button type="button" className="hf-btn" onClick={() => { setKeywords([]); setEditedKeywords(true); setKeywordInput(''); }}>Clear</button>
            </div>
            <div className="keywords-list" style={{ marginBottom:8 }}>
              {parsedKeywordsPreview.map(k => (
                <button key={k} type="button" className="tag-chip" onClick={() => removeKeyword(k)} title="Click to remove" style={{ marginRight:6 }}>
                  {k} <span aria-hidden>✕</span>
                </button>
              ))}
              {parsedKeywordsPreview.length === 0 && <div style={{ color:'#666', fontSize:13 }}>No keywords yet</div>}
            </div>
            <div style={{ fontSize:12, color:'#6b7280', marginBottom:12 }}>
              {parsedKeywordsPreview.length} / {KEYWORDS_LIMIT} keywords &nbsp;·&nbsp; Click ✕ to remove.
            </div>

            <label htmlFor="es-summary">Full summary</label>
            <div style={{ display:'flex', gap:8, marginBottom:8, flexWrap:'wrap', alignItems:'center' }}>
              <button type="button" className="hf-btn" onClick={removeLinksAndMakeBold}>✂️ Remove links & Bold</button>
              <button type="button" className="hf-btn" onClick={autoLinkBoldedPhrases}>🔗 Auto-link bolded phrases</button>
              <button type="button" className="hf-btn" onClick={autoLinkBoldToSlug}>🔗 Bold → Slug Link</button>
              <button type="button" className="hf-btn" onClick={autoLinkBoldExact}>🎯 Exact auto-link</button>
              <button type="button" className="hf-btn" onClick={autoLinkBoldKeywords}>🧠 Keyword auto-link</button>
              <button type="button" className="hf-btn" onClick={resetAndAutoRelink} style={{ background:'#eef2ff' }}>Reset & Auto-Relink</button>
              <button type="button" className="hf-btn" onClick={() => setShowInternalLinkModal(true)}>🔎 Manual link</button>
              <span style={{ color:'#6b7280', fontSize:12 }}>All links use /library/ route.</span>
            </div>
            <div className="quill-container">
              <ReactQuill
                ref={quillRef}
                theme="snow"
                value={summaryText}
                onChange={setSummaryText}
                modules={modules}
                formats={quillFormats}
              />
            </div>

            {/* Action bar */}
            <div style={{ display:'flex', gap:10, marginTop:16, alignItems:'center', flexWrap:'wrap' }}>

              {/* ── FIXED: Save Draft button ── */}
              <button
                type="button"
                className="hf-btn"
                onClick={handleSaveDraft}
                disabled={draftSaving || loading}
                style={{
                  background: draftSaving ? '#e5e7eb' : '#f3f4f6',
                  color: draftSaving ? '#9ca3af' : '#374151',
                  border: '1px solid #d1d5db',
                  cursor: draftSaving ? 'not-allowed' : 'pointer',
                  minWidth: 130,
                  fontWeight: 500,
                }}
              >
                {draftSaving ? '💾 Saving…' : '💾 Save Draft'}
              </button>

              {/* Publish */}
              <button
                type="submit"
                className="hf-btn"
                disabled={loading || !canPublish || draftSaving}
                title={!canPublish ? 'Select a category to publish' : ''}
                style={{
                  background: canPublish ? '#2563eb' : '#9ca3af',
                  color: '#fff',
                  border: 'none',
                  cursor: canPublish ? 'pointer' : 'not-allowed',
                  fontWeight: 600,
                }}
              >
                {loading ? 'Saving…' : (isEditing ? '🚀 Save & Publish' : '🚀 Publish')}
              </button>

              {!canPublish && (
                <span style={{ fontSize:12, color:'#9ca3af' }}>Select a category to publish</span>
              )}

              <button
                type="button"
                className="hf-btn"
                onClick={onClose}
                disabled={loading || draftSaving}
              >
                Cancel
              </button>

              {hasId && (
                <button
                  type="button"
                  onClick={() => setShowDeleteConfirm(true)}
                  style={{
                    marginLeft: 'auto',
                    background: '#fff',
                    color: '#dc2626',
                    border: '1.5px solid #fca5a5',
                    borderRadius: 6,
                    padding: '6px 14px',
                    cursor: 'pointer',
                    fontWeight: 500,
                    fontSize: 13,
                  }}
                >
                  🗑 Delete Article
                </button>
              )}
            </div>
          </form>

          {/* Internal link modal */}
          {showInternalLinkModal && (
            <div className="internal-link-modal" role="dialog" aria-modal="true" onClick={() => { setShowInternalLinkModal(false); setLinkSearch(''); setLinkResults([]); }}>
              <div className="internal-link-box" onClick={e => e.stopPropagation()}>
                <h4>Link to summary</h4>
                <input type="text" placeholder="Search summaries by title…" value={linkSearch} onChange={e => setLinkSearch(e.target.value)} autoFocus />
                <div className="link-results" style={{ maxHeight:240, overflowY:'auto', marginTop:8 }}>
                  {linkResults.length === 0 && <div style={{ padding:8, color:'#666' }}>No results</div>}
                  <ul style={{ listStyle:'none', padding:0, margin:0 }}>
                    {linkResults.map(r => (
                      <li key={r.id} style={{ marginBottom:6 }}>
                        <button type="button" className="hf-btn" onClick={() => insertInternalLink(r)} style={{ width:'100%', textAlign:'left' }}>{r.title}</button>
                      </li>
                    ))}
                  </ul>
                </div>
                <div style={{ display:'flex', gap:8, marginTop:10 }}>
                  <button className="hf-btn" onClick={() => { setShowInternalLinkModal(false); setLinkSearch(''); setLinkResults([]); }}>Cancel</button>
                </div>
              </div>
            </div>
          )}

          {/* Delete confirmation modal */}
          {showDeleteConfirm && (
            <div
              className="internal-link-modal"
              role="dialog"
              aria-modal="true"
              onClick={() => !deleteLoading && setShowDeleteConfirm(false)}
              style={{ zIndex:9999 }}
            >
              <div className="internal-link-box" onClick={e => e.stopPropagation()} style={{ maxWidth:420, textAlign:'center' }}>
                <div style={{ fontSize:44, marginBottom:8 }}>⚠️</div>
                <h3 style={{ margin:'0 0 8px', color:'#dc2626' }}>Delete this article?</h3>
                <p style={{ color:'#6b7280', marginBottom:20, fontSize:14 }}>
                  <strong>"{title || 'this article'}"</strong> will be permanently deleted and cannot be undone.
                </p>
                <div style={{ display:'flex', gap:12, justifyContent:'center' }}>
                  <button type="button" onClick={() => setShowDeleteConfirm(false)} disabled={deleteLoading}
                    style={{ padding:'9px 22px', borderRadius:6, border:'1px solid #d1d5db', background:'#f9fafb', cursor:'pointer', fontWeight:500 }}>
                    Cancel
                  </button>
                  <button type="button" onClick={handleDelete} disabled={deleteLoading}
                    style={{ padding:'9px 22px', borderRadius:6, border:'none', background:'#dc2626', color:'#fff', cursor:'pointer', fontWeight:600 }}>
                    {deleteLoading ? 'Deleting…' : 'Yes, Delete'}
                  </button>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </>
  );

  return createPortal(modal, portalElRef.current);
};

export default EditSummaryForm;