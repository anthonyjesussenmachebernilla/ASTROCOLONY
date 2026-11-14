'use client';

import Link from 'next/link';
import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { Award, ArrowRight, RotateCcw, ShieldAlert } from 'lucide-react';
import { useGameStore } from '@/stores/game.store';
import { useAdventureStore } from '@/stores/adventure.store';
import { EMPTY_ADVENTURE } from '@/modules/adventure/domain/adventure';

export default function ResultsPage() {
  const router = useRouter();
  const { mission, lastError, hydrateOrStartMission, startNewMission } = useGameStore();
  const { missions, load } = useAdventureStore();
  const discoveries = missions[mission.missionId] ?? EMPTY_ADVENTURE;
  useEffect(() => { load(); void hydrateOrStartMission(); }, [hydrateOrStartMission, load]);
  const won = mission.status === 'VICTORY';
  const failed = mission.status === 'DEFEAT';
  const retry = async () => { await startNewMission(mission.randomSeed); if (useGameStore.getState().isPersisted && !useGameStore.getState().lastError) router.push('/game'); };

  return <main className="mx-auto flex w-full max-w-4xl flex-1 flex-col gap-5 px-4 py-8">
    <section className={`rounded-3xl border p-6 shadow-2xl sm:p-9 ${won ? 'border-emerald-400/50 bg-emerald-950/30' : 'border-orange-400/50 bg-[#201d2a]'}`}>
      <div className="flex items-center gap-3 text-orange-300">{won ? <Award className="h-10 w-10 text-emerald-300" /> : <ShieldAlert className="h-10 w-10" />}<p className="text-sm font-bold uppercase tracking-widest">Resultado de la misión</p></div>
      <h1 className="mt-4 text-3xl font-black text-white sm:text-4xl">{won ? '¡La colonia sobrevivió!' : failed ? 'La colonia necesita otro plan' : 'Tu misión sigue en marcha'}</h1>
      <p className="mt-3 text-base text-slate-200">{mission.outcomeReason ?? 'Vuelve a la colonia y sigue tomando decisiones.'}</p>
      <div className="mt-6 grid grid-cols-3 gap-2 text-center sm:gap-3"><div className="rounded-2xl bg-slate-900/75 p-3"><p className="text-xs text-slate-400">Soles</p><strong className="text-xl text-white">{Math.min(mission.currentTurn, mission.maxTurns)}/{mission.maxTurns}</strong></div><div className="rounded-2xl bg-slate-900/75 p-3"><p className="text-xs text-slate-400">Tripulación</p><strong className="text-xl text-rose-300">{mission.resources.crewHealth}%</strong></div><div className="rounded-2xl bg-slate-900/75 p-3"><p className="text-xs text-slate-400">Ciencia</p><strong className="text-xl text-purple-300">{mission.resources.science}</strong></div></div>
      <div className="mt-6 flex flex-wrap gap-3"><button type="button" onClick={() => void retry()} className="inline-flex min-h-12 items-center gap-2 rounded-xl bg-orange-400 px-5 font-bold text-slate-950 hover:bg-orange-300"><RotateCcw className="h-4 w-4" /> Probar otro plan</button><Link href="/game" className="inline-flex min-h-12 items-center gap-2 rounded-xl border border-slate-600 px-5 font-bold text-white hover:bg-slate-800">Volver a la colonia <ArrowRight className="h-4 w-4" /></Link></div>
      {lastError && <p role="alert" className="mt-3 text-sm text-red-200">{lastError}</p>}
    </section>
    <section className="rounded-2xl border border-emerald-400/30 bg-[#142d30] p-5"><h2 className="text-xl font-bold text-emerald-100">Tus descubrimientos cuentan</h2><p className="mt-3 text-slate-200">Completaste {discoveries.completed.length} de 3 desafíos de ingeniería. {discoveries.classifiedEvidence ? 'También aprendiste a separar una observación de una hipótesis.' : 'En tu cuaderno puedes seguir practicando cómo investigar.'}</p><p className="mt-3 text-sm text-slate-300">{mission.resources.oxygen < 30 ? 'Para tu próximo plan: producir aire usa batería. Reserva energía antes de encender el generador.' : mission.resources.energy < 30 ? 'Para tu próximo plan: cultivar y explorar gastan energía. Alterna esos trabajos con ahorro de electricidad.' : 'Para tu próximo plan: compara el beneficio y el costo de cada decisión antes de avanzar un sol.'}</p>{failed && !mission.actionHistory.some((a) => a.kind === 'RESCUE') && <Link href="/game" className="mt-4 inline-flex min-h-12 items-center rounded-xl bg-amber-200 px-4 font-bold text-stone-950">Preparar una misión de rescate</Link>}</section>
    <details className="rounded-2xl border border-slate-700 bg-[#101b30] p-5"><summary className="cursor-pointer font-bold text-cyan-200">Ver recursos y decisiones de la misión</summary><div className="mt-4 grid grid-cols-2 gap-2 text-sm text-slate-200 sm:grid-cols-4"><span>Energía: <strong>{mission.resources.energy}</strong></span><span>Oxígeno: <strong>{mission.resources.oxygen}</strong></span><span>Protección: <strong>{mission.resources.radiationProtection}</strong></span><span>Comida: <strong>{mission.resources.food}</strong></span></div><ul className="mt-4 space-y-2">{mission.actionHistory.map((item, index) => <li key={index} className="rounded-xl bg-slate-900/75 p-3 text-sm"><strong className="text-white">Sol {item.turn} · {item.title}</strong><p className="mt-1 text-slate-300">{item.educationalNote}</p></li>)}</ul>{mission.actionHistory.length === 0 && <p className="mt-4 text-sm text-slate-400">Aún no hay decisiones.</p>}</details>
  </main>;
}
