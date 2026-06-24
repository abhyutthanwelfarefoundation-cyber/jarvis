import React from 'react';

export default function MicButton({ listening, onClick, lang = 'en', disabled = false }) {
  const color = lang === 'hi' ? 'var(--orange)' : 'var(--blue)';
  const glow  = lang === 'hi' ? 'var(--orange-glow)' : 'var(--blue-glow)';
  const dim   = lang === 'hi' ? 'var(--orange-dim)' : 'var(--blue-dim)';

  return (
    <button
      onClick={onClick}
      disabled={disabled}
      aria-label={listening ? 'Stop listening' : 'Start listening'}
      style={{
        width: 46,
        height: 46,
        borderRadius: '50%',
        border: `1.5px solid ${listening ? color : dim}`,
        background: listening ? `${glow}` : 'var(--bg-card)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        cursor: disabled ? 'not-allowed' : 'pointer',
        flexShrink: 0,
        transition: 'all 0.2s ease',
        boxShadow: listening ? `0 0 16px ${glow}` : 'none',
        animation: listening ? 'glow-pulse 1.2s ease-in-out infinite' : 'none',
        opacity: disabled ? 0.4 : 1,
      }}
    >
      {/* Mic icon SVG */}
      <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke={listening ? color : 'var(--text-secondary)'} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <path d="M12 1a3 3 0 0 0-3 3v8a3 3 0 0 0 6 0V4a3 3 0 0 0-3-3z"/>
        <path d="M19 10v2a7 7 0 0 1-14 0v-2"/>
        <line x1="12" y1="19" x2="12" y2="23"/>
        <line x1="8" y1="23" x2="16" y2="23"/>
      </svg>
    </button>
  );
}
