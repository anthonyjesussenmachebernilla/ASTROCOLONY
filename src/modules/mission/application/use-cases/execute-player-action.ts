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
  applyPlayerAction,
  calculateConsumption,
  calculateProduction,
} from '@/modules/simulation/domain/simulation-engine';
import type { ActionType } from '@/modules/simulation/domain/types';
import type { MissionApiResponseDto } from '../dto/mission.dto';

export class ExecutePlayerActionUseCase {
  constructor(private readonly missionRepo: MissionRepository) {}

  async execute(params: {
    missionId: string;
    sessionId: string;
    actionType: ActionType;
    expectedVersion?: number;
  }): Promise<MissionApiResponseDto> {
    const record = await this.missionRepo.findById(params.missionId);
    if (!record) {
      throw new NotFoundError('No se encontró la misión solicitada.');
    }
    if (record.sessionId !== params.sessionId) {
      throw new ForbiddenError('No tienes permiso para modificar esta misión.');
    }
    if (
      params.expectedVersion !== undefined &&
      params.expectedVersion !== record.version
    ) {
      throw new ConflictError();
    }

    const result = applyPlayerAction(
      record.state,
      params.actionType,
      DEFAULT_SIMULATION_CONFIG,
    );

    if (!result.applied || !result.record) {
      throw new ValidationError(
        result.reason ?? 'No se pudo ejecutar la decisión solicitada.',
      );
    }

    const updated = await this.missionRepo.saveActionExecution({
      state: result.state,
      expectedVersion: record.version,
      actionRecord: result.record,
    });

    return {
      mission: updated.state,
      version: updated.version,
      astrobot: getAstrobotGuidance(updated.state),
      projectedProduction: calculateProduction(updated.state),
      projectedConsumption: calculateConsumption(updated.state),
    };
  }
}
