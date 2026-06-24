import React, { useState, useRef, useEffect } from 'react';
import Orb from '../components/Orb';
import { agentSpeak } from '../utils/agentVoices';

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:5001';
const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;

export default function Harold({ jarvis }) {
  const { lang } = jarvis;
  const [mode, setMode] = useState('home'); // home | recording | summary | history
  const [recording, setRecording] = useState(false);
  const [transcript, setTranscript] = useState('');
  const [interimText, setInterimText] = useState('');
  const [summary, setSummary] = useState(null);
  const [meetings, setMeetings] = useState([]);
  const [loading, setLoading] = useState(false);
  const [meetingTitle, setMeetingTitle] = useState('');
  const [timer, setTimer] = useState(0);
  const [selectedMeeting, setSelectedMeeting] = useState(null);
  const recognitionRef = useRef(null);
  const timerRef = useRef(null);

const speak = (text) => agentSpeak(text, lang, 'harold');

useEffect(() => {
  // Cancel any ongoing speech from previous tab
  window.speechSynthesis?.cancel();

  const timer = setTimeout(() => {
    speak(lang === 'hi'
      ? 'HAROLD reporting sir. Whisper Prime ready. Meeting transcription available.'
      : 'HAROLD reporting sir. Whisper Prime ready. Meeting transcription system online.'
    );
  }, 800);

  loadMeetings();

  return () => {
    clearTimeout(timer);
    window.speechSynthesis?.cancel();
  };
}, []);

  const loadMeetings = async () => {
    try {
      const res = await fetch(`${API_URL}/api/harold/meetings`);
      const data = await res.json();
      setMeetings(data);
    } catch {}
  };

  // ── Start recording ────────────────────────────────
  const startRecording = () => {
    if (!SpeechRecognition) {
      alert('Please use Chrome for recording.');
      return;
    }

    const recognition = new SpeechRecognition();
    recognitionRef.current = recognition;
    recognition.lang = lang === 'hi' ? 'hi-IN' : 'en-IN';
    recognition.continuous = true;
    recognition.interimResults = true;

    recognition.onresult = (e) => {
      let final = '';
      let interim = '';
      for (let i = 0; i < e.results.length; i++) {
        if (e.results[i].isFinal) {
          final += e.results[i][0].transcript + ' ';
        } else {
          interim += e.results[i][0].transcript;
        }
      }
      if (final) setTranscript(prev => prev + final);
      setInterimText(interim);
    };

    recognition.onerror = (e) => {
      if (e.error !== 'no-speech') {
        console.log('Recording error:', e.error);
      }
    };

    recognition.onend = () => {
      // Auto restart if still recording
      if (recording) {
        try { recognition.start(); } catch {}
      }
    };

    recognition.start();
    setRecording(true);
    setMode('recording');
    setTranscript('');
    setInterimText('');
    setTimer(0);

    // Start timer
    timerRef.current = setInterval(() => {
      setTimer(prev => prev + 1);
    }, 1000);

    speak(lang === 'hi'
      ? 'Recording शुरू हो गई है सर।'
      : 'Recording started sir. Whisper Prime is listening.'
    );
  };

  // ── Stop recording ─────────────────────────────────
  const stopRecording = () => {
    try { recognitionRef.current?.stop(); } catch {}
    setRecording(false);
    clearInterval(timerRef.current);
    setInterimText('');
    speak(lang === 'hi'
      ? 'Recording रुक गई। Summary तैयार कर रहा हूँ।'
      : 'Recording stopped sir. Preparing summary now.'
    );
  };

  // ── Summarize ──────────────────────────────────────
  const summarizeMeeting = async () => {
    if (!transcript.trim()) {
      speak(lang === 'hi' ? 'कोई transcript नहीं मिला सर।' : 'No transcript to summarize sir.');
      return;
    }
    setLoading(true);
    try {
      const res = await fetch(`${API_URL}/api/harold/summarize`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          transcript,
          title: meetingTitle || `Meeting ${new Date().toLocaleDateString('en-IN')}`,
          lang,
        }),
      });
      const data = await res.json();
      setSummary(data.summary);
      setMode('summary');
      loadMeetings();
      speak(lang === 'hi'
        ? 'Summary तैयार है सर।'
        : 'Summary ready sir. Meeting has been saved.'
      );
    } catch {
      speak(lang === 'hi' ? 'Summary में error आई।' : 'Summary failed sir.');
    } finally {
      setLoading(false);
    }
  };

  const formatTime = (seconds) => {
    const m = Math.floor(seconds / 60).toString().padStart(2, '0');
    const s = (seconds % 60).toString().padStart(2, '0');
    return `${m}:${s}`;
  };

  const copyText = (text) => {
    navigator.clipboard?.writeText(text);
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100%' }}>

      {/* Header */}
      <div style={{
        padding: '12px 18px 10px',
        borderBottom: '0.5px solid var(--border)',
        display: 'flex', alignItems: 'center', justifyContent: 'space-between',
      }}>
        <div>
          <p style={{ fontSize: 12, color: 'white', fontFamily: 'var(--font-mono)', letterSpacing: 1 , fontWeight:'500' }}>HAROLD AGENT</p>
          <p style={{ fontSize: 13, color: 'var(--blue)' }}>Whisper Prime — Meeting Transcription</p>
        </div>
        <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
          <button onClick={() => setMode('history')} style={{
            fontSize: 10, padding: '3px 10px', borderRadius: 10,
            background: mode === 'history' ? 'rgba(74,158,255,0.1)' : 'transparent',
            border: '0.5px solid var(--blue-dim)', color: 'var(--blue)',
            cursor: 'pointer', fontFamily: 'var(--font-mono)',
          }}>
            {meetings.length} meetings
          </button>
          <span style={{
            fontSize: 10, padding: '2px 8px', borderRadius: 10,
            background: recording ? 'rgba(255,90,90,0.1)' : 'rgba(74,158,255,0.1)',
            border: `0.5px solid ${recording ? '#ff5a5a' : 'var(--blue-dim)'}`,
            color: recording ? '#ff5a5a' : 'var(--blue)',
            fontFamily: 'var(--font-mono)',
            animation: recording ? 'blink 1s infinite' : 'none',
          }}>
            {recording ? '● REC' : 'HAROLD'}
          </span>
        </div>
      </div>

      <div className="page-scroll">

        {/* HOME mode */}
        {mode === 'home' && (
          <div style={{ padding: '20px 16px' }}>
            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', padding: '10px 0 24px' }}>
              <Orb status="idle" lang="en" size={80} />
              <p style={{ fontSize: 13, color: 'white', fontFamily: 'var(--font-ui)', marginTop: 10, fontWeight: 500 }}>
                HAROLD — Whisper Prime
              </p>
              <p style={{ fontSize: 11, color: 'var(--blue)', marginTop: 4, textAlign: 'center', fontFamily: 'var(--font-mono)' , fontWeight:400}}>
                Record meetings • Get AI summaries • Track action items
              </p>
            </div>

            {/* Meeting title input */}
            <input
              value={meetingTitle}
              onChange={e => setMeetingTitle(e.target.value)}
              placeholder="Meeting title (optional)"
              style={{
                width: '100%', background: 'var(--bg-input)',
                border: '0.5px solid var(--border-light)',
                borderRadius: 10, padding: '10px 14px',
                fontSize: 13, color: 'var(--text-primary)',
                fontFamily: 'var(--font-ui)', outline: 'none',
                marginBottom: 12,
              }}
            />

            {/* Start recording button */}
            <button onClick={startRecording} style={{
              width: '100%', padding: '16px',
              background: 'rgba(74,158,255,0.1)',
              border: '1px solid var(--blue)',
              borderRadius: 14, color: 'var(--blue)',
              fontSize: 15, fontWeight: 500,
              cursor: 'pointer', fontFamily: 'var(--font-ui)',
              display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 10,
            }}>
              🎙️ Start Recording
            </button>

            {/* Recent meetings preview */}
            {meetings.length > 0 && (
              <div style={{ marginTop: 24 }}>
                <p style={{ fontSize: 9, color: 'var(--text-muted)', fontFamily: 'var(--font-mono)', letterSpacing: 1.5, textTransform: 'uppercase', marginBottom: 10 }}>
                  Recent Meetings
                </p>
                {meetings.slice(0, 3).map(m => (
                  <div key={m.id} onClick={() => { setSelectedMeeting(m); setMode('history'); }}
                    style={{
                      background: 'var(--bg-card)', border: '0.5px solid var(--border-light)',
                      borderRadius: 10, padding: '10px 12px', marginBottom: 8, cursor: 'pointer',
                    }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 3 }}>
                      <span style={{ fontSize: 12, fontWeight: 500, color: 'var(--text-primary)' }}>{m.title}</span>
                      <span style={{ fontSize: 9, color: 'var(--text-muted)', fontFamily: 'var(--font-mono)' }}>
                        {new Date(m.created_at).toLocaleDateString('en-IN')}
                      </span>
                    </div>
                    <p style={{ fontSize: 11, color: 'var(--text-muted)', lineHeight: 1.4 }}>
                      {m.summary?.slice(0, 80)}...
                    </p>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* RECORDING mode */}
        {mode === 'recording' && (
          <div style={{ padding: '16px' }}>
            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', padding: '10px 0 16px' }}>
              <Orb status="listening" lang="en" size={80} />
              <p style={{ fontSize: 24, color: '#ff5a5a', fontFamily: 'var(--font-mono)', marginTop: 10, animation: 'blink 1s infinite' }}>
                {formatTime(timer)}
              </p>
              <p style={{ fontSize: 10, color: '#ff5a5a', fontFamily: 'var(--font-mono)', letterSpacing: 1 }}>
                RECORDING IN PROGRESS
              </p>
            </div>

            {/* Live transcript */}
            <div style={{
              background: 'var(--bg-card)', border: '0.5px solid var(--border-light)',
              borderRadius: 12, padding: '12px', minHeight: 120, maxHeight: 280,
              overflowY: 'auto', marginBottom: 12,
            }}>
              <p style={{ fontSize: 10, color: 'var(--text-muted)', fontFamily: 'var(--font-mono)', letterSpacing: 1, marginBottom: 8 }}>
                LIVE TRANSCRIPT
              </p>
              <p style={{ fontSize: 13, color: 'var(--text-primary)', lineHeight: 1.6, whiteSpace: 'pre-wrap', userSelect: 'text', WebkitUserSelect: 'text' }}>
                {transcript}
                <span style={{ color: 'var(--text-muted)', fontStyle: 'italic' }}>{interimText}</span>
              </p>
              {!transcript && !interimText && (
                <p style={{ fontSize: 11, color: 'var(--text-muted)', fontFamily: 'var(--font-mono)', animation: 'blink 1.2s infinite' }}>
                  Listening...
                </p>
              )}
            </div>

            {/* Stop + Summarize buttons */}
            <div style={{ display: 'flex', gap: 8 }}>
              <button onClick={stopRecording} style={{
                flex: 1, padding: '12px',
                background: 'rgba(255,90,90,0.1)',
                border: '1px solid #ff5a5a',
                borderRadius: 12, color: '#ff5a5a',
                fontSize: 13, fontWeight: 500, cursor: 'pointer',
              }}>
                ⏹ Stop
              </button>
              <button onClick={() => { stopRecording(); setTimeout(summarizeMeeting, 500); }}
                disabled={!transcript} style={{
                  flex: 2, padding: '12px',
                  background: transcript ? 'rgba(74,158,255,0.1)' : 'transparent',
                  border: '1px solid var(--blue)',
                  borderRadius: 12, color: 'var(--blue)',
                  fontSize: 13, fontWeight: 500, cursor: 'pointer',
                  opacity: transcript ? 1 : 0.4,
                }}>
                🤖 Stop & Summarize
              </button>
            </div>
          </div>
        )}

        {/* SUMMARY mode */}
        {mode === 'summary' && (
          <div style={{ padding: '16px' }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 14 }}>
              <p style={{ fontSize: 13, fontWeight: 500, color: 'var(--text-primary)' }}>Meeting Summary</p>
              <button onClick={() => setMode('home')} style={{
                padding: '5px 12px', background: 'transparent',
                border: '0.5px solid var(--border-light)',
                borderRadius: 8, color: 'var(--text-secondary)',
                fontSize: 11, cursor: 'pointer',
              }}>← Back</button>
            </div>

            {loading ? (
              <div style={{ textAlign: 'center', padding: '40px' }}>
                <p style={{ color: 'var(--blue)', fontFamily: 'var(--font-mono)', animation: 'blink 1s infinite' }}>
                  HAROLD summarizing...
                </p>
              </div>
            ) : summary && (
              <div style={{
                background: 'var(--bg-card)', border: '0.5px solid var(--blue-dim)',
                borderRadius: 14, overflow: 'hidden', marginBottom: 12,
              }}>
                <div style={{ padding: '10px 14px', borderBottom: '0.5px solid var(--blue-dim)', background: 'rgba(74,158,255,0.04)', display: 'flex', justifyContent: 'space-between' }}>
                  <span style={{ fontSize: 10, color: 'var(--blue)', fontFamily: 'var(--font-mono)', letterSpacing: 1 }}>AI SUMMARY</span>
                  <button onClick={() => copyText(summary)} style={{ fontSize: 10, color: 'var(--text-muted)', background: 'transparent', border: 'none', cursor: 'pointer' }}>Copy</button>
                </div>
                <div style={{ padding: '14px', userSelect: 'text', WebkitUserSelect: 'text' }}>
                  <p style={{ fontSize: 13, color: 'var(--text-secondary)', lineHeight: 1.7, whiteSpace: 'pre-wrap' }}>{summary}</p>
                </div>
              </div>
            )}

            <button onClick={() => { setMode('home'); setTranscript(''); setSummary(null); setMeetingTitle(''); }} style={{
              width: '100%', padding: '12px',
              background: 'rgba(74,158,255,0.1)',
              border: '1px solid var(--blue)',
              borderRadius: 12, color: 'var(--blue)',
              fontSize: 13, cursor: 'pointer',
            }}>
              🎙️ New Recording
            </button>
          </div>
        )}

        {/* HISTORY mode */}
        {mode === 'history' && (
          <div style={{ padding: '16px' }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 14 }}>
              <p style={{ fontSize: 13, fontWeight: 500, color: 'var(--text-primary)' }}>Past Meetings</p>
              <button onClick={() => setMode('home')} style={{
                padding: '5px 12px', background: 'transparent',
                border: '0.5px solid var(--border-light)',
                borderRadius: 8, color: 'var(--text-secondary)',
                fontSize: 11, cursor: 'pointer',
              }}>← Back</button>
            </div>

            {selectedMeeting ? (
              <div>
                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 10 }}>
                  <p style={{ fontSize: 13, fontWeight: 500, color: 'var(--text-primary)' }}>{selectedMeeting.title}</p>
                  <button onClick={() => setSelectedMeeting(null)} style={{ fontSize: 10, color: 'var(--text-muted)', background: 'transparent', border: 'none', cursor: 'pointer' }}>← Back</button>
                </div>
                <div style={{ background: 'var(--bg-card)', border: '0.5px solid var(--blue-dim)', borderRadius: 12, padding: '14px', userSelect: 'text', WebkitUserSelect: 'text' }}>
                  <p style={{ fontSize: 13, color: 'var(--text-secondary)', lineHeight: 1.7, whiteSpace: 'pre-wrap' }}>{selectedMeeting.summary}</p>
                </div>
              </div>
            ) : (
              meetings.length === 0 ? (
                <p style={{ textAlign: 'center', color: 'var(--text-muted)', fontSize: 12, padding: '40px 0', fontFamily: 'var(--font-mono)' }}>
                  No meetings recorded yet sir.
                </p>
              ) : (
                meetings.map(m => (
                  <div key={m.id} onClick={() => setSelectedMeeting(m)} style={{
                    background: 'var(--bg-card)', border: '0.5px solid var(--border-light)',
                    borderRadius: 10, padding: '12px', marginBottom: 8, cursor: 'pointer',
                  }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 4 }}>
                      <span style={{ fontSize: 13, fontWeight: 500, color: 'var(--text-primary)' }}>{m.title}</span>
                      <span style={{ fontSize: 9, color: 'var(--text-muted)', fontFamily: 'var(--font-mono)' }}>
                        {new Date(m.created_at).toLocaleDateString('en-IN')}
                      </span>
                    </div>
                    <p style={{ fontSize: 11, color: 'var(--text-muted)', lineHeight: 1.4 }}>
                      {m.summary?.slice(0, 100)}...
                    </p>
                  </div>
                ))
              )
            )}
          </div>
        )}

      </div>
    </div>
  );
}