/**
 * AvatarSelector.jsx
 * Floating button + dropdown to switch between available avatars.
 * Selection is persisted via AvatarManager (localStorage).
 */
import React, { useState, useRef, useEffect } from 'react';
import { useAvatarManager } from './AvatarManager';

export function AvatarSelector() {
  const { currentAvatar, setAvatarId, avatarList } = useAvatarManager();
  const [open, setOpen] = useState(false);
  const dropdownRef = useRef(null);

  // Close dropdown when clicking outside
  useEffect(() => {
    const handler = (e) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target)) {
        setOpen(false);
      }
    };
    if (open) document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, [open]);

  if (avatarList.length <= 1) return null; // hide if only one avatar

  return (
    <div className="avatar-selector" ref={dropdownRef}>
      <button
        className="avatar-selector-btn"
        onClick={() => setOpen((p) => !p)}
        title="Avatarni almashtirish"
      >
        <span className="avatar-selector-emoji">{currentAvatar.emoji}</span>
        <span className="avatar-selector-name">{currentAvatar.name}</span>
        <span className="avatar-selector-arrow">{open ? '▲' : '▼'}</span>
      </button>

      {open && (
        <div className="avatar-dropdown">
          {avatarList.map((av) => (
            <button
              key={av.id}
              className={`avatar-dropdown-item ${av.id === currentAvatar.id ? 'active' : ''}`}
              onClick={() => {
                setAvatarId(av.id);
                setOpen(false);
              }}
            >
              <span className="avatar-dropdown-emoji">{av.emoji}</span>
              <span className="avatar-dropdown-label">{av.name}</span>
              {av.id === currentAvatar.id && <span className="avatar-dropdown-check">✓</span>}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
