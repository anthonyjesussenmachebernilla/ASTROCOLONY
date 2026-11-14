'use client';

import { useRouter } from 'next/navigation';
import { useEffect, useState, useSyncExternalStore } from 'react';
import { ArrowDown, ArrowRight, BatteryCharging, BookOpen, ExternalLink, FlaskConical, FolderOpen, Play, Settings2, ShieldCheck, Wind, X } from 'lucide-react';
import { NASA_SCIENTIFIC_SOURCES } from '@/data/scientific-sources/nasa-sources';
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

  return <main className="flex-1 bg-[#0b0e14] text-[#f8f7f0]">
    <section className="relative isolate flex min-h-[760px] flex-col justify-between overflow-hidden bg-[#15181b] px-6 pb-10 pt-16 sm:min-h-[820px] sm:px-12 sm:pt-20 lg:min-h-[min(900px,100svh)] lg:px-20">
      <div className="absolute -inset-3 -z-20 scale-[1.03] bg-cover bg-[position:55%_center] blur-[1.5px] brightness-[0.72]" style={{ backgroundImage: "url('/astrocolony-home-hero.webp')" }} aria-hidden="true" />
      <div className="absolute inset-0 -z-10 bg-[linear-gradient(95deg,rgba(9,13,19,0.93)_0%,rgba(11,15,20,0.82)_38%,rgba(11,13,18,0.18)_100%)]" aria-hidden="true" />
      <div className="absolute inset-0 -z-10 bg-[radial-gradient(ellipse_at_65%_50%,transparent_20%,rgba(4,8,11,0.52)_95%)]" aria-hidden="true" />

      <div className="my-auto w-full max-w-2xl py-4 text-left">
        <p className="text-[11px] font-bold uppercase tracking-[0.33em] text-[#eab976]">Misión de entrenamiento espacial • NASA</p>
        <h1 className="mt-4 font-sans text-[clamp(2.6rem,5.8vw,5.4rem)] font-light uppercase tracking-[0.19em] leading-[1.05] text-[#f8f7f0] drop-shadow-[0_8px_22px_rgba(0,0,0,0.95)]">Astro<em className="not-italic font-normal text-[#f4e6d2]">Colony</em></h1>
        <div className="my-3.5 h-[2px] w-60 bg-gradient-to-r from-transparent via-[#f39b65] to-transparent" aria-hidden="true" />
        <p className="text-xs font-bold uppercase tracking-[0.4em] text-[#e6d1be]">Sobrevive en Marte</p>

        <div className="mt-10 flex items-center gap-3 text-xs font-extrabold uppercase tracking-[0.24em] text-[#eec994]">
          <span className="h-px w-6 bg-[#dbab6d]" aria-hidden="true" />
          <span>Misión Aurora • 10 Soles</span>
        </div>
        <p className="mt-3 max-w-xl text-[clamp(1.65rem,3vw,2.75rem)] font-semibold leading-[1.15] tracking-[-0.02em] text-[#f8f7f0]">
          10 soles. 4 astronautas. Cada decisión puede salvar la colonia.
        </p>
        <p className="mt-4 max-w-lg text-[15px] leading-[1.7] text-[#d8d4d0]">
          Explora la base marciana en 3D, vigila eventos solares reales de la NASA y equilibra energía, oxígeno y radiación junto a ASTROBOT.
        </p>

        <nav aria-label="Menú principal" className="mt-7 flex flex-col gap-3 sm:flex-row sm:flex-wrap sm:items-center">
          <button type="button" onClick={() => void beginMission()} disabled={menuBusy} className="group inline-flex min-h-[52px] min-w-[215px] items-center justify-center gap-3 rounded-lg border border-[#ffd49d] bg-[linear-gradient(125deg,#d68b49,#a45831)] px-6 text-sm font-extrabold uppercase tracking-[0.1em] text-[#fff8ee] shadow-[0_6px_28px_rgba(206,104,48,0.28)] transition hover:brightness-110 focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-[#f8d48d] disabled:cursor-wait disabled:opacity-60"><Play className="h-4 w-4 fill-current" /> {menuBusy ? 'Preparando…' : 'Comenzar'} <ArrowRight className="h-4 w-4 transition group-hover:translate-x-1" /></button>
          <button type="button" onClick={() => void continueMission()} disabled={!hasSavedMission || menuBusy} className="inline-flex min-h-[52px] items-center justify-center gap-2.5 rounded-lg border border-[rgba(255,236,206,0.5)] bg-[rgba(18,23,29,0.55)] px-6 text-sm font-bold text-[#f6ebe0] backdrop-blur-md transition hover:bg-white/15 focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-[#f8d48d] disabled:cursor-not-allowed disabled:opacity-50"><FolderOpen className="h-4 w-4" /> Continuar</button>
          <button type="button" onClick={() => setSettingsOpen(true)} className="inline-flex min-h-[52px] items-center justify-center gap-2.5 rounded-lg border border-[rgba(255,236,206,0.35)] bg-[rgba(18,23,29,0.45)] px-5 text-sm font-bold text-[#f6ebe0] backdrop-blur-md transition hover:bg-white/15 focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-[#f8d48d]"><Settings2 className="h-4 w-4" /> Configuración</button>
        </nav>
        {!hasSavedMission && <p className="mt-2.5 text-xs text-[#d4d2cb]/85">Continuar se activa cuando tengas una partida guardada.</p>}
        {menuError && <p role="alert" className="mt-3 max-w-md rounded-xl border border-red-300/50 bg-red-950/80 p-3 text-sm text-white">{menuError}</p>}

        <div className="mt-8 flex flex-wrap items-center gap-x-4 gap-y-2 text-[11px] tracking-[0.045em] text-[#bbb7b1]">
          <span>Para exploradores de 7 a 12 años</span>
          <span className="border-l border-[#92877d] pl-3">Datos reales NASA DONKI</span>
          <span className="border-l border-[#92877d] pl-3">Colonia 3D interactiva</span>
        </div>
      </div>

      <div className="flex items-center justify-between pt-6">
        <a href="#reto" className="inline-flex items-center gap-2 text-xs font-bold uppercase tracking-[0.22em] text-[#eec994] hover:text-white">Conoce el reto <ArrowDown className="h-4 w-4" /></a>
      </div>
    </section>

    {settingsOpen && <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/80 p-4" role="presentation" onMouseDown={(event) => { if (event.target === event.currentTarget) setSettingsOpen(false); }}><section role="dialog" aria-modal="true" aria-labelledby="settings-title" className="w-full max-w-md rounded-3xl border border-orange-300/50 bg-[#151d2d] p-6 shadow-2xl"><div className="flex items-center justify-between"><h2 id="settings-title" className="text-xl font-bold text-white">Configuración</h2><button type="button" aria-label="Cerrar configuración" onClick={() => setSettingsOpen(false)} className="rounded-lg p-2 text-slate-200 hover:bg-slate-700"><X className="h-5 w-5" /></button></div><label className="mt-5 flex cursor-pointer items-center justify-between gap-4 rounded-xl border border-slate-600 p-4 text-sm text-white"><span><strong>Reducir movimiento</strong><span className="mt-1 block text-slate-300">Detiene el giro automático y las animaciones de la colonia.</span></span><input type="checkbox" checked={reducedMotion} onChange={toggleReducedMotion} className="h-5 w-5 accent-orange-400" /></label><ExplorerPreferences /></section></div>}

    <section id="reto" className="mx-auto max-w-6xl px-5 py-14 sm:py-20"><div className="flex items-center gap-3 text-orange-300"><BookOpen className="h-6 w-6" /><p className="text-sm font-bold uppercase tracking-[0.2em]">El reto</p></div><h2 className="mt-3 max-w-2xl text-3xl font-bold text-white sm:text-4xl">Cuida la vida en otro mundo</h2><p className="mt-3 max-w-2xl text-base text-slate-300">Decide cómo gastar energía para producir aire, cultivar comida y proteger a la tripulación. Cada beneficio tiene un costo.</p>
      <div className="mt-7 grid gap-3 md:grid-cols-3"><div className="rounded-2xl border border-slate-700 bg-[#101b30] p-5"><div className="mb-3 flex gap-2 text-cyan-300"><BatteryCharging /><Wind /><ShieldCheck /></div><h3 className="text-lg font-bold text-white">Observa</h3><p className="mt-1 text-sm text-slate-300">Vigila energía, aire y protección.</p></div><div className="rounded-2xl border border-slate-700 bg-[#101b30] p-5"><h3 className="text-lg font-bold text-white">Decide</h3><p className="mt-1 text-sm text-slate-300">Elige hasta 2 acciones por sol.</p></div><div className="rounded-2xl border border-slate-700 bg-[#101b30] p-5"><h3 className="text-lg font-bold text-white">Descubre</h3><p className="mt-1 text-sm text-slate-300">Mira las consecuencias y cambia tu plan.</p></div></div>
      <details className="mt-7 rounded-2xl border border-cyan-500/30 bg-[#101b30] p-5 text-slate-300"><summary className="flex cursor-pointer items-center gap-2 text-base font-bold text-cyan-200"><FlaskConical className="h-5 w-5" /> Ciencia NASA en el juego</summary><p className="mt-3 text-sm">DONKI aporta registros de actividad solar. Los recursos del juego usan unidades educativas para mostrar las decisiones de ingeniería.</p><div className="mt-4 grid gap-2 sm:grid-cols-2">{NASA_SCIENTIFIC_SOURCES.map((source) => <a key={source.id} href={source.url} target="_blank" rel="noreferrer" className="flex items-center justify-between gap-2 rounded-xl border border-slate-700 bg-slate-900/70 p-3 text-sm text-cyan-200 hover:bg-slate-800"><span>{source.title}</span><ExternalLink className="h-4 w-4 shrink-0" /></a>)}</div></details>
    </section>
  </main>;
}
