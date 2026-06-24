import { useState, useEffect, useRef, useCallback } from 'react';

const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;

export function useSpeech({ onResult, onWakeWord, lang = 'en' }) {
  const [listening, setListening] = useState(false);
  const [speaking, setSpeaking] = useState(false);

  const recognitionRef  = useRef(null);
  const wakeRef         = useRef(null);
  const wakeActiveRef   = useRef(false);
  const wantWakeRef     = useRef(true);
  const synthRef        = useRef(window.speechSynthesis);
  const startTimerRef   = useRef(null);
  const safetyTimerRef  = useRef(null);
  const langRef         = useRef(lang);

  useEffect(() => { langRef.current = lang; }, [lang]);

  /* ── Language detection ── */
  const detectLang = useCallback((text) => {
    const hi = /[\u0900-\u097F]/.test(text) ||
      /\b(karo|kya|hai|nahi|mera|aaj|kal|batao|sun|bhai|haan|kaise|kyun|mere|liye|jarvis)\b/i.test(text);
    return hi ? 'hi' : 'en';
  }, []);

  /* ── Speak ───────────────────────────────────────────────
     THE KEY CHANGE: speak() now takes a 3rd argument, onEnd —
     a callback fired from the REAL utter.onend event (true
     completion), not a setTimeout guess. Every caller that
     wants to know "is Jarvis done talking yet" should use this
     instead of estimating from text.length. */
  const speak = useCallback((text, language = 'en', onEnd) => {
    if (!text) { onEnd?.(); return; }
    synthRef.current?.cancel();

    const clean = text
      .replace(/\*\*(.*?)\*\*/g, '$1')
      .replace(/\*(.*?)\*/g, '$1')
      .replace(/#{1,6}\s/g, '')
      .replace(/[🎉🔍🌐✅❌⚠️💡🧠📱🎙️•]/g, '')
      .replace(/\[.*?\]/g, '')
      .replace(/```[\s\S]*?```/g, '')
      .trim();
    if (!clean) { onEnd?.(); return; }

    const utter = new SpeechSynthesisUtterance(clean);
    utter.lang = language === 'hi' ? 'hi-IN' : 'en-IN';
    utter.rate = 1.05; utter.pitch = 1.0; utter.volume = 1.0;

    const voices = synthRef.current?.getVoices() || [];
    const voice = voices.find(v =>
      language === 'hi' ? v.lang.includes('hi') : (v.lang.includes('en-IN') || v.lang.includes('en-GB') || v.lang.startsWith('en'))
    );
    if (voice) utter.voice = voice;

    utter.onstart = () => setSpeaking(true);
    utter.onend = () => {
      setSpeaking(false);
      onEnd?.(); // ← fires exactly when speech truly finishes

      setTimeout(() => {
        if (wantWakeRef.current && !recognitionRef.current) startWakeWordListener();
      }, 600);
    };
    utter.onerror = () => {
      setSpeaking(false);
      onEnd?.(); // still fire so callers never hang on error
    };

    synthRef.current?.speak(utter);
  }, []);

  const stopSpeaking = useCallback(() => {
    synthRef.current?.cancel();
    setSpeaking(false);
  }, []);

  /* ── Hard stop of wake-word recognizer ── */
  const killWakeWord = useCallback(() => {
    wantWakeRef.current = false;
    if (wakeRef.current) {
      try { wakeRef.current.onend = null; wakeRef.current.onerror = null; } catch {}
      try { wakeRef.current.abort(); } catch {}
    }
    wakeRef.current = null;
    wakeActiveRef.current = false;
  }, []);

  /* ── One-shot mic (manual button) ── */
  const startListening = useCallback(() => {
    if (!SpeechRecognition) {
      alert('Please use Chrome for voice features.');
      return;
    }

    killWakeWord();

    clearTimeout(startTimerRef.current);
    clearTimeout(safetyTimerRef.current);
    if (recognitionRef.current) {
      try { recognitionRef.current.onend = null; recognitionRef.current.onerror = null; } catch {}
      try { recognitionRef.current.abort(); } catch {}
      recognitionRef.current = null;
    }
    // Only cancel speech if something is ACTUALLY still playing.
    // Since callers now wait for the real onEnd before calling
    // startListening(), this should rarely have anything to cancel —
    // but we keep it as a safety net for the manual mic button case
    // (user taps mic while Jarvis is still mid-sentence).
    synthRef.current?.cancel();
    setListening(false);

    startTimerRef.current = setTimeout(() => {
      const r = new SpeechRecognition();
      recognitionRef.current = r;

      r.lang = langRef.current === 'hi' ? 'hi-IN' : 'en-IN';
      r.interimResults = false;
      r.maxAlternatives = 1;
      r.continuous = false;

      let gotResult = false;

      r.onstart = () => {
        setListening(true);
        safetyTimerRef.current = setTimeout(() => {
          try { r.stop(); } catch {}
        }, 10000);
      };

      r.onresult = (e) => {
        gotResult = true;
        clearTimeout(safetyTimerRef.current);
        const text = e.results[0][0].transcript;
        setListening(false);
        onResult?.(text, detectLang(text));
      };

      r.onerror = (e) => {
        clearTimeout(safetyTimerRef.current);
        setListening(false);
        recognitionRef.current = null;
        if (e.error === 'not-allowed') {
          alert('Microphone blocked!\n\n1. Click the 🔒 lock icon in Chrome address bar\n2. Set Microphone to Allow\n3. Refresh the page');
        }
        wantWakeRef.current = true;
        setTimeout(() => startWakeWordListener(), 800);
      };

      r.onend = () => {
        clearTimeout(safetyTimerRef.current);
        setListening(false);
        recognitionRef.current = null;
        if (!gotResult) {
          wantWakeRef.current = true;
          setTimeout(() => startWakeWordListener(), 800);
        }
      };

      try {
        r.start();
      } catch (err) {
        setListening(false);
        recognitionRef.current = null;
        wantWakeRef.current = true;
        setTimeout(() => startWakeWordListener(), 800);
      }
    }, 300);
  }, [onResult, detectLang, killWakeWord]);

  const stopListening = useCallback(() => {
    clearTimeout(startTimerRef.current);
    clearTimeout(safetyTimerRef.current);
    if (recognitionRef.current) {
      try { recognitionRef.current.onend = null; recognitionRef.current.onerror = null; } catch {}
      try { recognitionRef.current.stop(); } catch {}
      recognitionRef.current = null;
    }
    setListening(false);
    wantWakeRef.current = true;
    setTimeout(() => startWakeWordListener(), 500);
  }, []);

  /* ── Wake word (continuous background) ── */
  const startWakeWordListener = useCallback(() => {
    if (!SpeechRecognition) return;
    if (wakeActiveRef.current) return;
    if (recognitionRef.current) return;
    if (!wantWakeRef.current) return;

    if (wakeRef.current) {
      try { wakeRef.current.abort(); } catch {}
      wakeRef.current = null;
    }

    const w = new SpeechRecognition();
    wakeRef.current = w;
    w.lang = 'en-IN';
    w.continuous = true;
    w.interimResults = true;

    w.onresult = (e) => {
      const text = Array.from(e.results).map(r => r[0].transcript).join(' ').toLowerCase();
      if (text.includes('jarvis')) {
        try { w.onend = null; w.stop(); } catch {}
        wakeRef.current = null;
        wakeActiveRef.current = false;
        onWakeWord?.(text);
      }
    };

    w.onend = () => {
      wakeActiveRef.current = false;
      wakeRef.current = null;
      if (wantWakeRef.current && !recognitionRef.current) {
        setTimeout(() => startWakeWordListener(), 1000);
      }
    };

    w.onerror = (e) => {
      wakeActiveRef.current = false;
      wakeRef.current = null;
      if (e.error === 'not-allowed') return;
      if (wantWakeRef.current && !recognitionRef.current) {
        setTimeout(() => startWakeWordListener(), 1500);
      }
    };

    try {
      w.start();
      wakeActiveRef.current = true;
    } catch {
      wakeActiveRef.current = false;
    }
  }, [onWakeWord]);

  const stopWakeWordListener = useCallback(() => {
    wantWakeRef.current = false;
    if (wakeRef.current) {
      try { wakeRef.current.onend = null; wakeRef.current.abort(); } catch {}
    }
    wakeRef.current = null;
    wakeActiveRef.current = false;
  }, []);

  /* ── Voices ── */
  useEffect(() => {
    const load = () => synthRef.current?.getVoices();
    load();
    window.speechSynthesis?.addEventListener('voiceschanged', load);
    return () => window.speechSynthesis?.removeEventListener('voiceschanged', load);
  }, []);

  /* ── Cleanup ── */
  useEffect(() => {
    return () => {
      clearTimeout(startTimerRef.current);
      clearTimeout(safetyTimerRef.current);
      try { recognitionRef.current?.abort(); } catch {}
      try { wakeRef.current?.abort(); } catch {}
      synthRef.current?.cancel();
    };
  }, []);

  return {
    listening, speaking,
    startListening, stopListening,
    startWakeWordListener, stopWakeWordListener,
    speak, stopSpeaking, detectLang,
    supported: !!SpeechRecognition,
  };
}