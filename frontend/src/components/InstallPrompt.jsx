// frontend/src/components/InstallPrompt.jsx
// Shows "Install JARVIS" button when PWA install is available

import React, { useState, useEffect } from 'react';

export default function InstallPrompt() {
  const [prompt, setPrompt] = useState(null);
  const [installed, setInstalled] = useState(false);
  const [showBanner, setShowBanner] = useState(false);

  useEffect(() => {
    // Check if already installed
    if (window.matchMedia('(display-mode: standalone)').matches) {
      setInstalled(true); return;
    }

    // Capture install prompt
    const handler = (e) => {
      e.preventDefault();
      setPrompt(e);
      setShowBanner(true);
    };
    window.addEventListener('beforeinstallprompt', handler);

    // Detect when installed
    window.addEventListener('appinstalled', () => {
      setInstalled(true); setShowBanner(false); setPrompt(null);
    });

    return () => window.removeEventListener('beforeinstallprompt', handler);
  }, []);

  const install = async () => {
    if (!prompt) return;
    prompt.prompt();
    const { outcome } = await prompt.userChoice;
    if (outcome === 'accepted') { setInstalled(true); setShowBanner(false); }
    setPrompt(null);
  };

  if (installed || !showBanner) return null;

  return (
    <div style={{
      position: 'fixed', bottom: 80, left: 12, right: 12, zIndex: 999,
      background: 'rgba(2,4,8,0.95)',
      border: '1px solid rgba(0,212,255,0.4)',
      borderRadius: 10,
      padding: '12px 16px',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'space-between',
      backdropFilter: 'blur(10px)',
      boxShadow: '0 0 30px rgba(0,212,255,0.15)',
    }}>
      <div>
        <div style={{ fontFamily: 'Orbitron', fontSize: 10, color: '#00d4ff', letterSpacing: 2, marginBottom: 3 }}>
          ⚡ INSTALL JARVIS
        </div>
        <div style={{ fontFamily: 'Share Tech Mono', fontSize: 9, color: 'rgba(0,212,255,0.5)', letterSpacing: 1 }}>
          Add to home screen for full experience
        </div>
      </div>
      <div style={{ display: 'flex', gap: 8 }}>
        <button onClick={() => setShowBanner(false)} style={{
          padding: '7px 12px', background: 'transparent',
          border: '0.5px solid rgba(0,212,255,0.2)', borderRadius: 5,
          color: 'rgba(0,212,255,0.4)', fontSize: 9, fontFamily: 'Orbitron', cursor: 'pointer',
        }}>LATER</button>
        <button onClick={install} style={{
          padding: '7px 14px', background: 'rgba(0,212,255,0.15)',
          border: '1px solid #00d4ff', borderRadius: 5,
          color: '#00d4ff', fontSize: 9, fontFamily: 'Orbitron',
          cursor: 'pointer', letterSpacing: 1,
        }}>INSTALL</button>
      </div>
    </div>
  );
}