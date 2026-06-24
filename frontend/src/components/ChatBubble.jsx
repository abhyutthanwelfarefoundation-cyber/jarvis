import React from 'react';

export default function ChatBubble({ message }) {
  const { role, content, language, time, searchUsed } = message;
  const isUser = role === 'user';
  const isHindi = language === 'hi';

  const timeStr = time
    ? new Date(time).toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' })
    : '';

  return (
    <div style={{
      display: 'flex',
      flexDirection: 'column',
      alignItems: isUser ? 'flex-end' : 'flex-start',
      animation: 'fadeUp 0.25s ease forwards',
      marginBottom: 2,
    }}>
      <div style={{
        maxWidth: '85%',
        padding: '8px 12px',
        borderRadius: isUser ? '14px 14px 4px 14px' : '14px 14px 14px 4px',
        background: isUser ? 'var(--bg-card)' : 'var(--bg-secondary)',
        border: isUser ? '0.5px solid var(--blue-dim)' : '0.5px solid var(--border-light)',
        color: isUser ? '#8abcff' : 'var(--text-primary)',
        fontSize: 13,
        fontFamily: isHindi ? 'var(--font-hi)' : 'var(--font-ui)',
        lineHeight: 1.55,
        whiteSpace: 'pre-wrap',
        wordBreak: 'break-word',
        userSelect: 'text',
        WebkitUserSelect: 'text',
      }}>
        {content}
      </div>

      {/* Footer: time + web search badge */}
      <div style={{
        display: 'flex', alignItems: 'center', gap: 6,
        marginTop: 2,
        marginLeft: isUser ? 0 : 4,
        marginRight: isUser ? 4 : 0,
        flexDirection: isUser ? 'row-reverse' : 'row',
      }}>
        <span style={{
          fontSize: 9, color: 'var(--text-muted)',
          fontFamily: 'var(--font-mono)',
        }}>
          {isUser ? 'You' : 'JARVIS'} · {timeStr}
        </span>

        {/* Web search badge — shown when Jarvis used live search */}
        {searchUsed && !isUser && (
          <span style={{
            fontSize: 9,
            padding: '1px 6px',
            borderRadius: 8,
            background: 'rgba(74,223,159,0.1)',
            border: '0.5px solid var(--green-dim)',
            color: 'var(--green)',
            fontFamily: 'var(--font-mono)',
            letterSpacing: 0.3,
            display: 'flex', alignItems: 'center', gap: 3,
          }}>
            🌐 live
          </span>
        )}
      </div>
    </div>
  );
}