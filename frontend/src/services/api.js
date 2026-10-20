// ============================================================================
// Axios HTTP Client with JWT Interceptor
// ============================================================================

import axios from 'axios';

const api = axios.create({
  baseURL: '/api',
  timeout: 10000
});

// Request interceptor: attach token
api.interceptors.request.use((config) => {
  const token = localStorage.getItem('hostelhub_token');
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
}, (error) => {
  return Promise.reject(error);
});

// Response interceptor: handle 401
api.interceptors.response.use((response) => {
  return response;
}, (error) => {
  if (error.response && error.response.status === 401) {
    // If not already on login page, redirect
    if (window.location.pathname !== '/login') {
      localStorage.removeItem('hostelhub_token');
      localStorage.removeItem('hostelhub_user');
      window.location.href = '/login';
    }
  }
  return Promise.reject(error);
});

export default api;

