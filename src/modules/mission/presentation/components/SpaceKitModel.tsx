'use client';

import { useLoader } from '@react-three/fiber';
import { useMemo } from 'react';
import { MTLLoader } from 'three/examples/jsm/loaders/MTLLoader.js';
import { OBJLoader } from 'three/examples/jsm/loaders/OBJLoader.js';
import * as THREE from 'three';

export type SpaceKitModelName = 'astronaut' | 'robot' | 'satelliteDishLarge' | 'spaceCraft1';

export function SpaceKitModel({ name, scale = 1 }: { name: SpaceKitModelName; scale?: number }) {
  const base = `/space-kit/${name}`;
  const materials = useLoader(MTLLoader, `${base}.mtl`);
  const source = useLoader(OBJLoader, `${base}.obj`, (loader) => {
    materials.preload();
    loader.setMaterials(materials);
  });
  const model = useMemo(() => {
    const clone = source.clone(true);
    const bounds = new THREE.Box3().setFromObject(clone);
    const center = bounds.getCenter(new THREE.Vector3());
    clone.position.set(-center.x, -bounds.min.y, -center.z);
    clone.traverse((child) => {
      if (child instanceof THREE.Mesh) {
        child.castShadow = true;
        child.receiveShadow = true;
      }
    });
    return clone;
  }, [source]);
  return <group scale={scale}><primitive object={model} /></group>;
}
