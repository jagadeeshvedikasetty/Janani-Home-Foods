import axios from 'axios';

const api = axios.create({
  baseURL: process.env.REACT_APP_API_URL || 'https://janani-home-foods-server.vercel.app',
  headers: { 'Content-Type': 'application/json' },
});

export default api;
