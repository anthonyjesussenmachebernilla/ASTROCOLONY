import { describe, expect, it, vi } from 'vitest';
import { ConflictError, ForbiddenError, ValidationError } from '@/lib/errors';
import { RescueMissionUseCase } from '@/modules/mission/application/use-cases/rescue-mission';
import type { MissionRepository, PersistedMissionRecord } from '@/modules/mission/domain/mission-repository';
import { createInitialMissionState } from '@/modules/simulation/domain/simulation-engine';

function setup() {
  const state = createInitialMissionState({ missionId: 'rescue-test', randomSeed: 42 });
  state.status = 'DEFEAT'; state.resources.oxygen = 0; state.resources.energy = 10; state.currentTurn = 11;
  state.outcomeReason = 'Sin oxígeno';
  let record: PersistedMissionRecord = { state, version: 4, sessionId: 'owner' };
  const repo: MissionRepository = {
    create: vi.fn(), findById: vi.fn(async () => record), saveTurnAdvance: vi.fn(),
    saveActionExecution: vi.fn(async (params) => { record = { ...record, state: params.state, version: params.expectedVersion + 1 }; return record; }),
  };
  return { repo, state, useCase: new RescueMissionUseCase(repo) };
}
describe('rescate educativo', () => {
  it('restores a failed mission without losing its ID, science or history; rescue is recorded', async () => {
    const { useCase, state } = setup();
    const result = await useCase.execute({ missionId: state.missionId, sessionId: 'owner', expectedVersion: 4 });
    expect(result.mission.missionId).toBe('rescue-test'); expect(result.mission.status).toBe('IN_PROGRESS');
    expect(result.mission.currentTurn).toBe(10); expect(result.mission.resources.oxygen).toBe(45);
    expect(result.mission.resources.science).toBe(state.resources.science); expect(result.mission.resources.crewHealth).toBe(100);
    expect(result.mission.actionHistory.at(-1)?.kind).toBe('RESCUE'); expect(result.version).toBe(5);
  });
  it('rejects another session and stale versions without writing', async () => {
    const { useCase, repo } = setup();
    await expect(useCase.execute({ missionId: 'rescue-test', sessionId: 'other', expectedVersion: 4 })).rejects.toBeInstanceOf(ForbiddenError);
    await expect(useCase.execute({ missionId: 'rescue-test', sessionId: 'owner', expectedVersion: 3 })).rejects.toBeInstanceOf(ConflictError);
    expect(repo.saveActionExecution).not.toHaveBeenCalled();
  });
  it('cannot rescue a victory or use emergency supplies twice', async () => {
    const { useCase, state, repo } = setup(); state.status = 'VICTORY';
    await expect(useCase.execute({ missionId: 'rescue-test', sessionId: 'owner', expectedVersion: 4 })).rejects.toBeInstanceOf(ValidationError);
    state.status = 'DEFEAT'; state.actionHistory.push({ kind: 'RESCUE', turn: 2, title: 'Rescate', actionType: 'REPAIR_SYSTEMS', deltas: {}, educationalNote: '' });
    await expect(useCase.execute({ missionId: 'rescue-test', sessionId: 'owner', expectedVersion: 4 })).rejects.toBeInstanceOf(ValidationError);
    expect(repo.saveActionExecution).not.toHaveBeenCalled();
  });
});
