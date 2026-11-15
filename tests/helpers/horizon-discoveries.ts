import { readFileSync } from 'node:fs';
import { runInNewContext } from 'node:vm';

export function loadDiscoveryLocations() {
  const context = { window: {} as { MarsDiscovery: { locations: Record<string, { topic: string; nasaId: string; targetId: string; label: string }> } } };
  runInNewContext(readFileSync('public/horizonte/discovery.js', 'utf8'), context);
  return context.window.MarsDiscovery.locations;
}
