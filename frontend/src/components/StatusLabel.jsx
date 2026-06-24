import React from 'react';

const LABELS = {
  en: {
    idle:     'Say "Hi Jarvis" to activate',
    listening:'Listening...',
    thinking: 'Processing...',
    speaking: 'Speaking...',
    research: 'Researching...',
  },
  hi: {
    idle:     '"Jarvis" बोलें activate करने के लिए',
    listening:'सुन रहा हूँ...',
    thinking: 'सोच रहा हूँ...',
    speaking: 'बोल रहा हूँ...',
    research: 'Research हो रही है...',
  }
};

const COLORS = {
  idle:     'var(--text-muted)',
  listening:'#7ac4ff',
  thinking: '#4a9eff',
  speaking: '#4adf9f',
  research: '#4adf9f',
};

export default function StatusLabel({ status = 'idle', lang = 'en' }) {
  const label = LABELS[lang]?.[status] ?? LABELS.en[status];
  return (
    <p style={{
      fontFamily: lang === 'hi' ? 'var(--font-hi)' : 'var(--font-mono)',
      fontSize: lang === 'hi' ? 12 : 11,
      color: COLORS[status],
      textAlign: 'center',
      marginTop: 6,
      minHeight: 18,
      letterSpacing: lang === 'hi' ? 0 : 1,
      transition: 'color 0.3s ease',
    }}>
      {status !== 'idle' && (
        <span style={{
          display: 'inline-block',
          width: 6, height: 6,
          borderRadius: '50%',
          background: COLORS[status],
          marginRight: 6,
          verticalAlign: 'middle',
          animation: 'blink 1s ease-in-out infinite',
        }} />
      )}
      {label}
    </p>
  );
}
