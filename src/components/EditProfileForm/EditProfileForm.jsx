// src/components/EditProfileForm/EditProfileForm.jsx
import React, { useState, useEffect } from 'react';
import { supabase } from '../../supabase/supabaseClient';
import './EditProfileForm.css';

const EditProfileForm = ({ onClose, currentUsername, onUpdate }) => {
  const [username, setUsername] = useState(currentUsername || '');
  const [isLoading, setIsLoading] = useState(false);

  const handleUpdateProfile = async (e) => {
    e.preventDefault();
    setIsLoading(true);

    if (username.trim() === '') {
      alert('Username cannot be empty.');
      setIsLoading(false);
      return;
    }

    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('User not found.');

      const { error } = await supabase
        .from('profiles')
        .update({ username })
        .eq('id', user.id);

      if (error) throw error;

      alert('Profile updated successfully!');
      onUpdate(username);
      onClose();
    } catch (error) {
      console.error('Error updating profile:', error);
      alert(`Error updating profile: ${error.message}`);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="modal-backdrop">
      <div className="modal-content">
        <form onSubmit={handleUpdateProfile} className="edit-profile-form">
          <h2>Edit Profile</h2>
          <label>
            Username
            <input
              type="text"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              placeholder="Enter your new username"
              required
            />
          </label>
          <div className="form-actions">
            <button type="submit" disabled={isLoading}>
              {isLoading ? 'Updating...' : 'Update'}
            </button>
            <button type="button" onClick={onClose} disabled={isLoading}>
              Cancel
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default EditProfileForm;