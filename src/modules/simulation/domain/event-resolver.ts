import type {
  MissionSimulationState,
  ScientificReference,
  SimulationConfig,
  SpaceEventRecord,
  SpaceEventType,
} from './types';
import { applyResourceDeltas, SOLAR_FLARE_SHIELD_LOSS } from './resource-rules';

/**
 * Generador pseudoaleatorio determinista (Mulberry32) para garantizar
 * reproducibilidad exacta dada la misma semilla y turno.
 */
export function createDeterministicRng(seed: number): () => number {
  let state = seed >>> 0;
  return () => {
    state = (state + 0x6d2b79f5) | 0;
    let t = Math.imul(state ^ (state >>> 15), 1 | state);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

interface HistoricalEventTemplate {
  type: SpaceEventType;
  title: string;
  kidSummary: string;
  engineeringLesson: string;
  deltas: Partial<Record<'energy' | 'oxygen' | 'radiationProtection' | 'food' | 'crewHealth', number>>;
  scientificReference: ScientificReference;
}

const HISTORICAL_EVENT_TEMPLATES: Record<SpaceEventType, HistoricalEventTemplate> = {
  DUST_STORM: {
    type: 'DUST_STORM',
    title: 'Tormenta de polvo marciana',
    kidSummary:
      'Una nube gigante de polvo naranja cubre el cielo y tapa la luz del Sol sobre los paneles solares.',
    engineeringLesson:
      'En Marte, las tormentas de polvo reducen la energía solar. Los ingenieros deben decidir si ahorran batería o priorizan el soporte vital.',
    deltas: {
      energy: -14,
      radiationProtection: -5,
    },
    scientificReference: {
      externalId: 'MARS-DUST-2018-MY34',
      source: 'NASA Mars Exploration / Mars Trek',
      observedAt: '2018-06-10T00:00:00Z',
      eventType: 'Global Dust Storm (Mars Year 34)',
      description:
        'Tormenta de polvo planetaria observada por misiones de NASA en Marte que oscureció la atmósfera y redujo drásticamente la generación solar.',
      sourceUrl: 'https://trek.nasa.gov/mars/',
      isHistorical: true,
    },
  },
  SOLAR_EVENT: {
    type: 'SOLAR_EVENT',
    title: 'Tormenta solar detectada por NASA DONKI',
    kidSummary:
      'El Sol lanzó una ráfaga de partículas energéticas. No todas golpean con fuerza peligrosa, pero hoy debemos vigilar nuestro blindaje.',
    engineeringLesson:
      'NASA DONKI monitorea erupciones y eyecciones solares reales. Un buen refugio protege a la tripulación, pero mantenerlo cuesta electricidad.',
    deltas: {
      radiationProtection: -18,
      energy: -6,
    },
    scientificReference: {
      externalId: 'DONKI-FLR-2024-05-14-X8.7',
      source: 'NASA DONKI (Space Weather Database)',
      observedAt: '2024-05-14T16:51:00Z',
      eventType: 'Solar Flare (X8.7) & Radiation Risk',
      description:
        'Registro histórico de llamarada solar intensa en la base de datos DONKI de NASA. El riesgo real depende de la dirección del evento y el blindaje disponible.',
      sourceUrl: 'https://ccmc.gsfc.nasa.gov/tools/DONKI/',
      isHistorical: true,
    },
  },
  OXYGEN_GENERATOR_FAILURE: {
    type: 'OXYGEN_GENERATOR_FAILURE',
    title: 'Falla en el generador de oxígeno',
    kidSummary:
      'Uno de los filtros del sistema que fabrica aire respirable se atascó por polvo fino marciano.',
    engineeringLesson:
      'En el espacio profundo no se puede abrir una ventana. Si falla el soporte vital, hay que gastar energía en reparar o racionar reservas.',
    deltas: {
      oxygen: -16,
    },
    scientificReference: {
      externalId: 'OSDR-ECLSS-RADLAB-REF',
      source: 'NASA OSDR / RadLab',
      observedAt: '2023-11-01T00:00:00Z',
      eventType: 'Life Support & Crew Health Monitoring',
      description:
        'Referencia de estudios de salud de astronautas y monitoreo ambiental en hábitats espaciales del Repositorio Abierto de Datos Científicos de NASA.',
      sourceUrl: 'https://osdr.nasa.gov/bio/repo/',
      isHistorical: true,
    },
  },
};

export function selectEventForTurn(
  seed: number,
  turn: number,
  externalOverrides?: Partial<Record<SpaceEventType, ScientificReference>>,
): SpaceEventRecord | null {
  // Turno 1 es tranquilo para que el jugador aprenda; a partir del turno 2 hay probabilidad determinista de evento
  if (turn <= 1) {
    return null;
  }

  const rng = createDeterministicRng(seed * 31 + turn * 97);
  const roll = rng();

  // ~65% de probabilidad de evento espacial por sol a partir del sol 2
  if (roll > 0.65) {
    return null;
  }

  const eventOrder: SpaceEventType[] = [
    'DUST_STORM',
    'SOLAR_EVENT',
    'OXYGEN_GENERATOR_FAILURE',
  ];
  const index = Math.floor(rng() * eventOrder.length);
  const chosenType = eventOrder[index];
  const template = HISTORICAL_EVENT_TEMPLATES[chosenType];
  const ref = externalOverrides?.[chosenType] ?? template.scientificReference;

  const deltas = { ...template.deltas };
  // Vínculo con datos reales: la clase de la llamarada DONKI define la intensidad del golpe de radiación
  if (chosenType === 'SOLAR_EVENT' && ref.flareClass) {
    const loss = SOLAR_FLARE_SHIELD_LOSS[ref.flareClass.toUpperCase()];
    if (loss !== undefined) {
      deltas.radiationProtection = loss;
    }
  }

  return {
    id: `evt-${seed}-sol-${turn}-${chosenType}`,
    type: template.type,
    title: template.title,
    kidSummary: template.kidSummary,
    engineeringLesson: template.engineeringLesson,
    turn,
    deltas,
    scientificReference: ref,
  };
}

export function resolveSpaceEvent(
  state: MissionSimulationState,
  event: SpaceEventRecord,
  config: SimulationConfig,
): MissionSimulationState {
  let nextResources = applyResourceDeltas(
    state.resources,
    event.deltas,
    config.resourceBounds,
  );

  // Regla científica educativa: en evento solar, si el blindaje cae bajo el umbral seguro, la salud sufre
  if (
    event.type === 'SOLAR_EVENT' &&
    nextResources.radiationProtection < config.lowThresholds.radiationProtection
  ) {
    nextResources = applyResourceDeltas(
      nextResources,
      { crewHealth: -12 },
      config.resourceBounds,
    );
  }

  // En falla de oxígeno, si el oxígeno cae bajo el umbral crítico, afecta la salud de la tripulación
  if (
    event.type === 'OXYGEN_GENERATOR_FAILURE' &&
    nextResources.oxygen < config.lowThresholds.oxygen
  ) {
    nextResources = applyResourceDeltas(
      nextResources,
      { crewHealth: -8 },
      config.resourceBounds,
    );
  }

  return {
    ...state,
    resources: nextResources,
    activeEvent: event,
    eventHistory: [...state.eventHistory, event],
  };
}
