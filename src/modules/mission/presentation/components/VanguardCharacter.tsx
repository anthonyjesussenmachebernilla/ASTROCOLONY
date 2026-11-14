'use client';

import { useFrame, useLoader } from '@react-three/fiber';
import { useEffect, useMemo, useRef } from 'react';
import * as THREE from 'three';
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js';
import { clone } from 'three/examples/jsm/utils/SkeletonUtils.js';

export type Locomotion = 'idle' | 'walk' | 'run';

export function VanguardCharacter({ locomotion }: { locomotion: Locomotion }) {
  const source = useLoader(GLTFLoader, '/longbow/vanguard.glb');
  const idle = useLoader(GLTFLoader, '/longbow/idle.glb');
  const walk = useLoader(GLTFLoader, '/longbow/walk.glb');
  const run = useLoader(GLTFLoader, '/longbow/run.glb');
  const model = useMemo(() => {
    const instance = clone(source.scene) as THREE.Group;
    instance.traverse((child) => {
      if (child instanceof THREE.Mesh) {
        child.castShadow = true;
        child.receiveShadow = true;
        child.frustumCulled = false;
        for (const material of Array.isArray(child.material) ? child.material : [child.material]) {
          if (material && 'side' in material) material.side = THREE.DoubleSide;
        }
      }
    });
    return instance;
  }, [source]);
  const bounds = useMemo(() => new THREE.Box3().setFromObject(model), [model]);
  const scale = 2.05 / Math.max(0.01, bounds.max.y - bounds.min.y);
  const mixer = useMemo(() => new THREE.AnimationMixer(model), [model]);
  const clips = useMemo(() => ({ idle: idle.animations[0], walk: walk.animations[0], run: run.animations[0] }), [idle, walk, run]);
  const previous = useRef<THREE.AnimationAction | null>(null);

  useEffect(() => {
    const clip = clips[locomotion];
    if (!clip) return;
    const next = mixer.clipAction(clip);
    if (previous.current === next) return;
    next.reset().fadeIn(0.18).play();
    previous.current?.fadeOut(0.18);
    previous.current = next;
  }, [clips, locomotion, mixer]);

  useEffect(() => () => { mixer.stopAllAction(); mixer.uncacheRoot(model); }, [mixer, model]);
  useFrame((_, delta) => mixer.update(Math.min(delta, 0.05)));

  return <group scale={scale}>
    <primitive object={model} position={[0, -bounds.min.y, 0]} />
  </group>;
}
