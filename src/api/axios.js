import axios from 'axios';

// accessToken is no longer managed manually for browsers; handled via httpOnly cookies

const api = axios.create({
  baseURL: import.meta.env.VITE_API_URL || 'http://localhost:5000/api/v1',
  withCredentials: true,
  headers: {
    'Content-Type': 'application/json'
  }
});

// Request interceptor to attach CSRF tokens (Authorization now handled by cookies)
api.interceptors.request.use((config) => {
  const getCookie = (name) => {
    const value = `; ${document.cookie}`;
    const parts = value.split(`; ${name}=`);
    if (parts.length === 2) return parts.pop().split(';').shift();
    return null;
  };
  
  const csrfToken = getCookie('csrf-token');
  if (csrfToken) {
    config.headers['X-CSRF-Token'] = csrfToken;
  }
  
  return config;
}, (error) => {
  return Promise.reject(error);
});

let isRefreshing = false;
let failedQueue = [];

const processQueue = (error, token = null) => {
  failedQueue.forEach(prom => {
    if (error) {
      prom.reject(error);
    } else {
      prom.resolve(token);
    }
  });
  failedQueue = [];
};

api.interceptors.response.use((response) => {
  // Return only the data portion of our standardized API response
  if (response.data && response.data.success) {
    return { ...response, data: response.data.data };
  }
  return response;
}, async (error) => {
  const originalRequest = error.config;
  const authPathRegex = /auth\/(login|register|logout|refresh|forgot-password|verify-email)/;
  const isAuthPath = authPathRegex.test(originalRequest.url);

  if (error.response && error.response.status === 401 && !originalRequest._retry && !isAuthPath) {
    if (isRefreshing) {
      return new Promise(function(resolve, reject) {
        failedQueue.push({ resolve, reject });
      }).then((token) => {
        originalRequest.headers.Authorization = `Bearer ${token}`;
        return api(originalRequest);
      }).catch(err => {
        return Promise.reject(err);
      });
    }

    originalRequest._retry = true;
    isRefreshing = true;

    try {
      // Cookies are handled automatically by the browser
      await api.post('/auth/refresh');
      processQueue(null);
      return api(originalRequest);
    } catch (err) {
      processQueue(err, null);
      if (!['/login', '/register'].includes(window.location.pathname)) {
        console.warn('Session expired completely. Please log in again.');
        window.location.href = '/login';
      }
      return Promise.reject(err);
    } finally {
      isRefreshing = false;
    }
  }

  return Promise.reject(error);
});

export default api;
