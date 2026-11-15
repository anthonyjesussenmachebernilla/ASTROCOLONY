import { readFileSync } from 'node:fs';
import { runInNewContext } from 'node:vm';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { NASA_DISCOVERIES } from '@/data/scientific-sources/mars-discoveries';
import { loadDiscoveryLocations } from '../helpers/horizon-discoveries';

const discovery = {
  topic: 'solar-dust', nasaId: 'PIA25286', title: 'El polvo también llega a los paneles',
  tag: 'Marte real', photoPlace: 'Fotografía en Marte', contextNote: 'Aurora-1 es una simulación.',
  imageUrl: 'https://images-assets.nasa.gov/image/PIA25286/PIA25286~small.jpg',
  alt: 'Panel de InSight cubierto de polvo en Marte.', credit: 'NASA/JPL-Caltech',
  explanation: 'InSight tomó esta foto en Marte.', missionConnection: 'El polvo reduce la energía.',
  more: 'Aurora-1 es una simulación.', originalDescription: '<b>NASA description</b>',
};

function boot(fetchPhoto: (url: string, options: unknown) => unknown, station = 'solar') {
  const html = readFileSync('public/horizonte/index.html', 'utf8');
  document.body.innerHTML = html.slice(html.indexOf('<body>') + 6, html.indexOf('<script src="engine.js"'));
  const location = loadDiscoveryLocations()[station];
  const state = { pos: [0, 0, 19], yaw: 0, camera: 'third', interior: station, storm: 0, stormTarget: 0 };
  const nearest = { inside: true, station: { id: station }, target: { id: location.targetId, name: location.label, detail: 'Observa el equipo.' }, dist: 1 };
  const engine = { setStorm: vi.fn(), start: vi.fn(), pause: vi.fn(), leave: vi.fn(), getNearest: () => nearest, snapshot: () => ({}), getState: () => state };
  const storage = new Map<string, string>();
  const gameWindow = { location: { search: '?autostart=1' }, addEventListener: vi.fn(), MarsGfx: { stations: [{ id: 'solar' }], createDemo: () => engine }, MarsDiscovery: undefined };
  const context = { document, window: gameWindow, localStorage: { getItem: (key: string) => storage.get(key) ?? null, setItem: (key: string, value: string) => storage.set(key, value) },
    fetch: (url: string, options: unknown) => url.includes('/discovery') ? fetchPhoto(url, options) : new Promise(() => {}),
    setTimeout, clearTimeout, setInterval, URL, URLSearchParams, AbortController, performance: { now: () => 1000 }, console };
  runInNewContext(readFileSync('public/horizonte/discovery.js', 'utf8'), context);
  runInNewContext(readFileSync('public/horizonte/campaign.js', 'utf8'), context);
  runInNewContext(readFileSync('public/horizonte/game.js', 'utf8'), context);
  vi.advanceTimersByTime(65);
  document.getElementById('mobileInteract')!.click();
  return { engine, open: () => button('ⓘ Información con imagen').click() };
}
function button(label: string) {
  const node = [...document.querySelectorAll<HTMLButtonElement>('button')].find(node => node.textContent === label);
  expect(node, label).toBeDefined();return node!;
}
const flush = async () => { for (let i = 0; i < 8; i++) await Promise.resolve(); };

beforeEach(() => vi.useFakeTimers());
afterEach(() => { vi.clearAllTimers(); vi.useRealTimers(); document.body.innerHTML = ''; });

describe('solar panel discovery in HORIZONTE', () => {
  it.each(Object.entries(loadDiscoveryLocations()))('shows the correct real photograph, location and source in %s', async (station, location) => {
    const entry = NASA_DISCOVERIES[location.topic as keyof typeof NASA_DISCOVERIES];
    const data = { ...entry, imageUrl: `https://images-assets.nasa.gov/image/${entry.nasaId}/${entry.nasaId}~medium.jpg`, originalDescription: 'Original NASA metadata.' };
    const request = vi.fn().mockResolvedValue({ ok: true, json: async () => ({ discovery: data }) });
    const { open } = boot(request, station);open();await flush();
    const photo = document.querySelector<HTMLImageElement>('#marsDiscovery img')!;
    expect(photo.src).toBe(data.imageUrl);photo.dispatchEvent(new Event('load'));
    expect(document.querySelector('#marsDiscovery figcaption')).toHaveTextContent(entry.photoPlace);
    expect(document.querySelector('#marsDiscovery figcaption')).toHaveTextContent(entry.credit);
    expect(document.querySelector('#marsDiscovery a')).toHaveAttribute('href', entry.sourceUrl);
    expect(document.querySelector('#marsDiscovery .mars-note')).toHaveTextContent(entry.contextNote);
    expect(request.mock.calls[0][0]).toBe(`/api/nasa/discovery?topic=${location.topic}`);
  });

  it('retries the selected greenhouse topic and rejects a photograph from a different topic', async () => {
    const request = vi.fn().mockRejectedValueOnce(new Error('offline')).mockResolvedValue({ ok: true, json: async () => ({ discovery }) });
    const { open } = boot(request, 'greenhouse');open();await flush();
    button('Intentar otra vez').click();await flush();
    expect(request).toHaveBeenCalledTimes(2);
    expect(request.mock.calls.every(([url]) => url === '/api/nasa/discovery?topic=space-garden')).toBe(true);
    expect(document.querySelector('#marsDiscovery img')).toBeNull();
    expect(document.getElementById('marsDiscovery')).toHaveTextContent('La foto no pudo cargarse');
  });

  it('shows one real photo and safe source text while paused, and returns without changing the resource reserves', async () => {
    const { engine, open } = boot(vi.fn().mockResolvedValue({ ok: true, json: async () => ({ discovery }) }));
    open();await flush();
    const photo = document.querySelector<HTMLImageElement>('#marsDiscovery img')!;
    expect(photo.src).toBe(discovery.imageUrl);
    expect(photo.hidden).toBe(true);
    photo.dispatchEvent(new Event('load'));
    expect(photo.hidden).toBe(false);
    expect(document.querySelector('#marsDiscovery figcaption')).toHaveTextContent('NASA/JPL-Caltech');
    expect(document.querySelector('#marsDiscovery .mars-original b')).toBeNull();
    expect(document.querySelector('#marsDiscovery .mars-original')).toHaveTextContent('<b>NASA description</b>');
    expect(engine.pause).toHaveBeenLastCalledWith(true);
    button('Volver al hallazgo').click();
    button('REGISTRAR HALLAZGO').click();
    expect(document.getElementById('energy')).toHaveTextContent('62');
    document.getElementById('mobileInteract')!.click();
    expect(document.getElementById('modalBody')).toHaveTextContent('Ya registraste');
    expect([...document.querySelectorAll('button')].some(node => node.textContent === 'REGISTRAR HALLAZGO')).toBe(false);
    open();await flush();button('Volver al hallazgo').click();
    expect(document.getElementById('energy')).toHaveTextContent('62');
  });

  it('offers retry after a network failure and after a failed image download', async () => {
    const request = vi.fn().mockRejectedValueOnce(new Error('offline')).mockResolvedValue({ ok: true, json: async () => ({ discovery }) });
    const { open } = boot(request);open();await flush();
    expect(document.getElementById('marsDiscovery')).toHaveTextContent('continuar tu misión');
    button('Intentar otra vez').click();await flush();
    document.querySelector('#marsDiscovery img')!.dispatchEvent(new Event('error'));
    expect(document.getElementById('marsDiscovery')).toHaveTextContent('La foto no pudo cargarse');
    button('Volver al hallazgo').click();expect(document.getElementById('modalTitle')).toHaveTextContent('Matriz de paneles');
  });

  it('ignores late responses after closing and restores keyboard control with Escape', async () => {
    let resolve!: (value: unknown) => void;
    const { engine, open } = boot(vi.fn().mockImplementation(() => new Promise(done => { resolve = done; })));
    open();button('Volver al hallazgo').dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape', bubbles: true }));
    expect(document.getElementById('modalShade')).toHaveClass('hidden');
    expect(engine.pause).toHaveBeenLastCalledWith(false);
    resolve({ ok: true, json: async () => ({ discovery }) });await flush();
    expect(document.querySelector('#marsDiscovery img')).toBeNull();
  });

  it('ends a stalled download and keeps keyboard focus inside the dialog', () => {
    const { open } = boot(vi.fn().mockImplementation(() => new Promise(() => {})));open();
    const back = button('Volver al hallazgo');
    expect(document.activeElement).toBe(document.getElementById('modalTitle'));
    const tab = new KeyboardEvent('keydown', { key: 'Tab', bubbles: true, cancelable: true });
    back.dispatchEvent(tab);expect(tab.defaultPrevented).toBe(true);
    vi.advanceTimersByTime(12000);
    expect(document.getElementById('marsDiscovery')).toHaveTextContent('La foto no pudo cargarse');
    expect(button('Intentar otra vez')).toBeDefined();
  });
});
