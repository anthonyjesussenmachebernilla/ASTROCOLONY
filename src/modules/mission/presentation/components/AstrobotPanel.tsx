'use client';

import { AlertTriangle, Bot, ExternalLink } from 'lucide-react';
import type { AstrobotMessage } from '@/modules/simulation/domain/astrobot';
import type { SpaceEventRecord } from '@/modules/simulation/domain/types';

interface AstrobotPanelProps {
  astrobot: AstrobotMessage;
  activeEvent: SpaceEventRecord | null;
  turnSummary: string[];
}

export function AstrobotPanel({ astrobot, activeEvent, turnSummary }: AstrobotPanelProps) {
  return <aside className="space-y-3">
    <section className="rounded-2xl border border-cyan-500/35 bg-[#101b30] p-4">
      <div className="flex gap-3"><div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-cyan-500/20 text-cyan-300"><Bot className="h-6 w-6" /></div><div><p className="text-xs font-bold uppercase tracking-wider text-cyan-300">Astrobot te ayuda</p><h2 className="mt-1 text-base font-bold text-white">{astrobot.title}</h2><p className="mt-1 text-sm leading-relaxed text-slate-200">{astrobot.tip}</p></div></div>
      <details className="mt-3 text-sm text-slate-300"><summary className="cursor-pointer text-cyan-200">Más información</summary><p className="mt-2">{astrobot.message}</p></details>
    </section>

    {activeEvent && <section className="rounded-2xl border border-orange-400/60 bg-orange-950/30 p-4">
      <p className="flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-orange-300"><AlertTriangle className="h-4 w-4" /> Alerta del sol {activeEvent.turn}</p>
      <h2 className="mt-2 font-bold text-white">{activeEvent.title}</h2>
      <p className="mt-1 text-sm text-slate-200">{activeEvent.kidSummary}</p>
      <details className="mt-3 text-xs text-slate-300"><summary className="cursor-pointer text-orange-200">¿Qué dice la ciencia?</summary><p className="mt-2">{activeEvent.engineeringLesson}</p><a href={activeEvent.scientificReference.sourceUrl} target="_blank" rel="noreferrer" className="mt-2 inline-flex items-center gap-1 text-cyan-300">Fuente NASA · {activeEvent.scientificReference.isHistorical ? 'registro histórico' : 'registro reciente'} <ExternalLink className="h-3 w-3" /></a></details>
    </section>}

    {turnSummary.length > 0 && <details className="rounded-2xl border border-slate-700 bg-[#101b30] p-3 text-sm text-slate-300"><summary className="cursor-pointer font-semibold text-slate-200">¿Qué pasó en el último sol?</summary><ul className="mt-2 list-inside list-disc space-y-1">{turnSummary.map((line, index) => <li key={index}>{line}</li>)}</ul></details>}
  </aside>;
}
