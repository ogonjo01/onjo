import React, { useState, useEffect, useRef } from "react";
import { supabase } from "../../supabase/supabaseClient";
import ReactQuill, { Quill } from "react-quill";
import "quill/dist/quill.snow.css";
import slugify from "slugify";
import "./CreateSummaryForm.css";

// Custom clipboard handler for table pasting
const Clipboard = Quill.import("modules/clipboard");
const Delta = Quill.import("delta");

class CustomClipboard extends Clipboard {
  onPaste(e) {
    if (e.clipboardData && e.clipboardData.getData("text/plain")) {
      const text = e.clipboardData.getData("text/plain");
      const lines = text.split("\n").filter((line) => line.trim());

      if (lines.length > 1 && lines.every((line) => line.includes("\t"))) {
        e.preventDefault();
        const tableDelta = new Delta();
        tableDelta.insert({ table: true });

        lines.forEach((line) => {
          const cells = line.split("\t").map((cell) => cell.trim());
          tableDelta.insert({ "table-row": cells });
        });

        tableDelta.insert({ "table-end": true });
        this.quill.updateContents(tableDelta, "user");
        return;
      }
    }
    super.onPaste(e);
  }
}

Quill.register("modules/clipboard", CustomClipboard, true);

// FINAL 10 CATEGORIES
const categories = [
  "Business Strategy & Systems",
  "Courses & Learning Paths",
  "Best Books",
  "Business Ideas",
  "Book Summaries",
  "Entrepreneurship",
  "Self-Improvement",
  "Marketing & Sales",
  "Money & Productivity",
  "Mindset & Motivation",
  "Career Development",
  "Video Insights",
  "Digital Skills & Technology",
  "Leadership & Management",
  "Strategic Communication"
];

const CreateSummaryForm = ({ onClose, onNewSummary }) => {
  const [title, setTitle] = useState("");
  const [slug, setSlug] = useState("");
  const [author, setAuthor] = useState("");
  const [description, setDescription] = useState(""); // new description field
  const [summaryText, setSummaryText] = useState("");
  const [category, setCategory] = useState(categories[0]);
  const [imageUrl, setImageUrl] = useState("");
  const [affiliateLink, setAffiliateLink] = useState("");
  const [youtubeUrl, setYoutubeUrl] = useState("");
  const [tags, setTags] = useState(""); // comma-separated input
  const [loading, setLoading] = useState(false);

  const quillRef = useRef(null);

  // Auto slug from title
  useEffect(() => {
    if (title.trim()) {
      const generatedSlug = slugify(title, {
        lower: true,
        strict: false,
        replacement: "-",
      });
      setSlug(generatedSlug);
    } else {
      setSlug("");
    }
  }, [title]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!title.trim()) {
      alert("Title is required.");
      return;
    }
    setLoading(true);

    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      alert("You must be logged in to create a summary.");
      setLoading(false);
      return;
    }

    let finalSlug = slug;

    // Check if slug exists
    const { data: existing } = await supabase
      .from("book_summaries")
      .select("id")
      .eq("slug", finalSlug)
      .maybeSingle();

    if (existing) {
      let counter = 2;
      while (true) {
        const newSlug = `${slug}-${counter}`;
        const { data: exists } = await supabase
          .from("book_summaries")
          .select("id")
          .eq("slug", newSlug)
          .maybeSingle();
        if (!exists) {
          finalSlug = newSlug;
          break;
        }
        counter++;
      }
    }

    const parsedTags =
      tags.trim() === ""
        ? []
        : tags.split(",").map((t) => t.trim().toLowerCase());

    const finalDescription = description.trim() || summaryText.replace(/<[^>]*>/g, '').slice(0, 200);

    const { error } = await supabase.from("book_summaries").insert([
      {
        title,
        author,
        description: finalDescription, // use description
        summary: summaryText,
        category,
        user_id: user.id,
        image_url: imageUrl,
        affiliate_link: affiliateLink,
        youtube_url: youtubeUrl,
        tags: parsedTags,
        slug: finalSlug,
      },
    ]);

    setLoading(false);

    if (error) {
      alert(`Error creating summary: ${error.message}.`);
      console.error(error);
    } else {
      alert(
        `Summary created successfully! URL: https://ogonjo.com/summary/${finalSlug}`
      );

      // Reset
      setTitle("");
      setAuthor("");
      setDescription("");
      setSummaryText("");
      setCategory(categories[0]);
      setImageUrl("");
      setAffiliateLink("");
      setYoutubeUrl("");
      setTags("");
      setSlug("");

      if (typeof onNewSummary === "function") onNewSummary();
      if (typeof onClose === "function") onClose();
    }
  };

  const quillModules = {
    toolbar: [
      [{ header: [1, 2, 3, false] }],
      ["bold", "italic", "underline", "strike"],
      [{ color: [] }, { background: [] }],
      [{ list: "ordered" }, { list: "bullet" }],
      ["blockquote", "code-block"],
      ["link", "image"],
      ["clean"],
    ],
    clipboard: { matchVisual: false },
  };

  const quillFormats = [
    "header",
    "bold",
    "italic",
    "underline",
    "strike",
    "color",
    "background",
    "list",
    "bullet",
    "blockquote",
    "code-block",
    "link",
    "image",
    "table",
  ];

  return (
    <div className="modal-overlay">
      <div className="modal-content large">
        <button className="close-button" onClick={onClose}>
          &times;
        </button>

        <h2>Create a New Summary</h2>

        <form onSubmit={handleSubmit} className="summary-form">
          {/* Title */}
          <label>Title</label>
          <input
            type="text"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            required
          />

          {slug && (
            <small className="slug-preview">
              Generated slug:{" "}
              <code>/summary/{slug}</code>
            </small>
          )}

          {/* Author */}
          <label>Author</label>
          <input
            type="text"
            value={author}
            onChange={(e) => setAuthor(e.target.value)}
            required
          />

          {/* Category */}
          <label>Category</label>
          <select
            value={category}
            onChange={(e) => setCategory(e.target.value)}
            required
          >
            {categories.map((cat) => (
              <option key={cat}>{cat}</option>
            ))}
          </select>

          {/* Description */}
          <label>Description (short preview for feeds)</label>
          <textarea
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            placeholder="Enter a short description (150-250 characters)"
            maxLength={300}
            rows={3}
          />

          {/* Image */}
          <label>Book Cover Image URL</label>
          <input
            type="url"
            value={imageUrl}
            onChange={(e) => setImageUrl(e.target.value)}
            placeholder="https://example.com/cover.jpg"
          />

          {/* Affiliate */}
          <label>Affiliate Link</label>
          <input
            type="url"
            value={affiliateLink}
            onChange={(e) => setAffiliateLink(e.target.value)}
            placeholder="Amazon link"
          />

          {/* YouTube */}
          <label>YouTube URL</label>
          <input
            type="url"
            value={youtubeUrl}
            onChange={(e) => setYoutubeUrl(e.target.value)}
            placeholder="https://youtube.com/watch?v=..."
          />

          {/* Tags */}
          <label>Tags (comma separated)</label>
          <input
            type="text"
            value={tags}
            onChange={(e) => setTags(e.target.value)}
            placeholder="business, leadership, strategy"
          />

          {/* Summary Editor */}
          <label>Summary</label>
          <div className="quill-container">
            <ReactQuill
              ref={quillRef}
              value={summaryText}
              onChange={setSummaryText}
              modules={quillModules}
              formats={quillFormats}
              theme="snow"
            />
          </div>

          <button type="submit" disabled={loading}>
            {loading ? "Submitting..." : "Submit Summary"}
          </button>
        </form>
      </div>
    </div>
  );
};

export default CreateSummaryForm;
