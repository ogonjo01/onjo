// src/components/AvatarForm/AvatarForm.jsx
import React, { useState } from 'react';
import { supabase } from '../../supabase/supabaseClient';
import './AvatarForm.css';

const AvatarForm = ({ userId, onAvatarUpdate, onClose }) => {
  const [loading, setLoading] = useState(false);
  const [avatarFile, setAvatarFile] = useState(null);

  const handleFileChange = (e) => {
    if (e.target.files.length > 0) {
      setAvatarFile(e.target.files[0]);
    }
  };

  const handleUpload = async (e) => {
    e.preventDefault();
    if (!avatarFile) {
      alert('Please select a file to upload.');
      return;
    }

    setLoading(true);

    try {
      const fileExt = avatarFile.name.split('.').pop();
      const filePath = `${userId}/${Math.random()}.${fileExt}`;

      const { data: uploadData, error: uploadError } = await supabase.storage
        .from('avatars')
        .upload(filePath, avatarFile, {
          upsert: true, // Overwrite if a file with the same name exists
        });

      if (uploadError) throw uploadError;

      const { data: { publicUrl } } = supabase.storage
        .from('avatars')
        .getPublicUrl(filePath);

      const { error: updateError } = await supabase
        .from('profiles')
        .update({ avatar_url: publicUrl })
        .eq('id', userId);

      if (updateError) throw updateError;

      onAvatarUpdate(publicUrl);
      alert('Avatar updated successfully!');
      onClose();
    } catch (error) {
      console.error('Error uploading avatar:', error);
      alert(`Error uploading avatar: ${error.message}`);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="avatar-form-modal-overlay">
      <div className="avatar-form-modal-content">
        <h2>Change Avatar</h2>
        <form onSubmit={handleUpload}>
          <input type="file" onChange={handleFileChange} accept="image/*" />
          <div className="form-actions">
            <button type="submit" disabled={loading}>
              {loading ? 'Uploading...' : 'Upload Avatar'}
            </button>
            <button type="button" onClick={onClose} disabled={loading}>
              Cancel
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default AvatarForm;