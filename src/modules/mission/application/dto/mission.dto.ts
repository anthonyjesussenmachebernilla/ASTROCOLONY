import { z } from 'zod';
import type { AstrobotMessage } from '@/modules/simulation/domain/astrobot';
import type {
  MissionSimulationState,
  ResourceSnapshot,
} from '@/modules/simulation/domain/types';

export const StartMissionSchema = z.object({
  scenarioId: z.string().min(1).max(64).default('mars-jezero-outpost'),
  randomSeed: z.number().int().min(1).max(2147483647).optional(),
});

export const ExecuteActionSchema = z.object({
  actionType: z.enum([
    'BOOST_OXYGEN',
    'SAVE_ENERGY',
    'REINFORCE_SHIELDING',
    'ACTIVATE_GREENHOUSE',
    'CONDUCT_RESEARCH',
    'REPAIR_SYSTEMS',
  ]),
  expectedVersion: z.number().int().min(1).optional(),
});

export const AdvanceTurnSchema = z.object({
  expectedVersion: z.number().int().min(1).optional(),
});

export interface MissionApiResponseDto {
  mission: MissionSimulationState;
  version: number;
  astrobot: AstrobotMessage;
  projectedProduction: ResourceSnapshot;
  projectedConsumption: ResourceSnapshot;
  turnSummary?: string[];
}
