import type { ActionDefinition, ActionType, ResourceSnapshot, SimulationConfig } from './types';

export const DEFAULT_SIMULATION_CONFIG: SimulationConfig = {
  engineVersion: '1.0.0',
  maxTurns: 10,
  maxActionsPerTurn: 2,
  resourceBounds: {
    min: 0,
    max: 100,
  },
  // Valores iniciales balanceados para 10 soles marcianos (unidades educativas de juego)
  initialResources: {
    energy: 70,
    oxygen: 75,
    radiationProtection: 65,
    food: 70,
    science: 10,
    crewHealth: 100,
  },
  // Producción base automática cada sol (paneles solares + recicladores básicos)
  baseProductionPerTurn: {
    energy: 14,
    oxygen: 8,
    radiationProtection: 0,
    food: 4,
    science: 0,
    crewHealth: 0,
  },
  // Consumo base automático de 4 astronautas y sistemas vitales cada sol
  baseConsumptionPerTurn: {
    energy: 12,
    oxygen: 12,
    radiationProtection: 4,
    food: 10,
    science: 0,
    crewHealth: 0,
  },
  lowThresholds: {
    energy: 25,
    oxygen: 30,
    radiationProtection: 35,
    food: 25,
    crewHealth: 40,
  },
  scienceExcellenceTarget: 50,
  actions: {
    BOOST_OXYGEN: {
      id: 'BOOST_OXYGEN',
      name: 'Aumentar producción de oxígeno',
      buildingId: 'OXYGEN_GENERATOR',
      shortDescription: 'Acelera el electrolizador para generar aire respirable extra.',
      benefitsText: '+18 Oxígeno inmediato',
      costsText: '-14 Energía ahora y -4 Energía en el siguiente sol por sobrecarga térmica',
      requirementsText: 'Requiere al menos 14 de Energía',
      immediateDeltas: {
        oxygen: 18,
        energy: -14,
      },
      deferredDelta: {
        label: 'Enfriamiento del generador de oxígeno',
        deltas: { energy: -4 },
      },
      minResourcesRequired: {
        energy: 14,
      },
      educationalExplanation:
        'En Marte el aire no se puede respirar: fabricar más oxígeno consume mucha electricidad de las baterías.',
    },
    SAVE_ENERGY: {
      id: 'SAVE_ENERGY',
      name: 'Ahorrar electricidad',
      buildingId: 'BATTERIES',
      shortDescription: 'Pone sistemas secundarios en modo ahorro para recargar baterías.',
      benefitsText: '+16 Energía inmediata',
      costsText: '-6 Oxígeno (reciclador al mínimo) y -4 Alimentos (luces del invernadero atenuadas)',
      requirementsText: 'Requiere al menos 6 de Oxígeno y 4 de Alimentos',
      immediateDeltas: {
        energy: 16,
        oxygen: -6,
        food: -4,
      },
      minResourcesRequired: {
        oxygen: 6,
        food: 4,
      },
      educationalExplanation:
        'Ahorrar electricidad ayuda a sobrevivir la noche marciana, pero reduce el ritmo del soporte vital y los cultivos.',
    },
    REINFORCE_SHIELDING: {
      id: 'REINFORCE_SHIELDING',
      name: 'Reforzar protección contra radiación',
      buildingId: 'RADIATION_SHELTER',
      shortDescription: 'Activa escudos y llena paredes de agua para frenar partículas solares.',
      benefitsText: '+20 Protección contra radiación',
      costsText: '-12 Energía ahora y -3 Energía en el siguiente sol',
      requirementsText: 'Requiere al menos 12 de Energía',
      immediateDeltas: {
        radiationProtection: 20,
        energy: -12,
      },
      deferredDelta: {
        label: 'Mantenimiento del refugio antirradiación',
        deltas: { energy: -3 },
      },
      minResourcesRequired: {
        energy: 12,
      },
      educationalExplanation:
        'Marte no tiene un campo magnético fuerte como la Tierra. Protegerse de la radiación cuesta energía y peso.',
    },
    ACTIVATE_GREENHOUSE: {
      id: 'ACTIVATE_GREENHOUSE',
      name: 'Activar invernadero',
      buildingId: 'GREENHOUSE',
      shortDescription: 'Enciende lámparas LED de cultivo para producir comida fresca y aire.',
      benefitsText: '+18 Alimentos, +6 Oxígeno ahora y +5 Alimentos en el siguiente sol',
      costsText: '-12 Energía',
      requirementsText: 'Requiere al menos 12 de Energía',
      immediateDeltas: {
        food: 18,
        oxygen: 6,
        energy: -12,
      },
      deferredDelta: {
        label: 'Cosecha progresiva del invernadero',
        deltas: { food: 5 },
      },
      minResourcesRequired: {
        energy: 12,
      },
      educationalExplanation:
        'Las plantas dan comida y también ayudan a producir oxígeno, pero las lámparas del invernadero consumen mucha luz eléctrica.',
    },
    CONDUCT_RESEARCH: {
      id: 'CONDUCT_RESEARCH',
      name: 'Realizar investigación científica',
      buildingId: 'SCIENCE_LAB',
      shortDescription: 'Analiza muestras de suelo marciano y envía datos a la Tierra.',
      benefitsText: '+18 Investigación científica',
      costsText: '-10 Energía, -6 Oxígeno y -5 Protección contra radiación',
      requirementsText: 'Requiere al menos 10 Energía, 6 Oxígeno y 5 Protección',
      immediateDeltas: {
        science: 18,
        energy: -10,
        oxygen: -6,
        radiationProtection: -5,
      },
      minResourcesRequired: {
        energy: 10,
        oxygen: 6,
        radiationProtection: 5,
      },
      educationalExplanation:
        'La ciencia es el motivo por el que vamos a Marte, pero explorar fuera del refugio gasta energía, aire y expone más a la tripulación.',
    },
    REPAIR_SYSTEMS: {
      id: 'REPAIR_SYSTEMS',
      name: 'Reparar sistemas esenciales',
      buildingId: 'HABITAT',
      shortDescription: 'La tripulación revisa sellos, filtros y equipos médicos del hábitat.',
      benefitsText: '+12 Salud de tripulación, +8 Oxígeno y +8 Protección',
      costsText: '-14 Energía y -5 Alimentos por esfuerzo físico',
      requirementsText: 'Requiere al menos 14 Energía y 5 Alimentos',
      immediateDeltas: {
        crewHealth: 12,
        oxygen: 8,
        radiationProtection: 8,
        energy: -14,
        food: -5,
      },
      minResourcesRequired: {
        energy: 14,
        food: 5,
      },
      educationalExplanation:
        'Mantener la base en buen estado protege la salud de los astronautas, pero trabajar duro consume energía y raciones.',
    },
  } satisfies Record<ActionType, ActionDefinition>,
};

/**
 * SUPUESTO EDUCATIVO (no es una medición NASA): cuánto blindaje pierde la colonia
 * según la clase REAL de la llamarada solar registrada por DONKI.
 */
export const SOLAR_FLARE_SHIELD_LOSS: Record<string, number> = {
  A: -8,
  B: -8,
  C: -10,
  M: -18,
  X: -26,
};

export function clampResourceValue(value: number, min = 0, max = 100): number {
  return Math.max(min, Math.min(max, Math.round(value)));
}

export function applyResourceDeltas(
  current: ResourceSnapshot,
  deltas: Partial<ResourceSnapshot>,
  bounds: { min: number; max: number } = { min: 0, max: 100 },
): ResourceSnapshot {
  return {
    energy: clampResourceValue(current.energy + (deltas.energy ?? 0), bounds.min, bounds.max),
    oxygen: clampResourceValue(current.oxygen + (deltas.oxygen ?? 0), bounds.min, bounds.max),
    radiationProtection: clampResourceValue(
      current.radiationProtection + (deltas.radiationProtection ?? 0),
      bounds.min,
      bounds.max,
    ),
    food: clampResourceValue(current.food + (deltas.food ?? 0), bounds.min, bounds.max),
    science: clampResourceValue(current.science + (deltas.science ?? 0), bounds.min, bounds.max),
    crewHealth: clampResourceValue(
      current.crewHealth + (deltas.crewHealth ?? 0),
      bounds.min,
      bounds.max,
    ),
  };
}
