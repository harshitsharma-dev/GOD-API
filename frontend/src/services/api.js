/* ═══════════════════════════════════════════════════════════════════════════
   GOD API — API Service Layer
   Centralized HTTP client with JWT auth
   ═══════════════════════════════════════════════════════════════════════════ */

const API_BASE = '/api';

/**
 * Core fetch wrapper with auth headers and error handling
 */
async function request(endpoint, options = {}) {
  const token = localStorage.getItem('god_token');
  
  const config = {
    ...options,
    headers: {
      'Content-Type': 'application/json',
      ...(token && { Authorization: `Bearer ${token}` }),
      ...options.headers,
    },
  };

  const response = await fetch(`${API_BASE}${endpoint}`, config);
  const data = await response.json().catch(() => null);

  if (!response.ok) {
    const error = new Error(data?.error || data?.message || `HTTP ${response.status}`);
    error.status = response.status;
    error.data = data;
    throw error;
  }

  return data;
}

/* ── Auth API ─────────────────────────────────────────────────────────────── */
export const authAPI = {
  signup: (name, email, password) =>
    request('/auth/signup', {
      method: 'POST',
      body: JSON.stringify({ name, email, password }),
    }),

  login: (email, password) =>
    request('/auth/login', {
      method: 'POST',
      body: JSON.stringify({ email, password }),
    }),

  me: () => request('/auth/me'),
};

/* ── Dashboard API ────────────────────────────────────────────────────────── */
export const dashboardAPI = {
  getData: () => request('/dashboard'),

  rotateKey: () =>
    request('/dashboard/rotate', { method: 'POST' }),
};

/* ── Gateway API (AI Chat) ────────────────────────────────────────────────── */
export const gatewayAPI = {
  chat: (message, provider = null) => {
    const apiKey = localStorage.getItem('god_api_key');
    return request('/v1/ai/chat', {
      method: 'POST',
      headers: {
        ...(apiKey && { 'X-GOD-API-Key': apiKey }),
      },
      body: JSON.stringify({
        message,
        ...(provider && { provider }),
      }),
    });
  },

  chatWithProvider: (message, provider) => {
    const apiKey = localStorage.getItem('god_api_key');
    return request(`/v1/${provider}/chat`, {
      method: 'POST',
      headers: {
        ...(apiKey && { 'X-GOD-API-Key': apiKey }),
      },
      body: JSON.stringify({ message }),
    });
  },
};

/* ── Discovery API ────────────────────────────────────────────────────────── */
export const discoveryAPI = {
  health: () => request('/discovery/health'),
  listProviders: () => request('/discovery/providers'),
  getProvider: (name) => request(`/discovery/providers/${name}`),
  getProviderTools: (name) => request(`/discovery/providers/${name}/tools`),
  getUsage: (days = 7) => request(`/discovery/usage?days=${days}`),
};

export default request;
