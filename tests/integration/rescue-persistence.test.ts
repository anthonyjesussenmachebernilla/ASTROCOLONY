// @vitest-environment node
import 'dotenv/config';
import { afterAll, describe, expect, it } from 'vitest';
import { prisma } from '@/lib/prisma';
import { ValidationError } from '@/lib/errors';
import { RescueMissionUseCase } from '@/modules/mission/application/use-cases/rescue-mission';
import { PrismaMissionRepository } from '@/modules/mission/infrastructure/repositories/prisma-mission.repository';
import { createInitialMissionState } from '@/modules/simulation/domain/simulation-engine';

describe('rescate guardado en PostgreSQL', () => {
  const repo = new PrismaMissionRepository();
  const created: string[] = [];
  afterAll(async () => { if (created.length) await prisma.mission.deleteMany({ where: { id: { in: created } } }); await prisma.$disconnect(); });
  it('persists the rescued state and its one-use marker after reloading', async () => {
    const state = createInitialMissionState({ missionId: 'test-placeholder', randomSeed: 42 });
    state.status = 'DEFEAT'; state.resources.oxygen = 0; state.currentTurn = 6;
    state.outcomeReason = 'Fallo de prueba: sin aire';
    const started = await repo.create(state, 'rescue-integration-session');
    created.push(started.state.missionId);
    const useCase = new RescueMissionUseCase(repo);
    await useCase.execute({ missionId: started.state.missionId, sessionId: started.sessionId, expectedVersion: started.version });
    const reloaded = await repo.findById(started.state.missionId);
    expect(reloaded?.state.status).toBe('IN_PROGRESS'); expect(reloaded?.state.resources.oxygen).toBe(45);
    expect(reloaded?.state.currentTurn).toBe(6); expect(reloaded?.state.actionHistory.at(-1)?.kind).toBe('RESCUE');
    const failedAgain = await repo.saveActionExecution({ state: { ...reloaded!.state, status: 'DEFEAT', resources: { ...reloaded!.state.resources, oxygen: 0 } }, expectedVersion: reloaded!.version, actionRecord: { turn: 6, actionType: 'REPAIR_SYSTEMS', title: 'Fallo de prueba', educationalNote: '', deltas: { oxygen: -45 } } });
    await expect(useCase.execute({ missionId: started.state.missionId, sessionId: started.sessionId, expectedVersion: failedAgain.version })).rejects.toBeInstanceOf(ValidationError);
  });
});
