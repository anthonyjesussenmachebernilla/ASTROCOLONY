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
  return <header className="rounded-2xl border border-[rgba(255,218,175,0.22)] bg-[rgba(21,25,30,0.82)] p-4 shadow-[0_14px_40px_rgba(0,0,0,0.28)] backdrop-blur-md sm:p-5">
    <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
      <div className="flex items-center gap-3">
        <div className="flex h-12 w-12 items-center justify-center rounded-xl border border-[#ffd27a]/35 bg-[#ffd27a]/15 text-[#ffd27a]">
          <Sun className="h-6 w-6" />
        </div>
        <div>
          <p className="text-[11px] font-bold uppercase tracking-[0.26em] text-[#e2bca3]">Misión en Marte</p>
          <h1 className="text-xl font-extrabold text-[#ffd27a]">Sol {Math.min(currentTurn, maxTurns)} <span className="font-medium text-[#d4d2cb]">de {maxTurns}</span></h1>
        </div>
      </div>
      <div className="rounded-xl border border-[rgba(255,226,186,0.22)] bg-[rgba(24,24,26,0.75)] px-3.5 py-2 text-sm text-[#eee8e0]">Decisiones: <strong className="text-[#8adbe5]">{actionsTakenThisTurn}/{maxActionsPerTurn}</strong></div>
    </div>
    <div className="grid gap-2.5 sm:grid-cols-3">
      {MAIN.map((item) => {
        const Icon = item.icon;
        const value = resources[item.key];
        const low = value <= item.low;
        return <div key={item.key} className={`rounded-xl border p-3 transition-colors ${low ? 'border-red-400/70 bg-red-950/35' : 'border-white/10 bg-[rgba(15,18,23,0.72)]'}`}>
          <div className="flex items-center justify-between gap-2"><span className="flex items-center gap-2 font-bold text-[#f8f7f0]"><Icon className={`h-5 w-5 ${low ? 'text-red-300' : 'text-[#8adbe5]'}`} />{item.label}</span><strong className={`text-xl ${low ? 'text-red-300' : 'text-[#f8f7f0]'}`}>{value}</strong></div>
          <div className="mt-2 h-2 overflow-hidden rounded-full bg-white/10"><div className={`h-full rounded-full ${low ? 'bg-red-400' : item.color}`} style={{ width: `${Math.max(0, Math.min(100, value))}%` }} /></div>
          <p className="mt-1.5 text-xs text-[#d4d2cb]/80">{low ? '¡Necesita atención!' : item.help}</p>
        </div>;
      })}
    </div>
    <div className="mt-3 flex flex-wrap gap-2 text-sm">
      <span className="inline-flex items-center gap-1.5 rounded-lg border border-emerald-400/20 bg-emerald-500/10 px-2.5 py-1.5 text-emerald-200"><Sprout className="h-4 w-4" /> Comida <strong>{resources.food}</strong></span>
      <span className="inline-flex items-center gap-1.5 rounded-lg border border-rose-400/20 bg-rose-500/10 px-2.5 py-1.5 text-rose-200"><HeartPulse className="h-4 w-4" /> Salud <strong>{resources.crewHealth}%</strong></span>
      <span className="inline-flex items-center gap-1.5 rounded-lg border border-purple-400/20 bg-purple-500/10 px-2.5 py-1.5 text-purple-200"><FlaskConical className="h-4 w-4" /> Ciencia <strong>{resources.science}</strong></span>
    </div>
  </header>;
}
