import React from 'react';

export default function WaveBar({ status = 'idle', lang = 'en', bars = 9 }) {
  const color = lang === 'hi'
    ? '#ff9a4a'
    : status === 'research' ? '#4adf9f' : '#4a9eff';

  const isActive = status === 'listening' || status === 'speaking';

  const heights = [3, 7, 13, 9, 16, 9, 13, 7, 3];

  return (
    <div style={{
      display: 'flex', alignItems: 'center', justifyContent: 'center',
      gap: 3, height: 24, marginTop: 8
    }}>
      {Array.from({ length: bars }).map((_, i) => (
        <div key={i} style={{
          width: 3,
          height: isActive ? heights[i % heights.length] : 3,
          borderRadius: 2,
          background: isActive ? color : 'rgba(74,158,255,0.2)',
          transition: 'height 0.2s ease',
          animation: isActive ? `wave-bar ${0.8 + (i % 3) * 0.2}s ease-in-out infinite ${i * 0.07}s` : 'none',
        }} />
      ))}
    </div>
  );
}
