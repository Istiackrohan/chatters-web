import { useContext } from 'react';
import { ProfileCacheContext } from '../contexts/ProfileCacheContextValue';

export function useProfileCache() {
  const ctx = useContext(ProfileCacheContext);
  if (!ctx) throw new Error('useProfileCache must be used within ProfileCacheProvider');
  return ctx;
}
