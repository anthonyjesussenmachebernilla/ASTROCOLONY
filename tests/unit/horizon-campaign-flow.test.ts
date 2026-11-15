import { readFileSync } from 'node:fs';
import { runInNewContext } from 'node:vm';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { loadCampaign, type CampaignState } from '../helpers/horizon-campaign';

const SAVE_KEY = 'astrocolony-horizonte-save-v1';
function button(label: string) {
  const node = [...document.querySelectorAll<HTMLButtonElement>('#modalButtons button')].find(node => node.textContent === label);
  if (!node) throw Error(`Missing button: ${label}`);
  node.click();
}
function boot(values = new Map<string, string>()) {
  const html = readFileSync('public/horizonte/index.html', 'utf8');
  document.body.innerHTML = html.slice(html.indexOf('<body>') + 6, html.indexOf('<script src="engine.js"'));
  const world = { pos: [0, 0, 19], yaw: 0, avatarYaw: 0, pitch: 0, camera: 'third', interior: null as string | null, storm: 0, stormTarget: 0 };
  let interact: (nearest: unknown) => void = () => {};
  type Events = { onInteract: typeof interact; onEat?: () => void; onEatDone?: () => void; onBackpack?: () => void };
  let engineEvents: Events = { onInteract: interact };
  const engine = {
    start: vi.fn(), pause: vi.fn(), setSkin: vi.fn(), setHeldFood: vi.fn(), triggerEat: vi.fn(() => true),
    leave: () => { world.interior = null; },
    setStorm: (on: boolean) => { world.stormTarget = on ? 1 : 0; },
    getState: () => world, snapshot: () => ({ ...world }),
    restore: (saved: typeof world) => { Object.assign(world, saved); return true; },
  };
  const context = {
    window: { addEventListener: vi.fn(), location: { search: '?autostart=1' }, MarsGfx: {
      skins: [{ id: 'explorer' }], stations: [], createDemo: (_: unknown, events: Events) => { engineEvents = events; interact = events.onInteract; return engine; },
    } }, document, performance: { now: () => Date.now() },
    localStorage: { getItem: (key: string) => values.get(key) ?? null, setItem: (key: string, value: string) => values.set(key, value) },
    fetch: () => new Promise(() => {}), setTimeout, clearTimeout, setInterval, URLSearchParams, console,
  };
  runInNewContext(readFileSync('public/horizonte/campaign.js', 'utf8'), context);
  runInNewContext(readFileSync('public/horizonte/game.js', 'utf8'), context);
  vi.advanceTimersByTime(65);
  const use = (station: string, target = 'console') => interact({ inside: true, station: { id: station }, target: { id: target, name: 'Matriz de paneles', detail: 'El polvo reduce la luz.' }, dist: 1 });
  const save = () => JSON.parse(values.get(SAVE_KEY)!) as { version: number; campaign: CampaignState; energy: number; health: number };
  return { use, save, values, engine, events: () => engineEvents };
}

beforeEach(() => vi.useFakeTimers());
afterEach(() => { vi.clearAllTimers(); vi.useRealTimers(); document.body.innerHTML = ''; });

describe('campaign UI, persistence and ending', () => {
  it('keeps the first tutorial sol until observation and an explicit end-sol action', () => {
    const game = boot();
    vi.advanceTimersByTime(60 * 60 * 1000);
    expect(document.getElementById('missionSol')).toHaveTextContent('Sol 1 de 10');
    game.use('regulator');expect(game.save().campaign.completed).toBe(false);
    game.use('solar');expect(game.save().campaign.completed).toBe(false);
    game.use('solar', 'array');button('REGISTRAR HALLAZGO');game.use('solar');
    expect(game.save().campaign.completed).toBe(true);
    expect(document.getElementById('coinCount')).toHaveTextContent('0');
    button('SEGUIR EXPLORANDO');
    document.getElementById('endSol')!.click();button('Terminar el sol');
    expect(game.save().campaign.sol).toBe(2);
    expect(document.getElementById('coinCount')).toHaveTextContent('25');
  });

  it('resumes a pending decision and completes ten soles with a persistent ending and optional exploration', () => {
    let game = boot();const api = loadCampaign();
    game.use('solar', 'array');button('REGISTRAR HALLAZGO');
    for (let sol = 1; sol <= 10; sol++) {
      game.use(api.days[sol - 1].station);
      if (sol >= 3) document.querySelector<HTMLButtonElement>(`[data-campaign-choice="${api.days[sol - 1].choices[0].id}"]`)!.click();
      if (sol === 7) {
        game = boot(game.values);
        expect(game.save().campaign.completed).toBe(true);
        expect(game.save().campaign.sol).toBe(7);
        document.getElementById('endSol')!.click();
      }
      button(sol === 10 ? 'Terminar la misión' : 'Terminar el sol');
      if (sol < 10) button(`Comenzar el Sol ${sol + 1}`);
      expect(game.save().campaign.history).toHaveLength(sol);
    }
    expect(document.getElementById('modalTag')).toHaveTextContent('Expedición completada');
    expect(document.getElementById('modalBody')).toHaveTextContent('baliza científica');
    expect(document.getElementById('modalBody')).toHaveTextContent('No es un descubrimiento de NASA');
    expect(document.getElementById('coinCount')).toHaveTextContent(String(api.coinTotal));
    button('Seguir explorando');expect(game.engine.pause).toHaveBeenLastCalledWith(false);
    game.use('energy');button('Seguir explorando');
    expect(game.save().campaign.finished).toBe(true);
    expect(document.getElementById('coinCount')).toHaveTextContent(String(api.coinTotal));
    game = boot(game.values);document.getElementById('endSol')!.click();
    expect(document.getElementById('modalTag')).toHaveTextContent('Expedición completada');
    button('Iniciar otra misión');button('Conservar mi expedición');
    expect(game.save().campaign.finished).toBe(true);
    button('Iniciar otra misión');button('Empezar otra misión');
    expect(game.save().campaign.sol).toBe(1);
    expect(game.save().campaign.history).toHaveLength(0);
    expect(document.getElementById('coinCount')).toHaveTextContent(String(api.coinTotal));
  });

  it('continues old completed missions at Sol 4, preserving their resources and wardrobe', () => {
    const values = new Map([[SAVE_KEY, JSON.stringify({ version: 1, step: 3, mode: 'comandante', world: {}, energy: 95, oxygen: 84, food: 63, shield: 74, inspected: ['solar:array'] })]]);
    const game = boot(values);
    expect(game.save().version).toBe(2);
    expect(game.save().campaign.sol).toBe(4);
    expect(game.save().energy).toBe(95);
    expect(document.getElementById('coinCount')).toHaveTextContent('110');
    expect(document.getElementById('modeBadge')).toHaveTextContent('Comandante');
  });

  it('offers a saved training rescue instead of trapping a low-resource mission', () => {
    const values = new Map([[SAVE_KEY, JSON.stringify({ version: 1, step: 3, world: {}, energy: 2, oxygen: 5, food: 6, shield: 7 })]]);
    let game = boot(values);
    game.use('greenhouse');document.querySelector<HTMLButtonElement>('[data-campaign-choice="grow"]')!.click();
    expect(document.getElementById('modalTitle')).toHaveTextContent('Revisemos tu plan');
    expect([...document.querySelectorAll('#modalButtons button')].some(button => button.textContent === 'Terminar el sol')).toBe(false);
    button('Pedir ayuda a Astrobot');
    expect(game.save().campaign.assistedSols).toEqual([4]);
    expect(game.save().campaign.completed).toBe(false);
    expect(game.save().energy).toBe(35);
    game = boot(values);expect(game.save().campaign.assistedSols).toEqual([4]);
    game.use('greenhouse');document.querySelector<HTMLButtonElement>('[data-campaign-choice="ration"]')!.click();
    button('Terminar el sol');expect(game.save().campaign.sol).toBe(5);
    expect(document.getElementById('coinCount')).toHaveTextContent('140');
  });

  it('recognizes a balanced ending and keeps its report unchanged during free exploration', () => {
    const game = boot(), api = loadCampaign();
    game.use('solar', 'array');button('REGISTRAR HALLAZGO');
    for (let sol = 1; sol <= 10; sol++) {
      game.use(api.days[sol - 1].station);
      if (sol >= 3) {
        const choice = sol === 4 ? 'ration' : api.days[sol - 1].choices[0].id;
        document.querySelector<HTMLButtonElement>(`[data-campaign-choice="${choice}"]`)!.click();
      }
      button(sol === 10 ? 'Terminar la misión' : 'Terminar el sol');
      if (sol < 10) button(`Comenzar el Sol ${sol + 1}`);
    }
    expect(document.getElementById('modalTitle')).toHaveTextContent('Aurora-1 mira al futuro');
    const finalReserves = game.save().campaign.history[9].after;
    button('Seguir explorando');game.use('greenhouse', 'crops');button('REGISTRAR HALLAZGO');
    game.use('energy');
    expect(game.save().campaign.history[9].after).toEqual(finalReserves);
    expect(document.getElementById('modalTitle')).toHaveTextContent('Aurora-1 mira al futuro');
  });

  it('preserves health and backpack while consuming food once and pausing its healing in menus', () => {
    const values = new Map([
      [SAVE_KEY, JSON.stringify({ version: 1, step: 0, world: {}, energy: 62, oxygen: 78, food: 54, shield: 68, health: 40 })],
      ['astrocolony-wardrobe-v1', JSON.stringify({ coins: 100, owned: ['explorer'], equipped: 'explorer', backpack: { juice: 1 } })],
    ]);
    let game = boot(values);
    expect(document.getElementById('health')).toHaveTextContent('40');
    document.getElementById('foodShop')!.click();
    document.querySelector<HTMLButtonElement>('[data-food="apricots"]')!.click();
    button('VOLVER AL JUEGO');game.events().onEat?.();
    expect(JSON.parse(values.get('astrocolony-wardrobe-v1')!).backpack).toEqual({ juice: 1 });
    vi.advanceTimersByTime(360);
    const partialHealth = document.getElementById('health')!.textContent;
    game.events().onBackpack?.();vi.advanceTimersByTime(1000);
    expect(document.getElementById('health')).toHaveTextContent(partialHealth!);
    document.querySelector<HTMLButtonElement>('[data-bp="juice"]')!.click();
    expect(document.getElementById('modalTag')).toHaveTextContent('MOCHILA DEL ASTRONAUTA');
    button('CERRAR (CTRL+R)');game.events().onEatDone?.();
    expect(game.save().health).toBe(50);
    game.events().onEatDone?.();expect(game.save().health).toBe(50);
    game = boot(values);
    expect(game.save().campaign.sol).toBe(1);
    expect(game.save().health).toBe(50);
    expect(document.getElementById('coinCount')).toHaveTextContent('92');
    document.getElementById('backpackBtn')!.click();
    expect(document.querySelector('[data-bp="juice"]')).not.toBeNull();
    expect(document.querySelector('[data-bp="apricots"]')).toBeNull();
  });

  it('restores health when retrying a saved tutorial decision without repeating coins', () => {
    const values = new Map([[SAVE_KEY, JSON.stringify({ version: 1, step: 1, world: {}, energy: 67, oxygen: 78, food: 54, shield: 68, health: 50 })]]);
    let game = boot(values);game.use('regulator');expect(game.save().health).toBe(32);
    game = boot(values);document.getElementById('endSol')!.click();button('Repetir el ejercicio');
    expect(game.save().health).toBe(50);
    expect(document.getElementById('coinCount')).toHaveTextContent('25');
    game.use('regulator');button('Terminar el sol');
    expect(game.save().health).toBe(32);
    expect(document.getElementById('coinCount')).toHaveTextContent('60');
  });
});
