// Agent voice system — works with available browser voices
// Each agent gets different pitch/rate to sound distinct
// FRIDAY uses female-correct Hindi grammar

export const AGENT_CONFIG = {
  jarvis: { rate: 0.92, pitch: 0.8,  gender: 'male'   },
  friday: { rate: 1.00, pitch: 1.0, gender: 'female'  },
  harold: { rate: 0.95, pitch: 0.88, gender: 'male'    },
  zeus:   { rate: 1.0,  pitch: 0.75, gender: 'male'    },
  stark:  { rate: 1.08, pitch: 1.0,  gender: 'male'    },
  default:{ rate: 1.0,  pitch: 1.0,  gender: 'male'    },
};

const FEMALE_HINDI_MAP = [
  ['कर रहा हूँ',   'कर रही हूँ'   ],
  ['कर रहा हूं',   'कर रही हूं'   ],
  ['रहा हूँ',      'रही हूँ'      ],
  ['रहा हूं',      'रही हूं'      ],
  ['कर रहा',       'कर रही'       ],
  ['आया हूँ',      'आई हूँ'       ],
  ['गया हूँ',      'गई हूँ'       ],
  ['तैयार हूँ',    'तैयार हूँ'    ],
  ['ready हूँ',    'ready हूँ'    ],
  ['हो गया',       'हो गई'        ],
  ['compile कर रहा हूँ', 'compile कर रही हूँ'],
  ['track कर रहा हूँ',   'track कर रही हूँ'  ],
  ['report कर रहा हूँ',  'report कर रही हूँ' ],
  ['online हूँ',   'online हूँ'   ],
];

function applyFemaleHindi(text) {
  let result = text;
  for (const [male, female] of FEMALE_HINDI_MAP) {
    result = result.replaceAll(male, female);
  }
  return result;
}

function getBestVoice(voices, lang) {
  if (lang === 'hi') {
    return (
      voices.find(v => v.lang === 'hi-IN') ||
      voices.find(v => v.lang.startsWith('hi')) ||
      voices.find(v => v.lang.startsWith('en-IN')) ||
      voices[0]
    );
  }
  return (
    voices.find(v => v.lang === 'en-IN') ||
    voices.find(v => v.lang === 'en-GB') ||
    voices.find(v => v.lang.startsWith('en')) ||
    voices[0]
  );
}

/* ═══════════════════════════════════════════════════════
   CANCELLATION TOKEN — module-level, monotonically increasing.
   This is THE FIX for the "skip doesn't actually stop the chain"
   bug. Every agentSpeakThen() call captures the CURRENT token
   value when it starts. Before firing its callback (which is
   what triggers the NEXT agent's speech in a chain), it checks
   whether the token is still the same. If something called
   cancelAgentSpeech() in the meantime (token bumped), the chain
   dies right there — the pending setTimeout/onend from the OLD
   utterance becomes a no-op instead of continuing the sequence.

   This works because setTimeout/onend callbacks are NOT tied to
   React's component lifecycle — unmounting AssembleSequence does
   NOT cancel them on its own. We need this explicit token check.
═══════════════════════════════════════════════════════ */
let speechToken = 0;

export function cancelAgentSpeech() {
  speechToken++;                 // invalidates any in-flight chain
  window.speechSynthesis?.cancel();
}

export function agentSpeak(text, lang = 'en', agentId = 'default') {
  if (!text) return;
  const synth = window.speechSynthesis;
  if (!synth) return;

  const myToken = ++speechToken; // each direct call also gets a fresh token,
                                   // invalidating any previous chain in flight
  const config = AGENT_CONFIG[agentId] || AGENT_CONFIG.default;
  const isFemale = config.gender === 'female';

  const finalText = (lang === 'hi' && isFemale)
    ? applyFemaleHindi(text)
    : text;

  synth.cancel();

  const doSpeak = () => {
    if (myToken !== speechToken) return; // cancelled while we were waiting
    const utter = new SpeechSynthesisUtterance(finalText);
    utter.lang = lang === 'hi' ? 'hi-IN' : 'en-IN';
    utter.rate = config.rate;
    utter.pitch = config.pitch;
    utter.volume = 1.0;

    const voices = synth.getVoices();
    if (voices.length > 0) {
      const voice = getBestVoice(voices, lang);
      if (voice) utter.voice = voice;
    }

    synth.speak(utter);
  };

  setTimeout(doSpeak, 150);
}

/* agentSpeakThen now threads a cancellation token through the whole
   chain. AssembleSequence (or anything else) calls cancelAgentSpeech()
   to kill an in-flight sequence — the NEXT step in the chain will see
   its token is stale and simply stop, instead of blindly continuing. */
export function agentSpeakThen(text, lang = 'en', agentId = 'default', callback) {
  const myToken = ++speechToken; // starting a new utterance always invalidates any prior chain

  if (!text) { callback?.(); return; }
  const synth = window.speechSynthesis;
  if (!synth) { callback?.(); return; }

  const config = AGENT_CONFIG[agentId] || AGENT_CONFIG.default;
  const isFemale = config.gender === 'female';

  const finalText = (lang === 'hi' && isFemale)
    ? applyFemaleHindi(text)
    : text;

  synth.cancel();

  setTimeout(() => {
    if (myToken !== speechToken) return; // cancelled during the startup delay

    const utter = new SpeechSynthesisUtterance(finalText);
    utter.lang = lang === 'hi' ? 'hi-IN' : 'en-IN';
    utter.rate = config.rate;
    utter.pitch = config.pitch;
    utter.volume = 1.0;

    const voices = synth.getVoices();
    if (voices.length > 0) {
      const voice = getBestVoice(voices, lang);
      if (voice) utter.voice = voice;
    }

    utter.onend = () => {
      setTimeout(() => {
        if (myToken !== speechToken) return; // ← THE critical check:
        // if cancelAgentSpeech() was called (skip pressed, component
        // unmounted, etc.) while this utterance was playing, the token
        // has moved on — we do NOT call the callback, so the chain
        // (runAgent → next agentSpeakThen → next callback...) stops dead.
        callback?.();
      }, 400);
    };
    utter.onerror = () => {
      setTimeout(() => {
        if (myToken !== speechToken) return;
        callback?.();
      }, 400);
    };

    synth.speak(utter);
  }, 200);
}