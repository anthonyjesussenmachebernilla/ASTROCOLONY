import { resolveSpaceEvent, selectEventForTurn } from './event-resolver';
import { applyResourceDeltas, DEFAULT_SIMULATION_CONFIG } from './resource-rules';
import {
  calculateConsumption,
  calculateProduction,
  evaluateMissionStatus,
} from './simulation-engine';
import type {
  DeferredEffect,
  MissionSimulationState,
  ScientificReference,
  SimulationConfig,
  SpaceEventType,
  TurnAdvanceResult,
} from './types';

export function advanceTurn(
  state: MissionSimulationState,
  config: SimulationConfig = DEFAULT_SIMULATION_CONFIG,
  externalEventOverrides?: Partial<Record<SpaceEventType, ScientificReference>>,
): TurnAdvanceResult {
  if (state.status !== 'IN_PROGRESS') {
    return {
      state,
      production: {
        energy: 0,
        oxygen: 0,
        radiationProtection: 0,
        food: 0,
        science: 0,
        crewHealth: 0,
      },
      consumption: {
        energy: 0,
        oxygen: 0,
        radiationProtection: 0,
        food: 0,
        science: 0,
        crewHealth: 0,
      },
      triggeredEvent: null,
      appliedDeferredEffects: [],
      turnSummary: ['La misión ya finalizó.'],
    };
  }

  const turnSummary: string[] = [];

  // 1. Calcular producción y consumo del sol que termina
  const production = calculateProduction(state, config);
  const consumption = calculateConsumption(state, config);

  let nextResources = applyResourceDeltas(
    state.resources,
    {
      energy: production.energy - consumption.energy,
      oxygen: production.oxygen - consumption.oxygen,
      radiationProtection:
        production.radiationProtection - consumption.radiationProtection,
      food: production.food - consumption.food,
      science: production.science - consumption.science,
      crewHealth: production.crewHealth - consumption.crewHealth,
    },
    config.resourceBounds,
  );

  turnSummary.push(
    `Balance del Sol ${state.currentTurn}: +${production.energy}/-${consumption.energy} Energía, +${production.oxygen}/-${consumption.oxygen} Oxígeno.`,
  );

  // 2. Avanzar el contador de sol y aplicar efectos diferidos programados para el nuevo sol
  const nextTurnNumber = state.currentTurn + 1;
  const dueEffects: DeferredEffect[] = [];
  const remainingDeferred: DeferredEffect[] = [];

  for (const effect of state.deferredEffects) {
    if (effect.triggerTurn <= nextTurnNumber) {
      dueEffects.push(effect);
      nextResources = applyResourceDeltas(
        nextResources,
        effect.deltas,
        config.resourceBounds,
      );
      turnSummary.push(`Consecuencia diferida: ${effect.label}.`);
    } else {
      remainingDeferred.push(effect);
    }
  }

  let nextState: MissionSimulationState = {
    ...state,
    currentTurn: nextTurnNumber,
    resources: nextResources,
    actionsTakenThisTurn: 0,
    actionsExecutedIdsThisTurn: [],
    deferredEffects: remainingDeferred,
    activeEvent: null,
  };

  // 3. Evaluar si la colonia ya perdió antes de pasar al siguiente sol o si completó los 10 soles
  nextState = evaluateMissionStatus(nextState, config);
  if (nextState.status !== 'IN_PROGRESS') {
    return {
      state: nextState,
      production,
      consumption,
      triggeredEvent: null,
      appliedDeferredEffects: dueEffects,
      turnSummary,
    };
  }

  // 4. Si seguimos en curso (Soles 2..10), evaluar evento espacial determinista del nuevo sol
  const triggeredEvent = selectEventForTurn(
    state.randomSeed,
    nextTurnNumber,
    externalEventOverrides,
  );

  if (triggeredEvent) {
    nextState = resolveSpaceEvent(nextState, triggeredEvent, config);
    turnSummary.push(`Evento espacial: ${triggeredEvent.title}.`);
    nextState = evaluateMissionStatus(nextState, config);
  }

  return {
    state: nextState,
    production,
    consumption,
    triggeredEvent,
    appliedDeferredEffects: dueEffects,
    turnSummary,
  };
}
