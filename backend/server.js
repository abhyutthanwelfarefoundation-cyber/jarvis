import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import { createClient } from '@supabase/supabase-js';
import jarvisRoutes from './routes/jarvis.js';
import taskRoutes from './routes/tasks.js';
import weatherRoutes from './routes/weather.js';
import contactRoutes from './routes/contacts.js';
import notificationRoutes from './routes/notifications.js';
import memoryRoutes from './routes/memories.js';
import searchRoutes from './routes/search.js';
import fridayRoutes from './routes/friday.js';
import haroldRoutes from './routes/harold.js';
import zeusRoutes from './routes/zeus.js';
import starkRoutes from './routes/stark.js';
import telegramRouter from './routes/telegram.js';
import { startReminderCron } from './middleware/reminderCron.js';
import { startZeusCron } from './middleware/zeusCron.js';
import { startStarkAlertsCron } from './middleware/starkAlertsCron.js';
import { startKeepAlive } from './middleware/keepAlive.js';

dotenv.config();

const app = express();
const PORT = process.env.PORT || 5001;

app.use(cors({
  origin: function(origin, callback) {
    if (!origin) return callback(null, true);
    if (
      origin.endsWith('.vercel.app') ||
      origin.endsWith('.onrender.com') ||
      origin.includes('localhost')
    ) return callback(null, true);
    callback(new Error('CORS blocked'));
  },
  credentials: false,
  methods: ['GET', 'POST', 'PATCH', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization'],
}));

app.use(express.json());

export const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_ANON_KEY
);

// ── All routes ─────────────────────────────────────────
app.use('/api/jarvis',        jarvisRoutes);
app.use('/api/tasks',         taskRoutes);
app.use('/api/weather',       weatherRoutes);
app.use('/api/contacts',      contactRoutes);
app.use('/api/notifications', notificationRoutes);
app.use('/api/memories',      memoryRoutes);
app.use('/api/search',        searchRoutes);
app.use('/api/friday',        fridayRoutes);
app.use('/api/harold',        haroldRoutes);
app.use('/api/zeus',          zeusRoutes);
app.use('/api/stark',         starkRoutes);
app.use('/api/telegram',      telegramRouter);

app.get('/health', (req, res) => res.json({
  status: 'Jarvis online',
  agents: ['jarvis', 'friday', 'harold', 'zeus', 'stark'],
  time: new Date()
}));

startReminderCron();
startZeusCron();
startKeepAlive();
startStarkAlertsCron(supabase);
app.listen(PORT, '0.0.0.0', () => {
  console.log(`Jarvis backend running on port ${PORT}`);
  console.log(`All 5 agents online: JARVIS, FRIDAY, HAROLD, ZEUS, STARK`);
}).on('error', (err) => {
  if (err.code === 'EADDRINUSE') {
    console.error(`Port ${PORT} busy. Run: netstat -ano | findstr :${PORT} then taskkill /PID <id> /F`);
    process.exit(1);
  }
});