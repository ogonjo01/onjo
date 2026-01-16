// src/pages/ExplorePage.jsx
import React, { useEffect, useState, useCallback, useRef } from "react";
import { useLocation } from "react-router-dom";
import { supabase } from "../../supabase/supabaseClient";
import BookSummaryCard from "../BookSummaryCard/BookSummaryCard";
import "./ExplorePage.css";

/* ---------------------------------- */
/* Config & helpers                   */
/* ---------------------------------- */

const SELECT = `
  id,
  created_at,
  title,
  author,
  description,
  category,
  image_url,
  affiliate_link,
  tags,
  slug,
  avg_rating,
  likes_count:likes(count),
  views_count:views(count),
  comments_count:comments(count)
`;

const ITEMS_PER_PAGE = 16;

const normalizeRow = (r) => {
  const text = r.description || "";
  return {
    ...r,
    title: r.title || "Untitled",
    author: r.author || "",
    description: text,
    excerpt: text.length > 240 ? text.slice(0, 237).trim() + "…" : text,
    tags: Array.isArray(r.tags) ? r.tags.map((t) => t.toLowerCase()) : [],
    avg_rating: Number(r.avg_rating || 0),
    likes_count: r.likes_count?.[0]?.count || 0,
    views_count: r.views_count?.[0]?.count || 0,
    comments_count: r.comments_count?.[0]?.count || 0,
  };
};

const useQuery = () => new URLSearchParams(useLocation().search);

/* ---------------------------------- */
/* Explore Page                       */
/* ---------------------------------- */

const ExplorePage = () => {
  const location = useLocation();
  const query = useQuery();

  const searchTerm = (query.get("q") || "").trim();
  const category = query.get("category");
  const tag = query.get("tag");
  const sort = (query.get("sort") || "newest").toLowerCase();

  const [items, setItems] = useState([]);
  const [related, setRelated] = useState([]);
  const [offset, setOffset] = useState(0);
  const [hasMore, setHasMore] = useState(true);
  const [loading, setLoading] = useState(false);

  const sentinelRef = useRef(null);
  const fetchingRef = useRef(false);

  /* ---------------------------------- */
  /* Main search / feed fetch           */
  /* ---------------------------------- */

  const fetchItems = useCallback(
    async (start = 0, append = false) => {
      if (fetchingRef.current) return;
      fetchingRef.current = true;
      setLoading(true);

      try {
        let q = supabase.from("book_summaries").select(SELECT);

        if (category) q = q.eq("category", category);
        if (tag) q = q.contains("tags", [tag]);

        if (searchTerm) {
          const pattern = `%${searchTerm}%`;
          q = q.or(
            `title.ilike.${pattern},author.ilike.${pattern},description.ilike.${pattern}`
          );
        }

        if (sort === "views") q = q.order("views_count", { ascending: false });
        else if (sort === "likes") q = q.order("likes_count", { ascending: false });
        else if (sort === "rating") q = q.order("avg_rating", { ascending: false });
        else q = q.order("created_at", { ascending: false });

        q = q.range(start, start + ITEMS_PER_PAGE - 1);

        const { data, error } = await q;
        if (error) throw error;

        const normalized = (data || []).map(normalizeRow);

        setItems((prev) => (append ? [...prev, ...normalized] : normalized));
        setOffset(start + normalized.length);
        setHasMore(normalized.length === ITEMS_PER_PAGE);
      } catch (err) {
        console.error("Explore fetch error:", err);
      } finally {
        fetchingRef.current = false;
        setLoading(false);
      }
    },
    [searchTerm, category, tag, sort]
  );

  /* ---------------------------------- */
  /* Related content (search only)      */
  /* ---------------------------------- */

  const fetchRelated = useCallback(async () => {
    if (!searchTerm) {
      setRelated([]);
      return;
    }

    try {
      const keyword = searchTerm.split(" ")[0];
      const pattern = `%${keyword}%`;

      const { data } = await supabase
        .from("book_summaries")
        .select(SELECT)
        .or(
          `title.ilike.${pattern},author.ilike.${pattern},description.ilike.${pattern}`
        )
        .limit(8);

      setRelated((data || []).map(normalizeRow));
    } catch {
      setRelated([]);
    }
  }, [searchTerm]);

  /* ---------------------------------- */
  /* Effects                            */
  /* ---------------------------------- */

  useEffect(() => {
    setItems([]);
    setOffset(0);
    setHasMore(true);
    fetchItems(0, false);
    fetchRelated();
  }, [location.search, fetchItems, fetchRelated]);

  useEffect(() => {
    if (!hasMore || loading) return;

    const observer = new IntersectionObserver(
      ([e]) => e.isIntersecting && fetchItems(offset, true),
      { rootMargin: "600px" }
    );

    if (sentinelRef.current) observer.observe(sentinelRef.current);
    return () => observer.disconnect();
  }, [offset, hasMore, loading, fetchItems]);

  /* ---------------------------------- */
  /* Render                             */
  /* ---------------------------------- */

  const showEmptySearch =
    searchTerm && !loading && items.length === 0;

  return (
    <div className="explore-page">
      <h2>
        {searchTerm
          ? `Results for “${searchTerm}”`
          : category
          ? category
          : "Explore"}
      </h2>

      {/* SEARCH RESULTS */}
      {items.length > 0 && (
        <div className="explore-grid">
          {items.map((item) => (
            <BookSummaryCard key={item.id} summary={item} />
          ))}
        </div>
      )}

      {/* EMPTY SEARCH STATE */}
      {showEmptySearch && (
        <div className="explore-empty">
          <h3>No results found for “{searchTerm}”</h3>
          <p>
            We couldn’t find any content matching your search.
            Try a different keyword or explore related content below.
          </p>
        </div>
      )}

      {hasMore && <div ref={sentinelRef} className="explore-sentinel" />}

      {loading && <div className="explore-loading">Loading…</div>}

      {/* RELATED CONTENT */}
      {searchTerm && related.length > 0 && (
        <>
          <h3 className="explore-related-title">Related content</h3>
          <div className="explore-grid explore-related">
            {related.map((item) => (
              <BookSummaryCard key={`rel-${item.id}`} summary={item} />
            ))}
          </div>
        </>
      )}
    </div>
  );
};

export default ExplorePage;
