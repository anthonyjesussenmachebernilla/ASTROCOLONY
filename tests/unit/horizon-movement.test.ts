import { readFileSync } from 'node:fs';
import { runInNewContext } from 'node:vm';
import { expect, it } from 'vitest';

it('moves only while a movement key is held, and stops after window blur', () => {
  const events = new Map<string, (event: { code: string; preventDefault: () => void }) => void>();
  let frame: ((time: number) => void) | undefined;
  const gl = new Proxy({}, {
    get(_target, key) {
      if (key === 'getShaderParameter' || key === 'getProgramParameter') return () => true;
      if (key === 'createVertexArray' || key === 'createBuffer' || key === 'createShader' || key === 'createProgram') return () => ({});
      return () => undefined;
    },
  });
  const canvas = {
    clientWidth: 800,
    clientHeight: 600,
    width: 800,
    height: 600,
    getContext: () => gl,
    addEventListener: () => undefined,
  };
  const context = {
    window: { devicePixelRatio: 1, addEventListener: (name: string, handler: typeof events extends Map<string, infer T> ? T : never) => events.set(name, handler), removeEventListener: () => undefined },
    document: { hidden: false, addEventListener: () => undefined, removeEventListener: () => undefined },
    performance: { now: () => 0 },
    requestAnimationFrame: (callback: typeof frame) => { frame = callback; return 1; },
    cancelAnimationFrame: () => undefined,
    console,
  };
  runInNewContext(readFileSync('public/horizonte/engine.js', 'utf8'), context);
  const api = (context.window as typeof context.window & { MarsGfx: { createDemo: (canvas: unknown) => { start: () => void; goTo: (id: string) => void; getState: () => { pos: number[] } } } }).MarsGfx.createDemo(canvas);
  api.start();
  const startZ = api.getState().pos[2];
  api.goTo('solar');
  frame?.(16);
  frame?.(32);
  expect(api.getState().pos[2]).toBe(startZ);
  events.get('keydown')?.({ code: 'KeyW', preventDefault: () => undefined });
  frame?.(48);
  expect(api.getState().pos[2]).toBeLessThan(startZ);
  const stoppedZ = api.getState().pos[2];
  events.get('blur')?.({ code: '', preventDefault: () => undefined });
  frame?.(64);
  expect(api.getState().pos[2]).toBe(stoppedZ);
});
