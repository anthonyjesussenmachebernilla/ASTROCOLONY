import { ConflictError, ForbiddenError, NotFoundError, ValidationError } from '@/lib/errors';
import type { MissionRepository } from '@/modules/mission/domain/mission-repository';
import { getAstrobotGuidance } from '@/modules/simulation/domain/astrobot';
import { calculateConsumption, calculateProduction } from '@/modules/simulation/domain/simulation-engine';
import type { ActionExecutionRecord, ResourceSnapshot } from '@/modules/simulation/domain/types';
import type { MissionApiResponseDto } from '../dto/mission.dto';

/** One educational emergency supply per mission. Recorded with the other decisions. */
export class RescueMissionUseCase {
  constructor(private readonly repo: MissionRepository) {}
  async execute(params: { missionId: string; sessionId: string; expectedVersion: number }): Promise<MissionApiResponseDto> {
    const record = await this.repo.findById(params.missionId);
    if (!record) throw new NotFoundError();
    if (record.sessionId !== params.sessionId) throw new ForbiddenError();
    if (record.version !== params.expectedVersion) throw new ConflictError();
    if (record.state.status !== 'DEFEAT') throw new ValidationError('El rescate se usa cuando la colonia necesita otro plan.');
    if (record.state.actionHistory.some((action) => action.kind === 'RESCUE')) throw new ValidationError('Ya usamos el rescate de esta misión. Puedes volver a intentarlo con otra estrategia.');
    const resources = { ...record.state.resources };
    const deltas: Partial<ResourceSnapshot> = {};
    for (const key of ['energy', 'oxygen', 'food', 'radiationProtection', 'crewHealth'] as const) {
      resources[key] = Math.max(resources[key], key === 'crewHealth' ? 70 : 45);
      deltas[key] = resources[key] - record.state.resources[key];
    }
    const turn = Math.min(record.state.currentTurn, record.state.maxTurns);
    const actionRecord: ActionExecutionRecord = { kind: 'RESCUE', turn, actionType: 'REPAIR_SYSTEMS', title: 'Rescate de Aurora', deltas, educationalNote: 'Ayuda educativa: suministros de emergencia inventados para probar otra estrategia. Una vez por misión.' };
    const updated = await this.repo.saveActionExecution({
      expectedVersion: record.version,
      actionRecord,
      state: { ...record.state, currentTurn: turn, status: 'IN_PROGRESS', resources, outcomeReason: null, activeEvent: null, deferredEffects: [], actionsTakenThisTurn: 0, actionsExecutedIdsThisTurn: [], actionHistory: [...record.state.actionHistory, actionRecord] },
    });
    return { mission: updated.state, version: updated.version, astrobot: getAstrobotGuidance(updated.state), projectedProduction: calculateProduction(updated.state), projectedConsumption: calculateConsumption(updated.state), turnSummary: ['¡La tripulación está a salvo! Llegaron suministros educativos de emergencia.', 'Revisa las reservas y prueba otra estrategia. Conservaste tus descubrimientos.'] };
  }
}
