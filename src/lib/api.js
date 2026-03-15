import axios from 'axios';

// withCredentials ensures httpOnly cookies are sent with every request
const api = axios.create({ baseURL: '/api', withCredentials: true });

export default api;
