// src/components/DraftPanel/DraftPanel.jsx
// ONJO Reviews — DraftPanel with Auto-link (3-tier matcher — matches EditSummaryForm exactly)
import React, { useState, useEffect, useCallback, useRef } from "react";
import { supabase } from "../../supabase/supabaseClient";
import "./DraftPanel.css";

/* ── constants ──────────────────────────────────────────── */
const CATEGORIES = [
  "Kitchen & Cooking","Home & Garden","Electronics & Tech","Health & Fitness",
  "Health & Wellness","Beauty & Personal Care","Baby & Kids","Sports & Outdoors",
  "Pet Supplies","Automotive","Office & Stationery","Finance & Money Management",
  "Technology & Smart Devices","Travel Essentials & Adventure","Education & Learning Tools",
  "DIY & Home Projects","Lifestyle & Personal Growth","Business & Entrepreneurship Tools",
  "Parenting & Family Life","Cooking & Recipe Resources",
];

const VERDICT_LABELS = {
  recommended:     { label: "✅ Recommended",     color: "#16a34a" },
  not_recommended: { label: "❌ Not Recommended", color: "#dc2626" },
  neutral:         { label: "➖ Neutral",          color: "#6b7280" },
};

/* ══════════════════════════════════════════════════════════
   PURE HELPERS — identical to EditSummaryForm's helpers
   so matching behaviour is exactly the same in both places
══════════════════════════════════════════════════════════ */

const normalize = (s = "") => String(s || "").trim().toLowerCase();

/** Unique words from a normalised string */
const uniqueWords = (s = "") =>
  Array.from(
    new Set(
      normalize(s)
        .split(/[^\p{L}\p{N}]+/u)
        .filter(Boolean)
    )
  );

/** Jaccard-style word overlap score */
const wordMatchScore = (a = "", b = "") => {
  const aw = uniqueWords(a), bw = uniqueWords(b);
  if (!aw.length || !bw.length) return 0;
  return aw.filter((w) => bw.includes(w)).length / Math.max(aw.length, bw.length);
};

/** Longest common sub-string ratio */
const lcsr = (a = "", b = "") => {
  const A = String(a || ""), B = String(b || "");
  const n = A.length, m = B.length;
  if (!n || !m) return 0;
  const dp = new Array(m + 1).fill(0);
  let best = 0;
  for (let i = 1; i <= n; i++)
    for (let j = m; j >= 1; j--)
      if (A[i - 1] === B[j - 1]) {
        dp[j] = dp[j - 1] + 1;
        if (dp[j] > best) best = dp[j];
      } else dp[j] = 0;
  return best / Math.max(n, m);
};

/**
 * Combined fuzzy score — same weights as EditSummaryForm:
 *   55 % word overlap + 35 % LCSR + 10 % prefix bonus
 */
const combinedScore = (cand = "", q = "") =>
  Math.min(
    1,
    0.55 * wordMatchScore(cand, q) +
    0.35 * lcsr(cand, q) +
    0.10 * (normalize(cand).startsWith(normalize(q)) ? 1 : 0)
  );

/**
 * 3-tier matcher — mirrors autoLinkBoldExact in EditSummaryForm:
 *
 *   Tier 1 — normalised title === normalised phrase (exact)
 *   Tier 2 — one string contains the other (containment)
 *   Tier 3 — combinedScore ≥ 0.85 (high-confidence fuzzy)
 *
 * Returns the first matching row, or null.
 */
const findMatch = (phrase, titleRows) => {
  if (!phrase || !titleRows.length) return null;
  const nPhrase = normalize(phrase);

  // Tier 1 — exact
  const exact = titleRows.find((r) => r?.title && normalize(r.title) === nPhrase);
  if (exact) return exact;

  // Tier 2 — containment
  const contained = titleRows.find((r) => {
    if (!r?.title) return false;
    const nt = normalize(r.title);
    return nt.includes(nPhrase) || nPhrase.includes(nt);
  });
  if (contained) return contained;

  // Tier 3 — high-confidence fuzzy
  let best = null, bestScore = 0;
  for (const r of titleRows) {
    if (!r?.title) continue;
    const score = combinedScore(r.title, phrase);
    if (score > bestScore) { bestScore = score; best = r; }
  }
  return best && bestScore >= 0.85 ? best : null;
};

/* ── misc pure helpers ──────────────────────────────────── */
const toReviewHref = (row) =>
  row?.slug ? `/review/${row.slug}` : `/review/${row?.id}`;

const fmtDate = (iso) => {
  if (!iso) return "—";
  return new Date(iso).toLocaleDateString(undefined, {
    day: "2-digit", month: "short", year: "numeric",
  });
};

const fmtSeconds = (s) => {
  if (!isFinite(s) || s <= 0) return null;
  if (s < 60) return `~${Math.ceil(s)}s left`;
  return `~${Math.ceil(s / 60)}m left`;
};

/* ── DB helpers ─────────────────────────────────────────── */

/**
 * Fetch ALL review titles/slugs in one round-trip (paginated).
 * This is the lookup table for in-memory matching — one query instead of
 * one-per-phrase like the old implementation.
 */
const fetchAllReviewTitles = async () => {
  try {
    const PAGE = 1000;
    let page = 0, all = [];
    while (true) {
      const { data, error } = await supabase
        .from("book_summaries")
        .select("id, title, slug")
        .order("id")
        .range(page * PAGE, (page + 1) * PAGE - 1);
      if (error) { console.error("[AutoLink] fetchAllReviewTitles:", error); break; }
      if (!data || data.length === 0) break;
      all = all.concat(data);
      if (data.length < PAGE) break;
      page++;
    }
    return all;
  } catch (err) {
    console.error("[AutoLink] fetchAllReviewTitles threw:", err);
    return [];
  }
};

/** Fetch raw HTML summaries for a list of IDs → { [id]: htmlString } */
const fetchSummaries = async (ids) => {
  if (!ids.length) return {};
  try {
    const { data, error } = await supabase
      .from("book_summaries")
      .select("id, summary")
      .in("id", ids);
    if (error) { console.error("[AutoLink] fetchSummaries:", error); return {}; }
    const map = {};
    (data || []).forEach((r) => { map[r.id] = r.summary || ""; });
    return map;
  } catch (err) {
    console.error("[AutoLink] fetchSummaries threw:", err);
    return {};
  }
};

/* ── apply approved links to HTML ───────────────────────── */
const applyLinks = (html, approved) => {
  if (!approved.length) return html;
  const container = document.createElement("div");
  container.innerHTML = html || "";

  for (const { phrase, matched } of approved) {
    if (!matched?.id) continue;
    const href = toReviewHref(matched);
    const nPhrase = normalize(phrase);

    // Re-query each time so nodes added in previous iterations are picked up.
    const boldNodes = Array.from(container.querySelectorAll("strong, b"));
    for (const node of boldNodes) {
      if (normalize((node.textContent || "").trim()) !== nPhrase) continue;
      if (node.closest?.("a")) continue; // already wrapped
      try {
        const a = document.createElement("a");
        a.setAttribute("data-summary-id", matched.id);
        a.setAttribute("href", href);
        a.className = "internal-summary-link";
        a.innerHTML = node.innerHTML;
        node.parentNode.replaceChild(a, node);
      } catch (_) { /* stale node — skip */ }
    }
  }
  return container.innerHTML;
};

/* ══════════════════════════════════════════════════════════
   AUTO-LINK MODAL
   Works for both single-draft (🎯 Link button per row) and
   bulk (🎯 Auto-link N drafts button in the bulk toolbar).
══════════════════════════════════════════════════════════ */
const AutoLinkModal = ({ drafts: targets, onClose, onSaved }) => {
  const isBulk = targets.length > 1;

  // step: scanning | preview | saving | done | error
  const [step,          setStep]          = useState("scanning");
  const [errorMsg,      setErrorMsg]      = useState("");
  const [saveCount,     setSaveCount]     = useState(0);
  const [activeTab,     setActiveTab]     = useState("preview");

  // draftData[]: { draft, candidates:[{phrase, matched, approved, count, alreadyLinked}] }
  const [draftData, setDraftData] = useState([]);

  // Progress
  const [progressCurrent, setProgressCurrent] = useState(0);
  const [progressTotal,   setProgressTotal]   = useState(0);
  const [progressPhrase,  setProgressPhrase]  = useState("");
  const [progressEta,     setProgressEta]     = useState(null);
  const scanStartRef = useRef(null);

  /* ── scan ──────────────────────────────────────────────── */
  useEffect(() => {
    let cancelled = false;

    (async () => {
      try {
        /* 1. fetch all summaries + the full title lookup table in parallel */
        const ids = targets.map((d) => d.id);
        const [summaryMap, titleRows] = await Promise.all([
          fetchSummaries(ids),
          fetchAllReviewTitles(),
        ]);

        if (cancelled) return;

        if (titleRows.length === 0) {
          console.warn("[AutoLink] No review titles returned — check RLS / permissions.");
        }

        /* 2. extract bold phrases from each draft */
        const allPhrasesByDraft = targets.map((draft) => {
          const html      = summaryMap[draft.id] || "";
          const container = document.createElement("div");
          container.innerHTML = html;

          // Phrases already wrapped in an internal link
          const linkedSet = new Set(
            Array.from(
              container.querySelectorAll(
                "a[href^='/review/'] strong, a[href^='/review/'] b, " +
                "a[data-summary-id] strong, a[data-summary-id] b"
              )
            ).map((n) => normalize((n.textContent || "").trim()))
          );

          // Unique bold phrases, 2–200 chars, capped at 200
          const boldNodes = Array.from(container.querySelectorAll("strong, b"));
          const phrases = Array.from(
            new Set(
              boldNodes
                .map((n) => (n.textContent || "").trim())
                .filter((s) => s.length >= 2 && s.length <= 200)
            )
          ).slice(0, 200);

          return { draft, html, phrases, linkedSet };
        });

        /* 3. count global phrase frequency across all selected drafts */
        const globalCount = {};
        allPhrasesByDraft.forEach(({ phrases }) => {
          phrases.forEach((p) => {
            const k = normalize(p);
            globalCount[k] = (globalCount[k] || 0) + 1;
          });
        });

        /* 4. match phrases in-memory using the 3-tier matcher */
        const total = allPhrasesByDraft.reduce((s, { phrases }) => s + phrases.length, 0);
        setProgressTotal(total);
        scanStartRef.current = Date.now();

        let scanned = 0;
        const result = [];

        for (const { draft, phrases, linkedSet } of allPhrasesByDraft) {
          const candidates = [];

          for (const phrase of phrases) {
            if (cancelled) return;

            scanned++;
            setProgressCurrent(scanned);
            setProgressPhrase(phrase);

            const elapsed = (Date.now() - scanStartRef.current) / 1000;
            const rate    = scanned / elapsed;
            setProgressEta(rate > 0 ? (total - scanned) / rate : null);

            // ── 3-tier match (same as EditSummaryForm's autoLinkBoldExact) ──
            const matched       = findMatch(phrase, titleRows);
            const alreadyLinked = linkedSet.has(normalize(phrase));
            const count         = globalCount[normalize(phrase)] || 1;

            candidates.push({
              phrase,
              matched,
              approved:     !!matched && !alreadyLinked,
              count,
              alreadyLinked,
            });
          }

          result.push({ draft, candidates });
        }

        if (!cancelled) {
          setDraftData(result);
          setStep("preview");
        }
      } catch (err) {
        if (!cancelled) {
          console.error("[AutoLink] scan error:", err);
          setErrorMsg(err.message || "Scan failed");
          setStep("error");
        }
      }
    })();

    return () => { cancelled = true; };
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  /* ── toggle helpers ─────────────────────────────────────── */
  const toggleOne = (draftId, phrase) =>
    setDraftData((prev) =>
      prev.map((d) =>
        d.draft.id !== draftId ? d : {
          ...d,
          candidates: d.candidates.map((c) =>
            c.phrase === phrase ? { ...c, approved: !c.approved } : c
          ),
        }
      )
    );

  const approveAll = () =>
    setDraftData((prev) =>
      prev.map((d) => ({
        ...d,
        candidates: d.candidates.map((c) => ({
          ...c,
          approved: !!c.matched && !c.alreadyLinked,
        })),
      }))
    );

  const rejectAll = () =>
    setDraftData((prev) =>
      prev.map((d) => ({
        ...d,
        candidates: d.candidates.map((c) => ({ ...c, approved: false })),
      }))
    );

  const totalApproved = draftData.reduce(
    (s, d) => s + d.candidates.filter((c) => c.approved && c.matched).length, 0
  );
  const totalMatched = draftData.reduce(
    (s, d) => s + d.candidates.filter((c) => c.matched).length, 0
  );

  /* ── aggregate views (Linked / Unmatched tabs) ──────────── */
  const allCandidates = draftData.flatMap((d) => d.candidates);

  const phraseMap = {};
  allCandidates.forEach((c) => {
    const k = normalize(c.phrase);
    if (!phraseMap[k]) {
      phraseMap[k] = {
        phrase:        c.phrase,
        count:         0,
        matched:       c.matched,
        alreadyLinked: c.alreadyLinked,
      };
    }
    phraseMap[k].count += c.count;
    if (c.matched       && !phraseMap[k].matched)       phraseMap[k].matched       = c.matched;
    if (c.alreadyLinked && !phraseMap[k].alreadyLinked) phraseMap[k].alreadyLinked = true;
  });

  const allGroups        = Object.values(phraseMap).sort((a, b) => b.count - a.count);
  const linkedPhrases    = allGroups.filter((p) =>  p.matched);
  const unmatchedPhrases = allGroups.filter((p) => !p.matched);

  /* ── save ───────────────────────────────────────────────── */
  const handleConfirm = async () => {
    if (totalApproved === 0) { onClose(); return; }
    setStep("saving");
    let saved = 0;
    try {
      for (const { draft, candidates } of draftData) {
        const approved = candidates.filter((c) => c.approved && c.matched);
        if (!approved.length) continue;

        // Re-fetch latest summary to avoid overwriting concurrent edits
        const { data: row, error } = await supabase
          .from("book_summaries")
          .select("summary")
          .eq("id", draft.id)
          .single();
        if (error) {
          console.error(`[AutoLink] re-fetch failed for ${draft.id}:`, error);
          continue;
        }

        const newHtml = applyLinks(row.summary || "", approved);
        const { error: upErr } = await supabase
          .from("book_summaries")
          .update({ summary: newHtml, auto_saved_at: new Date().toISOString() })
          .eq("id", draft.id);
        if (!upErr) saved += approved.length;
        else console.error(`[AutoLink] update failed for ${draft.id}:`, upErr);
      }
      setSaveCount(saved);
      setStep("done");
      if (typeof onSaved === "function") onSaved();
    } catch (err) {
      console.error("[AutoLink] save error:", err);
      setErrorMsg(err.message || "Save failed");
      setStep("error");
    }
  };

  const pct = progressTotal > 0
    ? Math.round((progressCurrent / progressTotal) * 100)
    : 0;

  const TABS = [
    { key: "preview",   label: "📋 Preview",   count: null },
    { key: "linked",    label: "🔗 Linked",    count: linkedPhrases.length },
    { key: "unmatched", label: "❓ Unmatched", count: unmatchedPhrases.length },
  ];

  /* ── render ─────────────────────────────────────────────── */
  return (
    <div
      className="draft-panel__modal-overlay"
      style={{ zIndex: 1100 }}
      onClick={() => step !== "saving" && onClose()}
    >
      <div
        className="draft-panel__modal dp-autolink-modal"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="dp-autolink-header">
          <div>
            <h3 style={{ margin: 0, fontSize: 17, fontWeight: 700 }}>🎯 Exact Auto-link</h3>
            <p style={{ margin: "3px 0 0", fontSize: 13, color: "#6b7280" }}>
              {isBulk
                ? `${targets.length} drafts selected`
                : (targets[0]?.title || "Untitled")}
            </p>
          </div>
          {step !== "saving" && (
            <button
              onClick={onClose}
              style={{
                background: "none", border: "none", fontSize: 20,
                cursor: "pointer", color: "#9ca3af", lineHeight: 1,
              }}
            >✕</button>
          )}
        </div>

        {/* ── SCANNING ── */}
        {step === "scanning" && (
          <div className="dp-scan-container">
            <div style={{ fontSize: 32, marginBottom: 10 }}>🔍</div>
            <p style={{ fontWeight: 600, marginBottom: 4 }}>Scanning bold phrases…</p>
            <p className="dp-scan-phrase">
              {progressPhrase ? `"${progressPhrase}"` : "Loading reviews…"}
            </p>
            <div className="dp-scan-counter">
              <span className="dp-scan-counter__current">{progressCurrent}</span>
              <span style={{ color: "#9ca3af" }}> / {progressTotal || "…"} phrases</span>
              {progressEta && (
                <span className="dp-scan-eta">{fmtSeconds(progressEta)}</span>
              )}
            </div>
            <div className="dp-progress-track">
              <div className="dp-progress-fill" style={{ width: `${pct}%` }} />
            </div>
            <div style={{ fontSize: 12, color: "#9ca3af", marginTop: 6 }}>{pct}%</div>
          </div>
        )}

        {/* ── PREVIEW / TABS ── */}
        {step === "preview" && (
          <>
            <div className="dp-tab-bar">
              {TABS.map((tab) => (
                <button
                  key={tab.key}
                  type="button"
                  className={`dp-tab ${activeTab === tab.key ? "dp-tab--active" : ""}`}
                  onClick={() => setActiveTab(tab.key)}
                >
                  {tab.label}
                  {tab.count !== null && (
                    <span className={`dp-tab-badge ${activeTab === tab.key ? "dp-tab-badge--active" : ""}`}>
                      {tab.count}
                    </span>
                  )}
                </button>
              ))}
            </div>

            {/* ── TAB: PREVIEW ── */}
            {activeTab === "preview" && (
              <>
                {totalMatched === 0 ? (
                  <div className="dp-empty-state">
                    <div style={{ fontSize: 36, marginBottom: 10 }}>🤷</div>
                    <p>No bold phrases matched any review.</p>
                    <p style={{ fontSize: 13 }}>
                      Bold some product titles in the editor first, then try again.
                    </p>
                  </div>
                ) : (
                  <>
                    <div className="dp-autolink-toolbar">
                      <button
                        type="button"
                        className="dp-btn dp-btn--secondary"
                        onClick={approveAll}
                      >
                        ✅ Approve all
                      </button>
                      <button
                        type="button"
                        className="dp-btn dp-btn--secondary"
                        onClick={rejectAll}
                      >
                        ❌ Reject all
                      </button>
                      <span style={{ fontSize: 12, color: "#9ca3af", marginLeft: "auto" }}>
                        {totalApproved} of {totalMatched} will be linked
                      </span>
                    </div>

                    <div className="dp-autolink-scroll">
                      {draftData.map(({ draft, candidates }) => (
                        <div key={draft.id} className="dp-autolink-section">
                          {isBulk && (
                            <div className="dp-autolink-section__heading">
                              <span className="draft-panel__draft-badge">DRAFT</span>
                              <strong style={{ fontSize: 13 }}>
                                {draft.title || "Untitled"}
                              </strong>
                              {!candidates.some((c) => c.matched) && (
                                <span style={{ fontSize: 12, color: "#9ca3af", marginLeft: 8 }}>
                                  — no matches
                                </span>
                              )}
                            </div>
                          )}
                          {candidates.length === 0 ? (
                            <p style={{ fontSize: 13, color: "#9ca3af", padding: "6px 12px" }}>
                              No bold phrases found.
                            </p>
                          ) : (
                            <table className="dp-autolink-table">
                              <thead>
                                <tr>
                                  <th style={{ width: 32 }}>✓</th>
                                  <th>Bold phrase</th>
                                  <th style={{ width: 50 }}>×</th>
                                  <th>Matched review</th>
                                  <th style={{ width: 72 }}>Link</th>
                                </tr>
                              </thead>
                              <tbody>
                                {candidates.map((c, i) => (
                                  <tr
                                    key={c.phrase + i}
                                    style={{
                                      background: c.alreadyLinked
                                        ? "#eff6ff"
                                        : c.approved && c.matched
                                          ? "#f0fdf4"
                                          : "transparent",
                                      opacity: c.matched ? 1 : 0.45,
                                    }}
                                  >
                                    <td>
                                      {c.alreadyLinked ? (
                                        <span title="Already linked" style={{ color: "#3b82f6", fontSize: 13 }}>
                                          🔗
                                        </span>
                                      ) : c.matched ? (
                                        <input
                                          type="checkbox"
                                          checked={c.approved}
                                          onChange={() => toggleOne(draft.id, c.phrase)}
                                        />
                                      ) : (
                                        <span style={{ color: "#d1d5db" }}>—</span>
                                      )}
                                    </td>
                                    <td><strong>{c.phrase}</strong></td>
                                    <td style={{ textAlign: "center", fontWeight: 700, color: "#6366f1", fontSize: 13 }}>
                                      {c.count > 1 ? c.count : ""}
                                    </td>
                                    <td style={{ color: c.matched ? "#2563eb" : "#9ca3af" }}>
                                      {c.matched ? c.matched.title : <em>No match</em>}
                                    </td>
                                    <td>
                                      {c.matched && (
                                        <a
                                          href={toReviewHref(c.matched)}
                                          target="_blank"
                                          rel="noopener noreferrer"
                                          style={{ fontSize: 11, color: "#6b7280", textDecoration: "underline" }}
                                        >
                                          preview ↗
                                        </a>
                                      )}
                                    </td>
                                  </tr>
                                ))}
                              </tbody>
                            </table>
                          )}
                        </div>
                      ))}
                    </div>
                  </>
                )}
                <div className="dp-autolink-footer">
                  <button
                    type="button"
                    className="dp-btn dp-btn--secondary"
                    onClick={onClose}
                  >
                    Cancel
                  </button>
                  {totalMatched > 0 && (
                    <button
                      type="button"
                      className="dp-btn dp-btn--publish"
                      onClick={handleConfirm}
                      disabled={totalApproved === 0}
                    >
                      🔗 Apply {totalApproved} link{totalApproved !== 1 ? "s" : ""} & Save
                      {isBulk && ` (${targets.length} drafts)`}
                    </button>
                  )}
                </div>
              </>
            )}

            {/* ── TAB: LINKED ── */}
            {activeTab === "linked" && (
              <>
                <p className="dp-tab-desc">
                  Phrases that matched a review in the DB — ranked by how many times they
                  appear across all selected drafts.{" "}
                  <strong style={{ color: "#3b82f6" }}>🔗 = already linked</strong> in the HTML.
                </p>
                {linkedPhrases.length === 0 ? (
                  <div className="dp-empty-state">
                    <div style={{ fontSize: 36, marginBottom: 10 }}>🔍</div>
                    <p>No matched phrases found.</p>
                  </div>
                ) : (
                  <div className="dp-autolink-scroll">
                    <table className="dp-autolink-table">
                      <thead>
                        <tr>
                          <th style={{ width: 50 }}>Count</th>
                          <th>Bold phrase</th>
                          <th>Matched review</th>
                          <th style={{ width: 72 }}>Status</th>
                        </tr>
                      </thead>
                      <tbody>
                        {linkedPhrases.map((p, i) => (
                          <tr
                            key={p.phrase + i}
                            style={{ background: p.alreadyLinked ? "#eff6ff" : "transparent" }}
                          >
                            <td>
                              <span className="dp-freq-badge dp-freq-badge--linked">
                                {p.count}
                              </span>
                            </td>
                            <td><strong>{p.phrase}</strong></td>
                            <td style={{ color: "#2563eb" }}>{p.matched?.title || "—"}</td>
                            <td>
                              {p.alreadyLinked ? (
                                <span style={{ color: "#3b82f6", fontSize: 12, fontWeight: 600 }}>
                                  🔗 linked
                                </span>
                              ) : (
                                <span style={{ color: "#9ca3af", fontSize: 12 }}>not yet</span>
                              )}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
                <div className="dp-autolink-footer">
                  <button type="button" className="dp-btn dp-btn--secondary" onClick={onClose}>
                    Close
                  </button>
                  <button
                    type="button"
                    className="dp-btn dp-btn--publish"
                    onClick={() => setActiveTab("preview")}
                    disabled={totalApproved === 0}
                  >
                    ← Back to preview ({totalApproved} approved)
                  </button>
                </div>
              </>
            )}

            {/* ── TAB: UNMATCHED ── */}
            {activeTab === "unmatched" && (
              <>
                <p className="dp-tab-desc">
                  Bold phrases with <strong>no matching review</strong> in the DB — ranked by
                  repeat count. High-count phrases = strong candidates for a new standalone review.
                </p>
                {unmatchedPhrases.length === 0 ? (
                  <div className="dp-empty-state">
                    <div style={{ fontSize: 36, marginBottom: 10 }}>🎉</div>
                    <p>All bold phrases have a match!</p>
                  </div>
                ) : (
                  <div className="dp-autolink-scroll">
                    <table className="dp-autolink-table">
                      <thead>
                        <tr>
                          <th style={{ width: 50 }}>Count</th>
                          <th>Phrase (no match found)</th>
                          <th style={{ width: 200 }}>Suggestion</th>
                        </tr>
                      </thead>
                      <tbody>
                        {unmatchedPhrases.map((p, i) => (
                          <tr key={p.phrase + i}>
                            <td>
                              <span className={`dp-freq-badge ${
                                p.count >= 5 ? "dp-freq-badge--hot"
                                : p.count >= 2 ? "dp-freq-badge--warm"
                                : "dp-freq-badge--cold"
                              }`}>
                                {p.count}
                              </span>
                            </td>
                            <td><strong>{p.phrase}</strong></td>
                            <td style={{ fontSize: 12, color: "#6b7280" }}>
                              {p.count >= 5
                                ? "🔥 High priority — create a review"
                                : p.count >= 2
                                  ? "📌 Consider creating a review"
                                  : ""}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
                <div className="dp-autolink-footer">
                  <button type="button" className="dp-btn dp-btn--secondary" onClick={onClose}>
                    Close
                  </button>
                  <button
                    type="button"
                    className="dp-btn dp-btn--publish"
                    onClick={() => setActiveTab("preview")}
                    disabled={totalApproved === 0}
                  >
                    ← Back to preview ({totalApproved} approved)
                  </button>
                </div>
              </>
            )}
          </>
        )}

        {/* ── SAVING ── */}
        {step === "saving" && (
          <div style={{ textAlign: "center", padding: "48px 0", color: "#6b7280" }}>
            <div className="dp-spinner" style={{ margin: "0 auto 18px" }} />
            <p>Saving{isBulk ? ` across ${targets.length} drafts` : ""}…</p>
          </div>
        )}

        {/* ── DONE ── */}
        {step === "done" && (
          <div style={{ textAlign: "center", padding: "48px 0" }}>
            <div style={{ fontSize: 52, marginBottom: 12 }}>✅</div>
            <h4 style={{ margin: "0 0 8px", color: "#16a34a" }}>Done!</h4>
            <p style={{ color: "#6b7280", marginBottom: 24 }}>
              {saveCount} link{saveCount !== 1 ? "s" : ""} applied
              {isBulk ? ` across ${targets.length} drafts` : ""}.
            </p>
            <button type="button" className="dp-btn dp-btn--secondary" onClick={onClose}>
              Close
            </button>
          </div>
        )}

        {/* ── ERROR ── */}
        {step === "error" && (
          <div style={{ textAlign: "center", padding: "48px 0" }}>
            <div style={{ fontSize: 52, marginBottom: 12 }}>⚠️</div>
            <h4 style={{ margin: "0 0 8px", color: "#dc2626" }}>Something went wrong</h4>
            <p style={{ color: "#6b7280", marginBottom: 24 }}>{errorMsg}</p>
            <button type="button" className="dp-btn dp-btn--secondary" onClick={onClose}>
              Close
            </button>
          </div>
        )}
      </div>
    </div>
  );
};

/* ══════════════════════════════════════════════════════════
   DRAFT PANEL
══════════════════════════════════════════════════════════ */
const DraftPanel = ({ onEdit }) => {
  const [drafts,          setDrafts]          = useState([]);
  const [loading,         setLoading]         = useState(true);
  const [selected,        setSelected]        = useState(new Set());
  const [bulkCategory,    setBulkCategory]    = useState("");
  const [perArticleCat,   setPerArticleCat]   = useState({});
  const [bulkMode,        setBulkMode]        = useState("individual");
  const [publishing,      setPublishing]      = useState(false);
  const [publishResult,   setPublishResult]   = useState(null);
  const [deleteTarget,    setDeleteTarget]    = useState(null);
  const [deleteLoading,   setDeleteLoading]   = useState(false);
  const [autoLinkTargets, setAutoLinkTargets] = useState(null);

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

  const toggleSelect = (id) =>
    setSelected((prev) => {
      const next = new Set(prev);
      next.has(id) ? next.delete(id) : next.add(id);
      return next;
    });

  const toggleAll = () =>
    selected.size === drafts.length
      ? setSelected(new Set())
      : setSelected(new Set(drafts.map((d) => d.id)));

  const canBulkPublish = () => {
    if (selected.size === 0) return false;
    if (bulkMode === "all") return !!bulkCategory;
    return Array.from(selected).every((id) => {
      const draft = drafts.find((d) => d.id === id);
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
      const category =
        bulkMode === "all"
          ? bulkCategory
          : (perArticleCat[id] || drafts.find((d) => d.id === id)?.category);
      if (!category) { fail++; continue; }
      try {
        const { error } = await supabase
          .from("book_summaries")
          .update({ status: "published", category, auto_saved_at: null })
          .eq("id", id)
          .eq("user_id", user.id);
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
      const { error } = await supabase
        .from("book_summaries")
        .delete()
        .eq("id", deleteTarget)
        .eq("user_id", user.id);
      if (error) throw error;
      setDeleteTarget(null);
      setSelected((prev) => { const n = new Set(prev); n.delete(deleteTarget); return n; });
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
      {/* Auto-link modal — used for both single (🎯 Link) and bulk (🎯 Auto-link N) */}
      {autoLinkTargets && (
        <AutoLinkModal
          drafts={autoLinkTargets}
          onClose={() => setAutoLinkTargets(null)}
          onSaved={() => { setAutoLinkTargets(null); fetchDrafts(); }}
        />
      )}

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

              {/* Bulk auto-link button — opens AutoLinkModal for all selected drafts */}
              <button
                type="button"
                className="dp-btn dp-btn--autolink"
                onClick={() => setAutoLinkTargets(drafts.filter((d) => selected.has(d.id)))}
                title={`Auto-link ${selected.size} draft${selected.size !== 1 ? "s" : ""}`}
              >
                🎯 Auto-link {selected.size > 1 ? `${selected.size} drafts` : "selected"}
              </button>

              <span className="dp-bulk-divider">|</span>

              <div className="draft-panel__bulk-mode">
                <label>
                  <input
                    type="radio"
                    name="bulkMode"
                    value="individual"
                    checked={bulkMode === "individual"}
                    onChange={() => setBulkMode("individual")}
                  />
                  {" "}Per review
                </label>
                <label style={{ marginLeft: 14 }}>
                  <input
                    type="radio"
                    name="bulkMode"
                    value="all"
                    checked={bulkMode === "all"}
                    onChange={() => setBulkMode("all")}
                  />
                  {" "}Same for all
                </label>
              </div>

              {bulkMode === "all" && (
                <select
                  className="draft-panel__bulk-cat"
                  value={bulkCategory}
                  onChange={(e) => setBulkCategory(e.target.value)}
                >
                  <option value="">— Choose category —</option>
                  {CATEGORIES.map((c) => <option key={c} value={c}>{c}</option>)}
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
                  <th style={{ width: 160 }}>Actions</th>
                </tr>
              </thead>
              <tbody>
                {drafts.map((draft) => {
                  const isSelected = selected.has(draft.id);
                  const vInfo      = VERDICT_LABELS[draft.verdict] || null;
                  return (
                    <tr
                      key={draft.id}
                      className={isSelected ? "draft-panel__row--selected" : ""}
                    >
                      <td>
                        <input
                          type="checkbox"
                          checked={isSelected}
                          onChange={() => toggleSelect(draft.id)}
                        />
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
                            onChange={(e) =>
                              setPerArticleCat((prev) => ({ ...prev, [draft.id]: e.target.value }))
                            }
                            className="draft-panel__cat-select"
                          >
                            <option value="">— Choose category —</option>
                            {CATEGORIES.map((c) => <option key={c} value={c}>{c}</option>)}
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
                          {/* Single-draft link button — same AutoLinkModal, one target */}
                          <button
                            type="button"
                            className="dp-btn dp-btn--autolink"
                            onClick={() => setAutoLinkTargets([draft])}
                            title="Auto-link this draft"
                          >
                            🎯 Link
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
          <div className="draft-panel__modal" onClick={(e) => e.stopPropagation()}>
            <div style={{ fontSize: 44, marginBottom: 8, textAlign: "center" }}>⚠️</div>
            <h3 style={{ margin: "0 0 8px", color: "#dc2626", textAlign: "center" }}>
              Delete this draft?
            </h3>
            <p style={{ color: "#6b7280", marginBottom: 20, fontSize: 14, textAlign: "center" }}>
              <strong>"{drafts.find((d) => d.id === deleteTarget)?.title || "Untitled"}"</strong>{" "}
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