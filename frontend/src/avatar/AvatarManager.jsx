/**
 * AvatarManager.jsx
 * React Context that holds the currently selected avatar and provides
 * switching + localStorage persistence.
 */
import React, { createContext, useContext, useState, useCallback } from 'react';
import { AVATAR_LIST, DEFAULT_AVATAR_ID, LS_KEY } from './avatarConfig';

const AvatarManagerContext = createContext(null);

export function AvatarManagerProvider({ children }) {
  const [currentAvatarId, setCurrentAvatarIdState] = useState(() => {
    const saved = localStorage.getItem(LS_KEY);
    const valid = AVATAR_LIST.find((a) => a.id === saved);
    return valid ? saved : DEFAULT_AVATAR_ID;
  });

  const currentAvatar = AVATAR_LIST.find((a) => a.id === currentAvatarId) || AVATAR_LIST[0];

  const setAvatarId = useCallback((id) => {
    const valid = AVATAR_LIST.find((a) => a.id === id);
    if (!valid) return;
    localStorage.setItem(LS_KEY, id);
    setCurrentAvatarIdState(id);
  }, []);

  return (
    <AvatarManagerContext.Provider value={{ currentAvatar, currentAvatarId, setAvatarId, avatarList: AVATAR_LIST }}>
      {children}
    </AvatarManagerContext.Provider>
  );
}

export function useAvatarManager() {
  const ctx = useContext(AvatarManagerContext);
  if (!ctx) throw new Error('useAvatarManager must be used inside AvatarManagerProvider');
  return ctx;
}
