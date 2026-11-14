'use client';

import { useRouter } from 'next/navigation';
import { useEffect, useState, useSyncExternalStore } from 'react';
import { FolderOpen, Play, Settings2, ShieldCheck, Sprout, X } from 'lucide-react';
import { ACTIVE_MISSION_STORAGE_KEY, MISSION_CHANGED_EVENT, useGameStore } from '@/stores/game.store';
import { ExplorerPreferences } from '@/modules/adventure/presentation/ExplorerPreferences';

function subscribeToSavedMission(onChange: () => void) {
  window.addEventListener('storage', onChange);
  window.addEventListener(MISSION_CHANGED_EVENT, onChange);
  return () => {
    window.removeEventListener('storage', onChange);
    window.removeEventListener(MISSION_CHANGED_EVENT, onChange);
  };
}

function savedMissionSnapshot() {
  return Boolean(window.localStorage.getItem(ACTIVE_MISSION_STORAGE_KEY));
}

export default function HomePage() {
  const router = useRouter();
  const [settingsOpen, setSettingsOpen] = useState(false);
  const hasSavedMission = useSyncExternalStore(subscribeToSavedMission, savedMissionSnapshot, () => false);
  const [menuBusy, setMenuBusy] = useState(false);
  const [menuError, setMenuError] = useState<string | null>(null);
  const [mode, setMode] = useState<'explorador' | 'comandante'>('explorador');
  const { reducedMotion, toggleReducedMotion, loadPreferences, startNewMission } = useGameStore();

  useEffect(() => {
    loadPreferences();
  }, [loadPreferences]);

  const beginMission = async () => {
    if (menuBusy) return;
    window.localStorage.setItem('astrocolony-mode', mode);
    setMenuBusy(true);
    setMenuError(null);
    await startNewMission();
    const state = useGameStore.getState();
    if (state.isPersisted && !state.lastError) {
      router.push('/intro');
    } else {
      setMenuError(state.lastError ?? 'No se pudo crear la misión. Inténtalo otra vez.');
      setMenuBusy(false);
    }
  };

  const continueMission = async () => {
    if (menuBusy) return;
    window.localStorage.setItem('astrocolony-mode', mode);
    const savedId = window.localStorage.getItem(ACTIVE_MISSION_STORAGE_KEY);
    if (!savedId) {
      setMenuError('Aún no tienes una partida guardada. Pulsa Comenzar.');
      return;
    }
    setMenuBusy(true);
    setMenuError(null);
    try {
      const response = await fetch(`/api/missions/${encodeURIComponent(savedId)}`);
      if (!response.ok) {
        if (response.status === 404 || response.status === 403) {
          window.localStorage.removeItem(ACTIVE_MISSION_STORAGE_KEY);
          window.dispatchEvent(new Event(MISSION_CHANGED_EVENT));
        }
        throw new Error('No pudimos recuperar esa partida. Puedes comenzar una nueva misión.');
      }
      const data = await response.json() as { mission?: { status?: string } };
      if (!data.mission?.status) throw new Error('La partida guardada no es válida.');
      router.push(data.mission?.status === 'IN_PROGRESS' ? '/game' : '/results');
    } catch {
      setMenuError('No pudimos recuperar esa partida. Revisa la conexión o comienza una nueva misión.');
      setMenuBusy(false);
    }
  };

  return <main className="fixed inset-0 overflow-hidden bg-[#0b0e14] text-[#f8f7f0]">
    <section className="absolute inset-0 isolate flex flex-col items-center justify-between overflow-hidden bg-[#15181b] px-4 py-5 text-center sm:py-8">
      <div className="absolute -inset-5 -z-30 bg-cover bg-center blur-xl" style={{ backgroundImage: "url('/astrocolony-home-hero.webp')" }} aria-hidden="true" />
      <div className="absolute inset-0 -z-20 bg-contain bg-center bg-no-repeat" style={{ backgroundImage: "url('/astrocolony-home-hero.webp')" }} aria-hidden="true" />
      <div className="absolute inset-0 -z-10 bg-[linear-gradient(180deg,rgba(8,11,19,0.24),rgba(8,11,19,0.12)_48%,rgba(8,11,19,0.55))]" aria-hidden="true" />

      <div className="mx-auto my-auto w-full max-w-4xl py-6">
        <h1 className="font-sans text-[clamp(2.5rem,7vw,6.2rem)] font-light uppercase tracking-[0.25em] leading-none text-[#fff9f2] drop-shadow-[0_4px_18px_#000]">HORIZONTE</h1>
        <p className="mt-3 text-[clamp(0.6rem,1.4vw,1.1rem)] font-semibold tracking-[0.34em] text-[#f6eee8] drop-shadow-[0_2px_8px_#000]">MISIÓN DE ENTRENAMIENTO ESPACIAL</p>
        <div className="mx-auto mt-9 h-px w-52 bg-gradient-to-r from-transparent via-[#ffd27a] to-transparent" aria-hidden="true" />
        <p className="mt-4 text-xs font-bold uppercase tracking-[0.28em] text-[#ffe0b3] drop-shadow-[0_2px_8px_#000]">Colonia Aurora-1 · Marte</p>
        <nav aria-label="Menú principal" className="mx-auto mt-8 flex w-full max-w-sm flex-col gap-3">
          <button type="button" onClick={() => void beginMission()} disabled={menuBusy} className="inline-flex min-h-14 items-center justify-center gap-3 rounded-xl border border-[#ffd49d] bg-[rgba(145,70,31,0.84)] px-6 text-xl font-bold text-white shadow-[0_0_24px_rgba(255,168,80,0.65)] backdrop-blur-sm transition hover:bg-[#b76532] focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-[#f8d48d] disabled:cursor-wait disabled:opacity-60"><Play className="h-5 w-5 fill-current" /> {menuBusy ? 'Preparando…' : 'Comenzar'}</button>
          <button type="button" onClick={() => void continueMission()} disabled={!hasSavedMission || menuBusy} className="inline-flex min-h-14 items-center justify-center gap-3 rounded-xl border border-white/60 bg-black/35 px-6 text-xl font-semibold text-white shadow-lg backdrop-blur-md transition hover:bg-black/60 focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-[#f8d48d] disabled:cursor-not-allowed disabled:opacity-50"><FolderOpen className="h-5 w-5" /> Continuar</button>
          <button type="button" onClick={() => setSettingsOpen(true)} className="inline-flex min-h-14 items-center justify-center gap-3 rounded-xl border border-white/60 bg-black/35 px-6 text-xl font-semibold text-white shadow-lg backdrop-blur-md transition hover:bg-black/60 focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-[#f8d48d]"><Settings2 className="h-5 w-5" /> Configuración</button>
        </nav>
        {!hasSavedMission && <p className="mt-2.5 text-xs text-[#d4d2cb]/85">Continuar se activa cuando tengas una partida guardada.</p>}
        {menuError && <p role="alert" className="mx-auto mt-3 max-w-md rounded-xl border border-red-300/50 bg-red-950/80 p-3 text-sm text-white">{menuError}</p>}
      </div>
      <div className="w-full pb-3">
        <p className="mb-3 text-[10px] font-bold uppercase tracking-[0.35em] text-[#f6eee8] drop-shadow-[0_2px_8px_#000]">Modo de juego</p>
        <div className="flex flex-wrap items-center justify-center gap-3">
          <button type="button" onClick={() => setMode('explorador')} aria-pressed={mode === 'explorador'} className={`inline-flex min-h-11 items-center gap-2 rounded-full border px-5 font-bold backdrop-blur-sm ${mode === 'explorador' ? 'border-[#ffd27a] bg-[#6e371c]/80 text-white shadow-[0_0_18px_rgba(255,171,74,0.65)]' : 'border-white/60 bg-black/30 text-white'}`}><Sprout className="h-4 w-4" /> Explorador (7–9)</button>
          <button type="button" onClick={() => setMode('comandante')} aria-pressed={mode === 'comandante'} className={`inline-flex min-h-11 items-center gap-2 rounded-full border px-5 font-bold backdrop-blur-sm ${mode === 'comandante' ? 'border-[#ffd27a] bg-[#6e371c]/80 text-white shadow-[0_0_18px_rgba(255,171,74,0.65)]' : 'border-white/60 bg-black/30 text-white'}`}><ShieldCheck className="h-4 w-4" /> Comandante (10–12)</button>
        </div>
      </div>
    </section>

    {settingsOpen && <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/80 p-4" role="presentation" onMouseDown={(event) => { if (event.target === event.currentTarget) setSettingsOpen(false); }}><section role="dialog" aria-modal="true" aria-labelledby="settings-title" className="w-full max-w-md rounded-3xl border border-orange-300/50 bg-[#151d2d] p-6 shadow-2xl"><div className="flex items-center justify-between"><h2 id="settings-title" className="text-xl font-bold text-white">Configuración</h2><button type="button" aria-label="Cerrar configuración" onClick={() => setSettingsOpen(false)} className="rounded-lg p-2 text-slate-200 hover:bg-slate-700"><X className="h-5 w-5" /></button></div><label className="mt-5 flex cursor-pointer items-center justify-between gap-4 rounded-xl border border-slate-600 p-4 text-sm text-white"><span><strong>Reducir movimiento</strong><span className="mt-1 block text-slate-300">Detiene el giro automático y las animaciones de la colonia.</span></span><input type="checkbox" checked={reducedMotion} onChange={toggleReducedMotion} className="h-5 w-5 accent-orange-400" /></label><ExplorerPreferences /></section></div>}

  </main>;
}
