'use client';

import Link from 'next/link';
import { useEffect, useState } from 'react';
import { Award, LifeBuoy, X } from 'lucide-react';
import { ColonyMap } from '@/modules/mission/presentation/components/ColonyMap';
import type { ActionType } from '@/modules/simulation/domain/types';
import { useGameStore } from '@/stores/game.store';
import { useAdventureStore } from '@/stores/adventure.store';
import { DecisionReview } from '@/modules/adventure/presentation/DecisionReview';
import { RescueExperience } from '@/modules/adventure/presentation/RescueExperience';

export default function GamePage() {
  const {
    mission,
    isSyncing,
    isPersisted,
    selectedBuilding,
    lastError,
    reducedMotion,
    hydrateOrStartMission,
    selectBuilding,
    executeAction,
    nextTurn,
    loadPreferences,
    clearError,
  } = useGameStore();

  const [decision, setDecision] = useState<ActionType | 'advance' | null>(null);
  const [showRescue, setShowRescue] = useState(false);
  const [notice, setNotice] = useState<{ title: string; text: string } | null>(null);

  useEffect(() => {
    loadPreferences();
    useAdventureStore.getState().load();
    void hydrateOrStartMission();
  }, [hydrateOrStartMission, loadPreferences]);

  useEffect(() => {
    if (!notice) return;
    const timer = window.setTimeout(() => setNotice(null), 9000);
    return () => window.clearTimeout(timer);
  }, [notice]);

  const requestDecision = (action: ActionType | 'advance') => {
    if (!isPersisted || isSyncing) return;
    clearError();
    setDecision(action);
  };
  const confirmDecision = async () => {
    if (!decision) return;
    const before = useGameStore.getState().mission;
    if (decision === 'advance') await nextTurn(); else await executeAction(decision);
    const state = useGameStore.getState();
    if (state.lastError || state.isSyncing) return;
    const labels = { energy: 'energía', oxygen: 'oxígeno', food: 'comida', radiationProtection: 'protección', crewHealth: 'salud', science: 'ciencia' };
    const changes = (Object.keys(labels) as (keyof typeof labels)[]).flatMap((key) => {
      const delta = state.mission.resources[key] - before.resources[key];
      return delta ? [`${delta > 0 ? '+' : '−'}${Math.abs(delta)} ${labels[key]}`] : [];
    });
    setNotice({ title: decision === 'advance' ? `Sol ${Math.min(state.mission.currentTurn, state.mission.maxTurns)} · Base actualizada` : 'Plan completado', text: changes.join(', ') || 'Las reservas se mantienen.' });
    setDecision(null);
  };

  const isFinished = mission.status !== 'IN_PROGRESS';

  return (
    <main className="relative flex-1 w-full bg-[#201b1a]">
      {/* Banner de resultado cuando termina la partida */}
      {isFinished && (
        <div
          className={`colony-mission-result flex flex-wrap items-center justify-between gap-3 rounded-2xl border p-4 shadow-lg ${
            mission.status === 'VICTORY'
              ? 'border-emerald-500/60 bg-emerald-950/50'
              : 'border-red-500/60 bg-red-950/50'
          }`}
        >
          <div>
            <p className="text-xs font-bold uppercase tracking-wider text-white/80">
              {mission.status === 'VICTORY'
                ? '¡Misión Completada!'
                : 'Probemos otro plan'}
            </p>
            <p className="text-base font-bold text-white">
              {mission.outcomeReason}
            </p>
          </div>
          {mission.status === 'DEFEAT' && !mission.actionHistory.some((action) => action.kind === 'RESCUE') && <button type="button" onClick={() => { clearError(); setShowRescue(true); }} className="inline-flex items-center gap-2 rounded-xl bg-amber-200 px-4 py-3 font-bold text-stone-950"><LifeBuoy size={20} />Misión de rescate</button>}
          <Link
            href="/results"
            className="inline-flex items-center gap-2 rounded-xl bg-white text-slate-950 px-4 py-2.5 text-sm font-bold hover:bg-slate-200"
          >
            <Award className="h-4 w-4" />
            Ver reporte y aprendizajes
          </Link>
        </div>
      )}

      {isSyncing && <p role="status" className="colony-saving">Guardando tu decisión…</p>}
      {lastError && !decision && !showRescue && <p role="alert" className="colony-message">{lastError}</p>}

      <div className="w-full space-y-2.5">
          <ColonyMap
            key={mission.missionId}
            selectedBuilding={selectedBuilding}
            onSelectBuilding={selectBuilding}
            activeEvent={mission.activeEvent}
            reducedMotion={reducedMotion}
            mission={mission}
            isSyncing={isSyncing}
            isPersisted={isPersisted}
            onExecuteAction={requestDecision}
            onAdvance={() => requestDecision('advance')}
            onRescue={() => { clearError(); setShowRescue(true); }}
          />
          <div className="flex flex-wrap items-center justify-between gap-2 rounded-xl border border-white/15 bg-[rgba(17,19,20,0.65)] px-3.5 py-2.5 text-xs text-[#ede7df] backdrop-blur-md">
            <div className="flex flex-wrap items-center gap-3">
              <span className="inline-flex items-center gap-1.5">
                <kbd className="inline-flex h-5 min-w-[22px] items-center justify-center rounded border border-[#eee2d5]/70 bg-[#262626] px-1.5 text-[10px] font-bold text-white">W A S D</kbd>
                <span>Mover astronauta</span>
              </span>
              <span className="inline-flex items-center gap-1.5">
                <kbd className="inline-flex h-5 min-w-[22px] items-center justify-center rounded border border-[#eee2d5]/70 bg-[#262626] px-1.5 text-[10px] font-bold text-white">Mouse</kbd>
                <span>Mirar / Cámara</span>
              </span>
              <span className="inline-flex items-center gap-1.5">
                <kbd className="inline-flex h-5 min-w-[22px] items-center justify-center rounded border border-[#eee2d5]/70 bg-[#262626] px-1.5 text-[10px] font-bold text-white">E</kbd>
                <span>Entrar al módulo</span>
              </span>
              <span className="inline-flex items-center gap-1.5">
                <kbd className="inline-flex h-5 min-w-[22px] items-center justify-center rounded border border-[#eee2d5]/70 bg-[#262626] px-1.5 text-[10px] font-bold text-white">V</kbd>
                <span>Cambiar vista</span>
              </span>
            </div>
            <span className="text-[11px] font-semibold text-[#ffd27a]">Haz clic en la colonia para explorar</span>
          </div>
      </div>

      {decision && <DecisionReview decision={decision} mission={mission} busy={isSyncing} error={lastError} onConfirm={() => void confirmDecision()} onClose={() => setDecision(null)} />}
      {showRescue && <RescueExperience onClose={() => setShowRescue(false)} />}
      {notice && <aside role="status" className="adventure-result"><div><strong>{notice.title}</strong><button type="button" aria-label="Cerrar resultado de la decisión" onClick={() => setNotice(null)}><X size={20} /></button></div><p>{notice.text}</p></aside>}
    </main>
  );
}
