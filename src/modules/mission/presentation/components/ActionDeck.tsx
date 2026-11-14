'use client';

import { ArrowRight, Check, ChevronDown, X } from 'lucide-react';
import { useState } from 'react';
import { DEFAULT_SIMULATION_CONFIG } from '@/modules/simulation/domain/resource-rules';
import { validatePlayerAction } from '@/modules/simulation/domain/simulation-engine';
import type { ActionType, BuildingId, MissionSimulationState, ResourceSnapshot } from '@/modules/simulation/domain/types';

interface ActionDeckProps {
  mission: MissionSimulationState;
  selectedBuilding: BuildingId | null;
  lastError: string | null;
  onExecuteAction: (actionType: ActionType) => void;
  onAdvanceTurn: () => void;
  onClearError: () => void;
  compact?: boolean;
  available?: boolean;
}

const ACTIONS = Object.values(DEFAULT_SIMULATION_CONFIG.actions);
const LABELS: Record<keyof ResourceSnapshot, string> = {
  energy: 'energía', oxygen: 'oxígeno', radiationProtection: 'protección',
  food: 'comida', science: 'ciencia', crewHealth: 'salud',
};
const SHORT_NAMES: Record<ActionType, string> = {
  BOOST_OXYGEN: 'Producir oxígeno', SAVE_ENERGY: 'Ahorrar energía',
  REINFORCE_SHIELDING: 'Reforzar refugio', ACTIVATE_GREENHOUSE: 'Cultivar comida',
  CONDUCT_RESEARCH: 'Explorar Marte', REPAIR_SYSTEMS: 'Reparar la base',
};

function changes(deltas: Partial<ResourceSnapshot>, positive: boolean) {
  return Object.entries(deltas)
    .filter(([, value]) => typeof value === 'number' && (positive ? value > 0 : value < 0))
    .map(([key, value]) => `${positive ? '+' : '−'}${Math.abs(value)} ${LABELS[key as keyof ResourceSnapshot]}`);
}

export function ActionDeck({ mission, selectedBuilding, lastError, onExecuteAction, onAdvanceTurn, onClearError, compact = false, available = true }: ActionDeckProps) {
  const [focusedAction, setFocusedAction] = useState<ActionType>(() => ACTIONS.find((action) => action.buildingId === selectedBuilding)?.id ?? 'ACTIVATE_GREENHOUSE');
  const finished = mission.status !== 'IN_PROGRESS';
  const remaining = mission.maxActionsPerTurn - mission.actionsTakenThisTurn;
  const sorted = [...ACTIONS].sort((a, b) => Number(b.buildingId === selectedBuilding) - Number(a.buildingId === selectedBuilding));

  return <section id="decisiones" className={compact ? 'adventure-decisions' : 'rounded-3xl border border-slate-700 bg-[#101b30] p-4 shadow-xl sm:p-6'}>
    <div className="mb-5 flex flex-wrap items-center justify-between gap-3">
      <div>
        {!compact && <p className="text-xs font-bold uppercase tracking-[0.18em] text-cyan-300">Paso 1 · Decide</p>}
        {!compact && <h2 className="mt-1 text-xl font-bold text-white sm:text-2xl">¿Qué necesita la colonia?</h2>}
        <p className="mt-1 text-sm text-slate-300">{!compact && <>Elige hasta {mission.maxActionsPerTurn} acciones. </>}Te {remaining === 1 ? 'queda' : 'quedan'} <strong className="text-white">{Math.max(0, remaining)}</strong> {remaining === 1 ? 'decisión' : 'decisiones'} este sol.</p>
      </div>
      {!compact && <button type="button" onClick={onAdvanceTurn} disabled={finished || !available} className="inline-flex min-h-12 items-center gap-2 rounded-xl bg-orange-500 px-5 py-3 font-bold text-slate-950 transition hover:bg-orange-400 disabled:cursor-not-allowed disabled:bg-slate-700 disabled:text-slate-400">
        {mission.currentTurn >= mission.maxTurns ? 'Terminar misión' : 'Paso 2 · Pasar al siguiente sol'} <ArrowRight className="h-4 w-4" />
      </button>}
    </div>

    {lastError && <div role="alert" className="mb-4 flex items-center justify-between gap-3 rounded-xl border border-red-400/50 bg-red-950/50 p-3 text-sm text-red-100"><span>{lastError}</span><button type="button" onClick={onClearError} aria-label="Cerrar error"><X className="h-5 w-5" /></button></div>}

    {compact && <label className="adventure-action-picker">Elige una tarea<select value={focusedAction} onChange={(event) => setFocusedAction(event.target.value as ActionType)}>{ACTIONS.map((action) => <option key={action.id} value={action.id}>{SHORT_NAMES[action.id]}</option>)}</select></label>}
    <div className={compact ? 'adventure-focused-action' : 'grid gap-3 sm:grid-cols-2 xl:grid-cols-3'}>
      {(compact ? ACTIONS.filter((action) => action.id === focusedAction) : sorted).map((action) => {
        const validation = validatePlayerAction(mission, action.id, DEFAULT_SIMULATION_CONFIG);
        const used = mission.actionsExecutedIdsThisTurn.includes(action.id);
        const highlighted = selectedBuilding === action.buildingId;
        const gains = changes(action.immediateDeltas, true);
        const costs = changes(action.immediateDeltas, false);
        return <article key={action.id} className={`flex flex-col rounded-2xl border p-4 ${highlighted ? 'border-cyan-400 bg-cyan-950/30' : 'border-slate-700 bg-slate-900/70'}`}>
          <div className="flex items-start justify-between gap-2">
            <h3 className="text-base font-bold text-white">{SHORT_NAMES[action.id]}</h3>
            {used && <span className="inline-flex items-center gap-1 rounded-full bg-emerald-500/20 px-2 py-1 text-xs font-bold text-emerald-300"><Check className="h-3.5 w-3.5" /> Hecho</span>}
          </div>
          <div className="mt-3 flex flex-wrap gap-1.5" aria-label="Consecuencias inmediatas">
            {gains.map((label) => <span key={label} className="rounded-lg bg-emerald-500/15 px-2 py-1 text-sm font-semibold text-emerald-200">{label}</span>)}
            {costs.map((label) => <span key={label} className="rounded-lg bg-amber-500/15 px-2 py-1 text-sm font-semibold text-amber-200">{label}</span>)}
          </div>
          {action.deferredDelta && <p className="mt-2 text-xs font-medium text-amber-200">Próximo sol: {changes(action.deferredDelta.deltas, true).concat(changes(action.deferredDelta.deltas, false)).join(' · ')}</p>}
          <details className="group mt-3 text-sm text-slate-300"><summary className="flex cursor-pointer list-none items-center gap-1 text-cyan-200">¿Por qué? <ChevronDown className="h-4 w-4 transition group-open:rotate-180" /></summary><p className="mt-2 leading-relaxed">{action.educationalExplanation}</p></details>
          <button type="button" onClick={() => onExecuteAction(action.id)} disabled={!validation.valid || !available} title={validation.reason} className="mt-auto min-h-11 w-full rounded-xl bg-cyan-400 px-3 py-2 text-sm font-bold text-slate-950 transition hover:bg-cyan-300 disabled:cursor-not-allowed disabled:bg-slate-700 disabled:text-slate-300">{used ? 'Ya elegida' : validation.valid ? compact ? 'Revisar este plan' : 'Elegir esta acción' : 'No disponible'}</button>
          {!validation.valid && !used && validation.reason && <p className="mt-1 text-center text-xs text-slate-400">{validation.reason}</p>}
        </article>;
      })}
    </div>
    {compact && <button type="button" className="adventure-next-sol" onClick={onAdvanceTurn} disabled={finished || !available}>{mission.currentTurn >= mission.maxTurns ? 'Terminar misión' : 'Pasar al siguiente sol'}<ArrowRight size={18} /></button>}
  </section>;
}
