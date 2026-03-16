import axios from 'axios';

// withCredentials ensures httpOnly cookies are sent with every request
const api = axios.create({ baseURL: '/api', withCredentials: true });

// Globally handle 401 responses: when the JWT has expired mid-session,
// redirect to the login page so the user re-authenticates rather than
// silently failing.
api.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401) {
      // Only redirect if we are not already on the login/root page to avoid loops
      if (window.location.pathname !== '/') {
        window.location.href = '/';
      }
    }
    return Promise.reject(error);
  }
);

export default api;
