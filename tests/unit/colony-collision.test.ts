import { describe, expect, it } from 'vitest';
import {
  getDynamicEntityColliders,
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
    expect(dist).toBeGreaterThanOrEqual(sampleRock.s * 1.05 + 0.55 - 0.02);
  });

  it('prevents walking through the moving Rover and Crew astronauts', () => {
    const dynamic = getDynamicEntityColliders(0, false, 100);
    expect(dynamic).toHaveLength(5);

    const rover = dynamic[0];
    const resolvedRover = resolveWorldCollisions(rover.x, rover.z, 0.55, 36, dynamic);
    expect(Math.hypot(resolvedRover.x - rover.x, resolvedRover.z - rover.z)).toBeGreaterThanOrEqual(
      rover.radius + 0.55 - 0.01,
    );

    const crewMember = dynamic[1];
    const resolvedCrew = resolveWorldCollisions(crewMember.x, crewMember.z, 0.55, 36, dynamic);
    expect(
      Math.hypot(resolvedCrew.x - crewMember.x, resolvedCrew.z - crewMember.z),
    ).toBeGreaterThanOrEqual(crewMember.radius + 0.55 - 0.01);
  });

  it('keeps the Rover ellipse and player spawn clear of rocks', () => {
    for (const rock of MARS_ROCKS) {
      const ellipseRatio = Math.hypot(rock.x / 24, rock.z / 19);
      expect(Math.abs(ellipseRatio - 1)).toBeGreaterThanOrEqual(0.14);
      expect(Math.hypot(rock.x, rock.z - 26)).toBeGreaterThanOrEqual(3.2);
    }
  });
});
