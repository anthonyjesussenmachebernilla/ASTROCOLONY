'use client';

import { Canvas, useFrame, useThree, type ThreeEvent } from '@react-three/fiber';
import {
  createContext,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
  Suspense,
  type ReactNode,
} from 'react';
import * as THREE from 'three';
import type { SpaceWeatherLevel } from '@/modules/nasa/domain/types';
import type {
  BuildingId,
  ResourceSnapshot,
  SpaceEventType,
} from '@/modules/simulation/domain/types';
import { ModuleInterior3D } from './ModuleInterior3D';
import { VanguardCharacter, type Locomotion } from './VanguardCharacter';
import { MARS_ROCKS, resolveWorldCollisions } from './colony-collision';

/* ----------------------------- utilidades ----------------------------- */

const MotionContext = createContext(true);
const useMotion = () => useContext(MotionContext);

/** PRNG determinista para que la escena sea idéntica en cada carga. */
function seeded(seed: number): () => number {
  let s = seed >>> 0;
  return () => {
    s = (s + 0x6d2b79f5) | 0;
    let t = Math.imul(s ^ (s >>> 15), 1 | s);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

function hash2(x: number, z: number): number {
  const s = Math.sin(x * 127.1 + z * 311.7) * 43758.5453;
  return s - Math.floor(s);
}

/** Altura del terreno: plano en la zona de la base y ondulado alrededor. */
function heightAt(x: number, z: number): number {
  const r = Math.hypot(x, z);
  const rough = THREE.MathUtils.smoothstep(r, 18, 40);
  const n =
    Math.sin(x * 0.16) * Math.cos(z * 0.13) * 1.8 +
    Math.sin(x * 0.06 + z * 0.09) * 3.6 +
    Math.sin(x * 0.33 + 1.3) * Math.sin(z * 0.29) * 0.7;
  return n * rough;
}

const SUN_POSITION = new THREE.Vector3(70, 38, -55);
const noRaycast = () => null;

const BUILDING_LAYOUT: Record<
  BuildingId,
  { position: [number, number, number]; label: string; labelY: number }
> = {
  HABITAT: { position: [0, 0, 0], label: 'Hábitat principal', labelY: 8 },
  GREENHOUSE: { position: [9.5, 0, -5.5], label: 'Invernadero', labelY: 4.6 },
  SCIENCE_LAB: { position: [-9, 0, -6], label: 'Laboratorio científico', labelY: 4.2 },
  OXYGEN_GENERATOR: { position: [-10, 0, 4.5], label: 'Generador de oxígeno', labelY: 5 },
  BATTERIES: { position: [10.5, 0, 6], label: 'Baterías', labelY: 3.6 },
  SOLAR_PANELS: { position: [-1, 0, 13], label: 'Paneles solares', labelY: 3.6 },
  RADIATION_SHELTER: { position: [4, 0, -12], label: 'Refugio antirradiación', labelY: 4.4 },
  COMMS_ANTENNA: { position: [14.5, 0, -0.5], label: 'Antena de comunicaciones', labelY: 10 },
};

/* ------------------------------ entorno ------------------------------- */

const SKY_VERTEX = /* glsl */ `
  varying vec3 vDir;
  void main() {
    vDir = normalize(position);
    gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
  }
`;
const SKY_FRAGMENT = /* glsl */ `
  uniform vec3 topColor;
  uniform vec3 bottomColor;
  varying vec3 vDir;
  void main() {
    float h = clamp(vDir.y * 1.7 + 0.08, 0.0, 1.0);
    gl_FragColor = vec4(mix(bottomColor, topColor, pow(h, 0.55)), 1.0);
  }
`;

const FOG_CALM = new THREE.Color('#987260');
const FOG_STORM = new THREE.Color('#866451');
const SKY_TOP_CALM = new THREE.Color('#665c63');
const SKY_TOP_STORM = new THREE.Color('#695348');
const SKY_BOTTOM_CALM = new THREE.Color('#b98b70');
const SKY_BOTTOM_STORM = new THREE.Color('#a27b62');

function Environment({ storm }: { storm: boolean }) {
  const fogRef = useRef<THREE.FogExp2>(null);
  const sunLight = useRef<THREE.DirectionalLight>(null);
  const skyMaterial = useRef<THREE.ShaderMaterial>(null);
  const stormLevel = useRef(0);
  const uniforms = useMemo(
    () => ({
      topColor: { value: SKY_TOP_CALM.clone() },
      bottomColor: { value: SKY_BOTTOM_CALM.clone() },
    }),
    [],
  );

  useFrame((_, delta) => {
    stormLevel.current = THREE.MathUtils.damp(stormLevel.current, storm ? 1 : 0, 2, delta);
    const k = stormLevel.current;
    const fog = fogRef.current;
    if (fog) {
      fog.density = THREE.MathUtils.lerp(0.009, 0.036, k);
      fog.color.copy(FOG_CALM).lerp(FOG_STORM, k);
    }
    const sky = skyMaterial.current;
    if (sky) {
      sky.uniforms.topColor.value.copy(SKY_TOP_CALM).lerp(SKY_TOP_STORM, k);
      sky.uniforms.bottomColor.value.copy(SKY_BOTTOM_CALM).lerp(SKY_BOTTOM_STORM, k);
    }
    if (sunLight.current) {
      sunLight.current.intensity = THREE.MathUtils.lerp(2.6, 1.1, k);
    }
  });

  return (
    <>
      <fogExp2 ref={fogRef} attach="fog" args={['#987260', 0.009]} />
      <hemisphereLight args={['#d4b29b', '#483329', 0.55]} />
      <directionalLight
        ref={sunLight}
        position={SUN_POSITION.toArray()}
        color="#f4d2ad"
        intensity={2.2}
        castShadow
        shadow-mapSize-width={2048}
        shadow-mapSize-height={2048}
        shadow-camera-left={-26}
        shadow-camera-right={26}
        shadow-camera-top={26}
        shadow-camera-bottom={-26}
        shadow-camera-near={10}
        shadow-camera-far={200}
        shadow-bias={-0.0004}
      />
      <mesh renderOrder={-10} raycast={noRaycast}>
        <sphereGeometry args={[300, 32, 16]} />
        <shaderMaterial
          ref={skyMaterial}
          uniforms={uniforms}
          vertexShader={SKY_VERTEX}
          fragmentShader={SKY_FRAGMENT}
          side={THREE.BackSide}
          depthWrite={false}
          fog={false}
        />
      </mesh>
    </>
  );
}

/* --------------------------- cuerpos celestes -------------------------- */

function Sun({ level, flaring }: { level: SpaceWeatherLevel; flaring: boolean }) {
  const corona = useRef<THREE.Mesh>(null);
  const motion = useMotion();
  const baseScale = level === 'STORMY' ? 1.9 : level === 'ACTIVE' ? 1.45 : 1.1;

  useFrame(({ clock }) => {
    if (!corona.current) return;
    const pulse = motion ? 1 + Math.sin(clock.elapsedTime * (flaring ? 3 : 1.2)) * (flaring ? 0.18 : 0.06) : 1;
    const s = baseScale * (flaring ? 1.5 : 1) * pulse;
    corona.current.scale.setScalar(s);
  });

  return (
    <group position={SUN_POSITION.clone().multiplyScalar(2.4).toArray()}>
      <mesh>
        <sphereGeometry args={[7, 32, 16]} />
        <meshBasicMaterial color="#fff2c9" fog={false} />
      </mesh>
      <mesh ref={corona}>
        <sphereGeometry args={[11, 32, 16]} />
        <meshBasicMaterial
          color={flaring ? '#c084fc' : '#ffb454'}
          transparent
          opacity={0.28}
          depthWrite={false}
          fog={false}
        />
      </mesh>
    </group>
  );
}

function SkyBodies() {
  const phobos = useRef<THREE.Mesh>(null);
  const motion = useMotion();
  useFrame(({ clock }) => {
    if (!phobos.current || !motion) return;
    const t = clock.elapsedTime * 0.05;
    phobos.current.position.set(Math.cos(t) * 150 - 20, 70 + Math.sin(t * 1.7) * 15, Math.sin(t) * -150);
    phobos.current.rotation.y += 0.004;
  });
  return (
    <>
      {/* La Tierra vista desde Marte: un punto azul brillante */}
      <mesh position={[-130, 75, -140]}>
        <sphereGeometry args={[2.4, 24, 16]} />
        <meshBasicMaterial color="#7ec8ff" fog={false} />
      </mesh>
      {/* Fobos, la luna de Marte con forma de papa */}
      <mesh ref={phobos} position={[100, 75, -120]} scale={[1.7, 1.2, 1.4]}>
        <dodecahedronGeometry args={[3, 1]} />
        <meshStandardMaterial color="#8a8077" flatShading fog={false} />
      </mesh>
    </>
  );
}

/* ------------------------------- terreno ------------------------------ */

function Terrain() {
  const dustTexture = useMemo(() => {
    const canvas = document.createElement('canvas');
    canvas.width = canvas.height = 512;
    const context = canvas.getContext('2d');
    if (!context) return null;
    const pixels = context.createImageData(512, 512);
    const random = seeded(94021);
    for (let index = 0; index < 512 * 512; index++) {
      const grain = Math.floor(210 + random() * 45);
      const offset = index * 4;
      pixels.data[offset] = grain;
      pixels.data[offset + 1] = grain - 5;
      pixels.data[offset + 2] = grain - 10;
      pixels.data[offset + 3] = 255;
    }
    context.putImageData(pixels, 0, 0);
    const texture = new THREE.CanvasTexture(canvas);
    texture.wrapS = texture.wrapT = THREE.RepeatWrapping;
    texture.repeat.set(24, 24);
    texture.colorSpace = THREE.SRGBColorSpace;
    texture.anisotropy = 8;
    return texture;
  }, []);
  useEffect(() => () => dustTexture?.dispose(), [dustTexture]);
  const geometry = useMemo(() => {
    const g = new THREE.PlaneGeometry(240, 240, 190, 190);
    g.rotateX(-Math.PI / 2);
    const pos = g.attributes.position;
    const colors = new Float32Array(pos.count * 3);
    const low = new THREE.Color('#704b3d');
    const mid = new THREE.Color('#9b6a50');
    const high = new THREE.Color('#bf8a69');
    const c = new THREE.Color();
    for (let i = 0; i < pos.count; i++) {
      const x = pos.getX(i);
      const z = pos.getZ(i);
      const h = heightAt(x, z);
      pos.setY(i, h);
      const t = THREE.MathUtils.clamp((h + 3) / 12, 0, 1);
      c.copy(low).lerp(mid, Math.min(1, t * 2)).lerp(high, Math.max(0, t * 2 - 1));
      c.offsetHSL(0, 0, (hash2(x, z) - 0.5) * 0.07);
      colors[i * 3] = c.r;
      colors[i * 3 + 1] = c.g;
      colors[i * 3 + 2] = c.b;
    }
    g.setAttribute('color', new THREE.BufferAttribute(colors, 3));
    g.computeVertexNormals();
    return g;
  }, []);

  return (
    <mesh geometry={geometry} receiveShadow raycast={noRaycast}>
      <meshStandardMaterial vertexColors map={dustTexture} bumpMap={dustTexture} bumpScale={0.055} roughness={1} metalness={0} />
    </mesh>
  );
}

function Scenery() {
  const rocks = useMemo(
    () =>
      MARS_ROCKS.map((rock) => ({
        ...rock,
        y: heightAt(rock.x, rock.z),
      })),
    [],
  );

  const mountains = useMemo(() => {
    const r = seeded(23);
    return Array.from({ length: 16 }, (_, i) => {
      const angle = (i / 16) * Math.PI * 2 + r() * 0.2;
      const dist = 92 + r() * 18;
      return {
        x: Math.cos(angle) * dist,
        z: Math.sin(angle) * dist,
        h: 20 + r() * 26,
        w: 16 + r() * 14,
      };
    });
  }, []);

  return (
    <group>
      {rocks.map((rock, i) => (
        <mesh
          key={i}
          position={[rock.x, rock.y + rock.s * 0.3, rock.z]}
          rotation={[rock.rot, rock.rot * 1.7, 0]}
          scale={rock.s}
          castShadow
          receiveShadow
          raycast={noRaycast}
        >
          <dodecahedronGeometry args={[1, 0]} />
          <meshStandardMaterial color="#6b3a2a" flatShading roughness={1} />
        </mesh>
      ))}
      {mountains.map((m, i) => (
        <mesh key={i} position={[m.x, m.h / 2 - 2, m.z]} raycast={noRaycast}>
          <coneGeometry args={[m.w, m.h, 6]} />
          <meshStandardMaterial color="#7d3b25" flatShading roughness={1} />
        </mesh>
      ))}
    </group>
  );
}

/* ---------------------- contenedor de edificio interactivo ------------- */

interface InteractiveProps {
  id: BuildingId;
  selected: boolean;
  onSelect: (id: BuildingId) => void;
  ringRadius: number;
  children: ReactNode;
}

function Interactive({ id, selected, onSelect, ringRadius, children }: InteractiveProps) {
  const [hover, setHover] = useState(false);
  const ring = useRef<THREE.Mesh>(null);
  const motion = useMotion();
  const layout = BUILDING_LAYOUT[id];

  useEffect(() => {
    document.body.style.cursor = hover ? 'pointer' : 'auto';
    return () => {
      document.body.style.cursor = 'auto';
    };
  }, [hover]);

  useFrame(({ clock }) => {
    if (!ring.current) return;
    const s = motion ? 1 + Math.sin(clock.elapsedTime * 3) * 0.04 : 1;
    ring.current.scale.set(s, s, 1);
  });

  return (
    <group
      position={layout.position}
      onClick={(e: ThreeEvent<MouseEvent>) => {
        e.stopPropagation();
        onSelect(id);
      }}
      onPointerOver={(e: ThreeEvent<PointerEvent>) => {
        e.stopPropagation();
        setHover(true);
      }}
      onPointerOut={() => setHover(false)}
    >
      {children}
      {(selected || hover) && (
        <mesh ref={ring} rotation={[-Math.PI / 2, 0, 0]} position={[0, 0.08, 0]} raycast={noRaycast}>
          <ringGeometry args={[ringRadius, ringRadius + 0.35, 56]} />
          <meshBasicMaterial color={selected ? '#22d3ee' : '#fde68a'} transparent opacity={0.9} />
        </mesh>
      )}
    </group>
  );
}

/* ------------------------------- edificios ---------------------------- */

function Habitat({ crewHealth }: { crewHealth: number }) {
  const lightColor = crewHealth < 40 ? '#f87171' : crewHealth < 70 ? '#fbbf24' : '#fff1cf';
  const trees = useMemo(() => {
    const r = seeded(5);
    return Array.from({ length: 9 }, () => {
      const a = r() * Math.PI * 2;
      const d = 2.4 + r() * 2.4;
      return { x: Math.cos(a) * d, z: Math.sin(a) * d, s: 0.6 + r() * 0.6 };
    });
  }, []);

  return (
    <group>
      <mesh position={[0, 0.2, 0]} castShadow receiveShadow>
        <cylinderGeometry args={[6.6, 6.9, 0.45, 48]} />
        <meshStandardMaterial color="#cbd5e1" metalness={0.4} roughness={0.5} />
      </mesh>
      <mesh position={[0, 0.46, 0]} receiveShadow>
        <cylinderGeometry args={[6.1, 6.1, 0.1, 48]} />
        <meshStandardMaterial color="#3f7d4a" roughness={1} />
      </mesh>

      <mesh position={[0, 2.4, 0]} castShadow>
        <cylinderGeometry args={[1.1, 1.4, 4.4, 16]} />
        <meshStandardMaterial color="#f1f5f9" metalness={0.3} roughness={0.4} />
      </mesh>
      <mesh position={[0, 4.8, 0]}>
        <coneGeometry args={[1.5, 1.1, 16]} />
        <meshStandardMaterial color="#ea6a2a" />
      </mesh>
      {[0, 1, 2, 3].map((i) => {
        const a = (i / 4) * Math.PI * 2 + 0.6;
        return (
          <group key={i} position={[Math.cos(a) * 3.6, 0, Math.sin(a) * 3.6]} rotation={[0, -a, 0]}>
            <mesh position={[0, 0.95, 0]} castShadow>
              <boxGeometry args={[1.8, 1.5, 1.4]} />
              <meshStandardMaterial color="#e2e8f0" metalness={0.2} roughness={0.5} />
            </mesh>
            <mesh position={[0, 1.8, 0]}>
              <boxGeometry args={[2, 0.22, 1.6]} />
              <meshStandardMaterial color="#ea6a2a" />
            </mesh>
            <mesh position={[0.92, 1.05, 0]}>
              <boxGeometry args={[0.04, 0.5, 0.8]} />
              <meshStandardMaterial color={lightColor} emissive={lightColor} emissiveIntensity={1.6} />
            </mesh>
          </group>
        );
      })}
      {trees.map((t, i) => (
        <group key={i} position={[t.x, 0.5, t.z]} scale={t.s}>
          <mesh position={[0, 0.3, 0]}>
            <cylinderGeometry args={[0.07, 0.09, 0.6, 6]} />
            <meshStandardMaterial color="#6b4423" />
          </mesh>
          <mesh position={[0, 0.9, 0]}>
            <coneGeometry args={[0.42, 1, 8]} />
            <meshStandardMaterial color="#2f9e57" flatShading />
          </mesh>
        </group>
      ))}
      <pointLight position={[0, 3.5, 0]} color={lightColor} intensity={14} distance={13} />

      {/* Cúpula de cristal y estructura geodésica */}
      <mesh position={[0, 0.5, 0]} raycast={noRaycast}>
        <sphereGeometry args={[6.1, 48, 24, 0, Math.PI * 2, 0, Math.PI / 2]} />
        <meshStandardMaterial
          color="#bfe9ff"
          transparent
          opacity={0.16}
          roughness={0.1}
          metalness={0.3}
          depthWrite={false}
          side={THREE.DoubleSide}
        />
      </mesh>
      <mesh position={[0, 0.5, 0]} raycast={noRaycast}>
        <icosahedronGeometry args={[6.15, 2]} />
        <meshBasicMaterial color="#e8f6ff" wireframe transparent opacity={0.4} />
      </mesh>
    </group>
  );
}

function Greenhouse({ food }: { food: number }) {
  const growth = 0.35 + (food / 100) * 0.65;
  const plants = useMemo(() => {
    const r = seeded(31);
    return Array.from({ length: 12 }, () => {
      const a = r() * Math.PI * 2;
      const d = r() * 1.9;
      return { x: Math.cos(a) * d, z: Math.sin(a) * d, s: 0.5 + r() * 0.5 };
    });
  }, []);
  return (
    <group>
      <mesh position={[0, 0.15, 0]} receiveShadow>
        <cylinderGeometry args={[3.1, 3.2, 0.3, 32]} />
        <meshStandardMaterial color="#cbd5e1" />
      </mesh>
      {plants.map((p, i) => (
        <mesh key={i} position={[p.x, 0.5 + p.s * growth * 0.5, p.z]} scale={[1, growth * p.s + 0.3, 1]}>
          <sphereGeometry args={[0.38, 10, 8]} />
          <meshStandardMaterial color="#3fbf6a" emissive="#14803a" emissiveIntensity={0.6} flatShading />
        </mesh>
      ))}
      <mesh position={[0, 0.3, 0]} raycast={noRaycast}>
        <sphereGeometry args={[3, 28, 14, 0, Math.PI * 2, 0, Math.PI / 2]} />
        <meshStandardMaterial color="#c8f5d8" transparent opacity={0.22} depthWrite={false} side={THREE.DoubleSide} />
      </mesh>
      <pointLight position={[0, 2, 0]} color="#d946ef" intensity={5} distance={7} />
      {/* Hitbox invisible para facilitar el clic */}
      <mesh position={[0, 1.4, 0]} visible={false}>
        <cylinderGeometry args={[3.2, 3.2, 3, 12]} />
      </mesh>
    </group>
  );
}

function ScienceLab({ science }: { science: number }) {
  const dish = useRef<THREE.Group>(null);
  const motion = useMotion();
  useFrame((_, dt) => {
    if (dish.current && motion) dish.current.rotation.y += dt * 0.8;
  });
  return (
    <group>
      <mesh position={[0, 1.1, 0]} castShadow receiveShadow>
        <boxGeometry args={[4.4, 2.2, 3.2]} />
        <meshStandardMaterial color="#eef2f7" metalness={0.25} roughness={0.5} />
      </mesh>
      <mesh position={[0, 1.15, 1.62]}>
        <boxGeometry args={[3.4, 0.9, 0.06]} />
        <meshStandardMaterial color="#38bdf8" emissive="#0ea5e9" emissiveIntensity={1.4} />
      </mesh>
      <mesh position={[0, 0.5, 1.63]}>
        <boxGeometry args={[4.4, 0.18, 0.04]} />
        <meshStandardMaterial color="#ea6a2a" />
      </mesh>
      <group ref={dish} position={[1.1, 2.2, 0]}>
        <mesh position={[0, 0.45, 0]}>
          <cylinderGeometry args={[0.07, 0.07, 0.9, 8]} />
          <meshStandardMaterial color="#94a3b8" />
        </mesh>
        <mesh position={[0, 1, 0]} rotation={[0.6, 0, 0]}>
          <sphereGeometry args={[0.7, 20, 10, 0, Math.PI * 2, 0, Math.PI / 2.4]} />
          <meshStandardMaterial color="#f8fafc" side={THREE.DoubleSide} metalness={0.4} />
        </mesh>
      </group>
      {/* Baliza de ciencia: crece con los puntos de investigación */}
      <mesh position={[-1.3, 2.9 + science / 90, 0]} scale={0.25 + science / 130}>
        <octahedronGeometry args={[1, 0]} />
        <meshStandardMaterial color="#c084fc" emissive="#a855f7" emissiveIntensity={1.8} flatShading />
      </mesh>
    </group>
  );
}

function OxygenGenerator({ oxygen }: { oxygen: number }) {
  const bubbles = useRef<THREE.Group>(null);
  const motion = useMotion();
  const glow = 0.4 + (oxygen / 100) * 1.8;
  useFrame(({ clock }) => {
    if (!bubbles.current || !motion) return;
    bubbles.current.children.forEach((child, i) => {
      const t = (clock.elapsedTime * 0.5 + i * 0.27) % 1;
      child.position.y = 1 + t * 3.2;
      child.scale.setScalar(0.6 + t * 0.6);
    });
  });
  return (
    <group>
      {[-1.1, 1.1].map((x) => (
        <mesh key={x} position={[x, 2, 0]} castShadow>
          <cylinderGeometry args={[0.85, 0.85, 4, 20]} />
          <meshStandardMaterial
            color="#7dd3fc"
            emissive="#22d3ee"
            emissiveIntensity={glow * 0.5}
            metalness={0.5}
            roughness={0.3}
            transparent
            opacity={0.85}
          />
        </mesh>
      ))}
      <mesh position={[0, 3.2, 0]} rotation={[0, 0, Math.PI / 2]}>
        <cylinderGeometry args={[0.18, 0.18, 2.4, 8]} />
        <meshStandardMaterial color="#94a3b8" metalness={0.6} />
      </mesh>
      <mesh position={[0, 0.4, 0]} receiveShadow>
        <boxGeometry args={[3.8, 0.8, 2]} />
        <meshStandardMaterial color="#e2e8f0" />
      </mesh>
      <group ref={bubbles} position={[-1.1, 0, 0]}>
        {[0, 1, 2, 3, 4].map((i) => (
          <mesh key={i} position={[((i % 3) - 1) * 0.25, 1 + i * 0.5, 0]}>
            <sphereGeometry args={[0.13, 8, 8]} />
            <meshBasicMaterial color="#e0f2fe" transparent opacity={0.8} />
          </mesh>
        ))}
      </group>
      <pointLight position={[0, 3, 0]} color="#22d3ee" intensity={glow * 3} distance={7} />
    </group>
  );
}

function Batteries({ energy }: { energy: number }) {
  const cells = 4;
  const lit = Math.ceil(energy / (100 / cells));
  const color = energy <= 25 ? '#ef4444' : energy <= 50 ? '#f59e0b' : '#22c55e';
  return (
    <group>
      <mesh position={[0, 0.2, 0]} receiveShadow>
        <boxGeometry args={[6.4, 0.4, 2.6]} />
        <meshStandardMaterial color="#cbd5e1" />
      </mesh>
      {Array.from({ length: cells }, (_, i) => {
        const on = i < lit;
        return (
          <group key={i} position={[(i - (cells - 1) / 2) * 1.45, 0, 0]}>
            <mesh position={[0, 1.55, 0]} castShadow>
              <cylinderGeometry args={[0.6, 0.6, 2.3, 16]} />
              <meshStandardMaterial
                color={on ? color : '#334155'}
                emissive={on ? color : '#000000'}
                emissiveIntensity={on ? 1.2 : 0}
                metalness={0.4}
                roughness={0.4}
              />
            </mesh>
            <mesh position={[0, 2.8, 0]}>
              <cylinderGeometry args={[0.22, 0.22, 0.2, 8]} />
              <meshStandardMaterial color="#e2e8f0" />
            </mesh>
          </group>
        );
      })}
    </group>
  );
}

function SolarPanels({ storm }: { storm: boolean }) {
  const facing = Math.atan2(-SUN_POSITION.x, -SUN_POSITION.z);
  const emissive = storm ? 0.15 : 0.9;
  return (
    <group rotation={[0, facing, 0]}>
      {[-1, 0, 1].map((row) =>
        [-1.5, -0.5, 0.5, 1.5].map((col) => (
          <group key={`${row}-${col}`} position={[col * 2.9, 0, row * 2.6]}>
            <mesh position={[0, 0.55, 0]}>
              <cylinderGeometry args={[0.07, 0.09, 1.1, 6]} />
              <meshStandardMaterial color="#94a3b8" />
            </mesh>
            <mesh position={[0, 1.2, 0]} rotation={[-0.9, 0, 0]} castShadow>
              <boxGeometry args={[2.6, 0.08, 1.7]} />
              <meshStandardMaterial
                color="#1e3a8a"
                emissive="#2563eb"
                emissiveIntensity={emissive}
                metalness={0.8}
                roughness={0.2}
              />
            </mesh>
          </group>
        )),
      )}
    </group>
  );
}

function RadiationShelter({ protection }: { protection: number }) {
  const glow = 0.3 + (protection / 100) * 1.6;
  return (
    <group>
      <mesh position={[0, 0, 0]} castShadow receiveShadow>
        <sphereGeometry args={[2.8, 28, 14, 0, Math.PI * 2, 0, Math.PI / 2]} />
        <meshStandardMaterial color="#4f46e5" metalness={0.6} roughness={0.35} emissive="#6366f1" emissiveIntensity={glow * 0.3} />
      </mesh>
      <mesh position={[0, 0.85, 2.55]} castShadow>
        <boxGeometry args={[1.3, 1.7, 0.5]} />
        <meshStandardMaterial color="#1e1b4b" />
      </mesh>
      <mesh position={[0, 0.8, 2.82]}>
        <boxGeometry args={[1.35, 0.14, 0.03]} />
        <meshStandardMaterial color="#facc15" emissive="#facc15" emissiveIntensity={0.9} />
      </mesh>
      <mesh position={[0, 3.2, 0]}>
        <torusGeometry args={[0.45, 0.07, 8, 24]} />
        <meshStandardMaterial color="#facc15" emissive="#facc15" emissiveIntensity={glow} />
      </mesh>
      <pointLight position={[0, 2, 0]} color="#818cf8" intensity={glow * 3} distance={8} />
    </group>
  );
}

function CommsAntenna({ delaySeconds }: { delaySeconds: number }) {
  const dish = useRef<THREE.Group>(null);
  const rings = useRef<THREE.Group>(null);
  const motion = useMotion();
  useFrame(({ clock }, dt) => {
    if (dish.current && motion) dish.current.rotation.y += dt * 0.35;
    if (rings.current && motion) {
      rings.current.children.forEach((child, i) => {
        const t = (clock.elapsedTime / delaySeconds + i / 3) % 1;
        child.scale.setScalar(0.4 + t * 3.2);
        const mesh = child as THREE.Mesh;
        (mesh.material as THREE.MeshBasicMaterial).opacity = (1 - t) * 0.7;
      });
    }
  });
  return (
    <group>
      <mesh position={[0, 0.3, 0]} receiveShadow>
        <cylinderGeometry args={[1.2, 1.5, 0.6, 12]} />
        <meshStandardMaterial color="#cbd5e1" />
      </mesh>
      <mesh position={[0, 4.2, 0]} castShadow>
        <cylinderGeometry args={[0.12, 0.2, 8, 8]} />
        <meshStandardMaterial color="#f1f5f9" metalness={0.5} />
      </mesh>
      <group ref={dish} position={[0, 7.4, 0]}>
        <mesh rotation={[-0.7, 0, 0]} position={[0, 0.3, 0.3]}>
          <sphereGeometry args={[1.5, 24, 12, 0, Math.PI * 2, 0, Math.PI / 2.3]} />
          <meshStandardMaterial color="#f8fafc" metalness={0.5} roughness={0.3} side={THREE.DoubleSide} />
        </mesh>
      </group>
      <mesh position={[0, 8.3, 0]}>
        <sphereGeometry args={[0.2, 10, 10]} />
        <meshBasicMaterial color="#ef4444" />
      </mesh>
      {/* Ondas hacia la Tierra: el retardo es parte del juego */}
      <group ref={rings} position={[0, 8.6, 0]} rotation={[Math.PI / 2, 0, 0]}>
        {[0, 1, 2].map((i) => (
          <mesh key={i}>
            <ringGeometry args={[0.9, 1, 32]} />
            <meshBasicMaterial color="#67e8f9" transparent opacity={0.5} side={THREE.DoubleSide} depthWrite={false} />
          </mesh>
        ))}
      </group>
    </group>
  );
}

function Tubes() {
  const targets: BuildingId[] = [
    'GREENHOUSE',
    'SCIENCE_LAB',
    'OXYGEN_GENERATOR',
    'BATTERIES',
    'SOLAR_PANELS',
    'RADIATION_SHELTER',
    'COMMS_ANTENNA',
  ];
  return (
    <group>
      {targets.map((id) => {
        const [x, , z] = BUILDING_LAYOUT[id].position;
        const len = Math.hypot(x, z);
        const start = 6.4;
        const tubeLen = len - start - 2.4;
        const mid = start + tubeLen / 2;
        const ux = x / len;
        const uz = z / len;
        return (
          <mesh
            key={id}
            position={[ux * mid, 0.28, uz * mid]}
            rotation={[0, Math.atan2(ux, uz), 0]}
            raycast={noRaycast}
            receiveShadow
          >
            <boxGeometry args={[0.7, 0.4, tubeLen]} />
            <meshStandardMaterial color="#94a3b8" metalness={0.5} roughness={0.5} />
          </mesh>
        );
      })}
    </group>
  );
}

/* -------------------------- vehículos y tripulación -------------------- */

function Rover() {
  const group = useRef<THREE.Group>(null);
  const wheels = useRef<THREE.Group>(null);
  const motion = useMotion();
  useFrame(({ clock }) => {
    if (!group.current || !motion) return;
    const t = clock.elapsedTime * 0.12;
    const x = Math.cos(t) * 24;
    const z = Math.sin(t) * 19;
    group.current.position.set(x, heightAt(x, z) + 0.55, z);
    group.current.rotation.y = Math.atan2(-Math.sin(t) * 24, Math.cos(t) * 19);
    if (wheels.current) wheels.current.children.forEach((w) => (w.rotation.x = clock.elapsedTime * 4));
  });
  return (
    <group ref={group} position={[24, 0.55, 0]} scale={1.15} raycast={noRaycast}>
      <mesh position={[0, 0.5, 0]} castShadow>
        <boxGeometry args={[1.2, 0.5, 2]} />
        <meshStandardMaterial color="#f8fafc" metalness={0.3} roughness={0.5} />
      </mesh>
      <mesh position={[0, 0.78, -0.2]}>
        <boxGeometry args={[1, 0.18, 1.2]} />
        <meshStandardMaterial color="#ea6a2a" />
      </mesh>
      <mesh position={[0.35, 1.25, 0.55]}>
        <cylinderGeometry args={[0.04, 0.04, 0.9, 6]} />
        <meshStandardMaterial color="#94a3b8" />
      </mesh>
      <mesh position={[0.35, 1.72, 0.55]}>
        <boxGeometry args={[0.28, 0.16, 0.16]} />
        <meshStandardMaterial color="#1e293b" emissive="#38bdf8" emissiveIntensity={0.6} />
      </mesh>
      <group ref={wheels}>
        {[-0.75, 0, 0.75].flatMap((zz) =>
          [-0.7, 0.7].map((xx) => (
            <mesh key={`${xx}-${zz}`} position={[xx, 0.28, zz]} rotation={[0, 0, Math.PI / 2]} castShadow>
              <cylinderGeometry args={[0.32, 0.32, 0.26, 14]} />
              <meshStandardMaterial color="#1f2937" roughness={0.9} />
            </mesh>
          )),
        )}
      </group>
    </group>
  );
}

function Astronaut({ radius, speed, phase, suit }: { radius: number; speed: number; phase: number; suit: string }) {
  const group = useRef<THREE.Group>(null);
  const motion = useMotion();
  useFrame(({ clock }) => {
    if (!group.current) return;
    const t = motion ? clock.elapsedTime * speed + phase : phase;
    const x = Math.cos(t) * radius;
    const z = Math.sin(t) * radius;
    const bob = motion ? Math.abs(Math.sin(clock.elapsedTime * 6 + phase)) * 0.09 : 0;
    group.current.position.set(x, 0.5 + bob, z);
    group.current.rotation.y = Math.atan2(-Math.sin(t), Math.cos(t));
  });
  return (
    <group ref={group} raycast={noRaycast}>
      <mesh position={[0, 0.5, 0]} castShadow>
        <capsuleGeometry args={[0.26, 0.5, 4, 10]} />
        <meshStandardMaterial color="#f8fafc" roughness={0.6} />
      </mesh>
      <mesh position={[0, 1.08, 0]} castShadow>
        <sphereGeometry args={[0.27, 14, 12]} />
        <meshStandardMaterial color="#f8fafc" roughness={0.5} />
      </mesh>
      <mesh position={[0, 1.1, 0.12]}>
        <sphereGeometry args={[0.2, 12, 10, 0, Math.PI * 2, 0, Math.PI / 1.8]} />
        <meshStandardMaterial color="#fbbf24" metalness={0.9} roughness={0.15} />
      </mesh>
      <mesh position={[0, 0.55, -0.27]}>
        <boxGeometry args={[0.36, 0.5, 0.18]} />
        <meshStandardMaterial color={suit} />
      </mesh>
    </group>
  );
}

function Crew({ crewHealth }: { crewHealth: number }) {
  const slow = crewHealth < 40 ? 0.5 : 1;
  const suits = ['#ea6a2a', '#22d3ee', '#a3e635', '#f472b6'];
  return (
    <group>
      {suits.map((suit, i) => (
        <Astronaut key={suit} radius={16.5 + (i % 2) * 1.1} speed={(i % 2 ? -0.14 : 0.16) * slow} phase={(i / 4) * Math.PI * 2} suit={suit} />
      ))}
    </group>
  );
}

/* ----------------------- clima: polvo, radiación, escudo --------------- */

function DustStorm({ active }: { active: boolean }) {
  const COUNT = 2400;
  const points = useRef<THREE.Points>(null);
  const motion = useMotion();
  const positions = useMemo(() => {
    const r = seeded(7);
    const arr = new Float32Array(COUNT * 3);
    for (let i = 0; i < COUNT; i++) {
      arr[i * 3] = (r() - 0.5) * 100;
      arr[i * 3 + 1] = r() * 18 + 0.3;
      arr[i * 3 + 2] = (r() - 0.5) * 100;
    }
    return arr;
  }, []);

  useFrame((_, dt) => {
    if (!active || !motion || !points.current) return;
    const attr = points.current.geometry.attributes.position as THREE.BufferAttribute;
    const arr = attr.array as Float32Array;
    for (let i = 0; i < COUNT; i++) {
      arr[i * 3] += dt * 11;
      arr[i * 3 + 2] += dt * 3.5;
      if (arr[i * 3] > 50) arr[i * 3] -= 100;
      if (arr[i * 3 + 2] > 50) arr[i * 3 + 2] -= 100;
    }
    attr.needsUpdate = true;
  });

  return (
    <points ref={points} visible={active} raycast={noRaycast} frustumCulled={false}>
      <bufferGeometry>
        <bufferAttribute attach="attributes-position" args={[positions, 3]} />
      </bufferGeometry>
      <pointsMaterial color="#e3975c" size={0.3} transparent opacity={0.55} depthWrite={false} sizeAttenuation />
    </points>
  );
}

function SolarParticles({ active }: { active: boolean }) {
  const COUNT = 700;
  const points = useRef<THREE.Points>(null);
  const motion = useMotion();
  const seedData = useMemo(() => {
    const r = seeded(99);
    const arr = new Float32Array(COUNT * 4);
    for (let i = 0; i < COUNT; i++) {
      arr[i * 4] = r(); // progreso inicial
      arr[i * 4 + 1] = (r() - 0.5) * 70; // desvío x
      arr[i * 4 + 2] = (r() - 0.5) * 40; // desvío y
      arr[i * 4 + 3] = 0.5 + r() * 0.8; // velocidad
    }
    return arr;
  }, []);
  const positions = useMemo(() => new Float32Array(COUNT * 3), []);

  useFrame(({ clock }) => {
    if (!active || !points.current) return;
    const attr = points.current.geometry.attributes.position as THREE.BufferAttribute;
    const arr = attr.array as Float32Array;
    const time = motion ? clock.elapsedTime : 0;
    const start = SUN_POSITION.clone().multiplyScalar(2);
    for (let i = 0; i < COUNT; i++) {
      const t = (seedData[i * 4] + time * 0.12 * seedData[i * 4 + 3]) % 1;
      arr[i * 3] = start.x * (1 - t) + seedData[i * 4 + 1] * (1 - t * 0.4);
      arr[i * 3 + 1] = Math.max(1, start.y * (1 - t) + seedData[i * 4 + 2] * (1 - t * 0.5) + 6 * t);
      arr[i * 3 + 2] = start.z * (1 - t);
    }
    attr.needsUpdate = true;
  });

  return (
    <points ref={points} visible={active} raycast={noRaycast} frustumCulled={false}>
      <bufferGeometry>
        <bufferAttribute attach="attributes-position" args={[positions, 3]} />
      </bufferGeometry>
      <pointsMaterial color="#e9b8ff" size={0.45} transparent opacity={0.85} depthWrite={false} sizeAttenuation fog={false} />
    </points>
  );
}

function ShieldBubble({ protection, flaring }: { protection: number; flaring: boolean }) {
  const material = useRef<THREE.MeshBasicMaterial>(null);
  const motion = useMotion();
  useFrame(({ clock }) => {
    if (!material.current) return;
    const base = 0.015 + (protection / 100) * 0.035;
    const flash = flaring ? (motion ? 0.16 + 0.1 * Math.sin(clock.elapsedTime * 4) : 0.2) : 0;
    material.current.opacity = base + flash;
    material.current.color.set(flaring ? '#c084fc' : protection < 35 ? '#f87171' : '#38bdf8');
  });
  return (
    <mesh raycast={noRaycast}>
      <sphereGeometry args={[19, 48, 24, 0, Math.PI * 2, 0, Math.PI / 2]} />
      <meshBasicMaterial ref={material} color="#38bdf8" transparent opacity={0.1} side={THREE.DoubleSide} depthWrite={false} />
    </mesh>
  );
}

/* ------------------------------- cámara -------------------------------- */

function ExplorerController({
  firstPerson,
  reducedMotion,
  onNearbyChange,
  onEnterBuilding,
}: {
  firstPerson: boolean;
  reducedMotion: boolean;
  onNearbyChange: (id: BuildingId | null) => void;
  onEnterBuilding: (id: BuildingId) => void;
}) {
  const { camera, gl } = useThree();
  const astronaut = useRef<THREE.Group>(null);
  const position = useRef(new THREE.Vector3(0, 0, 26));
  const yaw = useRef(0);
  const pitch = useRef(-0.08);
  const keys = useRef(new Set<string>());
  const nearby = useRef<BuildingId | null>(null);
  const dragging = useRef(false);
  const [locomotion, setLocomotion] = useState<Locomotion>('idle');
  const activeLocomotion = useRef<Locomotion>('idle');
  const target = useMemo(() => new THREE.Vector3(), []);
  const direction = useMemo(() => new THREE.Vector3(), []);
  // Vanguard faces -X in its source file; align that axis with travel direction.
  const vanguardForwardOffset = Math.PI / 2;
  const heading = useRef(Math.PI + vanguardForwardOffset);

  useEffect(() => {
    const isTyping = (event: KeyboardEvent) => event.target instanceof HTMLElement && Boolean(event.target.closest('input, textarea, select, [contenteditable]'));
    const keyDown = (event: KeyboardEvent) => {
      if (isTyping(event)) return;
      const key = event.key.toLowerCase();
      if (['w', 'a', 's', 'd', 'arrowup', 'arrowdown', 'arrowleft', 'arrowright', 'shift'].includes(key)) {
        keys.current.add(key);
        if (key.startsWith('arrow')) event.preventDefault();
      }
      if (key === 'e' && !event.repeat && nearby.current) onEnterBuilding(nearby.current);
    };
    const keyUp = (event: KeyboardEvent) => keys.current.delete(event.key.toLowerCase());
    const blur = () => keys.current.clear();
    window.addEventListener('keydown', keyDown);
    window.addEventListener('keyup', keyUp);
    window.addEventListener('blur', blur);
    return () => {
      window.removeEventListener('keydown', keyDown);
      window.removeEventListener('keyup', keyUp);
      window.removeEventListener('blur', blur);
    };
  }, [onEnterBuilding]);

  useEffect(() => {
    const element = gl.domElement;
    const down = (event: PointerEvent) => { dragging.current = true; element.setPointerCapture(event.pointerId); };
    const up = () => { dragging.current = false; };
    const move = (event: PointerEvent) => {
      if (!dragging.current) return;
      yaw.current -= event.movementX * 0.005;
      pitch.current = THREE.MathUtils.clamp(pitch.current - event.movementY * 0.003, -0.55, 0.45);
    };
    element.addEventListener('pointerdown', down);
    element.addEventListener('pointerup', up);
    element.addEventListener('pointercancel', up);
    element.addEventListener('pointermove', move);
    return () => {
      element.removeEventListener('pointerdown', down);
      element.removeEventListener('pointerup', up);
      element.removeEventListener('pointercancel', up);
      element.removeEventListener('pointermove', move);
    };
  }, [gl]);

  useFrame((_, rawDelta) => {
    const delta = Math.min(rawDelta, 0.05);
    const x = Number(keys.current.has('d') || keys.current.has('arrowright')) - Number(keys.current.has('a') || keys.current.has('arrowleft'));
    const z = Number(keys.current.has('s') || keys.current.has('arrowdown')) - Number(keys.current.has('w') || keys.current.has('arrowup'));
    const nextLocomotion: Locomotion = x || z ? (keys.current.has('shift') ? 'run' : 'walk') : 'idle';
    if (nextLocomotion !== activeLocomotion.current) {
      activeLocomotion.current = nextLocomotion;
      setLocomotion(nextLocomotion);
    }
    if (x || z) {
      direction.set(x, 0, z).normalize().applyAxisAngle(THREE.Object3D.DEFAULT_UP, yaw.current);
      const speed = keys.current.has('shift') ? 8 : 4.8;
      position.current.addScaledVector(direction, delta * speed);
      const resolved = resolveWorldCollisions(position.current.x, position.current.z, 0.55, 36);
      position.current.x = resolved.x;
      position.current.z = resolved.z;
      const desiredHeading = Math.atan2(direction.x, direction.z) + vanguardForwardOffset;
      const difference = Math.atan2(Math.sin(desiredHeading - heading.current), Math.cos(desiredHeading - heading.current));
      heading.current += difference * (1 - Math.exp(-12 * delta));
    }
    position.current.y = heightAt(position.current.x, position.current.z);
    if (astronaut.current) {
      astronaut.current.position.copy(position.current);
      astronaut.current.rotation.y = heading.current;
    }

    let closest: BuildingId | null = null;
    let closestDistance = Infinity;
    for (const [id, layout] of Object.entries(BUILDING_LAYOUT) as [BuildingId, typeof BUILDING_LAYOUT[BuildingId]][]) {
      const distance = Math.hypot(position.current.x - layout.position[0], position.current.z - layout.position[2]);
      const radius = id === 'HABITAT' ? 8.8 : id === 'SOLAR_PANELS' ? 7.2 : 5.2;
      if (distance < radius && distance < closestDistance) { closest = id; closestDistance = distance; }
    }
    if (closest !== nearby.current) { nearby.current = closest; onNearbyChange(closest); }

    const eye = firstPerson ? 1.7 : 1.45;
    target.set(position.current.x, position.current.y + eye, position.current.z);
    const look = new THREE.Vector3(-Math.sin(yaw.current) * Math.cos(pitch.current), Math.sin(pitch.current), -Math.cos(yaw.current) * Math.cos(pitch.current));
    const desired = firstPerson
      ? target.clone()
      : target.clone().addScaledVector(look, -5.5).add(new THREE.Vector3(1.1, 1.7, 0).applyAxisAngle(THREE.Object3D.DEFAULT_UP, yaw.current));
    if (!firstPerson) {
      if (desired.y < 5.5) {
        const camResolved = resolveWorldCollisions(desired.x, desired.z, 0.45, 52);
        desired.x = camResolved.x;
        desired.z = camResolved.z;
      }
      desired.y = Math.max(desired.y, heightAt(desired.x, desired.z) + 0.65);
    }
    camera.position.lerp(desired, reducedMotion ? 1 : 1 - Math.exp(-9 * delta));
    camera.lookAt(target.clone().addScaledVector(look, 8));
  });

  return <group ref={astronaut} visible={!firstPerson} position={[0, 0, 26]} rotation={[0, Math.PI + vanguardForwardOffset, 0]}>
    <Suspense fallback={<mesh position={[0, 1, 0]} castShadow><capsuleGeometry args={[0.45, 1.1, 6, 12]} /><meshStandardMaterial color="#8a7768" roughness={1} /></mesh>}>
      <VanguardCharacter locomotion={locomotion} />
    </Suspense>
  </group>;
}

/* -------------------------------- escena ------------------------------- */

export interface MarsScene3DProps {
  resources: ResourceSnapshot;
  activeEventType: SpaceEventType | null;
  selectedBuilding: BuildingId | null;
  onSelectBuilding: (id: BuildingId) => void;
  reducedMotion: boolean;
  weatherLevel: SpaceWeatherLevel;
  interiorBuilding: BuildingId | null;
  onEnterBuilding: (id: BuildingId) => void;
  onInspect: (message: string) => void;
  firstPerson: boolean;
  onNearbyChange: (id: BuildingId | null) => void;
}

function detectWebGL(): boolean {
  try {
    const canvas = document.createElement('canvas');
    return Boolean(canvas.getContext('webgl2') ?? canvas.getContext('webgl'));
  } catch {
    return false;
  }
}

export default function MarsScene3D({
  resources,
  activeEventType,
  selectedBuilding,
  onSelectBuilding,
  reducedMotion,
  weatherLevel,
  interiorBuilding,
  onEnterBuilding,
  onInspect,
  firstPerson,
  onNearbyChange,
}: MarsScene3DProps) {
  const [webgl] = useState(detectWebGL);
  const storm = activeEventType === 'DUST_STORM';
  const flaring = activeEventType === 'SOLAR_EVENT';
  const animate = !reducedMotion;

  if (!webgl) {
    return (
      <div className="flex h-full w-full items-center justify-center bg-slate-950 p-6 text-center text-sm text-slate-300">
        Tu navegador no puede mostrar gráficos 3D (WebGL). Puedes seguir jugando con los botones de módulos y las tarjetas de decisión.
      </div>
    );
  }

  const select = (id: BuildingId) => {
    onSelectBuilding(id);
    onEnterBuilding(id);
  };

  return (
    <MotionContext.Provider value={animate}>
      <Canvas
        shadows="basic"
        dpr={[1, 1.75]}
        camera={{ position: [0, 6, 35], fov: 62, near: 0.25, far: 700 }}
        gl={{ antialias: true, powerPreference: 'high-performance' }}
        aria-label="Colonia marciana en 3D. Haz clic en un módulo para seleccionarlo."
      >
        {interiorBuilding ? (
          <ModuleInterior3D building={interiorBuilding} resources={resources} onInspect={onInspect} reducedMotion={reducedMotion} />
        ) : <>
        <Environment storm={storm} />
        <Sun level={weatherLevel} flaring={flaring} />
        <SkyBodies />
        <Terrain />
        <Scenery />
        <Tubes />

        <Interactive id="HABITAT" selected={selectedBuilding === 'HABITAT'} onSelect={select} ringRadius={7.2}>
          <Habitat crewHealth={resources.crewHealth} />
        </Interactive>
        <Interactive id="GREENHOUSE" selected={selectedBuilding === 'GREENHOUSE'} onSelect={select} ringRadius={3.6}>
          <Greenhouse food={resources.food} />
        </Interactive>
        <Interactive id="SCIENCE_LAB" selected={selectedBuilding === 'SCIENCE_LAB'} onSelect={select} ringRadius={3.4}>
          <ScienceLab science={resources.science} />
        </Interactive>
        <Interactive id="OXYGEN_GENERATOR" selected={selectedBuilding === 'OXYGEN_GENERATOR'} onSelect={select} ringRadius={3}>
          <OxygenGenerator oxygen={resources.oxygen} />
        </Interactive>
        <Interactive id="BATTERIES" selected={selectedBuilding === 'BATTERIES'} onSelect={select} ringRadius={3.6}>
          <Batteries energy={resources.energy} />
        </Interactive>
        <Interactive id="SOLAR_PANELS" selected={selectedBuilding === 'SOLAR_PANELS'} onSelect={select} ringRadius={6.4}>
          <SolarPanels storm={storm} />
        </Interactive>
        <Interactive id="RADIATION_SHELTER" selected={selectedBuilding === 'RADIATION_SHELTER'} onSelect={select} ringRadius={3.3}>
          <RadiationShelter protection={resources.radiationProtection} />
        </Interactive>
        <Interactive id="COMMS_ANTENNA" selected={selectedBuilding === 'COMMS_ANTENNA'} onSelect={select} ringRadius={1.9}>
          <CommsAntenna delaySeconds={6} />
        </Interactive>

        <Crew crewHealth={resources.crewHealth} />
        <Rover />
        <ShieldBubble protection={resources.radiationProtection} flaring={flaring} />
        <DustStorm active={storm} />
        <SolarParticles active={flaring} />

        <ExplorerController firstPerson={firstPerson} reducedMotion={reducedMotion} onNearbyChange={onNearbyChange} onEnterBuilding={onEnterBuilding} />
        </>}
      </Canvas>
    </MotionContext.Provider>
  );
}
