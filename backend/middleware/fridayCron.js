// backend/middleware/fridayCron.js
// Auto-sends FRIDAY brief every morning at 7:30 AM IST

export function startFridayCron() {
  const BACKEND_URL = process.env.BACKEND_URL || 'http://localhost:5001';

  const checkAndSend = async () => {
    const now = new Date();
    const istHour = parseInt(new Date(now.toLocaleString('en-US', { timeZone: 'Asia/Kolkata' })).getHours());
    const istMin  = parseInt(new Date(now.toLocaleString('en-US', { timeZone: 'Asia/Kolkata' })).getMinutes());

    // Fire at 7:30 AM IST
    if (istHour === 7 && istMin >= 30 && istMin < 31) {
      console.log('[FRIDAY Cron] Generating morning brief...');
      try {
        await fetch(`${BACKEND_URL}/api/friday/brief?lang=hi`);
        console.log('[FRIDAY Cron] Morning brief sent!');
      } catch (e) {
        console.log('[FRIDAY Cron] Error:', e.message);
      }
    }
  };

  // Check every minute
  setInterval(checkAndSend, 60 * 1000);
  console.log('[FRIDAY Cron] Morning brief scheduled for 7:30 AM IST');
}