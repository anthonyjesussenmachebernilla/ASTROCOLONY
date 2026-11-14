import 'dotenv/config';
import { afterAll, describe, expect, it } from 'vitest';
import { ConflictError, ForbiddenError } from '@/lib/errors';
import { prisma } from '@/lib/prisma';
import { AdvanceMissionTurnUseCase } from '@/modules/mission/application/use-cases/advance-mission-turn';
import { ExecutePlayerActionUseCase } from '@/modules/mission/application/use-cases/execute-player-action';
import { GetMissionStateUseCase } from '@/modules/mission/application/use-cases/get-mission-state';
import { StartMissionUseCase } from '@/modules/mission/application/use-cases/start-mission';
import { PrismaMissionRepository } from '@/modules/mission/infrastructure/repositories/prisma-mission.repository';
import {
  HISTORICAL_DONKI_FALLBACK,
  NasaDonkiService,
} from '@/modules/nasa/infrastructure/nasa-donki.service';

describe('Mission Use Cases & PostgreSQL Persistence (Integration)', () => {
  const repo = new PrismaMissionRepository();
  const createdMissionIds: string[] = [];

  afterAll(async () => {
    if (createdMissionIds.length > 0) {
      await prisma.mission.deleteMany({
        where: { id: { in: createdMissionIds } },
      });
    }
    await prisma.$disconnect();
  });

  it('persists a mission, executes actions, advances turns, and recovers state', async () => {
    const sessionId = 'test-session-1234567890';
    const startUseCase = new StartMissionUseCase(repo);
    const getUseCase = new GetMissionStateUseCase(repo);
    const actionUseCase = new ExecutePlayerActionUseCase(repo);
    const advanceUseCase = new AdvanceMissionTurnUseCase(repo);

    const started = await startUseCase.execute({
      sessionId,
      randomSeed: 2026,
    });
    createdMissionIds.push(started.mission.missionId);

    expect(started.mission.currentTurn).toBe(1);
    expect(started.version).toBe(1);

    const afterAction = await actionUseCase.execute({
      missionId: started.mission.missionId,
      sessionId,
      actionType: 'BOOST_OXYGEN',
      expectedVersion: started.version,
    });

    expect(afterAction.version).toBe(2);
    expect(afterAction.mission.resources.oxygen).toBe(93);
    expect(afterAction.mission.resources.energy).toBe(56);

    const afterAdvance = await advanceUseCase.execute({
      missionId: started.mission.missionId,
      sessionId,
      expectedVersion: afterAction.version,
    });

    expect(afterAdvance.version).toBe(3);
    expect(afterAdvance.mission.currentTurn).toBe(2);

    const recovered = await getUseCase.execute({
      missionId: started.mission.missionId,
      sessionId,
    });

    expect(recovered.mission.currentTurn).toBe(2);
    expect(recovered.mission.actionHistory).toHaveLength(1);
  });

  it('rejects concurrent/duplicate turn advances with ConflictError', async () => {
    const sessionId = 'test-session-conflict-1234';
    const startUseCase = new StartMissionUseCase(repo);
    const advanceUseCase = new AdvanceMissionTurnUseCase(repo);

    const started = await startUseCase.execute({
      sessionId,
      randomSeed: 99,
    });
    createdMissionIds.push(started.mission.missionId);

    await advanceUseCase.execute({
      missionId: started.mission.missionId,
      sessionId,
      expectedVersion: 1,
    });

    await expect(
      advanceUseCase.execute({
        missionId: started.mission.missionId,
        sessionId,
        expectedVersion: 1,
      }),
    ).rejects.toThrow(ConflictError);
  });

  it('blocks access from another anonymous session with ForbiddenError', async () => {
    const startUseCase = new StartMissionUseCase(repo);
    const getUseCase = new GetMissionStateUseCase(repo);

    const started = await startUseCase.execute({
      sessionId: 'owner-session-12345678',
      randomSeed: 77,
    });
    createdMissionIds.push(started.mission.missionId);

    await expect(
      getUseCase.execute({
        missionId: started.mission.missionId,
        sessionId: 'intruder-session-12345678',
      }),
    ).rejects.toThrow(ForbiddenError);
  });

  it('falls back to historical NASA DONKI records when network fails', async () => {
    const originalFetch = globalThis.fetch;
    globalThis.fetch = (async () => {
      throw new Error('Network offline');
    }) as typeof fetch;

    try {
      const service = new NasaDonkiService();
      const events = await service.getNormalizedSolarEvents();
      expect(events.length).toBeGreaterThan(0);
      expect(events[0].externalId).toBe(HISTORICAL_DONKI_FALLBACK[0].externalId);
      expect(events[0].isHistorical).toBe(true);
    } finally {
      globalThis.fetch = originalFetch;
    }
  });
});
