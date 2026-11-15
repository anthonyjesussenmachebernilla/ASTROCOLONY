import { readFileSync } from 'node:fs';
import { runInNewContext } from 'node:vm';
import { afterEach, describe, expect, it, vi } from 'vitest';

function startDemo(failGraphics: boolean) {
  const html = readFileSync('public/horizonte/index.html', 'utf8');
  document.body.innerHTML = html.slice(html.indexOf('<body>') + 6, html.indexOf('</body>'));
  const scheduled: (() => void)[] = [];
  const navigate = vi.fn();
  const engine = { start: vi.fn(), pause: vi.fn(), getState: () => ({ pos: [0, 0, 19], yaw: 0, camera: 'third', storm: 0, stormTarget: 0 }) };
  const context = {
    document,
    window: { location: { search: '?autostart=1' }, parent: { location: { assign: navigate } }, MarsGfx: { createDemo: () => { if (failGraphics) throw new Error('WebGL 2 no disponible'); return engine; } } },
    localStorage: { getItem: () => null },
    URLSearchParams,
    fetch: () => new Promise(() => {}),
    setTimeout: (callback: () => void) => { scheduled.push(callback); return scheduled.length; },
    clearTimeout: vi.fn(), setInterval: vi.fn(), console: { error: vi.fn() },
  };
  runInNewContext(readFileSync('public/horizonte/game.js', 'utf8'), context);
  scheduled.shift()?.();
  return { engine, navigate };
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
    const fullGame = [...document.querySelectorAll<HTMLButtonElement>('#modalButtons button')].find((button) => button.textContent === 'ABRIR AVENTURA COMPLETA');
    expect(fullGame).toBeDefined(); fullGame?.click();
    expect(navigate).toHaveBeenCalledWith('/game/legacy');
  });
});
