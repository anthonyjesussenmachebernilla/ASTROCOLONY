'use client';

import Link from 'next/link';
import { useEffect, useState } from 'react';
import { ArrowLeft, Award, Eye, PanelTop, RotateCcw } from 'lucide-react';
import { ActionDeck } from '@/modules/mission/presentation/components/ActionDeck';
import { AstrobotGuideBar } from '@/modules/mission/presentation/components/AstrobotGuideBar';
import { AstrobotPanel } from '@/modules/mission/presentation/components/AstrobotPanel';
import { ColonyMap } from '@/modules/mission/presentation/components/ColonyMap';
import { NasaEventsPanel } from '@/modules/nasa/presentation/NasaEventsPanel';
import { NasaGalleryPanel } from '@/modules/nasa/presentation/NasaGalleryPanel';
import { getAstrobotStepGuide } from '@/modules/simulation/domain/astrobot';
import type { BuildingId } from '@/modules/simulation/domain/types';
import { useGameStore } from '@/stores/game.store';

export default function GamePage() {
  const {
    mission,
    isSyncing,
    isPersisted,
    selectedBuilding,
    lastError,
    lastTurnSummary,
    reducedMotion,
    astrobot,
    hydrateOrStartMission,
    selectBuilding,
    executeAction,
    nextTurn,
    startNewMission,
    toggleReducedMotion,
    loadPreferences,
    clearError,
  } = useGameStore();

  const [hasInspectedModule, setHasInspectedModule] = useState(false);
  const [showBasePanel, setShowBasePanel] = useState(false);

  useEffect(() => {
    loadPreferences();
    void hydrateOrStartMission();
  }, [hydrateOrStartMission, loadPreferences]);

  useEffect(() => {
    const handlePanelKey = (event: KeyboardEvent) => {
      if (event.key === 'Tab' && (event.target === document.body || event.target instanceof HTMLCanvasElement)) {
        event.preventDefault();
        setShowBasePanel((value) => !value);
      }
      if (event.key === 'Escape') setShowBasePanel(false);
    };
    window.addEventListener('keydown', handlePanelKey);
    return () => window.removeEventListener('keydown', handlePanelKey);
  }, []);

  const handleSelectBuilding = (buildingId: BuildingId) => {
    setHasInspectedModule(true);
    selectBuilding(buildingId);
  };

  const stepGuide = getAstrobotStepGuide(mission, hasInspectedModule);
  const isFinished = mission.status !== 'IN_PROGRESS';

  return (
    <main className="flex-1 mx-auto w-full max-w-[1920px] px-2 sm:px-4 py-2 sm:py-3 flex flex-col gap-3">
      {/* Barra superior de navegación y accesibilidad */}
      <div className="flex flex-wrap items-center justify-between gap-2">
        <Link
          href="/"
          className="inline-flex items-center gap-1.5 text-xs sm:text-sm font-semibold text-cyan-300 hover:text-cyan-200"
        >
          <ArrowLeft className="h-4 w-4" />
          Volver al inicio
        </Link>

        <div className="flex items-center gap-2">
          <button type="button" onClick={() => setShowBasePanel((value) => !value)} aria-expanded={showBasePanel} className="inline-flex items-center gap-1.5 rounded-lg border border-amber-400/40 bg-stone-900 px-3 py-2 text-xs font-bold text-amber-100 hover:bg-stone-800"><PanelTop className="h-4 w-4" /> {showBasePanel ? 'Cerrar panel' : 'Panel de base'} <span className="hidden sm:inline">· TAB</span></button>
          <button
            type="button"
            onClick={toggleReducedMotion}
            className="inline-flex items-center gap-1.5 rounded-xl border border-slate-700 bg-slate-900/80 px-3 py-1.5 text-xs font-medium text-slate-200 hover:bg-slate-800 cursor-pointer"
          >
            <Eye className="h-3.5 w-3.5 text-cyan-300" />
            {reducedMotion ? 'Movimiento reducido: ON' : 'Movimiento reducido: OFF'}
          </button>

          <button
            type="button"
            onClick={() => startNewMission()}
            className="inline-flex items-center gap-1.5 rounded-xl border border-slate-700 bg-slate-900/80 px-3 py-1.5 text-xs font-medium text-slate-200 hover:bg-slate-800 cursor-pointer"
          >
            <RotateCcw className="h-3.5 w-3.5 text-orange-300" />
            Reiniciar misión
          </button>
        </div>
      </div>

      {/* Banner de resultado cuando termina la partida */}
      {isFinished && (
        <div
          className={`flex flex-wrap items-center justify-between gap-3 rounded-2xl border p-4 shadow-lg ${
            mission.status === 'VICTORY'
              ? 'border-emerald-500/60 bg-emerald-950/50'
              : 'border-red-500/60 bg-red-950/50'
          }`}
        >
          <div>
            <p className="text-xs font-bold uppercase tracking-wider text-white/80">
              {mission.status === 'VICTORY'
                ? '¡Misión Completada!'
                : 'Misión Interrumpida'}
            </p>
            <p className="text-base font-bold text-white">
              {mission.outcomeReason}
            </p>
          </div>
          <Link
            href="/results"
            className="inline-flex items-center gap-2 rounded-xl bg-white text-slate-950 px-4 py-2.5 text-sm font-bold hover:bg-slate-200"
          >
            <Award className="h-4 w-4" />
            Ver reporte y aprendizajes
          </Link>
        </div>
      )}

      {isSyncing && <p role="status" className="rounded-xl border border-cyan-500/30 bg-cyan-950/30 px-4 py-2 text-sm text-cyan-100">Guardando tu decisión…</p>}

      <div className="w-full">
          <ColonyMap
            selectedBuilding={selectedBuilding}
            onSelectBuilding={handleSelectBuilding}
            activeEvent={mission.activeEvent}
            reducedMotion={reducedMotion}
            mission={mission}
            isSyncing={isSyncing}
            isPersisted={isPersisted}
            onExecuteAction={executeAction}
          />
      </div>

      {showBasePanel && <section role="dialog" aria-modal="true" aria-label="Panel de la base" className="fixed inset-2 z-50 overflow-y-auto rounded-2xl border border-stone-500/70 bg-stone-950/95 p-4 shadow-2xl backdrop-blur-lg sm:inset-6">
        <div className="mb-4 flex items-center justify-between gap-3 border-b border-stone-700 pb-3"><div><p className="text-xs font-bold uppercase tracking-[0.22em] text-amber-300">Aurora-1</p><h2 className="text-xl font-bold text-white">Panel de la base</h2></div><button type="button" onClick={() => setShowBasePanel(false)} className="rounded-lg border border-stone-500 px-4 py-2 text-sm font-bold text-white hover:bg-stone-800">Cerrar · ESC</button></div>
        <div className="grid grid-cols-1 gap-4 lg:grid-cols-12">
        <div className="flex flex-col gap-4 lg:col-span-8">
          <AstrobotGuideBar guide={stepGuide} reducedMotion={reducedMotion} onFocusBuilding={handleSelectBuilding} />
          <ActionDeck mission={mission} selectedBuilding={selectedBuilding} lastError={lastError} onExecuteAction={executeAction} onAdvanceTurn={nextTurn} onClearError={clearError} />
        </div>
        <div className="flex flex-col gap-4 lg:col-span-4">
          <AstrobotPanel
            astrobot={astrobot}
            activeEvent={mission.activeEvent}
            turnSummary={lastTurnSummary}
          />
          <NasaEventsPanel />
          <NasaGalleryPanel />
        </div>
        </div>
      </section>}
    </main>
  );
}
