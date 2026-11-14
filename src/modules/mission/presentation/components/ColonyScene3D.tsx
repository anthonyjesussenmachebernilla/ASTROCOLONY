'use client';

import dynamic from 'next/dynamic';

/** Carga diferida solo en el navegador: three.js no se ejecuta en el servidor. */
export const ColonyScene3D = dynamic(
  () => import('./MarsScene3D'),
  {
    ssr: false,
    loading: () => (
      <div className="flex h-full w-full items-center justify-center bg-gradient-to-b from-[#14112e] to-[#c06a40] text-sm font-semibold text-orange-100">
        Preparando la colonia en 3D…
      </div>
    ),
  },
);
