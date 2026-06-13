const BLOCKED_USERS_KEY = 'blocked_contacts';

export function loadBlockedUsers() {
  try {
    const raw = window.localStorage.getItem(BLOCKED_USERS_KEY);
    const parsed = raw ? JSON.parse(raw) : [];
    return Array.isArray(parsed) ? parsed : [];
  } catch (err) {
    console.error('Failed to load blocked contacts', err);
    return [];
  }
}

export function saveBlockedUsers(users) {
  try {
    window.localStorage.setItem(BLOCKED_USERS_KEY, JSON.stringify(users));
    window.dispatchEvent(new Event('blockedUsersUpdated'));
  } catch (err) {
    console.error('Failed to save blocked contacts', err);
  }
}

export function addBlockedUser(user) {
  if (!user?.id) return;
  const existing = loadBlockedUsers();
  const filtered = existing.filter(item => item.id !== user.id);
  const entry = {
    id: user.id,
    name: user.name || user.full_name || user.username || 'Unknown',
    email: user.email || user.contact_email || '',
    blockedAt: new Date().toISOString(),
  };
  saveBlockedUsers([entry, ...filtered]);
}

export function removeBlockedUser(userId) {
  if (!userId) return;
  const filtered = loadBlockedUsers().filter(item => item.id !== userId);
  saveBlockedUsers(filtered);
}

export function isUserBlocked(userId) {
  if (!userId) return false;
  return loadBlockedUsers().some(item => item.id === userId);
}
