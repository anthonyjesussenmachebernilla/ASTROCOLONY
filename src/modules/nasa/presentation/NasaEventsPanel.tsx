'use client';

import { useEffect, useState } from 'react';
import { ExternalLink, Radio } from 'lucide-react';
import type { ScientificReference } from '@/modules/simulation/domain/types';

export function NasaEventsPanel() {
  const [events, setEvents] = useState<ScientificReference[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let active = true;
    fetch('/api/nasa/events')
      .then((response) => response.ok ? response.json() : { events: [] })
      .then((data: { events?: ScientificReference[] }) => { if (active && Array.isArray(data.events)) setEvents(data.events.slice(0, 3)); })
      .catch(() => {})
      .finally(() => { if (active) setLoading(false); });
    return () => { active = false; };
  }, []);

  const first = events[0];
  return <section id="clima-solar" className="rounded-2xl border border-cyan-500/30 bg-[#101b30] p-4">
    <p className="flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-cyan-300"><Radio className="h-4 w-4" /> Clima solar NASA</p>
    {loading ? <p className="mt-2 text-sm text-slate-300">Consultando actividad solar…</p> : first ? <>
      <div className="mt-3 flex items-center justify-between gap-2"><h2 className="font-bold text-white">{first.eventType}</h2><span className="shrink-0 rounded-full bg-slate-800 px-2 py-1 text-xs text-cyan-200">{first.isHistorical ? 'Histórico' : 'Reciente'}</span></div>
      <p className="mt-1 text-sm text-slate-300">Observado: {first.observedAt.slice(0, 10)}</p>
      <a href={first.sourceUrl} target="_blank" rel="noreferrer" className="mt-2 inline-flex items-center gap-1 text-sm text-cyan-300 hover:underline">Ver registro NASA <ExternalLink className="h-3.5 w-3.5" /></a>
      {events.length > 1 && <details className="mt-3 border-t border-slate-700 pt-2 text-sm text-slate-300"><summary className="cursor-pointer text-cyan-200">Ver otros {events.length - 1} eventos</summary><ul className="mt-2 space-y-2">{events.slice(1).map((event) => <li key={event.externalId}><a href={event.sourceUrl} target="_blank" rel="noreferrer" className="text-slate-200 hover:text-cyan-300">{event.eventType} · {event.observedAt.slice(0, 10)}</a></li>)}</ul></details>}
    </> : <p className="mt-2 text-sm text-slate-300">No hay registros disponibles ahora.</p>}
  </section>;
}
