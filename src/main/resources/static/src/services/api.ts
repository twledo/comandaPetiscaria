import axios from 'axios';

const api = axios.create({
    baseURL: 'http://localhost:8080/api',
    headers: { 'Content-Type': 'application/json' },
});

// Request interceptor — attach any future auth token here
api.interceptors.request.use((config) => config);

// Response interceptor — normalise errors
api.interceptors.response.use(
  (res) => res,
  (err) => {
    const msg =
      err?.response?.data?.message ??
      err?.message ??
      'Erro de comunicação com o servidor';
    return Promise.reject(new Error(msg));
  },
);

export default api;
