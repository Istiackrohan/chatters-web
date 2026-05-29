import { supabase } from '../lib/supabase';

const API_BASE = (import.meta.env.VITE_API_BASE || '/api').replace(/\/$/, '');

async function request(endpoint, options = {}) {
  // Get the current session from Supabase (this is the reliable way)
  const { data: { session } } = await supabase.auth.getSession();
  const token = session?.access_token || null;

  const headers = {
    'Content-Type': 'application/json',
    ...(token && { Authorization: `Bearer ${token}` }),
    ...options.headers,
  };

  const response = await fetch(`${API_BASE}${endpoint}`, { ...options, headers });

  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.error || 'Request failed');
  }

  return response.json();
}

export const api = {
  getChats: () => request('/chats'),
  getMessages: (chatId, limit = 20, before = null) => {
    let url = `/messages/${chatId}?limit=${limit}`;
    if (before) url += `&before=${before}`;
    return request(url);
  },
  sendMessage: (chatId, content, type = 'text', mediaUrl = null) =>
    request('/messages', { method: 'POST', body: JSON.stringify({ chatId, content, type, mediaUrl }) }),
  searchUsers: (query) => request(`/users/search?q=${encodeURIComponent(query)}`),  
  getAllUsers: () => request('/users/all'),
  createDirectChat: (otherUserId) => request('/chats', { method: 'POST', body: JSON.stringify({ type: 'direct', otherUserId }) }),
};