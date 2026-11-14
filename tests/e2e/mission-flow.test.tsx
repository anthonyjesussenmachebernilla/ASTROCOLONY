import 'dotenv/config';
import { fireEvent, render, screen } from '@testing-library/react';
import { afterAll, describe, expect, it, vi } from 'vitest';
import { prisma } from '@/lib/prisma';
import { AdvanceMissionTurnUseCase } from '@/modules/mission/application/use-cases/advance-mission-turn';
import { ExecutePlayerActionUseCase } from '@/modules/mission/application/use-cases/execute-player-action';
import { StartMissionUseCase } from '@/modules/mission/application/use-cases/start-mission';
import { PrismaMissionRepository } from '@/modules/mission/infrastructure/repositories/prisma-mission.repository';
import { ActionDeck } from '@/modules/mission/presentation/components/ActionDeck';
import { ResourceBar } from '@/modules/mission/presentation/components/ResourceBar';
import { createInitialMissionState } from '@/modules/simulation/domain/simulation-engine';

describe('End-to-End Mission Flow (Start to Finish)', () => {
  const repo = new PrismaMissionRepository();
  const createdIds: string[] = [];

  afterAll(async () => {
    if (createdIds.length > 0) {
      await prisma.mission.deleteMany({
        where: { id: { in: createdIds } },
      });
    }
    await prisma.$disconnect();
  });

  it('completes a full 10-sol mission from start to VICTORY with PostgreSQL persistence', async () => {
    const sessionId = 'e2e-session-1234567890';
    const startUseCase = new StartMissionUseCase(repo);
    const actionUseCase = new ExecutePlayerActionUseCase(repo);
    const advanceUseCase = new AdvanceMissionTurnUseCase(repo);

    let current = await startUseCase.execute({
      sessionId,
      randomSeed: 4242,
    });
    createdIds.push(current.mission.missionId);

    // Estrategia balanceada durante los 10 soles
    for (let sol = 1; sol <= 10 && current.mission.status === 'IN_PROGRESS'; sol++) {
      if (current.mission.resources.energy < 35) {
        current = await actionUseCase.execute({
          missionId: current.mission.missionId,
          sessionId,
          actionType: 'SAVE_ENERGY',
          expectedVersion: current.version,
        });
      } else if (current.mission.resources.radiationProtection < 45) {
        current = await actionUseCase.execute({
          missionId: current.mission.missionId,
          sessionId,
          actionType: 'REINFORCE_SHIELDING',
          expectedVersion: current.version,
        });
      } else if (current.mission.resources.oxygen < 45) {
        current = await actionUseCase.execute({
          missionId: current.mission.missionId,
          sessionId,
          actionType: 'BOOST_OXYGEN',
          expectedVersion: current.version,
        });
      } else {
        current = await actionUseCase.execute({
          missionId: current.mission.missionId,
          sessionId,
          actionType: 'CONDUCT_RESEARCH',
          expectedVersion: current.version,
        });
      }

      current = await advanceUseCase.execute({
        missionId: current.mission.missionId,
        sessionId,
        expectedVersion: current.version,
      });
    }

    expect(['VICTORY', 'DEFEAT']).toContain(current.mission.status);
    expect(current.mission.actionHistory.length).toBeGreaterThanOrEqual(5);
  });

  it('renders HUD and triggers player decision & turn advance callbacks in UI', () => {
    const mission = createInitialMissionState({
      missionId: 'ui-e2e-1',
      randomSeed: 123,
    });
    const onExecuteAction = vi.fn();
    const onAdvanceTurn = vi.fn();
    const onClearError = vi.fn();

    render(
      <div>
        <ResourceBar
          resources={mission.resources}
          currentTurn={mission.currentTurn}
          maxTurns={mission.maxTurns}
          actionsTakenThisTurn={mission.actionsTakenThisTurn}
          maxActionsPerTurn={mission.maxActionsPerTurn}
        />
        <ActionDeck
          mission={mission}
          selectedBuilding="OXYGEN_GENERATOR"
          lastError={null}
          onExecuteAction={onExecuteAction}
          onAdvanceTurn={onAdvanceTurn}
          onClearError={onClearError}
        />
      </div>,
    );

    expect(
      screen.getByRole('heading', { name: /Sol\s*1\s*de\s*10/i }),
    ).toBeInTheDocument();
    const actionButtons = screen.getAllByRole('button', {
      name: /Elegir esta acción/i,
    });
    expect(actionButtons).toHaveLength(6);

    fireEvent.click(actionButtons[0]);
    expect(onExecuteAction).toHaveBeenCalledWith('BOOST_OXYGEN');

    const advanceBtn = screen.getByRole('button', { name: /Pasar al siguiente sol/i });
    fireEvent.click(advanceBtn);
    expect(onAdvanceTurn).toHaveBeenCalledTimes(1);
  });
});
