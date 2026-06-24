import React, { useState, useEffect, useRef } from 'react';
import { agentSpeak } from '../utils/agentVoices';

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:5001';
const COLOR = '#aa55ff';

const STAGES = ['New', 'Contacted', 'Qualified', 'Proposal', 'Closed Won', 'Closed Lost'];
const STAGE_COLORS = {
  'New': '#00d4ff', 'Contacted': '#aa55ff', 'Qualified': '#ff8800',
  'Proposal': '#00ff88', 'Closed Won': '#00cc55', 'Closed Lost': '#ff3355',
};

export default function Zeus({ jarvis }) {
  const { lang } = jarvis;
  const [mode, setMode] = useState('pipeline');
  const [leads, setLeads] = useState([]);
  const [summary, setSummary] = useState(null);
  const [loading, setLoading] = useState(false);
  const [selectedLead, setSelectedLead] = useState(null);
  const [search, setSearch] = useState('');
  const [filterStage, setFilterStage] = useState('');
  const [chatMessages, setChatMessages] = useState([]);
  const [chatInput, setChatInput] = useState('');
  const [chatLoading, setChatLoading] = useState(false);
  const mountedRef = useRef(true);
  const announcedRef = useRef(false);
  const timerRef = useRef(null);

  const [form, setForm] = useState({
    name: '', company: '', phone: '', email: '', value: '', stage: 'New', notes: ''
  });

  const speak = (text) => agentSpeak(text, lang, 'zeus');

  useEffect(() => {
    mountedRef.current = true;
    window.speechSynthesis?.cancel();

    // Only announce ONCE per tab visit
    if (!announcedRef.current) {
      announcedRef.current = true;
      timerRef.current = setTimeout(() => {
        if (mountedRef.current) speak(lang === 'hi' ? 'ZEUS online हूँ सर।' : 'ZEUS online sir.');
      }, 600);
    }

    loadLeads();
    loadSummary();

    return () => {
      mountedRef.current = false;
      announcedRef.current = false; // reset so it announces again next visit
      clearTimeout(timerRef.current);
      window.speechSynthesis?.cancel();
    };
  }, []);

  const loadLeads = async () => {
    try {
      let url = `${API_URL}/api/zeus/leads?`;
      if (filterStage) url += `stage=${filterStage}&`;
      if (search) url += `search=${search}&`;
      const res = await fetch(url);
      const data = await res.json();
      if (mountedRef.current) setLeads(Array.isArray(data) ? data : []);
    } catch {}
  };

  const loadSummary = async () => {
    try {
      const res = await fetch(`${API_URL}/api/zeus/summary`);
      const data = await res.json();
      if (mountedRef.current) setSummary(data);
    } catch {}
  };

  const addLead = async () => {
    if (!form.name.trim()) return;
    setLoading(true);
    try {
      await fetch(`${API_URL}/api/zeus/leads`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ...form, value: parseFloat(form.value) || 0 }),
      });
      setForm({ name: '', company: '', phone: '', email: '', value: '', stage: 'New', notes: '' });
      setMode('pipeline');
      loadLeads(); loadSummary();
      speak(lang === 'hi' ? `${form.name} add हो गया सर।` : `${form.name} added sir.`);
    } catch {} finally { if (mountedRef.current) setLoading(false); }
  };

  const updateStage = async (id, stage) => {
    try {
      await fetch(`${API_URL}/api/zeus/leads/${id}/stage`, {
        method: 'PATCH', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ stage }),
      });
      loadLeads(); loadSummary();
    } catch {}
  };

  const deleteLead = async (id) => {
    try {
      await fetch(`${API_URL}/api/zeus/leads/${id}`, { method: 'DELETE' });
      setSelectedLead(null); setMode('pipeline');
      loadLeads(); loadSummary();
    } catch {}
  };

  const sendChat = async () => {
    if (!chatInput.trim()) return;
    const msg = chatInput.trim();
    setChatInput('');
    setChatMessages(prev => [...prev, { role: 'user', text: msg }]);
    setChatLoading(true);
    try {
      const res = await fetch(`${API_URL}/api/zeus/chat`, {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ message: msg, lang }),
      });
      const data = await res.json();
      setChatMessages(prev => [...prev, { role: 'zeus', text: data.reply }]);
      speak(data.reply);
    } catch {} finally { if (mountedRef.current) setChatLoading(false); }
  };

  const filteredLeads = leads.filter(l => {
    const ms = !search || l.name.toLowerCase().includes(search.toLowerCase());
    const mf = !filterStage || l.stage === filterStage;
    return ms && mf;
  });

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
          <p style={{ fontSize: 10, color: `white`, fontFamily: 'var(--font-hud)', letterSpacing: 2 }}>ZEUS AGENT</p>
          <p style={{ fontSize: 10, color: COLOR, fontFamily: 'var(--font-hud)', letterSpacing: 1 }}>
            {summary ? `${summary.total} LEADS · ₹${summary.totalValue?.toLocaleString('en-IN') || 0}` : 'APEX PIPELINE'}
          </p>
        </div>
        <div style={{ display: 'flex', gap: 5 }}>
          {['pipeline', 'add', 'chat'].map(m => (
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
        {/* PIPELINE */}
        {mode === 'pipeline' && (
          <div style={{ padding: '12px 14px' }}>
            {summary && (
              <div style={{ display: 'flex', gap: 6, marginBottom: 12 }}>
                {[
                  { val: summary.total, lbl: 'TOTAL' },
                  { val: summary.active, lbl: 'ACTIVE' },
                  { val: summary.closedWon, lbl: 'WON' },
                  { val: `₹${((summary.totalValue || 0) / 1000).toFixed(0)}k`, lbl: 'VALUE' },
                ].map(({ val, lbl }) => (
                  <div key={lbl} style={{ flex: 1, background: `${COLOR}08`, border: `0.5px solid ${COLOR}25`, borderRadius: 4, padding: '8px 6px', textAlign: 'center' }}>
                    <div style={{ fontSize: 15, fontWeight: 700, color: COLOR, fontFamily: 'var(--font-hud)' }}>{val}</div>
                    <div style={{ fontSize: 7, color:COLOR, marginTop: 2, fontFamily: 'var(--font-hud)', letterSpacing: 1 }}>{lbl}</div>
                  </div>
                ))}
              </div>
            )}

            <div style={{ display: 'flex', gap: 6, marginBottom: 10 }}>
              <input value={search} onChange={e => { setSearch(e.target.value); loadLeads(); }} placeholder="Search leads..." style={{ ...inp, marginBottom: 0, flex: 1 }} />
              <select value={filterStage} onChange={e => { setFilterStage(e.target.value); loadLeads(); }} style={{ ...inp, marginBottom: 0, width: 90, flex: 0 }}>
                <option value="">All</option>
                {STAGES.map(s => <option key={s} value={s}>{s}</option>)}
              </select>
            </div>

            {STAGES.filter(s => filteredLeads.some(l => l.stage === s)).map(stage => (
              <div key={stage} style={{ marginBottom: 12 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 5, marginBottom: 5 }}>
                  <div style={{ width: 6, height: 6, borderRadius: '50%', background: STAGE_COLORS[stage] }} />
                  <span style={{ fontSize: 8, color: STAGE_COLORS[stage], fontFamily: 'var(--font-hud)', letterSpacing: 1 }}>
                    {stage.toUpperCase()} ({filteredLeads.filter(l => l.stage === stage).length})
                  </span>
                </div>
                {filteredLeads.filter(l => l.stage === stage).map(lead => (
                  <div key={lead.id} onClick={() => { setSelectedLead(lead); setMode('detail'); }} style={{
                    background: `${STAGE_COLORS[stage]}08`, border: `0.5px solid ${STAGE_COLORS[stage]}25`,
                    borderLeft: `2px solid ${STAGE_COLORS[stage]}`, borderRadius: 4,
                    padding: '10px 12px', marginBottom: 5, cursor: 'pointer',
                  }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                      <span style={{ fontSize: 13, color: '#d0eeff', fontWeight: 500 }}>{lead.name}</span>
                      {lead.value > 0 && <span style={{ fontSize: 11, color: '#00ff88', fontFamily: 'var(--font-hud)' }}>₹{lead.value?.toLocaleString('en-IN')}</span>}
                    </div>
                    {lead.company && <p style={{ fontSize: 10, color: `COLOR`, marginTop: 2 }}>{lead.company}</p>}
                  </div>
                ))}
              </div>
            ))}

            {filteredLeads.length === 0 && (
              <div style={{ textAlign: 'center', padding: '40px 20px' }}>
                <p style={{ color: COLOR, fontSize: 11, fontFamily: 'var(--font-hud)', marginBottom: 12 }}>NO LEADS YET SIR</p>
                <button onClick={() => setMode('add')} style={{ padding: '9px 18px', background: `${COLOR}10`, border: `1px solid ${COLOR}`, borderRadius: 4, color: COLOR, fontSize: 11, cursor: 'pointer', fontFamily: 'var(--font-hud)' }}>+ ADD FIRST LEAD</button>
              </div>
            )}
          </div>
        )}

        {/* ADD */}
        {mode === 'add' && (
          <div style={{ padding: '14px' }}>
            <p style={{ fontSize: 10, color: COLOR, fontFamily: 'var(--font-hud)', letterSpacing: 2, marginBottom: 14 }}>ADD NEW LEAD</p>
            <input value={form.name} onChange={e => setForm({ ...form, name: e.target.value })} placeholder="Name *" style={inp} />
            <input value={form.company} onChange={e => setForm({ ...form, company: e.target.value })} placeholder="Company" style={inp} />
            <input value={form.phone} onChange={e => setForm({ ...form, phone: e.target.value })} placeholder="Phone" style={inp} type="tel" />
            <input value={form.value} onChange={e => setForm({ ...form, value: e.target.value })} placeholder="Deal value (₹)" style={inp} type="number" />
            <select value={form.stage} onChange={e => setForm({ ...form, stage: e.target.value })} style={inp}>
              {STAGES.map(s => <option key={s} value={s}>{s}</option>)}
            </select>
            <textarea value={form.notes} onChange={e => setForm({ ...form, notes: e.target.value })} placeholder="Notes..." rows={2} style={{ ...inp, resize: 'vertical' }} />
            <div style={{ display: 'flex', gap: 8 }}>
              <button onClick={() => setMode('pipeline')} style={{ flex: 1, padding: '10px', background: 'transparent', border: `0.5px solid ${COLOR}25`, borderRadius: 4, color: `${COLOR}60`, cursor: 'pointer' }}>Cancel</button>
              <button onClick={addLead} disabled={loading || !form.name} style={{ flex: 2, padding: '10px', background: `${COLOR}12`, border: `1px solid ${COLOR}`, borderRadius: 4, color: COLOR, fontFamily: 'var(--font-hud)', fontSize: 10, cursor: 'pointer', opacity: !form.name ? 0.4 : 1 }}>
                {loading ? 'ADDING...' : '+ ADD LEAD'}
              </button>
            </div>
          </div>
        )}

        {/* DETAIL */}
        {mode === 'detail' && selectedLead && (
          <div style={{ padding: '14px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 12 }}>
              <p style={{ fontSize: 14, color: 'white', fontWeight: 500 }}>{selectedLead.name}</p>
              <button onClick={() => setMode('pipeline')} style={{ padding: '4px 10px', background: 'transparent', border: `0.5px solid ${COLOR}25`, borderRadius: 3, color: COLOR, fontSize: 10, cursor: 'pointer', fontFamily: 'var(--font-hud)' }}>← BACK</button>
            </div>
            <div style={{ background: `${COLOR}06`, border: `0.5px solid ${COLOR}20`, borderRadius: 6, padding: '12px', marginBottom: 12 }}>
              {[['Company', selectedLead.company], ['Phone', selectedLead.phone], ['Value', selectedLead.value ? `₹${selectedLead.value?.toLocaleString('en-IN')}` : null]].filter(([, v]) => v).map(([k, v]) => (
                <div key={k} style={{ display: 'flex', justifyContent: 'space-between', padding: '5px 0', borderBottom: `0.5px solid ${COLOR}12` }}>
                  <span style={{ fontSize: 10, color: COLOR, fontFamily: 'var(--font-hud)', letterSpacing: 1 }}>{k.toUpperCase()}</span>
                  <span style={{ fontSize: 12, color: '#d0eeff' }}>{v}</span>
                </div>
              ))}
            </div>
            <p style={{ fontSize: 8, color: COLOR, fontFamily: 'var(--font-hud)', letterSpacing: 1.5, marginBottom: 8 }}>MOVE TO STAGE</p>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 5, marginBottom: 14 }}>
              {STAGES.map(s => (
                <button key={s} onClick={() => { updateStage(selectedLead.id, s); setSelectedLead({ ...selectedLead, stage: s }); }} style={{
                  padding: '5px 10px', borderRadius: 3, fontSize: 10, cursor: 'pointer',
                  background: selectedLead.stage === s ? `${STAGE_COLORS[s]}20` : 'transparent',
                  border: `0.5px solid ${selectedLead.stage === s ? STAGE_COLORS[s] : COLOR}`,
                  color: selectedLead.stage === s ? STAGE_COLORS[s] : COLOR,
                  fontFamily: 'var(--font-hud)',
                }}>{s}</button>
              ))}
            </div>
            <button onClick={() => deleteLead(selectedLead.id)} style={{ width: '100%', padding: '10px', background: 'rgba(255,51,85,0.05)', border: '0.5px solid rgba(255,51,85,0.2)', borderRadius: 4, color: '#ff3355', fontSize: 11, cursor: 'pointer', fontFamily: 'var(--font-hud)' }}>🗑 DELETE LEAD</button>
          </div>
        )}

        {/* CHAT */}
        {mode === 'chat' && (
          <div style={{ padding: '14px', display: 'flex', flexDirection: 'column', minHeight: 350 }}>
            <p style={{ fontSize: 8, color: `${COLOR}50`, fontFamily: 'var(--font-hud)', letterSpacing: 2, marginBottom: 14, textAlign: 'center' }}>ASK ZEUS ABOUT YOUR PIPELINE</p>
            <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: 8, marginBottom: 12 }}>
              {chatMessages.length === 0 && ['How many leads?', "What's my pipeline value?", 'Who is in proposal?'].map(q => (
                <p key={q} onClick={() => setChatInput(q)} style={{ fontSize: 12, color: COLOR, cursor: 'pointer', padding: '6px 0', borderBottom: `0.5px solid ${COLOR}15` }}>"{q}"</p>
              ))}
              {chatMessages.map((m, i) => (
                <div key={i} style={{ maxWidth: '88%', padding: '8px 12px', borderRadius: m.role === 'user' ? '6px 6px 2px 6px' : '6px 6px 6px 2px', background: m.role === 'user' ? `${COLOR}08` : 'rgba(0,8,20,0.9)', border: `0.5px solid ${COLOR}20`, color: '#d0eeff', alignSelf: m.role === 'user' ? 'flex-end' : 'flex-start', fontSize: 13, lineHeight: 1.5, userSelect: 'text' }}>
                  {m.text}
                </div>
              ))}
              {chatLoading && <div style={{ alignSelf: 'flex-start', padding: '8px 12px', background: `${COLOR}08`, border: `0.5px solid ${COLOR}20`, borderRadius: '6px 6px 6px 2px', fontSize: 10, color: COLOR, fontFamily: 'var(--font-hud)', animation: 'hud-blink 1s infinite' }}>ZEUS THINKING...</div>}
            </div>
            <div style={{ display: 'flex', gap: 8 }}>
              <input value={chatInput} onChange={e => setChatInput(e.target.value)} onKeyDown={e => e.key === 'Enter' && sendChat()} placeholder="Ask ZEUS..." style={{ ...inp, marginBottom: 0, flex: 1 }} />
              <button onClick={sendChat} disabled={!chatInput || chatLoading} style={{ width: 40, height: 40, borderRadius: 4, background: `${COLOR}12`, border: `1px solid ${COLOR}`, color: COLOR, fontSize: 14, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>▶</button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
} 