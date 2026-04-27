import axios from 'axios';

const api = axios.create({
    baseURL: 'http://localhost:8080/api'
});

// Interceptor para injetar o token em cada requisição
api.interceptors.request.use((config) => {
    const token = localStorage.getItem('@Petiscaria:Token');
    if (token) {
        config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
});

export default api;