import React from 'react';

export default function CallModal({ contact, onClose }) {
  if (!contact) return null;

  return (
    <div style={{
      position: 'fixed', inset: 0, zIndex: 100,
      background: 'rgba(5,8,16,0.92)',
      display: 'flex', alignItems: 'center', justifyContent: 'center',
      animation: 'fadeUp 0.3s ease forwards',
    }}>
      <div style={{
        background: 'var(--bg-card)',
        border: '0.5px solid var(--blue-dim)',
        borderRadius: 20,
        padding: '32px 28px',
        width: '80%',
        maxWidth: 280,
        textAlign: 'center',
        boxShadow: '0 0 40px var(--blue-glow)',
      }}>
        {/* Avatar */}
        <div style={{
          width: 64, height: 64, borderRadius: '50%',
          background: 'var(--bg-secondary)',
          border: '2px solid var(--blue-dim)',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          margin: '0 auto 14px',
          fontSize: 28,
        }}>📞</div>

        <p style={{ fontSize: 11, color: 'var(--text-muted)', letterSpacing: 1, marginBottom: 6, fontFamily: 'var(--font-mono)' }}>
          CONNECTING
        </p>
        <h2 style={{ fontSize: 22, fontWeight: 600, color: 'var(--text-primary)', marginBottom: 4 }}>
          {contact.real_name || contact.nickname}
        </h2>
        <p style={{ fontSize: 13, color: 'var(--text-secondary)', marginBottom: 28 }}>
          {contact.phone}
        </p>

        {/* Call button */}
        <a
          href={`tel:${contact.phone}`}
          style={{
            display: 'block',
            background: '#1a6a30',
            border: '1px solid #2a9a45',
            borderRadius: 14,
            padding: '13px 0',
            color: '#4adf9f',
            fontFamily: 'var(--font-ui)',
            fontSize: 15,
            fontWeight: 600,
            textDecoration: 'none',
            marginBottom: 10,
            boxShadow: '0 0 16px rgba(74,223,159,0.2)',
          }}
        >
          📞 Call Now
        </a>

        <button
          onClick={onClose}
          style={{
            display: 'block', width: '100%',
            background: 'transparent',
            border: '0.5px solid var(--border-light)',
            borderRadius: 14,
            padding: '11px 0',
            color: 'var(--text-secondary)',
            fontSize: 14,
            cursor: 'pointer',
            fontFamily: 'var(--font-ui)',
          }}
        >
          Cancel
        </button>
      </div>
    </div>
  );
}
