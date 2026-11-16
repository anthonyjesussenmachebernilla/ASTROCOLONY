'use client';

import { useRouter } from 'next/navigation';
import { useEffect, useState, useSyncExternalStore } from 'react';
import { FolderOpen, Play, Settings2, ShieldCheck, Sprout, X, Keyboard, Accessibility, Maximize2 } from 'lucide-react';
import { ACTIVE_MISSION_STORAGE_KEY, MISSION_CHANGED_EVENT, useGameStore } from '@/stores/game.store';
import { ExplorerPreferences } from '@/modules/adventure/presentation/ExplorerPreferences';

const HORIZONTE_SAVE_KEY = 'astrocolony-horizonte-save-v1';
const GAME_MODE_KEY = 'astrocolony-mode';
const GAME_LANG_KEY = 'astrocolony-lang';
const SOL_CHAPTER_KEY = 'astrocolony-sol-chapter';

type SolChapter = 'tutorial' | 'survival' | 'final';
type GameLang = 'es' | 'en';

function subscribeToSavedMission(onChange: () => void) {
  window.addEventListener('storage', onChange);
  window.addEventListener(MISSION_CHANGED_EVENT, onChange);
  return () => {
    window.removeEventListener('storage', onChange);
    window.removeEventListener(MISSION_CHANGED_EVENT, onChange);
  };
}

function savedMissionSnapshot() {
  return Boolean(window.localStorage.getItem(HORIZONTE_SAVE_KEY) || window.localStorage.getItem(ACTIVE_MISSION_STORAGE_KEY));
}

export default function HomePage() {
  const router = useRouter();
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [settingsTab, setSettingsTab] = useState<'controls' | 'accessibility'>('controls');
  const hasSavedMission = useSyncExternalStore(subscribeToSavedMission, savedMissionSnapshot, () => false);
  const [menuBusy, setMenuBusy] = useState(false);
  const [menuError, setMenuError] = useState<string | null>(null);
  const [mode, setMode] = useState<'explorador' | 'comandante'>('explorador');
  const [lang, setLang] = useState<GameLang>('es');
  const [solChapter, setSolChapter] = useState<SolChapter>('tutorial');
  const { reducedMotion, toggleReducedMotion, loadPreferences, startNewMission } = useGameStore();

  useEffect(() => {
    loadPreferences();
    if (window.localStorage.getItem(GAME_MODE_KEY) === 'comandante') setMode('comandante');
    if (window.localStorage.getItem(GAME_LANG_KEY) === 'en') setLang('en');
    const savedChapter = window.localStorage.getItem(SOL_CHAPTER_KEY);
    if (savedChapter === 'survival' || savedChapter === 'final') setSolChapter(savedChapter);
  }, [loadPreferences]);

  const chooseMode = (choice: 'explorador' | 'comandante') => {
    setMode(choice);
    window.localStorage.setItem(GAME_MODE_KEY, choice);
  };
  const chooseLang = (choice: GameLang) => {
    setLang(choice);
    window.localStorage.setItem(GAME_LANG_KEY, choice);
  };
  const chooseChapter = (choice: SolChapter) => {
    setSolChapter(choice);
    window.localStorage.setItem(SOL_CHAPTER_KEY, choice);
  };

  useEffect(() => {
    if (!settingsOpen) return;
    const closeOnEscape = (event: KeyboardEvent) => { if (event.key === 'Escape') setSettingsOpen(false); };
    window.addEventListener('keydown', closeOnEscape);
    return () => window.removeEventListener('keydown', closeOnEscape);
  }, [settingsOpen]);

  const beginMission = async () => {
    if (menuBusy) return;
    window.localStorage.setItem(GAME_MODE_KEY, mode);
    window.localStorage.setItem(GAME_LANG_KEY, lang);
    window.localStorage.setItem(SOL_CHAPTER_KEY, solChapter);
    setMenuBusy(true);
    setMenuError(null);
    await startNewMission();
    const state = useGameStore.getState();
    if (state.isPersisted && !state.lastError) {
      window.localStorage.removeItem(HORIZONTE_SAVE_KEY);
      router.push('/intro');
    } else {
      setMenuError(state.lastError ?? 'No se pudo crear la misión. Inténtalo otra vez.');
      setMenuBusy(false);
    }
  };

  const continueMission = async () => {
    if (menuBusy) return;
    if (window.localStorage.getItem(HORIZONTE_SAVE_KEY)) {
      router.push('/game');
      return;
    }
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
      router.push(data.mission?.status === 'IN_PROGRESS' ? '/game/legacy' : '/results');
    } catch {
      setMenuError('No pudimos recuperar esa partida. Revisa la conexión o comienza una nueva misión.');
      setMenuBusy(false);
    }
  };

  return <main className="fixed inset-0 overflow-hidden bg-[#0b0e14] text-[#f8f7f0]">
    <section className="home-screen absolute inset-0 isolate flex flex-col items-center justify-between overflow-y-auto bg-[#15181b] px-4 py-5 text-center sm:py-8">
      <div className="home-hero-image fixed inset-0 -z-20" style={{ position: 'fixed', inset: 0, zIndex: -2, backgroundImage: "url('/astrocolony-home-hero.webp')", backgroundSize: 'cover', backgroundRepeat: 'no-repeat', pointerEvents: 'none' }} aria-hidden="true" />
      <div className="absolute inset-0 -z-10 bg-[linear-gradient(180deg,rgba(8,11,19,0.24),rgba(8,11,19,0.12)_48%,rgba(8,11,19,0.55))]" aria-hidden="true" />

      <div className="flex w-full max-w-6xl justify-end">
        <div className="inline-flex items-center gap-1 rounded-full border border-white/35 bg-black/45 p-1 backdrop-blur-md">
          <button type="button" onClick={() => chooseLang('es')} aria-pressed={lang === 'es'} className={`rounded-full px-3 py-1 text-xs font-bold transition ${lang === 'es' ? 'bg-[#ffd27a] text-slate-950' : 'text-white/80 hover:text-white'}`}>ES</button>
          <button type="button" onClick={() => chooseLang('en')} aria-pressed={lang === 'en'} className={`rounded-full px-3 py-1 text-xs font-bold transition ${lang === 'en' ? 'bg-[#ffd27a] text-slate-950' : 'text-white/80 hover:text-white'}`}>EN</button>
        </div>
      </div>

      <div className="home-content mx-auto my-auto w-full max-w-6xl py-6">
        <h1 className="home-title font-sans font-semibold uppercase leading-none text-[#fff8eb]" style={{ textShadow: '0 0 32px rgba(255,188,115,.5), 0 7px 30px rgba(0,0,0,.95)' }}>HORIZONTE</h1>
        <p className="mt-5 text-[clamp(0.7rem,1.4vw,1.2rem)] font-semibold tracking-[0.18em] text-[#fff4e9] drop-shadow-[0_2px_8px_#000] sm:tracking-[0.34em]">{lang === 'en' ? 'SPACE TRAINING MISSION' : 'MISIÓN DE ENTRENAMIENTO ESPACIAL'}</p>
        <div className="mx-auto mt-9 h-px w-52 bg-gradient-to-r from-transparent via-[#ffd27a] to-transparent" aria-hidden="true" />
        <p className="mt-4 text-xs font-bold uppercase tracking-[0.28em] text-[#ffe0b3] drop-shadow-[0_2px_8px_#000]">{lang === 'en' ? 'Aurora-1 Colony · Mars' : 'Colonia Aurora-1 · Marte'}</p>
        <nav aria-label={lang === 'en' ? 'Main menu' : 'Menú principal'} className="mx-auto mt-8 flex w-full max-w-sm flex-col gap-3">
          <button type="button" onClick={() => void beginMission()} disabled={menuBusy} className="inline-flex min-h-14 items-center justify-center gap-3 rounded-xl border border-[#ffd49d] bg-[rgba(145,70,31,0.84)] px-6 text-xl font-bold text-white shadow-[0_0_24px_rgba(255,168,80,0.65)] backdrop-blur-sm transition hover:bg-[#b76532] focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-[#f8d48d] disabled:cursor-wait disabled:opacity-60"><Play className="h-5 w-5 fill-current" /> {menuBusy ? (lang === 'en' ? 'Preparing…' : 'Preparando…') : (lang === 'en' ? 'Start' : 'Comenzar')}</button>
          <button type="button" onClick={() => void continueMission()} disabled={!hasSavedMission || menuBusy} className="inline-flex min-h-14 items-center justify-center gap-3 rounded-xl border border-white/60 bg-black/35 px-6 text-xl font-semibold text-white shadow-lg backdrop-blur-md transition hover:bg-black/60 focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-[#f8d48d] disabled:cursor-not-allowed disabled:opacity-50"><FolderOpen className="h-5 w-5" /> {lang === 'en' ? 'Continue' : 'Continuar'}</button>
          <button type="button" onClick={() => setSettingsOpen(true)} className="inline-flex min-h-14 items-center justify-center gap-3 rounded-xl border border-white/60 bg-black/35 px-6 text-xl font-semibold text-white shadow-lg backdrop-blur-md transition hover:bg-black/60 focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-[#f8d48d]"><Settings2 className="h-5 w-5" /> {lang === 'en' ? 'Settings' : 'Configuración'}</button>
        </nav>
        {!hasSavedMission && <p className="mt-2.5 text-xs text-[#d4d2cb]/85">{lang === 'en' ? 'Continue activates when you have a saved mission.' : 'Continuar se activa cuando tengas una partida guardada.'}</p>}
        {menuError && <p role="alert" className="mx-auto mt-3 max-w-md rounded-xl border border-red-300/50 bg-red-950/80 p-3 text-sm text-white">{menuError}</p>}
      </div>
      <div className="w-full space-y-4 pb-3">
        <div>
          <p className="mb-2 text-[10px] font-bold uppercase tracking-[0.35em] text-[#f6eee8] drop-shadow-[0_2px_8px_#000]">{lang === 'en' ? 'Game mode' : 'Modo de juego'}</p>
          <div className="flex flex-wrap items-center justify-center gap-3">
            <button type="button" onClick={() => chooseMode('explorador')} aria-pressed={mode === 'explorador'} className={`inline-flex min-h-11 items-center gap-2 rounded-full border px-5 font-bold backdrop-blur-sm ${mode === 'explorador' ? 'border-[#ffd27a] bg-[#6e371c]/80 text-white shadow-[0_0_18px_rgba(255,171,74,0.65)]' : 'border-white/60 bg-black/30 text-white'}`}><Sprout className="h-4 w-4" /> {lang === 'en' ? 'Explorer (7–9)' : 'Explorador (7–9)'}</button>
            <button type="button" onClick={() => chooseMode('comandante')} aria-pressed={mode === 'comandante'} className={`inline-flex min-h-11 items-center gap-2 rounded-full border px-5 font-bold backdrop-blur-sm ${mode === 'comandante' ? 'border-[#ffd27a] bg-[#6e371c]/80 text-white shadow-[0_0_18px_rgba(255,171,74,0.65)]' : 'border-white/60 bg-black/30 text-white'}`}><ShieldCheck className="h-4 w-4" /> {lang === 'en' ? 'Commander (10–12)' : 'Comandante (10–12)'}</button>
          </div>
        </div>
        <div>
          <p className="mb-2 text-[10px] font-bold uppercase tracking-[0.35em] text-[#ffe0b3] drop-shadow-[0_2px_8px_#000]">{lang === 'en' ? 'Campaign phase' : 'Etapa de misión'}</p>
          <div className="flex flex-wrap items-center justify-center gap-2">
            {([
              { id: 'tutorial', es: 'Soles 1–3: Tutorial', en: 'Sols 1–3: Tutorial' },
              { id: 'survival', es: 'Soles 4–9: Supervivencia y pistas', en: 'Sols 4–9: Survival & Clues' },
              { id: 'final', es: 'Sol 10: Misión final', en: 'Sol 10: Final Mission' },
            ] as const).map(item => (
              <button key={item.id} type="button" onClick={() => chooseChapter(item.id)} aria-pressed={solChapter === item.id} className={`inline-flex min-h-10 items-center rounded-full border px-4 text-xs font-bold backdrop-blur-sm transition ${solChapter === item.id ? 'border-[#8adbe5] bg-[#123942]/85 text-[#d7fbff] shadow-[0_0_16px_rgba(138,219,229,0.5)]' : 'border-white/45 bg-black/35 text-white/85 hover:bg-black/55'}`}>{lang === 'en' ? item.en : item.es}</button>
            ))}
          </div>
        </div>
      </div>
    </section>

    {settingsOpen && <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/80 p-4" role="presentation" onMouseDown={(event) => { if (event.target === event.currentTarget) setSettingsOpen(false); }}><section role="dialog" aria-modal="true" aria-labelledby="settings-title" className="flex max-h-[min(90dvh,680px)] w-full max-w-xl flex-col overflow-hidden rounded-3xl border border-orange-300/50 bg-[#151d2d] shadow-2xl"><div className="flex items-center justify-between border-b border-white/10 px-5 py-4 sm:px-7"><div><p className="text-xs font-bold uppercase tracking-[0.22em] text-orange-300">Horizonte</p><h2 id="settings-title" className="mt-1 text-2xl font-bold text-white">Configuración</h2></div><button type="button" aria-label="Cerrar configuración" onClick={() => setSettingsOpen(false)} className="rounded-lg p-2 text-slate-200 hover:bg-slate-700"><X className="h-5 w-5" /></button></div><div className="flex gap-1 overflow-x-auto border-b border-white/10 px-3 py-3 sm:px-5" role="tablist" aria-label="Opciones de configuración">{([{ id: 'controls', label: 'Controles', Icon: Keyboard }, { id: 'accessibility', label: 'Accesibilidad', Icon: Accessibility }] as const).map(({ id, label, Icon }) => <button key={id} type="button" role="tab" aria-selected={settingsTab === id} onClick={() => setSettingsTab(id)} className={`flex min-h-11 shrink-0 items-center gap-2 rounded-xl px-3 text-sm font-bold transition ${settingsTab === id ? 'bg-orange-400 text-slate-950' : 'text-slate-200 hover:bg-white/10'}`}><Icon className="h-4 w-4" />{label}</button>)}</div><div className="overflow-y-auto px-5 py-5 text-left sm:px-7">
      {settingsTab === 'controls' && <div role="tabpanel" className="space-y-4"><p className="text-sm text-slate-300">Muévete por la colonia y acércate a los módulos para interactuar.</p><div className="grid gap-2 sm:grid-cols-2">{[['W A S D / Flechas', 'Caminar'], ['Ratón + arrastrar', 'Girar la cámara'], ['Espacio', 'Saltar'], ['E', 'Entrar, usar o salir'], ['V', 'Cambiar de cámara'], ['P / Tab', 'Panel de la base'], ['Esc', 'Pausar'], ['Rueda del ratón', 'Acercar o alejar']].map(([key, action]) => <div key={key} className="flex min-h-14 items-center justify-between gap-3 rounded-xl border border-slate-600/70 bg-slate-900/60 px-3 py-2"><span className="text-sm text-slate-200">{action}</span><kbd className="shrink-0 rounded-md border border-orange-300/40 bg-orange-300/10 px-2 py-1 text-xs font-bold text-orange-200">{key}</kbd></div>)}</div><p className="text-xs text-slate-400">En móvil aparecen controles táctiles dentro del juego.</p></div>}
      {settingsTab === 'accessibility' && <div role="tabpanel" className="space-y-4"><label className="flex cursor-pointer items-center justify-between gap-4 rounded-xl border border-slate-600 p-4 text-sm text-white"><span><strong>Reducir movimiento</strong><span className="mt-1 block text-slate-300">Reduce animaciones y giros automáticos en la aventura clásica.</span></span><input type="checkbox" checked={reducedMotion} onChange={toggleReducedMotion} className="h-5 w-5 accent-orange-400" /></label><button type="button" onClick={() => { if (!document.fullscreenElement) void document.documentElement.requestFullscreen?.(); else void document.exitFullscreen?.(); }} className="flex min-h-12 w-full items-center justify-between rounded-xl border border-slate-600 px-4 text-sm font-bold text-white hover:bg-white/10"><span>Pantalla completa</span><Maximize2 className="h-4 w-4" /></button><ExplorerPreferences /></div>}
    </div></section></div>}

  </main>;
}
