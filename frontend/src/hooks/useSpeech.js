// frontend/src/hooks/useSpeech.js
// Complete rewrite — fixes PWA mic loop, cross-device voice, wake word

import { useState, useRef, useCallback, useEffect } from 'react';

// ── Voice loader (waits for voices to be ready) ──
let voicesCache = [];
let voicesReady = false;

function loadVoices() {
  return new Promise((resolve) => {
    const synth = window.speechSynthesis;
    if (!synth) return resolve([]);
    const existing = synth.getVoices();
    if (existing.length > 0) {
      voicesCache = existing; voicesReady = true; return resolve(existing);
    }
    const handler = () => {
      voicesCache = synth.getVoices(); voicesReady = true;
      synth.removeEventListener('voiceschanged', handler);
      resolve(voicesCache);
    };
    synth.addEventListener('voiceschanged', handler);
    let tries = 0;
    const poll = setInterval(() => {
      const v = synth.getVoices();
      if (v.length > 0 || ++tries > 20) {
        voicesCache = v; voicesReady = true;
        clearInterval(poll);
        synth.removeEventListener('voiceschanged', handler);
        resolve(v);
      }
    }, 200);
  });
}

function pickVoice(voices, lang) {
  if (!voices?.length) return null;
  if (lang === 'hi') {
    return voices.find(v => v.lang === 'hi-IN')
      || voices.find(v => v.lang?.startsWith('hi'))
      || voices.find(v => v.name?.toLowerCase().includes('hindi'))
      || null;
  }
  return voices.find(v => v.lang === 'en-IN')
    || voices.find(v => v.lang === 'en-US')
    || voices.find(v => v.lang?.startsWith('en'))
    || voices[0] || null;
}

// ── Global mic lock — prevents multiple instances fighting ──
let micLocked = false;

export function useSpeech({ onResult, onWakeWord, lang = 'en' }) {
  const [listening, setListening] = useState(false);
  const [speaking, setSpeaking] = useState(false);
  const [supported, setSupported] = useState(true);

  const recognitionRef = useRef(null);
  const wakeRef = useRef(null);
  const wakeActiveRef = useRef(false);
  const wantWakeRef = useRef(false);
  const isMountedRef = useRef(true);

  useEffect(() => {
    isMountedRef.current = true;
    loadVoices();
    return () => {
      isMountedRef.current = false;
      stopWakeWordListener();
      stopListening();
    };
  }, []);

  // ── SPEAK — robust, waits for voices, no interruption loops ──
  const speak = useCallback(async (text, language = lang) => {
    if (!text || !window.speechSynthesis) return;
    window.speechSynthesis.cancel();

    let voices = voicesCache;
    if (!voicesReady || voices.length === 0) voices = await loadVoices();

    return new Promise((resolve) => {
      const utter = new SpeechSynthesisUtterance(text);
      utter.lang = language === 'hi' ? 'hi-IN' : 'en-IN';
      utter.rate = 0.95;
      utter.volume = 1.0;
      const voice = pickVoice(voices, language);
      if (voice) { utter.voice = voice; utter.lang = voice.lang; }

      if (isMountedRef.current) setSpeaking(true);
      utter.onend = () => { if (isMountedRef.current) setSpeaking(false); resolve(); };
      utter.onerror = () => { if (isMountedRef.current) setSpeaking(false); resolve(); };

      // PWA fix: Chrome on Android sometimes needs a small delay
      setTimeout(() => window.speechSynthesis.speak(utter), 50);
    });
  }, [lang]);

  // ── STOP LISTENING ──
  const stopListening = useCallback(() => {
    if (recognitionRef.current) {
      try { recognitionRef.current.abort(); } catch {}
      recognitionRef.current = null;
    }
    micLocked = false;
    if (isMountedRef.current) setListening(false);
  }, []);

  // ── ONE-SHOT MIC (for manual mic button) ──
  const startListening = useCallback(() => {
    const SR = window.SpeechRecognition || window.webkitSpeechRecognition;
    if (!SR) { setSupported(false); return; }

    // Stop wake word first to release mic
    if (wakeActiveRef.current) stopWakeWordListener();

    // Prevent double-start
    if (micLocked) return;
    micLocked = true;

    const rec = new SR();
    recognitionRef.current = rec;
    rec.lang = lang === 'hi' ? 'hi-IN' : 'en-IN';
    rec.continuous = false;
    rec.interimResults = false;
    rec.maxAlternatives = 1;

    rec.onstart = () => { if (isMountedRef.current) setListening(true); };

    rec.onresult = (e) => {
      const text = e.results[0][0].transcript;
      const detected = /[\u0900-\u097F]/.test(text) ? 'hi' : 'en';
      onResult?.(text, detected);
    };

    rec.onend = () => {
      micLocked = false;
      if (isMountedRef.current) setListening(false);
      recognitionRef.current = null;
      // Resume wake word if it was wanted
      if (wantWakeRef.current) {
        setTimeout(() => startWakeWordListener(), 800);
      }
    };

    rec.onerror = (e) => {
      micLocked = false;
      if (isMountedRef.current) setListening(false);
      recognitionRef.current = null;
      if (e.error !== 'no-speech' && e.error !== 'aborted') {
        console.log('[Mic] Error:', e.error);
      }
      if (wantWakeRef.current) {
        setTimeout(() => startWakeWordListener(), 1000);
      }
    };

    try { rec.start(); } catch (e) {
      micLocked = false;
      if (isMountedRef.current) setListening(false);
    }
  }, [lang, onResult]);

  // ── WAKE WORD LISTENER (continuous, background) ──
  const startWakeWordListener = useCallback(() => {
    const SR = window.SpeechRecognition || window.webkitSpeechRecognition;
    if (!SR || wakeActiveRef.current || micLocked) return;

    wantWakeRef.current = true;
    wakeActiveRef.current = true;

    const wake = new SR();
    wakeRef.current = wake;
    wake.lang = 'en-IN';
    wake.continuous = false; // PWA fix: use false + restart on end (more stable than true on mobile)
    wake.interimResults = false;
    wake.maxAlternatives = 1;

    wake.onresult = (e) => {
      const text = e.results[0][0].transcript.toLowerCase();
      console.log('[Wake] Heard:', text);
      if (text.includes('jarvis') || text.includes('jarvis') || text.includes('जार्विस')) {
        onWakeWord?.();
      }
    };

    wake.onend = () => {
      wakeActiveRef.current = false;
      wakeRef.current = null;
      // Only restart if still wanted and mic not in use
      if (wantWakeRef.current && !micLocked && isMountedRef.current) {
        setTimeout(() => startWakeWordListener(), 500);
      }
    };

    wake.onerror = (e) => {
      wakeActiveRef.current = false;
      wakeRef.current = null;
      if (e.error === 'not-allowed') {
        wantWakeRef.current = false; return; // permissions denied — stop trying
      }
      if (wantWakeRef.current && !micLocked && isMountedRef.current) {
        setTimeout(() => startWakeWordListener(), 2000);
      }
    };

    try { wake.start(); } catch (e) {
      wakeActiveRef.current = false;
      wakeRef.current = null;
    }
  }, [onWakeWord]);

  // ── STOP WAKE WORD ──
  const stopWakeWordListener = useCallback(() => {
    wantWakeRef.current = false;
    wakeActiveRef.current = false;
    if (wakeRef.current) {
      try { wakeRef.current.abort(); } catch {}
      wakeRef.current = null;
    }
  }, []);

  const detectLang = useCallback((text) => {
    return /[\u0900-\u097F]/.test(text) ? 'hi' : 'en';
  }, []);

  return {
    listening, speaking, supported,
    startListening, stopListening,
    startWakeWordListener, stopWakeWordListener,
    speak, detectLang,
  };
}