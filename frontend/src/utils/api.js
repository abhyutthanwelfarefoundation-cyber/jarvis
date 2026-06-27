// frontend/src/utils/api.js
// Centralized API caller with retry + better error messages in Hindi/English

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:5001';
const MAX_RETRIES = 2;
const TIMEOUT_MS = 30000; // 30 seconds

export async function apiCall(endpoint, options = {}, retries = MAX_RETRIES) {
  const url = `${API_URL}${endpoint}`;
  
  try {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), TIMEOUT_MS);

    const response = await fetch(url, {
      ...options,
      signal: controller.signal,
      headers: {
        'Content-Type': 'application/json',
        ...options.headers,
      },
    });

    clearTimeout(timeout);

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      throw new Error(errorData.error || errorData.message || `HTTP ${response.status}`);
    }

    return await response.json();
  } catch (error) {
    if (error.name === 'AbortError') {
      throw new Error('Request timed out — backend may be waking up, please try again');
    }

    // Retry on network errors
    if (retries > 0 && (error.message.includes('fetch') || error.message.includes('network'))) {
      console.log(`[API] Retrying ${endpoint}... (${retries} left)`);
      await new Promise(r => setTimeout(r, 1500));
      return apiCall(endpoint, options, retries - 1);
    }

    throw error;
  }
}

// Friendly error messages
export function getErrorMessage(error, lang = 'en') {
  const msg = error?.message || '';

  if (msg.includes('timed out') || msg.includes('waking')) {
    return lang === 'hi'
      ? 'Sir, backend जाग रहा है। 30 seconds में retry करें।'
      : 'Backend is waking up sir. Please try again in 30 seconds.';
  }
  if (msg.includes('fetch') || msg.includes('network') || msg.includes('Failed')) {
    return lang === 'hi'
      ? 'Sir, network error है। Internet check करें।'
      : 'Network error sir. Please check your connection.';
  }
  if (msg.includes('500')) {
    return lang === 'hi'
      ? 'Sir, server error आई। थोड़ी देर में retry करें।'
      : 'Server error sir. Please try again shortly.';
  }
  return lang === 'hi' ? 'Sir, error आई। दोबारा try करें।' : 'Something went wrong sir. Please try again.';
}