import React, { useState, useEffect, useRef } from 'react';

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:5001';
const C = '#00ff88'; // FRIDAY green

function HUDHeader() {
  return (
    <div style={{ padding: '10px 16px 8px', borderBottom: `0.5px solid ${C}15`, display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexShrink: 0, background: 'rgba(0,10,5,0.9)' }}>
      <div>
        <div style={{ fontFamily: 'Orbitron', fontSize: 9, color: C, letterSpacing: 3, fontWeight: 700 }}>F.R.I.D.A.Y</div>
        <div style={{ fontFamily: 'system-ui', fontSize: 9, color:C, letterSpacing: 2, marginTop: 2 }}>DAILY INTELLIGENCE · FEMALE RESPONSE INTERFACE</div>
      </div>
      <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
        <div style={{ width: 5, height: 5, borderRadius: '50%', background: C, boxShadow: `0 0 6px ${C}`, animation: 'blink 2s infinite' }} />
        <span style={{ fontFamily: 'Share Tech Mono', fontSize: 8, color: C, letterSpacing: 1 }}>ONLINE</span>
      </div>
    </div>
  );
}

function FridayOrb({ status }) {
  const canvasRef = useRef(null);
  const frameRef = useRef(null);
  const aRef = useRef(0);
  useEffect(() => {
    const canvas = canvasRef.current; if (!canvas) return;
    const ctx = canvas.getContext('2d');
    const dpr = window.devicePixelRatio || 1, S = 110;
    canvas.width = S * dpr; canvas.height = S * dpr;
    canvas.style.width = S + 'px'; canvas.style.height = S + 'px';
    ctx.scale(dpr, dpr);
    const cx = S / 2, cy = S / 2;
    const draw = () => {
      ctx.clearRect(0, 0, S, S);
      aRef.current += status === 'loading' ? 0.035 : 0.012;
      const a = aRef.current;
      // Glow
      const gr = ctx.createRadialGradient(cx, cy, 0, cx, cy, S * 0.45);
      gr.addColorStop(0, `rgba(0,255,136,${status === 'loading' ? 0.25 : 0.12})`);
      gr.addColorStop(1, 'transparent');
      ctx.beginPath(); ctx.arc(cx, cy, S * 0.45, 0, Math.PI * 2); ctx.fillStyle = gr; ctx.fill();
      // Outer 20 segs
      for (let i = 0; i < 20; i++) {
        const s = (i / 20) * Math.PI * 2 + a, e = s + (Math.PI * 2 / 20) * 0.7;
        ctx.beginPath(); ctx.arc(cx, cy, S * 0.42, s, e);
        ctx.lineWidth = S * 0.025; ctx.strokeStyle = C;
        ctx.globalAlpha = i % 5 === 0 ? 0.2 : 0.7; ctx.stroke();
      }
      ctx.globalAlpha = 1;
      // Mid counter
      for (let i = 0; i < 14; i++) {
        const s = (i / 14) * Math.PI * 2 - a * 0.6, e = s + (Math.PI * 2 / 14) * 0.55;
        ctx.beginPath(); ctx.arc(cx, cy, S * 0.3, s, e);
        ctx.lineWidth = S * 0.018; ctx.strokeStyle = C; ctx.globalAlpha = 0.4; ctx.stroke();
      }
      ctx.globalAlpha = 1;
      // Core
      const cg = ctx.createRadialGradient(cx, cy, 0, cx, cy, S * 0.1);
      cg.addColorStop(0, '#fff'); cg.addColorStop(0.3, C); cg.addColorStop(1, 'transparent');
      ctx.beginPath(); ctx.arc(cx, cy, S * 0.1, 0, Math.PI * 2); ctx.fillStyle = cg; ctx.fill();
      // F label
      ctx.font = `900 ${S * 0.14}px Orbitron`; ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
      ctx.fillStyle = '#fff'; ctx.globalAlpha = 0.9; ctx.fillText('F', cx, cy); ctx.globalAlpha = 1;
      frameRef.current = requestAnimationFrame(draw);
    };
    draw();
    return () => cancelAnimationFrame(frameRef.current);
  }, [status]);
  return <canvas ref={canvasRef} style={{ display: 'block' }} />;
}

export default function Friday({ jarvis }) {
  const { lang } = jarvis;
  const [brief, setBrief] = useState(null);
  const [loading, setLoading] = useState(false);
  const [data, setData] = useState(null);
  const [stage, setStage] = useState('idle');
  const [welcomeText, setWelcomeText] = useState('');
  const mountedRef = useRef(true);
  const announcedRef = useRef(false);
  const timerRef = useRef(null);

  const speak = (text, l) => {
    if (!text || !mountedRef.current) return;
    window.speechSynthesis?.cancel();
    const u = new SpeechSynthesisUtterance(text);
    u.lang = l === 'hi' ? 'hi-IN' : 'en-IN';
    // Tuned for a confident, warm female voice — not thin/shaky
    u.rate = 1.0; u.pitch = 1.0; u.volume = 1.0;
    const voices = window.speechSynthesis?.getVoices() || [];
    const female = voices.find(v =>
      l === 'hi'
        ? (v.lang.includes('hi') && /female|woman/i.test(v.name))
        : (v.lang.startsWith('en') && /female|woman|samantha|zira|google us english/i.test(v.name))
    ) || voices.find(v => l === 'hi' ? v.lang.includes('hi') : v.lang.startsWith('en'));
    if (female) u.voice = female;
    window.speechSynthesis?.speak(u);
  };

  useEffect(() => {
    mountedRef.current = true;
    window.speechSynthesis?.cancel();
    if (!announcedRef.current) {
      announcedRef.current = true;
      const hour = new Date().getHours();
      const tg = hour < 12 ? 'Good morning' : hour < 17 ? 'Good afternoon' : 'Good evening';
      const msg = lang === 'hi'
        ? `${tg} Naman sir। FRIDAY reporting। Daily brief compile कर रही हूँ।`
        : `${tg} Boss. FRIDAY reporting. Compiling your daily intelligence brief.`;
      setWelcomeText(msg); setStage('welcome');
      const u = new SpeechSynthesisUtterance(msg);
      u.lang = lang === 'hi' ? 'hi-IN' : 'en-IN'; u.rate = 1.0; u.pitch = 1.08; u.volume = 1.0;
      const _voices = window.speechSynthesis?.getVoices() || [];
      const _female = _voices.find(v =>
        lang === 'hi'
          ? (v.lang.includes('hi') && /female|woman/i.test(v.name))
          : (v.lang.startsWith('en') && /female|woman|samantha|zira|google us english/i.test(v.name))
      ) || _voices.find(v => lang === 'hi' ? v.lang.includes('hi') : v.lang.startsWith('en'));
      if (_female) u.voice = _female;
      u.onend = () => { if (mountedRef.current) { setStage('loading'); loadBrief(); } };
      timerRef.current = setTimeout(() => { if (mountedRef.current && !brief) { setStage('loading'); loadBrief(); } }, 6000);
      window.speechSynthesis?.speak(u);
    }
    return () => { mountedRef.current = false; announcedRef.current = false; clearTimeout(timerRef.current); window.speechSynthesis?.cancel(); };
  }, []);

  const loadBrief = async () => {
    if (!mountedRef.current) return;
    setLoading(true); setBrief(null);
    try {
      const res = await fetch(`${API_URL}/api/friday/brief?lang=${lang}`);
      const json = await res.json();
      if (!mountedRef.current) return;
      setBrief(json.brief); setData(json.data); setStage('ready');
      setTimeout(() => speak(json.brief, json.language || lang), 600);
    } catch {
      const e = lang === 'hi' ? 'माफ करें सर, FRIDAY unavailable है।' : 'Apologies sir, FRIDAY is temporarily offline.';
      setBrief(e); setStage('ready'); speak(e, lang);
    } finally { if (mountedRef.current) setLoading(false); }
  };

  const refreshBrief = () => {
    window.speechSynthesis?.cancel(); setBrief(null); setData(null); setStage('loading');
    loadBrief();
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100%', background: '#020408', position: 'relative', overflow: 'hidden' }}>
      {/* Nano grid bg */}
      <div style={{ position: 'absolute', inset: 0, backgroundImage: `linear-gradient(${C}08 1px, transparent 1px), linear-gradient(90deg, ${C}08 1px, transparent 1px)`, backgroundSize: '40px 40px', pointerEvents: 'none' }} />

      <HUDHeader />

      <div style={{ flex: 1, overflowY: 'auto', padding: '16px', position: 'relative', zIndex: 1, scrollbarWidth: 'thin', scrollbarColor: `${C}30 transparent` }}>

        {/* Orb + status */}
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', marginBottom: 16, gap: 8 }}>
          <div style={{ position: 'relative' }}>
            <FridayOrb status={loading ? 'loading' : 'idle'} />
            <div style={{ position: 'absolute', inset: -8, borderRadius: '50%', border: `1px solid ${C}20`, animation: loading ? 'spin-slow 8s linear infinite' : 'none', pointerEvents: 'none' }} />
          </div>
          <div style={{ fontFamily: 'Orbitron', fontSize: 9, color: C, letterSpacing: 3, animation: stage !== 'ready' ? 'blink 1.5s infinite' : 'none' }}>
            {stage === 'welcome' ? '▶ REPORTING' : stage === 'loading' ? '◌ COMPILING' : stage === 'ready' ? '● BRIEF READY' : '◯ STANDBY'}
          </div>
          {stage === 'welcome' && (
            <div style={{ textAlign: 'center', padding: '8px 16px', background: `${C}08`, border: `0.5px solid ${C}25`, borderRadius: 8, maxWidth: 320 }}>
              <p style={{ fontFamily: lang === 'hi' ? 'Rajdhani' : 'Share Tech Mono', fontSize: 12, color: C, lineHeight: 1.6 }}>{welcomeText}</p>
            </div>
          )}
          {stage === 'loading' && (
            <div style={{ textAlign: 'center' }}>
              <p style={{ fontFamily: 'Share Tech Mono', fontSize: 9, color: C, letterSpacing: 1, animation: 'blink 0.8s infinite' }}>FETCHING WEATHER · NEWS · TASKS</p>
            </div>
          )}
        </div>

        {/* Stats */}
        {data && (
          <div style={{ display: 'flex', gap: 8, marginBottom: 14 }}>
            {[
              { val: data.weather ? `${data.weather.temp}°C` : '--', lbl: data.weather?.description || 'WEATHER', color: '#00d4ff' },
              { val: data.tasks?.length || 0, lbl: 'TASKS', color: C },
              { val: data.news?.length || 0, lbl: 'NEWS', color: '#aa55ff' },
            ].map(({ val, lbl, color }) => (
              <div key={lbl} style={{ flex: 1, background: `${color}08`, border: `0.5px solid ${color}25`, borderRadius: 6, padding: '10px 6px', textAlign: 'center', position: 'relative' }}>
                <div style={{ position: 'absolute', top: 0, left: 0, width: 5, height: 5, borderTop: `1px solid ${color}`, borderLeft: `1px solid ${color}` }} />
                <div style={{ fontFamily: 'Orbitron', fontSize: 16, fontWeight: 900, color }}>{val}</div>
                <div style={{ fontFamily: 'Share Tech Mono', fontSize: 7, color: `${color}60`, marginTop: 3, letterSpacing: 1 }}>{lbl}</div>
              </div>
            ))}
          </div>
        )}

        {/* Brief */}
        {brief && (
          <div style={{ background: `${C}05`, border: `0.5px solid ${C}25`, borderRadius: 10, overflow: 'hidden', marginBottom: 14, animation: 'fadeUp 0.3s ease' }}>
            <div style={{ padding: '8px 14px', borderBottom: `0.5px solid ${C}20`, background: `${C}08`, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <span style={{ fontFamily: 'Orbitron', fontSize: 8, color: C, letterSpacing: 2 }}>FRIDAY BRIEF</span>
              <span style={{ fontFamily: 'Share Tech Mono', fontSize: 8, color: `${C}50` }}>{new Date().toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' })}</span>
            </div>
            <div style={{ padding: '14px' }}>
              <p style={{ fontFamily: lang === 'hi' ? 'Rajdhani' : 'Rajdhani', fontSize: 13, color: 'rgba(232,244,255,0.75)', lineHeight: 1.8, whiteSpace: 'pre-wrap', userSelect: 'text' }}>{brief}</p>
            </div>
          </div>
        )}

        {/* Tasks */}
        {data?.tasks?.length > 0 && (
          <div style={{ marginBottom: 14 }}>
            <div style={{ fontFamily: 'Share Tech Mono', fontSize: 8, color: `${C}60`, letterSpacing: 2, marginBottom: 8 }}>● TODAY'S TASKS</div>
            {data.tasks.map(t => (
              <div key={t.id} style={{ background: `${C}05`, border: `0.5px solid ${C}15`, borderLeft: `2px solid ${C}`, borderRadius: 5, padding: '8px 12px', marginBottom: 5, display: 'flex', alignItems: 'center', gap: 10 }}>
                <div style={{ width: 5, height: 5, borderRadius: '50%', background: C, flexShrink: 0 }} />
                <span style={{ flex: 1, fontSize: 12, color: 'rgba(232,244,255,0.7)' }}>{t.title}</span>
                {t.scheduled_at && <span style={{ fontFamily: 'Share Tech Mono', fontSize: 9, color: `${C}50` }}>{new Date(t.scheduled_at).toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' })}</span>}
              </div>
            ))}
          </div>
        )}

        {/* News */}
        {data?.news?.length > 0 && (
          <div style={{ marginBottom: 14 }}>
            <div style={{ fontFamily: 'system-ui', fontSize: 9, color: C, letterSpacing: 2, marginBottom: 8 }}>● INTEL FEED</div>
            {data.news.map((item, i) => (
              <div key={i} style={{ background: 'rgba(255,255,255,0.02)', border: `0.5px solid ${C}12`, borderRadius: 5, padding: '10px 12px', marginBottom: 5 }}>
                <p style={{ fontSize: 12, color: 'rgb(232, 244, 255)', lineHeight: 1.5, marginBottom: 3 }}>{item.title}</p>
                {item.snippet && <p style={{ fontSize: 10, color: 'rgba(232, 244, 255, 0.94)', lineHeight: 1.4 }}>{item.snippet}</p>}
              </div>
            ))}
          </div>
        )}

        {/* Buttons */}
        {stage === 'ready' && (
          <div style={{ display: 'flex', gap: 8 }}>
            <button onClick={() => speak(brief, lang)} style={{ flex: 1, padding: '11px', background: `${C}10`, border: `1px solid ${C}40`, borderRadius: 8, color: C, fontSize: 10, fontFamily: 'Orbitron', letterSpacing: 1, cursor: 'pointer' }}>▶ PLAY</button>
            <button onClick={refreshBrief} style={{ flex: 1, padding: '11px', background: 'transparent', border: '0.5px solid rgba(255,255,255,0.1)', borderRadius: 8, color: 'rgba(232,244,255,0.4)', fontSize: 10, fontFamily: 'Orbitron', letterSpacing: 1, cursor: 'pointer' }}>↺ REFRESH</button>
          </div>
        )}
      </div>
    </div>
  );
}