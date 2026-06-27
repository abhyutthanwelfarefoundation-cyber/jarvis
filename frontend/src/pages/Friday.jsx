import React, { useState, useEffect, useRef } from 'react';
import { agentSpeak } from '../utils/agentVoices';
import { apiCall, getErrorMessage } from '../utils/api.js';

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:5001';
const C = '#00ff88';

function FridayOrb({ size = 90, pulse = false }) {
  const canvasRef = useRef(null);
  const frameRef = useRef(null);
  const aRef = useRef(0);
  useEffect(() => {
    const canvas = canvasRef.current; if (!canvas) return;
    const ctx = canvas.getContext('2d');
    const dpr = window.devicePixelRatio || 1, S = size;
    canvas.width = S * dpr; canvas.height = S * dpr;
    canvas.style.width = S + 'px'; canvas.style.height = S + 'px';
    ctx.scale(dpr, dpr);
    const cx = S / 2, cy = S / 2;
    const draw = () => {
      ctx.clearRect(0, 0, S, S); aRef.current += pulse ? 0.04 : 0.012; const a = aRef.current;
      const gr = ctx.createRadialGradient(cx, cy, 0, cx, cy, S * 0.45);
      gr.addColorStop(0, `rgba(0,255,136,${pulse ? 0.25 : 0.12})`); gr.addColorStop(1, 'transparent');
      ctx.beginPath(); ctx.arc(cx, cy, S * 0.45, 0, Math.PI * 2); ctx.fillStyle = gr; ctx.fill();
      for (let i = 0; i < 20; i++) {
        const s = (i / 20) * Math.PI * 2 + a, e = s + (Math.PI * 2 / 20) * 0.65;
        ctx.beginPath(); ctx.arc(cx, cy, S * 0.42, s, e);
        ctx.lineWidth = S * 0.022; ctx.strokeStyle = C; ctx.globalAlpha = i % 4 === 0 ? 0.15 : 0.75; ctx.stroke();
      }
      ctx.globalAlpha = 1;
      for (let i = 0; i < 13; i++) {
        const s = (i / 13) * Math.PI * 2 - a * 0.6, e = s + (Math.PI * 2 / 13) * 0.5;
        ctx.beginPath(); ctx.arc(cx, cy, S * 0.28, s, e);
        ctx.lineWidth = S * 0.016; ctx.strokeStyle = C; ctx.globalAlpha = 0.35; ctx.stroke();
      }
      ctx.globalAlpha = 1;
      const cg = ctx.createRadialGradient(cx, cy, 0, cx, cy, S * 0.1);
      cg.addColorStop(0, '#fff'); cg.addColorStop(0.3, C); cg.addColorStop(1, 'transparent');
      ctx.beginPath(); ctx.arc(cx, cy, S * 0.1, 0, Math.PI * 2); ctx.fillStyle = cg; ctx.fill();
      ctx.font = `900 ${S * 0.13}px Orbitron`; ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
      ctx.fillStyle = '#fff'; ctx.globalAlpha = 0.9; ctx.fillText('F', cx, cy); ctx.globalAlpha = 1;
      frameRef.current = requestAnimationFrame(draw);
    };
    draw();
    return () => cancelAnimationFrame(frameRef.current);
  }, [pulse]);
  return <canvas ref={canvasRef} style={{ display: 'block' }} />;
}

function Section({ emoji, title, content, color, isReading }) {
  const [open, setOpen] = useState(true);
  return (
    <div style={{ marginBottom: 10, border: `0.5px solid ${color || C}${isReading ? '80' : '20'}`, borderRadius: 8, overflow: 'hidden', transition: 'border-color 0.3s', boxShadow: isReading ? `0 0 10px ${color || C}30` : 'none' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '8px 12px', background: `${color || C}${isReading ? '18' : '08'}` }}>
        <div onClick={() => setOpen(o => !o)} style={{ flex: 1, cursor: 'pointer' }}>
          <span style={{ fontSize: 12, color: color || C, fontFamily: 'Orbitron', letterSpacing: 1 }}>{emoji} {title}</span>
        </div>
        <div style={{ display: 'flex', gap: 6, alignItems: 'center' }}>
          {isReading && <span style={{ fontSize: 8, color: color || C, fontFamily: 'Share Tech Mono', animation: 'blink 0.8s infinite', letterSpacing: 1 }}>◉ READING</span>}
          <span onClick={() => setOpen(o => !o)} style={{ fontSize: 10, color: `${color || C}60`, cursor: 'pointer' }}>{open ? '▲' : '▼'}</span>
        </div>
      </div>
      {open && (
        <div style={{ padding: '10px 12px', background: 'rgba(0,5,2,0.8)' }}>
          <p style={{ fontSize: 13, color: 'rgba(180,255,220,0.8)', lineHeight: 1.8, whiteSpace: 'pre-wrap', userSelect: 'text' }}>{content}</p>
        </div>
      )}
    </div>
  );
}

function parseBrief(brief) {
  const sections = [];
  const patterns = [
    { emoji: '📊', title: 'MARKET RATES', color: '#00d4ff' },
    { emoji: '🔥', title: 'OPPORTUNITIES', color: '#ff8800' },
    { emoji: '📰', title: 'TECH INTEL', color: '#aa55ff' },
    { emoji: '⚡', title: 'PIPELINE ALERT', color: '#ff3355' },
    { emoji: '🎯', title: 'RECOMMENDATION', color: '#00ff88' },
  ];
  for (const p of patterns) {
    const regex = new RegExp(`${p.emoji}[^\\n]*\\n([\\s\\S]*?)(?=📊|🔥|📰|⚡|🎯|$)`, 'i');
    const match = brief.match(regex);
    if (match) sections.push({ ...p, content: match[1].trim() });
  }
  return sections.length > 0 ? sections : [{ emoji: '📋', title: 'BRIEF', color: C, content: brief }];
}

export default function Friday({ jarvis }) {
  const { lang } = jarvis;
  const [mode, setMode] = useState('brief');
  const [brief, setBrief] = useState(null);
  const [loading, setLoading] = useState(false);
  const [history, setHistory] = useState([]);
  const [selected, setSelected] = useState(null);
  const [searchQ, setSearchQ] = useState('');
  const [searchResult, setSearchResult] = useState(null);
  const [searchLoading, setSearchLoading] = useState(false);
  const [readingIndex, setReadingIndex] = useState(-1);
  const [isReadingAll, setIsReadingAll] = useState(false);
  const mountedRef = useRef(true);
  const announcedRef = useRef(false);
  const timerRef = useRef(null);
  const readingRef = useRef(false);
  const speak = (t) => agentSpeak(t, lang, 'friday');

  useEffect(() => {
    mountedRef.current = true; window.speechSynthesis?.cancel();
    if (!announcedRef.current) {
      announcedRef.current = true;
      timerRef.current = setTimeout(() => {
        if (mountedRef.current) speak(lang === 'hi' ? 'FRIDAY online हूँ सर। Business intelligence ready है।' : 'FRIDAY online sir. Business intelligence ready.');
      }, 600);
    }
    loadHistory();
    return () => {
      mountedRef.current = false; announcedRef.current = false;
      clearTimeout(timerRef.current); window.speechSynthesis?.cancel();
      readingRef.current = false;
    };
  }, []);

  const loadHistory = async () => {
  try { 
    const d = await apiCall(`/api/friday/history`);
    setHistory(d); 
  } catch {}
};

const generateBrief = async () => {
  setLoading(true); setBrief(null); setReadingIndex(-1); setIsReadingAll(false); readingRef.current = false;
  speak(lang === 'hi' ? 'Sir, intelligence gather कर रही हूँ। एक minute।' : 'Gathering intelligence sir. One moment.');
  try {
    const d = await apiCall(`/api/friday/brief?lang=${lang}`);
    if (mountedRef.current) { 
      setBrief(d); 
      speak(lang === 'hi' ? 'Sir, आपकी daily brief तैयार है।' : 'Sir, your daily brief is ready.'); 
      loadHistory(); 
    }
  } catch (e) { 
    speak(getErrorMessage(e, lang));
  } finally { 
    if (mountedRef.current) setLoading(false); 
  }
};
  const speakAndWait = (text) => new Promise((resolve) => {
    window.speechSynthesis?.cancel();
    const utter = new SpeechSynthesisUtterance(text);
    utter.lang = lang === 'hi' ? 'hi-IN' : 'en-IN';
    utter.rate = 0.95;
    utter.volume = 1;
    const voices = window.speechSynthesis?.getVoices() || [];
    const voice = lang === 'hi'
      ? voices.find(v => v.lang === 'hi-IN') || voices.find(v => v.lang?.startsWith('hi'))
      : voices.find(v => v.lang === 'en-IN') || voices.find(v => v.lang?.startsWith('en'));
    if (voice) utter.voice = voice;
    utter.onend = () => setTimeout(resolve, 500);
    utter.onerror = () => resolve();
    window.speechSynthesis?.speak(utter);
  });

  const readBriefAloud = async (sections) => {
    if (isReadingAll) {
      window.speechSynthesis?.cancel();
      setIsReadingAll(false); setReadingIndex(-1); readingRef.current = false;
      return;
    }
    setIsReadingAll(true); readingRef.current = true;
    await speakAndWait(lang === 'hi'
      ? 'Sir, aapki daily intelligence brief present kar rahi hoon.'
      : 'Sir, presenting your daily intelligence brief.');
    for (let i = 0; i < sections.length; i++) {
      if (!readingRef.current) break;
      setReadingIndex(i);
      const s = sections[i];
      const fullText = (lang === 'hi' ? `Section ${i + 1}. ${s.title}. ` : `${s.title}. `)
        + s.content
            .replace(/\*\*/g, '').replace(/\*/g, '').replace(/#{1,3}/g, '')
            .replace(/₹/g, ' rupees ').replace(/\$/g, ' dollars ')
            .replace(/\n- /g, '. ').replace(/- /g, '').replace(/\n+/g, '. ')
            .trim();
      await speakAndWait(fullText);
      if (!readingRef.current) break;
    }
    if (readingRef.current) {
      await speakAndWait(lang === 'hi'
        ? 'Brief complete ho gayi sir. Aaj ka din productive ho.'
        : 'Brief complete sir. Have a productive day.');
    }
    setIsReadingAll(false); setReadingIndex(-1); readingRef.current = false;
  };
const doSearch = async () => {
  if (!searchQ.trim()) return;
  setSearchLoading(true); setSearchResult(null);
  try {
    const d = await apiCall(`/api/friday/search`, {
      method: 'POST',
      body: JSON.stringify({ query: searchQ, lang }),
    });
    if (mountedRef.current) { setSearchResult(d); speak(d.analysis?.slice(0, 120)); }
  } catch (e) {
    speak(getErrorMessage(e, lang));
  } finally { 
    if (mountedRef.current) setSearchLoading(false); 
  }
};

  const inp = { width: '100%', background: 'rgba(0,10,5,0.8)', border: `0.5px solid ${C}30`, borderRadius: 5, padding: '10px 12px', fontSize: 13, color: '#b4ffdc', fontFamily: 'Rajdhani', outline: 'none' };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100%', background: '#020408', position: 'relative', overflow: 'hidden' }}>
      <div style={{ position: 'absolute', inset: 0, backgroundImage: `linear-gradient(${C}06 1px, transparent 1px), linear-gradient(90deg, ${C}06 1px, transparent 1px)`, backgroundSize: '40px 40px', pointerEvents: 'none' }} />

      <div style={{ padding: '10px 16px 8px', borderBottom: `0.5px solid ${C}15`, display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexShrink: 0, background: 'rgba(0,10,5,0.9)', position: 'relative', zIndex: 2 }}>
        <div>
          <div style={{ fontFamily: 'Orbitron', fontSize: 9, color: C, letterSpacing: 3, fontWeight: 700 }}>F.R.I.D.A.Y</div>
          <div style={{ fontFamily: 'Share Tech Mono', fontSize: 8, color: `${C}60`, letterSpacing: 2, marginTop: 2 }}>BUSINESS INTELLIGENCE · MARKET INFORMER</div>
        </div>
        <div style={{ display: 'flex', gap: 5 }}>
          {['brief', 'search', 'history'].map(m => (
            <button key={m} onClick={() => setMode(m)} style={{ fontSize: 8, padding: '3px 8px', borderRadius: 3, background: mode === m ? `${C}15` : 'transparent', border: `0.5px solid ${mode === m ? C : `${C}25`}`, color: mode === m ? C : `${C}60`, cursor: 'pointer', fontFamily: 'Orbitron', letterSpacing: 1 }}>{m.toUpperCase()}</button>
          ))}
        </div>
      </div>

      <div style={{ flex: 1, overflowY: 'auto', position: 'relative', zIndex: 1, scrollbarWidth: 'thin', scrollbarColor: `${C}30 transparent` }}>

        {mode === 'brief' && (
          <div style={{ padding: '14px' }}>
            {!brief && !loading && (
              <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 12, padding: '20px 0' }}>
                <FridayOrb size={90} />
                <div style={{ fontFamily: 'Share Tech Mono', fontSize: 9, color: `${C}50`, letterSpacing: 2, textAlign: 'center' }}>INTELLIGENCE SYSTEMS READY<br />AUTO-BRIEF: 7:30 AM IST DAILY</div>
                <button onClick={generateBrief} style={{ padding: '12px 28px', background: `${C}10`, border: `1px solid ${C}`, borderRadius: 8, color: C, fontSize: 11, fontFamily: 'Orbitron', letterSpacing: 2, cursor: 'pointer' }}>⚡ GENERATE BRIEF</button>
              </div>
            )}

            {loading && (
              <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 10, padding: '30px 0' }}>
                <FridayOrb size={90} pulse />
                <div style={{ fontFamily: 'Orbitron', fontSize: 9, color: C, letterSpacing: 3, animation: 'blink 1s infinite' }}>GATHERING INTELLIGENCE...</div>
                {['Scanning Upwork trends...', 'Checking market rates (₹)...', 'Reading tech news...', 'Analyzing your pipeline...', 'Generating brief...'].map((s, i) => (
                  <div key={i} style={{ fontFamily: 'Share Tech Mono', fontSize: 9, color: `${C}40`, letterSpacing: 1 }}>{s}</div>
                ))}
              </div>
            )}

            {brief && !loading && (
              <div>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
                  <div>
                    <div style={{ fontFamily: 'Orbitron', fontSize: 9, color: C, letterSpacing: 2 }}>DAILY INTELLIGENCE BRIEF</div>
                    <div style={{ fontFamily: 'Share Tech Mono', fontSize: 8, color: `${C}40`, marginTop: 2 }}>{brief.date} · {brief.time}</div>
                  </div>
                  <div style={{ display: 'flex', gap: 6 }}>
                    <button
                      onClick={() => readBriefAloud(parseBrief(brief.brief))}
                      style={{ padding: '6px 14px', background: isReadingAll ? `${C}25` : `${C}10`, border: `1px solid ${C}`, borderRadius: 5, color: C, fontSize: 9, fontFamily: 'Orbitron', cursor: 'pointer', letterSpacing: 1, animation: isReadingAll ? 'blink 1.5s infinite' : 'none' }}
                    >
                      {isReadingAll ? '⏹ STOP' : '▶ READ ALL'}
                    </button>
                    <button onClick={generateBrief} style={{ padding: '6px 10px', background: 'transparent', border: `0.5px solid ${C}30`, borderRadius: 4, color: `${C}60`, fontSize: 9, fontFamily: 'Orbitron', cursor: 'pointer' }}>↺</button>
                  </div>
                </div>
                {parseBrief(brief.brief).map((s, i) => (
                  <Section key={i} emoji={s.emoji} title={s.title} content={s.content} color={s.color} isReading={readingIndex === i} />
                ))}
                {isReadingAll && (
                  <div style={{ textAlign: 'center', padding: '10px', fontFamily: 'Share Tech Mono', fontSize: 9, color: `${C}50`, letterSpacing: 1 }}>
                    READING SECTION {readingIndex + 1} OF {parseBrief(brief.brief).length}...
                  </div>
                )}
              </div>
            )}
          </div>
        )}

        {mode === 'search' && (
          <div style={{ padding: '14px' }}>
            <div style={{ fontFamily: 'Orbitron', fontSize: 9, color: C, letterSpacing: 3, marginBottom: 12 }}>INTEL SEARCH</div>
            <div style={{ display: 'flex', gap: 8, marginBottom: 14 }}>
              <input value={searchQ} onChange={e => setSearchQ(e.target.value)} onKeyDown={e => e.key === 'Enter' && doSearch()} placeholder="e.g. React developer rates India 2026..." style={{ ...inp, flex: 1 }} />
              <button onClick={doSearch} disabled={!searchQ || searchLoading} style={{ width: 44, height: 44, borderRadius: 5, background: `${C}12`, border: `1px solid ${C}`, color: C, fontSize: 14, cursor: 'pointer', flexShrink: 0 }}>▶</button>
            </div>
            {['Upwork React rates India 2026', 'Node.js freelance demand 2026', 'AI developer market rates ₹', 'Best skills to learn 2026'].map(q => (
              <p key={q} onClick={() => setSearchQ(q)} style={{ fontSize: 12, color: `${C}60`, cursor: 'pointer', padding: '5px 10px', background: `${C}05`, border: `0.5px solid ${C}15`, borderRadius: 5, marginBottom: 5 }}>"{q}"</p>
            ))}
            {searchLoading && <p style={{ color: C, fontFamily: 'Share Tech Mono', fontSize: 10, animation: 'blink 1s infinite', textAlign: 'center', padding: '20px 0' }}>FRIDAY SCANNING...</p>}
            {searchResult && (
              <div style={{ marginTop: 14, background: `${C}06`, border: `0.5px solid ${C}20`, borderRadius: 8, padding: '12px' }}>
                <div style={{ fontFamily: 'Orbitron', fontSize: 8, color: C, letterSpacing: 2, marginBottom: 8 }}>AI ANALYSIS</div>
                <p style={{ fontSize: 13, color: 'rgba(180,255,220,0.8)', lineHeight: 1.8, userSelect: 'text' }}>{searchResult.analysis}</p>
              </div>
            )}
          </div>
        )}

        {mode === 'history' && (
          <div style={{ padding: '14px' }}>
            <div style={{ fontFamily: 'Orbitron', fontSize: 9, color: C, letterSpacing: 3, marginBottom: 12 }}>BRIEF ARCHIVE</div>
            {selected ? (
              <div>
                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 10 }}>
                  <span style={{ fontFamily: 'Share Tech Mono', fontSize: 9, color: `${C}60` }}>{selected.date}</span>
                  <button onClick={() => setSelected(null)} style={{ fontSize: 9, color: `${C}50`, background: 'transparent', border: 'none', cursor: 'pointer', fontFamily: 'Orbitron' }}>← LIST</button>
                </div>
                {parseBrief(selected.brief).map((s, i) => (
                  <Section key={i} emoji={s.emoji} title={s.title} content={s.content} color={s.color} isReading={false} />
                ))}
              </div>
            ) : history.length === 0 ? (
              <p style={{ textAlign: 'center', color: `${C}40`, fontFamily: 'Share Tech Mono', fontSize: 11, padding: '40px 0' }}>NO BRIEFS SAVED YET SIR</p>
            ) : history.map((h, i) => (
              <div key={i} onClick={() => setSelected(h)} style={{ background: `${C}05`, border: `0.5px solid ${C}15`, borderLeft: `2px solid ${C}`, borderRadius: 5, padding: '10px 12px', marginBottom: 6, cursor: 'pointer' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 4 }}>
                  <span style={{ fontFamily: 'Orbitron', fontSize: 9, color: C, letterSpacing: 1 }}>BRIEF</span>
                  <span style={{ fontFamily: 'Share Tech Mono', fontSize: 8, color: `${C}50` }}>{new Date(h.generated_at).toLocaleString('en-IN')}</span>
                </div>
                <p style={{ fontSize: 11, color: `${C}40`, lineHeight: 1.5 }}>{h.brief?.slice(0, 100)}...</p>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}