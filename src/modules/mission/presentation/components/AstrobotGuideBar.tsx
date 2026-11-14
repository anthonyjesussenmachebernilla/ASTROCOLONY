'use client';

import { motion } from 'framer-motion';
import { ChevronDown, ChevronUp, Compass, Sparkles } from 'lucide-react';
import { useState } from 'react';
import type { AstrobotStepGuide } from '@/modules/simulation/domain/astrobot';
import type { BuildingId } from '@/modules/simulation/domain/types';

interface AstrobotGuideBarProps {
  guide: AstrobotStepGuide;
  reducedMotion: boolean;
  onFocusBuilding: (buildingId: BuildingId) => void;
}

const STEP_TITLES = [
  '1. Explora',
  '2. Decide',
  '3. Balancea',
  '4. Siguiente Sol',
] as const;

export function AstrobotGuideBar({
  guide,
  reducedMotion,
  onFocusBuilding,
}: AstrobotGuideBarProps) {
  const [collapsed, setCollapsed] = useState(false);

  if (collapsed) {
    return (
      <div className="flex items-center justify-between rounded-2xl border border-cyan-500/35 bg-[#101b30]/90 px-4 py-2.5 shadow-md">
        <div className="flex items-center gap-2.5">
          <span className="inline-flex h-7 w-7 items-center justify-center rounded-lg bg-cyan-500/20 text-cyan-300 text-xs font-bold">
            🤖
          </span>
          <p className="text-xs sm:text-sm font-semibold text-cyan-100">
            Guía de ASTROBOT (Paso {guide.stepNumber}/4: {guide.stepLabel})
          </p>
        </div>
        <button
          type="button"
          onClick={() => setCollapsed(false)}
          className="inline-flex items-center gap-1 rounded-xl border border-cyan-400/40 bg-cyan-500/15 px-3 py-1.5 text-xs font-bold text-cyan-200 hover:bg-cyan-500/25 cursor-pointer"
        >
          Mostrar guía <ChevronDown className="h-3.5 w-3.5" />
        </button>
      </div>
    );
  }

  return (
    <section
      aria-label="Guía paso a paso de ASTROBOT"
      className="relative overflow-hidden rounded-2xl border border-[rgba(104,213,234,0.55)] bg-[linear-gradient(115deg,rgba(10,34,43,0.92),rgba(14,25,32,0.86))] p-4 shadow-[0_0_26px_rgba(67,185,213,0.14),inset_0_0_24px_rgba(60,144,166,0.08)] backdrop-blur-md"
    >
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="flex items-start gap-3.5">
          {/* Mascota Robot estilo Aurora con visor cian brillante */}
          <motion.div
            animate={reducedMotion ? undefined : { y: [0, -4, 0] }}
            transition={
              reducedMotion
                ? undefined
                : { duration: 2.8, repeat: Infinity, ease: 'easeInOut' }
            }
            className="relative flex h-[68px] w-[68px] shrink-0 items-center justify-center"
            aria-hidden="true"
          >
            <div className="absolute h-[58px] w-[62px] -rotate-3 rounded-[22px] border-[4px] border-[#5e707b] bg-gradient-to-br from-[#e7dccd] to-[#7f95a0] shadow-[0_4px_16px_rgba(0,0,0,0.5)]" />
            <div className="relative z-10 flex h-[34px] w-[48px] items-center justify-evenly rounded-[13px] bg-[#0d242e] px-1.5 shadow-inner">
              <span className="h-3 w-3 rounded-full bg-[#8adbe5] shadow-[0_0_10px_#8adbe5]" />
              <span className="h-3 w-3 rounded-full bg-[#8adbe5] shadow-[0_0_10px_#8adbe5]" />
            </div>
          </motion.div>

          <div className="min-w-0">
            <div className="flex flex-wrap items-center gap-2">
              <span className="inline-flex items-center gap-1 rounded-full bg-cyan-500/20 border border-cyan-400/40 px-2.5 py-0.5 text-[11px] font-bold uppercase tracking-wider text-cyan-200">
                <Sparkles className="h-3 w-3" />
                Guía ASTROBOT • Paso {guide.stepNumber} de {guide.totalSteps}
              </span>
              <span className="text-xs font-bold text-orange-300">
                {guide.stepLabel}
              </span>
            </div>

            <p className="mt-1.5 text-sm sm:text-base font-semibold text-white leading-snug">
              {guide.instruction}
            </p>

            {/* Barra de 4 pasos del turno */}
            <div className="mt-3 flex flex-wrap items-center gap-1.5">
              {STEP_TITLES.map((label, idx) => {
                const stepNum = idx + 1;
                const isActive = stepNum === guide.stepNumber;
                const isDone = stepNum < guide.stepNumber;
                return (
                  <span
                    key={label}
                    className={`rounded-lg px-2.5 py-1 text-[11px] font-bold transition-colors ${
                      isActive
                        ? 'bg-cyan-400 text-slate-950 shadow'
                        : isDone
                          ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/40'
                          : 'bg-slate-900/70 text-slate-400 border border-slate-800'
                    }`}
                  >
                    {label}
                  </span>
                );
              })}
            </div>
          </div>
        </div>

        <div className="flex flex-row md:flex-col items-center md:items-end gap-2 shrink-0">
          {guide.suggestedBuilding && (
            <button
              type="button"
              onClick={() => onFocusBuilding(guide.suggestedBuilding!)}
              className="inline-flex items-center gap-1.5 rounded-xl bg-orange-500 hover:bg-orange-400 px-3.5 py-2 text-xs font-bold text-slate-950 shadow cursor-pointer"
            >
              <Compass className="h-3.5 w-3.5" />
              Enfocar módulo sugerido
            </button>
          )}
          <button
            type="button"
            onClick={() => setCollapsed(true)}
            className="inline-flex items-center gap-1 rounded-xl border border-slate-700 bg-slate-900/75 px-3 py-1.5 text-xs font-medium text-slate-300 hover:bg-slate-800 cursor-pointer"
          >
            Ocultar guía <ChevronUp className="h-3.5 w-3.5" />
          </button>
        </div>
      </div>
    </section>
  );
}
