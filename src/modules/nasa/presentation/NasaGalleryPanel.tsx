'use client';

import { useEffect, useState } from 'react';
import { ExternalLink, ImageIcon } from 'lucide-react';

interface Apod {
  title: string;
  date: string;
  explanation: string;
  imageUrl: string;
  credit: string;
  sourceUrl: string;
}

interface MarsPhoto {
  id: string;
  imageUrl: string;
  title: string;
  date: string;
  credit: string;
  sourceUrl: string;
}

interface MediaResponse {
  apod: Apod | null;
  marsPhotos: MarsPhoto[] | null;
}

export function NasaGalleryPanel() {
  const [media, setMedia] = useState<MediaResponse | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let active = true;
    fetch('/api/nasa/media')
      .then((res) => (res.ok ? (res.json() as Promise<MediaResponse>) : null))
      .then((data) => {
        if (active) setMedia(data);
      })
      .catch(() => {
        if (active) setMedia(null);
      })
      .finally(() => {
        if (active) setLoading(false);
      });
    return () => {
      active = false;
    };
  }, []);

  const photos = media?.marsPhotos ?? [];
  const apod = media?.apod ?? null;

  return (
    <section className="rounded-2xl border border-purple-500/30 bg-[#0D152B]/90 p-4 shadow-lg">
      <div className="mb-3 flex items-center gap-2">
        <ImageIcon className="h-4 w-4 text-purple-300" />
        <h2 className="text-sm font-bold uppercase tracking-wider text-purple-200">
          Galería real de la NASA
        </h2>
      </div>

      {loading ? (
        <p className="text-xs text-slate-400">Conectando con las APIs de NASA…</p>
      ) : !apod && photos.length === 0 ? (
        <p className="text-xs text-slate-400">
          Las imágenes de NASA no están disponibles ahora mismo (el servicio APOD a veces falla o
          alcanza su límite con DEMO_KEY). El juego sigue funcionando; puedes añadir tu propia clave
          gratuita en api.nasa.gov (variable NASA_API_KEY).
        </p>
      ) : (
        <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
          {photos.length > 0 && (
            <div>
              <p className="mb-2 text-xs font-semibold text-orange-200">
                Marte y el rover Perseverance (NASA Image Library)
              </p>
              <div className="grid grid-cols-2 gap-2">
                {photos.map((p) => (
                  <a
                    key={p.id}
                    href={p.sourceUrl}
                    target="_blank"
                    rel="noreferrer"
                    className="group block overflow-hidden rounded-xl border border-slate-800 bg-slate-900"
                  >
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img
                      src={p.imageUrl}
                      alt={p.title}
                      loading="lazy"
                      className="aspect-video w-full object-cover transition-transform group-hover:scale-105"
                    />
                    <span className="block truncate px-2 py-1 text-[10px] text-slate-400" title={p.title}>
                      {p.title} • {p.credit}
                    </span>
                  </a>
                ))}
              </div>
              <a
                href="https://images.nasa.gov/"
                target="_blank"
                rel="noreferrer"
                className="mt-1.5 inline-flex items-center gap-1 text-[11px] text-cyan-300 hover:underline"
              >
                NASA Image and Video Library <ExternalLink className="h-3 w-3" />
              </a>
            </div>
          )}

          {apod && (
            <div>
              <p className="mb-2 text-xs font-semibold text-cyan-200">
                Imagen astronómica del día ({apod.date})
              </p>
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={apod.imageUrl}
                alt={apod.title}
                loading="lazy"
                className="aspect-video w-full rounded-xl border border-slate-800 object-cover"
              />
              <p className="mt-1.5 text-xs font-bold text-white">{apod.title}</p>
              <p className="line-clamp-3 text-[11px] text-slate-300">{apod.explanation}</p>
              <div className="mt-1 flex items-center justify-between text-[11px] text-slate-400">
                <span>Crédito: {apod.credit}</span>
                <a
                  href={apod.sourceUrl}
                  target="_blank"
                  rel="noreferrer"
                  className="inline-flex items-center gap-1 text-cyan-300 hover:underline"
                >
                  NASA APOD <ExternalLink className="h-3 w-3" />
                </a>
              </div>
            </div>
          )}
        </div>
      )}
    </section>
  );
}
