import { useState, useEffect, useCallback, useRef } from 'react';
import { useSpeech } from './useSpeech';
import {
  chatWithJarvis, doResearch,
  getWeather, getTodayTasks, findContact
} from '../services/api';

export function useJarvis() {
  const [messages,       setMessages]       = useState([]);
  const [lang,           setLang]           = useState('en');
  const [weather,        setWeather]        = useState(null);
  const [tasks,          setTasks]          = useState([]);
  const [status,         setStatus]         = useState('idle');
  const [researchResult, setResearchResult] = useState(null);
  const [callContact,    setCallContact]    = useState(null);
  const [isAwake,        setIsAwake]        = useState(false);
  const [showAssemble,   setShowAssemble]   = useState(false);
  const [wakeArmed,      setWakeArmed]      = useState(false);
  const [conversationMode, setConversationMode] = useState(false);

  const historyRef = useRef([]);
  const langRef    = useRef('en');
  const conversationModeRef = useRef(false);
  const assembleActiveRef = useRef(false);

  useEffect(() => { langRef.current = lang; }, [lang]);
  useEffect(() => { assembleActiveRef.current = showAssemble; }, [showAssemble]);

  const { listening, speaking, startListening,
          startWakeWordListener, stopWakeWordListener, speak, detectLang, supported } = useSpeech({
    onResult:   handleVoiceInput,
    onWakeWord: handleWakeWord,
    lang,
  });

  useEffect(() => {
    if (listening)     setStatus('listening');
    else if (speaking) setStatus('speaking');
    else if (status === 'listening' || status === 'speaking') setStatus('idle');
  }, [listening, speaking]);

  useEffect(() => {
    loadWeather();
    loadTasks();
  }, []);

  async function loadWeather() {
    try { setWeather(await getWeather('Raipur')); } catch {}
  }
  async function loadTasks() {
    try { setTasks(await getTodayTasks()); } catch {}
  }

  const armWakeWord = useCallback(() => {
    startWakeWordListener();
    setWakeArmed(true);
  }, [startWakeWordListener]);

  /* ─── Speak, then auto-resume listening (hands-free loop) ───
     FIXED: now uses the REAL onEnd callback from speak() (which
     fires from the browser's actual utter.onend event), instead
     of a setTimeout estimate based on text.length. The old guess
     (text.length * 48ms) was firing BEFORE longer replies finished
     speaking, which cut Jarvis off mid-sentence and dropped into
     listening mode early — this is the bug you were hitting. */
  function speakAndListen(text, l) {
    speak(text, l, () => {
      if (conversationModeRef.current && !assembleActiveRef.current) {
        setTimeout(() => {
          if (conversationModeRef.current && !assembleActiveRef.current) {
            startListening();
          }
        }, 400);
      }
    });
  }

  /* ─── Greetings ─── */
  const GREETING_HI = `Welcome back Naman sir। आपकी नई SaaS project की launch के लिए बधाई हो। Mr. Vinay और Mr. Sumit आपके call का इंतज़ार कर रहे हैं। आज मैं आपकी क्या सेवा कर सकता हूँ?`;
  const GREETING_EN = `Welcome back, Naman Sir. Congratulations on the launch of your new SaaS project. Mr. Vinay and Mr. Sumit are currently waiting for your call. How may I assist you today?`;

  /* ─── Wake trigger ─── */
  function triggerWake(l = 'hi') {
    setIsAwake(true);
    setStatus('idle');
    conversationModeRef.current = true;
    setConversationMode(true);
    const greeting = l === 'en' ? GREETING_EN : GREETING_HI;
    setLang(l);
    langRef.current = l;
    addMessage('assistant', greeting, l);

    // Assemble opens only once the greeting has TRULY finished
    // speaking (real onEnd), not after an estimated delay.
    speak(greeting, l, () => {
      setShowAssemble(true);
      setStatus('idle');
    });
  }

  function handleWakeWord() {
    triggerWake('hi');
  }

  const resumeAfterAssemble = useCallback(() => {
    setShowAssemble(false);
    // NOTE: AssembleSequence already calls activateMic() itself the instant
    // PROCEED appears (auto-listen, no click needed), so conversationModeRef
    // is already true and the mic may already be open by the time this runs.
    // We only need to resume if, for some reason, that didn't happen (e.g.
    // user clicked PROCEED very fast or activateMic failed silently).
    if (conversationModeRef.current) {
      setTimeout(() => {
        if (conversationModeRef.current) startListening();
      }, 300);
    }
  }, [startListening]);

  /* ─── All text/voice input ─── */
  async function handleVoiceInput(text, detectedLang) {
    if (!text?.trim()) return;
    const l = detectedLang || detectLang(text);
    setLang(l);
    langRef.current = l;

    if (/^(stop listening|jarvis stop|chup ho jao|बंद हो जाओ|stop jarvis)$/i.test(text.trim())) {
      conversationModeRef.current = false;
      setConversationMode(false);
      addMessage('user', text, l);
      const bye = l === 'hi' ? 'ठीक है सर, standby mode में जा रहा हूँ।' : 'Understood sir, going to standby.';
      addMessage('assistant', bye, l);
      speak(bye, l);
      setStatus('idle');
      return;
    }

    if (/jarvis.*(daddy.?s?\s*home)/i.test(text.trim())) {
      addMessage('user', text, 'en');
      triggerWake('en');
      return;
    }

    if (/^(hi|hey|hello|wake\s*up|ok|okay)?\s*(jarvis)\s*(wake\s*up|hi|hey|hello)?$/i.test(text.trim())) {
      addMessage('user', text, 'hi');
      triggerWake('hi');
      return;
    }

    setStatus('thinking');
    addMessage('user', text, l);

    if (/assemble|agents assemble|jarvis assemble/i.test(text)) {
      setShowAssemble(true);
      setStatus('idle');
      return;
    }

    if (/research|खोज|ढूंढ|information about|tell me about/i.test(text)) {
      const topic = text.replace(/research|karo|करो|on|about|ke baare mein|पर|mere liye|मेरे लिए|do|jarvis/gi, '').trim();
      if (topic.length > 2) { await runResearch(topic, l); return; }
    }

    const callMatch = text.match(/call\s+(\w+)|(\w+)\s+ko\s+call|(\w+)\s+को\s+call/i);
    if (callMatch) {
      await handleCall((callMatch[1] || callMatch[2] || callMatch[3]).toLowerCase(), l);
      return;
    }

    try {
      const { reply, action, searchUsed } = await chatWithJarvis(text, historyRef.current, { weather, tasks });
      addMessage('assistant', reply, l, searchUsed);
      speakAndListen(reply, l);
      historyRef.current = [...historyRef.current.slice(-8),
        { role: 'user', content: text }, { role: 'assistant', content: reply }];
      if (action?.action === 'call') await handleCall(action.contact, l);
    } catch {
      const err = l === 'hi' ? 'माफ करें सर, कुछ तकनीकी समस्या आई।' : 'Apologies sir, a technical issue occurred.';
      addMessage('assistant', err, l);
      speakAndListen(err, l);
    } finally { setStatus('idle'); }
  }

  /* ─── Research ─── */
  async function runResearch(topic, l) {
    setStatus('research');
    const thinking = l === 'hi' ? `"${topic}" पर research कर रहा हूँ सर...` : `Researching "${topic}" for you sir...`;
    addMessage('assistant', thinking, l);
    speak(thinking, l);
    try {
      const result = await doResearch(topic, l);
      setResearchResult({ ...result, topic });
      addMessage('assistant', result.result, l, true);
      speakAndListen(l === 'hi' ? 'Research complete है सर।' : 'Research complete sir.', l);
    } catch {
      const err = l === 'hi' ? 'Research में error आई सर।' : 'Research failed sir.';
      addMessage('assistant', err, l);
      speakAndListen(err, l);
    } finally { setStatus('idle'); }
  }

  /* ─── Call ─── */
  async function handleCall(nickname, l) {
    try {
      const contact = await findContact(nickname);
      setCallContact(contact);
      const msg = l === 'hi'
        ? `${contact.real_name || nickname} को connect कर रहा हूँ सर।`
        : `Connecting you to ${contact.real_name || nickname} sir.`;
      addMessage('assistant', msg, l); speakAndListen(msg, l);
    } catch {
      const msg = l === 'hi' ? `${nickname} contacts में नहीं मिला सर।` : `${nickname} not found in contacts sir.`;
      addMessage('assistant', msg, l); speakAndListen(msg, l);
    } finally { setStatus('idle'); }
  }

  function addMessage(role, content, language = 'en', searchUsed = false) {
    const msg = { id: Date.now() + Math.random(), role, content, language, searchUsed: role === 'assistant' && searchUsed, time: new Date() };
    setMessages(prev => [...prev, msg]);
    return msg;
  }

  const sendText = useCallback(async (text) => {
    await handleVoiceInput(text, detectLang(text));
  }, [weather, tasks]);

  const activateMic = useCallback(() => {
    setIsAwake(true);
    conversationModeRef.current = true;
    setConversationMode(true);
    startListening();
  }, [startListening]);

  return {
    messages, lang, weather, tasks, status,
    listening, speaking, isAwake,
    researchResult, callContact, showAssemble,
    setCallContact, setShowAssemble, setResearchResult,
    activateMic, sendText, loadTasks, supported,
    wakeArmed, armWakeWord,
    stopWakeWordListener, startWakeWordListener,
    conversationMode,
    resumeAfterAssemble,
  };
}