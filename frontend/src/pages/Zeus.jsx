import React, { useState, useEffect, useRef } from 'react';
import { agentSpeak } from '../utils/agentVoices';

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:5001';
const C = '#aa55ff';
const STAGES = ['New','Contacted','Qualified','Proposal','Closed Won','Closed Lost'];
const SC = { 'New':'#00d4ff','Contacted':'#aa55ff','Qualified':'#ff8800','Proposal':'#00ff88','Closed Won':'#00cc55','Closed Lost':'#ff3355' };

function ZeusOrb({ size = 90, pulse = false }) {
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
      ctx.clearRect(0, 0, S, S); aRef.current += pulse ? 0.04 : 0.015; const a = aRef.current;
      const gr = ctx.createRadialGradient(cx, cy, 0, cx, cy, S * 0.45);
      gr.addColorStop(0, `rgba(170,85,255,${pulse ? 0.3 : 0.15})`); gr.addColorStop(1, 'transparent');
      ctx.beginPath(); ctx.arc(cx, cy, S * 0.45, 0, Math.PI * 2); ctx.fillStyle = gr; ctx.fill();
      for (let i = 0; i < 22; i++) {
        const s = (i / 22) * Math.PI * 2 + a, e = s + (Math.PI * 2 / 22) * 0.68;
        ctx.beginPath(); ctx.arc(cx, cy, S * 0.42, s, e);
        ctx.lineWidth = S * 0.023; ctx.strokeStyle = C; ctx.globalAlpha = i % 5 === 0 ? 0.15 : 0.7; ctx.stroke();
      }
      ctx.globalAlpha = 1;
      const cg = ctx.createRadialGradient(cx, cy, 0, cx, cy, S * 0.1);
      cg.addColorStop(0, '#fff'); cg.addColorStop(0.3, C); cg.addColorStop(1, 'transparent');
      ctx.beginPath(); ctx.arc(cx, cy, S * 0.1, 0, Math.PI * 2); ctx.fillStyle = cg; ctx.fill();
      ctx.font = `900 ${S * 0.14}px Orbitron`; ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
      ctx.fillStyle = '#fff'; ctx.globalAlpha = 0.9; ctx.fillText('Z', cx, cy); ctx.globalAlpha = 1;
      frameRef.current = requestAnimationFrame(draw);
    };
    draw();
    return () => cancelAnimationFrame(frameRef.current);
  }, [pulse]);
  return <canvas ref={canvasRef} style={{ display: 'block' }} />;
}

export default function Zeus({ jarvis }) {
  const { lang } = jarvis;
  const [mode, setMode] = useState('pipeline');
  const [leads, setLeads] = useState([]);
  const [summary, setSummary] = useState(null);
  const [loading, setLoading] = useState(false);
  const [selected, setSelected] = useState(null);
  const [search, setSearch] = useState('');
  const [filterStage, setFilterStage] = useState('');
  const [chatMsgs, setChatMsgs] = useState([]);
  const [chatInput, setChatInput] = useState('');
  const [chatLoading, setChatLoading] = useState(false);
  const [form, setForm] = useState({ name:'',company:'',phone:'',email:'',value:'',stage:'New',notes:'' });
  // Lead Engine state
  const [scanning, setScanning] = useState(false);
  const [gigs, setGigs] = useState([]);
  const [selectedGig, setSelectedGig] = useState(null);
  const [customSkill, setCustomSkill] = useState('');
  const [customSkills, setCustomSkills] = useState([]);
  const [lastScanned, setLastScanned] = useState(null);
  const [draftingFor, setDraftingFor] = useState(null);

  const mountedRef = useRef(true);
  const announcedRef = useRef(false);
  const timerRef = useRef(null);
  const speak = (t) => agentSpeak(t, lang, 'zeus');

  useEffect(() => {
    mountedRef.current = true; window.speechSynthesis?.cancel();
    if (!announcedRef.current) {
      announcedRef.current = true;
      timerRef.current = setTimeout(() => { if (mountedRef.current) speak(lang === 'hi' ? 'ZEUS online हूँ सर।' : 'ZEUS online sir. Lead engine ready.'); }, 600);
    }
    loadLeads(); loadSummary();
    return () => { mountedRef.current = false; announcedRef.current = false; clearTimeout(timerRef.current); window.speechSynthesis?.cancel(); };
  }, []);

  const loadLeads = async () => {
    try {
      let url = `${API_URL}/api/zeus/leads?`;
      if (filterStage) url += `stage=${filterStage}&`;
      if (search) url += `search=${search}&`;
      const r = await fetch(url); const d = await r.json();
      if (mountedRef.current) setLeads(Array.isArray(d) ? d : []);
    } catch {}
  };
  const loadSummary = async () => {
    try { const r = await fetch(`${API_URL}/api/zeus/summary`); if (mountedRef.current) setSummary(await r.json()); } catch {}
  };
  const addLead = async () => {
    if (!form.name.trim()) return; setLoading(true);
    try {
      await fetch(`${API_URL}/api/zeus/leads`, { method:'POST', headers:{'Content-Type':'application/json'}, body: JSON.stringify({...form, value: parseFloat(form.value)||0}) });
      setForm({ name:'',company:'',phone:'',email:'',value:'',stage:'New',notes:'' }); setMode('pipeline');
      loadLeads(); loadSummary(); speak(lang === 'hi' ? `${form.name} add हो गया सर।` : `${form.name} added sir.`);
    } catch {} finally { if (mountedRef.current) setLoading(false); }
  };
  const updateStage = async (id, stage) => {
    try { await fetch(`${API_URL}/api/zeus/leads/${id}/stage`, { method:'PATCH', headers:{'Content-Type':'application/json'}, body: JSON.stringify({stage}) }); loadLeads(); loadSummary(); } catch {}
  };
  const deleteLead = async (id) => {
    try { await fetch(`${API_URL}/api/zeus/leads/${id}`, { method:'DELETE' }); setSelected(null); setMode('pipeline'); loadLeads(); loadSummary(); } catch {}
  };
  const sendChat = async () => {
    if (!chatInput.trim()) return; const msg = chatInput.trim(); setChatInput('');
    setChatMsgs(p => [...p, { role:'user', text:msg }]); setChatLoading(true);
    try {
      const r = await fetch(`${API_URL}/api/zeus/chat`, { method:'POST', headers:{'Content-Type':'application/json'}, body: JSON.stringify({message:msg, lang}) });
      const d = await r.json(); setChatMsgs(p => [...p, { role:'zeus', text:d.reply }]); speak(d.reply?.slice(0,100));
    } catch {} finally { if (mountedRef.current) setChatLoading(false); }
  };

  // ── Lead Engine ──
  const runScan = async () => {
    setScanning(true); setGigs([]); setSelectedGig(null);
    speak(lang === 'hi' ? 'Sir, Upwork scan शुरू कर रहा हूँ।' : 'Sir, scanning Upwork for gigs now.');
    try {
      const r = await fetch(`${API_URL}/api/zeus/scan`, {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ customSkills, lang }),
      });
      const d = await r.json();
      if (mountedRef.current) {
        setGigs(d.gigs || []);
        setLastScanned(new Date());
        speak(lang === 'hi' ? `Sir, ${d.total} gigs मिले Upwork पर।` : `Sir, found ${d.total} gigs on Upwork.`);
      }
    } catch (e) {
      speak(lang === 'hi' ? 'Scan fail हो गया सर।' : 'Scan failed sir.');
    } finally { if (mountedRef.current) setScanning(false); }
  };

  const draftProposal = async (gig) => {
    setDraftingFor(gig.url);
    try {
      const r = await fetch(`${API_URL}/api/zeus/draft-proposal`, {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ gig, lang }),
      });
      const d = await r.json();
      setGigs(prev => prev.map(g => g.url === gig.url ? { ...g, proposal: d.proposal } : g));
      setSelectedGig(prev => prev?.url === gig.url ? { ...prev, proposal: d.proposal } : prev);
      speak(lang === 'hi' ? 'Proposal ready है सर।' : 'Proposal drafted sir.');
    } catch {} finally { if (mountedRef.current) setDraftingFor(null); }
  };

  const saveGigAsLead = async (gig) => {
    try {
      await fetch(`${API_URL}/api/zeus/leads`, {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: gig.title, notes: `Upwork gig: ${gig.url}\nBudget: ${gig.budget}`, stage: 'New', value: 0, source: 'upwork' }),
      });
      speak(lang === 'hi' ? 'Lead save हो गया सर।' : 'Saved as lead sir.');
      loadLeads(); loadSummary();
    } catch {}
  };

  const addCustomSkill = () => {
    if (customSkill.trim() && !customSkills.includes(customSkill.trim())) {
      setCustomSkills(p => [...p, customSkill.trim()]); setCustomSkill('');
    }
  };

  const filtered = leads.filter(l => (!search || l.name?.toLowerCase().includes(search.toLowerCase())) && (!filterStage || l.stage === filterStage));
  const inp = { width:'100%', background:'rgba(5,0,15,0.8)', border:`0.5px solid ${C}30`, borderRadius:5, padding:'10px 12px', fontSize:13, color:'#e8d0ff', fontFamily:'Rajdhani', outline:'none', marginBottom:8 };

  return (
    <div style={{ display:'flex', flexDirection:'column', height:'100%', background:'#020408', position:'relative', overflow:'hidden' }}>
      <div style={{ position:'absolute', inset:0, backgroundImage:`linear-gradient(${C}06 1px, transparent 1px), linear-gradient(90deg, ${C}06 1px, transparent 1px)`, backgroundSize:'40px 40px', pointerEvents:'none' }} />

      {/* Header */}
      <div style={{ padding:'10px 16px 8px', borderBottom:`0.5px solid ${C}15`, display:'flex', alignItems:'center', justifyContent:'space-between', flexShrink:0, background:'rgba(5,0,15,0.9)', position:'relative', zIndex:2 }}>
        <div>
          <div style={{ fontFamily:'Orbitron', fontSize:9, color:C, letterSpacing:3, fontWeight:700 }}>Z.E.U.S</div>
          <div style={{ fontFamily:'Share Tech Mono', fontSize:8, color:`${C}60`, letterSpacing:2, marginTop:2 }}>
            {summary ? `${summary.total} LEADS · ₹${summary.totalValue?.toLocaleString('en-IN')||0}` : 'APEX PIPELINE · LEAD ENGINE'}
          </div>
        </div>
        <div style={{ display:'flex', gap:4, flexWrap:'wrap' }}>
          {['pipeline','engine','add','chat'].map(m => (
            <button key={m} onClick={() => setMode(m)} style={{ fontSize:8, padding:'3px 8px', borderRadius:3, background: mode===m ? `${C}15` : 'transparent', border:`0.5px solid ${mode===m ? C : `${C}25`}`, color: mode===m ? C : `${C}60`, cursor:'pointer', fontFamily:'Orbitron', letterSpacing:1 }}>
              {m === 'engine' ? '⚡ SCAN' : m.toUpperCase()}
            </button>
          ))}
        </div>
      </div>

      <div style={{ flex:1, overflowY:'auto', position:'relative', zIndex:1, scrollbarWidth:'thin', scrollbarColor:`${C}30 transparent` }}>

        {/* PIPELINE */}
        {mode === 'pipeline' && (
          <div style={{ padding:'12px 14px' }}>
            {summary && (
              <div style={{ display:'flex', gap:6, marginBottom:12 }}>
                {[{val:summary.total,lbl:'TOTAL'},{val:summary.active,lbl:'ACTIVE'},{val:summary.closedWon,lbl:'WON'},{val:`₹${((summary.totalValue||0)/1000).toFixed(0)}k`,lbl:'VALUE'}].map(({val,lbl}) => (
                  <div key={lbl} style={{ flex:1, background:`${C}08`, border:`0.5px solid ${C}25`, borderRadius:5, padding:'8px 6px', textAlign:'center' }}>
                    <div style={{ fontFamily:'Orbitron', fontSize:15, fontWeight:900, color:C }}>{val}</div>
                    <div style={{ fontFamily:'Share Tech Mono', fontSize:7, color:`${C}60`, marginTop:2, letterSpacing:1 }}>{lbl}</div>
                  </div>
                ))}
              </div>
            )}
            <div style={{ display:'flex', gap:6, marginBottom:10 }}>
              <input value={search} onChange={e => { setSearch(e.target.value); loadLeads(); }} placeholder="Search..." style={{ ...inp, marginBottom:0, flex:1 }} />
              <select value={filterStage} onChange={e => { setFilterStage(e.target.value); loadLeads(); }} style={{ ...inp, marginBottom:0, width:90, flex:0 }}>
                <option value="">All</option>
                {STAGES.map(s => <option key={s} value={s}>{s}</option>)}
              </select>
            </div>
            {STAGES.filter(s => filtered.some(l => l.stage === s)).map(stage => (
              <div key={stage} style={{ marginBottom:14 }}>
                <div style={{ display:'flex', alignItems:'center', gap:6, marginBottom:6 }}>
                  <div style={{ width:5, height:5, borderRadius:'50%', background:SC[stage], boxShadow:`0 0 5px ${SC[stage]}` }} />
                  <span style={{ fontFamily:'Share Tech Mono', fontSize:8, color:SC[stage], letterSpacing:1.5 }}>{stage.toUpperCase()} ({filtered.filter(l=>l.stage===stage).length})</span>
                </div>
                {filtered.filter(l=>l.stage===stage).map(lead => (
                  <div key={lead.id} onClick={() => { setSelected(lead); setMode('detail'); }} style={{ background:`${SC[stage]}06`, border:`0.5px solid ${SC[stage]}25`, borderLeft:`2px solid ${SC[stage]}`, borderRadius:5, padding:'10px 12px', marginBottom:5, cursor:'pointer' }}>
                    <div style={{ display:'flex', justifyContent:'space-between' }}>
                      <span style={{ fontSize:13, color:'#e8d0ff', fontWeight:500 }}>{lead.name}</span>
                      {lead.value > 0 && <span style={{ fontFamily:'Share Tech Mono', fontSize:10, color:'#00ff88' }}>₹{lead.value?.toLocaleString('en-IN')}</span>}
                    </div>
                    {lead.company && <p style={{ fontSize:10, color:`${C}50`, marginTop:2 }}>{lead.company}</p>}
                    {lead.source === 'upwork' && <span style={{ fontFamily:'Share Tech Mono', fontSize:7, color:`${C}40`, letterSpacing:1 }}>UPWORK GIG</span>}
                  </div>
                ))}
              </div>
            ))}
            {filtered.length === 0 && (
              <div style={{ textAlign:'center', padding:'30px 20px' }}>
                <ZeusOrb size={80} />
                <p style={{ color:`${C}40`, fontFamily:'Share Tech Mono', fontSize:10, margin:'12px 0' }}>PIPELINE EMPTY SIR</p>
                <button onClick={() => setMode('engine')} style={{ padding:'9px 18px', background:`${C}10`, border:`1px solid ${C}`, borderRadius:5, color:C, fontSize:10, fontFamily:'Orbitron', cursor:'pointer', marginRight:8 }}>⚡ SCAN UPWORK</button>
                <button onClick={() => setMode('add')} style={{ padding:'9px 18px', background:'transparent', border:`0.5px solid ${C}50`, borderRadius:5, color:`${C}80`, fontSize:10, fontFamily:'Orbitron', cursor:'pointer' }}>+ ADD MANUAL</button>
              </div>
            )}
          </div>
        )}

        {/* LEAD ENGINE */}
        {mode === 'engine' && (
          <div style={{ padding:'14px' }}>
            <div style={{ fontFamily:'Orbitron', fontSize:9, color:C, letterSpacing:3, marginBottom:4 }}>⚡ ZEUS LEAD ENGINE</div>
            <div style={{ fontFamily:'Share Tech Mono', fontSize:8, color:`${C}50`, letterSpacing:1, marginBottom:14 }}>
              AUTO SCANS: 8AM · 2PM · 8PM IST{lastScanned ? ` · LAST: ${lastScanned.toLocaleTimeString('en-IN')}` : ''}
            </div>

            {/* Default skills display */}
            <div style={{ background:`${C}05`, border:`0.5px solid ${C}20`, borderRadius:6, padding:'10px 12px', marginBottom:12 }}>
              <div style={{ fontFamily:'Share Tech Mono', fontSize:8, color:`${C}60`, letterSpacing:1, marginBottom:8 }}>SCANNING FOR</div>
              <div style={{ display:'flex', flexWrap:'wrap', gap:5 }}>
                {['React','Node.js','Full Stack','AI/Chatbot','Next.js','MERN','JavaScript','ML Integration', ...customSkills].map(s => (
                  <span key={s} style={{ fontSize:9, padding:'3px 8px', background:`${C}10`, border:`0.5px solid ${C}30`, borderRadius:10, color:C, fontFamily:'Share Tech Mono' }}>{s}</span>
                ))}
              </div>
            </div>

            {/* Add custom skill */}
            <div style={{ display:'flex', gap:8, marginBottom:14 }}>
              <input value={customSkill} onChange={e => setCustomSkill(e.target.value)} onKeyDown={e => e.key === 'Enter' && addCustomSkill()} placeholder="Add custom skill..." style={{ ...inp, marginBottom:0, flex:1 }} />
              <button onClick={addCustomSkill} disabled={!customSkill} style={{ width:44, height:44, borderRadius:5, background:`${C}12`, border:`1px solid ${C}`, color:C, fontSize:18, cursor:'pointer', flexShrink:0 }}>+</button>
            </div>

            {/* Scan button */}
            {!scanning && (
              <button onClick={runScan} style={{ width:'100%', padding:'14px', background:`${C}10`, border:`1px solid ${C}`, borderRadius:8, color:C, fontSize:11, fontFamily:'Orbitron', letterSpacing:2, cursor:'pointer', marginBottom:16 }}>
                ⚡ SCAN UPWORK NOW
              </button>
            )}
            {scanning && (
              <div style={{ textAlign:'center', padding:'20px 0', marginBottom:16 }}>
                <ZeusOrb size={70} pulse />
                <div style={{ fontFamily:'Orbitron', fontSize:9, color:C, letterSpacing:3, marginTop:10, animation:'blink 1s infinite' }}>SCANNING UPWORK...</div>
                <div style={{ fontFamily:'Share Tech Mono', fontSize:8, color:`${C}40`, marginTop:6 }}>Searching for matching gigs · Drafting proposals</div>
              </div>
            )}

            {/* Gig list */}
            {gigs.length > 0 && !scanning && (
              <>
                <div style={{ fontFamily:'Share Tech Mono', fontSize:8, color:`${C}60`, letterSpacing:2, marginBottom:10 }}>
                  FOUND {gigs.length} GIGS — TAP TO VIEW PROPOSAL
                </div>
                {gigs.map((gig, i) => (
                  <div key={i} onClick={() => setSelectedGig(selectedGig?.url === gig.url ? null : gig)} style={{ background: selectedGig?.url === gig.url ? `${C}12` : `${C}05`, border:`0.5px solid ${selectedGig?.url === gig.url ? C : `${C}20`}`, borderLeft:`2px solid ${C}`, borderRadius:6, padding:'10px 12px', marginBottom:8, cursor:'pointer' }}>
                    <div style={{ display:'flex', justifyContent:'space-between', marginBottom:4 }}>
                      <span style={{ fontSize:12, color:'#e8d0ff', fontWeight:500, flex:1, paddingRight:8 }}>{gig.title}</span>
                      <div style={{ display:'flex', gap:5, flexShrink:0 }}>
                        <span style={{ fontFamily:'Share Tech Mono', fontSize:8, padding:'2px 6px', background:'rgba(0,255,136,0.1)', border:'0.5px solid rgba(0,255,136,0.3)', borderRadius:3, color:'#00ff88' }}>{gig.budget}</span>
                        <span style={{ fontFamily:'Share Tech Mono', fontSize:8, padding:'2px 6px', background:`${C}10`, border:`0.5px solid ${C}30`, borderRadius:3, color:C }}>{gig.type}</span>
                      </div>
                    </div>
                    <p style={{ fontSize:10, color:`${C}40`, lineHeight:1.4 }}>{gig.description?.slice(0,100)}...</p>

                    {selectedGig?.url === gig.url && (
                      <div style={{ marginTop:12 }}>
                        {/* Action buttons */}
                        <div style={{ display:'flex', gap:6, marginBottom:10 }}>
                          <a href={gig.url} target="_blank" rel="noopener noreferrer" style={{ flex:1, padding:'7px', textAlign:'center', background:'rgba(0,212,255,0.08)', border:'0.5px solid rgba(0,212,255,0.3)', borderRadius:5, color:'#00d4ff', fontSize:9, fontFamily:'Orbitron', textDecoration:'none', letterSpacing:1 }}>🔗 VIEW ON UPWORK</a>
                          <button onClick={(e) => { e.stopPropagation(); saveGigAsLead(gig); }} style={{ flex:1, padding:'7px', background:'rgba(0,255,136,0.08)', border:'0.5px solid rgba(0,255,136,0.3)', borderRadius:5, color:'#00ff88', fontSize:9, fontFamily:'Orbitron', cursor:'pointer', letterSpacing:1 }}>+ SAVE AS LEAD</button>
                        </div>

                        {/* Proposal */}
                        {gig.proposal ? (
                          <div style={{ background:'rgba(5,0,15,0.9)', border:`0.5px solid ${C}25`, borderRadius:6, overflow:'hidden' }}>
                            <div style={{ padding:'6px 12px', background:`${C}08`, borderBottom:`0.5px solid ${C}20`, display:'flex', justifyContent:'space-between', alignItems:'center' }}>
                              <span style={{ fontFamily:'Orbitron', fontSize:8, color:C, letterSpacing:1 }}>AI PROPOSAL DRAFT</span>
                              <button onClick={(e) => { e.stopPropagation(); navigator.clipboard?.writeText(gig.proposal); speak('Copied sir.'); }} style={{ fontSize:8, padding:'2px 8px', background:`${C}15`, border:`0.5px solid ${C}`, borderRadius:3, color:C, cursor:'pointer', fontFamily:'Orbitron' }}>COPY</button>
                            </div>
                            <div style={{ padding:'12px', maxHeight:200, overflowY:'auto', userSelect:'text' }}>
                              <p style={{ fontSize:12, color:'rgba(220,200,255,0.8)', lineHeight:1.8, whiteSpace:'pre-wrap' }}>{gig.proposal}</p>
                            </div>
                          </div>
                        ) : (
                          <button onClick={(e) => { e.stopPropagation(); draftProposal(gig); }} disabled={draftingFor === gig.url} style={{ width:'100%', padding:'9px', background:`${C}08`, border:`0.5px solid ${C}40`, borderRadius:5, color:C, fontSize:9, fontFamily:'Orbitron', cursor:'pointer', letterSpacing:1, animation: draftingFor === gig.url ? 'blink 1s infinite' : 'none' }}>
                            {draftingFor === gig.url ? '✍ DRAFTING...' : '✍ DRAFT PROPOSAL'}
                          </button>
                        )}
                      </div>
                    )}
                  </div>
                ))}
              </>
            )}
          </div>
        )}

        {/* ADD */}
        {mode === 'add' && (
          <div style={{ padding:'16px' }}>
            <div style={{ fontFamily:'Orbitron', fontSize:9, color:C, letterSpacing:3, marginBottom:14 }}>NEW LEAD ACQUISITION</div>
            <input value={form.name} onChange={e=>setForm({...form,name:e.target.value})} placeholder="Name *" style={inp} />
            <input value={form.company} onChange={e=>setForm({...form,company:e.target.value})} placeholder="Company" style={inp} />
            <input value={form.phone} onChange={e=>setForm({...form,phone:e.target.value})} placeholder="Phone" style={inp} type="tel" />
            <input value={form.value} onChange={e=>setForm({...form,value:e.target.value})} placeholder="Deal value (₹)" style={inp} type="number" />
            <select value={form.stage} onChange={e=>setForm({...form,stage:e.target.value})} style={inp}>{STAGES.map(s=><option key={s} value={s}>{s}</option>)}</select>
            <textarea value={form.notes} onChange={e=>setForm({...form,notes:e.target.value})} placeholder="Notes..." rows={2} style={{...inp,resize:'vertical'}} />
            <div style={{ display:'flex', gap:8 }}>
              <button onClick={() => setMode('pipeline')} style={{ flex:1, padding:'10px', background:'transparent', border:`0.5px solid ${C}25`, borderRadius:5, color:`${C}50`, cursor:'pointer' }}>Cancel</button>
              <button onClick={addLead} disabled={loading||!form.name} style={{ flex:2, padding:'10px', background:`${C}12`, border:`1px solid ${C}`, borderRadius:5, color:C, fontFamily:'Orbitron', fontSize:9, letterSpacing:1, cursor:'pointer', opacity:!form.name?0.4:1 }}>
                {loading ? 'ADDING...' : '+ ADD LEAD'}
              </button>
            </div>
          </div>
        )}

        {/* DETAIL */}
        {mode === 'detail' && selected && (
          <div style={{ padding:'16px' }}>
            <div style={{ display:'flex', justifyContent:'space-between', marginBottom:12 }}>
              <span style={{ fontSize:14, color:'#e8d0ff', fontWeight:500 }}>{selected.name}</span>
              <button onClick={() => setMode('pipeline')} style={{ padding:'4px 10px', background:'transparent', border:`0.5px solid ${C}25`, borderRadius:4, color:`${C}60`, fontSize:9, fontFamily:'Orbitron', cursor:'pointer' }}>← BACK</button>
            </div>
            <div style={{ background:`${C}06`, border:`0.5px solid ${C}20`, borderRadius:6, padding:'12px', marginBottom:12 }}>
              {[['Company',selected.company],['Phone',selected.phone],['Value',selected.value?`₹${selected.value?.toLocaleString('en-IN')}`:null],['Source',selected.source]].filter(([,v])=>v).map(([k,v])=>(
                <div key={k} style={{ display:'flex', justifyContent:'space-between', padding:'5px 0', borderBottom:`0.5px solid ${C}12` }}>
                  <span style={{ fontFamily:'Share Tech Mono', fontSize:9, color:`${C}60`, letterSpacing:1 }}>{k.toUpperCase()}</span>
                  <span style={{ fontSize:12, color:'#e8d0ff' }}>{v}</span>
                </div>
              ))}
            </div>
            <div style={{ fontFamily:'Share Tech Mono', fontSize:8, color:`${C}60`, letterSpacing:2, marginBottom:8 }}>MOVE TO STAGE</div>
            <div style={{ display:'flex', flexWrap:'wrap', gap:5, marginBottom:14 }}>
              {STAGES.map(s => (
                <button key={s} onClick={() => { updateStage(selected.id,s); setSelected({...selected,stage:s}); }} style={{ padding:'5px 10px', borderRadius:4, fontSize:9, cursor:'pointer', background: selected.stage===s?`${SC[s]}20`:'transparent', border:`0.5px solid ${selected.stage===s?SC[s]:C}`, color: selected.stage===s?SC[s]:C, fontFamily:'Orbitron' }}>{s}</button>
              ))}
            </div>
            <button onClick={() => deleteLead(selected.id)} style={{ width:'100%', padding:'10px', background:'rgba(255,51,85,0.05)', border:'0.5px solid rgba(255,51,85,0.2)', borderRadius:5, color:'#ff3355', fontSize:9, fontFamily:'Orbitron', letterSpacing:1, cursor:'pointer' }}>🗑 DELETE LEAD</button>
          </div>
        )}

        {/* CHAT */}
        {mode === 'chat' && (
          <div style={{ padding:'16px', display:'flex', flexDirection:'column', minHeight:350 }}>
            <div style={{ fontFamily:'Share Tech Mono', fontSize:8, color:`${C}50`, letterSpacing:2, marginBottom:14, textAlign:'center' }}>ZEUS INTELLIGENCE · ASK ABOUT YOUR PIPELINE</div>
            <div style={{ flex:1, display:'flex', flexDirection:'column', gap:8, marginBottom:12 }}>
              {chatMsgs.length===0 && ["How many leads?","Pipeline value?","Who's in proposal?","Any Upwork gigs found?"].map(q=>(
                <p key={q} onClick={()=>setChatInput(q)} style={{ fontSize:12, color:C, cursor:'pointer', padding:'6px 10px', background:`${C}06`, border:`0.5px solid ${C}20`, borderRadius:5 }}>"{q}"</p>
              ))}
              {chatMsgs.map((m,i)=>(
                <div key={i} style={{ maxWidth:'88%', padding:'8px 12px', borderRadius:8, background: m.role==='user'?`${C}08`:'rgba(5,0,15,0.9)', border:`0.5px solid ${C}20`, color:'#e8d0ff', alignSelf: m.role==='user'?'flex-end':'flex-start', fontSize:13, lineHeight:1.5 }}>{m.text}</div>
              ))}
              {chatLoading && <div style={{ alignSelf:'flex-start', padding:'8px 12px', background:`${C}08`, border:`0.5px solid ${C}20`, borderRadius:8, fontSize:9, color:C, fontFamily:'Orbitron', animation:'blink 1s infinite' }}>ZEUS THINKING...</div>}
            </div>
            <div style={{ display:'flex', gap:8 }}>
              <input value={chatInput} onChange={e=>setChatInput(e.target.value)} onKeyDown={e=>e.key==='Enter'&&sendChat()} placeholder="Ask ZEUS..." style={{...inp,marginBottom:0,flex:1}} />
              <button onClick={sendChat} disabled={!chatInput||chatLoading} style={{ width:40, height:40, borderRadius:5, background:`${C}12`, border:`1px solid ${C}`, color:C, fontSize:14, cursor:'pointer', flexShrink:0 }}>▶</button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}