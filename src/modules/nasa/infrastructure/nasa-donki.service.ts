import { z } from 'zod';
import { getServerEnv } from '@/lib/env';
import type { ScientificScenarioProvider } from '@/modules/mission/application/use-cases/advance-mission-turn';
import type { SpaceWeatherSnapshot } from '@/modules/nasa/domain/types';
import type { ScientificReference } from '@/modules/simulation/domain/types';

/** Servidor oficial descrito en api-1.json (OpenAPI de DONKI-API v2.0, sin clave). */
const DONKI_OFFICIAL_BASE = 'https://ccmc.gsfc.nasa.gov/DONKI-API';
/** Respaldo: portal api.nasa.gov (requiere NASA_API_KEY). */
const DONKI_PORTAL_BASE = 'https://api.nasa.gov/DONKI';
const DONKI_HOME = 'https://ccmc.gsfc.nasa.gov/tools/DONKI/';

const DonkiFlareSchema = z.object({
  flrID: z.string(),
  beginTime: z.string(),
  classType: z.string().nullish(),
  sourceLocation: z.string().nullish(),
  link: z.string().url().nullish(),
});
const DonkiFlareArraySchema = z.array(DonkiFlareSchema);
const DonkiCountSchema = z.array(z.object({}).passthrough());

export type { SpaceWeatherSnapshot };

export const HISTORICAL_DONKI_FALLBACK: ScientificReference[] = [
  {
    externalId: 'DONKI-FLR-2024-05-14-X8.7',
    source: 'NASA DONKI (Space Weather Database)',
    observedAt: '2024-05-14T16:51:00Z',
    eventType: 'Llamarada Solar Clase X8.7',
    description:
      'Registro histórico de una intensa llamarada solar monitoreada por NASA DONKI durante el ciclo solar 25.',
    sourceUrl: DONKI_HOME,
    isHistorical: true,
    flareClass: 'X',
  },
  {
    externalId: 'DONKI-FLR-2024-10-03-X9.0',
    source: 'NASA DONKI (Space Weather Database)',
    observedAt: '2024-10-03T12:18:00Z',
    eventType: 'Llamarada Solar Clase X9.0',
    description:
      'Evento solar histórico observado por NASA que recuerda la importancia de los refugios contra radiación.',
    sourceUrl: DONKI_HOME,
    isHistorical: true,
    flareClass: 'X',
  },
];

const CACHE_TTL_MS = 15 * 60 * 1000;
let cache: {
  events: ScientificReference[];
  snapshot: SpaceWeatherSnapshot;
  expiresAt: number;
} | null = null;

async function fetchJson(url: string): Promise<unknown> {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 4000);
  try {
    const res = await fetch(url, { signal: controller.signal, cache: 'no-store' });
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    return await res.json();
  } finally {
    clearTimeout(timeout);
  }
}

function ymd(d: Date): string {
  return d.toISOString().slice(0, 10);
}

function classLetter(classType?: string | null): string | undefined {
  const c = classType?.trim().charAt(0).toUpperCase();
  return c && 'ABCMX'.includes(c) ? c : undefined;
}

const CLASS_RANK: Record<string, number> = { A: 0, B: 1, C: 2, M: 3, X: 4 };

function fallbackSnapshot(): SpaceWeatherSnapshot {
  return {
    level: 'STORMY',
    strongestFlare: 'X8.7',
    flareCount: HISTORICAL_DONKI_FALLBACK.length,
    cmeCount: 0,
    windowDays: 0,
    source: 'NASA DONKI (registro histórico: 14-may-2024)',
    sourceUrl: DONKI_HOME,
    isHistorical: true,
    fetchedAt: new Date().toISOString(),
  };
}

export class NasaDonkiService implements ScientificScenarioProvider {
  private async fetchFlares(start: string, end: string) {
    const urls = [
      `${DONKI_OFFICIAL_BASE}/get/FLR?startDate=${start}&endDate=${end}`,
      `${DONKI_PORTAL_BASE}/FLR?startDate=${start}&endDate=${end}&api_key=${encodeURIComponent(
        getServerEnv().NASA_API_KEY,
      )}`,
    ];
    for (const url of urls) {
      try {
        const parsed = DonkiFlareArraySchema.safeParse(await fetchJson(url));
        if (parsed.success) return parsed.data;
      } catch {
        // probamos la siguiente fuente
      }
    }
    return null;
  }

  private async load() {
    const now = Date.now();
    if (cache && cache.expiresAt > now) return cache;

    const end = new Date();
    const start = new Date(end.getTime() - 30 * 24 * 60 * 60 * 1000);
    const flares = await this.fetchFlares(ymd(start), ymd(end));

    if (!flares || flares.length === 0) {
      // Sin respuesta (o sin llamaradas): mostramos datos históricos, claramente marcados.
      return {
        events: HISTORICAL_DONKI_FALLBACK,
        snapshot: fallbackSnapshot(),
        expiresAt: now + 60 * 1000,
      };
    }

    const ranked = [...flares].sort((a, b) => {
      const ra = CLASS_RANK[classLetter(a.classType) ?? 'A'] ?? 0;
      const rb = CLASS_RANK[classLetter(b.classType) ?? 'A'] ?? 0;
      return rb - ra || b.beginTime.localeCompare(a.beginTime);
    });
    const strongest = ranked[0];
    const strongestLetter = classLetter(strongest.classType) ?? 'C';
    const rank = CLASS_RANK[strongestLetter] ?? 0;

    let cmeCount = 0;
    try {
      const cmes = DonkiCountSchema.safeParse(
        await fetchJson(
          `${DONKI_OFFICIAL_BASE}/get/CME?startDate=${ymd(start)}&endDate=${ymd(end)}`,
        ),
      );
      if (cmes.success) cmeCount = cmes.data.length;
    } catch {
      cmeCount = 0;
    }

    const events: ScientificReference[] = ranked.slice(0, 5).map((f) => ({
      externalId: f.flrID,
      source: 'NASA DONKI (datos recientes)',
      observedAt: f.beginTime,
      eventType: `Llamarada Solar ${f.classType ?? 'observada'}`,
      description: `Evento solar registrado por NASA DONKI${
        f.sourceLocation ? ` en la región ${f.sourceLocation}` : ''
      }.`,
      sourceUrl: f.link ?? DONKI_HOME,
      isHistorical: false,
      flareClass: classLetter(f.classType),
    }));

    const snapshot: SpaceWeatherSnapshot = {
      level: rank >= 4 ? 'STORMY' : rank >= 3 ? 'ACTIVE' : 'CALM',
      strongestFlare: strongest.classType ?? strongestLetter,
      flareCount: flares.length,
      cmeCount,
      windowDays: 30,
      source: 'NASA DONKI (últimos 30 días)',
      sourceUrl: DONKI_HOME,
      isHistorical: false,
      fetchedAt: new Date().toISOString(),
    };

    return { events, snapshot, expiresAt: now + CACHE_TTL_MS };
  }

  async getNormalizedSolarEvents(): Promise<ScientificReference[]> {
    cache = await this.load();
    return cache.events;
  }

  async getSpaceWeatherSnapshot(): Promise<SpaceWeatherSnapshot> {
    cache = await this.load();
    return cache.snapshot;
  }

  async getSolarEventReference(): Promise<ScientificReference | null> {
    const events = await this.getNormalizedSolarEvents();
    return events[0] ?? null;
  }
}
