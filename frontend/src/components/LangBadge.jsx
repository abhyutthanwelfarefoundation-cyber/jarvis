import React from 'react';

export default function LangBadge({ lang = 'en' }) {
  const isHi = lang === 'hi';
  return (
    <span style={{
      fontSize: 10,
      fontWeight: 600,
      padding: '2px 9px',
      borderRadius: 12,
      background: isHi ? 'var(--orange-glow)' : 'var(--blue-glow)',
      color: isHi ? 'var(--orange)' : 'var(--blue)',
      border: `0.5px solid ${isHi ? 'var(--orange-dim)' : 'var(--blue-dim)'}`,
      fontFamily: 'var(--font-mono)',
      letterSpacing: 1,
      transition: 'all 0.3s ease',
    }}>
      {isHi ? 'HI' : 'EN'}
    </span>
  );
}
