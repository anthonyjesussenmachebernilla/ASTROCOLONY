'use client';

import { BatteryCharging, FlaskConical, HeartPulse, ShieldCheck, Sprout, Sun, Wind } from 'lucide-react';
import type { ResourceSnapshot } from '@/modules/simulation/domain/types';

interface ResourceBarProps {
  resources: ResourceSnapshot;
  currentTurn: number;
  maxTurns: number;
  actionsTakenThisTurn: number;
  maxActionsPerTurn: number;
}

const MAIN = [
  { key: 'energy', label: 'Energía', icon: BatteryCharging, color: 'bg-amber-400', low: 25, help: 'Enciende los equipos' },
  { key: 'oxygen', label: 'Oxígeno', icon: Wind, color: 'bg-cyan-400', low: 30, help: 'Aire para respirar' },
  { key: 'radiationProtection', label: 'Protección', icon: ShieldCheck, color: 'bg-indigo-400', low: 35, help: 'Defiende de la radiación' },
] as const;

export function ResourceBar({ resources, currentTurn, maxTurns, actionsTakenThisTurn, maxActionsPerTurn }: ResourceBarProps) {
  return <header className="rounded-3xl border border-cyan-500/25 bg-[#101b30] p-4 shadow-lg sm:p-5">
    <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
      <div className="flex items-center gap-3"><div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-orange-500/20 text-orange-300"><Sun className="h-6 w-6" /></div><div><p className="text-xs font-bold uppercase tracking-widest text-cyan-300">Misión en Marte</p><h1 className="text-xl font-extrabold text-white">Sol {Math.min(currentTurn, maxTurns)} <span className="font-medium text-slate-400">de {maxTurns}</span></h1></div></div>
      <div className="rounded-xl border border-slate-700 bg-slate-900 px-3 py-2 text-sm text-slate-200">Decisiones: <strong className="text-cyan-300">{actionsTakenThisTurn}/{maxActionsPerTurn}</strong></div>
    </div>
    <div className="grid gap-2.5 sm:grid-cols-3">
      {MAIN.map((item) => {
        const Icon = item.icon;
        const value = resources[item.key];
        const low = value <= item.low;
        return <div key={item.key} className={`rounded-2xl border p-3 ${low ? 'border-red-400/70 bg-red-950/30' : 'border-slate-700 bg-slate-900/75'}`}>
          <div className="flex items-center justify-between gap-2"><span className="flex items-center gap-2 font-bold text-white"><Icon className={`h-5 w-5 ${low ? 'text-red-300' : 'text-cyan-300'}`} />{item.label}</span><strong className={`text-xl ${low ? 'text-red-300' : 'text-white'}`}>{value}</strong></div>
          <div className="mt-2 h-2.5 overflow-hidden rounded-full bg-slate-700"><div className={`h-full rounded-full ${low ? 'bg-red-400' : item.color}`} style={{ width: `${Math.max(0, Math.min(100, value))}%` }} /></div>
          <p className="mt-1.5 text-xs text-slate-400">{low ? '¡Necesita atención!' : item.help}</p>
        </div>;
      })}
    </div>
    <div className="mt-3 flex flex-wrap gap-2 text-sm">
      <span className="inline-flex items-center gap-1.5 rounded-lg bg-emerald-500/10 px-2.5 py-1.5 text-emerald-200"><Sprout className="h-4 w-4" /> Comida <strong>{resources.food}</strong></span>
      <span className="inline-flex items-center gap-1.5 rounded-lg bg-rose-500/10 px-2.5 py-1.5 text-rose-200"><HeartPulse className="h-4 w-4" /> Salud <strong>{resources.crewHealth}%</strong></span>
      <span className="inline-flex items-center gap-1.5 rounded-lg bg-purple-500/10 px-2.5 py-1.5 text-purple-200"><FlaskConical className="h-4 w-4" /> Ciencia <strong>{resources.science}</strong></span>
    </div>
  </header>;
}
