import axios from 'axios';

// Thay thế bằng địa chỉ IP của máy tính đang chạy server backend
const API_BASE_URL = 'http://10.25.192.251:3000/api';

const apiClient = axios.create({
  baseURL: API_BASE_URL,
  headers: {
    'Content-Type': 'application/json',
  },
});

export default apiClient;
