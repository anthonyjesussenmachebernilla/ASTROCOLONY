import { readFileSync } from 'node:fs';
import { runInNewContext } from 'node:vm';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { loadDiscoveryLocations } from '../helpers/horizon-discoveries';

function startDemo(failGraphics: boolean, selectedMode: 'explorador' | 'comandante' = 'explorador', savedMode?: 'explorador' | 'comandante', panelCollapsed = false) {
  const html = readFileSync('public/horizonte/index.html', 'utf8');
  document.body.innerHTML = html.slice(html.indexOf('<body>') + 6, html.indexOf('</body>'));
  const scheduled: (() => void)[] = [];
  const navigate = vi.fn();
  const discovery = { open: vi.fn(), cancel: vi.fn(), locations: loadDiscoveryLocations() };
  let tick: ((data: unknown) => void) | null = null;
  const engine = { setStorm: vi.fn(), start: vi.fn(), pause: vi.fn(), leave: vi.fn(), getNearest: vi.fn((): { robot: { id: number }; inside: boolean } | null => null), restore: vi.fn(() => true), snapshot: () => ({}), getState: () => ({ pos: [0, 0, 19], yaw: 0, camera: 'third', storm: 0, stormTarget: 0 }) };
  const stored = new Map<string, string>([['astrocolony-mode', selectedMode]]);
  if (panelCollapsed) stored.set('astrocolony-mission-panel-collapsed', 'true');
  if (savedMode) stored.set('astrocolony-horizonte-save-v1', JSON.stringify({ version: 1, mode: savedMode, world: {}, step: 0, energy: 62, oxygen: 78, food: 54, shield: 68 }));
  const context = {
    document,
    window: { MarsDiscovery: discovery, addEventListener: vi.fn(), location: { search: '?autostart=1' }, parent: { location: { assign: navigate } }, MarsGfx: { stations: [{ id: 'solar', x: 0, z: 0 }], createDemo: (_canvas: unknown, handlers: { onTick: (data: unknown) => void }) => { if (failGraphics) throw new Error('WebGL 2 no disponible'); tick = handlers.onTick; return engine; } } },
    localStorage: { getItem: (key: string) => stored.get(key) ?? null, setItem: (key: string, value: string) => stored.set(key, value) },
    performance: { now: () => 1000 },
    URLSearchParams,
    fetch: () => new Promise(() => {}),
    setTimeout: (callback: () => void) => { scheduled.push(callback); return scheduled.length; },
    clearTimeout: vi.fn(), setInterval: vi.fn(), console: { error: vi.fn() },
  };
  runInNewContext(readFileSync('public/horizonte/campaign.js', 'utf8'), context);
  runInNewContext(readFileSync('public/horizonte/game.js', 'utf8'), context);
  scheduled.shift()?.();
  return { engine, navigate, stored, discovery, tick: (data: unknown) => tick?.(data) };
}

afterEach(() => { document.body.innerHTML = ''; });

describe('inicio de HORIZONTE', () => {
  it('keeps the menu recoverable and offers the complete game if WebGL initialization fails', () => {
    startDemo(true);
    expect(document.getElementById('menu')).not.toHaveClass('hidden');
    expect(document.getElementById('start')).not.toBeDisabled();
    expect(document.getElementById('modalTitle')).toHaveTextContent('No se pudo cargar el escenario');
    const back = [...document.querySelectorAll<HTMLButtonElement>('#modalButtons button')].find((button) => button.textContent === 'VOLVER AL MENÚ');
    back?.click();
    expect(document.getElementById('modalShade')).toHaveClass('hidden');
    expect(document.getElementById('menu')).not.toHaveClass('hidden');
  });
  it('starts normally and lets players reach the persistent adventure from the pause menu', () => {
    const { engine, navigate } = startDemo(false);
    expect(engine.start).toHaveBeenCalledOnce();
    expect(document.getElementById('menu')).toHaveClass('hidden');
    expect(document.getElementById('gameUI')).not.toHaveClass('hidden');
    document.getElementById('pause')?.click();
    const fullGame = [...document.querySelectorAll<HTMLButtonElement>('#modalButtons button')].find((button) => button.textContent === 'ABRIR SIMULACIÓN ANTERIOR');
    expect(fullGame).toBeDefined(); fullGame?.click();
    expect(navigate).toHaveBeenCalledWith('/game/legacy');
  });
  it('shows the selected mode and restores the mode saved with a mission', () => {
    startDemo(false, 'comandante');
    expect(document.getElementById('modeBadge')).toHaveTextContent('Comandante');
    document.body.innerHTML = '';
    const { stored } = startDemo(false, 'explorador', 'comandante');
    expect(document.getElementById('modeBadge')).toHaveTextContent('Comandante');
    expect(stored.get('astrocolony-mode')).toBe('comandante');
  });
  it('lets the player ask a nearby robot for a hint and answer a question', () => {
    const { engine } = startDemo(false);
    engine.getNearest.mockReturnValue({ robot: { id: 0 }, inside: false });
    document.getElementById('mobileInteract')?.click();
    expect(document.getElementById('modalTitle')).toHaveTextContent('Luma');
    [...document.querySelectorAll<HTMLButtonElement>('[data-robot-topic]')].find(button => button.textContent === 'Dame una pista')?.click();
    expect(document.getElementById('robotReply')).toHaveTextContent('paneles solares');
    [...document.querySelectorAll<HTMLButtonElement>('[data-robot-topic]')].find(button => button.textContent === 'Hazme una pregunta')?.click();
    [...document.querySelectorAll<HTMLButtonElement>('#robotAnswers button')].find(button => button.textContent === 'Paneles solares')?.click();
    expect(document.getElementById('robotReply')).toHaveTextContent('¡Correcto!');
  });
  it('keeps one nearby robot prompt without stacking greetings over it', () => {
    const { tick } = startDemo(false);
    const toast = document.getElementById('toast')!;
    toast.textContent = '';
    const frame = (id: number) => ({ interior: null, nearest: { robot: { id }, station: null, dist: 2 }, markers: {}, skyMarkers: [], pos: [0, 0, 19], fps: 60 });
    tick(frame(1));
    expect(document.getElementById('interiorName')).toHaveTextContent('Nova');
    tick(frame(2));
    expect(document.getElementById('interiorName')).toHaveTextContent('Atlas');
    expect(document.getElementById('interiorHint')).toHaveTextContent('Pulsa E para conversar');
    expect(toast.textContent).toBe('');
  });
  it('hides and restores the mission panel with a persistent arrow button', () => {
    const { stored } = startDemo(false);
    const toggle = document.getElementById('missionToggle')!;
    const details = document.getElementById('missionDetails')!;
    expect(toggle).toHaveAttribute('aria-expanded', 'true');
    toggle.click();
    expect(details).toHaveAttribute('hidden');
    expect(toggle).toHaveAttribute('aria-label', 'Mostrar misión');
    expect(stored.get('astrocolony-mission-panel-collapsed')).toBe('true');
    toggle.click();
    expect(details).not.toHaveAttribute('hidden');
    expect(toggle).toHaveAttribute('aria-expanded', 'true');
    document.body.innerHTML = '';
    startDemo(false, 'explorador', undefined, true);
    expect(document.getElementById('missionDetails')).toHaveAttribute('hidden');
  });
  it('shows one contextual photo marker in each module and opens its matching topic', () => {
    const { tick, discovery } = startDemo(false);
    const marker = document.getElementById('discoveryMarker')!;
    expect(marker).toHaveClass('hidden');
    const nearest = { target: { id: 'array', name: 'Matriz de paneles' }, dist: 1 };
    for (const [station, location] of Object.entries(discovery.locations)) {
      tick({ interior: station, nearest, fps: 60 });
      expect(marker).not.toHaveClass('hidden');
      expect(marker).toHaveTextContent('Información con imagen');
      expect(marker).toHaveTextContent(location.label);
      marker.click();expect(discovery.open).toHaveBeenLastCalledWith(expect.objectContaining({ topic: location.topic }));
    }
    expect(document.querySelectorAll('#discoveryMarker')).toHaveLength(1);
    tick({ interior: null, nearest: { robot: { id: 0 } }, markers: {}, skyMarkers: [], pos: [0, 0, 19], fps: 60 });
    expect(marker).toHaveClass('hidden');
  });
});
