import React, { useState } from 'react';
import { supabase } from '../../supabase/supabaseClient';
import './EditSummaryForm.css'; // You can reuse or create new styles

const categories = [
  'Literary Fiction',
  'Mystery / Crime / Thriller',
  'Fantasy',
  'Science Fiction',
  'Romance',
  'Historical Fiction',
  'Horror & Supernatural',
  'Adventure & Action',
  'Dystopian & Speculative',
  'Young Adult (YA) Fiction',
  'Children’s Fiction',
  'Short Stories & Anthologies',
  'Biography & Memoir',
  'History & Politics',
  'Self-Help & Personal Development',
  'Business, Economics & Finance',
  'Science & Technology',
  'Psychology & Human Behavior',
  'Philosophy & Religion',
  'Health, Wellness & Fitness',
  'Education & Reference',
  'Travel & Adventure Writing',
  'True Crime & Investigative',
  'Poetry & Drama',
  'Comics, Manga & Graphic Novels',
];

const EditSummaryForm = ({ summary, onClose, onUpdate }) => {
  const [title, setTitle] = useState(summary.title);
  const [author, setAuthor] = useState(summary.author);
  const [summaryText, setSummaryText] = useState(summary.summary);
  const [category, setCategory] = useState(summary.category);
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);

    const { data, error } = await supabase
      .from('book_summaries')
      .update({
        title,
        author,
        summary: summaryText,
        category,
      })
      .eq('id', summary.id);

    setLoading(false);

    if (error) {
      alert('Error updating summary. Please try again.');
      console.error('Error:', error);
    } else {
      alert('Summary updated successfully!');
      onUpdate(); // Callback to refresh the content feed
      onClose(); // Close the modal
    }
  };

  return (
    <div className="modal-overlay">
      <div className="modal-content">
        <button className="close-button" onClick={onClose}>&times;</button>
        <h2>Edit Summary</h2>
        <form onSubmit={handleSubmit} className="summary-form">
          <label htmlFor="title">Title</label>
          <input
            id="title"
            type="text"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            required
          />

          <label htmlFor="author">Author</label>
          <input
            id="author"
            type="text"
            value={author}
            onChange={(e) => setAuthor(e.target.value)}
            required
          />

          <label htmlFor="category">Category</label>
          <select
            id="category"
            value={category}
            onChange={(e) => setCategory(e.target.value)}
            required
          >
            {categories.map(cat => (
              <option key={cat} value={cat}>{cat}</option>
            ))}
          </select>

          <label htmlFor="summaryText">Summary</label>
          <textarea
            id="summaryText"
            value={summaryText}
            onChange={(e) => setSummaryText(e.target.value)}
            rows="10"
            required
          />

          <button type="submit" disabled={loading}>
            {loading ? 'Updating...' : 'Update Summary'}
          </button>
        </form>
      </div>
    </div>
  );
};

export default EditSummaryForm;


















