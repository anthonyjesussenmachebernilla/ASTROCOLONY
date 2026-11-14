'use client';

import Link from 'next/link';
import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { Award, ArrowRight, RotateCcw, ShieldAlert } from 'lucide-react';
import { useGameStore } from '@/stores/game.store';

export default function ResultsPage() {
  const router = useRouter();
  const { mission, lastError, hydrateOrStartMission, startNewMission } = useGameStore();
  useEffect(() => { void hydrateOrStartMission(); }, [hydrateOrStartMission]);
  const won = mission.status === 'VICTORY';
  const failed = mission.status === 'DEFEAT';
  const retry = async () => { await startNewMission(); if (useGameStore.getState().isPersisted) router.push('/game'); };

  return <main className="mx-auto flex w-full max-w-4xl flex-1 flex-col gap-5 px-4 py-8">
    <section className={`rounded-3xl border p-6 shadow-2xl sm:p-9 ${won ? 'border-emerald-400/50 bg-emerald-950/30' : 'border-orange-400/50 bg-[#201d2a]'}`}>
      <div className="flex items-center gap-3 text-orange-300">{won ? <Award className="h-10 w-10 text-emerald-300" /> : <ShieldAlert className="h-10 w-10" />}<p className="text-sm font-bold uppercase tracking-widest">Resultado de la misión</p></div>
      <h1 className="mt-4 text-3xl font-black text-white sm:text-4xl">{won ? '¡La colonia sobrevivió!' : failed ? 'La colonia necesita otro plan' : 'Tu misión sigue en marcha'}</h1>
      <p className="mt-3 text-base text-slate-200">{mission.outcomeReason ?? 'Vuelve a la colonia y sigue tomando decisiones.'}</p>
      <div className="mt-6 grid grid-cols-3 gap-2 text-center sm:gap-3"><div className="rounded-2xl bg-slate-900/75 p-3"><p className="text-xs text-slate-400">Soles</p><strong className="text-xl text-white">{Math.min(mission.currentTurn, mission.maxTurns)}/{mission.maxTurns}</strong></div><div className="rounded-2xl bg-slate-900/75 p-3"><p className="text-xs text-slate-400">Tripulación</p><strong className="text-xl text-rose-300">{mission.resources.crewHealth}%</strong></div><div className="rounded-2xl bg-slate-900/75 p-3"><p className="text-xs text-slate-400">Ciencia</p><strong className="text-xl text-purple-300">{mission.resources.science}</strong></div></div>
      <div className="mt-6 flex flex-wrap gap-3"><button type="button" onClick={() => void retry()} className="inline-flex min-h-12 items-center gap-2 rounded-xl bg-orange-400 px-5 font-bold text-slate-950 hover:bg-orange-300"><RotateCcw className="h-4 w-4" /> Probar otro plan</button><Link href="/game" className="inline-flex min-h-12 items-center gap-2 rounded-xl border border-slate-600 px-5 font-bold text-white hover:bg-slate-800">Volver a la colonia <ArrowRight className="h-4 w-4" /></Link></div>
      {lastError && <p role="alert" className="mt-3 text-sm text-red-200">{lastError}</p>}
    </section>
    <details className="rounded-2xl border border-slate-700 bg-[#101b30] p-5"><summary className="cursor-pointer font-bold text-cyan-200">Ver recursos y decisiones de la misión</summary><div className="mt-4 grid grid-cols-2 gap-2 text-sm text-slate-200 sm:grid-cols-4"><span>Energía: <strong>{mission.resources.energy}</strong></span><span>Oxígeno: <strong>{mission.resources.oxygen}</strong></span><span>Protección: <strong>{mission.resources.radiationProtection}</strong></span><span>Comida: <strong>{mission.resources.food}</strong></span></div><ul className="mt-4 space-y-2">{mission.actionHistory.map((item, index) => <li key={index} className="rounded-xl bg-slate-900/75 p-3 text-sm"><strong className="text-white">Sol {item.turn} · {item.title}</strong><p className="mt-1 text-slate-300">{item.educationalNote}</p></li>)}</ul>{mission.actionHistory.length === 0 && <p className="mt-4 text-sm text-slate-400">Aún no hay decisiones.</p>}</details>
  </main>;
}
