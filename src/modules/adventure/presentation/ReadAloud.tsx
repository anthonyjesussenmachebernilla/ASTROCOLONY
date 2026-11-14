'use client';

import { useEffect, useState } from 'react';
import { Volume2, VolumeX } from 'lucide-react';

export function ReadAloud({ text, enabled }: { text: string; enabled: boolean }) {
  const [playing, setPlaying] = useState(false);
  const [unavailable, setUnavailable] = useState(false);
  useEffect(() => {
    return () => { if ('speechSynthesis' in window) window.speechSynthesis.cancel(); };
  }, [text, enabled]);
  if (!enabled) return null;
  const read = () => {
    if (!('speechSynthesis' in window)) { setUnavailable(true); return; }
    window.speechSynthesis.cancel();
    if (playing) { setPlaying(false); return; }
    const utterance = new SpeechSynthesisUtterance(text);
    utterance.lang = 'es-PE'; utterance.rate = 0.88;
    utterance.onend = () => setPlaying(false);
    utterance.onerror = (event) => {
      setPlaying(false);
      if (event.error !== 'canceled' && event.error !== 'interrupted') setUnavailable(true);
    };
    setPlaying(true); window.speechSynthesis.speak(utterance);
  };
  return <><button type="button" className="adventure-text-button" onClick={read}>{playing ? <VolumeX size={18} /> : <Volume2 size={18} />}{playing ? 'Detener lectura' : 'Escuchar a Astrobot'}</button>{unavailable && <p role="status">Este navegador no tiene una voz disponible. Puedes leer la misma ayuda aquí.</p>}</>;
}
