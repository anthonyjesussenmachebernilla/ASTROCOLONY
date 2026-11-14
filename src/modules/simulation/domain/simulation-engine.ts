import {
  applyResourceDeltas,
  DEFAULT_SIMULATION_CONFIG,
} from './resource-rules';
import type {
  ActionApplicationResult,
  ActionType,
  ActionValidationResult,
  DeferredEffect,
  MissionSimulationState,
  MissionStatusType,
  ResourceSnapshot,
  SimulationConfig,
} from './types';

export function createInitialMissionState(params: {
  missionId: string;
  scenarioId?: string;
  randomSeed: number;
  config?: SimulationConfig;
}): MissionSimulationState {
  const config = params.config ?? DEFAULT_SIMULATION_CONFIG;
  return {
    missionId: params.missionId,
    scenarioId: params.scenarioId ?? 'mars-jezero-outpost',
    status: 'IN_PROGRESS',
    currentTurn: 1,
    maxTurns: config.maxTurns,
    randomSeed: params.randomSeed,
    engineVersion: config.engineVersion,
    resources: { ...config.initialResources },
    actionsTakenThisTurn: 0,
    maxActionsPerTurn: config.maxActionsPerTurn,
    actionsExecutedIdsThisTurn: [],
    deferredEffects: [],
    activeEvent: null,
    eventHistory: [],
    actionHistory: [],
    outcomeReason: null,
  };
}

export function calculateProduction(
  state: MissionSimulationState,
  config: SimulationConfig = DEFAULT_SIMULATION_CONFIG,
): ResourceSnapshot {
  const base = { ...config.baseProductionPerTurn };

  // Si hubo tormenta de polvo activa en el turno, los paneles solares producen menos
  if (state.activeEvent?.type === 'DUST_STORM') {
    base.energy = Math.max(4, Math.round(base.energy * 0.5));
  }

  return base;
}

export function calculateConsumption(
  state: MissionSimulationState,
  config: SimulationConfig = DEFAULT_SIMULATION_CONFIG,
): ResourceSnapshot {
  const base = { ...config.baseConsumptionPerTurn };

  // Si la comida está en 0, la tripulación pierde salud por desnutrición
  if (state.resources.food <= 0) {
    base.crewHealth += 10;
  }

  // Si el blindaje es muy bajo, la radiación cósmica desgasta lentamente la salud
  if (state.resources.radiationProtection < config.lowThresholds.radiationProtection) {
    base.crewHealth += 5;
  }

  return base;
}

export function validatePlayerAction(
  state: MissionSimulationState,
  actionType: ActionType,
  config: SimulationConfig = DEFAULT_SIMULATION_CONFIG,
): ActionValidationResult {
  if (state.status !== 'IN_PROGRESS') {
    return {
      valid: false,
      reason: 'La misión ya terminó. Inicia una nueva misión para probar otra estrategia.',
    };
  }

  if (state.actionsTakenThisTurn >= state.maxActionsPerTurn) {
    return {
      valid: false,
      reason: `Ya tomaste ${state.maxActionsPerTurn} decisiones en este sol. Avanza al siguiente sol para continuar.`,
    };
  }

  const actionDef = config.actions[actionType];
  if (!actionDef) {
    return {
      valid: false,
      reason: 'La acción seleccionada no existe en el protocolo de la colonia.',
    };
  }

  const req = actionDef.minResourcesRequired ?? {};
  if (req.energy !== undefined && state.resources.energy < req.energy) {
    return {
      valid: false,
      reason: `No hay suficiente Energía (${state.resources.energy}/${req.energy}). Prueba ahorrar electricidad primero.`,
    };
  }
  if (req.oxygen !== undefined && state.resources.oxygen < req.oxygen) {
    return {
      valid: false,
      reason: `No hay suficiente Oxígeno (${state.resources.oxygen}/${req.oxygen}) para ejecutar esta acción con seguridad.`,
    };
  }
  if (
    req.radiationProtection !== undefined &&
    state.resources.radiationProtection < req.radiationProtection
  ) {
    return {
      valid: false,
      reason: `El blindaje contra radiación es demasiado bajo (${state.resources.radiationProtection}/${req.radiationProtection}).`,
    };
  }
  if (req.food !== undefined && state.resources.food < req.food) {
    return {
      valid: false,
      reason: `No hay suficientes Alimentos (${state.resources.food}/${req.food}) para esta tarea.`,
    };
  }

  return { valid: true };
}

export function applyPlayerAction(
  state: MissionSimulationState,
  actionType: ActionType,
  config: SimulationConfig = DEFAULT_SIMULATION_CONFIG,
): ActionApplicationResult {
  const validation = validatePlayerAction(state, actionType, config);
  if (!validation.valid) {
    return {
      applied: false,
      reason: validation.reason,
      state,
    };
  }

  const actionDef = config.actions[actionType];
  const nextResources = applyResourceDeltas(
    state.resources,
    actionDef.immediateDeltas,
    config.resourceBounds,
  );

  const nextDeferred: DeferredEffect[] = [...state.deferredEffects];
  if (actionDef.deferredDelta) {
    nextDeferred.push({
      id: `def-${state.currentTurn}-${actionType}-${state.actionsTakenThisTurn}`,
      triggerTurn: state.currentTurn + 1,
      sourceAction: actionType,
      label: actionDef.deferredDelta.label,
      deltas: { ...actionDef.deferredDelta.deltas },
    });
  }

  const record = {
    turn: state.currentTurn,
    actionType,
    title: actionDef.name,
    deltas: { ...actionDef.immediateDeltas },
    educationalNote: actionDef.educationalExplanation,
  };

  const updatedState: MissionSimulationState = {
    ...state,
    resources: nextResources,
    actionsTakenThisTurn: state.actionsTakenThisTurn + 1,
    actionsExecutedIdsThisTurn: [...state.actionsExecutedIdsThisTurn, actionType],
    deferredEffects: nextDeferred,
    actionHistory: [...state.actionHistory, record],
  };

  const evaluated = evaluateMissionStatus(updatedState, config);

  return {
    applied: true,
    state: evaluated,
    record,
  };
}

export function evaluateMissionStatus(
  state: MissionSimulationState,
  config: SimulationConfig = DEFAULT_SIMULATION_CONFIG,
): MissionSimulationState {
  if (state.status !== 'IN_PROGRESS') {
    return state;
  }

  let nextStatus: MissionStatusType = 'IN_PROGRESS';
  let outcomeReason: string | null = null;

  if (state.resources.energy <= 0) {
    nextStatus = 'DEFEAT';
    outcomeReason =
      'La colonia se quedó sin energía eléctrica para mantener la calefacción y los sistemas vitales.';
  } else if (state.resources.oxygen <= 0) {
    nextStatus = 'DEFEAT';
    outcomeReason =
      'Las reservas de oxígeno se agotaron y el hábitat ya no puede sostener a los astronautas.';
  } else if (state.resources.crewHealth <= 0) {
    nextStatus = 'DEFEAT';
    outcomeReason =
      'La salud de la tripulación cayó a un nivel crítico y la misión tuvo que ser evacuada.';
  } else if (state.currentTurn > state.maxTurns) {
    nextStatus = 'VICTORY';
    if (state.resources.science >= config.scienceExcellenceTarget) {
      outcomeReason =
        '¡Misión científica sobresaliente! Sobrevivieron los 10 soles marcianos y lograron grandes descubrimientos.';
    } else {
      outcomeReason =
        '¡Supervivencia completada! Mantuvieron la colonia operativa durante los 10 soles marcianos.';
    }
  }

  if (nextStatus === 'IN_PROGRESS') {
    return state;
  }

  return {
    ...state,
    status: nextStatus,
    outcomeReason,
  };
}
