// src/components/CommentsSection/CommentsSection.jsx
import React, { useState, useEffect } from 'react';
import { supabase } from '../../supabase/supabaseClient';
import './CommentsSection.css';

const CommentsSection = ({ postId }) => {
  const [comments, setComments] = useState([]);
  const [newComment, setNewComment] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [user, setUser] = useState(null);

  // Load current user
  useEffect(() => {
    const fetchUser = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      setUser(user);
    };
    fetchUser();
  }, []);

  // Fetch comments (your existing logic)
  const fetchComments = async () => {
    setIsLoading(true);
    try {
      const { data, error } = await supabase
        .from('comments')
        .select(`
          id,
          content,
          created_at,
          user_id,
          profiles:user_id (
            username,
            avatar_url
          )
        `)
        .eq('post_id', postId)
        .order('created_at', { ascending: false });

      if (error) throw error;
      setComments(data || []);
    } catch (err) {
      console.error('Error fetching comments:', err);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchComments();
  }, [postId]);

  // Post a new comment
  const handlePostComment = async (e) => {
    e.preventDefault();
    if (!user) {
      alert('You must be logged in to post a comment.');
      return;
    }
    if (newComment.trim() === '') return;

    try {
      const { error } = await supabase
        .from('comments')
        .insert({
          content: newComment,
          user_id: user.id,
          post_id: postId,
        });

      if (error) throw error;
      setNewComment('');
      fetchComments();
    } catch (err) {
      console.error('Error posting comment:', err);
      alert('Failed to post comment. Please try again.');
    }
  };

  // Delete a comment
  const handleDeleteComment = async (commentId, authorId) => {
    if (user && user.id !== authorId) {
      alert("You can only delete your own comments.");
      return;
    }

    if (!window.confirm("Are you sure you want to delete this comment?")) return;

    try {
      const { error } = await supabase
        .from('comments')
        .delete()
        .eq('id', commentId);

      if (error) throw error;
      fetchComments();
    } catch (err) {
      console.error('Error deleting comment:', err);
      alert('Failed to delete comment. Please try again.');
    }
  };

  return (
    <div className="comments-section">
      <h4 className="comments-title">Comments ({comments.length})</h4>

      {/* New Comment Form */}
      <form onSubmit={handlePostComment} className="comment-form">
        <textarea
          value={newComment}
          onChange={(e) => setNewComment(e.target.value)}
          placeholder="Add a comment..."
          rows="3"
          disabled={!user}
        />
        <button type="submit" disabled={!user || newComment.trim() === ''}>
          {user ? 'Post Comment' : 'Sign in to comment'}
        </button>
      </form>

      {/* Comments List */}
      <div className="comments-list">
        {isLoading ? (
          <p>Loading comments…</p>
        ) : comments.length === 0 ? (
          <p>No comments yet. Be the first to comment!</p>
        ) : (
          comments.map((comment) => {
            const displayName = comment.profiles?.username || 'User';
            const initial = (displayName[0] || 'U').toUpperCase();
            const dateStr = comment.created_at ? new Date(comment.created_at).toLocaleDateString('en-US') : '';
            return (
              <div key={comment.id} className="comment-item">
                <div className="comment-header">
                  <div className="comment-author-wrap">
                    {/* Letter avatar circle */}
                    <div className="letter-avatar-circle" aria-hidden="true">
                      {initial}
                    </div>

                    <div className="author-and-meta">
                      <span className="comment-author">{displayName}</span>
                      <span className="comment-date">{dateStr}</span>
                    </div>
                  </div>

                  {user && user.id === comment.user_id && (
                    <button
                      onClick={() => handleDeleteComment(comment.id, comment.user_id)}
                      className="delete-comment-button"
                      aria-label="Delete comment"
                    >
                      &times;
                    </button>
                  )}
                </div>

                <p className="comment-content">{comment.content}</p>
              </div>
            );
          })
        )}
      </div>
    </div>
  );
};

export default CommentsSection;
