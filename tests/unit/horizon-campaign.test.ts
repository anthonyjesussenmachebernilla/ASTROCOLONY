import { describe, expect, it } from 'vitest';
import { loadCampaign, type Resources } from '../helpers/horizon-campaign';

const initialResources = (): Resources => ({ energy: 62, oxygen: 78, food: 54, shield: 68 });

describe('ten-sol HORIZONTE campaign', () => {
  it('requires completing an objective, then explicitly ending the sol, without repeating rewards', () => {
    const api = loadCampaign(), start = api.initial(), resources = initialResources();
    expect(api.advance(start, resources)).toBeNull();
    expect(api.resolve(start, 'repair', resources)).toBeNull();
    const solved = api.resolve(start, 'inspect', resources)!;
    expect(solved.state.sol).toBe(1);
    expect(api.resolve(solved.state, 'inspect', solved.resources)).toBeNull();
    const next = api.advance(solved.state, solved.resources);
    if (!next || next.blocked) throw Error('Expected the second tutorial sol');
    expect(next.state.sol).toBe(2);
    expect(next.reward).toBe(25);
    expect(next.resources.energy).toBe(67);
    expect(api.advance(next.state, next.resources)).toBeNull();
    expect(api.retry(solved.state)?.resources).toEqual(resources);
  });

  it('can finish all 256 decision paths, offering documented help if resources would run out', () => {
    const api = loadCampaign();
    for (let path = 0; path < 256; path++) {
      let state = api.initial(), resources = initialResources(), coins = 0;
      for (let sol = 1; sol <= 10; sol++) {
        const option = api.days[sol - 1].choices[sol <= 2 ? 0 : (path >> (sol - 3)) & 1];
        let solved = api.resolve(state, option.id, resources)!;
        let next = api.advance(solved.state, solved.resources);
        if (next?.blocked) {
          const assistance = api.assist(solved.state, solved.resources)!;
          expect(api.assist(assistance.state, assistance.resources)).toBeNull();
          solved = api.resolve(assistance.state, option.id, assistance.resources)!;
          next = api.advance(solved.state, solved.resources);
        }
        if (!next || next.blocked) throw Error(`Blocked path ${path}, sol ${sol}`);
        state = api.restore(JSON.parse(JSON.stringify(next.state)))!;
        expect(state).not.toBeNull();
        resources = next.resources; coins += next.reward;
        expect(Object.values(resources).every(value => value > 0 && value <= 100)).toBe(true);
      }
      expect(state.finished).toBe(true);
      expect(state.sol).toBe(10);
      expect(state.history).toHaveLength(10);
      expect(state.history.filter(entry => api.days[entry.sol - 1].clue)).toHaveLength(3);
      expect(coins).toBe(api.coinTotal);
      expect(api.advance(state, resources)).toBeNull();
      expect(api.resolve(state, 'protect', resources)).toBeNull();
    }
  });

  it('preserves pending decisions and rejects impossible or damaged saved progress', () => {
    const api = loadCampaign(), solved = api.resolve(api.initial(), 'inspect', initialResources())!;
    expect(api.restore(JSON.parse(JSON.stringify(solved.state)))).toEqual(solved.state);
    expect(api.restore({ ...solved.state, sol: 11 })).toBeNull();
    expect(api.restore({ ...solved.state, sol: 3 })).toBeNull();
    expect(api.restore({ ...solved.state, pending: null })).toBeNull();
    expect(api.restore({ ...solved.state, assistedSols: [1, 1] })).toBeNull();
    expect(api.restore({ ...solved.state, finished: true })).toBeNull();
  });

  it('migrates each old mission stage without replaying already-rewarded tutorial days', () => {
    const api = loadCampaign();
    for (let step = 0; step <= 3; step++) {
      const migrated = api.migrate(step, initialResources())!;
      expect(migrated.sol).toBe(step + 1);
      expect(migrated.completed).toBe(false);
      expect(migrated.history).toHaveLength(step);
      expect(api.restore(migrated)).toEqual(migrated);
    }
    expect(api.migrate(4, initialResources())).toBeNull();
  });
});
