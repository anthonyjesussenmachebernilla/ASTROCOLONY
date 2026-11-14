import {
  ConflictError,
  ForbiddenError,
  NotFoundError,
  ValidationError,
} from '@/lib/errors';
import type { MissionRepository } from '@/modules/mission/domain/mission-repository';
import { getAstrobotGuidance } from '@/modules/simulation/domain/astrobot';
import { DEFAULT_SIMULATION_CONFIG } from '@/modules/simulation/domain/resource-rules';
import {
  calculateConsumption,
  calculateProduction,
} from '@/modules/simulation/domain/simulation-engine';
import { advanceTurn } from '@/modules/simulation/domain/turn-resolver';
import type {
  ScientificReference,
  SpaceEventType,
} from '@/modules/simulation/domain/types';
import type { MissionApiResponseDto } from '../dto/mission.dto';

export interface ScientificScenarioProvider {
  getSolarEventReference(): Promise<ScientificReference | null>;
}

export class AdvanceMissionTurnUseCase {
  constructor(
    private readonly missionRepo: MissionRepository,
    private readonly scientificProvider?: ScientificScenarioProvider,
  ) {}

  async execute(params: {
    missionId: string;
    sessionId: string;
    expectedVersion?: number;
  }): Promise<MissionApiResponseDto> {
    const record = await this.missionRepo.findById(params.missionId);
    if (!record) {
      throw new NotFoundError('No se encontró la misión solicitada.');
    }
    if (record.sessionId !== params.sessionId) {
      throw new ForbiddenError('No tienes permiso para avanzar esta misión.');
    }
    if (
      params.expectedVersion !== undefined &&
      params.expectedVersion !== record.version
    ) {
      throw new ConflictError();
    }
    if (record.state.status !== 'IN_PROGRESS') {
      throw new ValidationError(
        'La misión ya terminó. Inicia una nueva misión para continuar.',
      );
    }

    let overrides: Partial<Record<SpaceEventType, ScientificReference>> | undefined;
    if (this.scientificProvider) {
      const solarRef = await this.scientificProvider
        .getSolarEventReference()
        .catch(() => null);
      if (solarRef) {
        overrides = { SOLAR_EVENT: solarRef };
      }
    }

    const advanced = advanceTurn(
      record.state,
      DEFAULT_SIMULATION_CONFIG,
      overrides,
    );

    const updated = await this.missionRepo.saveTurnAdvance({
      state: advanced.state,
      expectedVersion: record.version,
      triggeredEvent: advanced.triggeredEvent,
    });

    return {
      mission: updated.state,
      version: updated.version,
      astrobot: getAstrobotGuidance(updated.state),
      projectedProduction: calculateProduction(updated.state),
      projectedConsumption: calculateConsumption(updated.state),
      turnSummary: advanced.turnSummary,
    };
  }
}
