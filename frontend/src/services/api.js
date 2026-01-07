import axios from 'axios';

const API_BASE_URL = 'http://localhost:5000/api';

const api = axios.create({
    baseURL: API_BASE_URL,
    headers: {
        'Content-Type': 'application/json'
    }
});

// User APIs
export const registerUser = (userData) => api.post('/register', userData);
export const getUserDashboard = (userId) => api.get(`/dashboard/${userId}`);

// Mood APIs
export const logMood = (moodData) => api.post('/mood', moodData);
export const getInsights = (userId, days = 30) => api.get(`/insights/${userId}?days=${days}`);

// Voice APIs
export const analyzeVoice = (voiceData) => api.post('/voice/analyze', voiceData);

// Game APIs
export const saveGameSession = (sessionData) => api.post('/games/session', sessionData);

// Export API
export const exportUserData = (userId) => api.get(`/export/${userId}`);

// Health check
export const checkHealth = () => api.get('/health');

export default api;