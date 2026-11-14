import { randomInt } from 'node:crypto';
import type { MissionRepository } from '@/modules/mission/domain/mission-repository';
import { getAstrobotGuidance } from '@/modules/simulation/domain/astrobot';
import { DEFAULT_SIMULATION_CONFIG } from '@/modules/simulation/domain/resource-rules';
import {
  calculateConsumption,
  calculateProduction,
  createInitialMissionState,
} from '@/modules/simulation/domain/simulation-engine';
import type { MissionApiResponseDto } from '../dto/mission.dto';

export class StartMissionUseCase {
  constructor(private readonly missionRepo: MissionRepository) {}

  async execute(params: {
    sessionId: string;
    scenarioId?: string;
    randomSeed?: number;
  }): Promise<MissionApiResponseDto> {
    const seed = params.randomSeed ?? randomInt(1000, 999999);
    const initialState = createInitialMissionState({
      missionId: 'pending',
      scenarioId: params.scenarioId ?? 'mars-jezero-outpost',
      randomSeed: seed,
      config: DEFAULT_SIMULATION_CONFIG,
    });

    const persisted = await this.missionRepo.create(initialState, params.sessionId);

    return {
      mission: persisted.state,
      version: persisted.version,
      astrobot: getAstrobotGuidance(persisted.state),
      projectedProduction: calculateProduction(persisted.state),
      projectedConsumption: calculateConsumption(persisted.state),
      turnSummary: [
        `Misión iniciada en el Cráter Jezero (Semilla #${seed}). Tienes 10 soles para mantener viva la colonia.`,
      ],
    };
  }
}
