import React, { useState, useEffect } from "react";
import { Link, useNavigate } from "react-router-dom";
import { supabase } from "../../supabase/supabaseClient";
import UserProfileModal from "../UserProfile/UserProfile";
import "./Header.css";

const Header = ({ session, onAddClick, onSearch, isHomePage, isHidden }) => {
  const [profile, setProfile] = useState(null);
  const [q, setQ] = useState("");
  const [showProfileModal, setShowProfileModal] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);
  const navigate = useNavigate();

  useEffect(() => {
    let mounted = true;
    const fetchProfile = async () => {
      if (!session) return setProfile(null);
      const { data } = await supabase
        .from("profiles")
        .select("username, can_add_summary")
        .eq("id", session.user.id)
        .maybeSingle();
      if (mounted) setProfile(data || { username: null, can_add_summary: false });
    };
    fetchProfile();
    return () => { mounted = false; };
  }, [session]);

  const submitSearch = (e) => {
    e?.preventDefault?.();
    const trimmed = (q || "").trim();
    if (typeof onSearch === "function") onSearch(trimmed);
    if (!trimmed) navigate("/explore");
    else navigate(`/explore?q=${encodeURIComponent(trimmed)}`);
  };

  const clearSearch = (e) => {
    e?.preventDefault?.();
    setQ("");
    if (typeof onSearch === "function") onSearch("");
    const el = document.querySelector(".og-search input");
    if (el) el.focus();
  };

  const avatarLetter =
    (profile?.username || session?.user?.email || "U")[0]?.toUpperCase() || "U";

  const handleSignOut = async () => {
    await supabase.auth.signOut();
    window.location.href = "/auth";
  };

  const headerClassName = `og-header ${isHomePage ? "" : "og-header--scrollable"} ${
    isHidden ? "og-header--hidden" : ""
  }`;

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
            <div className="og-logo-text">ONJO</div> {/* Updated Oct 15, 2025: Rebrand from OGONJO */}
          </Link>
        </div>

        <form onSubmit={submitSearch} className="og-search" role="search" aria-label="Site search">
          <input
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder="Search guides (product, review, category)..." /* Updated: From summaries to guides/products */
            aria-label="Search guides" /* Updated: Accessibility alignment */
            autoComplete="off"
            className="search-input"
          />
          {q && q.length > 0 && (
            <button type="button" className="search-clear" onClick={clearSearch} aria-label="Clear search">
              ×
            </button>
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

                {/* Only show Add Summary if user can_add_summary is true */}
                {profile?.can_add_summary && (
                  <button className="create-button" onClick={onAddClick}>
                    + Add Guide {/* Updated: From "Add Summary" to "Add Guide" for niche focus */}
                  </button>
                )}
              </>
            ) : (
              <Link to="/auth" className="sign-in-link">Sign In</Link>
            )}

            <Link to="/subscribe" className="subscribe-button">Subscribe</Link> {/* Unchanged: Route fits */}
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

                {profile?.can_add_summary && (
                  <button onClick={() => { onAddClick(); setMenuOpen(false); }}>
                    + Add Guide {/* Updated: Consistent with desktop */}
                  </button>
                )}
              </>
            ) : (
              <Link to="/auth" onClick={() => setMenuOpen(false)}>Sign In</Link>
            )}

            <Link to="/subscribe" onClick={() => setMenuOpen(false)}>Subscribe</Link>
          </div>
          <div className="overlay" onClick={() => setMenuOpen(false)} />
        </>
      )}

      {showProfileModal && session && (
        <UserProfileModal
          onClose={() => setShowProfileModal(false)}
          onUpdated={(updatedProfile) =>
            setProfile((p) => ({ ...(p || {}), ...updatedProfile }))
          }
        />
      )}
    </>
  );
};

export default Header;