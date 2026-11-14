import type { BuildingId } from '@/modules/simulation/domain/types';

export interface CircleCollider {
  kind: 'circle';
  x: number;
  z: number;
  radius: number;
}

export interface BoxCollider {
  kind: 'box';
  x: number;
  z: number;
  halfW: number;
  halfD: number;
}

export type WorldCollider = CircleCollider | BoxCollider;

export interface RockPlacement {
  x: number;
  z: number;
  s: number;
  rot: number;
}

function seeded(seed: number): () => number {
  let s = seed >>> 0;
  return () => {
    s = (s + 0x6d2b79f5) | 0;
    let t = Math.imul(s ^ (s >>> 15), 1 | s);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

export const BUILDING_POSITIONS: Record<BuildingId, [number, number]> = {
  HABITAT: [0, 0],
  GREENHOUSE: [9.5, -5.5],
  SCIENCE_LAB: [-9, -6],
  OXYGEN_GENERATOR: [-10, 4.5],
  BATTERIES: [10.5, 6],
  SOLAR_PANELS: [-1, 13],
  RADIATION_SHELTER: [4, -12],
  COMMS_ANTENNA: [14.5, -0.5],
};

export const BUILDING_COLLIDERS: WorldCollider[] = [
  // Domo y plataforma del Hábitat principal
  { kind: 'circle', x: 0, z: 0, radius: 6.9 },
  // Invernadero
  { kind: 'circle', x: 9.5, z: -5.5, radius: 3.3 },
  // Laboratorio científico (caja 4.4 x 3.2)
  { kind: 'box', x: -9, z: -6, halfW: 2.3, halfD: 1.7 },
  // Generador de oxígeno (caja 3.8 x 2.0)
  { kind: 'box', x: -10, z: 4.5, halfW: 2.0, halfD: 1.15 },
  // Banco de baterías (caja 6.4 x 2.6)
  { kind: 'box', x: 10.5, z: 6, halfW: 3.3, halfD: 1.4 },
  // Campo de paneles solares
  { kind: 'circle', x: -1, z: 13, radius: 5.4 },
  // Refugio antirradiación
  { kind: 'circle', x: 4, z: -12, radius: 3.0 },
  // Base de la antena de comunicaciones
  { kind: 'circle', x: 14.5, z: -0.5, radius: 1.6 },
];

/**
 * Rocas deterministas fuera del perímetro de edificios, fuera de la ruta del Rover
 * (elipse 24 x 19) y lejos del punto inicial del jugador (0, 26).
 */
export const MARS_ROCKS: RockPlacement[] = (() => {
  const r = seeded(11);
  const rocks: RockPlacement[] = [];
  for (let i = 0; i < 95 && rocks.length < 70; i++) {
    const angle = r() * Math.PI * 2;
    const dist = 17.5 + r() * 55;
    const x = Math.cos(angle) * dist;
    const z = Math.sin(angle) * dist;
    const s = 0.35 + r() * 1.4;
    const rot = r() * 6;

    // Evitar la ruta elíptica del Rover (24 x 19) y el spawn del jugador (0, 26)
    const ellipseRatio = Math.hypot(x / 24, z / 19);
    const nearRoverTrack = Math.abs(ellipseRatio - 1) < 0.14;
    const nearSpawn = Math.hypot(x - 0, z - 26) < 3.2;
    if (nearRoverTrack || nearSpawn) {
      continue;
    }
    rocks.push({ x, z, s, rot });
  }
  return rocks;
})();

const ALL_COLLIDERS: WorldCollider[] = [
  ...BUILDING_COLLIDERS,
  ...MARS_ROCKS.map(
    (rock): CircleCollider => ({
      kind: 'circle',
      x: rock.x,
      z: rock.z,
      radius: rock.s * 0.9,
    }),
  ),
];

function pushOutOfCircle(
  px: number,
  pz: number,
  cx: number,
  cz: number,
  minDist: number,
): [number, number] {
  const dx = px - cx;
  const dz = pz - cz;
  const distSq = dx * dx + dz * dz;
  if (distSq >= minDist * minDist) {
    return [px, pz];
  }
  const dist = Math.sqrt(distSq);
  if (dist < 1e-5) {
    return [cx, cz + minDist];
  }
  const nx = dx / dist;
  const nz = dz / dist;
  return [cx + nx * minDist, cz + nz * minDist];
}

function pushOutOfBox(
  px: number,
  pz: number,
  bx: number,
  bz: number,
  halfW: number,
  halfD: number,
  entityRadius: number,
): [number, number] {
  const closestX = Math.max(bx - halfW, Math.min(px, bx + halfW));
  const closestZ = Math.max(bz - halfD, Math.min(pz, bz + halfD));
  const dx = px - closestX;
  const dz = pz - closestZ;
  const distSq = dx * dx + dz * dz;

  if (distSq >= entityRadius * entityRadius) {
    return [px, pz];
  }

  // Si el centro está exactamente dentro de la caja, empujar hacia el borde más cercano
  if (distSq < 1e-6) {
    const penLeft = px - (bx - halfW);
    const penRight = bx + halfW - px;
    const penTop = pz - (bz - halfD);
    const penBottom = bz + halfD - pz;
    const minPen = Math.min(penLeft, penRight, penTop, penBottom);
    if (minPen === penLeft) return [bx - halfW - entityRadius, pz];
    if (minPen === penRight) return [bx + halfW + entityRadius, pz];
    if (minPen === penTop) return [px, bz - halfD - entityRadius];
    return [px, bz + halfD + entityRadius];
  }

  const dist = Math.sqrt(distSq);
  return [
    closestX + (dx / dist) * entityRadius,
    closestZ + (dz / dist) * entityRadius,
  ];
}

/**
 * Resuelve colisiones en 2D (XZ) empujando al astronauta o cámara fuera de
 * edificios y rocas para que deslice suavemente por las paredes sin traspasarlas.
 */
export function resolveWorldCollisions(
  x: number,
  z: number,
  entityRadius = 0.55,
  bounds = 36,
): { x: number; z: number } {
  let px = Math.max(-bounds, Math.min(bounds, x));
  let pz = Math.max(-bounds, Math.min(bounds, z));

  // Dos pasadas para resolver esquinas donde coinciden dos obstáculos
  for (let pass = 0; pass < 2; pass++) {
    for (const col of ALL_COLLIDERS) {
      if (col.kind === 'circle') {
        [px, pz] = pushOutOfCircle(px, pz, col.x, col.z, col.radius + entityRadius);
      } else {
        [px, pz] = pushOutOfBox(
          px,
          pz,
          col.x,
          col.z,
          col.halfW,
          col.halfD,
          entityRadius,
        );
      }
    }
    px = Math.max(-bounds, Math.min(bounds, px));
    pz = Math.max(-bounds, Math.min(bounds, pz));
  }

  return { x: px, z: pz };
}
