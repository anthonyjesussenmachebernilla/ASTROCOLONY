import type {
  ActionExecutionRecord,
  MissionSimulationState,
  SpaceEventRecord,
} from '@/modules/simulation/domain/types';

export interface PersistedMissionRecord {
  state: MissionSimulationState;
  version: number;
  sessionId: string;
}

export interface MissionRepository {
  create(state: MissionSimulationState, sessionId: string): Promise<PersistedMissionRecord>;
  findById(missionId: string): Promise<PersistedMissionRecord | null>;
  saveActionExecution(params: {
    state: MissionSimulationState;
    expectedVersion: number;
    actionRecord: ActionExecutionRecord;
  }): Promise<PersistedMissionRecord>;
  saveTurnAdvance(params: {
    state: MissionSimulationState;
    expectedVersion: number;
    triggeredEvent: SpaceEventRecord | null;
  }): Promise<PersistedMissionRecord>;
}
