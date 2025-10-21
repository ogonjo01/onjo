import React, { useState, useEffect, useCallback } from 'react';
import { BrowserRouter as Router, Routes, Route, useLocation, useNavigate } from 'react-router-dom';
import { supabase } from './supabase/supabaseClient';
import SubscriptionPage from './pages/SubscriptionPage';
import Header from './components/Header/Header';
import CategoryFilter from './components/CategoryFilter/CategoryFilter';
import ContentFeed from './components/ContentFeed/ContentFeed';
import AddSummaryForm from './components/CreateSummaryForm/CreateSummaryForm';
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

const AppInner = ({ session }) => {
  const navigate = useNavigate();
  const location = useLocation();

  const getCategoryFromSearch = useCallback(() => {
    const qs = new URLSearchParams(location.search);
    const cat = qs.get('category');
    return cat || 'For You';
  }, [location.search]);

  const [selectedCategory, setSelectedCategory] = useState(getCategoryFromSearch());
  const [searchQuery, setSearchQuery] = useState('');
  const [showAddForm, setShowAddForm] = useState(false);
  const [editingSummary, setEditingSummary] = useState(null);
  const isHomePage = location.pathname === '/';
  const [headerHidden, setHeaderHidden] = useState(false);
  const [showPopup, setShowPopup] = useState(false);

  useEffect(() => {
    setSelectedCategory(getCategoryFromSearch());
  }, [location.search, getCategoryFromSearch]);

  useEffect(() => {
    let lastScrollY = window.scrollY;

    const handleScroll = () => {
      if (isHomePage) {
        setHeaderHidden(false);
        return;
      }
      const currentScrollY = window.scrollY;
      setHeaderHidden(currentScrollY > 0);
      lastScrollY = currentScrollY;
    };

    window.addEventListener('scroll', handleScroll, { passive: true });
    return () => window.removeEventListener('scroll', handleScroll);
  }, [isHomePage]);

  useEffect(() => {
    const checkPopup = () => {
      const subscribedAt = localStorage.getItem('subscribedAt');
      const dismissedAt = localStorage.getItem('popupDismissedAt');
      const now = Date.now();
      const popupDelay = 4 * 24 * 60 * 60 * 1000; // 4 days in milliseconds

      if (subscribedAt) return; // Don't show if subscribed
      if (!dismissedAt || now - parseInt(dismissedAt) > popupDelay) {
        setShowPopup(true); // Show if never dismissed or 4+ days since dismissal
      }
    };

    const timer = setTimeout(checkPopup, 10000); // Show after 10 seconds
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

  const handleEdit = (summary) => {
    setEditingSummary(summary);
    setShowAddForm(true);
  };

  const handleDelete = (summaryId) => {
    console.log(`Summary with ID ${summaryId} deleted.`);
    window.location.reload();
  };

  return (
    <div className="app-container">
      <Header 
        session={session} 
        onAddClick={() => setShowAddForm(true)} 
        onSearch={handleSearch} 
        isHomePage={isHomePage} 
        isHidden={headerHidden} 
      />
      <CategoryFilter 
        selectedCategory={selectedCategory} 
        onSelectCategory={handleNavClick} 
        isHomePage={isHomePage} 
        isHidden={headerHidden} 
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
            />
          } />
          <Route path="/auth" element={!session ? <AuthForm /> : <p className="logged-in-message">You are already logged in!</p>} />
          <Route path="/profile/:userId" element={<UserProfile onEdit={handleEdit} onDelete={handleDelete} />} />
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

        {showAddForm && (
          <AddSummaryForm
            onClose={() => {
              setShowAddForm(false);
              setEditingSummary(null);
            }}
            summaryToEdit={editingSummary}
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
    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session);
    });

    const { data: authListener } = supabase.auth.onAuthStateChange((_event, session) => {
      setSession(session);
    });

    return () => {
      authListener.subscription.unsubscribe();
    };
  }, []);

  return (
    <Router>
      <AppInner session={session} />
    </Router>
  );
};

export default App;