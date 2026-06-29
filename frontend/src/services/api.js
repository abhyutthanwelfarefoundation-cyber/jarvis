import axios from 'axios';

// Always use the Render backend URL from environment variable
const getBaseURL = () => {
  // In production (Vercel), use the env variable
  if (import.meta.env.VITE_API_URL) {
    return import.meta.env.VITE_API_URL;
  }
  // In local dev, use localhost
  return 'http://localhost:5001';
};

const API = axios.create({
  baseURL: getBaseURL(),
  timeout: 30000,
});

// ── Jarvis AI ──────────────────────────────────────────────
export const chatWithJarvis = (message, history, context) =>
  API.post('/api/jarvis/chat', { message, history, context }).then(r => r.data);

export const getGreeting = (weather, tasks, lang) =>
  API.post('/api/jarvis/greet', { weather, tasks, lang }).then(r => r.data);

export const doResearch = (topic, lang) =>
  API.post('/api/jarvis/research', { topic, lang }).then(r => r.data);

// ── Tasks ──────────────────────────────────────────────────
export const getTodayTasks = () =>
  API.get('/api/tasks/today').then(r => r.data);

export const getUpcomingTasks = () =>
  API.get('/api/tasks/upcoming').then(r => r.data);

export const createTask = (title, scheduled_at, reminder_at) =>
  API.post('/api/tasks', { title, scheduled_at, reminder_at }).then(r => r.data);

export const completeTask = (id) =>
  API.patch(`/api/tasks/${id}/complete`).then(r => r.data);

export const deleteTask = (id) =>
  API.delete(`/api/tasks/${id}`).then(r => r.data);

// ── Weather ────────────────────────────────────────────────
export const getWeather = (city = 'Raipur') =>
  API.get(`/api/weather?city=${city}`).then(r => r.data);

// ── Contacts ───────────────────────────────────────────────
export const getContacts = () =>
  API.get('/api/contacts').then(r => r.data);

export const findContact = (nickname) =>
  API.get(`/api/contacts/find/${nickname}`).then(r => r.data);

export const addContact = (nickname, real_name, phone) =>
  API.post('/api/contacts', { nickname, real_name, phone }).then(r => r.data);

// ── Notifications ──────────────────────────────────────────
export const subscribePush = (subscription) =>
  API.post('/api/notifications/subscribe', subscription).then(r => r.data);

// ── Memories ───────────────────────────────────────────────
export const getMemories = () =>
  API.get('/api/memories').then(r => r.data);

export const saveMemory = (content, category) =>
  API.post('/api/memories', { content, category }).then(r => r.data);

export const deleteMemory = (id) =>
  API.delete(`/api/memories/${id}`).then(r => r.data);

export default API;