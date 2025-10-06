import axios from 'axios';

const api = axios.create({
  baseURL: 'http://localhost:5000/api', // Your backend API URL
  withCredentials: true,
  headers: {
    'Content-Type': 'application/json',
  },
});

export default api;
