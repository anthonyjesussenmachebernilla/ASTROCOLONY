export type SpaceWeatherLevel = 'CALM' | 'ACTIVE' | 'STORMY';

/** Resumen del clima espacial real obtenido de NASA DONKI (o de su registro histórico, marcado como tal). */
export interface SpaceWeatherSnapshot {
  level: SpaceWeatherLevel;
  strongestFlare: string | null;
  flareCount: number;
  cmeCount: number;
  windowDays: number;
  source: string;
  sourceUrl: string;
  isHistorical: boolean;
  fetchedAt: string;
}
