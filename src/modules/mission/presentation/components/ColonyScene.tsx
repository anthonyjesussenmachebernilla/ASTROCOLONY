'use client';

import { Canvas, ThreeEvent, useFrame, useThree } from '@react-three/fiber';
import { useEffect, useMemo, useRef, useState } from 'react';
import * as THREE from 'three';
import type { BuildingId } from '@/modules/simulation/domain/types';

type Props = {
  selectedBuilding: BuildingId | null;
  onSelectBuilding: (id: BuildingId) => void;
  reducedMotion: boolean;
  dustStorm: boolean;
  solarEvent: boolean;
};

const MODULE_LABELS: Record<BuildingId, string> = {
  HABITAT: 'HÁBITAT', OXYGEN_GENERATOR: 'OXÍGENO', SOLAR_PANELS: 'PANELES',
  BATTERIES: 'BATERÍAS', GREENHOUSE: 'CULTIVOS', SCIENCE_LAB: 'LABORATORIO',
  RADIATION_SHELTER: 'REFUGIO', COMMS_ANTENNA: 'ANTENA NASA',
};

function ModuleLabel({ text, selected, height }: { text: string; selected: boolean; height: number }) {
  const texture = useMemo(() => {
    const canvas = document.createElement('canvas');
    canvas.width = 512;
    canvas.height = 128;
    const context = canvas.getContext('2d');
    if (context) {
      context.fillStyle = selected ? 'rgba(7, 40, 53, .94)' : 'rgba(15, 23, 42, .85)';
      context.beginPath();
      context.roundRect(8, 10, 496, 106, 28);
      context.fill();
      context.strokeStyle = selected ? '#67e8f9' : '#e2e8f0';
      context.lineWidth = 5;
      context.stroke();
      context.fillStyle = '#ffffff';
      context.font = 'bold 46px Arial';
      context.textAlign = 'center';
      context.textBaseline = 'middle';
      context.fillText(text, 256, 64);
    }
    const result = new THREE.CanvasTexture(canvas);
    result.colorSpace = THREE.SRGBColorSpace;
    return result;
  }, [text, selected]);
  useEffect(() => () => texture.dispose(), [texture]);
  return <sprite position={[0, height, 0]} scale={[3.5, 0.88, 1]}><spriteMaterial map={texture} transparent depthTest={false} /></sprite>;
}

function CameraRig({ reducedMotion }: { reducedMotion: boolean }) {
  const { camera, gl } = useThree();
  const orbit = useRef({ angle: 0.62, elevation: 0.55, radius: 24 });
  const drag = useRef<{ x: number; y: number } | null>(null);

  useEffect(() => {
    const element = gl.domElement;
    const down = (event: PointerEvent) => {
      drag.current = { x: event.clientX, y: event.clientY };
      element.setPointerCapture(event.pointerId);
    };
    const move = (event: PointerEvent) => {
      if (!drag.current) return;
      orbit.current.angle -= (event.clientX - drag.current.x) * 0.005;
      orbit.current.elevation = THREE.MathUtils.clamp(
        orbit.current.elevation + (event.clientY - drag.current.y) * 0.003,
        0.18,
        1.1,
      );
      drag.current = { x: event.clientX, y: event.clientY };
    };
    const up = () => { drag.current = null; };
    const wheel = (event: WheelEvent) => {
      event.preventDefault();
      orbit.current.radius = THREE.MathUtils.clamp(orbit.current.radius + event.deltaY * 0.018, 14, 38);
    };
    element.addEventListener('pointerdown', down);
    element.addEventListener('pointermove', move);
    element.addEventListener('pointerup', up);
    element.addEventListener('pointercancel', up);
    element.addEventListener('wheel', wheel, { passive: false });
    return () => {
      element.removeEventListener('pointerdown', down);
      element.removeEventListener('pointermove', move);
      element.removeEventListener('pointerup', up);
      element.removeEventListener('pointercancel', up);
      element.removeEventListener('wheel', wheel);
    };
  }, [gl]);

  useFrame((_, delta) => {
    const { angle, elevation, radius } = orbit.current;
    const target = new THREE.Vector3(
      Math.sin(angle) * Math.cos(elevation) * radius,
      Math.sin(elevation) * radius,
      Math.cos(angle) * Math.cos(elevation) * radius,
    );
    camera.position.lerp(target, reducedMotion ? 1 : Math.min(1, delta * 5));
    camera.lookAt(0, 0.7, 0);
  });
  return null;
}

function Terrain() {
  const geometry = useMemo(() => {
    const plane = new THREE.PlaneGeometry(150, 150, 90, 90);
    plane.rotateX(-Math.PI / 2);
    const positions = plane.attributes.position;
    for (let i = 0; i < positions.count; i++) {
      const x = positions.getX(i);
      const z = positions.getZ(i);
      const distance = Math.hypot(x, z);
      const ridge = Math.max(0, distance - 17) * 0.11;
      const height = ridge * (1.2 + Math.sin(x * 0.23) * Math.cos(z * 0.19))
        + Math.sin(x * 0.55) * Math.cos(z * 0.41) * 0.24
        + Math.sin(x * 1.71 + z * 0.9) * 0.08;
      positions.setY(i, height);
    }
    plane.computeVertexNormals();
    return plane;
  }, []);
  return <mesh geometry={geometry} receiveShadow><meshStandardMaterial color="#ad5534" roughness={1} /></mesh>;
}

function Module({ id, position, children, selected, onSelect, labelHeight, radius }: {
  id: BuildingId;
  position: [number, number, number];
  children: React.ReactNode;
  selected: boolean;
  onSelect: (id: BuildingId) => void;
  labelHeight: number;
  radius: number;
}) {
  const select = (event: ThreeEvent<MouseEvent>) => {
    event.stopPropagation();
    onSelect(id);
  };
  return (
    <group position={position} onClick={select} onPointerOver={(event) => { event.stopPropagation(); document.body.style.cursor = 'pointer'; }} onPointerOut={() => { document.body.style.cursor = 'auto'; }}>
      {children}
      <ModuleLabel text={MODULE_LABELS[id]} selected={selected} height={labelHeight} />
      {selected && <mesh position={[0, 0.04, 0]} rotation={[-Math.PI / 2, 0, 0]}>
        <ringGeometry args={[radius, radius + 0.12, 48]} />
        <meshBasicMaterial color="#57e9f6" side={THREE.DoubleSide} />
      </mesh>}
    </group>
  );
}

function Dome({ color = '#d9e9e7', radius = 2.2 }: { color?: string; radius?: number }) {
  return <>
    <mesh position={[0, 0.32, 0]} castShadow receiveShadow>
      <cylinderGeometry args={[radius, radius, 0.6, 32]} />
      <meshStandardMaterial color="#d9c8ac" metalness={0.3} roughness={0.55} />
    </mesh>
    <mesh position={[0, 0.62, 0]} castShadow>
      <sphereGeometry args={[radius, 20, 12, 0, Math.PI * 2, 0, Math.PI / 2]} />
      <meshStandardMaterial color={color} metalness={0.28} roughness={0.35} transparent opacity={0.77} side={THREE.DoubleSide} />
    </mesh>
    <mesh position={[0, 0.63, 0]}>
      <sphereGeometry args={[radius + 0.015, 12, 7, 0, Math.PI * 2, 0, Math.PI / 2]} />
      <meshBasicMaterial color="#e3f5f4" wireframe transparent opacity={0.32} />
    </mesh>
    <mesh position={[0, 0.68, radius - 0.05]} castShadow>
      <boxGeometry args={[0.9, 1.05, 0.28]} />
      <meshStandardMaterial color="#f0e5cd" />
    </mesh>
  </>;
}

function SolarArray() {
  return <group>
    {[-2.25, -0.75, 0.75, 2.25].map((x) => <group key={x} position={[x, 0, 0]}>
      <mesh position={[0, 0.6, 0]} castShadow><cylinderGeometry args={[0.055, 0.08, 1.2, 8]} /><meshStandardMaterial color="#ddd8cc" /></mesh>
      <mesh position={[0, 1.15, 0]} rotation={[-0.32, 0, 0]} castShadow>
        <boxGeometry args={[1.3, 0.09, 2.15]} />
        <meshStandardMaterial color="#122945" metalness={0.65} roughness={0.2} />
      </mesh>
      <mesh position={[0, 1.21, 0]} rotation={[-0.32, 0, 0]}>
        <boxGeometry args={[1.24, 0.01, 0.06]} />
        <meshBasicMaterial color="#5fa8c4" />
      </mesh>
    </group>)}
  </group>;
}

function Greenhouse() {
  return <><Dome color="#8fd0a6" radius={1.65} />
    {[-0.65, 0, 0.65].map((x) => <group key={x} position={[x, 0.7, -0.25]}>
      <mesh position={[0, 0.3, 0]}><cylinderGeometry args={[0.06, 0.08, 0.6, 6]} /><meshStandardMaterial color="#4d7e3b" /></mesh>
      <mesh position={[0, 0.72, 0]}><coneGeometry args={[0.34, 0.75, 6]} /><meshStandardMaterial color="#3fb36b" /></mesh>
    </group>)}
  </>;
}

function BatteryBank() {
  return <group>{[-0.8, 0.8].map((x) => <group key={x} position={[x, 0, 0]}>
    <mesh position={[0, 0.65, 0]} castShadow><boxGeometry args={[1.3, 1.25, 1.35]} /><meshStandardMaterial color="#e5d9bd" metalness={0.35} /></mesh>
    <mesh position={[0, 0.75, 0.68]}><boxGeometry args={[0.9, 0.24, 0.04]} /><meshBasicMaterial color="#53ddcc" /></mesh>
    <mesh position={[0, 1.32, 0]}><boxGeometry args={[0.7, 0.1, 0.7]} /><meshStandardMaterial color="#40505b" /></mesh>
  </group>)}</group>;
}

function Shelter() {
  return <group>
    <mesh position={[0, 0.7, 0]} castShadow><boxGeometry args={[3.1, 1.35, 2.4]} /><meshStandardMaterial color="#b8a48c" metalness={0.23} /></mesh>
    <mesh position={[0, 0.8, 1.22]}><boxGeometry args={[1.1, 1.15, 0.08]} /><meshStandardMaterial color="#51525a" metalness={0.5} /></mesh>
    <mesh position={[0, 1.4, 1.27]}><boxGeometry args={[0.7, 0.08, 0.04]} /><meshBasicMaterial color="#fbd36a" /></mesh>
    <mesh position={[0, 1.47, 0]} castShadow><boxGeometry args={[3.3, 0.22, 2.6]} /><meshStandardMaterial color="#d4be9f" /></mesh>
  </group>;
}

function Rover({ reducedMotion }: { reducedMotion: boolean }) {
  const group = useRef<THREE.Group>(null);
  useFrame(({ clock }) => {
    if (group.current && !reducedMotion) group.current.position.x = 8 + Math.sin(clock.elapsedTime * 0.28) * 1.4;
  });
  return <group ref={group} position={[8, 0.45, 7]} rotation={[0, -0.65, 0]}>
    <mesh castShadow><boxGeometry args={[1.4, 0.55, 0.85]} /><meshStandardMaterial color="#f1e5cb" /></mesh>
    <mesh position={[0, 0.42, -0.1]} castShadow><boxGeometry args={[0.65, 0.35, 0.62]} /><meshStandardMaterial color="#8bb1b4" /></mesh>
    {[-0.5, 0.5].flatMap((x) => [-0.5, 0.5].map((z) => <mesh key={`${x}-${z}`} position={[x, -0.35, z]} rotation={[Math.PI / 2, 0, 0]} castShadow><cylinderGeometry args={[0.28, 0.28, 0.16, 12]} /><meshStandardMaterial color="#262c33" /></mesh>))}
  </group>;
}

function Colony({ selectedBuilding, onSelectBuilding, reducedMotion, dustStorm, solarEvent }: Props) {
  const modules: Array<{ id: BuildingId; position: [number, number, number]; model: React.ReactNode; labelHeight: number; radius: number }> = [
    { id: 'HABITAT', position: [0, 0, 0], model: <Dome radius={3.1} />, labelHeight: 4.5, radius: 3.5 },
    { id: 'GREENHOUSE', position: [-5.7, 0, 1.8], model: <Greenhouse />, labelHeight: 3.1, radius: 2.1 },
    { id: 'SCIENCE_LAB', position: [5.1, 0, -1.6], model: <><Dome color="#a9cbd9" radius={1.65} /><mesh position={[0, 1.7, 0]}><sphereGeometry args={[0.25, 12, 12]} /><meshBasicMaterial color="#9ce8ff" /></mesh></>, labelHeight: 3.1, radius: 2.1 },
    { id: 'OXYGEN_GENERATOR', position: [-5.6, 0, -3.5], model: <><mesh position={[0, 0.8, 0]} castShadow><cylinderGeometry args={[0.7, 0.85, 1.6, 12]} /><meshStandardMaterial color="#d5d6cb" metalness={0.4} /></mesh><mesh position={[0, 1.6, 0]}><cylinderGeometry args={[0.8, 0.8, 0.18, 12]} /><meshStandardMaterial color="#4f9fa9" /></mesh></>, labelHeight: 2.5, radius: 1.3 },
    { id: 'SOLAR_PANELS', position: [-8.7, 0, 6.8], model: <SolarArray />, labelHeight: 2.5, radius: 3.3 },
    { id: 'BATTERIES', position: [5.5, 0, 3.7], model: <BatteryBank />, labelHeight: 2.3, radius: 1.8 },
    { id: 'RADIATION_SHELTER', position: [8, 0, -5], model: <Shelter />, labelHeight: 2.5, radius: 2.1 },
    { id: 'COMMS_ANTENNA', position: [0, 0, -8], model: <><mesh position={[0, 2, 0]}><cylinderGeometry args={[0.06, 0.13, 4, 10]} /><meshStandardMaterial color="#d9ded9" /></mesh><mesh position={[0, 3.9, 0]} rotation={[0.45, 0, 0]}><coneGeometry args={[1.15, 0.42, 24]} /><meshStandardMaterial color="#e8e4d6" side={THREE.DoubleSide} /></mesh><mesh position={[0, 4.1, 0]}><sphereGeometry args={[0.16]} /><meshBasicMaterial color="#67e7fa" /></mesh></>, labelHeight: 5.1, radius: 1.3 },
  ];
  return <>
    <color attach="background" args={[dustStorm ? '#a4684c' : '#b77d68']} />
    <fog attach="fog" args={[dustStorm ? '#a4684c' : '#c78e71', dustStorm ? 18 : 32, dustStorm ? 60 : 105]} />
    <ambientLight intensity={dustStorm ? 1.2 : 1.75} />
    <directionalLight position={[-12, 22, 10]} intensity={dustStorm ? 1.6 : 3} color={solarEvent ? '#ffe4cb' : '#ffe0b4'} castShadow shadow-mapSize={[1024, 1024]} shadow-camera-left={-20} shadow-camera-right={20} shadow-camera-top={20} shadow-camera-bottom={-20} />
    <hemisphereLight args={['#ffe3ca', '#75432e', 1.3]} />
    <Terrain />
    <mesh position={[0, 0.09, 0]} rotation={[-Math.PI / 2, 0, 0]} receiveShadow><circleGeometry args={[10.5, 64]} /><meshStandardMaterial color="#bd704d" roughness={1} /></mesh>
    {modules.map(({ id, position, model, labelHeight, radius }) => <Module key={id} id={id} position={position} selected={selectedBuilding === id} onSelect={onSelectBuilding} labelHeight={labelHeight} radius={radius}>{model}</Module>)}
    <Rover reducedMotion={reducedMotion} />
    {Array.from({ length: 72 }, (_, i) => {
      const angle = i * 2.399;
      const radius = 12 + (i % 13) * 2.3;
      return <mesh key={i} position={[Math.cos(angle) * radius, 0.2, Math.sin(angle) * radius]} rotation={[i, angle, i * 0.5]} castShadow>
        <dodecahedronGeometry args={[0.18 + (i % 5) * 0.16, 0]} />
        <meshStandardMaterial color={i % 3 ? '#85513c' : '#704b3f'} roughness={1} />
      </mesh>;
    })}
    <CameraRig reducedMotion={reducedMotion} />
  </>;
}

export default function ColonyScene(props: Props) {
  const [supported, setSupported] = useState(true);
  if (!supported) return <div className="flex h-full items-center justify-center bg-[#9a5a42] p-8 text-center text-white">Tu navegador necesita WebGL para mostrar la colonia 3D. Usa los botones de módulos para seguir jugando.</div>;
  return <Canvas shadows camera={{ position: [12, 13, 19], fov: 48, near: 0.1, far: 200 }} dpr={[1, 1.7]} gl={{ antialias: true, alpha: false }} onCreated={({ gl }) => {
    gl.domElement.addEventListener('webglcontextlost', () => setSupported(false), { once: true });
  }}>
    <Colony {...props} />
  </Canvas>;
}
