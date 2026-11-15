import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { NASA_DISCOVERIES } from '@/data/scientific-sources/mars-discoveries';
import { loadDiscoveryLocations } from '../helpers/horizon-discoveries';

const item = (id = 'PIA25286', imageUrl = 'https://images-assets.nasa.gov/image/PIA25286/PIA25286~small.jpg') => ({
  data: [{ nasa_id: id, title: "InSight's Dusty Solar Panel", description: 'InSight captured its dust-covered solar panel on April 24, 2022.', date_created: '2022-05-17T00:00:00Z', secondary_creator: 'NASA/JPL-Caltech' }],
  links: [{ href: imageUrl, render: 'image' }],
});

beforeEach(() => vi.resetModules());
afterEach(() => vi.unstubAllGlobals());

describe('verified NASA discovery endpoint', () => {
  it('keeps the browser markers aligned with every reviewed NASA topic and identifier', () => {
    const locations = Object.values(loadDiscoveryLocations());
    expect(locations).toHaveLength(5);
    expect(new Set(locations.map(location => location.topic)).size).toBe(5);
    for (const entry of Object.values(NASA_DISCOVERIES)) {
      expect(locations).toContainEqual(expect.objectContaining({ topic: entry.topic, nasaId: entry.nasaId }));
    }
  });

  it.each(Object.entries(NASA_DISCOVERIES))('fetches the exact reviewed record for %s with its location and credit', async (topic, entry) => {
    const record = item(entry.nasaId, `https://images-assets.nasa.gov/image/${entry.nasaId}/${entry.nasaId}~medium.jpg`);
    const fetchMock = vi.fn().mockResolvedValue({ ok: true, json: async () => ({ collection: { items: [record] } }) });
    vi.stubGlobal('fetch', fetchMock);
    const { GET } = await import('@/app/api/nasa/discovery/route');
    const response = await GET(new Request(`http://localhost/api/nasa/discovery?topic=${topic}`));
    expect(response.status).toBe(200);
    expect((await response.json()).discovery).toMatchObject({ nasaId: entry.nasaId, topic, photoPlace: entry.photoPlace, credit: entry.credit, contextNote: entry.contextNote });
    expect(fetchMock.mock.calls[0][0]).toBe(`https://images-api.nasa.gov/search?nasa_id=${entry.nasaId}&media_type=image`);
  });

  it('caches separate topics independently and prefers a full photo over a tiny thumbnail', async () => {
    const fetchMock = vi.fn().mockImplementation(async (url: string) => {
      const id = new URL(url).searchParams.get('nasa_id')!;
      const record = item(id, `https://images-assets.nasa.gov/image/${id}/${id}~thumb.jpg`);
      record.links.push({ href: `https://images-assets.nasa.gov/image/${id}/${id}~orig.jpg`, render: 'image' });
      return { ok: true, json: async () => ({ collection: { items: [record] } }) };
    });
    vi.stubGlobal('fetch', fetchMock);
    const { GET } = await import('@/app/api/nasa/discovery/route');
    for (const topic of ['thermal-testing', 'space-garden', 'thermal-testing']) {
      const response = await GET(new Request(`http://localhost/api/nasa/discovery?topic=${topic}`));
      const { discovery } = await response.json();
      expect(discovery.topic).toBe(topic);
      expect(discovery.imageUrl).toContain('~orig.jpg');
    }
    expect(fetchMock).toHaveBeenCalledTimes(2);
  });

  it('fetches the exact NASA record without APOD or an API key, and caches it', async () => {
    const fetchMock = vi.fn().mockResolvedValue({ ok: true, json: async () => ({ collection: { items: [item()] } }) });
    vi.stubGlobal('fetch', fetchMock);
    const { GET } = await import('@/app/api/nasa/discovery/route');
    const response = await GET(new Request('http://localhost/api/nasa/discovery?topic=solar-dust'));
    expect(response.status).toBe(200);
    const { discovery } = await response.json();
    expect(discovery).toMatchObject({ nasaId: 'PIA25286', credit: 'NASA/JPL-Caltech', sourceUrl: 'https://images.nasa.gov/details/PIA25286', publishedAt: '2022-05-17' });
    expect(discovery.originalDescription).toContain('April 24, 2022');
    expect(fetchMock.mock.calls[0][0]).toBe('https://images-api.nasa.gov/search?nasa_id=PIA25286&media_type=image');
    await GET(new Request('http://localhost/api/nasa/discovery?topic=solar-dust'));
    expect(fetchMock).toHaveBeenCalledTimes(1);
  });

  it.each([
    { collection: { items: [item('another-id')] } },
    { collection: { items: [item('PIA25286', 'https://example.com/illustration.jpg')] } },
    { collection: { items: [] } },
    { unexpected: 'response' },
  ])('returns an unavailable result instead of substituting unverified media: %j', async (payload) => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue({ ok: true, json: async () => payload }));
    const { GET } = await import('@/app/api/nasa/discovery/route');
    const response = await GET(new Request('http://localhost/api/nasa/discovery?topic=solar-dust'));
    expect(response.status).toBe(503);
    expect(await response.json()).toEqual({ discovery: null });
  });

  it('handles network failure without throwing and rejects unknown topics without fetching', async () => {
    const fetchMock = vi.fn().mockRejectedValue(new Error('offline'));
    vi.stubGlobal('fetch', fetchMock);
    const { GET } = await import('@/app/api/nasa/discovery/route');
    expect((await GET(new Request('http://localhost/api/nasa/discovery?topic=unknown'))).status).toBe(400);
    expect(fetchMock).not.toHaveBeenCalled();
    expect((await GET(new Request('http://localhost/api/nasa/discovery?topic=solar-dust'))).status).toBe(503);
  });
});
