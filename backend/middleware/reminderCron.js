import cron from 'node-cron';
import webpush from 'web-push';
import { supabase } from '../db/supabase.js';
import dotenv from 'dotenv';
dotenv.config();

webpush.setVapidDetails(
  process.env.VAPID_EMAIL || 'mailto:jarvis@jarvis.app',
  process.env.VAPID_PUBLIC_KEY || '',
  process.env.VAPID_PRIVATE_KEY || ''
);

export function startReminderCron() {
  cron.schedule('* * * * *', async () => {
    try {
      const now = new Date();
      const fiveMinLater = new Date(now.getTime() + 5 * 60 * 1000);

      const { data: dueTasks } = await supabase
        .from('tasks')
        .select('*')
        .eq('completed', false)
        .eq('notified', false)
        .lte('reminder_at', fiveMinLater.toISOString())
        .gte('reminder_at', now.toISOString());

      if (!dueTasks || dueTasks.length === 0) return;

      const { data: subs } = await supabase
        .from('push_subscriptions')
        .select('subscription')
        .eq('user_id', 'naman');

      if (!subs || subs.length === 0) return;

      for (const task of dueTasks) {
        const payload = JSON.stringify({
          title: 'Jarvis Reminder',
          body: `Sir, your task is due: ${task.title}`,
          url: '/tasks'
        });

        await Promise.allSettled(
          subs.map(row => webpush.sendNotification(row.subscription, payload))
        );

        await supabase.from('tasks').update({ notified: true }).eq('id', task.id);
        console.log(`Reminder sent for task: ${task.title}`);
      }
    } catch (err) {
      console.error('Reminder cron error:', err.message);
    }
  });

  console.log('Jarvis reminder system activated.');
}
