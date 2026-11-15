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
  const gfx = (context.window as typeof context.window & { MarsGfx: { patrols: { x: number; z: number }[]; createDemo: (canvas: unknown) => { start: () => void; goTo: (id: string) => void; enter: (id: string) => boolean; leave: () => boolean; snapshot: () => unknown; restore: (saved: unknown) => boolean; getNearest: () => { inside: boolean; atExit?: boolean; target?: { id: string } }; getState: () => { pos: number[]; yaw: number; avatarYaw: number; jumpVelocity: number; interior: string | null; camera: string } } } }).MarsGfx;
  const api = gfx.createDemo(canvas);
  api.start();
  const startZ = api.getState().pos[2];
  const robotStart = gfx.patrols.map(robot => [robot.x, robot.z]);
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

  const groundY = api.getState().pos[1];
  events.get('keydown')?.({ code: 'Space', preventDefault: () => undefined });
  frame?.(80);
  expect(api.getState().pos[1]).toBeGreaterThan(groundY);
  const airborneVelocity = api.getState().jumpVelocity;
  events.get('keydown')?.({ code: 'Space', preventDefault: () => undefined });
  expect(api.getState().jumpVelocity).toBe(airborneVelocity);
  for (let time = 96; time <= 1200; time += 16) frame?.(time);
  expect(api.getState().pos[1]).toBeCloseTo(groundY, 5);
  expect(gfx.patrols.some((robot, index) => Math.hypot(robot.x - robotStart[index][0], robot.z - robotStart[index][1]) > 0.1)).toBe(true);
  api.getState().pos = [22, 0, -15];
  expect(api.enter('greenhouse')).toBe(true);
  expect(api.getState().interior).toBe('greenhouse');
  expect(api.getState().camera).toBe('third');
  events.get('keydown')?.({ code: 'KeyV', preventDefault: () => undefined });
  expect(api.getState().camera).toBe('first');
  events.get('keydown')?.({ code: 'KeyV', preventDefault: () => undefined });
  expect(api.getState().camera).toBe('third');
  expect(api.getNearest().atExit).toBe(true);
  events.get('keydown')?.({ code: 'KeyW', preventDefault: () => undefined });
  for (let time = 1216; time <= 2100; time += 16) frame?.(time);
  expect(api.getState().pos[2]).toBeLessThan(4.1);
  events.get('keyup')?.({ code: 'KeyW', preventDefault: () => undefined });
  api.getState().pos = [-3, 0, 0];
  expect(api.getNearest().target?.id).toBe('crops');
  const savedInterior = api.snapshot();
  expect(api.leave()).toBe(true);
  expect(api.getState().interior).toBe(null);
  expect(api.getState().pos[0]).toBe(22);
  expect(api.restore(savedInterior)).toBe(true);
  expect(api.getState().interior).toBe('greenhouse');
  expect(api.getState().pos[0]).toBe(-3);
  expect(api.leave()).toBe(true);
  api.getState().pos = [0, 0, 19];
  api.getState().yaw = 0;
  api.getState().avatarYaw = 0;
  events.get('keydown')?.({ code: 'KeyS', preventDefault: () => undefined });
  for (let time = 2116; time <= 2600; time += 16) frame?.(time);
  expect(api.getState().pos[2]).toBeGreaterThan(19);
  expect(Math.cos(api.getState().avatarYaw)).toBeLessThan(-0.9);
  events.get('keyup')?.({ code: 'KeyS', preventDefault: () => undefined });
  const savedExterior = api.snapshot();
  const savedZ = api.getState().pos[2];
  api.getState().pos = [8, 0, 8];
  expect(api.restore(savedExterior)).toBe(true);
  expect(api.getState().pos[2]).toBe(savedZ);
}, 20000);
