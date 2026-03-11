// src/components/DraftPanel/DraftPanel.jsx
import React, { useState, useEffect, useCallback } from "react";
import { supabase } from "../../supabase/supabaseClient";
import "./DraftPanel.css";

const CATEGORIES = [
  "Kitchen & Cooking","Home & Garden","Electronics & Tech","Health & Fitness",
  "Health & Wellness","Beauty & Personal Care","Baby & Kids","Sports & Outdoors",
  "Pet Supplies","Automotive","Office & Stationery","Finance & Money Management",
  "Technology & Smart Devices","Travel Essentials & Adventure","Education & Learning Tools",
  "DIY & Home Projects","Lifestyle & Personal Growth","Business & Entrepreneurship Tools",
  "Parenting & Family Life","Cooking & Recipe Resources",
];

const fmtDate = (iso) => {
  if (!iso) return "—";
  return new Date(iso).toLocaleDateString(undefined, {
    day: "2-digit", month: "short", year: "numeric",
  });
};

const VERDICT_LABELS = {
  recommended:     { label: "✅ Recommended",     color: "#16a34a" },
  not_recommended: { label: "❌ Not Recommended", color: "#dc2626" },
  neutral:         { label: "➖ Neutral",          color: "#6b7280" },
};

/* ══════════════════════════════════════════════════════════
   DRAFT PANEL
══════════════════════════════════════════════════════════ */
const DraftPanel = ({ onEdit }) => {
  const [drafts, setDrafts]           = useState([]);
  const [loading, setLoading]         = useState(true);
  const [selected, setSelected]       = useState(new Set());
  const [bulkCategory, setBulkCategory] = useState("");
  const [perArticleCat, setPerArticleCat] = useState({});
  const [bulkMode, setBulkMode]       = useState("individual"); // "individual" | "all"
  const [publishing, setPublishing]   = useState(false);
  const [publishResult, setPublishResult] = useState(null);
  const [deleteTarget, setDeleteTarget]   = useState(null);
  const [deleteLoading, setDeleteLoading] = useState(false);

  const fetchDrafts = useCallback(async () => {
    setLoading(true);
    try {
      const { data: { user } = {} } = await supabase.auth.getUser();
      if (!user) { setLoading(false); return; }
      const { data, error } = await supabase
        .from("book_summaries")
        .select("id, title, author, category, created_at, auto_saved_at, status, slug, verdict, editor_score")
        .eq("user_id", user.id)
        .eq("status", "draft")
        .order("auto_saved_at", { ascending: false, nullsFirst: false });
      if (error) throw error;
      setDrafts(data || []);
    } catch (err) {
      console.error("fetchDrafts error:", err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { fetchDrafts(); }, [fetchDrafts]);

  const toggleSelect = (id) => setSelected(prev => {
    const next = new Set(prev);
    next.has(id) ? next.delete(id) : next.add(id);
    return next;
  });

  const toggleAll = () =>
    selected.size === drafts.length
      ? setSelected(new Set())
      : setSelected(new Set(drafts.map(d => d.id)));

  const canBulkPublish = () => {
    if (selected.size === 0) return false;
    if (bulkMode === "all") return !!bulkCategory;
    return Array.from(selected).every(id => {
      const draft = drafts.find(d => d.id === id);
      return !!(perArticleCat[id] || draft?.category);
    });
  };

  const handleBulkPublish = async () => {
    if (!canBulkPublish()) return;
    setPublishing(true);
    setPublishResult(null);
    const { data: { user } = {} } = await supabase.auth.getUser();
    if (!user) { setPublishing(false); return; }
    let ok = 0, fail = 0;
    for (const id of Array.from(selected)) {
      const category = bulkMode === "all"
        ? bulkCategory
        : (perArticleCat[id] || drafts.find(d => d.id === id)?.category);
      if (!category) { fail++; continue; }
      try {
        const { error } = await supabase.from("book_summaries")
          .update({ status: "published", category, auto_saved_at: null })
          .eq("id", id).eq("user_id", user.id);
        error ? fail++ : ok++;
      } catch { fail++; }
    }
    setPublishResult({ ok, fail });
    setSelected(new Set());
    setPerArticleCat({});
    setBulkCategory("");
    await fetchDrafts();
    setPublishing(false);
  };

  const handleDelete = async () => {
    if (!deleteTarget) return;
    setDeleteLoading(true);
    try {
      const { data: { user } = {} } = await supabase.auth.getUser();
      if (!user) throw new Error("Not logged in");
      const { error } = await supabase.from("book_summaries")
        .delete().eq("id", deleteTarget).eq("user_id", user.id);
      if (error) throw error;
      setDeleteTarget(null);
      setSelected(prev => { const n = new Set(prev); n.delete(deleteTarget); return n; });
      await fetchDrafts();
    } catch (err) {
      alert(`Could not delete: ${err.message}`);
    } finally {
      setDeleteLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="draft-panel">
        <div className="draft-panel__loading">Loading drafts…</div>
      </div>
    );
  }

  return (
    <div className="draft-panel">
      <div className="draft-panel__header">
        <h2 className="draft-panel__title">
          📝 Drafts
          {drafts.length > 0 && (
            <span className="draft-panel__count">{drafts.length}</span>
          )}
        </h2>
        {drafts.length > 0 && (
          <button className="dp-btn dp-btn--secondary" onClick={fetchDrafts} type="button">
            ↻ Refresh
          </button>
        )}
      </div>

      {publishResult && (
        <div className={`draft-panel__banner ${publishResult.fail > 0 ? "draft-panel__banner--warn" : "draft-panel__banner--ok"}`}>
          ✅ {publishResult.ok} published
          {publishResult.fail > 0 && ` · ⚠️ ${publishResult.fail} failed (no category?)`}
          <button
            style={{ marginLeft: 12, background: "none", border: "none", cursor: "pointer", color: "inherit" }}
            onClick={() => setPublishResult(null)}
          >✕</button>
        </div>
      )}

      {drafts.length === 0 ? (
        <div className="draft-panel__empty">
          <div className="draft-panel__empty-icon">📄</div>
          <p>No drafts yet. Start writing a review and your work will auto-save here.</p>
        </div>
      ) : (
        <>
          {selected.size > 0 && (
            <div className="draft-panel__bulk">
              <span className="draft-panel__bulk-info">{selected.size} selected</span>

              <span className="dp-bulk-divider">|</span>

              <div className="draft-panel__bulk-mode">
                <label>
                  <input type="radio" name="bulkMode" value="individual"
                    checked={bulkMode === "individual"} onChange={() => setBulkMode("individual")} />
                  {" "}Per review
                </label>
                <label style={{ marginLeft: 14 }}>
                  <input type="radio" name="bulkMode" value="all"
                    checked={bulkMode === "all"} onChange={() => setBulkMode("all")} />
                  {" "}Same for all
                </label>
              </div>

              {bulkMode === "all" && (
                <select
                  className="draft-panel__bulk-cat"
                  value={bulkCategory}
                  onChange={e => setBulkCategory(e.target.value)}
                >
                  <option value="">— Choose category —</option>
                  {CATEGORIES.map(c => <option key={c} value={c}>{c}</option>)}
                </select>
              )}

              <button
                className="dp-btn dp-btn--publish"
                type="button"
                onClick={handleBulkPublish}
                disabled={publishing || !canBulkPublish()}
              >
                {publishing ? "Publishing…" : `🚀 Publish ${selected.size}`}
              </button>
            </div>
          )}

          <div className="draft-panel__table-wrap">
            <table className="draft-panel__table">
              <thead>
                <tr>
                  <th style={{ width: 36 }}>
                    <input
                      type="checkbox"
                      checked={selected.size === drafts.length && drafts.length > 0}
                      onChange={toggleAll}
                      title="Select all"
                    />
                  </th>
                  <th>Title</th>
                  <th>Author</th>
                  <th style={{ width: 90 }}>Verdict</th>
                  <th style={{ width: 180 }}>Category</th>
                  <th style={{ width: 120 }}>Last saved</th>
                  <th style={{ width: 130 }}>Actions</th>
                </tr>
              </thead>
              <tbody>
                {drafts.map(draft => {
                  const isSelected = selected.has(draft.id);
                  const vInfo = VERDICT_LABELS[draft.verdict] || null;
                  return (
                    <tr key={draft.id} className={isSelected ? "draft-panel__row--selected" : ""}>
                      <td>
                        <input type="checkbox" checked={isSelected} onChange={() => toggleSelect(draft.id)} />
                      </td>
                      <td className="draft-panel__title-cell">
                        <span className="draft-panel__draft-badge">DRAFT</span>
                        <span className="draft-panel__title-text">
                          {draft.title || <em style={{ color: "#9ca3af" }}>Untitled</em>}
                        </span>
                        {draft.editor_score && (
                          <span style={{ fontSize: 11, color: "#f59e0b", marginLeft: 6 }}>
                            ★{draft.editor_score}
                          </span>
                        )}
                      </td>
                      <td>{draft.author || <span style={{ color: "#9ca3af" }}>—</span>}</td>
                      <td>
                        {vInfo ? (
                          <span style={{ fontSize: 11, color: vInfo.color, fontWeight: 600 }}>
                            {vInfo.label}
                          </span>
                        ) : (
                          <span style={{ color: "#9ca3af", fontSize: 11 }}>—</span>
                        )}
                      </td>
                      <td>
                        {bulkMode === "individual" && isSelected ? (
                          <select
                            value={perArticleCat[draft.id] || draft.category || ""}
                            onChange={e => setPerArticleCat(prev => ({ ...prev, [draft.id]: e.target.value }))}
                            className="draft-panel__cat-select"
                          >
                            <option value="">— Choose category —</option>
                            {CATEGORIES.map(c => <option key={c} value={c}>{c}</option>)}
                          </select>
                        ) : (
                          <span style={{ color: draft.category ? "#374151" : "#9ca3af", fontSize: 13 }}>
                            {draft.category || "No category"}
                          </span>
                        )}
                      </td>
                      <td style={{ fontSize: 12, color: "#6b7280" }}>
                        {fmtDate(draft.auto_saved_at || draft.created_at)}
                      </td>
                      <td>
                        <div style={{ display: "flex", gap: 5 }}>
                          <button
                            type="button"
                            className="dp-btn dp-btn--edit"
                            onClick={() => onEdit?.(draft)}
                            title="Edit review"
                          >
                            ✏️ Edit
                          </button>
                          <button
                            type="button"
                            className="dp-btn dp-btn--danger"
                            onClick={() => setDeleteTarget(draft.id)}
                            title="Delete draft"
                          >
                            🗑
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </>
      )}

      {/* Delete confirmation modal */}
      {deleteTarget && (
        <div
          className="draft-panel__modal-overlay"
          onClick={() => !deleteLoading && setDeleteTarget(null)}
        >
          <div className="draft-panel__modal" onClick={e => e.stopPropagation()}>
            <div style={{ fontSize: 44, marginBottom: 8, textAlign: "center" }}>⚠️</div>
            <h3 style={{ margin: "0 0 8px", color: "#dc2626", textAlign: "center" }}>
              Delete this draft?
            </h3>
            <p style={{ color: "#6b7280", marginBottom: 20, fontSize: 14, textAlign: "center" }}>
              <strong>"{drafts.find(d => d.id === deleteTarget)?.title || "Untitled"}"</strong>{" "}
              will be permanently deleted.
            </p>
            <div style={{ display: "flex", gap: 12, justifyContent: "center" }}>
              <button
                type="button"
                onClick={() => setDeleteTarget(null)}
                disabled={deleteLoading}
                className="dp-btn dp-btn--secondary"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleDelete}
                disabled={deleteLoading}
                className="dp-btn dp-btn--danger"
                style={{ padding: "9px 22px" }}
              >
                {deleteLoading ? "Deleting…" : "Yes, Delete"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default DraftPanel;