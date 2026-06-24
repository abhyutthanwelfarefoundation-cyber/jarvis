import React, { useState, useEffect, useRef } from 'react';
import { agentSpeakThen, cancelAgentSpeech } from '../utils/agentVoices';

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:5001';
const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;

const AGENTS = [
  { id: 'jarvis', name: 'JARVIS', color: '#00d4ff', glow: 'rgba(0,212,255,0.3)',  role: 'Prime Orchestrator',  icon: 'J' },
  { id: 'friday', name: 'FRIDAY', color: '#00ff88', glow: 'rgba(0,255,136,0.3)',  role: 'Daily Intelligence',  icon: 'F' },
  { id: 'harold', name: 'HAROLD', color: '#ff8800', glow: 'rgba(255,136,0,0.3)',  role: 'Whisper Prime',       icon: 'H' },
  { id: 'zeus',   name: 'ZEUS',   color: '#aa55ff', glow: 'rgba(170,85,255,0.3)', role: 'Apex Pipeline CRM',   icon: 'Z' },
  { id: 'stark',  name: 'STARK',  color: '#ff3355', glow: 'rgba(255,51,85,0.3)',  role: 'Build Ops',           icon: 'S' },
];

function buildLine(id, data, lang) {
  const d = data || {};
  const en = {
    jarvis: `JARVIS online sir. Prime orchestrator active. ${d.tasks > 0 ? `${d.tasks} tasks scheduled today.` : 'All systems nominal.'}`,
    friday: `FRIDAY reporting. Daily intelligence ready. ${d.tasks > 0 ? `${d.tasks} tasks on your schedule.` : 'No tasks scheduled today.'} Morning brief compiled.`,
    harold: `HAROLD online. Whisper Prime ready. ${d.meetings > 0 ? `${d.meetings} meetings on record.` : 'No meetings recorded yet.'} Transcription standby.`,
    zeus:   `ZEUS online sir. Apex pipeline live. ${d.leads > 0 ? `${d.leads} leads in system, ${d.activeleads} active.` : 'CRM pipeline ready. No leads yet.'}`,
    stark:  `STARK online sir. ${d.projects > 0 ? `Tracking ${d.projects} projects, ${d.activeProjects} active.` : 'No projects yet. Ready to track.'} What are we building?`,
  };
  const hi = {
    jarvis: `JARVIS online हूँ सर। सभी systems ready हैं। ${d.tasks > 0 ? `आज ${d.tasks} tasks scheduled हैं।` : 'सब normal है।'}`,
    friday: `FRIDAY यहाँ हूँ सर। ${d.tasks > 0 ? `आज ${d.tasks} tasks हैं।` : 'आज कोई task नहीं है।'} Morning brief तैयार है।`,
    harold: `HAROLD reporting कर रही हूँ सर। ${d.meetings > 0 ? `${d.meetings} meetings record हैं।` : 'अभी कोई meeting नहीं है।'} Ready हूँ।`,
    zeus:   `ZEUS online हूँ सर। ${d.leads > 0 ? `${d.leads} leads हैं, ${d.activeleads} active।` : 'Pipeline ready है।'}`,
    stark:  `STARK online हूँ सर। ${d.projects > 0 ? `${d.projects} projects track कर रहा हूँ।` : 'अभी कोई project नहीं है।'} Ready हूँ।`,
  };
  return lang === 'hi' ? hi[id] : en[id];
}

/* jarvis prop is the SAME object returned by useJarvis() — passed down
   from Home.jsx so this overlay can use voice without its own separate
   speech stack. Specifically uses:
     - startWakeWordListener / stopWakeWordListener (pause/resume bg listener)
     - activateMic (arms hands-free + opens mic, used for auto-listen at PROCEED)
     - conversationMode (whether hands-free is already on)
*/
export default function AssembleSequence({ lang = 'en', onClose, jarvis }) {
  const [step, setStep]       = useState(-1);
  const [done, setDone]       = useState(false);
  const [data, setData]       = useState({});
  const [activeLine, setActiveLine] = useState('Initializing all systems...');
  const mountedRef  = useRef(true);
  const startedRef  = useRef(false);
  const tickRef     = useRef(null);
  const skipRecRef  = useRef(null); // dedicated recognizer just for "skip" command during ceremony

  const { stopWakeWordListener, startWakeWordListener, activateMic, conversationMode } = jarvis || {};

  const TICKER_LINES = [
    'SYSTEM DIAGNOSTICS RUNNING', 'ALL MODULES LOADING',
    'NEURAL LINK ESTABLISHED', 'ENCRYPTION ACTIVE',
    'SCANNING DATABASES', 'SECURE CHANNEL OPEN',
    'VOICE SYNTHESIS READY', 'THREAT LEVEL: NONE',
  ];
  const tickIdx = useRef(0);
  useEffect(() => {
    tickRef.current = setInterval(() => {
      tickIdx.current = (tickIdx.current + 1) % TICKER_LINES.length;
      if (mountedRef.current) setActiveLine(TICKER_LINES[tickIdx.current]);
    }, 1800);
    return () => clearInterval(tickRef.current);
  }, []);

  /* ── "Skip" voice command, active only while the ceremony is running ──
     Runs its OWN lightweight recognizer, started with a short delay after
     mount so it doesn't race the main app's stopWakeWordListener() abort —
     starting both in the same render pass could cause Chrome to silently
     fail to grant the mic to this second instance. */
  useEffect(() => {
    if (!SpeechRecognition) { console.log('[Assemble] SpeechRecognition not supported'); return; }
    if (done) return;

    let rec = null;
    let cancelled = false;

    const startDelay = setTimeout(() => {
      if (cancelled || !mountedRef.current) return;

      rec = new SpeechRecognition();
      skipRecRef.current = rec;
      rec.lang = 'en-IN';
      rec.continuous = true;
      rec.interimResults = true;

      rec.onstart = () => console.log('[Assemble] skip/proceed listener ACTIVE');

      rec.onresult = (e) => {
        const text = Array.from(e.results).map(r => r[0].transcript).join(' ').toLowerCase();
        console.log('[Assemble] heard:', text);
        if (/\bskip\b/.test(text)) {
          console.log('[Assemble] SKIP matched');
          try { rec.onend = null; rec.stop(); } catch {}
          handleClose();
        } else if (/\bproceed\b/.test(text) && done) {
          console.log('[Assemble] PROCEED matched (voice)');
          try { rec.onend = null; rec.stop(); } catch {}
          handleClose();
        }
      };
      rec.onerror = (e) => console.log('[Assemble] skip listener error:', e.error);
      rec.onend = () => {
        console.log('[Assemble] skip listener ended, restarting if still needed');
        if (!done && mountedRef.current && !cancelled) {
          try { rec.start(); } catch (err) { console.log('[Assemble] restart failed:', err); }
        }
      };

      try {
        rec.start();
      } catch (err) {
        console.log('[Assemble] skip listener start failed:', err);
      }
    }, 600); // wait for stopWakeWordListener's abort to actually settle first

    return () => {
      cancelled = true;
      clearTimeout(startDelay);
      try { if (rec) { rec.onend = null; rec.abort(); } } catch {}
      skipRecRef.current = null;
    };
  }, [done]);

  useEffect(() => {
    mountedRef.current = true;
    if (startedRef.current) return;
    startedRef.current = true;

    // Pause the app's main wake-word listener for the whole ceremony —
    // it would otherwise collide with agentSpeakThen's TTS queue exactly
    // like it did with Harold's greeting.
    try { stopWakeWordListener?.(); } catch {}

    window.speechSynthesis?.cancel();
    window.speechSynthesis?.getVoices();

    fetchData().then(d => {
      if (!mountedRef.current) return;
      setData(d);
      setTimeout(() => {
        if (mountedRef.current) runGreeting(d);
      }, 600);
    });

    return () => {
      mountedRef.current = false;
      cancelAgentSpeech(); // kill any in-flight chain on unmount, not just on explicit skip/close
      try { skipRecRef.current?.abort(); } catch {}
    };
  }, []);

  const fetchData = async () => {
    try {
      const [leads, projects, meetings, tasks] = await Promise.all([
        fetch(`${API_URL}/api/zeus/summary`).then(r => r.json()).catch(() => ({})),
        fetch(`${API_URL}/api/stark/summary`).then(r => r.json()).catch(() => ({})),
        fetch(`${API_URL}/api/harold/meetings`).then(r => r.json()).catch(() => []),
        fetch(`${API_URL}/api/tasks/today`).then(r => r.json()).catch(() => []),
      ]);
      return {
        leads:         leads?.total       || 0,
        activeleads:   leads?.active      || 0,
        projects:      projects?.total    || 0,
        activeProjects:projects?.active   || 0,
        meetings:      Array.isArray(meetings) ? meetings.length : 0,
        tasks:         Array.isArray(tasks)    ? tasks.length    : 0,
      };
    } catch { return {}; }
  };

  const runGreeting = (d) => {
    if (!mountedRef.current) return;
    const text = lang === 'hi'
      ? 'Welcome back Naman sir। सभी agents assemble हो रहे हैं।'
      : 'Welcome back Naman sir. All agents assembling now.';
    agentSpeakThen(text, lang, 'jarvis', () => {
      if (mountedRef.current) runAgent(0, d);
    });
  };

  const runAgent = (i, d) => {
    if (!mountedRef.current) return;
    if (i >= AGENTS.length) { runFinal(d); return; }
    setStep(i);
    agentSpeakThen(buildLine(AGENTS[i].id, d, lang), lang, AGENTS[i].id, () => {
      if (mountedRef.current) runAgent(i + 1, d);
    });
  };

  const runFinal = (d) => {
    if (!mountedRef.current) return;
    setStep(AGENTS.length);
    const text = lang === 'hi'
      ? `सभी 5 agents assembled हैं Naman सर। System full operational है। आपके orders क्या हैं?`
      : `All 5 agents assembled Naman sir. System at full operational capacity. Awaiting your orders.`;
    agentSpeakThen(text, lang, 'jarvis', () => {
      if (!mountedRef.current) return;
      setDone(true);
      // NOTE: voice control for this screen ("skip" / "proceed") is handled
      // entirely by the single recognizer above — no separate activateMic()
      // call here anymore, since running two recognizers at once on this
      // screen was exactly the "two listeners fighting for one mic" bug.
      // Once the user says "proceed" (or clicks it), handleClose() arms the
      // MAIN app's hands-free loop via startWakeWordListener().
    });
  };

  const handleClose = () => {
    // THE FIX: cancelAgentSpeech() bumps the module-level token, which
    // makes any in-flight agentSpeakThen chain die at its next callback
    // check — this is what actually stops agents from continuing to
    // speak in the background after skip/navigation, since plain
    // window.speechSynthesis.cancel() only stops the CURRENT utterance,
    // not the chain of pending setTimeout/onend callbacks queuing more.
    cancelAgentSpeech();
    try {
      if (skipRecRef.current) skipRecRef.current.onend = null;
      skipRecRef.current?.abort();
    } catch {}
    // Hand off to the main app's hands-free system — activateMic() arms
    // full conversation mode AND opens the mic in one step, so the user
    // can speak their next command immediately without saying "jarvis"
    // again. Works whether we got here via skip, voice "proceed", or
    // clicking the PROCEED button.
    setTimeout(() => { try { activateMic?.(); } catch {} }, 350);
    onClose?.();
  };

  const onlineCount = step >= AGENTS.length ? AGENTS.length : step >= 0 ? step + 1 : 0;
  const progress = (onlineCount / AGENTS.length) * 100;
  const allDone = step >= AGENTS.length;

  return (
    <div style={{
      position: 'fixed', inset: 0, zIndex: 500,
      background: '#020408',
      display: 'flex', flexDirection: 'column',
      alignItems: 'center', justifyContent: 'center',
      fontFamily: 'Orbitron, monospace',
      overflow: 'hidden',
    }}>

      <div style={{
        position: 'absolute', inset: 0, pointerEvents: 'none',
        background: 'repeating-linear-gradient(0deg, transparent, transparent 2px, rgba(0,212,255,0.015) 2px, rgba(0,212,255,0.015) 4px)',
        zIndex: 1,
      }} />

      {[
        { top: 20, left: 20,  borderTop: '1px solid #00d4ff', borderLeft: '1px solid #00d4ff' },
        { top: 20, right: 20, borderTop: '1px solid #00d4ff', borderRight: '1px solid #00d4ff' },
        { bottom: 20, left: 20,  borderBottom: '1px solid #00d4ff', borderLeft: '1px solid #00d4ff' },
        { bottom: 20, right: 20, borderBottom: '1px solid #00d4ff', borderRight: '1px solid #00d4ff' },
      ].map((s, i) => (
        <div key={i} style={{ position: 'absolute', width: 28, height: 28, opacity: 0.5, ...s }} />
      ))}

      <div style={{
        position: 'absolute', top: 0, left: 0, right: 0,
        height: 28, background: 'rgba(0,212,255,0.05)',
        borderBottom: '0.5px solid rgba(0,212,255,0.2)',
        display: 'flex', alignItems: 'center',
        padding: '0 20px', gap: 16, zIndex: 2,
        overflow: 'hidden',
      }}>
        <span style={{ fontSize: 8, color: '#00d4ff', letterSpacing: 2, opacity: 0.6, whiteSpace: 'nowrap' }}>
          ▶ {activeLine}
        </span>
        <div style={{ flex: 1, height: '0.5px', background: 'rgba(0,212,255,0.15)' }} />
        <span style={{ fontSize: 8, color: 'rgb(0, 255, 136)', letterSpacing: 1, whiteSpace: 'nowrap', fontFamily: 'Share Tech Mono' }}>
          🎙 SAY "SKIP" TO SKIP
        </span>
        <span style={{ fontSize: 10, color: 'rgb(0, 213, 255)', letterSpacing: 1, whiteSpace: 'nowrap', fontFamily: 'Share Tech Mono' }}>
          {new Date().toLocaleTimeString()}
        </span>
      </div>

      <div style={{ position: 'relative', zIndex: 2, width: '100%', maxWidth: 480, padding: '0 24px' }}>

        <div style={{ textAlign: 'center', marginBottom: 28 }}>
          <div style={{ fontSize: 9, color: 'rgb(0, 213, 255)', letterSpacing: 4, marginBottom: 8 }}>
            {allDone ? '● ALL SYSTEMS ACTIVE' : step === -1 ? '○ INITIALIZING' : `● ASSEMBLING [${onlineCount}/${AGENTS.length}]`}
          </div>
          <div style={{
            fontSize: 24, fontWeight: 900, letterSpacing: 6,
            color: allDone ? '#00ff88' : '#00d4ff',
            textShadow: `0 0 30px ${allDone ? 'rgba(0,255,136,0.5)' : 'rgba(0,212,255,0.5)'}`,
          }}>
            AGENTS ASSEMBLE
          </div>
        </div>

        <div style={{ display: 'flex', flexDirection: 'column', gap: 6, marginBottom: 20 }}>
          {AGENTS.map((agent, i) => {
            const online   = step >= i || allDone;
            const speaking = step === i;
            return (
              <div key={agent.id} style={{
                display: 'flex', alignItems: 'center', gap: 12,
                padding: '10px 14px',
                background: online ? `${agent.color}0d` : 'rgba(255,255,255,0.02)',
                border: `0.5px solid ${online ? agent.color + '50' : 'rgba(255,255,255,0.06)'}`,
                borderLeft: `2px solid ${online ? agent.color : 'rgba(255,255,255,0.06)'}`,
                borderRadius: 10,
                transition: 'all 0.4s ease',
                boxShadow: speaking ? `0 0 20px ${agent.glow}` : 'none',
                opacity: online ? 1 : 0.25,
                transform: speaking ? 'scale(1.01) translateX(2px)' : 'scale(1)',
              }}>
                <div style={{
                  width: 32, height: 32, borderRadius: '50%', flexShrink: 0,
                  background: online ? `${agent.color}18` : 'rgba(255,255,255,0.04)',
                  border: `1px solid ${online ? agent.color + '60' : 'rgba(255,255,255,0.08)'}`,
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  fontFamily: 'Orbitron', fontWeight: 900, fontSize: 12,
                  color: online ? agent.color : 'rgba(255,255,255,0.2)',
                  boxShadow: speaking ? `0 0 12px ${agent.glow}` : 'none',
                  animation: speaking ? 'blink 0.6s infinite' : 'none',
                  transition: 'all 0.4s',
                }}>
                  {agent.icon}
                </div>

                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                    <span style={{
                      fontFamily: 'Orbitron', fontSize: 11, fontWeight: 700, letterSpacing: 1.5,
                      color: online ? agent.color : 'rgba(255,255,255,0.2)',
                      transition: 'color 0.4s',
                    }}>{agent.name}</span>
                    {speaking && (
                      <div style={{ display: 'flex', gap: 2, alignItems: 'center' }}>
                        {[0,1,2,3].map(j => (
                          <div key={j} style={{
                            width: 2, height: `${6 + j * 3}px`, borderRadius: 1,
                            background: agent.color, opacity: 0.8,
                            animation: `blink ${0.4 + j * 0.1}s ease infinite alternate`,
                          }} />
                        ))}
                      </div>
                    )}
                  </div>
                  <div style={{
                    fontFamily: 'Share Tech Mono', fontSize: 9, letterSpacing: 1,
                    color: online ? 'rgba(232,244,255,0.45)' : 'rgba(255,255,255,0.12)',
                    marginTop: 2, transition: 'color 0.4s',
                  }}>{agent.role}</div>
                </div>

                <div style={{
                  fontFamily: 'Share Tech Mono', fontSize: 8, letterSpacing: 1.5,
                  padding: '3px 8px', borderRadius: 4,
                  background: online ? `${agent.color}15` : 'transparent',
                  border: `0.5px solid ${online ? agent.color + '50' : 'rgba(255,255,255,0.08)'}`,
                  color: online ? agent.color : 'rgba(255,255,255,0.15)',
                  transition: 'all 0.4s', whiteSpace: 'nowrap',
                }}>
                  {speaking ? '● LIVE' : online ? 'ONLINE' : 'STANDBY'}
                </div>
              </div>
            );
          })}
        </div>

        <div style={{ marginBottom: 20 }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 6 }}>
            <span style={{ fontFamily: 'Share Tech Mono', fontSize: 9, color: 'rgba(232,244,255,0.35)', letterSpacing: 1 }}>
              AGENTS ONLINE
            </span>
            <span style={{ fontFamily: 'Share Tech Mono', fontSize: 9, color: '#00d4ff', letterSpacing: 1 }}>
              {onlineCount} / {AGENTS.length}
            </span>
          </div>
          <div style={{ height: 4, background: 'rgba(255,255,255,0.05)', borderRadius: 2, overflow: 'hidden' }}>
            <div style={{
              height: '100%', borderRadius: 2,
              width: `${progress}%`,
              background: allDone
                ? 'linear-gradient(90deg, #00d4ff, #00ff88)'
                : '#00d4ff',
              boxShadow: `0 0 8px rgba(0,212,255,0.5)`,
              transition: 'width 0.6s ease',
            }} />
          </div>
          <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: 4 }}>
            {AGENTS.map((_, i) => (
              <div key={i} style={{
                width: 2, height: 4, borderRadius: 1,
                background: i < onlineCount ? '#00d4ff' : 'rgba(255,255,255,0.1)',
                transition: 'background 0.4s',
              }} />
            ))}
          </div>
        </div>

        {allDone && (
          <div style={{
            textAlign: 'center',
            animation: 'fadeUp 0.5s ease forwards',
            padding: '16px 0',
          }}>
            <div style={{
              fontFamily: 'Share Tech Mono', fontSize: 11,
              color: '#00ff88', letterSpacing: 1, marginBottom: 16,
              lineHeight: 1.6,
            }}>
              {lang === 'hi'
                ? 'सभी agents assembled हैं Naman सर। System fully operational है।'
                : 'All agents assembled. System at full operational capacity.'}
            </div>
            {done && (
              <>
                <div style={{
                  fontFamily: 'Share Tech Mono', fontSize: 9, color: 'rgba(0,255,136,0.6)',
                  letterSpacing: 1, marginBottom: 10, animation: 'blink 1.2s infinite',
                }}>
                  🎙 SAY "PROCEED" OR CLICK BELOW
                </div>
                <button onClick={handleClose} style={{
                  fontFamily: 'Orbitron', fontSize: 10, fontWeight: 700,
                  letterSpacing: 2, padding: '11px 32px',
                  background: 'rgba(0,255,136,0.1)',
                  border: '1px solid #00ff88', borderRadius: 8,
                  color: '#00ff88', cursor: 'pointer',
                  boxShadow: '0 0 20px rgba(0,255,136,0.2)',
                  transition: 'all 0.2s',
                }}>
                  PROCEED →
                </button>
              </>
            )}
          </div>
        )}
      </div>

      {!done && (
        <button onClick={handleClose} style={{
          position: 'absolute', bottom: 24, right: 24, zIndex: 3,
          fontFamily: 'Share Tech Mono', fontSize: 10,
          padding: '6px 14px', background: 'transparent',
          border: '0.5px solid rgba(0,212,255,0.2)', borderRadius: 6,
          color: 'rgba(232,244,255,0.3)', cursor: 'pointer',
          letterSpacing: 1,
        }}>SKIP</button>
      )}
    </div>
  );
}