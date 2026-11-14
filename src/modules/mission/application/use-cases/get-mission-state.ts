import { ForbiddenError, NotFoundError } from '@/lib/errors';
import type { MissionRepository } from '@/modules/mission/domain/mission-repository';
import { getAstrobotGuidance } from '@/modules/simulation/domain/astrobot';
import {
  calculateConsumption,
  calculateProduction,
} from '@/modules/simulation/domain/simulation-engine';
import type { MissionApiResponseDto } from '../dto/mission.dto';

export class GetMissionStateUseCase {
  constructor(private readonly missionRepo: MissionRepository) {}

  async execute(params: {
    missionId: string;
    sessionId: string;
  }): Promise<MissionApiResponseDto> {
    const record = await this.missionRepo.findById(params.missionId);
    if (!record) {
      throw new NotFoundError('No se encontró la misión solicitada.');
    }
    if (record.sessionId !== params.sessionId) {
      throw new ForbiddenError('Esta misión pertenece a otra sesión anónima.');
    }

    return {
      mission: record.state,
      version: record.version,
      astrobot: getAstrobotGuidance(record.state),
      projectedProduction: calculateProduction(record.state),
      projectedConsumption: calculateConsumption(record.state),
    };
  }
}
