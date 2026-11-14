'use client';

import Link from 'next/link';
import { useEffect, useState } from 'react';
import { ArrowRight, Play, SkipForward } from 'lucide-react';

const SCENES = [
  { eyebrow: 'Nuevo objetivo', title: 'Conoce Aurora-1', objective: 'Sigue al ingeniero López y conoce la base.', speaker: 'Ing. López', line: 'Bienvenida a Aurora-1. Antes de salir, quiero mostrarte qué mantiene viva a la tripulación.', action: 'Seguir a López', position: 'left-[59%] top-[52%]', imagePosition: 'center center' },
  { eyebrow: 'Sistema vital', title: 'Revisa el suministro', objective: 'Inspecciona el panel de energía de la base.', speaker: 'Ing. López', line: 'La electricidad alimenta el oxígeno, el refugio y el invernadero. Cada decisión gasta una parte.', action: 'Inspeccionar panel', position: 'left-[27%] top-[54%]', imagePosition: '32% center' },
  { eyebrow: 'Alerta de misión', title: 'Prepara la colonia', objective: 'Observa Marte y decide qué atender primero.', speaker: 'Astrobot', line: 'Fuera nos esperan diez soles. Vigila los recursos, entra a los módulos y elige hasta dos acciones por sol.', action: 'Mirar hacia Marte', position: 'left-[82%] top-[48%]', imagePosition: '70% center' },
] as const;

export default function IntroPage() {
  const [step, setStep] = useState(0);
  const scene = SCENES[step];
  const finished = step === SCENES.length;

  useEffect(() => {
    const handleKey = (event: KeyboardEvent) => {
      if (event.key.toLowerCase() === 'e' && !event.repeat && !(event.target instanceof HTMLElement && event.target.closest('input, textarea, select, [contenteditable]'))) {
        setStep((current) => Math.min(SCENES.length, current + 1));
      }
    };
    window.addEventListener('keydown', handleKey);
    return () => window.removeEventListener('keydown', handleKey);
  }, []);

  return <main className="relative isolate flex min-h-[640px] flex-1 flex-col overflow-hidden bg-[#211a17] text-white sm:min-h-[100dvh]">
    <div className="absolute inset-0 -z-20 bg-cover transition-[background-position] duration-700 motion-reduce:transition-none" style={{ backgroundImage: "url('/aurora-arrival.webp')", backgroundPosition: finished ? 'center center' : scene.imagePosition }} aria-hidden="true" />
    <div className="absolute inset-0 -z-10 bg-gradient-to-t from-black/80 via-black/10 to-black/50" aria-hidden="true" />
    <header className="flex items-start justify-between gap-4 p-4 sm:p-7">
      <div className="rounded-md border-l-2 border-amber-300 bg-black/45 px-4 py-2 backdrop-blur-sm"><p className="text-xs font-bold uppercase tracking-[0.3em] text-amber-200">AstroColony</p><p className="text-xs uppercase tracking-[0.2em] text-white/80">Colonia Aurora-1 · Marte</p></div>
      <Link href="/game" className="inline-flex items-center gap-2 rounded-md bg-black/55 px-3 py-2 text-sm font-medium text-white/90 hover:bg-black/80"><SkipForward className="h-4 w-4" /> Saltar historia</Link>
    </header>

    <div className="relative flex flex-1 flex-col justify-between p-4 sm:p-7">
      {!finished ? <>
        <section aria-live="polite" className="max-w-sm rounded-lg border border-white/10 bg-black/65 p-4 shadow-xl backdrop-blur-sm sm:p-5">
          <p className="text-xs font-bold uppercase tracking-[0.18em] text-amber-300">◇ {scene.eyebrow} · {step + 1}/3</p>
          <h1 className="mt-2 text-xl font-semibold sm:text-2xl">{scene.title}</h1>
          <p className="mt-1 text-sm text-white/80">{scene.objective}</p>
          <div className="mt-4 flex gap-1.5" aria-label={`Paso ${step + 1} de 3`}>{SCENES.map((_, index) => <span key={index} className={`h-1 flex-1 rounded-full ${index <= step ? 'bg-amber-300' : 'bg-white/25'}`} />)}</div>
        </section>

        <button type="button" onClick={() => setStep((current) => current + 1)} className={`absolute hidden -translate-x-1/2 -translate-y-1/2 flex-col items-center gap-1 rounded-lg border border-amber-300/70 bg-black/70 px-4 py-2 text-sm font-bold text-white shadow-[0_0_22px_rgba(251,191,36,0.3)] backdrop-blur-sm hover:bg-amber-900/80 focus-visible:outline-2 focus-visible:outline-amber-200 sm:flex ${scene.position}`}><span className="text-xl text-amber-300">◇</span>{scene.action}<span className="text-xs font-normal text-white/70">E para interactuar</span></button>

        <div className="flex flex-col items-center gap-4 sm:items-end">
          <div aria-live="polite" className="max-w-2xl rounded-lg bg-black/70 px-5 py-3 text-center text-base leading-snug shadow-xl backdrop-blur-sm sm:text-lg"><span className="mr-2 font-semibold text-amber-300">{scene.speaker}:</span>{scene.line}</div>
          <button type="button" onClick={() => setStep((current) => current + 1)} className="inline-flex min-h-12 items-center gap-2 rounded-md border border-amber-200/65 bg-amber-700/75 px-5 font-bold text-white hover:bg-amber-600"><span className="rounded border border-white/60 px-1.5 text-xs">E</span> {scene.action} <ArrowRight className="h-4 w-4" /></button>
        </div>
      </> : <section className="mx-auto my-auto max-w-xl rounded-2xl border border-amber-200/40 bg-black/75 p-6 text-center shadow-2xl backdrop-blur-md sm:p-9">
        <p className="text-xs font-bold uppercase tracking-[0.25em] text-amber-300">Prólogo completado</p>
        <h1 className="mt-3 text-3xl font-bold">Tu historia empieza ahora</h1>
        <p className="mt-3 text-white/80">Explora Aurora-1, escucha las alertas y mantén con vida a cuatro astronautas durante diez soles.</p>
        <Link href="/game" className="mt-6 inline-flex min-h-14 items-center gap-3 rounded-lg bg-amber-500 px-6 text-lg font-bold text-stone-950 hover:bg-amber-400"><Play className="h-5 w-5 fill-current" /> Entrar a la colonia <ArrowRight className="h-5 w-5" /></Link>
      </section>}
    </div>

    <footer className="flex items-center justify-between gap-3 bg-black/50 px-4 py-2 text-xs text-white/75 sm:px-7"><span>Historia de ficción · Ciencia inspirada en datos NASA</span><span>Interactúa con E o con los botones</span></footer>
  </main>;
}
