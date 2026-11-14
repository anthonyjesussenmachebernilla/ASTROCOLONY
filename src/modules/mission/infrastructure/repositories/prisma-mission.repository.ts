import { Prisma } from '@prisma/client';
import { ConflictError } from '@/lib/errors';
import { prisma } from '@/lib/prisma';
import type {
  MissionRepository,
  PersistedMissionRecord,
} from '@/modules/mission/domain/mission-repository';
import { DEFAULT_SIMULATION_CONFIG } from '@/modules/simulation/domain/resource-rules';
import type {
  ActionExecutionRecord,
  ActionType,
  DeferredEffect,
  MissionSimulationState,
  SpaceEventRecord,
} from '@/modules/simulation/domain/types';

function toJsonValue(value: unknown): Prisma.InputJsonValue {
  return value as Prisma.InputJsonValue;
}

function mapDbToSimulationState(row: {
  id: string;
  scenarioId: string;
  status: 'IN_PROGRESS' | 'VICTORY' | 'DEFEAT';
  currentTurn: number;
  maxTurns: number;
  randomSeed: number;
  engineVersion: string;
  state: {
    energy: number;
    oxygen: number;
    radiationProtection: number;
    food: number;
    science: number;
    crewHealth: number;
    actionsTakenThisTurn: number;
    actionsExecutedIds: Prisma.JsonValue;
    deferredEffects: Prisma.JsonValue;
    activeEvent: Prisma.JsonValue | null;
    outcomeReason: string | null;
    version: number;
  };
  actions: Array<{
    turn: number;
    actionType: string;
    payload: Prisma.JsonValue;
  }>;
  events: Array<{
    turn: number;
    effect: Prisma.JsonValue;
  }>;
}): MissionSimulationState {
  const actionHistory: ActionExecutionRecord[] = row.actions.map((a) => {
    const payload = (a.payload ?? {}) as Partial<ActionExecutionRecord>;
    return {
      turn: a.turn,
      actionType: a.actionType as ActionType,
      title: payload.title ?? a.actionType,
      deltas: payload.deltas ?? {},
      educationalNote: payload.educationalNote ?? '',
      ...(payload.kind === 'RESCUE' ? { kind: 'RESCUE' as const } : {}),
    };
  });

  const eventHistory: SpaceEventRecord[] = row.events.map(
    (e) => e.effect as unknown as SpaceEventRecord,
  );

  return {
    missionId: row.id,
    scenarioId: row.scenarioId,
    status: row.status,
    currentTurn: row.currentTurn,
    maxTurns: row.maxTurns,
    randomSeed: row.randomSeed,
    engineVersion: row.engineVersion,
    resources: {
      energy: row.state.energy,
      oxygen: row.state.oxygen,
      radiationProtection: row.state.radiationProtection,
      food: row.state.food,
      science: row.state.science,
      crewHealth: row.state.crewHealth,
    },
    actionsTakenThisTurn: row.state.actionsTakenThisTurn,
    maxActionsPerTurn: DEFAULT_SIMULATION_CONFIG.maxActionsPerTurn,
    actionsExecutedIdsThisTurn:
      (row.state.actionsExecutedIds as unknown as ActionType[]) ?? [],
    deferredEffects:
      (row.state.deferredEffects as unknown as DeferredEffect[]) ?? [],
    activeEvent: row.state.activeEvent
      ? (row.state.activeEvent as unknown as SpaceEventRecord)
      : null,
    eventHistory,
    actionHistory,
    outcomeReason: row.state.outcomeReason,
  };
}

export class PrismaMissionRepository implements MissionRepository {
  async create(
    state: MissionSimulationState,
    sessionId: string,
  ): Promise<PersistedMissionRecord> {
    const created = await prisma.mission.create({
      data: {
        sessionId,
        status: state.status,
        currentTurn: state.currentTurn,
        maxTurns: state.maxTurns,
        scenarioId: state.scenarioId,
        randomSeed: state.randomSeed,
        engineVersion: state.engineVersion,
        state: {
          create: {
            energy: state.resources.energy,
            oxygen: state.resources.oxygen,
            radiationProtection: state.resources.radiationProtection,
            food: state.resources.food,
            science: state.resources.science,
            crewHealth: state.resources.crewHealth,
            actionsTakenThisTurn: state.actionsTakenThisTurn,
            actionsExecutedIds: toJsonValue(state.actionsExecutedIdsThisTurn),
            deferredEffects: toJsonValue(state.deferredEffects),
            activeEvent: state.activeEvent
              ? toJsonValue(state.activeEvent)
              : Prisma.JsonNull,
            outcomeReason: state.outcomeReason,
            version: 1,
          },
        },
      },
      include: {
        state: true,
        actions: { orderBy: { createdAt: 'asc' } },
        events: { orderBy: { createdAt: 'asc' } },
      },
    });

    if (!created.state) {
      throw new Error('Failed to create MissionState');
    }

    return {
      sessionId: created.sessionId,
      version: created.state.version,
      state: mapDbToSimulationState({ ...created, state: created.state }),
    };
  }

  async findById(missionId: string): Promise<PersistedMissionRecord | null> {
    const row = await prisma.mission.findUnique({
      where: { id: missionId },
      include: {
        state: true,
        actions: { orderBy: { createdAt: 'asc' } },
        events: { orderBy: { createdAt: 'asc' } },
      },
    });

    if (!row || !row.state) {
      return null;
    }

    return {
      sessionId: row.sessionId,
      version: row.state.version,
      state: mapDbToSimulationState({ ...row, state: row.state }),
    };
  }

  async saveActionExecution(params: {
    state: MissionSimulationState;
    expectedVersion: number;
    actionRecord: ActionExecutionRecord;
  }): Promise<PersistedMissionRecord> {
    const { state, expectedVersion, actionRecord } = params;

    return prisma.$transaction(async (tx) => {
      const updatedCount = await tx.missionState.updateMany({
        where: {
          missionId: state.missionId,
          version: expectedVersion,
        },
        data: {
          energy: state.resources.energy,
          oxygen: state.resources.oxygen,
          radiationProtection: state.resources.radiationProtection,
          food: state.resources.food,
          science: state.resources.science,
          crewHealth: state.resources.crewHealth,
          actionsTakenThisTurn: state.actionsTakenThisTurn,
          actionsExecutedIds: toJsonValue(state.actionsExecutedIdsThisTurn),
          deferredEffects: toJsonValue(state.deferredEffects),
          outcomeReason: state.outcomeReason,
          activeEvent: state.activeEvent ? toJsonValue(state.activeEvent) : Prisma.JsonNull,
          version: expectedVersion + 1,
        },
      });

      if (updatedCount.count === 0) {
        throw new ConflictError();
      }

      await tx.mission.update({
        where: { id: state.missionId },
        data: {
          status: state.status,
          currentTurn: state.currentTurn,
          completedAt: state.status !== 'IN_PROGRESS' ? new Date() : null,
        },
      });

      await tx.missionAction.create({
        data: {
          missionId: state.missionId,
          turn: actionRecord.turn,
          actionType: actionRecord.actionType,
          payload: toJsonValue(actionRecord),
          result: toJsonValue(state.resources),
        },
      });

      const reloaded = await tx.mission.findUniqueOrThrow({
        where: { id: state.missionId },
        include: {
          state: true,
          actions: { orderBy: { createdAt: 'asc' } },
          events: { orderBy: { createdAt: 'asc' } },
        },
      });

      if (!reloaded.state) {
        throw new Error('MissionState missing after update');
      }

      return {
        sessionId: reloaded.sessionId,
        version: reloaded.state.version,
        state: mapDbToSimulationState({ ...reloaded, state: reloaded.state }),
      };
    });
  }

  async saveTurnAdvance(params: {
    state: MissionSimulationState;
    expectedVersion: number;
    triggeredEvent: SpaceEventRecord | null;
  }): Promise<PersistedMissionRecord> {
    const { state, expectedVersion, triggeredEvent } = params;

    return prisma.$transaction(async (tx) => {
      const updatedCount = await tx.missionState.updateMany({
        where: {
          missionId: state.missionId,
          version: expectedVersion,
        },
        data: {
          energy: state.resources.energy,
          oxygen: state.resources.oxygen,
          radiationProtection: state.resources.radiationProtection,
          food: state.resources.food,
          science: state.resources.science,
          crewHealth: state.resources.crewHealth,
          actionsTakenThisTurn: state.actionsTakenThisTurn,
          actionsExecutedIds: toJsonValue(state.actionsExecutedIdsThisTurn),
          deferredEffects: toJsonValue(state.deferredEffects),
          activeEvent: state.activeEvent
            ? toJsonValue(state.activeEvent)
            : Prisma.JsonNull,
          outcomeReason: state.outcomeReason,
          version: expectedVersion + 1,
        },
      });

      if (updatedCount.count === 0) {
        throw new ConflictError();
      }

      await tx.mission.update({
        where: { id: state.missionId },
        data: {
          currentTurn: state.currentTurn,
          status: state.status,
          completedAt: state.status !== 'IN_PROGRESS' ? new Date() : null,
        },
      });

      if (triggeredEvent) {
        const spaceEvent = await tx.spaceEvent.upsert({
          where: { externalId: triggeredEvent.scientificReference.externalId },
          update: {
            payload: toJsonValue(triggeredEvent.scientificReference),
            retrievedAt: new Date(),
          },
          create: {
            externalId: triggeredEvent.scientificReference.externalId,
            eventType: triggeredEvent.scientificReference.eventType,
            source: triggeredEvent.scientificReference.source,
            sourceUrl: triggeredEvent.scientificReference.sourceUrl,
            observedAt: new Date(triggeredEvent.scientificReference.observedAt),
            payload: toJsonValue(triggeredEvent.scientificReference),
          },
        });

        await tx.missionEvent.create({
          data: {
            missionId: state.missionId,
            spaceEventId: spaceEvent.id,
            turn: triggeredEvent.turn,
            effect: toJsonValue(triggeredEvent),
          },
        });
      }

      const reloaded = await tx.mission.findUniqueOrThrow({
        where: { id: state.missionId },
        include: {
          state: true,
          actions: { orderBy: { createdAt: 'asc' } },
          events: { orderBy: { createdAt: 'asc' } },
        },
      });

      if (!reloaded.state) {
        throw new Error('MissionState missing after turn advance');
      }

      return {
        sessionId: reloaded.sessionId,
        version: reloaded.state.version,
        state: mapDbToSimulationState({ ...reloaded, state: reloaded.state }),
      };
    });
  }
}
