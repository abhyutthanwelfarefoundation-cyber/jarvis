import React, { useState } from 'react';
import MicButton from '../components/MicButton';
import LangBadge from '../components/LangBadge';
import Orb from '../components/Orb';
import { doResearch } from '../services/api';

export default function Research({ jarvis }) {
  const { lang, status, listening, activateMic, researchResult, setResearchResult, sendText } = jarvis;
  const [topic, setTopic] = useState('');
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState(researchResult || null);

  const handleResearch = async (t) => {
    const q = (t || topic).trim();
    if (!q) return;
    setLoading(true);
    setResult(null);
    try {
      const data = await doResearch(q, lang);
      setResult(data);
      setResearchResult(data);
    } catch {
      setResult({ error: true, topic: q });
    } finally {
      setLoading(false);
    }
  };

  const handleSend = () => {
    if (topic.trim()) handleResearch();
  };

  const copyResult = () => {
    if (result?.result) navigator.clipboard.writeText(result.result);
  };

  const shareResult = async () => {
    if (!result?.result) return;
    if (navigator.share) {
      await navigator.share({ title: result.topic, text: result.result });
    } else {
      copyResult();
    }
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100%' }}>

      {/* Header */}
      <div style={{
        display: 'flex', alignItems: 'center', justifyContent: 'space-between',
        padding: '12px 18px 10px',
        borderBottom: '0.5px solid var(--border)',
      }}>
        <div>
          <p style={{ fontSize: 12, color: 'white', fontFamily: 'var(--font-mono)', letterSpacing: 1 , fontWeight: '500'}}>RESEARCH</p>
          <p style={{ fontSize: 13, color: 'var(--blue)' }}>
            {loading
              ? (lang === 'hi' ? 'Research हो रही है...' : 'Researching...')
              : (lang === 'hi' ? 'Topic बोलें या type करें' : 'Speak or type your topic')}
          </p>
        </div>
        <LangBadge lang={lang} />
      </div>

      <div className="page-scroll">
        {/* Orb in research mode */}
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', padding: '20px 0 12px' }}>
          <Orb status={loading ? 'research' : 'idle'} lang={lang} size={80} />
          {loading && (
            <p style={{
              fontSize: 11, color: 'var(--green)',
              fontFamily: 'var(--font-mono)', marginTop: 10,
              letterSpacing: 1, animation: 'blink 1.2s ease infinite',
            }}>
              SCANNING SOURCES...
            </p>
          )}
        </div>

        {/* Result card */}
        {result && !result.error && (
          <div style={{
            margin: '0 14px',
            background: 'var(--bg-card)',
            border: '0.5px solid var(--green-dim)',
            borderRadius: 14,
            overflow: 'hidden',
            animation: 'fadeUp 0.3s ease forwards',
          }}>
            {/* Topic header */}
            <div style={{
              padding: '12px 14px',
              borderBottom: '0.5px solid var(--green-dim)',
              background: 'rgba(74,223,159,0.04)',
            }}>
              <p style={{ fontSize: 10, color: 'var(--green)', fontFamily: 'var(--font-mono)', letterSpacing: 1 }}>
                RESEARCH COMPLETE
              </p>
              <p style={{ fontSize: 15, fontWeight: 600, color: 'var(--text-primary)', marginTop: 2 }}>
                {result.topic}
              </p>
            </div>

            {/* Result text */}
            <div style={{ padding: '14px', maxHeight: 360, overflowY: 'auto' }}>
              <p style={{
                fontSize: 13,
                color: 'var(--text-secondary)',
                lineHeight: 1.65,
                whiteSpace: 'pre-wrap',
                fontFamily: lang === 'hi' ? 'var(--font-hi)' : 'var(--font-ui)',
              }}>
                {result.result}
              </p>
            </div>

            {/* Actions */}
            <div style={{
              display: 'flex', gap: 8, padding: '10px 14px 14px',
            }}>
              {[
                { label: lang === 'hi' ? 'Copy करें' : 'Copy', onClick: copyResult },
                { label: lang === 'hi' ? 'Share करें' : 'Share', onClick: shareResult },
                { label: lang === 'hi' ? 'Clear करें' : 'Clear', onClick: () => setResult(null) },
              ].map(({ label, onClick }) => (
                <button key={label} onClick={onClick} style={{
                  flex: 1, padding: '8px 4px',
                  background: 'transparent',
                  border: '0.5px solid var(--green-dim)',
                  borderRadius: 10,
                  color: 'var(--green)',
                  fontSize: 11,
                  cursor: 'pointer',
                  fontFamily: lang === 'hi' ? 'var(--font-hi)' : 'var(--font-mono)',
                }}>
                  {label}
                </button>
              ))}
            </div>
          </div>
        )}

        {result?.error && (
          <div style={{ textAlign: 'center', padding: '20px', color: 'var(--text-muted)', fontSize: 12 }}>
            {lang === 'hi' ? 'Research failed। फिर try करें।' : 'Research failed. Please try again.'}
          </div>
        )}

        {!result && !loading && (
          <div style={{ textAlign: 'center', padding: '20px 30px', color: 'var(--blue)', fontSize: 12, fontFamily: 'var(--font-mono)', lineHeight: 1.8 }}>
            {lang === 'hi'
              ? '"AI के बारे में research karo" बोलें\nया नीचे topic type करें'
              : 'Say "Research AI for me"\nor type a topic below'}
          </div>
        )}
      </div>

      {/* Input */}
      <div style={{
        display: 'flex', alignItems: 'center', gap: 10,
        padding: '10px 14px 14px',
        borderTop: '0.5px solid var(--border)',
        background: 'var(--bg-secondary)',
      }}>
        <input
          value={topic}
          onChange={e => setTopic(e.target.value)}
          onKeyDown={e => e.key === 'Enter' && handleSend()}
          placeholder={lang === 'hi' ? 'Topic type करें...' : 'Enter research topic...'}
          style={{
            flex: 1, background: 'var(--bg-input)',
            border: '0.5px solid var(--border-light)',
            borderRadius: 22, padding: '10px 16px',
            fontSize: 13, color: 'var(--text-primary)',
            fontFamily: lang === 'hi' ? 'var(--font-hi)' : 'var(--font-ui)', outline: 'none',
          }}
        />
        {topic.trim() ? (
          <button onClick={handleSend} disabled={loading} style={{
            width: 42, height: 42, borderRadius: '50%',
            background: 'var(--green-dim)', border: '1px solid var(--green)',
            color: 'var(--green)', fontSize: 18, cursor: 'pointer',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            opacity: loading ? 0.5 : 1,
          }}>↑</button>
        ) : (
          <MicButton
            listening={listening} lang={lang}
            disabled={loading || status === 'thinking'}
            onClick={activateMic}
          />
        )}
      </div>
    </div>
  );
}
