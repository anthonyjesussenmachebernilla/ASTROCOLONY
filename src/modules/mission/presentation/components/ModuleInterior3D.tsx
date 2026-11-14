'use client';

import { Suspense, useEffect, useRef } from 'react';
import { OrbitControls } from '@react-three/drei';
import { useFrame, useThree, type ThreeEvent } from '@react-three/fiber';
import type { BuildingId, ResourceSnapshot } from '@/modules/simulation/domain/types';
import { SpaceKitModel } from './SpaceKitModel';

type Props = {
  building: BuildingId;
  resources: ResourceSnapshot;
  onInspect: (message: string) => void;
  reducedMotion: boolean;
};

const PALETTE: Record<BuildingId, { accent: string; wall: string; floor: string }> = {
  HABITAT: { accent: '#64d9ea', wall: '#c3c9cb', floor: '#6a787d' },
  OXYGEN_GENERATOR: { accent: '#4de3db', wall: '#aab8b6', floor: '#58696d' },
  SOLAR_PANELS: { accent: '#f8bc67', wall: '#cab4a1', floor: '#805e4c' },
  BATTERIES: { accent: '#f2d271', wall: '#b7c0c2', floor: '#5a676c' },
  GREENHOUSE: { accent: '#73df9a', wall: '#c5d5c6', floor: '#677e67' },
  SCIENCE_LAB: { accent: '#9bd7fb', wall: '#c6d0d6', floor: '#66747d' },
  RADIATION_SHELTER: { accent: '#a6a0ff', wall: '#aeb1c2', floor: '#51566c' },
  COMMS_ANTENNA: { accent: '#76d6ff', wall: '#b6c3cb', floor: '#566b76' },
};

function Room({ building }: { building: BuildingId }) {
  const colors = PALETTE[building];
  return <group>
    <color attach="background" args={['#8e4e36']} />
    <ambientLight intensity={1.6} />
    <hemisphereLight args={['#fff4de', '#314149', 1.8]} />
    <directionalLight position={[2, 8, 7]} intensity={3.1} castShadow shadow-mapSize={[1024, 1024]} shadow-camera-left={-12} shadow-camera-right={12} shadow-camera-top={12} shadow-camera-bottom={-12} />
    <pointLight position={[-3, 3.5, 1]} intensity={15} distance={12} color={colors.accent} />
    <mesh position={[0, -0.12, 0]} receiveShadow><boxGeometry args={[12.5, 0.25, 9.5]} /><meshStandardMaterial color={colors.floor} roughness={0.78} metalness={0.15} /></mesh>
    <mesh position={[0, 2.35, -4.75]} receiveShadow><boxGeometry args={[12.5, 4.7, 0.25]} /><meshStandardMaterial color={colors.wall} roughness={0.58} metalness={0.12} /></mesh>
    {[-6.15, 6.15].map((x) => <mesh key={x} position={[x, 2.35, 0]} receiveShadow><boxGeometry args={[0.25, 4.7, 9.5]} /><meshStandardMaterial color={colors.wall} roughness={0.58} metalness={0.12} /></mesh>)}
    <mesh position={[0, 4.72, -1.7]}><boxGeometry args={[12.4, 0.18, 6]} /><meshStandardMaterial color="#d6dcda" metalness={0.35} /></mesh>
    {[-4.3, 0, 4.3].map((x) => <group key={x}>
      <mesh position={[x, 4.54, -1.1]}><boxGeometry args={[2.1, 0.08, 0.42]} /><meshBasicMaterial color="#fff7de" /></mesh>
      <mesh position={[x, 0.02, 0]}><boxGeometry args={[0.045, 0.02, 9.25]} /><meshStandardMaterial color="#d7d0b8" metalness={0.6} /></mesh>
    </group>)}
    <mesh position={[0, 3.35, -4.56]}><boxGeometry args={[4.3, 1.65, 0.08]} /><meshStandardMaterial color="#354b56" metalness={0.5} roughness={0.2} /></mesh>
    <mesh position={[0, 3.35, -4.5]}><planeGeometry args={[3.95, 1.33]} /><meshBasicMaterial color={colors.accent} transparent opacity={0.35} /></mesh>
    <mesh position={[0, 0.14, 3.9]}><boxGeometry args={[11.6, 0.08, 0.08]} /><meshBasicMaterial color={colors.accent} /></mesh>
  </group>;
}

function Hotspot({ children, onClick }: { children: React.ReactNode; onClick: () => void }) {
  return <group onClick={(event: ThreeEvent<MouseEvent>) => { event.stopPropagation(); onClick(); }} onPointerOver={() => { document.body.style.cursor = 'pointer'; }} onPointerOut={() => { document.body.style.cursor = 'auto'; }}>{children}</group>;
}

function Console({ position = [0, 0, 0], color = '#67e8f9' }: { position?: [number, number, number]; color?: string }) {
  return <group position={position}>
    <mesh position={[0, 0.72, 0]} castShadow><boxGeometry args={[1.5, 1.4, 0.75]} /><meshStandardMaterial color="#e3e6df" metalness={0.35} roughness={0.4} /></mesh>
    <mesh position={[0, 1.5, -0.15]} rotation={[-0.28, 0, 0]}><boxGeometry args={[1.35, 0.8, 0.12]} /><meshStandardMaterial color="#172b3a" metalness={0.25} /></mesh>
    <mesh position={[0, 1.5, -0.07]} rotation={[-0.28, 0, 0]}><planeGeometry args={[1.15, 0.58]} /><meshBasicMaterial color={color} transparent opacity={0.55} /></mesh>
    {[-0.4, 0, 0.4].map((x) => <mesh key={x} position={[x, 1.12, 0.385]}><sphereGeometry args={[0.055, 8, 8]} /><meshBasicMaterial color={color} /></mesh>)}
  </group>;
}

function Cylinder({ position, color = '#dce6e5', height = 2.7 }: { position: [number, number, number]; color?: string; height?: number }) {
  return <group position={position}>
    <mesh position={[0, height / 2, 0]} castShadow><cylinderGeometry args={[0.57, 0.57, height, 20]} /><meshStandardMaterial color={color} metalness={0.55} roughness={0.3} /></mesh>
    {[0.25, height - 0.2].map((y) => <mesh key={y} position={[0, y, 0]}><torusGeometry args={[0.58, 0.07, 6, 24]} /><meshStandardMaterial color="#556978" metalness={0.7} /></mesh>)}
    <mesh position={[0, height - 0.05, 0]}><cylinderGeometry args={[0.36, 0.36, 0.2, 16]} /><meshStandardMaterial color="#2d515c" metalness={0.6} /></mesh>
  </group>;
}

function Plant({ position, size = 1 }: { position: [number, number, number]; size?: number }) {
  return <group position={position} scale={size}>
    <mesh position={[0, 0.25, 0]} castShadow><cylinderGeometry args={[0.42, 0.31, 0.5, 10]} /><meshStandardMaterial color="#bd7150" /></mesh>
    <mesh position={[0, 0.72, 0]}><cylinderGeometry args={[0.045, 0.06, 0.6, 6]} /><meshStandardMaterial color="#477e50" /></mesh>
    {[-0.55, 0.55].map((angle) => <mesh key={angle} position={[Math.sin(angle) * 0.26, 0.93, 0]} rotation={[0, 0, angle]} castShadow><sphereGeometry args={[0.35, 9, 6]} /><meshStandardMaterial color="#52aa6c" roughness={0.8} /></mesh>)}
  </group>;
}

function Bed({ x }: { x: number }) {
  return <group position={[x, 0, -1.1]}>
    <mesh position={[0, 0.42, 0]} castShadow><boxGeometry args={[1.45, 0.35, 3.2]} /><meshStandardMaterial color="#e9e4db" /></mesh>
    <mesh position={[0, 0.67, 0.55]}><boxGeometry args={[1.25, 0.14, 1.65]} /><meshStandardMaterial color="#49819b" roughness={0.85} /></mesh>
    <mesh position={[0, 0.72, -1.07]}><boxGeometry args={[1.1, 0.16, 0.55]} /><meshStandardMaterial color="#fff8ed" /></mesh>
    <mesh position={[0, 1.25, -1.65]}><boxGeometry args={[1.52, 2.35, 0.15]} /><meshStandardMaterial color="#a4b5bd" metalness={0.35} /></mesh>
  </group>;
}

function InteriorObjects({ building, resources, onInspect }: Omit<Props, 'reducedMotion'>) {
  switch (building) {
    case 'HABITAT': return <group>
      {[-3.5, -1.1, 1.3, 3.7].map((x) => <Hotspot key={x} onClick={() => onInspect('Cada astronauta necesita aire, energía y descanso para seguir sano.')}><Bed x={x} /></Hotspot>)}
      <Hotspot onClick={() => onInspect(`La tripulación tiene ${resources.crewHealth}% de salud. Reparar sistemas consume energía y comida.`)}><Console position={[4.3, 0, 2.4]} color="#ffa870" /></Hotspot>
      <group position={[-4.6, 0, 2.3]}><Suspense fallback={null}><SpaceKitModel name="astronaut" scale={0.4} /></Suspense></group>
    </group>;
    case 'OXYGEN_GENERATOR': return <group>
      {[-3.5, -1.7, 1.7, 3.5].map((x) => <Hotspot key={x} onClick={() => onInspect(`Los depósitos guardan aire. Oxígeno disponible: ${resources.oxygen}. Fabricar más gasta electricidad.`)}><Cylinder position={[x, 0, -1]} color={x < 0 ? '#cbe3e5' : '#8cd6d7'} /></Hotspot>)}
      <Hotspot onClick={() => onInspect('El electrolizador separa el agua para producir oxígeno. Necesita energía.')}><Console position={[0, 0, 2]} color="#5beded" /></Hotspot>
      <mesh position={[0, 0.35, -1]} rotation={[0, 0, Math.PI / 2]}><cylinderGeometry args={[0.17, 0.17, 9, 12]} /><meshStandardMaterial color="#547a86" metalness={0.65} /></mesh>
    </group>;
    case 'SOLAR_PANELS': return <group>
      {[-3.2, 0, 3.2].map((x) => <Hotspot key={x} onClick={() => onInspect('Estos paneles recogen luz. Una tormenta de polvo reduce su producción.')}><group position={[x, 0, -1]}><mesh position={[0, 1.25, 0]} rotation={[-0.32, 0, 0]} castShadow><boxGeometry args={[2.6, 0.12, 2.4]} /><meshStandardMaterial color="#173d69" metalness={0.58} roughness={0.19} /></mesh><mesh position={[0, 0.55, 0]}><cylinderGeometry args={[0.08, 0.1, 1.1, 8]} /><meshStandardMaterial color="#9facb7" /></mesh></group></Hotspot>)}
      <Hotspot onClick={() => onInspect(`La base tiene ${resources.energy} de energía. Los paneles trabajan automáticamente cada sol.`)}><Console position={[0, 0, 2.7]} color="#ffd074" /></Hotspot>
    </group>;
    case 'BATTERIES': return <group>
      {[-3.5, -1.2, 1.2, 3.5].map((x, i) => <Hotspot key={x} onClick={() => onInspect(`Baterías: ${resources.energy} de energía. Ahorrar luz reduce aire y cosecha.`)}><group position={[x, 0, -0.7]}><mesh position={[0, 1.1, 0]} castShadow><boxGeometry args={[1.7, 2.2, 1.6]} /><meshStandardMaterial color="#d3dcda" metalness={0.6} roughness={0.32} /></mesh><mesh position={[0, 1.38, 0.83]}><boxGeometry args={[1.22, 0.35, 0.05]} /><meshBasicMaterial color={resources.energy > i * 25 ? '#64e2a7' : '#bb654f'} /></mesh></group></Hotspot>)}
      <Hotspot onClick={() => onInspect('El control distribuye electricidad entre aire, cultivos, refugio y ciencia.')}><Console position={[0, 0, 2.4]} color="#f5d379" /></Hotspot>
    </group>;
    case 'GREENHOUSE': return <group>
      {[-3.6, -1.2, 1.2, 3.6].map((x) => <Hotspot key={x} onClick={() => onInspect(`Comida disponible: ${resources.food}. Las plantas también ayudan con el aire.`)}><group position={[x, 0, -0.5]}><mesh position={[0, 0.37, 0]} castShadow><boxGeometry args={[1.65, 0.75, 3.3]} /><meshStandardMaterial color="#8c6550" /></mesh>{[-0.95, 0, 0.95].map((z) => <Plant key={z} position={[0, 0.65, z]} size={0.8} />)}</group></Hotspot>)}
      {[-3.6, 0, 3.6].map((x) => <mesh key={x} position={[x, 3.6, -0.5]}><boxGeometry args={[2.8, 0.12, 0.45]} /><meshBasicMaterial color="#f9d8b5" /></mesh>)}
      <Hotspot onClick={() => onInspect('Las lámparas ayudan a cultivar comida, pero consumen energía.')}><Console position={[0, 0, 2.9]} color="#77e6a8" /></Hotspot>
    </group>;
    case 'SCIENCE_LAB': return <group>
      {[-3.5, 0, 3.5].map((x) => <Hotspot key={x} onClick={() => onInspect(`Ciencia acumulada: ${resources.science}. Investigar gasta aire y protección.`)}><group position={[x, 0, -1]}><mesh position={[0, 0.9, 0]} castShadow><boxGeometry args={[2.4, 0.18, 1.7]} /><meshStandardMaterial color="#e7e9e7" metalness={0.35} /></mesh><mesh position={[0, 1.15, 0]} castShadow><dodecahedronGeometry args={[0.33, 0]} /><meshStandardMaterial color="#a36b4c" /></mesh><mesh position={[0, 1.7, -0.5]}><cylinderGeometry args={[0.28, 0.4, 0.8, 12]} /><meshStandardMaterial color="#658596" metalness={0.45} /></mesh></group></Hotspot>)}
      <Hotspot onClick={() => onInspect('El robot ayuda a analizar muestras sin exponer tanto a la tripulación.')}><group position={[4.1, 0, 2.5]}><Suspense fallback={null}><SpaceKitModel name="robot" scale={1.2} /></Suspense></group></Hotspot>
      <Console position={[-4.1, 0, 2.6]} color="#a3dfff" />
    </group>;
    case 'RADIATION_SHELTER': return <group>
      {[-3.5, 0, 3.5].map((x) => <Hotspot key={x} onClick={() => onInspect(`Protección actual: ${resources.radiationProtection}. Mejorar el blindaje cuesta energía.`)}><group position={[x, 0, -1.2]}><mesh position={[0, 0.75, 0]} castShadow><boxGeometry args={[2.1, 1.5, 2.8]} /><meshStandardMaterial color="#7f87aa" metalness={0.3} roughness={0.6} /></mesh><mesh position={[0, 1.6, 0]}><boxGeometry args={[2.25, 0.25, 3]} /><meshStandardMaterial color="#b4b8d1" metalness={0.35} /></mesh></group></Hotspot>)}
      <Hotspot onClick={() => onInspect('El agua en las paredes puede ayudar a frenar partículas de una tormenta solar.')}><Cylinder position={[-5, 0, 2.1]} color="#869ed3" height={2.5} /><Cylinder position={[5, 0, 2.1]} color="#869ed3" height={2.5} /></Hotspot>
      <Console position={[0, 0, 2.6]} color="#beb8ff" />
    </group>;
    case 'COMMS_ANTENNA': return <group>
      {[-3.4, 0, 3.4].map((x) => <Hotspot key={x} onClick={() => onInspect('Una señal entre Marte y la Tierra tarda minutos. La antena avisa del clima solar.')}><Console position={[x, 0, -1]} color="#79dfff" /></Hotspot>)}
      <Hotspot onClick={() => onInspect('La antena exterior recibe registros del clima solar de NASA DONKI.')}><group position={[4.4, 0, 2.4]}><Suspense fallback={null}><SpaceKitModel name="satelliteDishLarge" scale={0.35} /></Suspense></group></Hotspot>
      <mesh position={[-4.2, 2.3, -4.3]}><sphereGeometry args={[0.5, 16, 12]} /><meshStandardMaterial color="#76d6ff" emissive="#76d6ff" emissiveIntensity={0.5} /></mesh>
    </group>;
  }
}

function InteriorCamera({ building, reducedMotion }: { building: BuildingId; reducedMotion: boolean }) {
  const { camera } = useThree();
  const controls = useRef<React.ElementRef<typeof OrbitControls>>(null);
  useEffect(() => {
    camera.position.set(5.8, 3.3, 8.3);
    camera.lookAt(0, 1.5, -0.6);
    controls.current?.target.set(0, 1.5, -0.6);
    controls.current?.update();
  }, [building, camera]);
  useFrame(() => { if (!reducedMotion) controls.current?.update(); });
  return <OrbitControls ref={controls} makeDefault enablePan={false} enableDamping={!reducedMotion} minDistance={3.5} maxDistance={11} minPolarAngle={0.45} maxPolarAngle={1.48} minAzimuthAngle={-1.2} maxAzimuthAngle={1.2} target={[0, 1.5, -0.6]} />;
}

export function ModuleInterior3D(props: Props) {
  return <>
    <Room building={props.building} />
    <InteriorObjects building={props.building} resources={props.resources} onInspect={props.onInspect} />
    <InteriorCamera building={props.building} reducedMotion={props.reducedMotion} />
  </>;
}
