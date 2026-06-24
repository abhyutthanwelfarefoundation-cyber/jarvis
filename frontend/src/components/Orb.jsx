import React, { useEffect, useRef } from 'react';

const AGENT_THEMES = {
  jarvis:  { primary: '#00d4ff', secondary: '#0088cc', glow: 'rgba(0,212,255,0.4)'  },
  friday:  { primary: '#00ff88', secondary: '#00aa55', glow: 'rgba(0,255,136,0.4)'  },
  harold:  { primary: '#ff8800', secondary: '#cc5500', glow: 'rgba(255,136,0,0.4)'  },
  zeus:    { primary: '#aa55ff', secondary: '#7722cc', glow: 'rgba(170,85,255,0.4)' },
  stark:   { primary: '#ff3355', secondary: '#cc1133', glow: 'rgba(255,51,85,0.4)'  },
  default: { primary: '#00d4ff', secondary: '#0088cc', glow: 'rgba(0,212,255,0.4)'  },
};

const STATUS_CONFIG = {
  idle:      { rings: 1, speed: 8,  pulseIntensity: 0.6 },
  listening: { rings: 3, speed: 2,  pulseIntensity: 1.0 },
  thinking:  { rings: 2, speed: 4,  pulseIntensity: 0.8 },
  speaking:  { rings: 3, speed: 1.5,pulseIntensity: 1.0 },
  research:  { rings: 2, speed: 3,  pulseIntensity: 0.9 },
};

export default function HudOrb({ status = 'idle', agent = 'jarvis', size = 120 }) {
  const theme = AGENT_THEMES[agent] || AGENT_THEMES.default;
  const config = STATUS_CONFIG[status] || STATUS_CONFIG.idle;
  const isActive = status === 'listening' || status === 'speaking';
  const isThinking = status === 'thinking';

  const r = size / 2;
  const segments = 24;

  return (
    <div style={{
      position: 'relative',
      width: size, height: size,
      display: 'flex', alignItems: 'center', justifyContent: 'center',
    }}>

      {/* Outer glow when active */}
      {isActive && (
        <div style={{
          position: 'absolute',
          width: size * 1.5, height: size * 1.5,
          borderRadius: '50%',
          background: `radial-gradient(circle, ${theme.glow} 0%, transparent 65%)`,
          animation: 'hud-pulse 1s ease-in-out infinite',
          pointerEvents: 'none',
        }} />
      )}

      {/* Ring 1 — outer segmented ring */}
      <div style={{
        position: 'absolute',
        width: size, height: size,
        borderRadius: '50%',
        animation: `hud-rotate ${config.speed * 1.5}s linear infinite`,
      }}>
        {Array.from({ length: segments }).map((_, i) => (
          <div key={i} style={{
            position: 'absolute',
            top: '50%', left: '50%',
            width: i % 3 === 0 ? 6 : 3,
            height: 1.5,
            background: i % 6 === 0 ? theme.primary : theme.secondary,
            opacity: isActive ? (i % 3 === 0 ? 0.9 : 0.4) : 0.25,
            transformOrigin: `${-(r - 3)}px 0`,
            transform: `rotate(${(i / segments) * 360}deg) translateX(${-(r - 3)}px)`,
            transition: 'opacity 0.3s ease',
          }} />
        ))}
      </div>

      {/* Ring 2 — dashed arc */}
      <div style={{
        position: 'absolute',
        width: size * 0.82, height: size * 0.82,
        borderRadius: '50%',
        border: `1px dashed ${theme.primary}`,
        opacity: isActive ? 0.5 : 0.15,
        animation: `hud-rotate-rev ${config.speed * 2}s linear infinite`,
        transition: 'opacity 0.3s ease',
      }} />

      {/* Ring 3 — solid thin */}
      <div style={{
        position: 'absolute',
        width: size * 0.68, height: size * 0.68,
        borderRadius: '50%',
        border: `1.5px solid ${theme.primary}`,
        opacity: isActive ? 0.7 : 0.2,
        animation: isThinking ? `hud-rotate ${config.speed}s linear infinite` : 'none',
        boxShadow: isActive ? `0 0 12px ${theme.glow}, inset 0 0 12px ${theme.glow}` : 'none',
        transition: 'all 0.4s ease',
      }} />

      {/* Corner ticks on ring 3 */}
      {[0, 90, 180, 270].map(deg => (
        <div key={deg} style={{
          position: 'absolute',
          width: size * 0.68, height: size * 0.68,
          borderRadius: '50%',
          border: '2px solid transparent',
          borderTopColor: theme.primary,
          opacity: isActive ? 0.8 : 0.3,
          transform: `rotate(${deg}deg)`,
          transition: 'opacity 0.3s ease',
        }} />
      ))}

      {/* Core — arc reactor */}
      <div style={{
        width: size * 0.46, height: size * 0.46,
        borderRadius: '50%',
        background: `radial-gradient(circle at 40% 35%, ${theme.secondary}22, #020408 70%)`,
        border: `2px solid ${theme.primary}`,
        boxShadow: `0 0 ${isActive ? 24 : 8}px ${theme.glow}, inset 0 0 ${isActive ? 16 : 6}px ${theme.glow}`,
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        position: 'relative', zIndex: 2,
        animation: isActive ? 'hud-glow-pulse 1s ease-in-out infinite' : 'none',
        transition: 'all 0.4s ease',
      }}>
        {/* Inner hex pattern */}
        <div style={{
          width: size * 0.28, height: size * 0.28,
          borderRadius: '50%',
          border: `1px solid ${theme.primary}`,
          opacity: 0.6,
          display: 'flex', alignItems: 'center', justifyContent: 'center',
        }}>
          <span style={{
            fontFamily: 'var(--font-hud)',
            fontSize: size * 0.13,
            fontWeight: 700,
            color: theme.primary,
            letterSpacing: 1,
            textShadow: `0 0 10px ${theme.glow}`,
          }}>
            {agent === 'jarvis' ? 'J' :
             agent === 'friday' ? 'F' :
             agent === 'harold' ? 'H' :
             agent === 'zeus'   ? 'Z' :
             agent === 'stark'  ? 'S' : 'J'}
          </span>
        </div>
      </div>
    </div>
  );
}