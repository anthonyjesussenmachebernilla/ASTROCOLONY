import { describe, expect, it } from 'vitest';
import { getAstrobotGuidance } from '@/modules/simulation/domain/astrobot';
import { resolveSpaceEvent } from '@/modules/simulation/domain/event-resolver';
import { DEFAULT_SIMULATION_CONFIG } from '@/modules/simulation/domain/resource-rules';
import {
  applyPlayerAction,
  calculateConsumption,
  calculateProduction,
  createInitialMissionState,
  evaluateMissionStatus,
} from '@/modules/simulation/domain/simulation-engine';
import { advanceTurn } from '@/modules/simulation/domain/turn-resolver';
import type { SpaceEventRecord } from '@/modules/simulation/domain/types';

describe('AstroColony Simulation Engine (Domain Layer)', () => {
  it('creates a valid initial state for Sol 1 with 10 max turns', () => {
    const state = createInitialMissionState({
      missionId: 'mission-1',
      randomSeed: 42,
    });

    expect(state.status).toBe('IN_PROGRESS');
    expect(state.currentTurn).toBe(1);
    expect(state.maxTurns).toBe(10);
    expect(state.resources.energy).toBe(70);
    expect(state.resources.oxygen).toBe(75);
    expect(state.resources.radiationProtection).toBe(65);
    expect(state.resources.crewHealth).toBe(100);
  });

  it('applies player action with explicit benefits, immediate costs, and deferred effects', () => {
    const initial = createInitialMissionState({
      missionId: 'mission-2',
      randomSeed: 100,
    });

    const result = applyPlayerAction(initial, 'BOOST_OXYGEN');
    expect(result.applied).toBe(true);
    expect(result.state.resources.oxygen).toBe(93); // 75 + 18
    expect(result.state.resources.energy).toBe(56); // 70 - 14
    expect(result.state.actionsTakenThisTurn).toBe(1);
    expect(result.state.deferredEffects).toHaveLength(1);
    expect(result.state.deferredEffects[0].triggerTurn).toBe(2);
    expect(result.state.deferredEffects[0].deltas.energy).toBe(-4);
  });

  it('prevents more than maxActionsPerTurn (2) decisions in the same sol', () => {
    let state = createInitialMissionState({
      missionId: 'mission-3',
      randomSeed: 7,
    });

    const first = applyPlayerAction(state, 'ACTIVATE_GREENHOUSE');
    expect(first.applied).toBe(true);
    state = first.state;

    const second = applyPlayerAction(state, 'REINFORCE_SHIELDING');
    expect(second.applied).toBe(true);
    state = second.state;

    const third = applyPlayerAction(state, 'CONDUCT_RESEARCH');
    expect(third.applied).toBe(false);
    expect(third.reason).toContain('2 decisiones');
  });

  it('prevents actions when required resources are insufficient (no negative resources)', () => {
    const state = createInitialMissionState({
      missionId: 'mission-4',
      randomSeed: 7,
    });
    state.resources.energy = 8;

    const result = applyPlayerAction(state, 'BOOST_OXYGEN');
    expect(result.applied).toBe(false);
    expect(result.reason).toContain('Energía');
    expect(result.state.resources.energy).toBe(8);
  });

  it('reduces solar production during a dust storm', () => {
    const state = createInitialMissionState({
      missionId: 'mission-5',
      randomSeed: 12,
    });

    const normalProd = calculateProduction(state);
    expect(normalProd.energy).toBe(14);

    const dustStorm: SpaceEventRecord = {
      id: 'evt-dust',
      type: 'DUST_STORM',
      title: 'Tormenta de polvo',
      kidSummary: 'Polvo en el cielo',
      engineeringLesson: 'Menos luz solar',
      turn: 2,
      deltas: { energy: -14 },
      scientificReference: {
        externalId: 'MARS-DUST',
        source: 'NASA Mars Trek',
        observedAt: '2018-06-10T00:00:00Z',
        eventType: 'Dust Storm',
        description: 'Dust storm test',
        sourceUrl: 'https://trek.nasa.gov/mars/',
        isHistorical: true,
      },
    };

    const stormState = resolveSpaceEvent(state, dustStorm, DEFAULT_SIMULATION_CONFIG);
    const stormProd = calculateProduction(stormState);
    expect(stormProd.energy).toBe(7);
  });

  it('penalizes crewHealth on SOLAR_EVENT only if radiationProtection falls below threshold', () => {
    const strongShieldState = createInitialMissionState({
      missionId: 'mission-6a',
      randomSeed: 1,
    });
    strongShieldState.resources.radiationProtection = 80;

    const weakShieldState = createInitialMissionState({
      missionId: 'mission-6b',
      randomSeed: 1,
    });
    weakShieldState.resources.radiationProtection = 40;

    const solarEvent: SpaceEventRecord = {
      id: 'evt-solar',
      type: 'SOLAR_EVENT',
      title: 'Tormenta solar',
      kidSummary: 'Partículas solares',
      engineeringLesson: 'Protección necesaria',
      turn: 2,
      deltas: { radiationProtection: -18, energy: -6 },
      scientificReference: {
        externalId: 'DONKI-TEST',
        source: 'NASA DONKI',
        observedAt: '2024-05-14T16:51:00Z',
        eventType: 'Solar Flare',
        description: 'Flare test',
        sourceUrl: 'https://ccmc.gsfc.nasa.gov/tools/DONKI/',
        isHistorical: true,
      },
    };

    const afterStrong = resolveSpaceEvent(
      strongShieldState,
      solarEvent,
      DEFAULT_SIMULATION_CONFIG,
    );
    expect(afterStrong.resources.radiationProtection).toBe(62);
    expect(afterStrong.resources.crewHealth).toBe(100);

    const afterWeak = resolveSpaceEvent(
      weakShieldState,
      solarEvent,
      DEFAULT_SIMULATION_CONFIG,
    );
    expect(afterWeak.resources.radiationProtection).toBe(22);
    expect(afterWeak.resources.crewHealth).toBe(88);
  });

  it('is 100% deterministic for the same seed and action sequence', () => {
    const runSimulation = (seed: number) => {
      let s = createInitialMissionState({ missionId: 'det', randomSeed: seed });
      for (let i = 0; i < 4; i++) {
        s = applyPlayerAction(s, 'ACTIVATE_GREENHOUSE').state;
        s = applyPlayerAction(s, 'REINFORCE_SHIELDING').state;
        s = advanceTurn(s).state;
      }
      return s;
    };

    const runA = runSimulation(2026);
    const runB = runSimulation(2026);

    expect(runA.resources).toEqual(runB.resources);
    expect(runA.eventHistory).toEqual(runB.eventHistory);
    expect(runA.currentTurn).toBe(runB.currentTurn);
  });

  it('detects defeat when energy or oxygen reaches 0', () => {
    const state = createInitialMissionState({
      missionId: 'mission-defeat',
      randomSeed: 9,
    });
    state.resources.oxygen = 0;

    const evaluated = evaluateMissionStatus(state);
    expect(evaluated.status).toBe('DEFEAT');
    expect(evaluated.outcomeReason).toContain('oxígeno');
  });

  it('detects victory after surviving 10 turns', () => {
    const state = createInitialMissionState({
      missionId: 'mission-victory',
      randomSeed: 9,
    });
    state.currentTurn = 10;
    state.resources.science = 55;

    const advanced = advanceTurn(state);
    expect(advanced.state.status).toBe('VICTORY');
    expect(advanced.state.outcomeReason).toContain('sobresaliente');
  });

  it('increases crewHealth consumption when food is 0', () => {
    const state = createInitialMissionState({
      missionId: 'mission-food',
      randomSeed: 9,
    });
    state.resources.food = 0;
    const consumption = calculateConsumption(state);
    expect(consumption.crewHealth).toBeGreaterThan(0);
  });

  it('provides contextual ASTROBOT alerts when energy is low', () => {
    const state = createInitialMissionState({
      missionId: 'mission-bot',
      randomSeed: 5,
    });
    state.resources.energy = 20;
    const guidance = getAstrobotGuidance(state);
    expect(guidance.mood).toBe('alert');
    expect(guidance.title).toContain('electricidad');
  });
});
