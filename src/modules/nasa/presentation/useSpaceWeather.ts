'use client';

import { useEffect, useState } from 'react';
import type { SpaceWeatherSnapshot } from '@/modules/nasa/domain/types';

/** Carga el clima espacial real (NASA DONKI) desde nuestro backend. Devuelve null mientras carga o si falla. */
export function useSpaceWeather(): SpaceWeatherSnapshot | null {
  const [snapshot, setSnapshot] = useState<SpaceWeatherSnapshot | null>(null);

  useEffect(() => {
    let active = true;
    fetch('/api/nasa/space-weather')
      .then((res) => (res.ok ? res.json() : null))
      .then((data: { snapshot?: SpaceWeatherSnapshot } | null) => {
        if (active && data?.snapshot) setSnapshot(data.snapshot);
      })
      .catch(() => {
        // Sin clima espacial: la escena usa el nivel "calmo" por defecto
      });
    return () => {
      active = false;
    };
  }, []);

  return snapshot;
}
