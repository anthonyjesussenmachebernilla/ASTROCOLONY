'use client';

import Link from 'next/link';
import { useEffect } from 'react';
import { ArrowLeft, Award, Eye, RotateCcw } from 'lucide-react';
import { ActionDeck } from '@/modules/mission/presentation/components/ActionDeck';
import { AstrobotPanel } from '@/modules/mission/presentation/components/AstrobotPanel';
import { ColonyMap } from '@/modules/mission/presentation/components/ColonyMap';
import { ResourceBar } from '@/modules/mission/presentation/components/ResourceBar';
import { NasaEventsPanel } from '@/modules/nasa/presentation/NasaEventsPanel';
import { NasaGalleryPanel } from '@/modules/nasa/presentation/NasaGalleryPanel';
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
    clearError,
  } = useGameStore();

  useEffect(() => {
    void hydrateOrStartMission();
  }, [hydrateOrStartMission]);

  const isFinished = mission.status !== 'IN_PROGRESS';

  return (
    <main className="flex-1 mx-auto w-full max-w-[1600px] px-3 sm:px-6 py-4 sm:py-6 flex flex-col gap-4">
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

      {/* HUD Superior */}
      <ResourceBar
        resources={mission.resources}
        currentTurn={mission.currentTurn}
        maxTurns={mission.maxTurns}
        actionsTakenThisTurn={mission.actionsTakenThisTurn}
        maxActionsPerTurn={mission.maxActionsPerTurn}
      />

      {isSyncing && <p role="status" className="rounded-xl border border-cyan-500/30 bg-cyan-950/30 px-4 py-2 text-sm text-cyan-100">Guardando tu decisión…</p>}

      {/* Colonia + ASTROBOT */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-4 items-start">
        <div className="lg:col-span-8">
          <ColonyMap
            selectedBuilding={selectedBuilding}
            onSelectBuilding={selectBuilding}
            activeEvent={mission.activeEvent}
            reducedMotion={reducedMotion}
            mission={mission}
            isSyncing={isSyncing}
            isPersisted={isPersisted}
            onExecuteAction={executeAction}
          />
        </div>
        <div className="lg:col-span-4 flex flex-col gap-4">
          <AstrobotPanel
            astrobot={astrobot}
            activeEvent={mission.activeEvent}
            turnSummary={lastTurnSummary}
          />
          <NasaEventsPanel />
        </div>
      </div>

      {/* Panel de 6 decisiones */}
      <ActionDeck
        mission={mission}
        selectedBuilding={selectedBuilding}
        lastError={lastError}
        onExecuteAction={executeAction}
        onAdvanceTurn={nextTurn}
        onClearError={clearError}
      />

      <NasaGalleryPanel />
    </main>
  );
}
