'use client';

import { ArrowRight } from 'lucide-react';
import { DEFAULT_SIMULATION_CONFIG, applyResourceDeltas } from '@/modules/simulation/domain/resource-rules';
import { validatePlayerAction } from '@/modules/simulation/domain/simulation-engine';
import { previewNextSol } from '../domain/adventure';
import type { ActionType, MissionSimulationState, ResourceSnapshot } from '@/modules/simulation/domain/types';
import { AdventureDialog } from './AdventureDialog';
import { ReadAloud } from './ReadAloud';
import { useAdventureStore } from '@/stores/adventure.store';

const LABELS: Record<keyof ResourceSnapshot, string> = { energy: 'Energía', oxygen: 'Oxígeno', food: 'Comida', radiationProtection: 'Protección', crewHealth: 'Salud', science: 'Ciencia' };
export function DecisionReview({ decision, mission, busy, error, onConfirm, onClose }: { decision: ActionType | 'advance'; mission: MissionSimulationState; busy: boolean; error: string | null; onConfirm: () => void; onClose: () => void }) {
  const narration = useAdventureStore((s) => s.narration);
  const action = decision === 'advance' ? null : DEFAULT_SIMULATION_CONFIG.actions[decision];
  const validation = action ? validatePlayerAction(mission, action.id) : { valid: mission.status === 'IN_PROGRESS' };
  const after = action ? applyResourceDeltas(mission.resources, action.immediateDeltas) : previewNextSol(mission);
  const deltas = Object.fromEntries((Object.keys(LABELS) as (keyof ResourceSnapshot)[]).map((key) => [key, after[key] - mission.resources[key]]));
  const explanation = action ? action.educationalExplanation : 'Al pasar un sol, la base produce y consume recursos. También pueden llegar acontecimientos de la misión. Mira el resultado antes de decidir otra vez.';
  return <AdventureDialog title={action ? 'Antes de decidir' : '¿Pasamos al siguiente sol?'} onClose={onClose} busy={busy}>
    <h3 className="adventure-task-title">{action?.name ?? `Termina el sol ${mission.currentTurn}`}</h3><p className="adventure-story-text">{explanation}</p>
    <div className="adventure-preview">{(Object.keys(LABELS) as (keyof ResourceSnapshot)[]).filter((key) => deltas[key] !== undefined && deltas[key] !== 0).map((key) => <div key={key}><strong>{LABELS[key]}</strong><span>{mission.resources[key]} <ArrowRight size={16} /> {after[key]}</span><small className={(deltas[key] ?? 0) > 0 ? 'is-gain' : 'is-cost'}>{(deltas[key] ?? 0) > 0 ? 'Ganas' : 'Gastas'} {Math.abs(deltas[key] ?? 0)} unidades</small></div>)}</div>
    {action?.deferredDelta && <p className="adventure-hint">Próximo sol: {action.deferredDelta.label}. {Object.entries(action.deferredDelta.deltas).map(([key, value]) => `${(value ?? 0) > 0 ? '+' : ''}${value} ${LABELS[key as keyof ResourceSnapshot].toLowerCase()}`).join(', ')}.</p>}
    {!action && <p className="adventure-note">Incluye la producción, el consumo y las cosechas o costos pendientes. Un nuevo evento de la misión puede cambiar el resultado.</p>}
    {action && <p className="adventure-note">Las reservas llegan hasta 100. La vista muestra cuánto puedes aprovechar ahora.</p>}
    <ReadAloud key={decision} enabled={narration} text={`${action?.name ?? 'Pasar al siguiente sol'}. ${explanation}. ${action ? `Beneficio: ${action.benefitsText}. Costo: ${action.costsText}.` : ''}`} />
    {error && <p role="alert" className="adventure-feedback">{error}</p>}{!validation.valid && <p role="status">{validation.reason ?? 'La misión ya terminó.'}</p>}
    <div className="adventure-buttons"><button type="button" className="adventure-primary" disabled={busy || !validation.valid} onClick={onConfirm}>{busy ? 'Guardando mi decisión…' : 'Sí, probar este plan'}</button><button type="button" className="adventure-secondary" disabled={busy} onClick={onClose}>Pensar otra opción</button></div>
  </AdventureDialog>;
}
