'use client';

import {
  Battery,
  FlaskConical,
  Home,
  Radio,
  Shield,
  Sprout,
  Sun,
  Users,
  Wind,
} from 'lucide-react';
import { useSpaceWeather } from '@/modules/nasa/presentation/useSpaceWeather';
import { DEFAULT_SIMULATION_CONFIG } from '@/modules/simulation/domain/resource-rules';
import { validatePlayerAction } from '@/modules/simulation/domain/simulation-engine';
import type {
  ActionType,
  BuildingId,
  MissionSimulationState,
  SpaceEventRecord,
} from '@/modules/simulation/domain/types';
import { ColonyScene3D } from './ColonyScene3D';

interface ColonyMapProps {
  selectedBuilding: BuildingId | null;
  onSelectBuilding: (id: BuildingId) => void;
  activeEvent: SpaceEventRecord | null;
  reducedMotion: boolean;
  mission: MissionSimulationState;
  isSyncing: boolean;
  isPersisted: boolean;
  onExecuteAction: (actionType: ActionType) => void | Promise<void>;
}

interface BuildingMeta {
  id: BuildingId;
  name: string;
  role: string;
  icon: typeof Home;
}

const BUILDINGS: BuildingMeta[] = [
  { id: 'HABITAT', name: 'Hábitat principal', role: 'Domo central para los 4 astronautas y atención médica.', icon: Home },
  { id: 'OXYGEN_GENERATOR', name: 'Generador de O₂', role: 'Produce aire respirable usando energía eléctrica.', icon: Wind },
  { id: 'SOLAR_PANELS', name: 'Paneles solares', role: 'Captan la luz del Sol marciano durante el día.', icon: Sun },
  { id: 'BATTERIES', name: 'Banco de baterías', role: 'Almacena energía: cada celda encendida son 25 U.E.', icon: Battery },
  { id: 'GREENHOUSE', name: 'Invernadero', role: 'Cultiva alimentos frescos y aporta oxígeno natural.', icon: Sprout },
  { id: 'SCIENCE_LAB', name: 'Laboratorio', role: 'Analiza muestras de Marte y suma puntos de ciencia.', icon: FlaskConical },
  { id: 'RADIATION_SHELTER', name: 'Refugio solar', role: 'Protege a la tripulación; la burbuja azul es tu blindaje.', icon: Shield },
  { id: 'COMMS_ANTENNA', name: 'Antena NASA', role: 'Habla con la Tierra: las señales tardan minutos en llegar.', icon: Radio },
];

const WEATHER_LABEL = {
  CALM: { text: 'Sol tranquilo', style: 'border-emerald-400/50 text-emerald-200' },
  ACTIVE: { text: 'Sol activo', style: 'border-amber-400/60 text-amber-200' },
  STORMY: { text: 'Sol muy activo', style: 'border-red-400/60 text-red-200' },
} as const;

export function ColonyMap({
  selectedBuilding,
  onSelectBuilding,
  activeEvent,
  reducedMotion,
  mission,
  isSyncing,
  isPersisted,
  onExecuteAction,
}: ColonyMapProps) {
  const weather = useSpaceWeather();
  const resources = mission.resources;
  const selectedMeta =
    BUILDINGS.find((b) => b.id === selectedBuilding) ?? BUILDINGS[0];
  const moduleActions = Object.values(DEFAULT_SIMULATION_CONFIG.actions).filter(
    (a) => a.buildingId === selectedMeta.id,
  );
  const level = weather?.level ?? 'CALM';
  const isDustStorm = activeEvent?.type === 'DUST_STORM';
  const isSolarEvent = activeEvent?.type === 'SOLAR_EVENT';

  return (
    <section className="relative overflow-hidden rounded-2xl border border-orange-500/40 bg-[#1B1222] shadow-2xl">
      <div className="relative h-[340px] w-full sm:h-[440px] lg:h-[500px]">
        <ColonyScene3D
          resources={resources}
          activeEventType={activeEvent?.type ?? null}
          selectedBuilding={selectedBuilding}
          onSelectBuilding={onSelectBuilding}
          reducedMotion={reducedMotion}
          weatherLevel={level}
        />

        {/* HUD sobre la escena */}
        <div className="pointer-events-none absolute left-3 top-3 z-10 flex max-w-[calc(100%-1.5rem)] flex-wrap items-center gap-2">
          <span className="rounded-lg border border-orange-400/40 bg-slate-950/75 px-2.5 py-1 font-mono text-[11px] text-orange-200 backdrop-blur">
            Cráter Jezero • Marte: ~−63 °C y 610 Pa de promedio
          </span>
          <span className="inline-flex items-center gap-1 rounded-lg border border-cyan-400/40 bg-slate-950/75 px-2.5 py-1 font-mono text-[11px] text-cyan-200 backdrop-blur">
            <Users className="h-3 w-3" /> 4 astronautas • Salud {resources.crewHealth}%
          </span>
          <span
            className={`rounded-lg border bg-slate-950/75 px-2.5 py-1 text-[11px] font-semibold backdrop-blur ${WEATHER_LABEL[level].style}`}
            title={weather?.source}
          >
            {weather
              ? `${WEATHER_LABEL[level].text} (NASA DONKI${weather.isHistorical ? ', dato histórico' : ''}${
                  weather.strongestFlare ? `: llamarada ${weather.strongestFlare}` : ''
                })`
              : 'Consultando clima solar NASA…'}
          </span>
        </div>

        {isDustStorm && (
          <div className="pointer-events-none absolute bottom-3 left-3 right-3 z-10 rounded-xl border border-amber-400/60 bg-amber-950/80 px-3 py-2 text-xs font-semibold text-amber-100 backdrop-blur">
            Tormenta de polvo: los paneles solares producen menos energía.
          </div>
        )}
        {isSolarEvent && (
          <div className="pointer-events-none absolute bottom-3 left-3 right-3 z-10 rounded-xl border border-purple-400/60 bg-purple-950/80 px-3 py-2 text-xs font-semibold text-purple-100 backdrop-blur">
            Tormenta solar: tu blindaje (burbuja) está absorbiendo radiación.
          </div>
        )}
        <p className="pointer-events-none absolute bottom-2 right-3 z-10 hidden text-[10px] text-white/70 sm:block">
          Arrastra para girar • Rueda para acercar • Clic en un módulo
        </p>
      </div>

      <div className="bg-[#0D152B]/95 p-4">
        <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
          {BUILDINGS.map((building) => {
            const Icon = building.icon;
            const isSelected = selectedBuilding === building.id;
            return (
              <button
                key={building.id}
                type="button"
                onClick={() => onSelectBuilding(building.id)}
                aria-pressed={isSelected}
                className={`flex cursor-pointer items-center gap-2 rounded-xl border p-2.5 text-left transition-colors ${
                  isSelected
                    ? 'border-cyan-400 bg-cyan-950/50 text-white'
                    : 'border-slate-800 bg-slate-900/70 text-slate-300 hover:bg-slate-800'
                }`}
              >
                <Icon className="h-4 w-4 shrink-0 text-cyan-300" />
                <span className="truncate text-xs font-bold leading-tight">
                  {building.name}
                </span>
              </button>
            );
          })}
        </div>

        <div className="mt-3 rounded-xl border border-cyan-500/30 bg-slate-950/75 p-3">
          <p className="text-xs font-semibold uppercase tracking-wider text-cyan-300">
            Módulo seleccionado: {selectedMeta.name}
          </p>
          <p className="mt-0.5 text-sm text-slate-200">{selectedMeta.role}</p>

          {moduleActions.length === 0 ? (
            <p className="mt-2 text-xs text-slate-400">
              Este módulo no tiene una decisión directa: su estado depende de lo que decidas en los otros.
            </p>
          ) : (
            <div className="mt-2 flex flex-col gap-2">
              {moduleActions.map((action) => {
                const validation = validatePlayerAction(mission, action.id, DEFAULT_SIMULATION_CONFIG);
                const disabled = !validation.valid || !isPersisted || isSyncing;
                return (
                  <div key={action.id} className="rounded-lg border border-slate-800 bg-slate-900/70 p-2.5">
                    <p className="text-xs font-bold text-white">{action.name}</p>
                    <p className="text-[11px] text-emerald-300">Beneficio: {action.benefitsText}</p>
                    <p className="text-[11px] text-amber-300">Costo: {action.costsText}</p>
                    <button
                      type="button"
                      disabled={disabled}
                      title={validation.reason}
                      onClick={() => void onExecuteAction(action.id)}
                      className="mt-1.5 w-full cursor-pointer rounded-lg bg-cyan-500 px-3 py-1.5 text-xs font-bold text-slate-950 transition-colors hover:bg-cyan-400 disabled:cursor-not-allowed disabled:bg-slate-800 disabled:text-slate-500"
                    >
                      {isSyncing
                        ? 'Guardando…'
                        : validation.valid
                          ? 'Ejecutar decisión'
                          : (validation.reason ?? 'No disponible')}
                    </button>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>
    </section>
  );
}
