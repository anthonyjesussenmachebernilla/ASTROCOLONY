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
      className="relative overflow-hidden rounded-2xl border border-cyan-400/45 bg-gradient-to-r from-[#0F1B35] via-[#132242] to-[#1A1B3B] p-4 shadow-xl"
    >
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="flex items-start gap-3.5">
          {/* Mascota Robot SVG amigable */}
          <motion.div
            animate={reducedMotion ? undefined : { y: [0, -4, 0] }}
            transition={
              reducedMotion
                ? undefined
                : { duration: 2.8, repeat: Infinity, ease: 'easeInOut' }
            }
            className="shrink-0"
          >
            <svg
              width="58"
              height="58"
              viewBox="0 0 64 64"
              fill="none"
              xmlns="http://www.w3.org/2000/svg"
              aria-hidden="true"
              className="drop-shadow-[0_0_10px_rgba(34,211,238,0.45)]"
            >
              {/* Antena */}
              <line x1="32" y1="6" x2="32" y2="14" stroke="#22D3EE" strokeWidth="3" strokeLinecap="round" />
              <circle cx="32" cy="5" r="3.5" fill="#F97316" />
              {/* Cabeza del robot */}
              <rect x="12" y="14" width="40" height="32" rx="10" fill="#E2E8F0" stroke="#38BDF8" strokeWidth="2.5" />
              {/* Visor */}
              <rect x="18" y="21" width="28" height="16" rx="6" fill="#0F172A" />
              {/* Ojos brillantes */}
              <circle cx="26" cy="29" r="3" fill="#22D3EE" />
              <circle cx="38" cy="29" r="3" fill="#22D3EE" />
              {/* Sonrisa */}
              <path d="M27 33.5 Q32 36.5 37 33.5" stroke="#38BDF8" strokeWidth="2" strokeLinecap="round" fill="none" />
              {/* Base / cuello */}
              <rect x="22" y="47" width="20" height="8" rx="4" fill="#94A3B8" />
            </svg>
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
