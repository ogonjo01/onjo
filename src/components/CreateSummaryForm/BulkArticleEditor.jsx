// src/components/CreateSummaryForm/BulkArticleEditor.jsx
// ONJO Reviews — Bulk Article Editor v4
//
// FIXES:
//  1. Individual "Save Draft" / "Publish" in bulk mode NEVER closes the modal.
//     The modal only closes when the parent explicitly calls onClose (e.g. after
//     "Save All as Drafts" completes ALL articles, or the user hits Cancel/X).
//     BulkArticleEditor never calls onClose itself.
//  2. "Save All as Drafts" stale-closure bug fixed.
//     onSaveDraft / onPublish now accept a plain article object instead of
//     looking one up from `articles` state, so the bulk loop always passes
//     fresh data and _draftId updates are threaded through correctly.

import React, { useState, useCallback, useRef } from "react";
import { supabase } from "../../supabase/supabaseClient";
import ReactQuill from "react-quill";
import slugify from "slugify";
import "quill/dist/quill.snow.css";

/* ── Constants ───────────────────────────────────────────── */
const DEFAULT_AUTHOR = "ONJO Literary House";

const REAL_CATEGORIES = [
  "Kitchen & Cooking", "Home & Garden", "Electronics & Tech", "Health & Fitness",
  "Health & Wellness", "Beauty & Personal Care", "Baby & Kids", "Sports & Outdoors",
  "Pet Supplies", "Automotive", "Office & Stationery", "Finance & Money Management",
  "Technology & Smart Devices", "Travel Essentials & Adventure", "Education & Learning Tools",
  "DIY & Home Projects", "Lifestyle & Personal Growth", "Business & Entrepreneurship Tools",
  "Parenting & Family Life", "Cooking & Recipe Resources",
];

const DRAFT_SENTINEL = "__DRAFT__";

/* ══════════════════════════════════════════════════════════
   MARKDOWN → HTML
══════════════════════════════════════════════════════════ */
function markdownToHtml(text) {
  if (!text || !text.trim()) return "";

  let html = text
    .replace(/\r\n/g, "\n")
    .replace(/\r/g, "\n");

  const hasHtml = /<[a-zA-Z][\s\S]*?>/.test(html);

  if (!hasHtml) {
    html = html.replace(/^#### (.+)$/gm, "<h4>$1</h4>");
    html = html.replace(/^### (.+)$/gm, "<h3>$1</h3>");
    html = html.replace(/^## (.+)$/gm, "<h2>$1</h2>");
    html = html.replace(/^# (.+)$/gm, "<h2>$1</h2>");

    html = html.replace(/\*\*\*(.+?)\*\*\*/g, "<strong><em>$1</em></strong>");
    html = html.replace(/\*\*(.+?)\*\*/g, "<strong>$1</strong>");
    html = html.replace(/__(.+?)__/g, "<strong>$1</strong>");
    html = html.replace(/\*([^*\n]+?)\*/g, "<em>$1</em>");
    html = html.replace(/_([^_\n]+?)_/g, "<em>$1</em>");

    html = html.replace(/~~(.+?)~~/g, "<s>$1</s>");
    html = html.replace(/`([^`]+)`/g, "<code>$1</code>");

    html = html.replace(
      /\[([^\]]+)\]\(([^)]+)\)/g,
      '<a href="$2" target="_blank" rel="noopener noreferrer">$1</a>'
    );

    html = html.replace(/^---+$/gm, "<hr>");
    html = html.replace(/^\*\*\*+$/gm, "<hr>");

    html = html.replace(/^(\s*[-*+] .+(\n|$))+/gm, (block) => {
      const items = block.trim().split("\n")
        .map(l => l.replace(/^\s*[-*+] /, "").trim())
        .filter(Boolean);
      return "<ul>" + items.map(i => `<li>${i}</li>`).join("") + "</ul>\n";
    });

    html = html.replace(/^(\s*\d+\. .+(\n|$))+/gm, (block) => {
      const items = block.trim().split("\n")
        .map(l => l.replace(/^\s*\d+\. /, "").trim())
        .filter(Boolean);
      return "<ol>" + items.map(i => `<li>${i}</li>`).join("") + "</ol>\n";
    });

    html = html.replace(/^> (.+)$/gm, "<blockquote>$1</blockquote>");

    const BLOCK_TAG = /^<(h[1-6]|ul|ol|li|blockquote|hr|div|p|table|thead|tbody|tr|td|th|figure)[\s>\/]/i;
    const lines = html.split("\n");
    const result = [];
    for (const line of lines) {
      const t = line.trim();
      if (!t) continue;
      if (BLOCK_TAG.test(t)) { result.push(t); continue; }
      result.push(`<p>${t}</p>`);
    }
    html = result.join("\n");

  } else {
    html = html.replace(
      /\[([^\]]+)\]\(([^)]+)\)/g,
      '<a href="$2" target="_blank" rel="noopener noreferrer">$1</a>'
    );
    html = html.replace(/\*\*(.+?)\*\*/g, "<strong>$1</strong>");
    html = html.replace(/\*([^*\n]+?)\*/g, "<em>$1</em>");

    const lines = html.split("\n");
    const result = [];
    for (const line of lines) {
      const t = line.trim();
      if (!t) continue;
      if (/^</.test(t)) { result.push(t); continue; }
      result.push(`<p>${t}</p>`);
    }
    html = result.join("\n");
  }

  html = html.replace(/<p>\s*<\/p>/g, "");
  html = html.replace(/\n{3,}/g, "\n\n");

  return html.trim();
}

/* ══════════════════════════════════════════════════════════
   ARTICLE PARSER
══════════════════════════════════════════════════════════ */
function splitArticles(raw) {
  return raw
    .split(/^ARTICLE\s+\d+\s*$/im)
    .map(s => s.trim())
    .filter(Boolean);
}

function parseOneArticle(text) {
  const lines = text.split("\n");

  let title = "";
  let metaDescription = "";
  let tags = "";
  let bodyLines = [];
  let inBody = false;
  let i = 0;

  while (i < lines.length) {
    const line = lines[i];
    const trimmed = line.trim();

    if (/^SEO Title:\s*/i.test(trimmed)) {
      title = trimmed.replace(/^SEO Title:\s*/i, "").trim();
      i++; continue;
    }

    if (/^Cover Image Prompt:\s*/i.test(trimmed)) {
      i++;
      while (i < lines.length) {
        const next = lines[i].trim();
        if (
          /^(SEO Title|Meta Description|Tags|##|Related Articles|Affiliate Disclosure):/i.test(next) ||
          /^ARTICLE\s+\d+/i.test(next) ||
          next === ""
        ) break;
        i++;
      }
      continue;
    }

    if (/^Meta Description:\s*/i.test(trimmed)) {
      metaDescription = trimmed.replace(/^Meta Description:\s*/i, "").trim();
      i++;
      while (i < lines.length) {
        const next = lines[i].trim();
        if (
          /^(SEO Title|Tags|Cover Image Prompt|##|Related Articles|Affiliate Disclosure):/i.test(next) ||
          /^ARTICLE\s+\d+/i.test(next) ||
          next === ""
        ) break;
        if (next) metaDescription += " " + next;
        i++;
      }
      continue;
    }

    if (/^Tags:\s*/i.test(trimmed)) {
      tags = trimmed.replace(/^Tags:\s*/i, "").trim();
      inBody = true;
      i++; continue;
    }

    if (inBody) {
      bodyLines.push(line);
    }

    i++;
  }

  const rawBody = bodyLines.join("\n").trim();
  const htmlBody = markdownToHtml(rawBody);

  return {
    title,
    author: DEFAULT_AUTHOR,
    description: metaDescription,
    tags,
    summaryText: htmlBody,
    affiliateLink: "",
    affiliateType: "buy",
    youtubeUrl: "",
    imageUrl: "",
    category: DRAFT_SENTINEL,
    _id: Math.random().toString(36).slice(2),
    _status: "idle",
    _error: "",
    _draftId: null,
  };
}

/* ── Slug resolver ───────────────────────────────────────── */
const resolveSlug = async (base, excludeId = null) => {
  let slug = base;
  try {
    let q = supabase.from("book_summaries").select("id").eq("slug", slug);
    if (excludeId) q = q.neq("id", excludeId);
    const { data: ex } = await q.maybeSingle();
    if (ex) {
      let c = 2;
      while (true) {
        const ns = `${base}-${c}`;
        let q2 = supabase.from("book_summaries").select("id").eq("slug", ns);
        if (excludeId) q2 = q2.neq("id", excludeId);
        const { data: ex2 } = await q2.maybeSingle();
        if (!ex2) { slug = ns; break; }
        if (++c > 1000) { slug = `${base}-${Date.now()}`; break; }
      }
    }
  } catch (_) {}
  return slug;
};

/* ── Quill config ────────────────────────────────────────── */
const QUILL_MODULES = {
  toolbar: [
    [{ header: [1, 2, 3, false] }],
    ["bold", "italic", "underline", "strike"],
    [{ list: "ordered" }, { list: "bullet" }],
    ["blockquote", "code-block"],
    ["link"],
    ["clean"],
  ],
  clipboard: { matchVisual: false },
};

const QUILL_FORMATS = [
  "header", "bold", "italic", "underline", "strike",
  "list", "bullet", "blockquote", "code-block", "link",
];

/* ── Payload builder (pure, no state deps) ───────────────── */
const buildPayload = (art, user, slug, status) => ({
  title:          art.title.trim() || "Untitled Draft",
  author:         art.author.trim() || DEFAULT_AUTHOR,
  description:    art.description?.trim() || null,
  summary:        art.summaryText || null,
  category:       art.category === DRAFT_SENTINEL ? null : art.category,
  user_id:        user.id,
  image_url:      art.imageUrl || null,
  affiliate_link: art.affiliateLink?.trim() ? `${art.affiliateType}|${art.affiliateLink.trim()}` : null,
  youtube_url:    art.youtubeUrl || null,
  tags:           (art.tags || "").split(",").map(t => t.trim().toLowerCase()).filter(Boolean),
  slug,
  status,
  auto_saved_at:  status === "draft" ? new Date().toISOString() : null,
});

/* ══════════════════════════════════════════════════════════
   CORE SAVE / PUBLISH — standalone async functions
   These take the article object directly so they are
   completely free of stale-closure issues.
══════════════════════════════════════════════════════════ */

/**
 * Saves a single article as a draft.
 * Returns { ok: true, draftId } on success, { ok: false, error } on failure.
 * NEVER touches modal close logic.
 */
async function saveDraftCore(art) {
  if (!art.title?.trim()) {
    return { ok: false, error: "SEO Title is required" };
  }
  try {
    const { data: { user } = {} } = await supabase.auth.getUser();
    if (!user) throw new Error("Not logged in");

    const base = slugify(art.title || `draft-${Date.now()}`, { lower: true, strict: true, replacement: "-" });
    const slug = await resolveSlug(base, art._draftId);
    const payload = buildPayload(art, user, slug, "draft");

    let draftId = art._draftId;
    if (draftId) {
      const { error } = await supabase
        .from("book_summaries").update(payload).eq("id", draftId).eq("user_id", user.id);
      if (error) throw error;
    } else {
      const { data: ins, error } = await supabase
        .from("book_summaries").insert([payload]).select("id").single();
      if (error) throw error;
      draftId = ins.id;
    }
    return { ok: true, draftId };
  } catch (err) {
    return { ok: false, error: err.message };
  }
}

/**
 * Publishes a single article.
 * Returns { ok: true, draftId } on success, { ok: false, error } on failure.
 * NEVER touches modal close logic.
 */
async function publishCore(art) {
  if (!art.title?.trim() || !art.author?.trim()) {
    return { ok: false, error: "SEO Title and Author are required" };
  }
  if (art.category === DRAFT_SENTINEL) {
    return { ok: false, error: "Select a category to publish" };
  }
  try {
    const { data: { user } = {} } = await supabase.auth.getUser();
    if (!user) throw new Error("Not logged in");

    const base = slugify(art.title || `article-${Date.now()}`, { lower: true, strict: true, replacement: "-" });
    const slug = await resolveSlug(base, art._draftId);
    const payload = buildPayload(art, user, slug, "published");

    let draftId = art._draftId;
    if (draftId) {
      const { error } = await supabase
        .from("book_summaries").update(payload).eq("id", draftId).eq("user_id", user.id);
      if (error) throw error;
    } else {
      const { data: ins, error } = await supabase
        .from("book_summaries").insert([payload]).select("id").single();
      if (error) throw error;
      draftId = ins.id;
    }
    return { ok: true, draftId };
  } catch (err) {
    return { ok: false, error: err.message };
  }
}

/* ══════════════════════════════════════════════════════════
   ARTICLE CARD
══════════════════════════════════════════════════════════ */
const ArticleCard = ({ article, index, onUpdate, onSaveDraft, onPublish, onDelete, disabled }) => {
  const [expanded, setExpanded] = useState(false);

  const STATUS = {
    idle:      { color: "#6b7280", bg: "",        label: "" },
    saving:    { color: "#b45309", bg: "#fef3c7", label: "💾 Saving…" },
    saved:     { color: "#16a34a", bg: "#dcfce7", label: "✅ Saved as Draft" },
    published: { color: "#2563eb", bg: "#dbeafe", label: "🚀 Published" },
    error:     { color: "#dc2626", bg: "#fee2e2", label: `❌ ${article._error}` },
    deleted:   { color: "#9ca3af", bg: "#f3f4f6", label: "🗑 Deleted" },
  };
  const s = STATUS[article._status] || STATUS.idle;

  const isDone  = ["saved", "published", "deleted"].includes(article._status);
  const isError = article._status === "error";
  const missing = [
    ...(!article.title?.trim()  ? ["Title"]  : []),
    ...(!article.author?.trim() ? ["Author"] : []),
  ];
  const canPublish = article.category !== DRAFT_SENTINEL;

  return (
    <div style={{
      border: `1.5px solid ${isError ? "#fca5a5" : isDone ? "#86efac" : "#e5e7eb"}`,
      borderRadius: 10,
      background: "#fff",
      boxShadow: "0 1px 3px rgba(0,0,0,0.04)",
      overflow: "hidden",
    }}>

      {/* Header row */}
      <div
        onClick={() => setExpanded(v => !v)}
        style={{
          display: "flex", alignItems: "center", gap: 12,
          padding: "13px 18px", cursor: "pointer",
          background: expanded ? "#fafafa" : "#fff",
          borderBottom: expanded ? "1px solid #f0f0f0" : "none",
          userSelect: "none",
        }}
      >
        <span style={{
          display: "inline-flex", alignItems: "center", justifyContent: "center",
          width: 26, height: 26, borderRadius: "50%", flexShrink: 0,
          background: isDone ? "#16a34a" : isError ? "#dc2626" : "#111",
          color: "#fff", fontSize: 12, fontWeight: 700,
        }}>
          {isDone ? "✓" : isError ? "!" : index + 1}
        </span>

        <span style={{
          flex: 1, fontWeight: 600, fontSize: 14, color: "#111",
          overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap",
        }}>
          {article.title?.trim() || <em style={{ color: "#9ca3af", fontWeight: 400 }}>No SEO title parsed</em>}
        </span>

        {s.label && (
          <span style={{ fontSize: 12, fontWeight: 600, color: s.color, background: s.bg, padding: "2px 10px", borderRadius: 20, flexShrink: 0 }}>
            {s.label}
          </span>
        )}

        {missing.length > 0 && !expanded && (
          <span style={{ fontSize: 11, color: "#b45309", background: "#fef3c7", padding: "2px 8px", borderRadius: 20, flexShrink: 0 }}>
            ⚠️ Missing: {missing.join(", ")}
          </span>
        )}

        <span style={{
          fontSize: 11, color: "#9ca3af", flexShrink: 0, marginLeft: 4,
          transform: expanded ? "rotate(180deg)" : "rotate(0deg)",
          transition: "transform 0.18s",
        }}>▼</span>
      </div>

      {/* Expanded content */}
      {expanded && (
        <div style={{ padding: "18px 20px 16px" }}>

          {missing.length > 0 && (
            <div style={{ marginBottom: 14, padding: "10px 14px", background: "#fef3c7", border: "1px solid #fbbf24", borderRadius: 6, color: "#92400e", fontSize: 13 }}>
              ⚠️ Missing required fields: <strong>{missing.join(", ")}</strong>
            </div>
          )}

          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16 }}>
            {/* Left */}
            <div style={{ display: "flex", flexDirection: "column" }}>
              <label style={S.label}>SEO Title *</label>
              <input style={S.input} value={article.title}
                onChange={e => onUpdate(article._id, { title: e.target.value })} />

              <label style={S.label}>Author *</label>
              <input style={S.input} value={article.author}
                onChange={e => onUpdate(article._id, { author: e.target.value })} />

              <label style={S.label}>Tags</label>
              <input style={S.input} value={article.tags}
                onChange={e => onUpdate(article._id, { tags: e.target.value })}
                placeholder="tag1, tag2, tag3" />

              <label style={S.label}>
                Category
                <span style={{ color: "#9ca3af", fontSize: 11, fontWeight: 400, marginLeft: 4 }}>
                  — select to enable publish
                </span>
              </label>
              <select style={S.select} value={article.category}
                onChange={e => onUpdate(article._id, { category: e.target.value })}>
                <option value={DRAFT_SENTINEL}>📝 Keep as Draft</option>
                {REAL_CATEGORIES.map(c => <option key={c} value={c}>{c}</option>)}
              </select>
            </div>

            {/* Right */}
            <div style={{ display: "flex", flexDirection: "column" }}>
              <label style={S.label}>Meta Description</label>
              <textarea style={{ ...S.input, height: 80, resize: "vertical" }}
                value={article.description}
                onChange={e => onUpdate(article._id, { description: e.target.value })}
                placeholder="Short preview (150–250 chars)" maxLength={300} />

              <label style={S.label}>Affiliate / Buy Link</label>
              <div style={{ display: "flex", gap: 6 }}>
                <input style={{ ...S.input, flex: "0 0 63%" }} value={article.affiliateLink}
                  onChange={e => onUpdate(article._id, { affiliateLink: e.target.value })}
                  placeholder="https://…" type="url" />
                <select style={{ ...S.select, flex: "0 0 35%" }} value={article.affiliateType}
                  onChange={e => onUpdate(article._id, { affiliateType: e.target.value })}>
                  <option value="buy">Buy Now</option>
                  <option value="get">Get Product</option>
                  <option value="check">Check Price</option>
                  <option value="app">Open App</option>
                  <option value="try">Try Free</option>
                </select>
              </div>

              <label style={S.label}>YouTube URL</label>
              <input style={S.input} value={article.youtubeUrl}
                onChange={e => onUpdate(article._id, { youtubeUrl: e.target.value })}
                placeholder="https://youtube.com/…" type="url" />

              <label style={S.label}>Product Image URL</label>
              <input style={S.input} value={article.imageUrl}
                onChange={e => onUpdate(article._id, { imageUrl: e.target.value })}
                placeholder="https://example.com/product.jpg" type="url" />
            </div>
          </div>

          <label style={{ ...S.label, marginTop: 16, display: "block" }}>Article Content</label>
          <div style={{ border: "1px solid #e5e7eb", borderRadius: 6, overflow: "hidden", marginBottom: 14 }}>
            <ReactQuill
              value={article.summaryText}
              onChange={val => onUpdate(article._id, { summaryText: val })}
              modules={QUILL_MODULES}
              formats={QUILL_FORMATS}
              theme="snow"
              style={{ minHeight: 240 }}
            />
          </div>

          {/* Action bar — no onClose calls here */}
          <div style={{ display: "flex", gap: 10, alignItems: "center", flexWrap: "wrap", paddingTop: 12, borderTop: "1px solid #f0f0f0" }}>
            <button style={{ ...S.btn, ...S.btnDraft }}
              disabled={disabled || article._status === "saving"}
              onClick={() => onSaveDraft(article._id)}>
              {article._status === "saving" ? "💾 Saving…" : "💾 Save Draft"}
            </button>

            <button
              style={{ ...S.btn, background: canPublish ? "#2563eb" : "#9ca3af", color: "#fff", border: "none", cursor: canPublish ? "pointer" : "not-allowed" }}
              disabled={disabled || !canPublish || article._status === "saving"}
              title={!canPublish ? "Select a category to publish" : ""}
              onClick={() => onPublish(article._id)}>
              🚀 Publish
            </button>

            {!canPublish && (
              <span style={{ fontSize: 11, color: "#9ca3af" }}>Select a category to publish</span>
            )}

            <button
              style={{ ...S.btn, marginLeft: "auto", color: "#dc2626", border: "1.5px solid #fca5a5", background: "#fff" }}
              disabled={disabled}
              onClick={() => onDelete(article._id)}>
              🗑 Delete
            </button>

            {isDone && (
              <button
                style={{ ...S.btn, color: "#6b7280", border: "1px solid #e5e7eb", background: "#f9fafb" }}
                onClick={() => setExpanded(false)}>
                ▲ Collapse
              </button>
            )}
          </div>
        </div>
      )}
    </div>
  );
};

/* ══════════════════════════════════════════════════════════
   BULK EDITOR — main export
══════════════════════════════════════════════════════════ */
const BulkArticleEditor = ({ onNewSummary, onClose }) => {
  const [rawText,     setRawText]     = useState("");
  const [articles,    setArticles]    = useState([]);
  const [parsing,     setParsing]     = useState(false);
  const [parseError,  setParseError]  = useState("");
  const [bulkStatus,  setBulkStatus]  = useState("");
  const [bulkWorking, setBulkWorking] = useState(false);
  const bottomRef = useRef(null);

  /* ── articlesRef: always holds the latest articles array
        Used by bulk loops to read fresh _draftId values
        without triggering re-renders or stale closures.    */
  const articlesRef = useRef(articles);
  articlesRef.current = articles;

  const onUpdate = useCallback((id, patch) =>
    setArticles(prev => prev.map(a => a._id === id ? { ...a, ...patch } : a)), []);

  /* ── Parse ── */
  const handleParse = useCallback(() => {
    if (!rawText.trim()) { setParseError("Paste your articles above first."); return; }
    setParsing(true);
    setParseError("");
    try {
      const chunks = splitArticles(rawText);
      if (!chunks.length) {
        setParseError("No articles found. Each article must start with a line: ARTICLE 1");
        setParsing(false);
        return;
      }
      setArticles(chunks.map(parseOneArticle));
    } catch (err) {
      setParseError("Parsing failed: " + err.message);
    }
    setParsing(false);
  }, [rawText]);

  /* ──────────────────────────────────────────────────────
     onSaveDraft(id)
     - Marks article as "saving"
     - Reads current article from state (via setArticles callback)
     - Calls saveDraftCore with the live article object
     - Updates state with result
     - NEVER calls onClose
  ────────────────────────────────────────────────────── */
  const onSaveDraft = useCallback(async (id) => {
    // Grab the latest version of this article from the ref
    const art = articlesRef.current.find(a => a._id === id);
    if (!art) return;

    setArticles(prev => prev.map(a => a._id === id ? { ...a, _status: "saving" } : a));

    const result = await saveDraftCore(art);

    if (result.ok) {
      setArticles(prev => prev.map(a =>
        a._id === id ? { ...a, _status: "saved", _draftId: result.draftId } : a
      ));
      if (typeof onNewSummary === "function") onNewSummary();
      // ✅ No onClose() call here — modal stays open
    } else {
      setArticles(prev => prev.map(a =>
        a._id === id ? { ...a, _status: "error", _error: result.error } : a
      ));
    }
  }, [onNewSummary]);

  /* ──────────────────────────────────────────────────────
     onPublish(id)
     - Same pattern as onSaveDraft
     - NEVER calls onClose
  ────────────────────────────────────────────────────── */
  const onPublish = useCallback(async (id) => {
    const art = articlesRef.current.find(a => a._id === id);
    if (!art) return;

    setArticles(prev => prev.map(a => a._id === id ? { ...a, _status: "saving" } : a));

    const result = await publishCore(art);

    if (result.ok) {
      setArticles(prev => prev.map(a =>
        a._id === id ? { ...a, _status: "published", _draftId: result.draftId } : a
      ));
      if (typeof onNewSummary === "function") onNewSummary();
      // ✅ No onClose() call here — modal stays open
    } else {
      setArticles(prev => prev.map(a =>
        a._id === id ? { ...a, _status: "error", _error: result.error } : a
      ));
    }
  }, [onNewSummary]);

  /* ── Delete ── */
  const onDelete = useCallback(async (id) => {
    const art = articlesRef.current.find(a => a._id === id);
    if (!art) return;
    if (!art._draftId) { setArticles(prev => prev.filter(a => a._id !== id)); return; }
    if (!window.confirm(`Delete "${art.title || "this article"}"? This cannot be undone.`)) return;
    try {
      const { data: { user } = {} } = await supabase.auth.getUser();
      if (!user) throw new Error("Not logged in");
      const { error } = await supabase
        .from("book_summaries").delete().eq("id", art._draftId).eq("user_id", user.id);
      if (error) throw error;
      setArticles(prev => prev.map(a => a._id === id ? { ...a, _status: "deleted" } : a));
      if (typeof onNewSummary === "function") onNewSummary();
    } catch (err) { alert("Delete failed: " + err.message); }
  }, [onNewSummary]);

  /* ──────────────────────────────────────────────────────
     handleSaveAllDrafts
     FIX: We iterate over articlesRef.current so each
     iteration reads the LATEST _draftId written by the
     previous iteration, eliminating the stale-closure
     duplicate-insert / lost-save bug.

     After ALL articles finish, onClose() is called so
     the modal closes once — not per-article.
  ────────────────────────────────────────────────────── */
  const handleSaveAllDrafts = useCallback(async () => {
    const pending = articlesRef.current.filter(a => ["idle", "error"].includes(a._status));
    if (!pending.length) { setBulkStatus("Nothing new to save."); return; }

    setBulkWorking(true);
    setBulkStatus(`Saving ${pending.length} draft${pending.length > 1 ? "s" : ""}…`);

    let saved = 0;
    let failed = 0;

    for (const snapArt of pending) {
      // Read the FRESHEST version from the ref before each save
      const art = articlesRef.current.find(a => a._id === snapArt._id) || snapArt;

      setArticles(prev => prev.map(a => a._id === art._id ? { ...a, _status: "saving" } : a));

      const result = await saveDraftCore(art);

      if (result.ok) {
        setArticles(prev => prev.map(a =>
          a._id === art._id ? { ...a, _status: "saved", _draftId: result.draftId } : a
        ));
        saved++;
      } else {
        setArticles(prev => prev.map(a =>
          a._id === art._id ? { ...a, _status: "error", _error: result.error } : a
        ));
        failed++;
      }

      setBulkStatus(`Saved ${saved} / ${pending.length}…`);
    }

    if (typeof onNewSummary === "function") onNewSummary();

    const summary = failed > 0
      ? `✅ ${saved} saved — ⚠️ ${failed} failed (check errors above)`
      : `✅ All ${saved} draft${saved !== 1 ? "s" : ""} saved successfully.`;

    setBulkStatus(summary);
    setBulkWorking(false);

    // Close modal only after ALL drafts are done (no failures)
    if (failed === 0 && typeof onClose === "function") {
      setTimeout(onClose, 1200);
    }
  }, [onNewSummary, onClose]);

  /* ──────────────────────────────────────────────────────
     handlePublishAll
     Same fix: reads fresh data, closes modal only when done.
  ────────────────────────────────────────────────────── */
  const handlePublishAll = useCallback(async () => {
    const publishable = articlesRef.current.filter(
      a => a.category !== DRAFT_SENTINEL && ["idle", "saved", "error"].includes(a._status)
    );
    if (!publishable.length) { setBulkStatus("No articles have a category selected."); return; }
    if (!window.confirm(`Publish all ${publishable.length} articles now?`)) return;

    setBulkWorking(true);
    setBulkStatus(`Publishing ${publishable.length} article${publishable.length > 1 ? "s" : ""}…`);

    let published = 0;
    let failed = 0;

    for (const snapArt of publishable) {
      const art = articlesRef.current.find(a => a._id === snapArt._id) || snapArt;

      setArticles(prev => prev.map(a => a._id === art._id ? { ...a, _status: "saving" } : a));

      const result = await publishCore(art);

      if (result.ok) {
        setArticles(prev => prev.map(a =>
          a._id === art._id ? { ...a, _status: "published", _draftId: result.draftId } : a
        ));
        published++;
      } else {
        setArticles(prev => prev.map(a =>
          a._id === art._id ? { ...a, _status: "error", _error: result.error } : a
        ));
        failed++;
      }

      setBulkStatus(`Published ${published} / ${publishable.length}…`);
    }

    if (typeof onNewSummary === "function") onNewSummary();

    const summary = failed > 0
      ? `🚀 ${published} published — ⚠️ ${failed} failed (check errors above)`
      : `🚀 All ${published} article${published !== 1 ? "s" : ""} published successfully.`;

    setBulkStatus(summary);
    setBulkWorking(false);

    // Close modal only after ALL published with no failures
    if (failed === 0 && typeof onClose === "function") {
      setTimeout(onClose, 1200);
    }
  }, [onNewSummary, onClose]);

  /* ── Delete All ── */
  const handleDeleteAll = useCallback(async () => {
    if (!articlesRef.current.length) return;
    if (!window.confirm(`Delete ALL ${articlesRef.current.length} articles? This cannot be undone.`)) return;
    setBulkWorking(true);
    setBulkStatus("Deleting…");
    for (const a of articlesRef.current) {
      if (a._draftId) await onDelete(a._id);
    }
    setArticles([]);
    setRawText("");
    setBulkStatus("🗑 All deleted.");
    setBulkWorking(false);
  }, [onDelete]);

  /* ── Counts ── */
  const counts = {
    total:     articles.length,
    idle:      articles.filter(a => a._status === "idle").length,
    saved:     articles.filter(a => a._status === "saved").length,
    published: articles.filter(a => a._status === "published").length,
    error:     articles.filter(a => a._status === "error").length,
  };

  return (
    <div style={{ paddingBottom: 32 }}>

      {/* ═══ PASTE ZONE ═══ */}
      {articles.length === 0 && (
        <div style={{ background: "#f9fafb", border: "1.5px dashed #d1d5db", borderRadius: 10, padding: "20px 20px 24px" }}>
          <div style={{ display: "flex", alignItems: "flex-start", gap: 12, marginBottom: 14 }}>
            <span style={{ fontSize: 22 }}>📋</span>
            <div>
              <div style={{ fontWeight: 700, fontSize: 15, color: "#111" }}>Paste your articles here</div>
              <div style={{ fontSize: 12, color: "#6b7280", marginTop: 3, lineHeight: 1.6 }}>
                Each article must start with{" "}
                <code style={{ background: "#e5e7eb", padding: "1px 5px", borderRadius: 4, fontFamily: "monospace", fontSize: 11 }}>ARTICLE 1</code>,{" "}
                <code style={{ background: "#e5e7eb", padding: "1px 5px", borderRadius: 4, fontFamily: "monospace", fontSize: 11 }}>ARTICLE 2</code>, etc.<br />
                The parser will extract <strong>SEO Title</strong>, <strong>Meta Description</strong>, and <strong>Tags</strong> into their fields.
                {" "}<strong>Cover Image Prompt</strong> is discarded. All body content — subheadings, links, Related Articles, Affiliate Disclosure — is preserved exactly as written.
              </div>
            </div>
          </div>

          <textarea
            style={{ width: "100%", minHeight: 280, fontFamily: "monospace", fontSize: 12, color: "#374151", border: "1px solid #e5e7eb", borderRadius: 6, padding: "12px 14px", background: "#fff", resize: "vertical", boxSizing: "border-box", lineHeight: 1.6 }}
            value={rawText}
            onChange={e => setRawText(e.target.value)}
            placeholder={"ARTICLE 1\nSEO Title: Breville BOV900BSS: Does It Actually Deliver?\nCover Image Prompt: A Breville BOV900BSS on a counter…\nMeta Description: Wondering if the Breville lives up to the hype?\nTags: air fryer oven, breville, crispy meals\n\n## Does It Actually Crisp?\n\nIf you've been chasing that restaurant-level crispiness…\n\nARTICLE 2\n…"}
            spellCheck={false}
          />

          {parseError && (
            <div style={{ marginTop: 8, padding: "8px 12px", background: "#fef2f2", border: "1px solid #fca5a5", borderRadius: 6, color: "#dc2626", fontSize: 13 }}>
              {parseError}
            </div>
          )}

          <button
            style={{ marginTop: 14, padding: "10px 28px", borderRadius: 6, border: "none", background: rawText.trim() ? "#111" : "#9ca3af", color: "#fff", fontSize: 14, fontWeight: 700, cursor: rawText.trim() ? "pointer" : "not-allowed", fontFamily: "inherit" }}
            onClick={handleParse}
            disabled={parsing || !rawText.trim()}>
            {parsing ? "⏳ Parsing…" : "⚡ Parse Articles"}
          </button>
        </div>
      )}

      {/* ═══ PARSED ARTICLES ═══ */}
      {articles.length > 0 && (
        <>
          {/* Top bar */}
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "12px 16px", background: "#f3f4f6", borderRadius: 8, border: "1px solid #e5e7eb", marginBottom: 12 }}>
            <div style={{ display: "flex", alignItems: "center", gap: 10, flexWrap: "wrap" }}>
              <span style={{ fontWeight: 700, fontSize: 15, color: "#111" }}>{counts.total} Articles</span>
              {counts.idle > 0      && <Pill bg="#fef3c7" color="#92400e" border="#fbbf24">⏳ {counts.idle} pending</Pill>}
              {counts.saved > 0     && <Pill bg="#dcfce7" color="#166534" border="#86efac">✅ {counts.saved} saved</Pill>}
              {counts.published > 0 && <Pill bg="#dbeafe" color="#1e40af" border="#93c5fd">🚀 {counts.published} published</Pill>}
              {counts.error > 0     && <Pill bg="#fee2e2" color="#991b1b" border="#fca5a5">❌ {counts.error} errors</Pill>}
            </div>
            <button
              style={{ padding: "5px 12px", borderRadius: 6, fontSize: 12, color: "#6b7280", border: "1px solid #d1d5db", background: "#f9fafb", cursor: "pointer", fontFamily: "inherit" }}
              onClick={() => { setArticles([]); setRawText(""); setBulkStatus(""); }}>
              ← Start Over
            </button>
          </div>

          <div style={{ fontSize: 12, color: "#9ca3af", marginBottom: 10, paddingLeft: 2 }}>
            Click any article row to expand and edit. Individual saves stay open so you can keep working.
            Use <strong>Save All as Drafts</strong> below when ready to finish.
          </div>

          <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
            {articles.map((art, i) => (
              <ArticleCard
                key={art._id}
                article={art}
                index={i}
                onUpdate={onUpdate}
                onSaveDraft={onSaveDraft}
                onPublish={onPublish}
                onDelete={onDelete}
                disabled={bulkWorking}
              />
            ))}
          </div>

          {/* Bulk footer */}
          <div ref={bottomRef} style={{ marginTop: 28, padding: 20, background: "#f9fafb", border: "1.5px solid #e5e7eb", borderRadius: 10 }}>
            <div style={{ fontWeight: 700, fontSize: 14, color: "#374151", marginBottom: 6 }}>Bulk Actions</div>
            <div style={{ fontSize: 12, color: "#6b7280", marginBottom: 12 }}>
              Individual saves above keep the modal open. These buttons process all articles at once and close the modal when done.
            </div>

            {bulkStatus && (
              <div style={{ fontSize: 13, color: "#374151", marginBottom: 12, padding: "8px 12px", background: "#f3f4f6", borderRadius: 6 }}>
                {bulkStatus}
              </div>
            )}

            <div style={{ display: "flex", gap: 10, flexWrap: "wrap" }}>
              <button style={{ ...S.btn, ...S.btnDraft }} disabled={bulkWorking} onClick={handleSaveAllDrafts}>
                💾 Save All as Drafts
              </button>
              <button style={{ ...S.btn, background: "#2563eb", color: "#fff", border: "none" }} disabled={bulkWorking} onClick={handlePublishAll}>
                🚀 Publish All
              </button>
              <button style={{ ...S.btn, color: "#dc2626", border: "1.5px solid #fca5a5", background: "#fff", marginLeft: "auto" }} disabled={bulkWorking} onClick={handleDeleteAll}>
                🗑 Delete All
              </button>
            </div>

            <div style={{ fontSize: 11, color: "#9ca3af", marginTop: 8 }}>
              "Publish All" skips articles still set to "Keep as Draft" — assign a category on each to include it.
            </div>
          </div>
        </>
      )}
    </div>
  );
};

/* ── Pill badge ──────────────────────────────────────────── */
const Pill = ({ bg, color, border, children }) => (
  <span style={{ background: bg, color, border: `1px solid ${border}`, padding: "2px 10px", borderRadius: 20, fontSize: 12, fontWeight: 600 }}>
    {children}
  </span>
);

/* ── Shared style tokens ─────────────────────────────────── */
const S = {
  label:    { fontSize: 12, fontWeight: 600, color: "#374151", marginTop: 10, marginBottom: 3, display: "block" },
  input:    { width: "100%", padding: "7px 10px", border: "1px solid #d1d5db", borderRadius: 6, fontSize: 13, color: "#111", background: "#fff", boxSizing: "border-box", fontFamily: "inherit" },
  select:   { width: "100%", padding: "7px 10px", border: "1px solid #d1d5db", borderRadius: 6, fontSize: 13, color: "#111", background: "#fff", boxSizing: "border-box" },
  btn:      { padding: "8px 18px", borderRadius: 6, fontSize: 13, fontWeight: 600, cursor: "pointer", border: "1px solid transparent", fontFamily: "inherit" },
  btnDraft: { background: "#f3f4f6", color: "#374151", border: "1px solid #d1d5db" },
};

export default BulkArticleEditor;