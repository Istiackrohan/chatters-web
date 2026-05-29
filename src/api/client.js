import { supabase } from '../lib/supabase';

const API_BASE = (import.meta.env.VITE_API_BASE || '/api').replace(/\/$/, '');

async function readResponseBody(response) {
  const text = await response.text();

  if (!text) {
    return null;
  }

  const contentType = response.headers.get('content-type') || '';
  const looksLikeJson = contentType.includes('application/json') || /^[{[]/.test(text.trim());

  if (!looksLikeJson) {
    return text;
  }

  try {
    return JSON.parse(text);
  } catch {
    return text;
  }
}

function getErrorMessage(response, body) {
  if (body && typeof body === 'object' && 'error' in body) {
    return body.error;
  }

  if (body && typeof body === 'object' && 'message' in body) {
    return body.message;
  }

  if (typeof body === 'string' && body.trim()) {
    return body.trim();
  }

  if (response.status === 401) {
    return 'Unauthorized. Please sign in again.';
  }

  if (response.status === 403) {
    return 'Forbidden. Your session is valid, but you do not have permission to access this resource.';
  }

  return `Request failed with status ${response.status}`;
}

async function getAccessToken() {
  const { data, error } = await supabase.auth.getSession();

  if (error) {
    throw new Error(error.message || 'Unable to read your auth session.');
  }

  const token = data.session?.access_token;

  if (!token) {
    throw new Error('You must be signed in to make this request.');
  }

  return token;
}

async function request(endpoint, options = {}) {
  const { headers: customHeaders, body, ...fetchOptions } = options;
  const token = await getAccessToken();
  const isFormData = body instanceof FormData;

  const headers = {
    ...(isFormData ? {} : { 'Content-Type': 'application/json' }),
    Authorization: `Bearer ${token}`,
    ...customHeaders,
  };

  const response = await fetch(`${API_BASE}${endpoint}`, {
    ...fetchOptions,
    body,
    headers,
  });

  const responseBody = await readResponseBody(response);

  if (!response.ok) {
    throw new Error(getErrorMessage(response, responseBody));
  }

  return responseBody;
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