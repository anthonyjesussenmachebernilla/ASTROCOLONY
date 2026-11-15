import { readFileSync } from 'node:fs';
import { runInNewContext } from 'node:vm';
import { afterEach, expect, it, vi } from 'vitest';

afterEach(() => vi.useRealTimers());

it('awards coins for objectives and keeps purchased suits after reloading', () => {
  vi.useFakeTimers();
  const values = new Map<string, string>();
  const storage = {
    getItem: (key: string) => values.get(key) ?? null,
    setItem: (key: string, value: string) => { values.set(key, value); },
  };
  const html = readFileSync('public/horizonte/index.html', 'utf8');
  const body = html.match(/<body>([\s\S]*?)<script src="engine\.js"/i)?.[1];
  expect(body).toBeTruthy();
  const source = readFileSync('public/horizonte/game.js', 'utf8');
  const skins = [
    { id: 'explorer', name: 'Explorador', price: 0, suit: '#aaa', helmet: '#aaa', pack: '#aaa', accent: '#aaa' },
    { id: 'botanic', name: 'Guardiana verde', price: 55, suit: '#aaa', helmet: '#aaa', pack: '#aaa', accent: '#aaa' },
  ];

  function boot() {
    document.body.innerHTML = body!;
    const state = { pos: [0, 0, 19], yaw: 0, avatarYaw: 0, camera: 'third', interior: null, storm: 0, stormTarget: 0, skin: 'explorer' };
    let handlers: { onInteract?: (value: unknown) => void } = {};
    const engine = {
      start: () => undefined, pause: () => undefined, leave: () => false, getState: () => state,
      snapshot: () => ({ ...state, pos: [...state.pos] }),
      restore: (saved: typeof state) => { Object.assign(state, saved); return true; },
      setSkin: (id: string) => { state.skin = id; return true; },
      setStorm: (on: boolean) => { state.stormTarget = on ? 1 : 0; },
    };
    const gameWindow = window as unknown as Window & { MarsGfx: unknown };
    gameWindow.MarsGfx = { skins, stations: [], createDemo: (_canvas: unknown, events: typeof handlers) => { handlers = events; return engine; } };
    const context = {
      window: gameWindow, document, localStorage: storage, performance: { now: () => Date.now() },
      fetch: async () => ({ ok: true, json: async () => ({ snapshot: null }) }),
      setTimeout, clearTimeout, setInterval, URLSearchParams, console,
    };
    runInNewContext(readFileSync('public/horizonte/campaign.js', 'utf8'), context);
    runInNewContext(source, context);
    document.getElementById('start')!.click();
    vi.advanceTimersByTime(70);
    return { handlers, state };
  }

  const first = boot();
  const interact = (id: string) => first.handlers.onInteract?.({ inside: true, station: { id }, target: { id: id === 'energy' ? 'console' : 'maintenance' }, dist: 1, atExit: false });
  const finishSolar = () => {
   document.getElementById('maintAction')!.click();
   document.getElementById('maintAction')!.click();
   for (let i = 0; i < 4; i++) document.getElementById('maintBrush')!.click();
   document.getElementById('maintAction')!.click();
   document.getElementById('maintAction')!.click();
  };
  const finishRegulator = () => {
   document.getElementById('maintAction')!.click();
   document.getElementById('maintAction')!.click();
   (document.querySelector('[data-fuse="1"]') as HTMLButtonElement).click();
   document.getElementById('maintAction')!.click();
   document.getElementById('maintAction')!.click();
  };
  interact('solar');
  finishSolar();
  expect(document.getElementById('coinCount')?.textContent).toBe('25');
  [...document.querySelectorAll<HTMLButtonElement>('#modalButtons button')].find(button => button.textContent === 'Terminar el sol')?.click();
  [...document.querySelectorAll<HTMLButtonElement>('#modalButtons button')].find(button => button.textContent === 'Comenzar el Sol 2')?.click();
  interact('regulator');
  finishRegulator();
  expect(document.getElementById('coinCount')?.textContent).toBe('60');
  expect(document.getElementById('coinCount')?.textContent).toBe('60');
  document.getElementById('wardrobe')!.click();
  (document.querySelector('[data-skin="botanic"]') as HTMLButtonElement).click();
  expect(document.getElementById('coinCount')?.textContent).toBe('5');
  expect(first.state.skin).toBe('botanic');
  expect(JSON.parse(values.get('astrocolony-wardrobe-v1')!)).toMatchObject({ coins: 5, equipped: 'botanic' });

  const second = boot();
  expect(document.getElementById('coinCount')?.textContent).toBe('5');
  expect(second.state.skin).toBe('botanic');
});
