import { createContext, useContext, useState, useCallback } from 'react';
import { api } from '../api/client';

const ProfileCacheContext = createContext(null);

export function ProfileCacheProvider({ children }) {
  const [profiles, setProfiles] = useState({});

  const getProfile = useCallback((id) => {
    if (!id) return null;
    return profiles[id] || null;
  }, [profiles]);

  const fetchProfiles = useCallback(async (ids = []) => {
    const unique = [...new Set(ids.filter(Boolean))];
    const toFetch = unique.filter(id => !profiles[id]);
    if (toFetch.length === 0) return Object.values(profiles).filter(p => unique.includes(p.id));

    try {
      // Try batch endpoint first
      let fetched = [];
      if (toFetch.length > 1) {
        fetched = await api.getUsers(toFetch);
      } else {
        const r = await Promise.all(toFetch.map(id => api.getUser(id).catch(() => null)));
        fetched = r.filter(Boolean);
      }

      if (fetched.length) {
        setProfiles(prev => {
          const next = { ...prev };
          fetched.forEach(u => {
            next[u.id] = { id: u.id, full_name: u.full_name, avatar_url: u.avatar_url, status: u.status };
          });
          return next;
        });
      }

      return fetched;
    } catch (err) {
      console.error('ProfileCache fetchProfiles error', err);
      return [];
    }
  }, [profiles]);

  const value = {
    getProfile,
    fetchProfiles,
    profiles
  };

  return (
    <ProfileCacheContext.Provider value={value}>
      {children}
    </ProfileCacheContext.Provider>
  );
}

export function useProfileCache() {
  const ctx = useContext(ProfileCacheContext);
  if (!ctx) throw new Error('useProfileCache must be used within ProfileCacheProvider');
  return ctx;
}

export default ProfileCacheContext;
