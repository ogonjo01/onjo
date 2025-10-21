// src/components/UserProfile/UserProfile.jsx
import React, { useEffect, useState } from 'react';
import { supabase } from '../../supabase/supabaseClient';
import './UserProfile.css';

const UserProfile = ({ onClose, onUpdated }) => {
  const [loading, setLoading] = useState(true);
  const [profile, setProfile] = useState({ username: '' });
  const [editing, setEditing] = useState(false);
  const [inputValue, setInputValue] = useState('');

  useEffect(() => {
    let mounted = true;

    const loadProfile = async () => {
      setLoading(true);
      try {
        const { data: authData, error: authErr } = await supabase.auth.getUser();
        if (authErr) {
          console.warn('auth.getUser error', authErr);
        }
        const user = authData?.user ?? null;
        if (!user) {
          if (mounted) setLoading(false);
          return;
        }

        // try to load existing profile
        const { data, error } = await supabase
          .from('profiles')
          .select('username, avatar_url')
          .eq('id', user.id)
          .maybeSingle();

        if (!mounted) return;

        if (error) {
          console.warn('Profile fetch error:', error);
          setProfile({ username: '' });
          setInputValue('');
        } else if (data) {
          setProfile(data);
          setInputValue(data.username || '');
        } else {
          // Auto-create profile using upsert (safer than plain insert)
          const { data: upsertData, error: upsertErr } = await supabase
            .from('profiles')
            .upsert({ id: user.id, username: '' }, { onConflict: 'id' })
            .select();

          if (upsertErr) {
            console.warn('Profile auto-create (upsert) error:', JSON.stringify(upsertErr, null, 2));
            // If permission denied, show clear console guidance
            if (upsertErr?.code === '42501') {
              console.error('Permission denied for profiles table (42501). Ensure RLS policies allow inserts by auth.uid() = id.');
            }
            setProfile({ username: '' });
            setInputValue('');
          } else {
            const row = Array.isArray(upsertData) ? upsertData[0] : upsertData;
            setProfile(row || { username: '' });
            setInputValue(row?.username || '');
          }
        }
      } catch (err) {
        console.error('Unexpected error loading profile:', err);
        setProfile({ username: '' });
        setInputValue('');
      } finally {
        if (mounted) setLoading(false);
      }
    };

    loadProfile();
    return () => { mounted = false; };
  }, []);

  const saveUsername = async () => {
    try {
      const { data: authData } = await supabase.auth.getUser();
      const user = authData?.user ?? null;
      if (!user) return alert('You must be logged in.');

      const newUsername = (inputValue || '').trim();
      if (!newUsername) return alert('Username cannot be empty.');

      setLoading(true);

      const { data, error } = await supabase
        .from('profiles')
        .upsert({ id: user.id, username: newUsername }, { onConflict: 'id' })
        .select();

      setLoading(false);

      if (error) {
        // log full error for debugging
        console.error('Profile upsert error:', JSON.stringify(error, null, 2));
        if (error.code === '42501') {
          alert('Permission denied updating profiles (42501). Run the RLS policies allowing auth.uid() = id, or grant appropriate permissions.');
          return;
        }
        if (error.code === '23505') {
          alert('That username is already taken.');
          return;
        }
        alert('Could not update username. See console for details.');
        return;
      }

      const row = Array.isArray(data) ? data[0] : data;
      setProfile(row || { username: newUsername });
      setEditing(false);
      if (typeof onUpdated === 'function') onUpdated({ username: newUsername });
    } catch (err) {
      setLoading(false);
      console.error('Unexpected error saving username:', err);
      alert('Could not update username. See console for details.');
    }
  };

  return (
    <div className="modal-overlay" role="dialog" aria-modal="true" aria-label="User profile">
      <div className="modal-panel">
        <button className="modal-close" onClick={onClose} aria-label="Close profile">&times;</button>

        <div className="profile-modal-body">
          <div className="profile-modal-avatar">
            <span className="letter-avatar-large">{(profile.username || 'U')[0]?.toUpperCase()}</span>
          </div>

          <div className="profile-modal-info">
            <h2 className="profile-modal-name">{profile.username || 'User'}</h2>

            {!editing ? (
              <div className="profile-modal-actions">
                <button
                  className="btn"
                  onClick={() => { setEditing(true); setInputValue(profile.username || ''); }}
                >
                  Edit Username
                </button>
                <button className="btn btn-outline" onClick={onClose}>Close</button>
              </div>
            ) : (
              <>
                <label className="sr-only" htmlFor="username-input">Username</label>
                <input
                  id="username-input"
                  value={inputValue}
                  onChange={(e) => setInputValue(e.target.value)}
                  placeholder="Enter username"
                />
                <div className="profile-modal-actions">
                  <button className="btn" onClick={saveUsername} disabled={loading}>
                    {loading ? 'Saving…' : 'Save'}
                  </button>
                  <button className="btn btn-outline" onClick={() => setEditing(false)}>Cancel</button>
                </div>
              </>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default UserProfile;
