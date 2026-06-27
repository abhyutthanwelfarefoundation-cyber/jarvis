// backend/middleware/zeusCron.js
// Auto-scans Upwork every 6 hours

export function startZeusCron() {
  const BACKEND_URL = process.env.BACKEND_URL || 'http://localhost:5001';
  let lastScan = null;

  const scan = async () => {
    const now = new Date();
    const istHour = new Date(now.toLocaleString('en-US', { timeZone: 'Asia/Kolkata' })).getHours();
    // Scan at 8am, 2pm, 8pm IST
    const scanHours = [8, 14, 20];
    if (!scanHours.includes(istHour)) return;
    // Don't scan twice in same hour
    const hourKey = `${now.toDateString()}-${istHour}`;
    if (lastScan === hourKey) return;
    lastScan = hourKey;

    console.log('[ZEUS Cron] Starting auto scan at', istHour + ':00 IST');
    try {
      await fetch(`${BACKEND_URL}/api/zeus/scan`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ lang: 'en' }),
      });
      console.log('[ZEUS Cron] Scan complete');
    } catch (e) {
      console.log('[ZEUS Cron] Scan failed:', e.message);
    }
  };

  setInterval(scan, 60 * 1000); // check every minute
  console.log('[ZEUS Cron] Auto-scan scheduled at 8am, 2pm, 8pm IST');
}