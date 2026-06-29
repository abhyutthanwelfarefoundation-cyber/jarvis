import React, { useState, useRef, useEffect } from 'react';
import { agentSpeak } from '../utils/agentVoices';
import { apiCall, getErrorMessage } from '../utils/api.js';

const C = '#ff8800';
const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;

function HaroldOrb({ status }) {
  const canvasRef = useRef(null); const frameRef = useRef(null); const aRef = useRef(0);
  useEffect(() => {
    const canvas = canvasRef.current; if (!canvas) return;
    const ctx = canvas.getContext('2d');
    const dpr = window.devicePixelRatio||1, S=100;
    canvas.width=S*dpr; canvas.height=S*dpr; canvas.style.width=S+'px'; canvas.style.height=S+'px';
    ctx.scale(dpr,dpr); const cx=S/2,cy=S/2;
    const draw=()=>{
      ctx.clearRect(0,0,S,S); aRef.current+=status==='recording'?0.04:0.012; const a=aRef.current;
      const gr=ctx.createRadialGradient(cx,cy,0,cx,cy,S*0.45);
      gr.addColorStop(0,`rgba(255,136,0,${status==='recording'?0.3:0.1})`); gr.addColorStop(1,'transparent');
      ctx.beginPath(); ctx.arc(cx,cy,S*0.45,0,Math.PI*2); ctx.fillStyle=gr; ctx.fill();
      for(let i=0;i<18;i++){const s=(i/18)*Math.PI*2+a,e=s+(Math.PI*2/18)*0.65; ctx.beginPath(); ctx.arc(cx,cy,S*0.41,s,e); ctx.lineWidth=S*0.025; ctx.strokeStyle=C; ctx.globalAlpha=i%4===0?0.2:0.75; ctx.stroke();}
      ctx.globalAlpha=1;
      const cg=ctx.createRadialGradient(cx,cy,0,cx,cy,S*0.1); cg.addColorStop(0,'#fff'); cg.addColorStop(0.3,C); cg.addColorStop(1,'transparent');
      ctx.beginPath(); ctx.arc(cx,cy,S*0.1,0,Math.PI*2); ctx.fillStyle=cg; ctx.fill();
      ctx.font=`900 ${S*0.14}px Orbitron`; ctx.textAlign='center'; ctx.textBaseline='middle'; ctx.fillStyle='#fff'; ctx.globalAlpha=0.9; ctx.fillText('H',cx,cy); ctx.globalAlpha=1;
      frameRef.current=requestAnimationFrame(draw);
    };
    draw(); return ()=>cancelAnimationFrame(frameRef.current);
  },[status]);
  return <canvas ref={canvasRef} style={{display:'block'}}/>;
}

export default function Harold({jarvis}){
  const {lang}=jarvis;
  const [mode,setMode]=useState('home');
  const [recording,setRecording]=useState(false);
  const [transcript,setTranscript]=useState('');
  const [interim,setInterim]=useState('');
  const [summary,setSummary]=useState(null);
  const [meetings,setMeetings]=useState([]);
  const [loading,setLoading]=useState(false);
  const [error,setError]=useState('');
  const [title,setTitle]=useState('');
  const [timer,setTimer]=useState(0);
  const [selected,setSelected]=useState(null);
  const [intel,setIntel]=useState(null);
  const [approvedTasks,setApprovedTasks]=useState([]);
  const [approvedLeads,setApprovedLeads]=useState([]);
  const [saving,setSaving]=useState(false);
  const [savedResult,setSavedResult]=useState(null);
  const [extracting,setExtracting]=useState(false);
  const [currentSummaryText,setCurrentSummaryText]=useState('');

  const recognitionRef=useRef(null);
  const timerRef=useRef(null);
  const mountedRef=useRef(true);
  const announcedRef=useRef(false);
  const recordingRef=useRef(false);
  const transcriptRef=useRef('');
  const speak=(t)=>agentSpeak(t,lang,'harold');

  useEffect(()=>{
    mountedRef.current=true; window.speechSynthesis?.cancel();
    if(!announcedRef.current){
      announcedRef.current=true;
      setTimeout(()=>{ if(mountedRef.current) speak(lang==='hi'?'HAROLD online हूँ सर। Meeting transcription ready है।':'HAROLD online sir. Whisper Prime ready.'); },600);
    }
    loadMeetings();
    return ()=>{ mountedRef.current=false; announcedRef.current=false; window.speechSynthesis?.cancel(); stopRecording(); };
  },[]);

  const loadMeetings=async()=>{
    try{ const d=await apiCall('/api/harold/meetings'); if(mountedRef.current) setMeetings(Array.isArray(d)?d:[]); }catch{}
  };

  const startRecording=()=>{
    if(!SpeechRecognition){ alert('Use Chrome for recording.'); return; }
    // Stop any existing recognition first
    if(recognitionRef.current){ try{ recognitionRef.current.abort(); }catch{} recognitionRef.current=null; }

    const rec=new SpeechRecognition();
    recognitionRef.current=rec;
    rec.lang=lang==='hi'?'hi-IN':'en-IN';
    rec.continuous=true;
    rec.interimResults=true;
    rec.maxAlternatives=1;

    let finalTranscript='';

    rec.onresult=(e)=>{
      let interim='';
      // Only process NEW results from last processed index
      for(let i=e.resultIndex;i<e.results.length;i++){
        if(e.results[i].isFinal){
          finalTranscript+=e.results[i][0].transcript+' ';
          transcriptRef.current=finalTranscript;
          setTranscript(finalTranscript);
        } else {
          interim+=e.results[i][0].transcript;
        }
      }
      setInterim(interim);
    };

    rec.onerror=(e)=>{ if(e.error!=='no-speech') console.log('[Harold] mic error:',e.error); };
    rec.onend=()=>{ if(recordingRef.current){ try{ rec.start(); }catch{} } };

    rec.start();
    recordingRef.current=true;
    setRecording(true);
    setMode('recording');
    setTranscript(''); setInterim(''); setTimer(0);
    transcriptRef.current='';
    finalTranscript='';
    timerRef.current=setInterval(()=>setTimer(p=>p+1),1000);
    speak(lang==='hi'?'Recording शुरू।':'Recording started sir.');
  };

  const stopRecording=()=>{
    recordingRef.current=false;
    if(recognitionRef.current){ try{ recognitionRef.current.stop(); }catch{} recognitionRef.current=null; }
    setRecording(false);
    clearInterval(timerRef.current);
    setInterim('');
  };

  const summarize=async(directTranscript)=>{
    const text=directTranscript||transcriptRef.current||transcript;
    if(!text?.trim()){ speak(lang==='hi'?'Sir, kuch record nahi hua.':'Sir, nothing was recorded.'); return; }
    setLoading(true); setError('');
    try{
      const d=await apiCall('/api/harold/summarize',{
        method:'POST',
        body:JSON.stringify({transcript:text,title:title||`Meeting ${new Date().toLocaleDateString('en-IN')}`,lang}),
      });
      if(mountedRef.current){
        setSummary(d.summary); setCurrentSummaryText(d.summary);
        setMode('summary'); setIntel(null); setApprovedTasks([]); setApprovedLeads([]); setSavedResult(null);
        loadMeetings();
        speak(lang==='hi'?'Summary तैयार है सर।':'Summary ready sir.');
      }
    }catch(e){
      const msg=getErrorMessage(e,lang);
      if(mountedRef.current) setError(msg);
      speak(msg);
    }finally{ if(mountedRef.current) setLoading(false); }
  };

  const extractIntel=async()=>{
    setExtracting(true); setIntel(null);
    speak(lang==='hi'?'Sir, meeting से tasks और leads extract कर रहा हूँ।':'Extracting tasks and leads sir.');
    try{
      const d=await apiCall('/api/harold/extract-intel',{
        method:'POST',
        body:JSON.stringify({summary:currentSummaryText,title:title||'Meeting',lang}),
      });
      setIntel(d);
      setApprovedTasks(d.tasks.map((_,i)=>i));
      setApprovedLeads(d.leads.map((_,i)=>i));
      setMode('handoff');
      speak(lang==='hi'?`Sir, ${d.tasks.length} tasks और ${d.leads.length} leads मिले।`:`Sir, found ${d.tasks.length} tasks and ${d.leads.length} leads.`);
    }catch(e){ speak(getErrorMessage(e,lang)); }
    finally{ if(mountedRef.current) setExtracting(false); }
  };

  const saveHandoff=async()=>{
    if(!approvedTasks.length&&!approvedLeads.length) return;
    setSaving(true);
    try{
      const d=await apiCall('/api/harold/approve-handoff',{
        method:'POST',
        body:JSON.stringify({tasks:approvedTasks.map(i=>intel.tasks[i]),leads:approvedLeads.map(i=>intel.leads[i])}),
      });
      setSavedResult(d);
      speak(lang==='hi'?`Sir, ${d.tasksSaved} tasks STARK को और ${d.leadsSaved} leads ZEUS को भेज दिए।`:`Sir, sent ${d.tasksSaved} tasks to STARK and ${d.leadsSaved} leads to ZEUS.`);
    }catch(e){ speak(getErrorMessage(e,lang)); }
    finally{ if(mountedRef.current) setSaving(false); }
  };

  const toggleTask=(i)=>setApprovedTasks(p=>p.includes(i)?p.filter(x=>x!==i):[...p,i]);
  const toggleLead=(i)=>setApprovedLeads(p=>p.includes(i)?p.filter(x=>x!==i):[...p,i]);
  const fmt=(s)=>`${String(Math.floor(s/60)).padStart(2,'0')}:${String(s%60).padStart(2,'0')}`;
  const inp={width:'100%',background:'rgba(10,5,0,0.8)',border:`0.5px solid ${C}30`,borderRadius:5,padding:'10px 12px',fontSize:13,color:'#ffeedd',fontFamily:'Rajdhani',outline:'none',marginBottom:8};
  const chip=(active,color)=>({display:'flex',alignItems:'center',gap:8,padding:'10px 12px',borderRadius:6,border:`0.5px solid ${active?color:`${color}30`}`,background:active?`${color}12`:'rgba(5,5,5,0.5)',cursor:'pointer',marginBottom:6,transition:'all 0.2s'});

  return(
    <div style={{display:'flex',flexDirection:'column',height:'100%',background:'#020408',position:'relative',overflow:'hidden'}}>
      <div style={{position:'absolute',inset:0,backgroundImage:`linear-gradient(${C}06 1px, transparent 1px), linear-gradient(90deg, ${C}06 1px, transparent 1px)`,backgroundSize:'40px 40px',pointerEvents:'none'}}/>

      <div style={{padding:'10px 16px 8px',borderBottom:`0.5px solid ${C}15`,display:'flex',alignItems:'center',justifyContent:'space-between',flexShrink:0,background:'rgba(10,5,0,0.9)',position:'relative',zIndex:2}}>
        <div>
          <div style={{fontFamily:'Orbitron',fontSize:9,color:C,letterSpacing:3,fontWeight:700}}>H.A.R.O.L.D</div>
          <div style={{fontFamily:'Share Tech Mono',fontSize:8,color:`${C}60`,letterSpacing:2,marginTop:2}}>WHISPER PRIME · MEETING TRANSCRIPTION</div>
        </div>
        <div style={{display:'flex',gap:5}}>
          {['home','history'].map(m=>(
            <button key={m} onClick={()=>setMode(m)} style={{fontSize:8,padding:'3px 8px',borderRadius:3,background:mode===m?`${C}15`:'transparent',border:`0.5px solid ${mode===m?C:`${C}25`}`,color:mode===m?C:`${C}60`,cursor:'pointer',fontFamily:'Orbitron',letterSpacing:1}}>
              {m==='home'?'RECORD':`HISTORY (${meetings.length})`}
            </button>
          ))}
          {recording&&<div style={{display:'flex',alignItems:'center',gap:4}}><div style={{width:5,height:5,borderRadius:'50%',background:'#ff3355',animation:'blink 0.5s infinite'}}/><span style={{fontFamily:'Share Tech Mono',fontSize:8,color:'#ff3355'}}>REC</span></div>}
        </div>
      </div>

      <div style={{flex:1,overflowY:'auto',position:'relative',zIndex:1,scrollbarWidth:'thin',scrollbarColor:`${C}30 transparent`}}>

        {mode==='home'&&(
          <div style={{padding:'16px'}}>
            <div style={{display:'flex',flexDirection:'column',alignItems:'center',gap:10,marginBottom:20}}>
              <HaroldOrb status="idle"/>
              <div style={{fontFamily:'Orbitron',fontSize:9,color:C,letterSpacing:3}}>◯ STANDBY</div>
            </div>
            <input value={title} onChange={e=>setTitle(e.target.value)} placeholder="Meeting title (optional)" style={inp}/>
            <button onClick={startRecording} style={{width:'100%',padding:'14px',background:`${C}10`,border:`1px solid ${C}`,borderRadius:8,color:C,fontSize:11,fontFamily:'Orbitron',letterSpacing:2,cursor:'pointer',marginBottom:16}}>
              🎙 START RECORDING
            </button>
            {meetings.slice(0,3).map(m=>(
              <div key={m.id} onClick={()=>{setSelected(m);setMode('history');}} style={{background:`${C}05`,border:`0.5px solid ${C}15`,borderLeft:`2px solid ${C}`,borderRadius:5,padding:'10px 12px',marginBottom:6,cursor:'pointer'}}>
                <div style={{display:'flex',justifyContent:'space-between',marginBottom:3}}>
                  <span style={{fontSize:12,color:'rgba(255,220,180,0.8)',fontWeight:500}}>{m.title}</span>
                  <span style={{fontFamily:'Share Tech Mono',fontSize:8,color:`${C}50`}}>{new Date(m.created_at).toLocaleDateString('en-IN')}</span>
                </div>
                <p style={{fontSize:10,color:`${C}40`,lineHeight:1.4}}>{m.summary?.slice(0,80)}...</p>
              </div>
            ))}
          </div>
        )}

        {mode==='recording'&&(
          <div style={{padding:'16px'}}>
            <div style={{display:'flex',flexDirection:'column',alignItems:'center',gap:8,marginBottom:16}}>
              <HaroldOrb status="recording"/>
              <div style={{fontFamily:'Orbitron',fontSize:22,color:'#ff3355',animation:'blink 1s infinite',letterSpacing:4}}>{fmt(timer)}</div>
              <div style={{fontFamily:'Share Tech Mono',fontSize:9,color:'#ff3355',letterSpacing:2}}>● RECORDING IN PROGRESS</div>
            </div>
            <div style={{background:'rgba(255,136,0,0.04)',border:`0.5px solid ${C}20`,borderRadius:8,padding:'12px',minHeight:120,maxHeight:260,overflowY:'auto',marginBottom:12}}>
              <div style={{fontFamily:'Share Tech Mono',fontSize:8,color:`${C}50`,letterSpacing:1,marginBottom:8}}>LIVE TRANSCRIPT</div>
              <p style={{fontSize:13,color:'rgba(255,220,180,0.75)',lineHeight:1.7,whiteSpace:'pre-wrap',userSelect:'text'}}>
                {transcript}<span style={{color:`${C}40`,fontStyle:'italic'}}>{interim}</span>
              </p>
              {!transcript&&!interim&&<p style={{fontFamily:'Share Tech Mono',fontSize:10,color:`${C}40`,animation:'blink 1.2s infinite'}}>Listening...</p>}
            </div>
            <div style={{display:'flex',gap:8}}>
              <button onClick={()=>{stopRecording();setMode('home');}} style={{flex:1,padding:'12px',background:'rgba(255,51,85,0.1)',border:'1px solid #ff3355',borderRadius:8,color:'#ff3355',fontSize:10,fontFamily:'Orbitron',letterSpacing:1,cursor:'pointer'}}>⏹ STOP</button>
              <button onClick={()=>{
                const t=transcriptRef.current;
                recordingRef.current=false;
                try{recognitionRef.current?.stop();}catch{}
                setRecording(false); clearInterval(timerRef.current); setInterim('');
                speak(lang==='hi'?'Recording रुकी। Summary बना रहा हूँ।':'Recording stopped. Generating summary.');
                setTimeout(()=>summarize(t),400);
              }} disabled={!transcript} style={{flex:2,padding:'12px',background:`${C}10`,border:`1px solid ${C}`,borderRadius:8,color:C,fontSize:10,fontFamily:'Orbitron',letterSpacing:1,cursor:'pointer',opacity:transcript?1:0.4}}>🤖 SUMMARIZE</button>
            </div>
          </div>
        )}

        {mode==='summary'&&(
          <div style={{padding:'16px'}}>
            <div style={{display:'flex',justifyContent:'space-between',marginBottom:12}}>
              <span style={{fontFamily:'Orbitron',fontSize:10,color:C,letterSpacing:2}}>AI SUMMARY</span>
              <button onClick={()=>setMode('home')} style={{padding:'4px 10px',background:'transparent',border:`0.5px solid ${C}25`,borderRadius:4,color:`${C}60`,fontSize:9,fontFamily:'Orbitron',cursor:'pointer'}}>← BACK</button>
            </div>
            {loading?<p style={{color:C,fontFamily:'Share Tech Mono',fontSize:10,animation:'blink 1s infinite',textAlign:'center',padding:'40px 0'}}>HAROLD PROCESSING...</p>
            :error?<div style={{background:'rgba(255,51,85,0.08)',border:'0.5px solid #ff335540',borderRadius:6,padding:'12px',color:'#ff3355',fontFamily:'Share Tech Mono',fontSize:10,marginBottom:12}}>{error}</div>
            :summary&&(
              <>
                <div style={{background:`${C}05`,border:`0.5px solid ${C}25`,borderRadius:8,overflow:'hidden',marginBottom:14}}>
                  <div style={{padding:'8px 14px',borderBottom:`0.5px solid ${C}20`,background:`${C}08`}}><span style={{fontFamily:'Orbitron',fontSize:8,color:C,letterSpacing:2}}>MEETING INTELLIGENCE</span></div>
                  <div style={{padding:'14px',userSelect:'text'}}><p style={{fontSize:13,color:'rgba(255,220,180,0.75)',lineHeight:1.8,whiteSpace:'pre-wrap'}}>{summary}</p></div>
                </div>
                {!intel&&!extracting&&<button onClick={extractIntel} style={{width:'100%',padding:'13px',background:'linear-gradient(135deg,rgba(0,212,255,0.1),rgba(170,85,255,0.1))',border:'1px solid rgba(0,212,255,0.5)',borderRadius:8,color:'#00d4ff',fontSize:11,fontFamily:'Orbitron',letterSpacing:2,cursor:'pointer',marginBottom:8}}>⚡ EXTRACT TASKS & LEADS</button>}
                {extracting&&<div style={{textAlign:'center',padding:'14px',fontFamily:'Share Tech Mono',fontSize:9,color:'#00d4ff',animation:'blink 1s infinite',letterSpacing:2}}>HAROLD EXTRACTING INTEL...</div>}
                {intel&&!extracting&&<button onClick={()=>setMode('handoff')} style={{width:'100%',padding:'11px',background:'rgba(0,212,255,0.08)',border:'0.5px solid rgba(0,212,255,0.4)',borderRadius:8,color:'#00d4ff',fontSize:10,fontFamily:'Orbitron',letterSpacing:1,cursor:'pointer',marginBottom:8}}>📋 VIEW INTEL ({intel.tasks.length} tasks · {intel.leads.length} leads)</button>}
                <button onClick={()=>{setMode('home');setTranscript('');setSummary(null);setTitle('');setIntel(null);transcriptRef.current='';}} style={{width:'100%',padding:'11px',background:`${C}10`,border:`1px solid ${C}`,borderRadius:8,color:C,fontSize:10,fontFamily:'Orbitron',letterSpacing:2,cursor:'pointer'}}>🎙 NEW RECORDING</button>
              </>
            )}
          </div>
        )}

        {mode==='handoff'&&intel&&(
          <div style={{padding:'16px'}}>
            <div style={{display:'flex',justifyContent:'space-between',alignItems:'center',marginBottom:14}}>
              <div><div style={{fontFamily:'Orbitron',fontSize:9,color:'#00d4ff',letterSpacing:2}}>HANDOFF REVIEW</div><div style={{fontFamily:'Share Tech Mono',fontSize:8,color:'#00d4ff60',marginTop:2}}>TAP TO APPROVE / DESELECT</div></div>
              <button onClick={()=>setMode('summary')} style={{padding:'4px 10px',background:'transparent',border:`0.5px solid ${C}25`,borderRadius:4,color:`${C}60`,fontSize:9,fontFamily:'Orbitron',cursor:'pointer'}}>← BACK</button>
            </div>
            {intel.tasks.length>0&&(
              <>
                <div style={{display:'flex',alignItems:'center',gap:8,marginBottom:8}}><div style={{width:5,height:5,borderRadius:'50%',background:'#ff3355',boxShadow:'0 0 5px #ff3355'}}/><span style={{fontFamily:'Share Tech Mono',fontSize:8,color:'#ff3355',letterSpacing:2}}>TASKS → STARK ({approvedTasks.length}/{intel.tasks.length})</span></div>
                {intel.tasks.map((task,i)=>{const active=approvedTasks.includes(i); return(
                  <div key={i} onClick={()=>toggleTask(i)} style={chip(active,'#ff3355')}>
                    <div style={{width:18,height:18,borderRadius:4,border:`1.5px solid ${active?'#ff3355':'#ff335540'}`,background:active?'#ff335520':'transparent',display:'flex',alignItems:'center',justifyContent:'center',flexShrink:0}}>
                      {active&&<svg width="10" height="10" viewBox="0 0 10 10" fill="none" stroke="#ff3355" strokeWidth="2"><polyline points="1 5 4 8 9 2"/></svg>}
                    </div>
                    <div style={{flex:1}}>
                      <p style={{fontSize:12,color:active?'rgba(255,220,200,0.9)':'rgba(255,220,200,0.4)',marginBottom:2}}>{task.title}</p>
                      <div style={{display:'flex',gap:8}}>{task.due&&<span style={{fontFamily:'Share Tech Mono',fontSize:8,color:'#ff335560'}}>📅 {task.due}</span>}{task.priority&&<span style={{fontFamily:'Share Tech Mono',fontSize:8,color:'#ff335560'}}>⚡ {task.priority}</span>}</div>
                    </div>
                  </div>
                );})}
              </>
            )}
            {intel.leads.length>0&&(
              <>
                <div style={{display:'flex',alignItems:'center',gap:8,margin:'14px 0 8px'}}><div style={{width:5,height:5,borderRadius:'50%',background:'#aa55ff',boxShadow:'0 0 5px #aa55ff'}}/><span style={{fontFamily:'Share Tech Mono',fontSize:8,color:'#aa55ff',letterSpacing:2}}>LEADS → ZEUS ({approvedLeads.length}/{intel.leads.length})</span></div>
                {intel.leads.map((lead,i)=>{const active=approvedLeads.includes(i); return(
                  <div key={i} onClick={()=>toggleLead(i)} style={chip(active,'#aa55ff')}>
                    <div style={{width:18,height:18,borderRadius:4,border:`1.5px solid ${active?'#aa55ff':'#aa55ff40'}`,background:active?'#aa55ff20':'transparent',display:'flex',alignItems:'center',justifyContent:'center',flexShrink:0}}>
                      {active&&<svg width="10" height="10" viewBox="0 0 10 10" fill="none" stroke="#aa55ff" strokeWidth="2"><polyline points="1 5 4 8 9 2"/></svg>}
                    </div>
                    <div style={{flex:1}}>
                      <p style={{fontSize:12,color:active?'rgba(220,200,255,0.9)':'rgba(220,200,255,0.4)',marginBottom:2}}>{lead.name}</p>
                      {lead.notes&&<p style={{fontSize:10,color:active?'#aa55ff80':'#aa55ff30',lineHeight:1.4}}>{lead.notes}</p>}
                    </div>
                  </div>
                );})}
              </>
            )}
            {intel.tasks.length===0&&intel.leads.length===0&&<p style={{textAlign:'center',color:`${C}40`,fontFamily:'Share Tech Mono',fontSize:11,padding:'30px 0'}}>NO TASKS OR LEADS FOUND</p>}
            {savedResult&&<div style={{background:'rgba(0,255,136,0.06)',border:'0.5px solid rgba(0,255,136,0.3)',borderRadius:8,padding:'12px',marginBottom:12,textAlign:'center'}}><div style={{fontFamily:'Orbitron',fontSize:9,color:'#00ff88',letterSpacing:2,marginBottom:4}}>✅ HANDOFF COMPLETE</div><span style={{fontFamily:'Share Tech Mono',fontSize:10,color:'rgba(0,255,136,0.7)'}}>{savedResult.tasksSaved} tasks → STARK · {savedResult.leadsSaved} leads → ZEUS</span></div>}
            {!savedResult&&(approvedTasks.length>0||approvedLeads.length>0)&&<button onClick={saveHandoff} disabled={saving} style={{width:'100%',padding:'14px',background:'linear-gradient(135deg,rgba(255,51,85,0.15),rgba(170,85,255,0.15))',border:'1px solid rgba(0,212,255,0.6)',borderRadius:8,color:'#00d4ff',fontSize:11,fontFamily:'Orbitron',letterSpacing:2,cursor:'pointer',marginTop:8,animation:saving?'blink 1s infinite':'none'}}>{saving?'SENDING...':`⚡ SEND ${approvedTasks.length} TASKS + ${approvedLeads.length} LEADS`}</button>}
          </div>
        )}

        {mode==='history'&&(
          <div style={{padding:'16px'}}>
            <div style={{display:'flex',justifyContent:'space-between',marginBottom:12}}>
              <span style={{fontFamily:'Orbitron',fontSize:10,color:C,letterSpacing:2}}>MEETING ARCHIVE</span>
              <button onClick={()=>{setMode('home');setSelected(null);}} style={{padding:'4px 10px',background:'transparent',border:`0.5px solid ${C}25`,borderRadius:4,color:`${C}60`,fontSize:9,fontFamily:'Orbitron',cursor:'pointer'}}>← BACK</button>
            </div>
            {selected?(
              <div>
                <div style={{display:'flex',justifyContent:'space-between',marginBottom:10}}>
                  <span style={{fontSize:13,color:'rgba(255,220,180,0.8)',fontWeight:500}}>{selected.title}</span>
                  <button onClick={()=>setSelected(null)} style={{fontSize:9,color:`${C}50`,background:'transparent',border:'none',cursor:'pointer',fontFamily:'Orbitron'}}>← LIST</button>
                </div>
                <div style={{background:`${C}05`,border:`0.5px solid ${C}20`,borderRadius:8,padding:'14px',userSelect:'text',marginBottom:12}}><p style={{fontSize:13,color:'rgba(255,220,180,0.7)',lineHeight:1.8,whiteSpace:'pre-wrap'}}>{selected.summary}</p></div>
              </div>
            ):meetings.length===0?(
              <p style={{textAlign:'center',color:`${C}40`,fontFamily:'Share Tech Mono',fontSize:11,padding:'40px 0'}}>NO MEETINGS RECORDED YET SIR</p>
            ):meetings.map(m=>(
              <div key={m.id} onClick={()=>setSelected(m)} style={{background:`${C}05`,border:`0.5px solid ${C}15`,borderLeft:`2px solid ${C}`,borderRadius:5,padding:'10px 12px',marginBottom:6,cursor:'pointer'}}>
                <div style={{display:'flex',justifyContent:'space-between',marginBottom:3}}>
                  <span style={{fontSize:12,color:'rgba(255,220,180,0.8)',fontWeight:500}}>{m.title}</span>
                  <span style={{fontFamily:'Share Tech Mono',fontSize:8,color:`${C}50`}}>{new Date(m.created_at).toLocaleDateString('en-IN')}</span>
                </div>
                <p style={{fontSize:10,color:`${C}40`,lineHeight:1.4}}>{m.summary?.slice(0,90)}...</p>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}