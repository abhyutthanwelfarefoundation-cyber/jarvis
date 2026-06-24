import React, { useRef, useEffect, useState } from 'react';
import AssembleSequence from '../components/AssembleSequence';

/* ══════════════════════════════════════
   ARC REACTOR CANVAS
══════════════════════════════════════ */
function ArcReactor({ status, size = 200 }) {
  const canvasRef = useRef(null);
  const frameRef  = useRef(null);
  const angleRef  = useRef(0);

  const PALETTE = {
    idle:     { core: '#00d4ff', ring: '#00d4ff', outer: '#003355', glow: 'rgba(0,212,255,0.35)' },
    listening:{ core: '#00ff88', ring: '#00ff88', outer: '#003322', glow: 'rgba(0,255,136,0.45)' },
    thinking: { core: '#aa55ff', ring: '#aa55ff', outer: '#220044', glow: 'rgba(170,85,255,0.45)' },
    research: { core: '#aa55ff', ring: '#aa55ff', outer: '#220044', glow: 'rgba(170,85,255,0.45)' },
    speaking: { core: '#ff8600', ring: '#ff8600', outer: '#331100', glow: 'rgba(255,136,0,0.45)'  },
  };

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    const dpr = window.devicePixelRatio || 1;
    const S = size;
    canvas.width = S * dpr; canvas.height = S * dpr;
    canvas.style.width = S + 'px'; canvas.style.height = S + 'px';
    ctx.scale(dpr, dpr);
    const cx = S / 2, cy = S / 2;

    const draw = () => {
      const c = PALETTE[status] || PALETTE.idle;
      ctx.clearRect(0, 0, S, S);
      angleRef.current += status === 'thinking' || status === 'research' ? 0.045
        : status === 'listening' ? 0.028 : 0.014;
      const a = angleRef.current;

      // Glow pulse
      const gr = S * 0.46 + Math.sin(a * 1.5) * S * 0.025;
      const g1 = ctx.createRadialGradient(cx, cy, gr * 0.5, cx, cy, gr);
      g1.addColorStop(0, c.glow); g1.addColorStop(1, 'transparent');
      ctx.beginPath(); ctx.arc(cx, cy, gr, 0, Math.PI * 2);
      ctx.fillStyle = g1; ctx.fill();

      // Outer ring 28 segments
      for (let i = 0; i < 28; i++) {
        const s = (i / 28) * Math.PI * 2 + a;
        const e = s + (Math.PI * 2 / 28) * 0.72;
        ctx.beginPath(); ctx.arc(cx, cy, S * 0.43, s, e);
        ctx.lineWidth = S * 0.028;
        ctx.strokeStyle = i % 4 === 0 ? c.outer : c.ring;
        ctx.globalAlpha  = i % 4 === 0 ? 0.25 : 0.85;
        ctx.stroke();
      }
      ctx.globalAlpha = 1;

      // Mid ring counter-rotate
      for (let i = 0; i < 18; i++) {
        const s = (i / 18) * Math.PI * 2 - a * 0.65;
        const e = s + (Math.PI * 2 / 18) * 0.55;
        ctx.beginPath(); ctx.arc(cx, cy, S * 0.32, s, e);
        ctx.lineWidth = S * 0.02;
        ctx.strokeStyle = c.ring;
        ctx.globalAlpha = i % 3 === 0 ? 0.2 : 0.55;
        ctx.stroke();
      }
      ctx.globalAlpha = 1;

      // Inner ring
      for (let i = 0; i < 10; i++) {
        const s = (i / 10) * Math.PI * 2 + a * 1.6;
        const e = s + (Math.PI * 2 / 10) * 0.65;
        ctx.beginPath(); ctx.arc(cx, cy, S * 0.21, s, e);
        ctx.lineWidth = S * 0.016;
        ctx.strokeStyle = c.core;
        ctx.globalAlpha = 0.75;
        ctx.stroke();
      }
      ctx.globalAlpha = 1;

      // Crosshair
      ctx.strokeStyle = c.core; ctx.lineWidth = 0.5; ctx.globalAlpha = 0.12;
      ctx.beginPath(); ctx.moveTo(cx - S * 0.48, cy); ctx.lineTo(cx + S * 0.48, cy); ctx.stroke();
      ctx.beginPath(); ctx.moveTo(cx, cy - S * 0.48); ctx.lineTo(cx, cy + S * 0.48); ctx.stroke();
      ctx.globalAlpha = 1;

      // Core glow
      const cg = ctx.createRadialGradient(cx, cy, 0, cx, cy, S * 0.13);
      cg.addColorStop(0, '#ffffff'); cg.addColorStop(0.25, c.core); cg.addColorStop(1, 'transparent');
      ctx.beginPath(); ctx.arc(cx, cy, S * 0.13, 0, Math.PI * 2);
      ctx.fillStyle = cg; ctx.fill();

      // NSEW tick dots
      [0, Math.PI / 2, Math.PI, (3 * Math.PI) / 2].forEach(angle => {
        ctx.beginPath();
        ctx.arc(cx + Math.cos(angle) * S * 0.445, cy + Math.sin(angle) * S * 0.445, S * 0.016, 0, Math.PI * 2);
        ctx.fillStyle = c.core; ctx.globalAlpha = 0.8; ctx.fill();
      });
      ctx.globalAlpha = 1;

      // J label
      ctx.font = `900 ${S * 0.13}px Orbitron, monospace`;
      ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
      ctx.fillStyle = '#ffffff'; ctx.globalAlpha = 0.9;
      ctx.fillText('J', cx, cy + S * 0.01);
      ctx.globalAlpha = 1;

      frameRef.current = requestAnimationFrame(draw);
    };
    draw();
    return () => cancelAnimationFrame(frameRef.current);
  }, [status, size]);

  return <canvas ref={canvasRef} style={{ display: 'block' }} />;
}

/* ══════════════════════════════════════
   MINI DIAGNOSTIC RING
══════════════════════════════════════ */
function MiniRing({ value = 75, color = '#00d4ff', size = 44, label }) {
  const canvasRef = useRef(null);
  useEffect(() => {
    const c = canvasRef.current;
    if (!c) return;
    const ctx = c.getContext('2d');
    const dpr = window.devicePixelRatio || 1;
    c.width = size * dpr; c.height = size * dpr;
    c.style.width = size + 'px'; c.style.height = size + 'px';
    ctx.scale(dpr, dpr);
    const cx = size / 2, cy = size / 2, r = size * 0.38;
    ctx.clearRect(0, 0, size, size);
    ctx.beginPath(); ctx.arc(cx, cy, r, 0, Math.PI * 2);
    ctx.strokeStyle = 'rgba(255,255,255,0.06)'; ctx.lineWidth = size * 0.07; ctx.stroke();
    const start = -Math.PI / 2;
    const end = start + (Math.PI * 2 * Math.min(value, 100) / 100);
    ctx.beginPath(); ctx.arc(cx, cy, r, start, end);
    ctx.strokeStyle = color; ctx.lineWidth = size * 0.07;
    ctx.lineCap = 'round'; ctx.stroke();
    ctx.font = `700 ${size * 0.22}px Orbitron, monospace`;
    ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
    ctx.fillStyle = color; ctx.globalAlpha = 0.9;
    ctx.fillText(value, cx, cy);
    ctx.globalAlpha = 1;
  }, [value, color, size]);
  return (
    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 3 }}>
      <canvas ref={canvasRef} />
      {label && <span style={{ fontFamily: 'Share Tech Mono', fontSize: 8, color: 'rgb(232, 244, 255)', letterSpacing: 1 }}>{label}</span>}
    </div>
  );
}

/* ══════════════════════════════════════
   WAVE BARS
══════════════════════════════════════ */
function WaveBars({ active, color = '#00d4ff' }) {
  const h = [3,6,9,7,12,8,5,10,7,4,9,6,11,7,5];
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 3, height: 24 }}>
      {h.map((v, i) => (
        <div key={i} style={{
          width: 3, borderRadius: 2, backgroundColor: color,
          height: active ? v : 3, opacity: active ? 0.8 : 0.22,
          transition: `height ${0.15 + i * 0.018}s ease, opacity 0.3s`,
          animation: active ? `blink ${0.55 + (i % 4) * 0.13}s ease-in-out infinite alternate` : 'none',
        }} />
      ))}
    </div>
  );
}

/* ══════════════════════════════════════
   DATA ROW
══════════════════════════════════════ */
function DataRow({ label, value, color = '#00d4ff', blink = false }) {
  return (
    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '5px 0', borderBottom: '0.5px solid rgba(255,255,255,0.04)' }}>
      <span style={{ fontFamily: 'Share Tech Mono', fontSize: 9, color: 'rgb(232, 244, 255)', letterSpacing: 1, textTransform: 'uppercase' }}>{label}</span>
      <span style={{ fontFamily: 'Orbitron', fontSize: 11, fontWeight: 700, color, animation: blink ? 'blink 1.5s ease infinite' : 'none' }}>{value}</span>
    </div>
  );
}

/* ══════════════════════════════════════
   AGENT STATUS ROW
══════════════════════════════════════ */
function AgentRow({ name, color, online }) {
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '4px 0' }}>
      <div style={{ width: 6, height: 6, borderRadius: '50%', flexShrink: 0, background: online ? color : '#1a1a1a', boxShadow: online ? `0 0 5px ${color}` : 'none', transition: 'all 0.3s' }} />
      <span style={{ fontFamily: 'Orbitron', fontSize: 10, color: online ? color : '#2a2a2a', letterSpacing: 1, flex: 1, transition: 'color 0.3s' , fontWeight:600 }}>{name}</span>
      <span style={{ fontFamily: 'system-ui', fontSize: 8, color: online ? 'rgb(232, 244, 255)' : '#1a1a1a' }}>{online ? 'ON' : '--'}</span>
    </div>
  );
}

/* ══════════════════════════════════════
   NANO PARTICLE BACKGROUND
══════════════════════════════════════ */
function NanoBackground() {
  const canvasRef = useRef(null);
  const frameRef  = useRef(null);
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    const resize = () => { canvas.width = canvas.offsetWidth; canvas.height = canvas.offsetHeight; };
    resize();
    window.addEventListener('resize', resize);

    const particles = Array.from({ length: 60 }, () => ({
      x: Math.random() * canvas.width,
      y: Math.random() * canvas.height,
      vx: (Math.random() - 0.5) * 0.3,
      vy: (Math.random() - 0.5) * 0.3,
      r: Math.random() * 1.2 + 0.3,
      opacity: Math.random() * 0.4 + 0.05,
    }));

    const draw = () => {
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      particles.forEach(p => {
        p.x += p.vx; p.y += p.vy;
        if (p.x < 0) p.x = canvas.width;
        if (p.x > canvas.width) p.x = 0;
        if (p.y < 0) p.y = canvas.height;
        if (p.y > canvas.height) p.y = 0;
        ctx.beginPath();
        ctx.arc(p.x, p.y, p.r, 0, Math.PI * 2);
        ctx.fillStyle = `rgba(0,212,255,${p.opacity})`;
        ctx.fill();
      });
      // Draw connections
      particles.forEach((p, i) => {
        particles.slice(i + 1).forEach(q => {
          const dx = p.x - q.x, dy = p.y - q.y;
          const dist = Math.sqrt(dx * dx + dy * dy);
          if (dist < 80) {
            ctx.beginPath();
            ctx.moveTo(p.x, p.y); ctx.lineTo(q.x, q.y);
            ctx.strokeStyle = `rgba(0,212,255,${0.06 * (1 - dist / 80)})`;
            ctx.lineWidth = 0.5;
            ctx.stroke();
          }
        });
      });
      frameRef.current = requestAnimationFrame(draw);
    };
    draw();
    return () => { cancelAnimationFrame(frameRef.current); window.removeEventListener('resize', resize); };
  }, []);
  return <canvas ref={canvasRef} style={{ position: 'absolute', inset: 0, width: '100%', height: '100%', pointerEvents: 'none', zIndex: 0 }} />;
}

/* ══════════════════════════════════════
   HOME PAGE
══════════════════════════════════════ */
export default function Home({ jarvis }) {
  const {
    messages  = [],
    lang      = 'en',
    weather   = null,
    tasks     = [],
    status    = 'idle',
    listening = false,
    speaking  = false,
    showAssemble,
    setShowAssemble,
    sendText,
    activateMic,
    wakeArmed,
    armWakeWord,
  } = jarvis || {};

  const isListening = listening;
  const isSpeaking  = speaking;
  const isThinking  = status === 'thinking' || status === 'research';
  const taskCount   = tasks?.length ?? 0;

  const COLOR_MAP = { idle: '#00d4ff', listening: '#00ff88', thinking: '#aa55ff', research: '#aa55ff', speaking: '#ff8600' };
  const agentColor = COLOR_MAP[status] || '#00d4ff';

  const hour = new Date().getHours();
  const greeting = hour < 12 ? 'GOOD MORNING' : hour < 17 ? 'GOOD AFTERNOON' : 'GOOD EVENING';

  const [mode, setMode]   = useState('voice');
  const [input, setInput] = useState('');
  const [time, setTime]   = useState(new Date());
  const chatEndRef = useRef(null);

  useEffect(() => {
    const t = setInterval(() => setTime(new Date()), 1000);
    return () => clearInterval(t);
  }, []);

  const [reactorSize, setReactorSize] = useState(190);
  useEffect(() => {
    const upd = () => setReactorSize(window.innerWidth >= 1280 ? 230 : window.innerWidth >= 1024 ? 200 : window.innerWidth >= 600 ? 180 : 160);
    upd();
    window.addEventListener('resize', upd);
    return () => window.removeEventListener('resize', upd);
  }, []);

  useEffect(() => {
    if (mode === 'chat') chatEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, mode]);

  const handleSend = () => {
    const t = input.trim();
    if (!t || !sendText) return;
    sendText(t);
    setInput('');
  };

  const timeStr = time.toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit', second: '2-digit' });
  const dateStr = time.toLocaleDateString('en-IN', { weekday: 'short', day: '2-digit', month: 'short' });

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100%', overflow: 'hidden', background: '#020408', position: 'relative' }}>

      {/* ── NANO BACKGROUND ── */}
      <NanoBackground />

      {/* ── TOP BAR ── */}
      <div style={{
        display: 'flex', alignItems: 'center', justifyContent: 'space-between',
        padding: '0 16px', height: 46, flexShrink: 0, position: 'relative', zIndex: 10,
        borderBottom: '0.5px solid rgba(0,212,255,0.1)',
        background: 'rgba(2,4,8,0.92)',
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
          <div>
            <div style={{ fontFamily: 'Orbitron', fontSize: 10, fontWeight: 700, letterSpacing: 2, color: '#e8f4ff' }}>{greeting}, NAMAN</div>
            {weather && (
              <div style={{ fontFamily: 'system-ui', fontSize: 10, color: 'rgb(0, 213, 255)', letterSpacing: 1 , fontWeight:600 }}>
                {weather.temp}°C · {weather.city} · {weather.description}
              </div>
            )}
          </div>
          <div style={{ width: '0.5px', height: 26, background: 'rgba(0,212,255,0.12)' }} />
          <div>
            <div style={{ fontFamily: 'Share Tech Mono', fontSize: 14, color: '#00d4ff', letterSpacing: 2, lineHeight: 1 }}>{timeStr}</div>
            <div style={{ fontFamily: 'system-ui', fontSize: 9, color: 'rgb(232, 244, 255)', letterSpacing: 1 }}>{dateStr}</div>
          </div>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          {/* Status pill */}
          <div style={{ display: 'flex', alignItems: 'center', gap: 5, padding: '3px 9px', background: 'rgba(255,255,255,0.03)', border: '0.5px solid rgba(0,212,255,0.12)', borderRadius: 6 }}>
            <div style={{ width: 5, height: 5, borderRadius: '50%', background: agentColor, boxShadow: `0 0 4px ${agentColor}`, animation: status !== 'idle' ? 'blink 1s infinite' : 'none' }} />
            <span style={{ fontFamily: 'Share Tech Mono', fontSize: 8, color: agentColor, letterSpacing: 1 }}>{status.toUpperCase()}</span>
          </div>

          {/* ASSEMBLE button */}
          <button
            onClick={() => setShowAssemble?.(true)}
            style={{
              fontFamily: 'Orbitron', fontSize: 8, fontWeight: 900, letterSpacing: 1.5,
              padding: '6px 12px', borderRadius: 6, cursor: 'pointer',
              background: 'rgba(0,212,255,0.08)',
              border: '0.5px solid #00d4ff', color: '#00d4ff',
              textShadow: '0 0 8px rgba(0,212,255,0.5)',
              boxShadow: '0 0 12px rgba(0,212,255,0.1)',
              transition: 'all 0.2s',
            }}
            onMouseEnter={e => { e.target.style.background = 'rgba(0,212,255,0.15)'; e.target.style.boxShadow = '0 0 18px rgba(0,212,255,0.25)'; }}
            onMouseLeave={e => { e.target.style.background = 'rgba(0,212,255,0.08)'; e.target.style.boxShadow = '0 0 12px rgba(0,212,255,0.1)'; }}
          >⚡ ASSEMBLE</button>

          <div style={{ fontFamily: 'Orbitron', fontSize: 9, fontWeight: 700, padding: '4px 8px', background: 'rgba(0,212,255,0.05)', border: '0.5px solid rgba(0,212,255,0.2)', borderRadius: 6, color: '#00d4ff', letterSpacing: 1 }}>
            {lang === 'hi' ? 'हिं' : 'EN'}
          </div>
        </div>
      </div>

      {/* ── WAKE WORD ACTIVATION BANNER — shows until armed ── */}
      {!wakeArmed && (
        <div style={{
          flexShrink: 0, display: 'flex', alignItems: 'center', justifyContent: 'space-between',
          padding: '8px 16px', background: 'rgba(255,136,0,0.06)',
          borderBottom: '0.5px solid rgba(255,136,0,0.2)',
          position: 'relative', zIndex: 10,
        }}>
          <span style={{ fontFamily: 'Share Tech Mono', fontSize: 9, color: '#ff8600', letterSpacing: 0.5 }}>
            🎙 Click once to enable hands-free "Hey Jarvis" — required by browser for mic access
          </span>
          <button
            onClick={() => armWakeWord?.()}
            style={{
              fontFamily: 'Orbitron', fontSize: 8, fontWeight: 900, letterSpacing: 1,
              padding: '5px 12px', borderRadius: 6, cursor: 'pointer', flexShrink: 0,
              background: 'rgba(255,136,0,0.12)', border: '0.5px solid #ff8600', color: '#ff8600',
            }}
          >ACTIVATE</button>
        </div>
      )}

      {/* ── BODY ── */}
      <div style={{ flex: 1, minHeight: 0, display: 'flex', overflow: 'hidden', position: 'relative', zIndex: 1 }}>

        {/* LEFT PANEL */}
        <div className="desktop-only" style={{
          width: 185, flexShrink: 0,
          borderRight: '0.5px solid rgba(0,212,255,0.07)',
          padding: '14px 12px',
          display: 'flex', flexDirection: 'column', gap: 12,
          overflowY: 'auto', overflowX: 'hidden',
          background: 'rgba(0,5,15,0.6)',
          backdropFilter: 'blur(4px)',
        }}>
          <div>
            <div style={{ fontFamily: 'system-ui', fontSize: 11, letterSpacing: 2, color: 'rgb(0, 213, 255)', marginBottom: 8 , fontWeight:600 }}>● SYSTEM STATUS</div>
            <AgentRow name="JARVIS" color="#00d4ff" online />
            <AgentRow name="FRIDAY" color="#00ff88" online />
            <AgentRow name="HAROLD" color="#ff8600" online />
            <AgentRow name="ZEUS"   color="#aa55ff" online />
            <AgentRow name="STARK"  color="#ff3355" online />
          </div>

          <div style={{ height: '0.5px', background: 'rgba(0,212,255,0.07)' }} />

          <div>
            <div style={{ fontFamily: 'system-ui', fontSize: 11, letterSpacing: 2, color: 'rgb(0, 213, 255)', marginBottom: 8 , fontWeight:600 }}>● INTEL</div>
            <DataRow label="Tasks"    value={taskCount}                      color="#00d4ff" />
            <DataRow label="Messages" value={messages.length}                color="#00d4ff" />
            <DataRow label="Language" value={lang === 'hi' ? 'HI' : 'EN'}   color="#aa55ff" />
            {weather && <DataRow label="Temp" value={`${weather.temp}°C`}   color="#ff8600" />}
          </div>

          <div style={{ height: '0.5px', background: 'rgba(0,212,255,0.07)' }} />

          <div>
            <div style={{ fontFamily: 'system-ui', fontSize: 11, letterSpacing: 2, color: 'rgb(0, 213, 255)', marginBottom: 10 , fontWeight:600 }}>● DIAGNOSTICS</div>
            <div style={{ display: 'flex', justifyContent: 'space-around' }}>
              <MiniRing value={92} color="#00d4ff" size={44} label="SYS" />
              <MiniRing value={78} color="#00ff88" size={44} label="NET" />
              <MiniRing value={65} color="#aa55ff" size={44} label="AI" />
            </div>
          </div>

          <div style={{ marginTop: 'auto', textAlign: 'center' }}>
            <div style={{ fontFamily: 'SYSTEM-UI', fontSize: 12, color: 'rgb(232, 244, 255)', letterSpacing: 1, lineHeight: 1.8 }}>
              NAMAN TECH v2.0<br />
              <span style={{ color: 'rgb(0, 213, 255)' }}>CLASSIFIED</span>
            </div>
          </div>
        </div>

        {/* CENTER */}
        <div style={{ flex: 1, minWidth: 0, display: 'flex', flexDirection: 'column', overflow: 'hidden', alignItems: 'center' }}>

          {/* Reactor */}
          <div style={{ flexShrink: 0, display: 'flex', flexDirection: 'column', alignItems: 'center', padding: '14px 0 6px', gap: 8 }}>

            {/* Mobile stats */}
            <div className="mobile-only" style={{ display: 'flex', gap: 20, marginBottom: 2 }}>
              {weather && (
                <div style={{ textAlign: 'center' }}>
                  <div style={{ fontFamily: 'Orbitron', fontSize: 15, fontWeight: 700, color: '#00d4ff' }}>{weather.temp}°C</div>
                  <div style={{ fontFamily: 'Share Tech Mono', fontSize: 8, color: 'rgba(232,244,255,0.25)' }}>TEMP</div>
                </div>
              )}
              <div style={{ textAlign: 'center' }}>
                <div style={{ fontFamily: 'Orbitron', fontSize: 15, fontWeight: 700, color: '#00d4ff' }}>{taskCount}</div>
                <div style={{ fontFamily: 'Share Tech Mono', fontSize: 8, color: 'rgba(232,244,255,0.25)' }}>TASKS</div>
              </div>
            </div>

            {/* Reactor + rings */}
            <div style={{ position: 'relative', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <ArcReactor status={status} size={reactorSize} />
              <div style={{ position: 'absolute', inset: -10, borderRadius: '50%', border: `1px solid ${agentColor}18`, pointerEvents: 'none', animation: status !== 'idle' ? 'spin-slow 10s linear infinite' : 'none' }} />
              <div style={{ position: 'absolute', inset: -20, borderRadius: '50%', border: `0.5px solid ${agentColor}0d`, pointerEvents: 'none', animation: status !== 'idle' ? 'spin-reverse 15s linear infinite' : 'none' }} />
              <div style={{ position: 'absolute', inset: -30, borderRadius: '50%', border: `0.5px solid rgba(0,212,255,0.05)`, pointerEvents: 'none' }} />
            </div>

            {/* Status label */}
            <div style={{ fontFamily: 'Orbitron', fontSize: 9, fontWeight: 700, letterSpacing: 3, color: agentColor, animation: status !== 'idle' ? 'blink 1.5s ease infinite' : 'none' }}>
              {status === 'listening' ? '◉ LISTENING'
               : status === 'thinking' || status === 'research' ? '◌ PROCESSING'
               : status === 'speaking' ? '▶ SPEAKING' : '◯ STANDBY'}
            </div>
            <WaveBars active={status !== 'idle'} color={agentColor} />
          </div>

          {/* Mode toggle */}
          <div style={{ display: 'flex', flexShrink: 0, background: 'rgba(255,255,255,0.02)', border: '0.5px solid rgba(0,212,255,0.1)', borderRadius: 8, padding: 3, gap: 3, margin: '0 0 10px' }}>
            {['voice', 'chat'].map(m => (
              <button key={m} onClick={() => setMode(m)} style={{
                fontFamily: 'Orbitron', fontSize: 8, fontWeight: 700, letterSpacing: 1.5,
                padding: '6px 20px', borderRadius: 6, cursor: 'pointer', border: 'none',
                background: mode === m ? 'rgba(0,212,255,0.12)' : 'transparent',
                color: mode === m ? '#00d4ff' : 'rgba(232,244,255,0.28)',
                transition: 'all 0.2s',
              }}>{m === 'voice' ? '🎤 VOICE' : '💬 CHAT'}</button>
            ))}
          </div>

          {/* VOICE MODE */}
          {mode === 'voice' && (
            <div style={{ flexShrink: 0, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 12, padding: '0 20px 16px' }}>
              <button onClick={() => activateMic?.()} style={{
                width: 70, height: 70, borderRadius: '50%', cursor: 'pointer',
                background: isListening ? 'rgba(0,255,136,0.1)' : 'rgba(0,212,255,0.05)',
                border: `1.5px solid ${isListening ? '#00ff88' : '#00d4ff'}`,
                display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 26,
                boxShadow: isListening ? '0 0 28px rgba(0,255,136,0.2)' : '0 0 10px rgba(0,212,255,0.1)',
                transition: 'all 0.3s',
              }}>
                {isListening ? '⏹' : '🎤'}
              </button>
              <div style={{ fontFamily: 'Share Tech Mono', fontSize: 9, color: 'rgba(232,244,255,0.28)', letterSpacing: 1 }}>
                {isListening ? '● LISTENING...' : 'TAP TO SPEAK'}
              </div>
              {messages.filter(m => m.role === 'assistant').slice(-1)[0] && (
                <div style={{ maxWidth: 340, padding: '10px 14px', background: 'rgba(0,212,255,0.03)', border: '0.5px solid rgba(0,212,255,0.1)', borderRadius: 8, position: 'relative' }}>
                  <div style={{ position: 'absolute', top: 0, left: 0, width: 6, height: 6, borderTop: '1px solid rgba(0,212,255,0.4)', borderLeft: '1px solid rgba(0,212,255,0.4)' }} />
                  <div style={{ fontFamily: 'Share Tech Mono', fontSize: 7, color: 'rgba(0,212,255,0.35)', letterSpacing: 1, marginBottom: 5 }}>◂ JARVIS</div>
                  <div style={{ fontFamily: lang === 'hi' ? 'Noto Sans Devanagari, Rajdhani' : 'Rajdhani', fontSize: 12, color: 'rgba(232,244,255,0.55)', lineHeight: 1.5, overflow: 'hidden', display: '-webkit-box', WebkitLineClamp: 3, WebkitBoxOrient: 'vertical' }}>
                    {messages.filter(m => m.role === 'assistant').slice(-1)[0]?.content}
                  </div>
                </div>
              )}
            </div>
          )}

          {/* CHAT MODE */}
          {mode === 'chat' && (
            <>
              <div style={{ flex: 1, minHeight: 0, width: '100%', overflowY: 'auto', padding: '0 14px 8px', display: 'flex', flexDirection: 'column', gap: 8, scrollbarWidth: 'thin', scrollbarColor: 'rgba(0,212,255,0.12) transparent' }}>
                {messages.length === 0 && (
                  <div style={{ textAlign: 'center', padding: '40px 0' }}>
                    <div style={{ fontFamily: 'Orbitron', fontSize: 11, color: 'rgb(0, 213, 255)', letterSpacing: 3, marginBottom: 6 }}>JARVIS READY</div>
                    <div style={{ fontFamily: 'Share Tech Mono', fontSize: 9, color: 'rgb(232, 244, 255)', letterSpacing: 1 }}>AWAITING INPUT, SIR</div>
                  </div>
                )}
                {messages.map((msg, i) => (
                  <div key={msg.id || i} style={{ display: 'flex', justifyContent: msg.role === 'user' ? 'flex-end' : 'flex-start', alignItems: 'flex-end', gap: 6 }}>
                    {msg.role === 'assistant' && (
                      <div style={{ width: 18, height: 18, borderRadius: '50%', background: 'rgba(0,212,255,0.08)', border: '0.5px solid rgba(0,212,255,0.25)', flexShrink: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 7, color: '#00d4ff', fontFamily: 'Orbitron', fontWeight: 900 }}>J</div>
                    )}
                    <div style={{ maxWidth: 'min(80%, 480px)', padding: '8px 12px', borderRadius: 10, fontSize: 13, lineHeight: 1.65, fontFamily: lang === 'hi' ? 'Noto Sans Devanagari, Rajdhani' : 'Rajdhani', background: msg.role === 'user' ? 'rgba(0,212,255,0.07)' : 'rgba(255,255,255,0.02)', border: `0.5px solid ${msg.role === 'user' ? 'rgba(0,212,255,0.22)' : 'rgba(255,255,255,0.06)'}`, color: msg.role === 'user' ? '#e8f4ff' : 'rgba(232,244,255,0.68)', animation: 'fadeUp 0.2s ease', position: 'relative' }}>
                      {msg.role === 'assistant' && <div style={{ position: 'absolute', top: 0, left: 0, width: 6, height: 6, borderTop: '1px solid rgba(0,212,255,0.35)', borderLeft: '1px solid rgba(0,212,255,0.35)' }} />}
                      {msg.content}
                    </div>
                  </div>
                ))}
                {isThinking && (
                  <div style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '5px 24px', alignSelf: 'flex-start' }}>
                    <span style={{ fontFamily: 'Share Tech Mono', fontSize: 8, color: 'rgba(0,212,255,0.35)', letterSpacing: 1 }}>PROCESSING</span>
                    {[0,1,2].map(i => <div key={i} style={{ width: 4, height: 4, borderRadius: '50%', background: '#00d4ff', animation: `blink 0.7s ease ${i * 0.18}s infinite` }} />)}
                  </div>
                )}
                <div ref={chatEndRef} />
              </div>

              <div style={{ flexShrink: 0, display: 'flex', gap: 8, padding: '8px 14px 12px', borderTop: '0.5px solid rgba(0,212,255,0.07)', background: 'rgba(2,4,8,0.92)' }}>
                <input
                  value={input}
                  onChange={e => setInput(e.target.value)}
                  onKeyDown={e => e.key === 'Enter' && handleSend()}
                  placeholder={lang === 'hi' ? 'कुछ पूछें, सर...' : 'Ask Jarvis anything, sir...'}
                  style={{ flex: 1, background: 'rgba(255,255,255,0.03)', border: '0.5px solid rgba(0,212,255,0.15)', borderRadius: 8, color: '#e8f4ff', fontFamily: 'Rajdhani', fontSize: 14, padding: '9px 14px', outline: 'none' }}
                  onFocus={e => e.target.style.borderColor = 'rgba(0,212,255,0.4)'}
                  onBlur={e => e.target.style.borderColor = 'rgba(0,212,255,0.15)'}
                />
                <button onClick={handleSend} style={{ width: 40, height: 40, borderRadius: 8, cursor: 'pointer', background: 'rgba(0,212,255,0.1)', border: '0.5px solid rgba(0,212,255,0.3)', color: '#00d4ff', fontSize: 16, flexShrink: 0 }}>↑</button>
              </div>
            </>
          )}
        </div>

        {/* RIGHT PANEL */}
        <div className="desktop-only" style={{
          width: 185, flexShrink: 0,
          borderLeft: '0.5px solid rgba(0,212,255,0.07)',
          padding: '14px 12px',
          display: 'flex', flexDirection: 'column', gap: 12,
          overflowY: 'auto', overflowX: 'hidden',
          background: 'rgba(0,5,15,0.6)',
          backdropFilter: 'blur(4px)',
        }}>
          {weather && (
            <div>
              <div style={{ fontFamily: 'system-ui', fontSize: 11, letterSpacing: 2, color: 'rgb(0, 213, 255)', marginBottom: 8 , fontWeight:600 }}>● WEATHER</div>
              <div style={{ padding: '10px', background: 'rgba(0,212,255,0.03)', border: '0.5px solid rgba(0,212,255,0.1)', borderRadius: 8 }}>
                <div style={{ fontFamily: 'Orbitron', fontSize: 28, fontWeight: 900, color: '#00d4ff', lineHeight: 1 }}>{weather.temp}°</div>
                <div style={{ fontFamily: 'Rajdhani', fontSize: 11, color: 'rgb(232, 244, 255)', marginTop: 3 }}>{weather.description}</div>
                <div style={{ fontFamily: 'system-ui', fontSize: 9, color: 'rgb(0, 213, 255)', marginTop: 4, letterSpacing: 1 }}>RAIPUR · CG · IN</div>
              </div>
            </div>
          )}

          <div style={{ height: '0.5px', background: 'rgba(0,212,255,0.07)' }} />

          <div>
            <div style={{ fontFamily: 'system-ui', fontSize: 11, letterSpacing: 2, color: 'rgb(0, 213, 255)', marginBottom: 8 , fontWeight:600}}>● ACTIVE STATE</div>
            <DataRow label="Mode"   value={mode.toUpperCase()}   color="#aa55ff" />
            <DataRow label="Status" value={status.toUpperCase()} color={agentColor} blink={status !== 'idle'} />
          </div>

          <div style={{ height: '0.5px', background: 'rgba(0,212,255,0.07)' }} />

          <div style={{ flex: 1, minHeight: 0 }}>
            <div style={{ fontFamily: 'system-ui', fontSize: 11, letterSpacing: 2, color: 'rgb(0, 213, 255)', marginBottom: 8 ,fontWeight:600}}>● RECENT LOG</div>
            {messages.length === 0 ? (
              <div style={{ fontFamily: 'system-ui', fontSize: 9, color: 'rgb(232, 244, 255)' }}>No activity yet.</div>
            ) : messages.slice(-5).map((m, i) => (
              <div key={m.id || i} style={{ padding: '5px 0', borderBottom: '0.5px solid rgba(255,255,255,0.03)' }}>
                <div style={{ fontFamily: 'system-ui', fontSize: 8, color: m.role === 'user' ? 'rgb(0, 213, 255)' : 'rgb(243, 243, 243)', letterSpacing: 0.5, marginBottom: 2 }}>
                  {m.role === 'user' ? '▸ YOU' : '◂ J'}
                </div>
                <div style={{ fontFamily: 'Rajdhani', fontSize: 10, color: 'rgb(232, 244, 255)', lineHeight: 1.4, overflow: 'hidden', display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical' }}>
                  {m.content}
                </div>
              </div>
            ))}
          </div>

          <div style={{ fontFamily: 'Share Tech Mono', fontSize: 7, color: 'rgba(232,244,255,0.1)', letterSpacing: 1, textAlign: 'center', lineHeight: 1.8 }}>
            STARK INDUSTRIES<br /><span style={{ color: 'rgba(0,212,255,0.18)' }}>MARK II · CLASSIFIED</span>
          </div>
        </div>
      </div>

      {/* ── ASSEMBLE OVERLAY — rendered here, inside Home ── */}
      {showAssemble && (
        <AssembleSequence
          lang={lang}
          onClose={() => setShowAssemble?.(false)}
        />
      )}
    </div>
  );
}