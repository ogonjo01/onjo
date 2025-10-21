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
  "Automotive",
  "Baby & Kids",
  "Bags & Luggage",
  "Bathroom Essentials",
  "Beauty & Personal Care",
  "Bedding & Sleep Products",
  "Board Games & Puzzles",
  "Books & Reading Accessories",
  "Business & Entrepreneurship Tools",
  "Camera & Drone Accessories",
  "Camping & Hiking Gear",
  "Coffee & Tea Equipment",
  "Collectibles & Memorabilia",
  "Computer Accessories",
  "Cooking & Recipe Resources",
  "Crafting & Sewing",
  "Cycling & Biking",
  "Disability & Accessibility",
  "DIY & Home Projects",
  "Education & Learning Tools",
  "Electronics & Tech",
  "Emergency Preparedness",
  "Fashion & Accessories",
  "Finance & Money Management",
  "Fishing & Hunting",
  "Fitness & Sports",
  "Furniture & Decor",
  "Gaming & Esports",
  "Gaming Accessories",
  "Gift Ideas & Occasions",
  "Grilling & BBQ",
  "Health & Fitness",
  "Health & Wellness",
  "Hobbies & Collections",
  "Holiday & Seasonal Products",
  "Home & Garden",
  "Industrial Equipment",
  "Kitchen & Cooking",
  "Lawn Care & Landscaping",
  "Lifestyle & Personal Growth",
  "Lighting & Fixtures",
  "Medical Supplies",
  "Men's Grooming",
  "Mobile Accessories",
  "Music & Audio Equipment",
  "Musical Instruments",
  "Office & Stationery",
  "Parenting & Family Life",
  "Party Supplies & Decorations",
  "Patio & Outdoor Living",
  "Pet Supplies",
  "Photography & Videography",
  "Pool & Spa Products",
  "Professional Tools",
  "Security & Safety Products",
  "Senior Care & Mobility",
  "Shoes & Footwear",
  "Smart Home Automation",
  "Specialty Diets & Nutrition",
  "Sports & Outdoors",
  "Storage & Organization",
  "Streaming & Media Devices",
  "Sunglasses & Eyewear",
  "Survival & Tactical Gear",
  "Technology & Smart Devices",
  "Toys & Games",
  "Travel Essentials & Adventure",
  "Watches & Jewelry",
  "Water Sports & Swimming",
  "Wedding & Events",
  "Wine & Bar Accessories",
  "Winter Sports & Snow Gear",
  "Women's Fashion Accessories",
  "Woodworking & Tools",
  "Work From Home Setup"
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
