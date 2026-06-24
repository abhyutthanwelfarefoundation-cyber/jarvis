import { useEffect, useRef } from 'react';
import { agentSpeak } from '../utils/agentVoices';

// Use this in every agent page to announce once and cleanup properly
export function useAgentInit(agentId, lang, getAnnounceLine) {
  const mountedRef = useRef(true);
  const announcedRef = useRef(false);

  useEffect(() => {
    mountedRef.current = true;
    window.speechSynthesis?.cancel();

    if (!announcedRef.current) {
      announcedRef.current = true;
      const timer = setTimeout(() => {
        if (mountedRef.current) {
          const line = getAnnounceLine();
          agentSpeak(line, lang, agentId);
        }
      }, 600);
      return () => {
        clearTimeout(timer);
        mountedRef.current = false;
        window.speechSynthesis?.cancel();
        announcedRef.current = false; // reset so it announces next time you visit
      };
    }

    return () => {
      mountedRef.current = false;
      window.speechSynthesis?.cancel();
      announcedRef.current = false;
    };
  }, []);

  return mountedRef;
}