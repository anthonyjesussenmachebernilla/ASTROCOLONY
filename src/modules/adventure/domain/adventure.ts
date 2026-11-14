import type { MissionSimulationState } from '@/modules/simulation/domain/types';
import { applyResourceDeltas } from '@/modules/simulation/domain/resource-rules';
import { calculateConsumption, calculateProduction } from '@/modules/simulation/domain/simulation-engine';

/** Known production, consumption and scheduled effects; unpredictable new events are excluded. */
export function previewNextSol(mission: MissionSimulationState) {
  const production = calculateProduction(mission);
  const consumption = calculateConsumption(mission);
  const balance = Object.fromEntries(Object.keys(mission.resources).map((key) => {
    const resource = key as keyof typeof production;
    return [resource, production[resource] - consumption[resource]];
  }));
  let resources = applyResourceDeltas(mission.resources, balance);
  for (const effect of mission.deferredEffects) {
    if (effect.triggerTurn <= mission.currentTurn + 1) resources = applyResourceDeltas(resources, effect.deltas);
  }
  return resources;
}

export type HelpMode = 'guided' | 'explorer';
export type ChallengeId = 'solar' | 'circuit' | 'leak';
export interface AdventureProgress {
  inspectedGreenhouse: boolean;
  completed: ChallengeId[];
  classifiedEvidence: boolean;
}
export const EMPTY_ADVENTURE: AdventureProgress = { inspectedGreenhouse: false, completed: [], classifiedEvidence: false };

export function getAdventureStep(mission: MissionSimulationState, progress: AdventureProgress) {
  if (!progress.inspectedGreenhouse) return 'inspect';
  if (!progress.completed.includes('solar')) return 'solar';
  if (!progress.completed.includes('circuit')) return 'circuit';
  const growing = mission.actionHistory.find((action) => action.actionType === 'ACTIVATE_GREENHOUSE');
  if (!growing) return 'grow';
  if (mission.currentTurn <= growing.turn) return 'observe';
  if (!progress.completed.includes('leak')) return 'leak';
  if (!mission.actionHistory.some((action) => action.actionType === 'CONDUCT_RESEARCH')) return 'research';
  if (!progress.classifiedEvidence) return 'evidence';
  return 'complete';
}

export const ADVENTURE_STEPS = {
  inspect: { title: 'Una luz para el invernadero', text: 'Las lámparas de cultivo esperan una conexión. Entra al invernadero para investigar.', hint: 'Busca el módulo de las plantas. También puedes usar el botón «Ir al invernadero».', action: 'Ir al invernadero' },
  solar: { title: 'Atrapa la luz del Sol', text: 'Orienta el panel de práctica para que reciba más luz.', hint: 'Prueba distintos ángulos. La barra sube al acercarte a la orientación correcta.', action: 'Orientar el panel' },
  circuit: { title: 'El camino de la electricidad', text: 'Lleva energía de la batería hasta las lámparas del invernadero.', hint: 'Enciende la batería y las lámparas. Deja apagado el desvío al calentador.', action: 'Conectar las luces' },
  grow: { title: '¿Encendemos el invernadero?', text: 'Las luces están listas. Cultivar dará comida y oxígeno, pero gastará batería.', hint: 'Antes de decidir, compara lo que ganas y lo que gastas. Si falta energía, usa el panel de la base.', action: 'Ver la decisión' },
  observe: { title: 'Espera la próxima cosecha', text: 'Avanza un sol y observa la comida que produce el invernadero.', hint: 'La cosecha añade 5 de comida el próximo sol. La tripulación también come: mira el balance completo.', action: 'Pasar al siguiente sol' },
  leak: { title: 'Un silbido en el hábitat', text: 'Practica cómo encontrar una fuga sin gastar los recursos de tu base.', hint: 'Compara las tres lecturas. Revisa el lugar que pierde presión.', action: 'Buscar la fuga' },
  research: { title: 'La señal de Aurora', text: 'Una baliza antigua señala una muestra. Analízala en el laboratorio.', hint: 'Esta baliza pertenece a nuestra historia inventada. Investigar usa energía, aire y protección.', action: 'Analizar la muestra' },
  evidence: { title: 'Una pista no es una prueba', text: 'Tu muestra ficticia contiene compuestos interesantes. ¿Qué podemos afirmar?', hint: 'Una medición describe lo que observamos. Explicar su origen requiere más pruebas.', action: 'Abrir el cuaderno' },
  complete: { title: '¡Explorador de Aurora!', text: 'Recuperaste las luces, practicaste un rescate y aprendiste a investigar. Ahora cuida la base hasta el final.', hint: 'Consulta las reservas antes de cada sol. Puedes repetir los desafíos en tu cuaderno.', action: 'Ver mis descubrimientos' },
} as const;

export function solarCapture(angle: number) {
  // Target belongs only to this illustrative puzzle, not a prediction for Mars.
  return Math.round(Math.max(0, Math.cos((angle - 60) * Math.PI / 180)) * 100);
}

export const ADVENTURE_SOURCES = {
  plants: 'https://www.nasa.gov/exploration-research-and-technology/growing-plants-in-space/',
  organics: 'https://www.nasa.gov/missions/mars-2020-perseverance/nasas-perseverance-mars-rover-makes-surprising-discoveries/',
};
