import React, { useState, useEffect, useRef } from 'react';
import { agentSpeak } from '../utils/agentVoices';

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:5001';
const COLOR = '#ff3355';

const STATUS_COLORS = {
  'Active':    { color: '#00d4ff', bg: 'rgba(0,212,255,0.08)'  },
  'On Hold':   { color: '#ff8800', bg: 'rgba(255,136,0,0.08)'  },
  'Completed': { color: '#00ff88', bg: 'rgba(0,255,136,0.08)'  },
  'Cancelled': { color: '#ff3355', bg: 'rgba(255,51,85,0.08)'  },
};

export default function Stark({ jarvis }) {
  const { lang } = jarvis;
  const [mode, setMode] = useState('dashboard');
  const [projects, setProjects] = useState([]);
  const [summary, setSummary] = useState(null);
  const [selectedProject, setSelectedProject] = useState(null);
  const [loading, setLoading] = useState(false);
  const [chatMessages, setChatMessages] = useState([]);
  const [chatInput, setChatInput] = useState('');
  const [chatLoading, setChatLoading] = useState(false);
  const [newMilestone, setNewMilestone] = useState('');
  const mountedRef = useRef(true);
  const announcedRef = useRef(false);
  const timerRef = useRef(null);

  const [form, setForm] = useState({
    name: '', description: '', deadline: '', status: 'Active', priority: 'Medium'
  });

  const speak = (text) => agentSpeak(text, lang, 'stark');

  useEffect(() => {
    mountedRef.current = true;
    window.speechSynthesis?.cancel();

    if (!announcedRef.current) {
      announcedRef.current = true;
      timerRef.current = setTimeout(() => {
        if (mountedRef.current) speak(lang === 'hi' ? 'STARK online हूँ सर।' : 'STARK online sir. All projects tracked.');
      }, 600);
    }

    loadProjects();
    loadSummary();

    return () => {
      mountedRef.current = false;
      announcedRef.current = false;
      clearTimeout(timerRef.current);
      window.speechSynthesis?.cancel();
    };
  }, []);

  const loadProjects = async () => {
    try {
      const res = await fetch(`${API_URL}/api/stark/projects`);
      const data = await res.json();
      if (mountedRef.current) setProjects(Array.isArray(data) ? data : []);
    } catch {}
  };

  const loadSummary = async () => {
    try {
      const res = await fetch(`${API_URL}/api/stark/summary`);
      const data = await res.json();
      if (mountedRef.current) setSummary(data);
    } catch {}
  };

  const loadProjectDetail = async (id) => {
    try {
      const res = await fetch(`${API_URL}/api/stark/projects/${id}`);
      const data = await res.json();
      if (mountedRef.current) setSelectedProject(data);
    } catch {}
  };

  const addProject = async () => {
    if (!form.name.trim()) return;
    setLoading(true);
    try {
      await fetch(`${API_URL}/api/stark/projects`, {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(form),
      });
      setForm({ name: '', description: '', deadline: '', status: 'Active', priority: 'Medium' });
      setMode('dashboard'); loadProjects(); loadSummary();
      speak(lang === 'hi' ? `${form.name} add हो गया सर।` : `${form.name} added sir.`);
    } catch {} finally { if (mountedRef.current) setLoading(false); }
  };

  const updateProgress = async (id, progress) => {
    try {
      await fetch(`${API_URL}/api/stark/projects/${id}/progress`, {
        method: 'PATCH', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ progress }),
      });
      loadProjects();
      if (selectedProject?.id === id) loadProjectDetail(id);
    } catch {}
  };

  const completeMilestone = async (id) => {
    try {
      await fetch(`${API_URL}/api/stark/milestones/${id}/complete`, { method: 'PATCH' });
      if (selectedProject) loadProjectDetail(selectedProject.id);
      loadProjects();
    } catch {}
  };

  const addMilestone = async () => {
    if (!newMilestone.trim() || !selectedProject) return;
    try {
      await fetch(`${API_URL}/api/stark/projects/${selectedProject.id}/milestones`, {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ title: newMilestone }),
      });
      setNewMilestone('');
      loadProjectDetail(selectedProject.id);
    } catch {}
  };

  const deleteProject = async (id) => {
    try {
      await fetch(`${API_URL}/api/stark/projects/${id}`, { method: 'DELETE' });
      setSelectedProject(null); setMode('dashboard');
      loadProjects(); loadSummary();
    } catch {}
  };

  const sendChat = async () => {
    if (!chatInput.trim()) return;
    const msg = chatInput.trim();
    setChatInput('');
    setChatMessages(prev => [...prev, { role: 'user', text: msg }]);
    setChatLoading(true);
    try {
      const res = await fetch(`${API_URL}/api/stark/chat`, {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ message: msg, lang }),
      });
      const data = await res.json();
      setChatMessages(prev => [...prev, { role: 'stark', text: data.reply }]);
      speak(data.reply);
    } catch {} finally { if (mountedRef.current) setChatLoading(false); }
  };

  const isOverdue = (d) => d && new Date(d) < new Date();

  const inp = {
    width: '100%', background: 'rgba(0,10,20,0.8)',
    border: `0.5px solid ${COLOR}30`, borderRadius: 4,
    padding: '10px 12px', fontSize: 13,
    color: '#d0eeff', fontFamily: 'var(--font-ui)', outline: 'none', marginBottom: 8,
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100%', background: '#020408' }}>
      {/* Header */}
      <div style={{ padding: '10px 14px 8px', borderBottom: `0.5px solid ${COLOR}20`, display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexShrink: 0 }}>
        <div>
          <p style={{ fontSize: 10, color: 'white', fontFamily: 'var(--font-hud)', letterSpacing: 2 }}>STARK AGENT</p>
          <p style={{ fontSize: 10, color: COLOR, fontFamily: 'var(--font-hud)', letterSpacing: 1 }}>
            {summary ? `${summary.active} ACTIVE · ${summary.avgProgress}% AVG` : 'BUILD OPS'}
          </p>
        </div>
        <div style={{ display: 'flex', gap: 5 }}>
          {['dashboard', 'add', 'chat'].map(m => (
            <button key={m} onClick={() => setMode(m)} style={{
              fontSize: 8, padding: '3px 8px', borderRadius: 3,
              background: mode === m ? `${COLOR}15` : 'transparent',
              border: `0.5px solid ${mode === m ? COLOR : `${COLOR}25`}`,
              color: mode === m ? COLOR : `white`,
              cursor: 'pointer', fontFamily: 'var(--font-hud)', letterSpacing: 1,
            }}>{m.toUpperCase()}</button>
          ))}
        </div>
      </div>

      <div className="page-scroll">
        {/* DASHBOARD */}
        {mode === 'dashboard' && (
          <div style={{ padding: '12px 14px' }}>
            {summary && (
              <div style={{ display: 'flex', gap: 6, marginBottom: 14 }}>
                {[
                  { val: summary.total, lbl: 'TOTAL' },
                  { val: summary.active, lbl: 'ACTIVE' },
                  { val: summary.completed, lbl: 'DONE' },
                  { val: `${summary.avgProgress}%`, lbl: 'AVG' },
                ].map(({ val, lbl }) => (
                  <div key={lbl} style={{ flex: 1, background: `${COLOR}08`, border: `0.5px solid ${COLOR}25`, borderRadius: 4, padding: '8px 6px', textAlign: 'center' }}>
                    <div style={{ fontSize: 15, fontWeight: 700, color: COLOR, fontFamily: 'var(--font-hud)' }}>{val}</div>
                    <div style={{ fontSize: 7, color: COLOR, marginTop: 2, fontFamily: 'var(--font-hud)', letterSpacing: 1 }}>{lbl}</div>
                  </div>
                ))}
              </div>
            )}

            {projects.length === 0 ? (
              <div style={{ textAlign: 'center', padding: '40px 20px' }}>
                <p style={{ color: `${COLOR}40`, fontSize: 11, fontFamily: 'var(--font-hud)', marginBottom: 12 }}>NO PROJECTS YET SIR</p>
                <button onClick={() => setMode('add')} style={{ padding: '9px 18px', background: `${COLOR}10`, border: `1px solid ${COLOR}`, borderRadius: 4, color: COLOR, fontSize: 10, cursor: 'pointer', fontFamily: 'var(--font-hud)' }}>+ ADD FIRST PROJECT</button>
              </div>
            ) : (
              projects.map(p => {
                const sc = STATUS_COLORS[p.status] || STATUS_COLORS['Active'];
                const overdue = isOverdue(p.deadline) && p.status !== 'Completed';
                return (
                  <div key={p.id} onClick={() => { loadProjectDetail(p.id); setMode('detail'); }} style={{
                    background: `${sc.color}06`, border: `0.5px solid ${overdue ? '#ff335530' : `${sc.color}20`}`,
                    borderLeft: `2px solid ${overdue ? '#ff3355' : sc.color}`,
                    borderRadius: 5, padding: '11px 12px', marginBottom: 8, cursor: 'pointer',
                  }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 5 }}>
                      <span style={{ fontSize: 13, color: '#d0eeff', fontWeight: 500 }}>{p.name}</span>
                      <div style={{ display: 'flex', gap: 5, alignItems: 'center' }}>
                        {overdue && <span style={{ fontSize: 7, color: '#ff3355', fontFamily: 'var(--font-hud)' }}>OVERDUE</span>}
                        <span style={{ fontSize: 7, padding: '1px 5px', background: sc.bg, color: sc.color, border: `0.5px solid ${sc.color}40`, borderRadius: 2, fontFamily: 'var(--font-hud)' }}>{p.status}</span>
                      </div>
                    </div>
                    {p.description && <p style={{ fontSize: 11, color: `${COLOR}50`, marginBottom: 7, lineHeight: 1.4 }}>{p.description.slice(0, 70)}{p.description.length > 70 ? '...' : ''}</p>}
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                      <div style={{ flex: 1, height: 3, background: 'rgba(0,212,255,0.1)', borderRadius: 2, overflow: 'hidden' }}>
                        <div style={{ height: '100%', borderRadius: 2, width: `${p.progress || 0}%`, background: p.progress >= 100 ? '#00ff88' : COLOR, transition: 'width 0.5s ease' }} />
                      </div>
                      <span style={{ fontSize: 9, color: `${COLOR}60`, fontFamily: 'var(--font-hud)', flexShrink: 0 }}>{p.progress || 0}%</span>
                    </div>
                    {p.deadline && <p style={{ fontSize: 8, color: overdue ? '#ff3355' : `${COLOR}40`, marginTop: 4, fontFamily: 'var(--font-hud)' }}>DUE: {new Date(p.deadline).toLocaleDateString('en-IN')}</p>}
                  </div>
                );
              })
            )}
          </div>
        )}

        {/* ADD */}
        {mode === 'add' && (
          <div style={{ padding: '14px' }}>
            <p style={{ fontSize: 10, color: COLOR, fontFamily: 'var(--font-hud)', letterSpacing: 2, marginBottom: 14 }}>NEW PROJECT</p>
            <input value={form.name} onChange={e => setForm({ ...form, name: e.target.value })} placeholder="Project name *" style={inp} />
            <textarea value={form.description} onChange={e => setForm({ ...form, description: e.target.value })} placeholder="Description..." rows={2} style={{ ...inp, resize: 'vertical' }} />
            <input value={form.deadline} onChange={e => setForm({ ...form, deadline: e.target.value })} type="date" style={inp} />
            <select value={form.priority} onChange={e => setForm({ ...form, priority: e.target.value })} style={inp}>
              {['High', 'Medium', 'Low'].map(p => <option key={p} value={p}>{p} Priority</option>)}
            </select>
            <select value={form.status} onChange={e => setForm({ ...form, status: e.target.value })} style={inp}>
              {['Active', 'On Hold', 'Completed', 'Cancelled'].map(s => <option key={s} value={s}>{s}</option>)}
            </select>
            <div style={{ display: 'flex', gap: 8 }}>
              <button onClick={() => setMode('dashboard')} style={{ flex: 1, padding: '10px', background: 'transparent', border: `0.5px solid ${COLOR}25`, borderRadius: 4, color: `${COLOR}50`, cursor: 'pointer' }}>Cancel</button>
              <button onClick={addProject} disabled={loading || !form.name} style={{ flex: 2, padding: '10px', background: `${COLOR}12`, border: `1px solid ${COLOR}`, borderRadius: 4, color: COLOR, fontFamily: 'var(--font-hud)', fontSize: 10, cursor: 'pointer', opacity: !form.name ? 0.4 : 1 }}>
                {loading ? 'ADDING...' : '+ ADD PROJECT'}
              </button>
            </div>
          </div>
        )}

        {/* DETAIL */}
        {mode === 'detail' && selectedProject && (
          <div style={{ padding: '14px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 12 }}>
              <p style={{ fontSize: 14, color: '#d0eeff', fontWeight: 500 }}>{selectedProject.name}</p>
              <button onClick={() => setMode('dashboard')} style={{ padding: '4px 10px', background: 'transparent', border: `0.5px solid ${COLOR}25`, borderRadius: 3, color: COLOR, fontSize: 9, cursor: 'pointer', fontFamily: 'var(--font-hud)' }}>← BACK</button>
            </div>

            {/* Progress */}
            <div style={{ background: `${COLOR}06`, border: `0.5px solid ${COLOR}20`, borderRadius: 5, padding: '12px', marginBottom: 12 }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 8 }}>
                <span style={{ fontSize: 9, color:COLOR, fontFamily: 'var(--font-hud)', letterSpacing: 1 }}>PROGRESS</span>
                <span style={{ fontSize: 14, fontWeight: 700, color: COLOR, fontFamily: 'var(--font-hud)' }}>{selectedProject.progress || 0}%</span>
              </div>
              <div style={{ height: 5, background: 'rgba(0,0,0,0.4)', borderRadius: 3, overflow: 'hidden', marginBottom: 10 }}>
                <div style={{ height: '100%', borderRadius: 3, width: `${selectedProject.progress || 0}%`, background: selectedProject.progress >= 100 ? '#00ff88' : COLOR, transition: 'width 0.5s ease' }} />
              </div>
              <div style={{ display: 'flex', gap: 5 }}>
                {[0, 25, 50, 75, 100].map(p => (
                  <button key={p} onClick={() => updateProgress(selectedProject.id, p)} style={{
                    flex: 1, padding: '5px 3px', fontSize: 10,
                    background: selectedProject.progress === p ? `${COLOR}20` : 'transparent',
                    border: `0.5px solid ${selectedProject.progress === p ? COLOR : `${COLOR}20`}`,
                    borderRadius: 3, color: selectedProject.progress === p ? COLOR : `${COLOR}40`,
                    cursor: 'pointer', fontFamily: 'var(--font-hud)',
                  }}>{p}%</button>
                ))}
              </div>
            </div>

            {/* Milestones */}
            <p style={{ fontSize: 8, color: COLOR, fontFamily: 'var(--font-hud)', letterSpacing: 1.5, marginBottom: 8 }}>
              MILESTONES ({selectedProject.milestones?.filter(m => m.completed).length || 0}/{selectedProject.milestones?.length || 0})
            </p>
            {selectedProject.milestones?.map(m => (
              <div key={m.id} style={{ display: 'flex', alignItems: 'center', gap: 10, background: `${COLOR}05`, border: `0.5px solid ${COLOR}15`, borderRadius: 4, padding: '8px 10px', marginBottom: 5 }}>
                <button onClick={() => !m.completed && completeMilestone(m.id)} disabled={m.completed} style={{ width: 16, height: 16, borderRadius: 3, flexShrink: 0, border: m.completed ? 'none' : `1.5px solid ${COLOR}40`, background: m.completed ? `${COLOR}50` : 'transparent', cursor: m.completed ? 'default' : 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                  {m.completed && <svg width="8" height="8" viewBox="0 0 10 10" fill="none" stroke="white" strokeWidth="2"><polyline points="1 5 4 8 9 2"/></svg>}
                </button>
                <span style={{ flex: 1, fontSize: 12, color: m.completed ? `${COLOR}30` : '#d0eeff', textDecoration: m.completed ? 'line-through' : 'none' }}>{m.title}</span>
              </div>
            ))}

            <div style={{ display: 'flex', gap: 8, margin: '10px 0 14px' }}>
              <input value={newMilestone} onChange={e => setNewMilestone(e.target.value)} onKeyDown={e => e.key === 'Enter' && addMilestone()} placeholder="Add milestone..." style={{ ...inp, marginBottom: 0, flex: 1 }} />
              <button onClick={addMilestone} disabled={!newMilestone} style={{ width: 40, height: 40, borderRadius: 4, background: `${COLOR}12`, border: `1px solid ${COLOR}`, color: COLOR, fontSize: 18, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>+</button>
            </div>

            <button onClick={() => deleteProject(selectedProject.id)} style={{ width: '100%', padding: '10px', background: 'rgba(255,51,85,0.05)', border: '0.5px solid rgba(255,51,85,0.2)', borderRadius: 4, color: '#ff3355', fontSize: 10, cursor: 'pointer', fontFamily: 'var(--font-hud)' }}>🗑 DELETE PROJECT</button>
          </div>
        )}

        {/* CHAT */}
        {mode === 'chat' && (
          <div style={{ padding: '14px', display: 'flex', flexDirection: 'column', minHeight: 350 }}>
            <p style={{ fontSize: 8, color: `${COLOR}50`, fontFamily: 'var(--font-hud)', letterSpacing: 2, marginBottom: 14, textAlign: 'center' }}>ASK STARK ABOUT YOUR PROJECTS</p>
            <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: 8, marginBottom: 12 }}>
              {chatMessages.length === 0 && ["What's overdue?", "Overall progress?", "Which needs attention?"].map(q => (
                <p key={q} onClick={() => setChatInput(q)} style={{ fontSize: 12, color: COLOR, cursor: 'pointer', padding: '6px 0', borderBottom: `0.5px solid ${COLOR}15` }}>"{q}"</p>
              ))}
              {chatMessages.map((m, i) => (
                <div key={i} style={{ maxWidth: '88%', padding: '8px 12px', borderRadius: m.role === 'user' ? '6px 6px 2px 6px' : '6px 6px 6px 2px', background: m.role === 'user' ? `${COLOR}08` : 'rgba(0,8,20,0.9)', border: `0.5px solid ${COLOR}20`, color: '#d0eeff', alignSelf: m.role === 'user' ? 'flex-end' : 'flex-start', fontSize: 13, lineHeight: 1.5, userSelect: 'text' }}>
                  {m.text}
                </div>
              ))}
              {chatLoading && <div style={{ alignSelf: 'flex-start', padding: '8px 12px', background: `${COLOR}08`, border: `0.5px solid ${COLOR}20`, borderRadius: '6px 6px 6px 2px', fontSize: 10, color: COLOR, fontFamily: 'var(--font-hud)', animation: 'hud-blink 1s infinite' }}>STARK THINKING...</div>}
            </div>
            <div style={{ display: 'flex', gap: 8 }}>
              <input value={chatInput} onChange={e => setChatInput(e.target.value)} onKeyDown={e => e.key === 'Enter' && sendChat()} placeholder="Ask STARK..." style={{ ...inp, marginBottom: 0, flex: 1 }} />
              <button onClick={sendChat} disabled={!chatInput || chatLoading} style={{ width: 40, height: 40, borderRadius: 4, background: `${COLOR}12`, border: `1px solid ${COLOR}`, color: COLOR, fontSize: 14, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>▶</button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}