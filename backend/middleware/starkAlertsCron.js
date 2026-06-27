// backend/middleware/starkAlertsCron.js
// Checks projects every hour and sends Telegram alerts for overdue/due-soon projects

export function startStarkAlertsCron(supabase) {
  const BACKEND_URL = process.env.BACKEND_URL || 'http://localhost:5001';
  const alreadyAlerted = new Set(); // prevent duplicate alerts same day

  const checkDeadlines = async () => {
    try {
      const { data: projects } = await supabase
        .from('projects')
        .select('*')
        .eq('user_id', 'naman')
        .not('status', 'eq', 'Completed')
        .not('status', 'eq', 'Cancelled')
        .not('deadline', 'is', null);

      if (!projects?.length) return;

      const now = new Date();
      const todayKey = now.toDateString();
      const alerts = [];

      for (const p of projects) {
        const deadline = new Date(p.deadline);
        const daysLeft = Math.ceil((deadline - now) / (1000 * 60 * 60 * 24));
        const alertKey = `${p.id}-${todayKey}-${daysLeft}`;

        if (alreadyAlerted.has(alertKey)) continue;

        if (daysLeft < 0) {
          // Overdue
          alerts.push({
            project: p,
            daysLeft,
            type: 'overdue',
            msg: `🚨 <b>STARK — PROJECT OVERDUE</b>\n\n📁 <b>${p.name}</b>\n⏰ Was due: ${deadline.toLocaleDateString('en-IN')}\n📅 Overdue by: ${Math.abs(daysLeft)} day${Math.abs(daysLeft) > 1 ? 's' : ''}\n📈 Progress: ${p.progress || 0}%\n📌 Status: ${p.status}`,
          });
          alreadyAlerted.add(alertKey);
        } else if (daysLeft === 0) {
          // Due today
          alerts.push({
            project: p,
            daysLeft,
            type: 'today',
            msg: `⚡ <b>STARK — DUE TODAY</b>\n\n📁 <b>${p.name}</b>\n⏰ Deadline: TODAY\n📈 Progress: ${p.progress || 0}%\n📌 Status: ${p.status}`,
          });
          alreadyAlerted.add(alertKey);
        } else if (daysLeft === 1) {
          // Due tomorrow
          alerts.push({
            project: p,
            daysLeft,
            type: 'tomorrow',
            msg: `⚠️ <b>STARK — DUE TOMORROW</b>\n\n📁 <b>${p.name}</b>\n⏰ Deadline: Tomorrow\n📈 Progress: ${p.progress || 0}%\n📌 Status: ${p.status}`,
          });
          alreadyAlerted.add(alertKey);
        } else if (daysLeft === 3) {
          // Due in 3 days
          alerts.push({
            project: p,
            daysLeft,
            type: '3days',
            msg: `📋 <b>STARK — 3 DAYS LEFT</b>\n\n📁 <b>${p.name}</b>\n⏰ Due in: 3 days (${deadline.toLocaleDateString('en-IN')})\n📈 Progress: ${p.progress || 0}%\n📌 Status: ${p.status}`,
          });
          alreadyAlerted.add(alertKey);
        } else if (daysLeft === 7) {
          // Due in 1 week
          alerts.push({
            project: p,
            daysLeft,
            type: '7days',
            msg: `📅 <b>STARK — 1 WEEK LEFT</b>\n\n📁 <b>${p.name}</b>\n⏰ Due in: 7 days (${deadline.toLocaleDateString('en-IN')})\n📈 Progress: ${p.progress || 0}%\n📌 Status: ${p.status}`,
          });
          alreadyAlerted.add(alertKey);
        }
      }

      // Send all alerts
      for (const alert of alerts) {
        const fullMsg = alert.msg + `\n\n<i>${now.toLocaleString('en-IN', { timeZone: 'Asia/Kolkata' })}</i>`;
        try {
          await fetch(`${BACKEND_URL}/api/telegram/notify`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ message: fullMsg, agent: 'STARK' }),
          });
          console.log(`[STARK Alerts] Sent ${alert.type} alert for: ${alert.project.name}`);
          await new Promise(r => setTimeout(r, 500)); // avoid Telegram rate limit
        } catch (e) {
          console.log('[STARK Alerts] Telegram error:', e.message);
        }
      }

      if (alerts.length > 0) {
        console.log(`[STARK Alerts] Sent ${alerts.length} deadline alert(s)`);
      }
    } catch (e) {
      console.error('[STARK Alerts] Check error:', e.message);
    }
  };

  // Run every hour
  setInterval(checkDeadlines, 60 * 60 * 1000);
  // Also run 2 mins after server start
  setTimeout(checkDeadlines, 2 * 60 * 1000);
  console.log('[STARK Alerts] Deadline monitoring active — checking every hour');
}