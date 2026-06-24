import React from 'react';
import { useNavigate, useLocation } from 'react-router-dom';

const TABS = [
  { path: '/',         label: 'JARVIS',  icon: 'J', agent: 'jarvis', color: '#00d4ff' },
  { path: '/friday',   label: 'FRIDAY',  icon: 'F', agent: 'friday', color: '#00ff88' },
  { path: '/harold',   label: 'HAROLD',  icon: 'H', agent: 'harold', color: '#ff8800' },
  { path: '/zeus',     label: 'ZEUS',    icon: 'Z', agent: 'zeus',   color: '#aa55ff' },
  { path: '/stark',    label: 'STARK',   icon: 'S', agent: 'stark',  color: '#ff3355' },
  { path: '/tasks',    label: 'TASKS',   icon: '✓', agent: 'tasks',  color: '#00d4ff' },
  { path: '/research', label: 'SCAN',    icon: '⌖', agent: 'scan',   color: '#00d4ff' },
  { path: '/settings', label: 'CONFIG',  icon: '⚙', agent: 'config', color: '#00d4ff' },
];

export default function BottomNav() {
  const navigate = useNavigate();
  const location = useLocation();

  return (
    <nav style={{
      display: 'flex',
      flexDirection: 'row',
      justifyContent: 'space-around',
      alignItems: 'center',
      height: 60,
      background: 'rgba(2,4,8,0.97)',
      backdropFilter: 'blur(12px)',
      WebkitBackdropFilter: 'blur(12px)',
      borderTop: '0.5px solid rgba(0,212,255,0.15)',
      paddingBottom: 'env(safe-area-inset-bottom, 0px)',
      zIndex: 100,
      flexShrink: 0,
    }}
    className="bottom-nav-shell"
    >
      <style>{`
        @media (min-width: 1024px) {
          .bottom-nav-shell {
            flex-direction: column !important;
            justify-content: flex-start !important;
            align-items: center !important;
            height: 100% !important;
            width: 72px !important;
            border-top: none !important;
            border-right: 0.5px solid rgba(0,212,255,0.15) !important;
            padding: 20px 0 !important;
            gap: 2px;
            order: -1;
          }
        }
      `}</style>

      {TABS.map(tab => {
        const isActive = location.pathname === tab.path;
        return (
          <button
            key={tab.path}
            onClick={() => navigate(tab.path)}
            title={tab.label}
            style={{
              display: 'flex', flexDirection: 'column', alignItems: 'center',
              gap: 3, padding: '6px 8px', borderRadius: 8, cursor: 'pointer',
              background: isActive ? `${tab.color}14` : 'transparent',
              border: 'none', minWidth: 44,
              transition: 'background 0.2s',
            }}
          >
            {/* Icon letter */}
            <span style={{
              fontFamily: 'Orbitron, monospace', fontSize: 13, fontWeight: 700,
              color: isActive ? tab.color : 'rgba(232,244,255,0.25)',
              lineHeight: 1, transition: 'color 0.2s',
              textShadow: isActive ? `0 0 10px ${tab.color}` : 'none',
            }}>
              {tab.icon}
            </span>
            {/* Label */}
            <span style={{
              fontFamily: 'Share Tech Mono, monospace', fontSize: 7,
              letterSpacing: 0.8, textTransform: 'uppercase',
              color: isActive ? tab.color : 'rgba(232,244,255,0.2)',
              transition: 'color 0.2s',
            }}>
              {tab.label}
            </span>
          </button>
        );
      })}
    </nav>
  );
}