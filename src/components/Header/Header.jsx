// src/components/Header/Header.jsx
import React, { useState, useEffect, useCallback } from "react";
import { Link, useNavigate, useSearchParams, useLocation } from "react-router-dom";
import { supabase } from "../../supabase/supabaseClient";
import UserProfileModal from "../UserProfile/UserProfile";
import "./Header.css";

/**
 * Header component - navigation-first search
 *
 * Behaviour:
 * - Input syncs from URL (?q=...) so reloads / back/forward work.
 * - Submit navigates to /explore?q=<raw trimmed query>.
 * - Clearing search replaces the URL with /explore and emits a "clear-search" event
 *   (content feed can listen for it to reset local state).
 * - No live onSearch callbacks while typing (URL is the source of truth).
 */

const Header = ({ session, onAddClick, isHomePage, isHidden }) => {
  const [profile, setProfile] = useState(null);
  const [q, setQ] = useState("");
  const [showProfileModal, setShowProfileModal] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);

  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const location = useLocation();

  // keep the input in sync with the URL `?q=...`
  useEffect(() => {
    const urlq = searchParams.get("q") || "";
    // show the raw (decoded) query in the input for better UX
    setQ(String(urlq || ""));
  }, [searchParams]);

  // load profile
  useEffect(() => {
    let mounted = true;
    const fetchProfile = async () => {
      if (!session) return setProfile(null);
      try {
        const { data } = await supabase
          .from("profiles")
          .select("username, can_add_summary")
          .eq("id", session.user.id)
          .maybeSingle();
        if (mounted) setProfile(data || { username: null, can_add_summary: false });
      } catch (err) {
        console.warn("fetchProfile error", err);
      }
    };
    fetchProfile();
    return () => { mounted = false; };
  }, [session]);

  // clear-search listener: allows ContentFeed to ask header to clear itself
  useEffect(() => {
    const handler = () => {
      setQ("");
      // navigate to explore without q param, replace so backstack is friendly
      try { navigate("/explore", { replace: true }); } catch (e) { /* ignore */ }
    };
    window.addEventListener("clear-search", handler);
    return () => window.removeEventListener("clear-search", handler);
  }, [navigate]);

  // Submit search: navigate to /explore?q=... (URL is source of truth)
  const submitSearch = useCallback((e) => {
    if (e && typeof e.preventDefault === "function") e.preventDefault();
    const trimmed = String(q || "").trim();

    const target = trimmed ? `/explore?q=${encodeURIComponent(trimmed)}` : "/explore";
    const current = `${location.pathname}${location.search}`;

    // If we are already at the exact URL, replace to trigger route listeners
    if (current === target) {
      navigate(target, { replace: true });
    } else {
      navigate(target);
    }
  }, [q, navigate, location.pathname, location.search]);

  // Clear button: clear input and URL, and notify other components
  const clearSearch = useCallback((e) => {
    if (e && typeof e.preventDefault === "function") e.preventDefault();
    setQ("");
    // replace url without q to avoid creating back entries
    navigate("/explore", { replace: true });
    // dispatch an event so ContentFeed (or other components) can react
    try { window.dispatchEvent(new Event("clear-search")); } catch (err) { /* ignore */ }
    // focus input after clearing
    const el = document.querySelector(".og-search input");
    if (el) el.focus();
  }, [navigate]);

  const avatarLetter =
    (profile?.username || session?.user?.email || "U")[0]?.toUpperCase() || "U";

  const handleSignOut = useCallback(async () => {
    await supabase.auth.signOut();
    window.location.href = "/auth";
  }, []);

  const headerClassName = `og-header ${isHomePage ? "" : "og-header--scrollable"} ${isHidden ? "og-header--hidden" : ""}`;

  return (
    <>
      <header className={headerClassName}>
        <div className="og-header-left">
          <button
            className="icon-btn mobile-menu-toggle"
            onClick={() => setMenuOpen(!menuOpen)}
            aria-label="Toggle menu"
          >
            ☰
          </button>

          <Link to="/" className="og-logo" aria-label="Home">
            <div className="og-logo-mark">O</div>
            <div className="og-logo-text">ONJO Reviews</div>
          </Link>
        </div>

        <form onSubmit={submitSearch} className="og-search" role="search" aria-label="Search business knowledge">
          <input
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder="Search reviews, tools, and topics..."
            aria-label="Search content"
            autoComplete="off"
            className="search-input"
          />

          {q && (
            <button type="button" className="search-clear" onClick={clearSearch} aria-label="Clear search">×</button>
          )}

          <button type="submit" className="search-btn" aria-label="Submit search">
            <svg width="16" height="16" viewBox="0 0 24 24" aria-hidden="true" focusable="false">
              <path fill="currentColor" d="M15.5 14h-.79l-.28-.27A6.471 6.471 0 0016 9.5 6.5 6.5 0 109.5 16c1.61 0 3.09-.59 4.23-1.57l.27.28v.79l5 4.99L20.49 19l-4.99-5zM10 15.5A5.5 5.5 0 1110 4.5a5.5 5.5 0 010 11z"/>
            </svg>
          </button>
        </form>

        <div className="og-header-right">
          <div className="og-actions-desktop">
            {session ? (
              <>
                <button className="profile-button" onClick={() => setShowProfileModal(true)}>
                  <span className="letter-avatar">{avatarLetter}</span>
                  <span className="profile-name">{profile?.username || "Profile"}</span>
                </button>

                <button className="logout-button" onClick={handleSignOut}>Sign Out</button>

                {profile?.can_add_summary && <button className="create-button" onClick={onAddClick}>+ Add Summary</button>}
              </>
            ) : (
              <Link to="/auth" className="sign-in-link">Sign In</Link>
            )}

            <a href="https://onjo.gumroad.com" target="_blank" rel="noopener noreferrer" className="subscribe-button">Subscribe</a>
          </div>
        </div>
      </header>

      {menuOpen && (
        <>
          <div className="mobile-menu-left">
            <button className="mobile-menu-close" onClick={() => setMenuOpen(false)} aria-label="Close menu">✕</button>

            {session ? (
              <>
                <button onClick={() => { setShowProfileModal(true); setMenuOpen(false); }}>Profile</button>
                <button onClick={() => { handleSignOut(); setMenuOpen(false); }}>Sign Out</button>
                {profile?.can_add_summary && <button onClick={() => { onAddClick(); setMenuOpen(false); }}>+ Add Summary</button>}
              </>
            ) : (
              <Link to="/auth" onClick={() => setMenuOpen(false)}>Sign In</Link>
            )}

            <a href="https://onjo.gumroad.com" target="_blank" rel="noopener noreferrer" onClick={() => setMenuOpen(false)}>Subscribe</a>
          </div>
          <div className="overlay" onClick={() => setMenuOpen(false)} />
        </>
      )}

      {showProfileModal && session && (
        <UserProfileModal
          onClose={() => setShowProfileModal(false)}
          onUpdated={(updatedProfile) => setProfile((p) => ({ ...(p || {}), ...updatedProfile }))}
        />
      )}
    </>
  );
};

export default Header;
