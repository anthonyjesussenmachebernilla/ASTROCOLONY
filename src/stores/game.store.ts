import { create } from 'zustand';
import type { MissionApiResponseDto } from '@/modules/mission/application/dto/mission.dto';
import { getAstrobotGuidance, type AstrobotMessage } from '@/modules/simulation/domain/astrobot';
import { DEFAULT_SIMULATION_CONFIG } from '@/modules/simulation/domain/resource-rules';
import {
  calculateConsumption,
  calculateProduction,
  createInitialMissionState,
} from '@/modules/simulation/domain/simulation-engine';
import type {
  ActionType,
  BuildingId,
  MissionSimulationState,
  ResourceSnapshot,
} from '@/modules/simulation/domain/types';

export const ACTIVE_MISSION_STORAGE_KEY = 'astrocolony_active_mission_id';
export const MISSION_CHANGED_EVENT = 'astrocolony:mission-changed';
const REDUCED_MOTION_STORAGE_KEY = 'astrocolony_reduced_motion';

interface GameStoreState {
  mission: MissionSimulationState;
  version: number;
  isSyncing: boolean;
  isPersisted: boolean;
  selectedBuilding: BuildingId | null;
  lastError: string | null;
  lastTurnSummary: string[];
  reducedMotion: boolean;
  astrobot: AstrobotMessage;
  projectedProduction: ResourceSnapshot;
  projectedConsumption: ResourceSnapshot;
  hydrateOrStartMission: () => Promise<void>;
  startNewMission: (seed?: number) => Promise<void>;
  selectBuilding: (buildingId: BuildingId | null) => void;
  executeAction: (actionType: ActionType) => Promise<void>;
  nextTurn: () => Promise<void>;
  rescueMission: () => Promise<void>;
  toggleReducedMotion: () => void;
  loadPreferences: () => void;
  clearError: () => void;
}

const placeholderMission = createInitialMissionState({
  missionId: 'bootstrapping',
  randomSeed: 2026,
  config: DEFAULT_SIMULATION_CONFIG,
});

function applyDto(
  dto: MissionApiResponseDto,
  fallbackSummary?: string[],
): Partial<GameStoreState> {
  if (typeof window !== 'undefined') {
    window.localStorage.setItem(ACTIVE_MISSION_STORAGE_KEY, dto.mission.missionId);
    window.dispatchEvent(new Event(MISSION_CHANGED_EVENT));
  }
  return {
    mission: dto.mission,
    version: dto.version,
    isPersisted: true,
    isSyncing: false,
    lastError: null,
    astrobot: dto.astrobot,
    projectedProduction: dto.projectedProduction,
    projectedConsumption: dto.projectedConsumption,
    ...(dto.turnSummary
      ? { lastTurnSummary: dto.turnSummary }
      : fallbackSummary
        ? { lastTurnSummary: fallbackSummary }
        : {}),
  };
}

async function readApiError(response: Response): Promise<string> {
  try {
    const json = (await response.json()) as { error?: { message?: string } };
    return json.error?.message ?? 'Error al comunicarse con el centro de control.';
  } catch {
    return 'Error al comunicarse con el centro de control.';
  }
}

export const useGameStore = create<GameStoreState>((set, get) => ({
  mission: placeholderMission,
  version: 1,
  isSyncing: false,
  isPersisted: false,
  selectedBuilding: 'HABITAT',
  lastError: null,
  lastTurnSummary: [
    'Conectando con el centro de control de Marte...',
  ],
  reducedMotion: false,
  astrobot: getAstrobotGuidance(placeholderMission),
  projectedProduction: calculateProduction(placeholderMission),
  projectedConsumption: calculateConsumption(placeholderMission),

  hydrateOrStartMission: async () => {
    if (get().isPersisted || get().isSyncing) {
      return;
    }
    set({ isSyncing: true, lastError: null });

    const savedId =
      typeof window !== 'undefined'
        ? window.localStorage.getItem(ACTIVE_MISSION_STORAGE_KEY)
        : null;

    if (savedId) {
      try {
        const res = await fetch(`/api/missions/${encodeURIComponent(savedId)}`, {
          method: 'GET',
        });
        if (res.ok) {
          const dto = (await res.json()) as MissionApiResponseDto;
          set(
            applyDto(dto, [
              `Partida recuperada en Sol ${dto.mission.currentTurn} de ${dto.mission.maxTurns}.`,
            ]),
          );
          return;
        }
        set({ isSyncing: false, lastError: 'No se pudo recuperar la partida guardada. Vuelve al inicio para comenzar otra misión.' });
        return;
      } catch {
        set({ isSyncing: false, lastError: 'No se pudo conectar para recuperar la partida guardada.' });
        return;
      }
    }

    await get().startNewMission();
  },

  startNewMission: async (seed) => {
    set({ isSyncing: true, isPersisted: false, lastError: null });
    try {
      const res = await fetch('/api/missions', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(seed ? { randomSeed: seed } : {}),
      });
      if (!res.ok) {
        const msg = await readApiError(res);
        set({ isSyncing: false, lastError: msg });
        return;
      }
      const dto = (await res.json()) as MissionApiResponseDto;
      set({
        ...applyDto(dto),
        selectedBuilding: 'HABITAT',
      });
    } catch {
      set({
        isSyncing: false,
        lastError: 'No se pudo conectar con la base de datos de misiones.',
      });
    }
  },

  selectBuilding: (buildingId) => {
    set({ selectedBuilding: buildingId, lastError: null });
  },

  executeAction: async (actionType) => {
    const { mission, version, isPersisted, isSyncing } = get();
    if (!isPersisted || isSyncing) {
      return;
    }

    set({ isSyncing: true, lastError: null });
    try {
      const res = await fetch(
        `/api/missions/${encodeURIComponent(mission.missionId)}/actions`,
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ actionType, expectedVersion: version }),
        },
      );

      if (!res.ok) {
        const msg = await readApiError(res);
        set({ isSyncing: false, lastError: msg });
        return;
      }

      const dto = (await res.json()) as MissionApiResponseDto;
      set(applyDto(dto));
    } catch {
      set({
        isSyncing: false,
        lastError: 'Error de red al enviar la decisión al servidor.',
      });
    }
  },

  nextTurn: async () => {
    const { mission, version, isPersisted, isSyncing } = get();
    if (!isPersisted || isSyncing) {
      return;
    }

    set({ isSyncing: true, lastError: null });
    try {
      const res = await fetch(
        `/api/missions/${encodeURIComponent(mission.missionId)}/advance`,
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ expectedVersion: version }),
        },
      );

      if (!res.ok) {
        const msg = await readApiError(res);
        set({ isSyncing: false, lastError: msg });
        return;
      }

      const dto = (await res.json()) as MissionApiResponseDto;
      set(applyDto(dto));
    } catch {
      set({
        isSyncing: false,
        lastError: 'Error de red al avanzar al siguiente sol.',
      });
    }
  },

  rescueMission: async () => {
    const { mission, version, isSyncing, isPersisted } = get();
    if (isSyncing || !isPersisted) return;
    set({ isSyncing: true, lastError: null });
    try {
      const response = await fetch(`/api/missions/${encodeURIComponent(mission.missionId)}/rescue`, {
        method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ expectedVersion: version }),
      });
      if (!response.ok) { set({ isSyncing: false, lastError: await readApiError(response) }); return; }
      set(applyDto(await response.json() as MissionApiResponseDto));
    } catch { set({ isSyncing: false, lastError: 'No pudimos enviar el rescate. Revisa la conexión y vuelve a probar.' }); }
  },

  toggleReducedMotion: () => {
    const nextValue = !get().reducedMotion;
    if (typeof window !== 'undefined') {
      window.localStorage.setItem(REDUCED_MOTION_STORAGE_KEY, String(nextValue));
    }
    set({ reducedMotion: nextValue });
  },

  loadPreferences: () => {
    if (typeof window !== 'undefined') {
      set({ reducedMotion: window.localStorage.getItem(REDUCED_MOTION_STORAGE_KEY) === 'true' });
    }
  },

  clearError: () => set({ lastError: null }),
}));
