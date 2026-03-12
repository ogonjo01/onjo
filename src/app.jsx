import React, { useState, useEffect, useCallback } from 'react';
import { BrowserRouter as Router, Routes, Route, useLocation, useNavigate } from 'react-router-dom';
import { supabase } from './supabase/supabaseClient';
import SubscriptionPage from './pages/SubscriptionPage';
import Header from './components/Header/Header';
import CategoryFilter from './components/CategoryFilter/CategoryFilter';
import ContentFeed from './components/ContentFeed/ContentFeed';
import AddSummaryForm from './components/CreateSummaryForm/CreateSummaryForm';
import EditSummaryForm from './components/EditSummaryForm/EditSummaryForm';
import AuthForm from './components/AuthForm/AuthForm';
import UserProfile from './components/UserProfile/UserProfile';
import SummaryView from './components/SummaryView/SummaryView';
import ExplorePage from './components/ExplorePage/ExplorePage';
import About from "./pages/About";
import Features from "./pages/Features";
import Contact from "./pages/Contact";
import Terms from "./pages/Terms";
import Privacy from "./pages/Privacy";
import FAQ from "./pages/FAQ";
import Footer from './components/Footer';
import SubscriptionPopup from './components/SubscriptionPopup/SubscriptionPopup';
import './App.css';

const ScrollToTop = () => {
  const { pathname } = useLocation();
  useEffect(() => {
    const main = document.querySelector('.main-content');
    if (main) main.scrollTo({ top: 0, left: 0, behavior: 'instant' });
    window.scrollTo({ top: 0, left: 0, behavior: 'instant' });
    if (document.documentElement) document.documentElement.scrollTop = 0;
    if (document.body) document.body.scrollTop = 0;
  }, [pathname]);
  return null;
};

/* ── Fetch full row before opening editor ────────────────────
   DraftPanel / ContentFeed pass lightweight objects.
   Always re-fetch SELECT * so the editor has everything.
──────────────────────────────────────────────────────────── */
const fetchFullArticle = async (id) => {
  if (!id) return null;
  try {
    const { data, error } = await supabase
      .from('book_summaries')
      .select('*')
      .eq('id', id)
      .maybeSingle();
    if (error) throw error;
    return data;
  } catch (err) {
    console.error('fetchFullArticle error:', err);
    return null;
  }
};

const AppInner = ({ session }) => {
  const navigate  = useNavigate();
  const location  = useLocation();

  const getCategoryFromSearch = useCallback(() => {
    const qs = new URLSearchParams(location.search);
    return qs.get('category') || 'For You';
  }, [location.search]);

  const [selectedCategory, setSelectedCategory] = useState(getCategoryFromSearch());
  const [searchQuery, setSearchQuery]           = useState('');

  // CreateSummaryForm (new reviews)
  const [showAddForm, setShowAddForm]       = useState(false);
  const [editingSummary, setEditingSummary] = useState(null);

  // EditSummaryForm (editing existing / drafts)
  const [showEditForm, setShowEditForm] = useState(false);
  const [draftToEdit, setDraftToEdit]   = useState(null);
  const [editLoading, setEditLoading]   = useState(false);

  const [headerHidden, setHeaderHidden] = useState(false);
  const [showPopup, setShowPopup]       = useState(false);
  const [userRole, setUserRole]         = useState('user');

  const isHomePage = location.pathname === '/';

  useEffect(() => {
    setSelectedCategory(getCategoryFromSearch());
  }, [location.search, getCategoryFromSearch]);

  useEffect(() => {
    const handleScroll = () => {
      if (isHomePage) { setHeaderHidden(false); return; }
      setHeaderHidden(window.scrollY > 0);
    };
    window.addEventListener('scroll', handleScroll, { passive: true });
    return () => window.removeEventListener('scroll', handleScroll);
  }, [isHomePage]);

  useEffect(() => {
    const checkPopup = () => {
      const subscribedAt = localStorage.getItem('subscribedAt');
      const dismissedAt  = localStorage.getItem('popupDismissedAt');
      const now = Date.now();
      if (subscribedAt) return;
      if (!dismissedAt || now - parseInt(dismissedAt) > 4 * 24 * 60 * 60 * 1000) setShowPopup(true);
    };
    const timer = setTimeout(checkPopup, 10000);
    return () => clearTimeout(timer);
  }, []);

  const handleNavClick = useCallback((category) => {
    const cat = category || 'For You';
    setSelectedCategory(cat);
    setSearchQuery('');
    navigate(`/?category=${encodeURIComponent(cat)}`, { replace: false });
  }, [navigate]);

  const handleSearch = useCallback((query) => {
    setSearchQuery(query);
    setSelectedCategory('');
    navigate(query ? `/?q=${encodeURIComponent(query)}` : '/', { replace: false });
  }, [navigate]);

  /* ── handleEdit ──────────────────────────────────────────────
     Called from DraftPanel ✏️ button, ContentFeed edit action,
     and UserProfile. The object passed in may be partial —
     always fetch SELECT * first so the editor has full content.
  ──────────────────────────────────────────────────────────── */
  const handleEdit = useCallback(async (partialSummary) => {
    if (!partialSummary?.id) return;
    setEditLoading(true);
    const full = await fetchFullArticle(partialSummary.id);
    setDraftToEdit(full || partialSummary);
    setShowEditForm(true);
    setEditLoading(false);
  }, []);

  // Header "+ New" button → CreateSummaryForm
  const handleNewArticle = () => {
    setEditingSummary(null);
    setShowAddForm(true);
  };

  const handleDelete = (summaryId) => {
    console.log(`Review with ID ${summaryId} deleted.`);
    window.location.reload();
  };

  const handleEditFormClose = () => {
    setShowEditForm(false);
    setDraftToEdit(null);
  };

  const handleEditFormUpdate = () => {
    setShowEditForm(false);
    setDraftToEdit(null);
  };

  return (
    <div className="app-container">
      <ScrollToTop />
      <Header
        session={session}
        onAddClick={handleNewArticle}
        onSearch={handleSearch}
        isHomePage={isHomePage}
        isHidden={headerHidden}
      />
      <CategoryFilter
        selectedCategory={selectedCategory}
        onSelectCategory={handleNavClick}
        isHomePage={isHomePage}
        isHidden={headerHidden}
        onRoleLoaded={setUserRole}
      />

      <main className="main-content">
        <Routes>
          <Route path="/" element={
            <ContentFeed
              selectedCategory={selectedCategory}
              searchQuery={searchQuery}
              onEdit={handleEdit}
              onDelete={handleDelete}
              onSelectCategory={handleNavClick}
              userRole={userRole}
            />
          } />
          <Route path="/auth" element={!session ? <AuthForm /> : <p className="logged-in-message">You are already logged in!</p>} />
          <Route path="/profile/:userId" element={<UserProfile onEdit={handleEdit} onDelete={handleDelete} />} />
          <Route path="/review/:param" element={<SummaryView />} />
          <Route path="/summary/:param" element={<SummaryView />} />
          <Route path="/explore" element={<ExplorePage />} />
          <Route path="/features" element={<Features />} />
          <Route path="/contact" element={<Contact />} />
          <Route path="/terms" element={<Terms />} />
          <Route path="/privacy" element={<Privacy />} />
          <Route path="/faq" element={<FAQ />} />
          <Route path="/about" element={<About />} />
          <Route path="/subscribe" element={<SubscriptionPage />} />
        </Routes>

        {/* Loading overlay while fetching full article before edit */}
        {editLoading && (
          <div style={{
            position: 'fixed', inset: 0,
            background: 'rgba(0,0,0,0.35)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            zIndex: 9999,
          }}>
            <div style={{
              background: '#fff', borderRadius: 12,
              padding: '32px 48px', fontSize: 15,
              color: '#374151', fontWeight: 500,
              boxShadow: '0 8px 32px rgba(0,0,0,0.18)',
            }}>
              ⏳ Loading review…
            </div>
          </div>
        )}

        {/* Create new review */}
        {showAddForm && (
          <AddSummaryForm
            onClose={() => { setShowAddForm(false); setEditingSummary(null); }}
            editingSummary={editingSummary}
            onNewSummary={() => { setShowAddForm(false); setEditingSummary(null); }}
          />
        )}

        {/* Edit existing review / draft — key forces full remount if draft switches */}
        {showEditForm && draftToEdit && (
          <EditSummaryForm
            key={draftToEdit.id}
            summary={draftToEdit}
            onClose={handleEditFormClose}
            onUpdate={handleEditFormUpdate}
          />
        )}
      </main>

      <Footer />
      {showPopup && <SubscriptionPopup onClose={() => setShowPopup(false)} />}
    </div>
  );
};

const App = () => {
  const [session, setSession] = useState(null);

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => setSession(session));
    const { data: authListener } = supabase.auth.onAuthStateChange((_event, session) => setSession(session));
    return () => authListener.subscription.unsubscribe();
  }, []);

  return (
    <Router>
      <AppInner session={session} />
    </Router>
  );
};

export default App;