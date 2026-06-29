// frontend/src/utils/api.js
const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:5001';

export async function apiCall(endpoint, options = {}) {
  const url = `${API_URL}${endpoint}`;
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 45000);

  try {
    const response = await fetch(url, {
      ...options,
      signal: controller.signal,
      headers: { 'Content-Type': 'application/json', ...options.headers },
    });
    clearTimeout(timeout);
    if (!response.ok) {
      const err = await response.json().catch(() => ({}));
      throw new Error(err.error || err.message || `HTTP ${response.status}`);
    }
    return await response.json();
  } catch (e) {
    clearTimeout(timeout);
    if (e.name === 'AbortError') throw new Error('timeout');
    throw e;
  }
}

export function getErrorMessage(error, lang = 'en') {
  const msg = error?.message || '';
  if (msg === 'timeout' || msg.includes('timed')) {
    return lang === 'hi'
      ? 'Sir, server respond नहीं कर रहा। 30 seconds में retry करें।'
      : 'Sir, server is slow. Please try again in 30 seconds.';
  }
  if (msg.includes('fetch') || msg.includes('network') || msg.includes('Failed')) {
    return lang === 'hi'
      ? 'Sir, network error है। Internet check करें।'
      : 'Network error sir. Please check your connection.';
  }
  return lang === 'hi' ? 'Sir, error आई। दोबारा try करें।' : 'Error occurred sir. Please try again.';
}