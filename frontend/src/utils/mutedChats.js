const MUTED_CHATS_KEY = 'muted_chats';

export function loadMutedChats() {
  try {
    const raw = window.localStorage.getItem(MUTED_CHATS_KEY);
    const parsed = raw ? JSON.parse(raw) : [];
    return Array.isArray(parsed) ? parsed : [];
  } catch (err) {
    console.error('Failed to load muted chats', err);
    return [];
  }
}

export function saveMutedChats(chatIds) {
  try {
    window.localStorage.setItem(MUTED_CHATS_KEY, JSON.stringify(chatIds));
    window.dispatchEvent(new Event('mutedChatsUpdated'));
  } catch (err) {
    console.error('Failed to save muted chats', err);
  }
}

export function isChatMuted(chatId) {
  if (!chatId) return false;
  return loadMutedChats().includes(chatId);
}

export function toggleMutedChat(chatId) {
  if (!chatId) return [];
  const muted = loadMutedChats();
  const next = muted.includes(chatId)
    ? muted.filter(id => id !== chatId)
    : [...muted, chatId];
  saveMutedChats(next);
  return next;
}
