// backend/middleware/keepAlive.js
// Prevents Render free tier from sleeping — pings self every 14 mins

export function startKeepAlive() {
  const SELF_URL = process.env.RENDER_URL || process.env.BACKEND_URL;
  if (!SELF_URL || process.env.NODE_ENV !== 'production') {
    console.log('[KeepAlive] Skipping (not in production or no URL set)');
    return;
  }

  const ping = async () => {
    try {
      const r = await fetch(`${SELF_URL}/health`);
      const d = await r.json();
      console.log('[KeepAlive] Ping OK:', d.status);
    } catch (e) {
      console.log('[KeepAlive] Ping failed:', e.message);
    }
  };

  // Ping every 14 minutes (Render sleeps after 15)
  setInterval(ping, 14 * 60 * 1000);
  // First ping after 30 seconds
  setTimeout(ping, 30 * 1000);
  console.log('[KeepAlive] Active — pinging every 14 mins to prevent sleep');
}