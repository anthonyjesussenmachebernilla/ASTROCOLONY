'use client';

import { createContext, useContext, useEffect, useRef, useState } from 'react';

const STORAGE_KEY = 'astrocolony_audio_settings_v1';

type AudioSettings = { enabled: boolean; volume: number };
type AudioControls = AudioSettings & {
  setEnabled: (enabled: boolean) => void;
  setVolume: (volume: number) => void;
};

const AudioContextValue = createContext<AudioControls | null>(null);

export function useGameAudio() {
  const controls = useContext(AudioContextValue);
  if (!controls) throw new Error('GameAudioProvider no está disponible');
  return controls;
}

export function GameAudioProvider({ children }: { children: React.ReactNode }) {
  const [settings, setSettings] = useState<AudioSettings>({ enabled: false, volume: 35 });
  const [loaded, setLoaded] = useState(false);
  const audio = useRef<{ context: AudioContext; master: GainNode; timer: number } | null>(null);
  const settingsRef = useRef(settings);
  settingsRef.current = settings;

  useEffect(() => {
    try {
      const saved = JSON.parse(localStorage.getItem(STORAGE_KEY) || 'null') as Partial<AudioSettings> | null;
      if (saved) setSettings({ enabled: saved.enabled === true, volume: Number.isFinite(saved.volume) ? Math.max(0, Math.min(100, Number(saved.volume))) : 35 });
    } catch { /* Keep safe defaults if saved data is damaged. */ }
    setLoaded(true);
  }, []);

  useEffect(() => {
    if (!loaded) return;
    localStorage.setItem(STORAGE_KEY, JSON.stringify(settings));
    const current = audio.current;
    if (current) current.master.gain.setTargetAtTime(settings.enabled ? settings.volume / 100 * 0.24 : 0, current.context.currentTime, 0.18);
  }, [loaded, settings]);

  useEffect(() => {
    const play = () => {
      if (!settingsRef.current.enabled) return;
      if (audio.current) { void audio.current.context.resume(); return; }
      const AudioContextClass = window.AudioContext;
      if (!AudioContextClass) return;
      const context = new AudioContextClass();
      const master = context.createGain();
      master.gain.value = 0;
      master.connect(context.destination);
      const atmosphere = context.createBiquadFilter();
      atmosphere.type = 'lowpass';
      atmosphere.frequency.value = 1250;
      atmosphere.connect(master);
      const sequence = [0, 2, 5, 7, 3, 5, 2, -2];
      let index = 0;
      const playNote = () => {
        if (!settingsRef.current.enabled) return;
        const now = context.currentTime;
        const root = 110 * Math.pow(2, sequence[index % sequence.length] / 12);
        for (const [ratio, level, type] of [[1, 0.09, 'sine'], [1.5, 0.035, 'triangle'], [2, 0.018, 'sine']] as const) {
          const oscillator = context.createOscillator();
          const envelope = context.createGain();
          oscillator.type = type;
          oscillator.frequency.setValueAtTime(root * ratio, now);
          oscillator.frequency.linearRampToValueAtTime(root * ratio * 1.004, now + 2.8);
          envelope.gain.setValueAtTime(0, now);
          envelope.gain.linearRampToValueAtTime(level, now + 0.8);
          envelope.gain.setValueAtTime(level, now + 2.1);
          envelope.gain.exponentialRampToValueAtTime(0.001, now + 4.2);
          oscillator.connect(envelope).connect(atmosphere);
          oscillator.start(now);
          oscillator.stop(now + 4.3);
        }
        index++;
      };
      playNote();
      const timer = window.setInterval(playNote, 2800);
      audio.current = { context, master, timer };
      master.gain.setTargetAtTime(settingsRef.current.volume / 100 * 0.24, context.currentTime, 0.3);
      void context.resume();
    };
    window.addEventListener('pointerdown', play);
    window.addEventListener('keydown', play);
    window.addEventListener('astrocolony:resume-audio', play);
    return () => {
      window.removeEventListener('pointerdown', play);
      window.removeEventListener('keydown', play);
      window.removeEventListener('astrocolony:resume-audio', play);
      if (audio.current) { window.clearInterval(audio.current.timer); void audio.current.context.close(); audio.current = null; }
    };
  }, []);

  const setEnabled = (enabled: boolean) => {
    settingsRef.current = { ...settingsRef.current, enabled };
    setSettings(current => ({ ...current, enabled }));
    if (enabled) window.dispatchEvent(new Event('astrocolony:resume-audio'));
  };
  const setVolume = (volume: number) => setSettings(current => ({ ...current, volume }));

  return <AudioContextValue.Provider value={{ ...settings, setEnabled, setVolume }}>{children}</AudioContextValue.Provider>;
}
