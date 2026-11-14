export type MissionStatusType = 'IN_PROGRESS' | 'VICTORY' | 'DEFEAT';

export type ActionType =
  | 'BOOST_OXYGEN'
  | 'SAVE_ENERGY'
  | 'REINFORCE_SHIELDING'
  | 'ACTIVATE_GREENHOUSE'
  | 'CONDUCT_RESEARCH'
  | 'REPAIR_SYSTEMS';

export type SpaceEventType =
  | 'DUST_STORM'
  | 'SOLAR_EVENT'
  | 'OXYGEN_GENERATOR_FAILURE';

export type BuildingId =
  | 'HABITAT'
  | 'OXYGEN_GENERATOR'
  | 'SOLAR_PANELS'
  | 'BATTERIES'
  | 'GREENHOUSE'
  | 'SCIENCE_LAB'
  | 'RADIATION_SHELTER'
  | 'COMMS_ANTENNA';

export interface ResourceSnapshot {
  energy: number;
  oxygen: number;
  radiationProtection: number;
  food: number;
  science: number;
  crewHealth: number;
}

export interface DeferredEffect {
  id: string;
  triggerTurn: number;
  sourceAction: ActionType;
  label: string;
  deltas: Partial<ResourceSnapshot>;
}

export interface ScientificReference {
  externalId: string;
  source: string;
  observedAt: string;
  eventType: string;
  description: string;
  sourceUrl: string;
  isHistorical: boolean;
  /** Letra de la clase de llamarada solar real (A, B, C, M, X) cuando aplica. */
  flareClass?: string;
}

export interface SpaceEventRecord {
  id: string;
  type: SpaceEventType;
  title: string;
  kidSummary: string;
  engineeringLesson: string;
  turn: number;
  deltas: Partial<ResourceSnapshot>;
  scientificReference: ScientificReference;
}

export interface ActionExecutionRecord {
  turn: number;
  actionType: ActionType;
  title: string;
  deltas: Partial<ResourceSnapshot>;
  educationalNote: string;
}

export interface MissionSimulationState {
  missionId: string;
  scenarioId: string;
  status: MissionStatusType;
  currentTurn: number;
  maxTurns: number;
  randomSeed: number;
  engineVersion: string;
  resources: ResourceSnapshot;
  actionsTakenThisTurn: number;
  maxActionsPerTurn: number;
  actionsExecutedIdsThisTurn: ActionType[];
  deferredEffects: DeferredEffect[];
  activeEvent: SpaceEventRecord | null;
  eventHistory: SpaceEventRecord[];
  actionHistory: ActionExecutionRecord[];
  outcomeReason: string | null;
}

export interface ActionDefinition {
  id: ActionType;
  name: string;
  buildingId: BuildingId;
  shortDescription: string;
  benefitsText: string;
  costsText: string;
  requirementsText: string;
  immediateDeltas: Partial<ResourceSnapshot>;
  deferredDelta?: {
    label: string;
    deltas: Partial<ResourceSnapshot>;
  };
  minResourcesRequired?: Partial<ResourceSnapshot>;
  educationalExplanation: string;
}

export interface SimulationConfig {
  engineVersion: string;
  maxTurns: number;
  maxActionsPerTurn: number;
  resourceBounds: {
    min: number;
    max: number;
  };
  initialResources: ResourceSnapshot;
  baseProductionPerTurn: ResourceSnapshot;
  baseConsumptionPerTurn: ResourceSnapshot;
  lowThresholds: {
    energy: number;
    oxygen: number;
    radiationProtection: number;
    food: number;
    crewHealth: number;
  };
  scienceExcellenceTarget: number;
  actions: Record<ActionType, ActionDefinition>;
}

export interface ActionValidationResult {
  valid: boolean;
  reason?: string;
}

export interface ActionApplicationResult {
  applied: boolean;
  reason?: string;
  state: MissionSimulationState;
  record?: ActionExecutionRecord;
}

export interface TurnAdvanceResult {
  state: MissionSimulationState;
  production: ResourceSnapshot;
  consumption: ResourceSnapshot;
  triggeredEvent: SpaceEventRecord | null;
  appliedDeferredEffects: DeferredEffect[];
  turnSummary: string[];
}
