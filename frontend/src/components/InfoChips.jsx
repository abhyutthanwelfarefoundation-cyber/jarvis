import React from 'react';

export default function InfoChips({ weather, tasks }) {
  const nextTask = tasks?.find(t => !t.completed);
  const nextTime = nextTask?.scheduled_at
    ? new Date(nextTask.scheduled_at).toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' })
    : '--';

  return (
    <div style={{
      display: 'flex', gap: 8, padding: '0 16px 12px',
    }}>
      {[
        { val: weather ? `${weather.temp}°C` : '--', lbl: weather?.city || 'Weather' },
        { val: tasks?.filter(t => !t.completed).length ?? '--', lbl: 'Tasks' },
        { val: nextTime, lbl: 'Next task' },
      ].map(({ val, lbl }) => (
        <div key={lbl} style={{
          flex: 1,
          background: 'var(--bg-card)',
          border: '0.5px solid var(--border-light)',
          borderRadius: 10,
          padding: '8px 6px',
          textAlign: 'center',
        }}>
          <div style={{ fontSize: 15, fontWeight: 600, color: 'var(--blue)', fontFamily: 'var(--font-mono)' }}>
            {val}
          </div>
          <div style={{ fontSize: 9, color: 'var(--text-muted)', marginTop: 2, letterSpacing: 0.5, textTransform: 'uppercase' }}>
            {lbl}
          </div>
        </div>
      ))}
    </div>
  );
}
