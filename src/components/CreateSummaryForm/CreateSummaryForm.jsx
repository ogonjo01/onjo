import React, { useState, useEffect, useRef } from 'react';
import { supabase } from '../../supabase/supabaseClient';
import ReactQuill, { Quill } from 'react-quill';
import 'quill/dist/quill.snow.css';
import slugify from 'slugify';
import './CreateSummaryForm.css';

// Custom clipboard handler to parse tab-separated text into tables
const Clipboard = Quill.import('modules/clipboard');
const Delta = Quill.import('delta');

class CustomClipboard extends Clipboard {
  onPaste(e) {
    if (e.clipboardData && e.clipboardData.getData('text/plain')) {
      const text = e.clipboardData.getData('text/plain');
      const lines = text.split('\n').filter(line => line.trim());
      if (lines.length > 1 && lines.every(line => line.includes('\t'))) {
        e.preventDefault();
        const tableDelta = new Delta();
        tableDelta.insert({ table: true }); // Start table
        lines.forEach(line => {
          const cells = line.split('\t').map(cell => cell.trim());
          tableDelta.insert({ 'table-row': cells });
        });
        tableDelta.insert({ 'table-end': true });
        this.quill.updateContents(tableDelta, 'user');
        return;
      }
    }
    super.onPaste(e);
  }
}

Quill.register('modules/clipboard', CustomClipboard, true);

const categories = [
  "Ache of Ambition",
  "Allied Empires",
  "Baggage of Betrayal",
  "Bathroom Confessions",
  "Beauty in Breakups",
  "Bedroom Bargains",
  "Boardroom Games",
  "Boundless Ambitions",
  "Breakthrough Bonds",
  "Captured Moments",
  "Campfire Covenants",
  "Caffeine-Fueled Crushes",
  "Cherished Legacies",
  "Code of the Heart",
  "Culinary Conquests",
  "Crafted Deceptions",
  "Cycle of Sacrifice",
  "Accessible Alliances",
  "DIY Dynasties",
  "Lessons in Longing",
  "Electric Entanglements",
  "Crisis of Conscience",
  "Fashioned Facades",
  "Fiscal Fractures",
  "Reels of Ruin",
  "Fitness of the Fallen",
  "Furnished Fantasies",
  "Gamer's Gambit",
  "Gear of the Grind",
  "Gifts of Goodbye",
  "Grilled Grievances",
  "Healing Horizons",
  "Harbored Hungers",
  "Seasonal Seductions",
  "Haven of Heartache",
  "Machinery of Motive",
  "Kitchen Kingdoms",
  "Lawn of Lost Loves",
  "Lifestyle of Longing",
  "Illuminated Illusions",
  "Mending Measures",
  "Masculine Masks",
  "Mobile Misdirections",
  "Symphonies of Surrender",
  "Strummed Secrets",
  "Desk of Desires",
  "Parenthood Pacts",
  "Festive Faultlines",
  "Patio Pacts",
  "Furry Faithfuls",
  "Framed Fractures",
  "Poolside Plots",
  "Proven Partners",
  "Safeguarded Secrets",
  "Senior Sagas",
  "Stepped into Shadows",
  "Automated Affairs",
  "Nourished Narratives",
  "Outdoor Odysseys",
  "Shelved Secrets",
  "Streamed Seductions",
  "Shaded Suspicions",
  "Tactical Tempests",
  "Tech of Temptation",
  "Playful Pains",
  "Wanderlust Wounds",
  "Timed Treacheries",
  "Aqua Allures",
  "Vow Violations",
  "Vintage Vices",
  "Frostbitten Feuds",
  "Adorned Agonies",
  "Carved Conundrums",
  "Remote Rifts"
];


const CreateSummaryForm = ({ onClose, onNewSummary }) => {
  const [title, setTitle] = useState('');
  const [slug, setSlug] = useState('');
  const [author, setAuthor] = useState('');
  const [summaryText, setSummaryText] = useState('');
  const [category, setCategory] = useState(categories[0]);
  const [imageUrl, setImageUrl] = useState('');
  const [affiliateLink, setAffiliateLink] = useState('');
  const [loading, setLoading] = useState(false);

  const quillRef = useRef(null);

  // Auto-generate slug
  useEffect(() => {
    if (title.trim()) {
      const generatedSlug = slugify(title, { 
        lower: true,
        replacement: "-", 
        strict: false
      });
      setSlug(generatedSlug);
    } else {
      setSlug('');
    }
  }, [title]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!title.trim()) {
      alert('Title is required.');
      return;
    }
    setLoading(true);

    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      alert('You must be logged in to create a summary.');
      setLoading(false);
      return;
    }

    let finalSlug = slug;

    // Check for existing slug
    const { data: existing, error: checkError } = await supabase
      .from('book_summaries')
      .select('id')
      .eq('slug', finalSlug)
      .maybeSingle();

    if (checkError) {
      console.error('Error checking slug:', checkError);
    } else if (existing) {
      let counter = 2;
      while (true) {
        const candidateSlug = `${slug}-${counter}`;
        const { data: slugExists } = await supabase
          .from('book_summaries')
          .select('id')
          .eq('slug', candidateSlug)
          .maybeSingle();
        if (!slugExists) {
          finalSlug = candidateSlug;
          break;
        }
        counter++;
      }
    }

    const { error } = await supabase
      .from('book_summaries')
      .insert([{
        title,
        author,
        summary: summaryText,
        category,
        user_id: user.id,
        image_url: imageUrl,
        affiliate_link: affiliateLink,
        slug: finalSlug
      }]);

    setLoading(false);

    if (error) {
      alert(`Error creating summary: ${error.message}. Please try again.`);
      console.error('Error:', error);
    } else {
      alert(`Summary created successfully! URL: https://ogonjo.com/summary/${finalSlug}`);
      setTitle('');
      setAuthor('');
      setSummaryText('');
      setCategory(categories[0]);
      setImageUrl('');
      setAffiliateLink('');
      setSlug('');
      if (typeof onNewSummary === 'function') onNewSummary();
      if (typeof onClose === 'function') onClose();
    }
  };

  const quillModules = {
    toolbar: [
      [{ header: [1, 2, 3, false] }],
      ['bold', 'italic', 'underline', 'strike'],
      [{ color: [] }, { background: [] }],
      [{ list: 'ordered' }, { list: 'bullet' }],
      ['blockquote', 'code-block'],
      ['link', 'image'],
      ['clean'],
    ],
    clipboard: {
      matchVisual: false,
    },
  };

  const quillFormats = [
    'header', 'bold', 'italic', 'underline', 'strike',
    'color', 'background', 'list', 'bullet', 'blockquote',
    'code-block', 'link', 'image', 'table'
  ];

  return (
    <div className="modal-overlay">
      <div className="modal-content large">
        <button className="close-button" onClick={onClose}>&times;</button>
        <h2>Create a New Summary</h2>
        <form onSubmit={handleSubmit} className="summary-form">
          <label htmlFor="title">Title</label>
          <input
            id="title"
            type="text"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            required
            aria-label="Summary title"
          />
          {slug && (
            <small className="slug-preview">
              Generated URL slug: <code>/summary/{slug}</code> (will be: https://ogonjo.com/summary/{slug})
            </small>
          )}

          <label htmlFor="author">Author</label>
          <input
            id="author"
            type="text"
            value={author}
            onChange={(e) => setAuthor(e.target.value)}
            required
            aria-label="Author name"
          />

          <label htmlFor="category">Category</label>
          <select
            id="category"
            value={category}
            onChange={(e) => setCategory(e.target.value)}
            required
            aria-label="Select category"
          >
            {categories.map(cat => (
              <option key={cat} value={cat}>{cat}</option>
            ))}
          </select>

          <label htmlFor="imageUrl">Book Cover Image URL</label>
          <input
            id="imageUrl"
            type="url"
            value={imageUrl}
            onChange={(e) => setImageUrl(e.target.value)}
            placeholder="e.g., https://example.com/cover.jpg"
            aria-label="Book cover image URL"
          />

          <label htmlFor="affiliateLink">Affiliate Link</label>
          <input
            id="affiliateLink"
            type="url"
            value={affiliateLink}
            onChange={(e) => setAffiliateLink(e.target.value)}
            placeholder="e.g., https://amazon.com/book123"
            aria-label="Affiliate link"
          />

          <label htmlFor="summaryText">Summary</label>
          <div className="quill-container">
            <ReactQuill
              ref={quillRef}
              id="summaryText"
              value={summaryText}
              onChange={setSummaryText}
              modules={quillModules}
              formats={quillFormats}
              theme="snow"
            />
          </div>

          <button type="submit" disabled={loading}>
            {loading ? 'Submitting...' : 'Submit Summary'}
          </button>
        </form>
      </div>
    </div>
  );
};

export default CreateSummaryForm;
