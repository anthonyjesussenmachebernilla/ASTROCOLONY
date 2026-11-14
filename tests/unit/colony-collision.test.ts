import { describe, expect, it } from 'vitest';
import {
  MARS_ROCKS,
  resolveWorldCollisions,
} from '@/modules/mission/presentation/components/colony-collision';

describe('Colony 3D Collision Resolution', () => {
  it('prevents walking into the central Habitat dome', () => {
    const resolved = resolveWorldCollisions(2, 2, 0.55);
    const dist = Math.hypot(resolved.x, resolved.z);
    expect(dist).toBeGreaterThanOrEqual(6.9 + 0.55 - 0.01);
  });

  it('prevents walking through rectangular buildings like Batteries and Science Lab', () => {
    const batteriesHit = resolveWorldCollisions(10.5, 6, 0.55);
    expect(Math.abs(batteriesHit.z - 6)).toBeGreaterThanOrEqual(1.4 + 0.55 - 0.01);

    const labHit = resolveWorldCollisions(-9, -6, 0.55);
    expect(Math.abs(labHit.z + 6)).toBeGreaterThanOrEqual(1.7 + 0.55 - 0.01);
  });

  it('prevents walking through Mars rocks', () => {
    const sampleRock = MARS_ROCKS[0];
    const resolved = resolveWorldCollisions(sampleRock.x, sampleRock.z, 0.55, 80);
    const dist = Math.hypot(resolved.x - sampleRock.x, resolved.z - sampleRock.z);
    expect(dist).toBeGreaterThanOrEqual(sampleRock.s * 0.9 + 0.55 - 0.02);
  });

  it('keeps the Rover ellipse and player spawn clear of rocks', () => {
    for (const rock of MARS_ROCKS) {
      const ellipseRatio = Math.hypot(rock.x / 24, rock.z / 19);
      expect(Math.abs(ellipseRatio - 1)).toBeGreaterThanOrEqual(0.14);
      expect(Math.hypot(rock.x, rock.z - 26)).toBeGreaterThanOrEqual(3.2);
    }
  });
});
