import axios from 'axios';

// In dev, Vite proxies /api → http://localhost:3000
// So all calls use /api prefix
const client = axios.create({
  baseURL: '/api',
  headers: { 'Content-Type': 'application/json' },
  timeout: 15000,
});

// Attach JWT automatically to every request
client.interceptors.request.use((config) => {
  const token = localStorage.getItem('god_jwt');
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

// Global 401 handler — clear token and redirect to login
client.interceptors.response.use(
  (res) => res,
  (err) => {
    if (err.response?.status === 401) {
      localStorage.removeItem('god_jwt');
      localStorage.removeItem('god_user');
      window.location.href = '/login';
    }
    return Promise.reject(err);
  }
);

export default client;
