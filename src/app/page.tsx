'use client';

import { useRouter } from 'next/navigation';
import { useEffect, useState, useSyncExternalStore } from 'react';
import { ArrowDown, ArrowRight, BatteryCharging, BookOpen, ExternalLink, FlaskConical, FolderOpen, Play, Settings2, ShieldCheck, Wind, X } from 'lucide-react';
import { NASA_SCIENTIFIC_SOURCES } from '@/data/scientific-sources/nasa-sources';
import { ACTIVE_MISSION_STORAGE_KEY, MISSION_CHANGED_EVENT, useGameStore } from '@/stores/game.store';

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
  const { reducedMotion, toggleReducedMotion, loadPreferences, startNewMission } = useGameStore();

  useEffect(() => {
    loadPreferences();
  }, [loadPreferences]);

  const beginMission = async () => {
    if (menuBusy) return;
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

  return <main className="flex-1 bg-[#080b15]">
    <section className="relative isolate flex min-h-[760px] flex-col items-center overflow-hidden bg-[#1b1c2c] px-5 pb-10 pt-20 text-center sm:min-h-[820px] sm:pt-24 lg:min-h-[min(900px,100svh)]">
      <div className="absolute inset-0 -z-20 bg-cover bg-[position:43%_center] sm:bg-center" style={{ backgroundImage: "url('/astrocolony-home-hero.webp')" }} aria-hidden="true" />
      <div className="absolute inset-0 -z-10 bg-gradient-to-b from-[#080d22]/65 via-[#111323]/25 to-[#090d17]/80 sm:from-[#080d22]/35 sm:via-transparent sm:to-[#090d17]/70" aria-hidden="true" />

      <div className="w-full max-w-4xl">
        <p className="text-xs font-semibold uppercase tracking-[0.45em] text-orange-100/90 sm:text-sm">Misión de entrenamiento espacial</p>
        <h1 className="mt-4 font-sans text-[clamp(2.2rem,7vw,6rem)] font-light uppercase tracking-[0.12em] text-white drop-shadow-[0_2px_18px_rgba(0,0,0,0.85)] sm:tracking-[0.24em]">Astro<span className="font-semibold text-orange-200">Colony</span></h1>
        <div className="mx-auto mt-4 flex max-w-xl items-center gap-4 text-orange-100/90"><span className="h-px flex-1 bg-orange-100/50" /><span className="text-xs font-semibold uppercase tracking-[0.28em] sm:text-sm">Sobrevive en Marte</span><span className="h-px flex-1 bg-orange-100/50" /></div>
        <p className="mx-auto mt-7 max-w-lg text-sm font-medium leading-relaxed text-white drop-shadow-[0_2px_8px_rgba(0,0,0,0.9)] sm:text-base">10 soles. 4 astronautas. Cada decisión puede salvar la colonia.</p>
      </div>

      <nav aria-label="Menú principal" className="mt-8 flex w-full max-w-sm flex-col gap-3 sm:mt-9">
        <button type="button" onClick={() => void beginMission()} disabled={menuBusy} className="group flex min-h-16 items-center justify-center gap-4 rounded-2xl border-2 border-orange-300/90 bg-orange-500/30 px-6 text-xl font-bold text-white shadow-[0_0_22px_rgba(251,146,60,0.5),inset_0_0_18px_rgba(251,146,60,0.22)] backdrop-blur-md transition hover:scale-[1.02] hover:bg-orange-500/50 focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-white disabled:cursor-wait disabled:opacity-60"><Play className="h-6 w-6 fill-white" /> {menuBusy ? 'Preparando…' : 'Comenzar'} <ArrowRight className="h-5 w-5 transition group-hover:translate-x-1" /></button>
        <button type="button" onClick={() => void continueMission()} disabled={!hasSavedMission || menuBusy} className="flex min-h-14 items-center justify-center gap-3 rounded-2xl border border-white/70 bg-slate-950/35 px-6 text-lg font-semibold text-white backdrop-blur-md transition hover:bg-slate-900/65 focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-white disabled:cursor-not-allowed disabled:opacity-50"><FolderOpen className="h-5 w-5" /> Continuar</button>
        {!hasSavedMission && <p className="-mt-2 text-xs text-white/80">Continuar se activa cuando tengas una partida guardada.</p>}
        <button type="button" onClick={() => setSettingsOpen(true)} className="flex min-h-14 items-center justify-center gap-3 rounded-2xl border border-white/70 bg-slate-950/35 px-6 text-lg font-semibold text-white backdrop-blur-md transition hover:bg-slate-900/65 focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-white"><Settings2 className="h-5 w-5" /> Configuración</button>
        {menuError && <p role="alert" className="rounded-xl border border-red-300/50 bg-red-950/80 p-3 text-sm text-white">{menuError}</p>}
      </nav>

      <a href="#reto" className="mt-auto inline-flex items-center gap-2 pt-14 text-sm font-semibold uppercase tracking-[0.22em] text-orange-50/90 hover:text-white">Conoce el reto <ArrowDown className="h-4 w-4" /></a>
      <div className="absolute bottom-3 right-4 rounded-full border border-white/25 bg-black/35 px-3 py-1 text-xs text-white/80 backdrop-blur">Para exploradores de 7 a 12 años</div>
    </section>

    {settingsOpen && <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/80 p-4" role="presentation" onMouseDown={(event) => { if (event.target === event.currentTarget) setSettingsOpen(false); }}><section role="dialog" aria-modal="true" aria-labelledby="settings-title" className="w-full max-w-md rounded-3xl border border-orange-300/50 bg-[#151d2d] p-6 shadow-2xl"><div className="flex items-center justify-between"><h2 id="settings-title" className="text-xl font-bold text-white">Configuración</h2><button type="button" aria-label="Cerrar configuración" onClick={() => setSettingsOpen(false)} className="rounded-lg p-2 text-slate-200 hover:bg-slate-700"><X className="h-5 w-5" /></button></div><label className="mt-5 flex cursor-pointer items-center justify-between gap-4 rounded-xl border border-slate-600 p-4 text-sm text-white"><span><strong>Reducir movimiento</strong><span className="mt-1 block text-slate-300">Detiene el giro automático y las animaciones de la colonia.</span></span><input type="checkbox" checked={reducedMotion} onChange={toggleReducedMotion} className="h-5 w-5 accent-orange-400" /></label><p className="mt-4 text-xs text-slate-400">Puedes cambiar esta opción durante la misión.</p></section></div>}

    <section id="reto" className="mx-auto max-w-6xl px-5 py-14 sm:py-20"><div className="flex items-center gap-3 text-orange-300"><BookOpen className="h-6 w-6" /><p className="text-sm font-bold uppercase tracking-[0.2em]">El reto</p></div><h2 className="mt-3 max-w-2xl text-3xl font-bold text-white sm:text-4xl">Cuida la vida en otro mundo</h2><p className="mt-3 max-w-2xl text-base text-slate-300">Decide cómo gastar energía para producir aire, cultivar comida y proteger a la tripulación. Cada beneficio tiene un costo.</p>
      <div className="mt-7 grid gap-3 md:grid-cols-3"><div className="rounded-2xl border border-slate-700 bg-[#101b30] p-5"><div className="mb-3 flex gap-2 text-cyan-300"><BatteryCharging /><Wind /><ShieldCheck /></div><h3 className="text-lg font-bold text-white">Observa</h3><p className="mt-1 text-sm text-slate-300">Vigila energía, aire y protección.</p></div><div className="rounded-2xl border border-slate-700 bg-[#101b30] p-5"><h3 className="text-lg font-bold text-white">Decide</h3><p className="mt-1 text-sm text-slate-300">Elige hasta 2 acciones por sol.</p></div><div className="rounded-2xl border border-slate-700 bg-[#101b30] p-5"><h3 className="text-lg font-bold text-white">Descubre</h3><p className="mt-1 text-sm text-slate-300">Mira las consecuencias y cambia tu plan.</p></div></div>
      <details className="mt-7 rounded-2xl border border-cyan-500/30 bg-[#101b30] p-5 text-slate-300"><summary className="flex cursor-pointer items-center gap-2 text-base font-bold text-cyan-200"><FlaskConical className="h-5 w-5" /> Ciencia NASA en el juego</summary><p className="mt-3 text-sm">DONKI aporta registros de actividad solar. Los recursos del juego usan unidades educativas para mostrar las decisiones de ingeniería.</p><div className="mt-4 grid gap-2 sm:grid-cols-2">{NASA_SCIENTIFIC_SOURCES.map((source) => <a key={source.id} href={source.url} target="_blank" rel="noreferrer" className="flex items-center justify-between gap-2 rounded-xl border border-slate-700 bg-slate-900/70 p-3 text-sm text-cyan-200 hover:bg-slate-800"><span>{source.title}</span><ExternalLink className="h-4 w-4 shrink-0" /></a>)}</div></details>
    </section>
  </main>;
}
