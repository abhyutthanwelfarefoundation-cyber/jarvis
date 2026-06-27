import React, { useState, useEffect, useRef } from 'react';
import { agentSpeak } from '../utils/agentVoices';

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:5001';
const C = '#ff3355';
const SC = { 'Active':'#00d4ff','On Hold':'#ff8800','Completed':'#00ff88','Cancelled':'#ff3355' };
const ALERT_COLOR = { overdue:'#ff3355', today:'#ff8800', tomorrow:'#ff8800', soon:'#ffcc00' };
const ALERT_ICON = { overdue:'🚨', today:'⚡', tomorrow:'⚠️', soon:'📅' };
const ALERT_LABEL = { overdue:'OVERDUE', today:'DUE TODAY', tomorrow:'DUE TOMORROW', soon:'days left' };

function StarkOrb({ size = 90 }) {
  const canvasRef = useRef(null); const frameRef = useRef(null); const aRef = useRef(0);
  useEffect(() => {
    const canvas = canvasRef.current; if (!canvas) return;
    const ctx = canvas.getContext('2d');
    const dpr = window.devicePixelRatio || 1, S = size;
    canvas.width = S * dpr; canvas.height = S * dpr; canvas.style.width = S + 'px'; canvas.style.height = S + 'px';
    ctx.scale(dpr, dpr); const cx = S / 2, cy = S / 2;
    const draw = () => {
      ctx.clearRect(0, 0, S, S); aRef.current += 0.018; const a = aRef.current;
      const gr = ctx.createRadialGradient(cx, cy, 0, cx, cy, S * 0.45);
      gr.addColorStop(0, 'rgba(255,51,85,0.2)'); gr.addColorStop(1, 'transparent');
      ctx.beginPath(); ctx.arc(cx, cy, S * 0.45, 0, Math.PI * 2); ctx.fillStyle = gr; ctx.fill();
      for (let i = 0; i < 20; i++) {
        const s = (i / 20) * Math.PI * 2 + a, e = s + (Math.PI * 2 / 20) * 0.7;
        ctx.beginPath(); ctx.arc(cx, cy, S * 0.42, s, e);
        ctx.lineWidth = S * 0.024; ctx.strokeStyle = C; ctx.globalAlpha = i % 4 === 0 ? 0.15 : 0.75; ctx.stroke();
      }
      ctx.globalAlpha = 1;
      const cg = ctx.createRadialGradient(cx, cy, 0, cx, cy, S * 0.1);
      cg.addColorStop(0, '#fff'); cg.addColorStop(0.3, C); cg.addColorStop(1, 'transparent');
      ctx.beginPath(); ctx.arc(cx, cy, S * 0.1, 0, Math.PI * 2); ctx.fillStyle = cg; ctx.fill();
      ctx.font = `900 ${S * 0.14}px Orbitron`; ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
      ctx.fillStyle = '#fff'; ctx.globalAlpha = 0.9; ctx.fillText('S', cx, cy); ctx.globalAlpha = 1;
      frameRef.current = requestAnimationFrame(draw);
    };
    draw(); return () => cancelAnimationFrame(frameRef.current);
  }, []);
  return <canvas ref={canvasRef} style={{ display: 'block' }} />;
}

export default function Stark({ jarvis }) {
  const { lang } = jarvis;
  const [mode, setMode] = useState('dashboard');
  const [projects, setProjects] = useState([]);
  const [summary, setSummary] = useState(null);
  const [selected, setSelected] = useState(null);
  const [loading, setLoading] = useState(false);
  const [alerts, setAlerts] = useState([]);
  const [chatMsgs, setChatMsgs] = useState([]);
  const [chatInput, setChatInput] = useState('');
  const [chatLoading, setChatLoading] = useState(false);
  const [newMilestone, setNewMilestone] = useState('');
  const mountedRef = useRef(true);
  const announcedRef = useRef(false);
  const timerRef = useRef(null);
  const [form, setForm] = useState({ name:'',description:'',deadline:'',status:'Active',priority:'Medium' });
  const speak = (t) => agentSpeak(t, lang, 'stark');

  useEffect(() => {
    mountedRef.current = true; window.speechSynthesis?.cancel();
    if (!announcedRef.current) {
      announcedRef.current = true;
      timerRef.current = setTimeout(() => {
        if (mountedRef.current) speak(lang === 'hi' ? 'STARK online हूँ सर।' : 'STARK online sir. All projects tracked.');
      }, 600);
    }
    loadProjects(); loadSummary(); checkAlerts();
    return () => { mountedRef.current = false; announcedRef.current = false; clearTimeout(timerRef.current); window.speechSynthesis?.cancel(); };
  }, []);

  const loadProjects = async () => {
    try { const r = await fetch(`${API_URL}/api/stark/projects`); const d = await r.json(); if (mountedRef.current) setProjects(Array.isArray(d)?d:[]); } catch {}
  };
  const loadSummary = async () => {
    try { const r = await fetch(`${API_URL}/api/stark/summary`); if (mountedRef.current) setSummary(await r.json()); } catch {}
  };
  const checkAlerts = async () => {
    try {
      const r = await fetch(`${API_URL}/api/stark/check-alerts`);
      const d = await r.json();
      if (mountedRef.current) {
        setAlerts(d.alerts || []);
        // Speak overdue alerts
        const overdue = (d.alerts || []).filter(a => a.type === 'overdue');
        if (overdue.length > 0) {
          setTimeout(() => speak(lang === 'hi'
            ? `Sir, ${overdue.length} project${overdue.length > 1 ? 's' : ''} overdue ${overdue.map(a => a.name).join(', ')}.`
            : `Sir, ${overdue.length} project${overdue.length > 1 ? 's are' : ' is'} overdue: ${overdue.map(a => a.name).join(', ')}.`
          ), 2000);
        }
      }
    } catch {}
  };
  const loadDetail = async (id) => {
    try { const r = await fetch(`${API_URL}/api/stark/projects/${id}`); if (mountedRef.current) setSelected(await r.json()); } catch {}
  };
  const addProject = async () => {
    if (!form.name.trim()) return; setLoading(true);
    try {
      await fetch(`${API_URL}/api/stark/projects`, { method:'POST', headers:{'Content-Type':'application/json'}, body:JSON.stringify(form) });
      setForm({ name:'',description:'',deadline:'',status:'Active',priority:'Medium' }); setMode('dashboard');
      loadProjects(); loadSummary(); checkAlerts();
      speak(lang==='hi'?`${form.name} add हो गया सर।`:`${form.name} added sir.`);
    } catch {} finally { if (mountedRef.current) setLoading(false); }
  };
  const updateProgress = async (id, progress) => {
    try { await fetch(`${API_URL}/api/stark/projects/${id}/progress`, { method:'PATCH', headers:{'Content-Type':'application/json'}, body:JSON.stringify({progress}) }); loadProjects(); if (selected?.id===id) loadDetail(id); checkAlerts(); } catch {}
  };
  const completeMilestone = async (id) => {
    try { await fetch(`${API_URL}/api/stark/milestones/${id}/complete`, { method:'PATCH' }); if (selected) loadDetail(selected.id); loadProjects(); } catch {}
  };
  const addMilestone = async () => {
    if (!newMilestone.trim()||!selected) return;
    try { await fetch(`${API_URL}/api/stark/projects/${selected.id}/milestones`, { method:'POST', headers:{'Content-Type':'application/json'}, body:JSON.stringify({title:newMilestone}) }); setNewMilestone(''); loadDetail(selected.id); } catch {}
  };
  const deleteProject = async (id) => {
    try { await fetch(`${API_URL}/api/stark/projects/${id}`, { method:'DELETE' }); setSelected(null); setMode('dashboard'); loadProjects(); loadSummary(); checkAlerts(); } catch {}
  };
  const sendChat = async () => {
    if (!chatInput.trim()) return; const msg = chatInput.trim(); setChatInput('');
    setChatMsgs(p=>[...p,{role:'user',text:msg}]); setChatLoading(true);
    try {
      const r = await fetch(`${API_URL}/api/stark/chat`, { method:'POST', headers:{'Content-Type':'application/json'}, body:JSON.stringify({message:msg,lang}) });
      const d = await r.json(); setChatMsgs(p=>[...p,{role:'stark',text:d.reply}]); speak(d.reply?.slice(0,100));
    } catch {} finally { if (mountedRef.current) setChatLoading(false); }
  };

  const isOverdue = (d) => d && new Date(d) < new Date();
  const inp = { width:'100%', background:'rgba(15,0,5,0.8)', border:`0.5px solid ${C}30`, borderRadius:5, padding:'10px 12px', fontSize:13, color:'#ffd0d8', fontFamily:'Rajdhani', outline:'none', marginBottom:8 };

  return (
    <div style={{ display:'flex', flexDirection:'column', height:'100%', background:'#020408', position:'relative', overflow:'hidden' }}>
      <div style={{ position:'absolute', inset:0, backgroundImage:`linear-gradient(${C}06 1px, transparent 1px), linear-gradient(90deg, ${C}06 1px, transparent 1px)`, backgroundSize:'40px 40px', pointerEvents:'none' }} />

      {/* Header */}
      <div style={{ padding:'10px 16px 8px', borderBottom:`0.5px solid ${C}15`, display:'flex', alignItems:'center', justifyContent:'space-between', flexShrink:0, background:'rgba(15,0,5,0.9)', position:'relative', zIndex:2 }}>
        <div>
          <div style={{ fontFamily:'Orbitron', fontSize:9, color:C, letterSpacing:3, fontWeight:700 }}>S.T.A.R.K</div>
          <div style={{ display:'flex', alignItems:'center', gap:8 }}>
            <div style={{ fontFamily:'Share Tech Mono', fontSize:8, color:`${C}60`, letterSpacing:2, marginTop:2 }}>
              {summary ? `${summary.active} ACTIVE · ${summary.avgProgress}% AVG` : 'BUILD OPS · PROJECT MANAGER'}
            </div>
            {alerts.length > 0 && (
              <div style={{ fontSize:8, padding:'1px 6px', background:'rgba(255,51,85,0.2)', border:'0.5px solid #ff3355', borderRadius:8, color:'#ff3355', fontFamily:'Orbitron', animation:'blink 2s infinite' }}>
                ⚠ {alerts.length}
              </div>
            )}
          </div>
        </div>
        <div style={{ display:'flex', gap:5 }}>
          {['dashboard','add','chat'].map(m=>(
            <button key={m} onClick={()=>setMode(m)} style={{ fontSize:8, padding:'3px 8px', borderRadius:3, background: mode===m?`${C}15`:'transparent', border:`0.5px solid ${mode===m?C:`${C}25`}`, color: mode===m?C:`${C}60`, cursor:'pointer', fontFamily:'Orbitron', letterSpacing:1 }}>{m.toUpperCase()}</button>
          ))}
        </div>
      </div>

      <div style={{ flex:1, overflowY:'auto', position:'relative', zIndex:1, scrollbarWidth:'thin', scrollbarColor:`${C}30 transparent` }}>

        {/* DASHBOARD */}
        {mode === 'dashboard' && (
          <div style={{ padding:'12px 14px' }}>
            {summary && (
              <div style={{ display:'flex', gap:6, marginBottom:14 }}>
                {[{val:summary.total,lbl:'TOTAL'},{val:summary.active,lbl:'ACTIVE'},{val:summary.completed,lbl:'DONE'},{val:`${summary.avgProgress}%`,lbl:'AVG'}].map(({val,lbl})=>(
                  <div key={lbl} style={{ flex:1, background:`${C}08`, border:`0.5px solid ${C}25`, borderRadius:5, padding:'8px 6px', textAlign:'center' }}>
                    <div style={{ fontFamily:'Orbitron', fontSize:15, fontWeight:900, color:C }}>{val}</div>
                    <div style={{ fontFamily:'Share Tech Mono', fontSize:7, color:`${C}60`, marginTop:2, letterSpacing:1 }}>{lbl}</div>
                  </div>
                ))}
              </div>
            )}

            {/* DEADLINE ALERTS */}
            {alerts.length > 0 && (
              <div style={{ marginBottom:14 }}>
                <div style={{ fontFamily:'Share Tech Mono', fontSize:8, color:'#ff3355', letterSpacing:2, marginBottom:8 }}>
                  ⚠ {alerts.length} DEADLINE ALERT{alerts.length > 1 ? 'S' : ''}
                </div>
                {alerts.map(a => (
                  <div key={a.id} style={{ background:`${ALERT_COLOR[a.type]}10`, border:`0.5px solid ${ALERT_COLOR[a.type]}`, borderRadius:5, padding:'8px 12px', marginBottom:6, animation: a.type==='overdue'?'blink 2s infinite':'none' }}>
                    <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center', marginBottom:5 }}>
                      <span style={{ fontSize:12, color:ALERT_COLOR[a.type], fontWeight:500 }}>{ALERT_ICON[a.type]} {a.name}</span>
                      <span style={{ fontFamily:'Share Tech Mono', fontSize:8, color:ALERT_COLOR[a.type], letterSpacing:1 }}>
                        {a.type === 'soon' ? `${a.daysLeft}d LEFT` : ALERT_LABEL[a.type]}
                      </span>
                    </div>
                    <div style={{ display:'flex', alignItems:'center', gap:8 }}>
                      <div style={{ flex:1, height:3, background:'rgba(255,255,255,0.05)', borderRadius:2, overflow:'hidden' }}>
                        <div style={{ height:'100%', width:`${a.progress}%`, background: a.progress>=80?'#00ff88':ALERT_COLOR[a.type], borderRadius:2 }} />
                      </div>
                      <span style={{ fontFamily:'Share Tech Mono', fontSize:8, color:`${ALERT_COLOR[a.type]}80`, flexShrink:0 }}>{a.progress}%</span>
                    </div>
                  </div>
                ))}
              </div>
            )}

            {projects.length === 0 ? (
              <div style={{ textAlign:'center', padding:'30px 20px' }}>
                <StarkOrb size={80} />
                <p style={{ color:`${C}40`, fontFamily:'Share Tech Mono', fontSize:10, margin:'12px 0' }}>NO PROJECTS YET SIR</p>
                <button onClick={()=>setMode('add')} style={{ padding:'9px 18px', background:`${C}10`, border:`1px solid ${C}`, borderRadius:5, color:C, fontSize:10, fontFamily:'Orbitron', cursor:'pointer' }}>+ INIT PROJECT</button>
              </div>
            ) : projects.map(p => {
              const sc = SC[p.status]||SC['Active'];
              const ov = isOverdue(p.deadline) && p.status !== 'Completed';
              const hasAlert = alerts.some(a => a.id === p.id);
              return (
                <div key={p.id} onClick={()=>{ loadDetail(p.id); setMode('detail'); }} style={{ background:`${hasAlert?'rgba(255,51,85,0.06)':sc+'06'}`, border:`0.5px solid ${ov?'#ff335530':`${sc}20`}`, borderLeft:`2px solid ${ov?'#ff3355':sc}`, borderRadius:5, padding:'11px 12px', marginBottom:8, cursor:'pointer' }}>
                  <div style={{ display:'flex', justifyContent:'space-between', marginBottom:5 }}>
                    <span style={{ fontSize:13, color:'#ffd0d8', fontWeight:500 }}>{p.name}</span>
                    <div style={{ display:'flex', gap:5, alignItems:'center' }}>
                      {ov && <span style={{ fontFamily:'Share Tech Mono', fontSize:7, color:'#ff3355', animation:'blink 1s infinite' }}>⚠ OVERDUE</span>}
                      <span style={{ fontFamily:'Share Tech Mono', fontSize:7, padding:'1px 6px', background:`${sc}15`, color:sc, border:`0.5px solid ${sc}40`, borderRadius:3 }}>{p.status.toUpperCase()}</span>
                    </div>
                  </div>
                  {p.description && <p style={{ fontSize:11, color:`${C}50`, marginBottom:7, lineHeight:1.4 }}>{p.description.slice(0,70)}{p.description.length>70?'...':''}</p>}
                  <div style={{ display:'flex', alignItems:'center', gap:8 }}>
                    <div style={{ flex:1, height:3, background:'rgba(255,255,255,0.06)', borderRadius:2, overflow:'hidden' }}>
                      <div style={{ height:'100%', borderRadius:2, width:`${p.progress||0}%`, background: p.progress>=100?'#00ff88':C, transition:'width 0.5s ease' }} />
                    </div>
                    <span style={{ fontFamily:'Share Tech Mono', fontSize:9, color:`${C}60`, flexShrink:0 }}>{p.progress||0}%</span>
                  </div>
                  {p.deadline && <p style={{ fontFamily:'Share Tech Mono', fontSize:7, color: ov?'#ff3355':`${C}40`, marginTop:4 }}>DUE: {new Date(p.deadline).toLocaleDateString('en-IN')}</p>}
                </div>
              );
            })}
          </div>
        )}

        {/* ADD */}
        {mode === 'add' && (
          <div style={{ padding:'16px' }}>
            <div style={{ fontFamily:'Orbitron', fontSize:9, color:C, letterSpacing:3, marginBottom:14 }}>INITIALIZE PROJECT</div>
            <input value={form.name} onChange={e=>setForm({...form,name:e.target.value})} placeholder="Project name *" style={inp} />
            <textarea value={form.description} onChange={e=>setForm({...form,description:e.target.value})} placeholder="Description..." rows={2} style={{...inp,resize:'vertical'}} />
            <input value={form.deadline} onChange={e=>setForm({...form,deadline:e.target.value})} type="date" style={inp} />
            <select value={form.priority} onChange={e=>setForm({...form,priority:e.target.value})} style={inp}>{['High','Medium','Low'].map(p=><option key={p} value={p}>{p} Priority</option>)}</select>
            <select value={form.status} onChange={e=>setForm({...form,status:e.target.value})} style={inp}>{['Active','On Hold','Completed','Cancelled'].map(s=><option key={s} value={s}>{s}</option>)}</select>
            <div style={{ display:'flex', gap:8 }}>
              <button onClick={()=>setMode('dashboard')} style={{ flex:1, padding:'10px', background:'transparent', border:`0.5px solid ${C}25`, borderRadius:5, color:`${C}50`, cursor:'pointer' }}>Cancel</button>
              <button onClick={addProject} disabled={loading||!form.name} style={{ flex:2, padding:'10px', background:`${C}12`, border:`1px solid ${C}`, borderRadius:5, color:C, fontFamily:'Orbitron', fontSize:9, letterSpacing:1, cursor:'pointer', opacity:!form.name?0.4:1 }}>
                {loading?'ADDING...':'+ INIT PROJECT'}
              </button>
            </div>
          </div>
        )}

        {/* DETAIL */}
        {mode === 'detail' && selected && (
          <div style={{ padding:'16px' }}>
            <div style={{ display:'flex', justifyContent:'space-between', marginBottom:12 }}>
              <span style={{ fontSize:14, color:'#ffd0d8', fontWeight:500 }}>{selected.name}</span>
              <button onClick={()=>setMode('dashboard')} style={{ padding:'4px 10px', background:'transparent', border:`0.5px solid ${C}25`, borderRadius:4, color:`${C}60`, fontSize:9, fontFamily:'Orbitron', cursor:'pointer' }}>← BACK</button>
            </div>
            {alerts.find(a=>a.id===selected.id) && (
              <div style={{ background:'rgba(255,51,85,0.1)', border:'1px solid #ff3355', borderRadius:6, padding:'8px 12px', marginBottom:12, fontFamily:'Share Tech Mono', fontSize:10, color:'#ff3355', textAlign:'center', animation:'blink 2s infinite' }}>
                {ALERT_ICON[alerts.find(a=>a.id===selected.id)?.type]} {alerts.find(a=>a.id===selected.id)?.type === 'overdue' ? `OVERDUE BY ${Math.abs(alerts.find(a=>a.id===selected.id)?.daysLeft)} DAYS` : `DUE ${ALERT_LABEL[alerts.find(a=>a.id===selected.id)?.type]}`}
              </div>
            )}
            <div style={{ background:`${C}06`, border:`0.5px solid ${C}20`, borderRadius:6, padding:'12px', marginBottom:12 }}>
              <div style={{ display:'flex', justifyContent:'space-between', marginBottom:8 }}>
                <span style={{ fontFamily:'Share Tech Mono', fontSize:8, color:`${C}60`, letterSpacing:1 }}>COMPLETION</span>
                <span style={{ fontFamily:'Orbitron', fontSize:14, fontWeight:900, color:C }}>{selected.progress||0}%</span>
              </div>
              <div style={{ height:5, background:'rgba(255,255,255,0.05)', borderRadius:3, overflow:'hidden', marginBottom:10 }}>
                <div style={{ height:'100%', borderRadius:3, width:`${selected.progress||0}%`, background: selected.progress>=100?'#00ff88':C, transition:'width 0.5s' }} />
              </div>
              <div style={{ display:'flex', gap:5 }}>
                {[0,25,50,75,100].map(p=>(
                  <button key={p} onClick={()=>updateProgress(selected.id,p)} style={{ flex:1, padding:'5px 3px', fontSize:9, background: selected.progress===p?`${C}20`:'transparent', border:`0.5px solid ${selected.progress===p?C:`${C}20`}`, borderRadius:3, color: selected.progress===p?C:`${C}40`, cursor:'pointer', fontFamily:'Orbitron' }}>{p}%</button>
                ))}
              </div>
            </div>
            <div style={{ fontFamily:'Share Tech Mono', fontSize:8, color:`${C}60`, letterSpacing:2, marginBottom:8 }}>
              MILESTONES ({selected.milestones?.filter(m=>m.completed).length||0}/{selected.milestones?.length||0})
            </div>
            {selected.milestones?.map(m=>(
              <div key={m.id} style={{ display:'flex', alignItems:'center', gap:10, background:`${C}05`, border:`0.5px solid ${C}15`, borderRadius:4, padding:'8px 10px', marginBottom:5 }}>
                <button onClick={()=>!m.completed&&completeMilestone(m.id)} disabled={m.completed} style={{ width:16, height:16, borderRadius:3, flexShrink:0, border: m.completed?'none':`1.5px solid ${C}40`, background: m.completed?`${C}50`:'transparent', cursor: m.completed?'default':'pointer', display:'flex', alignItems:'center', justifyContent:'center' }}>
                  {m.completed && <svg width="8" height="8" viewBox="0 0 10 10" fill="none" stroke="white" strokeWidth="2"><polyline points="1 5 4 8 9 2"/></svg>}
                </button>
                <span style={{ flex:1, fontSize:12, color: m.completed?`${C}30`:'#ffd0d8', textDecoration: m.completed?'line-through':'none' }}>{m.title}</span>
              </div>
            ))}
            <div style={{ display:'flex', gap:8, margin:'10px 0 14px' }}>
              <input value={newMilestone} onChange={e=>setNewMilestone(e.target.value)} onKeyDown={e=>e.key==='Enter'&&addMilestone()} placeholder="Add milestone..." style={{...inp,marginBottom:0,flex:1}} />
              <button onClick={addMilestone} disabled={!newMilestone} style={{ width:40, height:40, borderRadius:5, background:`${C}12`, border:`1px solid ${C}`, color:C, fontSize:18, cursor:'pointer', flexShrink:0 }}>+</button>
            </div>
            <button onClick={()=>deleteProject(selected.id)} style={{ width:'100%', padding:'10px', background:'rgba(255,51,85,0.05)', border:'0.5px solid rgba(255,51,85,0.2)', borderRadius:5, color:'#ff3355', fontSize:9, fontFamily:'Orbitron', letterSpacing:1, cursor:'pointer' }}>🗑 TERMINATE PROJECT</button>
          </div>
        )}

        {/* CHAT */}
        {mode === 'chat' && (
          <div style={{ padding:'16px', display:'flex', flexDirection:'column', minHeight:350 }}>
            <div style={{ fontFamily:'Share Tech Mono', fontSize:8, color:`${C}50`, letterSpacing:2, marginBottom:14, textAlign:'center' }}>STARK INTELLIGENCE · BUILD OPS ANALYSIS</div>
            <div style={{ flex:1, display:'flex', flexDirection:'column', gap:8, marginBottom:12 }}>
              {chatMsgs.length===0 && ["What's overdue?","Overall progress?","Which needs attention?"].map(q=>(
                <p key={q} onClick={()=>setChatInput(q)} style={{ fontSize:12, color:C, cursor:'pointer', padding:'6px 10px', background:`${C}06`, border:`0.5px solid ${C}20`, borderRadius:5 }}>"{q}"</p>
              ))}
              {chatMsgs.map((m,i)=>(
                <div key={i} style={{ maxWidth:'88%', padding:'8px 12px', borderRadius:8, background: m.role==='user'?`${C}08`:'rgba(15,0,5,0.9)', border:`0.5px solid ${C}20`, color:'#ffd0d8', alignSelf: m.role==='user'?'flex-end':'flex-start', fontSize:13, lineHeight:1.5 }}>{m.text}</div>
              ))}
              {chatLoading && <div style={{ alignSelf:'flex-start', padding:'8px 12px', background:`${C}08`, border:`0.5px solid ${C}20`, borderRadius:8, fontSize:9, color:C, fontFamily:'Orbitron', animation:'blink 1s infinite' }}>STARK COMPUTING...</div>}
            </div>
            <div style={{ display:'flex', gap:8 }}>
              <input value={chatInput} onChange={e=>setChatInput(e.target.value)} onKeyDown={e=>e.key==='Enter'&&sendChat()} placeholder="Ask STARK..." style={{...inp,marginBottom:0,flex:1}} />
              <button onClick={sendChat} disabled={!chatInput||chatLoading} style={{ width:40, height:40, borderRadius:5, background:`${C}12`, border:`1px solid ${C}`, color:C, fontSize:14, cursor:'pointer', flexShrink:0 }}>▶</button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}