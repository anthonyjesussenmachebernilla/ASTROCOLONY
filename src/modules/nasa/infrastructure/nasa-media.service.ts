import { z } from 'zod';
import { getServerEnv } from '@/lib/env';
import { SOLAR_DUST_DISCOVERY } from '@/data/scientific-sources/mars-discoveries';

const ApodSchema = z.object({
  title: z.string(),
  date: z.string(),
  explanation: z.string(),
  media_type: z.string(),
  url: z.string().url(),
  hdurl: z.string().url().nullish(),
  copyright: z.string().nullish(),
});

const ImageLibrarySchema = z.object({
  collection: z.object({
    items: z.array(
      z.object({
        data: z
          .array(
            z.object({
              nasa_id: z.string(),
              title: z.string(),
              description: z.string().nullish(),
              date_created: z.string(),
              secondary_creator: z.string().nullish(),
              center: z.string().nullish(),
            }),
          )
          .min(1),
        links: z
          .array(z.object({ href: z.string().url(), render: z.string().nullish() }))
          .nullish(),
      }),
    ),
  }),
});

export interface ApodDto {
  title: string;
  date: string;
  explanation: string;
  imageUrl: string;
  credit: string;
  sourceUrl: string;
}

export interface MarsPhotoDto {
  id: string;
  imageUrl: string;
  title: string;
  date: string;
  credit: string;
  sourceUrl: string;
}

const TTL = 60 * 60 * 1000;
const memo = new Map<string, { value: unknown; expiresAt: number }>();

async function cached<T>(key: string, loader: () => Promise<T | null>): Promise<T | null> {
  const hit = memo.get(key);
  if (hit && hit.expiresAt > Date.now()) return hit.value as T | null;
  const value = await loader();
  // Cacheamos éxitos una hora; los fallos se reintentan pronto.
  memo.set(key, { value, expiresAt: Date.now() + (value ? TTL : 30_000) });
  return value;
}

async function getJson(url: string): Promise<unknown> {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 6000);
  try {
    const res = await fetch(url, { signal: controller.signal, cache: 'no-store' });
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    return await res.json();
  } finally {
    clearTimeout(timeout);
  }
}

export class NasaMediaService {
  /** A reviewed photograph for the solar-panel interaction; never a random search hit. */
  getSolarDustDiscovery() {
    return cached('discovery:solar-dust', async () => {
      try {
        const entry = SOLAR_DUST_DISCOVERY;
        const parsed = ImageLibrarySchema.safeParse(await getJson(
          `https://images-api.nasa.gov/search?nasa_id=${entry.nasaId}&media_type=image`,
        ));
        if (!parsed.success) return null;
        const item = parsed.data.collection.items.find((item) => item.data[0].nasa_id === entry.nasaId);
        if (!item) return null;
        const meta = item.data[0];
        const link = item.links?.find((link) => {
          const url = new URL(link.href);
          return link.render === 'image' && url.protocol === 'https:' && url.hostname === 'images-assets.nasa.gov';
        });
        if (!link || !meta.description?.trim()) return null;
        return {
          ...entry,
          imageUrl: link.href,
          originalTitle: meta.title,
          originalDescription: meta.description,
          publishedAt: meta.date_created.slice(0, 10),
          credit: meta.secondary_creator?.trim() || 'NASA/JPL-Caltech',
        };
      } catch {
        return null;
      }
    });
  }

  /** Imagen Astronómica del Día (APOD). Devuelve null si NASA no responde: nunca inventamos datos. */
  getApod(): Promise<ApodDto | null> {
    return cached('apod', async () => {
      const key = encodeURIComponent(getServerEnv().NASA_API_KEY);
      // APOD a veces responde 500 de forma transitoria: reintentamos una vez.
      for (let attempt = 0; attempt < 2; attempt++) {
        try {
          const parsed = ApodSchema.safeParse(
            await getJson(`https://api.nasa.gov/planetary/apod?api_key=${key}`),
          );
          if (!parsed.success || parsed.data.media_type !== 'image') return null;
          const d = parsed.data;
          return {
            title: d.title,
            date: d.date,
            explanation: d.explanation,
            imageUrl: d.url,
            credit: d.copyright?.trim() || 'NASA',
            sourceUrl: 'https://apod.nasa.gov/apod/astropix.html',
          };
        } catch {
          // siguiente intento
        }
      }
      return null;
    });
  }

  /**
   * Imágenes reales de Marte / Jezero / Perseverance desde la NASA Image and Video Library
   * (API pública sin clave). La antigua API de fotos de rovers ya no responde en api.nasa.gov.
   */
  getMarsImages(limit = 4): Promise<MarsPhotoDto[] | null> {
    return cached('mars-images', async () => {
      try {
        const url =
          'https://images-api.nasa.gov/search?q=perseverance%20jezero%20mars&media_type=image&page_size=12';
        const parsed = ImageLibrarySchema.safeParse(await getJson(url));
        if (!parsed.success) return null;

        const photos: MarsPhotoDto[] = [];
        for (const item of parsed.data.collection.items) {
          const meta = item.data[0];
          const link = item.links?.find((l) => l.render === 'image') ?? item.links?.[0];
          if (!link) continue;
          photos.push({
            id: meta.nasa_id,
            imageUrl: link.href,
            title: meta.title,
            date: meta.date_created.slice(0, 10),
            credit: meta.secondary_creator?.trim() || meta.center?.trim() || 'NASA',
            sourceUrl: `https://images.nasa.gov/details/${encodeURIComponent(meta.nasa_id)}`,
          });
          if (photos.length >= limit) break;
        }
        return photos.length > 0 ? photos : null;
      } catch {
        return null;
      }
    });
  }
}
