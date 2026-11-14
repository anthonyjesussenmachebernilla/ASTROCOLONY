'use client';

import Link from 'next/link';
import { ArrowRight, BatteryCharging, ExternalLink, FlaskConical, Rocket, ShieldCheck, Wind } from 'lucide-react';
import { NASA_SCIENTIFIC_SOURCES } from '@/data/scientific-sources/nasa-sources';

export default function HomePage() {
  return <main className="flex-1 px-4 py-8 sm:py-14">
    <div className="mx-auto max-w-6xl">
      <section className="relative overflow-hidden rounded-[2rem] border border-orange-400/40 bg-gradient-to-br from-[#172740] via-[#281d32] to-[#9c4429] p-7 shadow-2xl sm:p-12">
        <div className="absolute -right-20 -top-20 h-80 w-80 rounded-full bg-orange-400/15 blur-3xl" aria-hidden="true" />
        <div className="relative max-w-3xl"><p className="text-sm font-bold uppercase tracking-[0.2em] text-cyan-200">AstroColony · Juego de supervivencia en Marte</p><h1 className="mt-4 text-4xl font-black leading-tight text-white sm:text-6xl">¿Podrás mantener viva una colonia en Marte?</h1><p className="mt-5 max-w-xl text-lg text-orange-50">Tienes 10 soles para cuidar a 4 astronautas. Cada elección ayuda en algo y cuesta otra cosa.</p>
          <div className="mt-7 flex flex-wrap gap-3"><Link href="/intro" className="inline-flex min-h-14 items-center gap-2 rounded-2xl bg-orange-400 px-6 py-3 text-lg font-extrabold text-slate-950 hover:bg-orange-300"><Rocket className="h-5 w-5" /> Empezar a jugar <ArrowRight className="h-5 w-5" /></Link><Link href="/game" className="inline-flex min-h-14 items-center rounded-2xl border border-white/40 bg-slate-950/30 px-5 py-3 font-semibold text-white hover:bg-slate-950/50">Ya sé jugar</Link></div>
        </div>
      </section>

      <section className="mt-8"><h2 className="text-2xl font-bold text-white">Tu reto en 3 pasos</h2><div className="mt-4 grid gap-3 md:grid-cols-3">
        <div className="rounded-2xl border border-slate-700 bg-[#101b30] p-5"><div className="mb-3 flex gap-2 text-cyan-300"><BatteryCharging /><Wind /><ShieldCheck /></div><p className="text-xs font-bold uppercase tracking-widest text-cyan-300">01 · Observa</p><h3 className="mt-1 text-lg font-bold text-white">Cuida lo esencial</h3><p className="mt-1 text-sm text-slate-300">Energía, aire y protección mantienen viva la base.</p></div>
        <div className="rounded-2xl border border-slate-700 bg-[#101b30] p-5"><p className="text-xs font-bold uppercase tracking-widest text-orange-300">02 · Decide</p><h3 className="mt-1 text-lg font-bold text-white">Elige hasta 2 acciones</h3><p className="mt-1 text-sm text-slate-300">Mira qué ganas y qué gastas antes de elegir.</p></div>
        <div className="rounded-2xl border border-slate-700 bg-[#101b30] p-5"><p className="text-xs font-bold uppercase tracking-widest text-emerald-300">03 · Descubre</p><h3 className="mt-1 text-lg font-bold text-white">Pasa al siguiente sol</h3><p className="mt-1 text-sm text-slate-300">Observa las consecuencias y ajusta tu plan.</p></div>
      </div></section>

      <details className="mt-7 rounded-2xl border border-cyan-500/30 bg-[#101b30] p-5 text-slate-300"><summary className="flex cursor-pointer items-center gap-2 text-base font-bold text-cyan-200"><FlaskConical className="h-5 w-5" /> ¿Dónde aparece la ciencia de NASA?</summary><p className="mt-3 text-sm">El clima solar de DONKI aporta registros reales. Los números de energía, aire y comida son unidades educativas de la simulación.</p><div className="mt-4 grid gap-2 sm:grid-cols-2">{NASA_SCIENTIFIC_SOURCES.map((source) => <a key={source.id} href={source.url} target="_blank" rel="noreferrer" className="flex items-center justify-between gap-2 rounded-xl border border-slate-700 bg-slate-900/70 p-3 text-sm text-cyan-200 hover:bg-slate-800"><span>{source.title}</span><ExternalLink className="h-4 w-4 shrink-0" /></a>)}</div></details>
    </div>
  </main>;
}
