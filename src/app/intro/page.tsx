'use client';

import Link from 'next/link';
import { useState } from 'react';
import { ArrowRight, BatteryCharging, Bot, Rocket, ShieldCheck, Wind } from 'lucide-react';

const STEPS = [
  { title: 'Cuida a tu tripulación', text: 'Mantén viva la colonia durante 10 soles marcianos.', visual: <div className="flex justify-center gap-5 text-cyan-200"><BatteryCharging className="h-14 w-14" /><Wind className="h-14 w-14" /><ShieldCheck className="h-14 w-14" /></div>, hint: 'Vigila energía, oxígeno y protección.' },
  { title: 'Toda elección tiene un costo', text: 'Puedes elegir hasta 2 acciones por sol.', visual: <div className="flex items-center justify-center gap-3 text-3xl font-black"><span className="rounded-xl bg-emerald-500/20 px-4 py-3 text-emerald-300">+ aire</span><span className="text-white">↔</span><span className="rounded-xl bg-amber-500/20 px-4 py-3 text-amber-300">− energía</span></div>, hint: 'Mira lo que ganas y gastas antes de elegir.' },
  { title: 'Aprende de cada sol', text: 'Pasa al siguiente día y observa qué cambió.', visual: <div className="flex justify-center text-orange-300"><Rocket className="h-20 w-20" /></div>, hint: 'Las alertas solares usan registros de NASA DONKI.' },
];

export default function IntroPage() {
  const [step, setStep] = useState(0);
  const current = STEPS[step];
  return <main className="flex flex-1 items-center justify-center px-4 py-8"><section className="w-full max-w-2xl rounded-3xl border border-cyan-500/35 bg-[#101b30] p-6 shadow-2xl sm:p-9">
    <div className="flex items-center justify-between"><span className="text-sm font-bold uppercase tracking-widest text-cyan-300">Cómo jugar · {step + 1}/3</span><Link href="/game" className="text-sm text-slate-300 underline hover:text-white">Saltar</Link></div>
    <div className="mt-7 flex items-center gap-3"><div className="rounded-xl bg-cyan-500/15 p-2 text-cyan-300"><Bot className="h-7 w-7" /></div><h1 className="text-2xl font-extrabold text-white sm:text-3xl">{current.title}</h1></div>
    <p className="mt-3 text-lg text-slate-200">{current.text}</p>
    <div className="my-7 flex min-h-44 flex-col items-center justify-center gap-5 rounded-2xl border border-slate-700 bg-slate-900/70 p-5">{current.visual}<p className="text-center text-sm text-slate-300">{current.hint}</p></div>
    <div className="flex items-center justify-between"><div className="flex gap-2">{STEPS.map((_, index) => <button key={index} type="button" onClick={() => setStep(index)} aria-label={`Ir al paso ${index + 1}`} className={`h-2.5 rounded-full ${index === step ? 'w-9 bg-cyan-400' : 'w-2.5 bg-slate-600'}`} />)}</div>{step < STEPS.length - 1 ? <button type="button" onClick={() => setStep(step + 1)} className="inline-flex min-h-12 items-center gap-2 rounded-xl bg-cyan-400 px-5 font-bold text-slate-950 hover:bg-cyan-300">Siguiente <ArrowRight className="h-4 w-4" /></button> : <Link href="/game" className="inline-flex min-h-12 items-center gap-2 rounded-xl bg-orange-400 px-5 font-bold text-slate-950 hover:bg-orange-300">Jugar ahora <Rocket className="h-4 w-4" /></Link>}</div>
  </section></main>;
}
