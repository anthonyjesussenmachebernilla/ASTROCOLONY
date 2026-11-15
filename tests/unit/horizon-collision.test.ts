import { readFileSync } from 'node:fs';
import { runInNewContext } from 'node:vm';
import { describe, expect, it } from 'vitest';

type CollisionEngine = {
  blocked: (x: number, z: number) => boolean;
  resolveMove: (x: number, z: number, dx: number, dz: number) => { x: number; z: number };
  patrols: { x: number; z: number }[];
};

function loadCollisionEngine(): CollisionEngine {
  const context = { window: {} as { MarsGfx?: CollisionEngine }, console };
  const source = readFileSync('public/horizonte/engine.js', 'utf8');
  runInNewContext(source, context);
  return context.window.MarsGfx!;
}

describe('HORIZONTE world collisions', () => {
  const world = loadCollisionEngine();

  it('starts on a clear path and cannot enter the habitat', () => {
    expect(world.blocked(0, 19)).toBe(false);
    expect(world.resolveMove(0, -15, 0, -4).z).toBe(-15);
  });

  it('blocks consoles and solar panels while keeping the interaction approach clear', () => {
    expect(world.blocked(-6, -10.3)).toBe(true);
    expect(world.blocked(-18, 9)).toBe(true);
    expect(world.blocked(-19.1, -5.2)).toBe(true);
    expect(world.blocked(-18, 11)).toBe(false);
  });

  it('slides along an obstacle instead of freezing diagonal movement', () => {
    const next = world.resolveMove(-8.6, -10.3, 1.2, 0.8);
    expect(next.x).toBe(-8.6);
    expect(next.z).toBeGreaterThan(-10.3);
  });

  it('lets the astronaut step away after a robot gets too close', () => {
    const robot = world.patrols[0];
    const start = { x: robot.x + 0.9, z: robot.z };
    expect(world.blocked(start.x, start.z)).toBe(true);
    expect(world.resolveMove(start.x, start.z, 0.2, 0).x).toBeGreaterThan(start.x);
    expect(world.resolveMove(start.x, start.z, -0.2, 0).x).toBe(start.x);
  });
});
