'use client';

import { useEffect, useState } from 'react';
import {
  ArrowLeft,
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
  const [interiorBuilding, setInteriorBuilding] = useState<BuildingId | null>(null);
  const [firstPerson, setFirstPerson] = useState(false);
  const [nearbyBuilding, setNearbyBuilding] = useState<BuildingId | null>(null);
  useEffect(() => {
    const toggleView = (event: KeyboardEvent) => {
      if (event.key.toLowerCase() === 'v' && !(event.target instanceof HTMLElement && event.target.closest('input, textarea, select, [contenteditable]'))) {
        setFirstPerson((value) => !value);
      }
    };
    window.addEventListener('keydown', toggleView);
    return () => window.removeEventListener('keydown', toggleView);
  }, []);
  const [inspectedEquipment, setInspectedEquipment] = useState('Toca un equipo para descubrir qué hace.');
  const enterBuilding = (id: BuildingId) => {
    onSelectBuilding(id);
    setInteriorBuilding(id);
    setInspectedEquipment('Toca un equipo para descubrir qué hace.');
  };
  const weather = useSpaceWeather();
  const resources = mission.resources;
  const selectedMeta =
    BUILDINGS.find((b) => b.id === (interiorBuilding ?? selectedBuilding)) ?? BUILDINGS[0];
  const moduleActions = Object.values(DEFAULT_SIMULATION_CONFIG.actions).filter(
    (a) => a.buildingId === selectedMeta.id,
  );
  const level = weather?.level ?? 'CALM';
  const isDustStorm = activeEvent?.type === 'DUST_STORM';
  const isSolarEvent = activeEvent?.type === 'SOLAR_EVENT';
  const chapter = mission.currentTurn <= 3
    ? { number: '01', title: 'El primer amanecer', objective: 'Entra al hábitat y conoce la base.', target: 'HABITAT' as BuildingId }
    : mission.currentTurn <= 7
      ? { number: '02', title: 'Mantener la vida', objective: 'Inspecciona el aire y prepara los suministros.', target: 'OXYGEN_GENERATOR' as BuildingId }
      : { number: '03', title: 'La última señal', objective: 'Revisa la antena antes de terminar la misión.', target: 'COMMS_ANTENNA' as BuildingId };
  const nearbyMeta = BUILDINGS.find((building) => building.id === nearbyBuilding);
  const move = (key: string, down: boolean) => window.dispatchEvent(new KeyboardEvent(down ? 'keydown' : 'keyup', { key, bubbles: true }));

  return (
    <section className="relative overflow-hidden rounded-xl border border-stone-500/40 bg-[#201b1a] shadow-2xl">
      <div className="relative h-[calc(100dvh-110px)] min-h-[500px] w-full">
        <ColonyScene3D
          resources={resources}
          activeEventType={activeEvent?.type ?? null}
          selectedBuilding={selectedBuilding}
          onSelectBuilding={onSelectBuilding}
          reducedMotion={reducedMotion}
          weatherLevel={level}
          interiorBuilding={interiorBuilding}
          onEnterBuilding={enterBuilding}
          onInspect={setInspectedEquipment}
          firstPerson={firstPerson}
          onNearbyChange={setNearbyBuilding}
        />

        {!interiorBuilding && <div className="absolute left-3 top-3 z-20 max-w-[calc(100%-1.5rem)] rounded-xl border border-orange-200/30 bg-[#171923]/85 px-4 py-3 text-white shadow-xl backdrop-blur-sm sm:max-w-sm">
          <p className="text-[10px] font-bold uppercase tracking-[0.24em] text-orange-200">Capítulo {chapter.number} · Sol {mission.currentTurn}</p>
          <p className="mt-1 text-lg font-bold leading-tight">{chapter.title}</p>
          <p className="mt-1 text-sm text-white/85">{chapter.objective}</p>
          <button type="button" onClick={() => enterBuilding(chapter.target)} className="mt-2 text-xs font-bold text-orange-200 underline underline-offset-4 hover:text-white">Ir al objetivo</button>
        </div>}

        {!interiorBuilding && <div className="absolute right-3 top-3 z-20 hidden items-center gap-3 rounded-lg border border-amber-100/20 bg-[#241a16]/80 px-4 py-2 text-xs font-semibold text-white shadow-lg backdrop-blur-md lg:flex">
          <span className="flex items-center gap-1.5"><Sun className="h-4 w-4 text-amber-300" /> Energía {resources.energy}%</span>
          <span className="flex items-center gap-1.5"><Wind className="h-4 w-4 text-sky-300" /> Oxígeno {resources.oxygen}%</span>
          <span className="flex items-center gap-1.5"><Sprout className="h-4 w-4 text-emerald-300" /> Alimentos {resources.food}%</span>
          <span className="flex items-center gap-1.5"><Shield className="h-4 w-4 text-violet-300" /> Blindaje {resources.radiationProtection}%</span>
          <strong className="border-l border-white/25 pl-3 text-amber-200">Sol {mission.currentTurn}</strong>
        </div>}

        {!interiorBuilding && <div className="absolute right-3 top-36 z-20 flex flex-col gap-2 lg:top-16">
          <button type="button" onClick={() => setFirstPerson((value) => !value)} className="rounded-lg border border-white/40 bg-slate-950/85 px-3 py-2 text-xs font-bold text-white backdrop-blur hover:bg-slate-800">{firstPerson ? 'Primera persona' : 'Tercera persona'} <span className="hidden sm:inline">· V</span></button>
        </div>}

        {!interiorBuilding && nearbyMeta && <div className="absolute bottom-16 left-1/2 z-20 w-max max-w-[90%] -translate-x-1/2 rounded-xl border border-orange-300/70 bg-slate-950/90 px-4 py-2 text-center text-sm font-semibold text-white shadow-xl">
          <span className="mr-2">{nearbyMeta.name}</span>
          <button type="button" onClick={() => enterBuilding(nearbyMeta.id)} className="rounded-md bg-orange-500 px-3 py-1 text-slate-950 hover:bg-orange-400">Entrar · E</button>
        </div>}

        {!interiorBuilding && firstPerson && <div aria-hidden="true" className="pointer-events-none absolute left-1/2 top-1/2 z-10 h-2 w-2 -translate-x-1/2 -translate-y-1/2 rounded-full border border-white/80 bg-white/30 shadow-[0_0_10px_white]" />}

        {!interiorBuilding && <div className="absolute bottom-3 right-3 z-20 hidden max-w-xs rounded-lg border border-sky-300/35 bg-[#13202a]/85 p-3 text-white shadow-xl backdrop-blur-md md:block">
          <p className="text-[10px] font-bold uppercase tracking-[0.2em] text-sky-300">Astrobot · Asistente</p>
          <p className="mt-1 text-sm leading-snug">{resources.energy < 35 ? 'La energía está baja. Inspecciona los paneles solares y las baterías.' : isSolarEvent ? 'Hay actividad solar. Revisa el blindaje antes de avanzar.' : 'Explora la colonia. Cada módulo te ayudará a cuidar a la tripulación.'}</p>
        </div>}

        {!interiorBuilding && <div className="absolute bottom-3 left-3 z-20 grid grid-cols-3 gap-1 sm:hidden" aria-label="Controles de movimiento">
          <span />
          <button type="button" onPointerDown={() => move('w', true)} onPointerUp={() => move('w', false)} onPointerCancel={() => move('w', false)} className="h-10 w-10 rounded-lg bg-slate-950/80 text-white">↑</button>
          <span />
          <button type="button" onPointerDown={() => move('a', true)} onPointerUp={() => move('a', false)} onPointerCancel={() => move('a', false)} className="h-10 w-10 rounded-lg bg-slate-950/80 text-white">←</button>
          <button type="button" onPointerDown={() => move('s', true)} onPointerUp={() => move('s', false)} onPointerCancel={() => move('s', false)} className="h-10 w-10 rounded-lg bg-slate-950/80 text-white">↓</button>
          <button type="button" onPointerDown={() => move('d', true)} onPointerUp={() => move('d', false)} onPointerCancel={() => move('d', false)} className="h-10 w-10 rounded-lg bg-slate-950/80 text-white">→</button>
        </div>}

        {interiorBuilding && <div className="absolute left-3 top-3 z-20 flex max-w-[calc(100%-1.5rem)] flex-wrap items-center gap-2">
          <button type="button" onClick={() => setInteriorBuilding(null)} className="inline-flex min-h-11 items-center gap-2 rounded-xl border border-cyan-300/70 bg-slate-950/90 px-4 py-2 text-sm font-bold text-white shadow-lg hover:bg-slate-800"><ArrowLeft className="h-4 w-4" /> Volver a la colonia</button>
          <span className="rounded-xl border border-white/30 bg-slate-950/80 px-3 py-2 text-sm font-semibold text-cyan-100">Dentro de: {selectedMeta.name}</span>
        </div>}
        {interiorBuilding && <div role="status" aria-live="polite" className="absolute bottom-3 left-3 right-3 z-20 rounded-xl border border-cyan-300/50 bg-slate-950/90 px-4 py-3 text-sm font-medium text-white shadow-lg sm:right-auto sm:max-w-md">{inspectedEquipment}</div>}

        {/* HUD sobre la escena */}
        {!interiorBuilding && <div className="pointer-events-none absolute left-3 top-36 z-10 hidden max-w-[calc(100%-1.5rem)] flex-wrap items-center gap-2 lg:flex">
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
        </div>}

        {!interiorBuilding && isDustStorm && (
          <div className="pointer-events-none absolute bottom-3 left-3 right-3 z-10 rounded-xl border border-amber-400/60 bg-amber-950/80 px-3 py-2 text-xs font-semibold text-amber-100 backdrop-blur">
            Tormenta de polvo: los paneles solares producen menos energía.
          </div>
        )}
        {!interiorBuilding && isSolarEvent && (
          <div className="pointer-events-none absolute bottom-3 left-3 right-3 z-10 rounded-xl border border-purple-400/60 bg-purple-950/80 px-3 py-2 text-xs font-semibold text-purple-100 backdrop-blur">
            Tormenta solar: tu blindaje (burbuja) está absorbiendo radiación.
          </div>
        )}
        <p className="pointer-events-none absolute bottom-2 left-1/2 z-10 hidden -translate-x-1/2 text-xs text-white/80 lg:block">
          {interiorBuilding ? 'Arrastra para mirar · Toca los equipos' : 'WASD: caminar · Arrastra: mirar · E: entrar · V: cámara'}
        </p>
      </div>

      <details className="bg-[#201b1a]/95 text-white">
        <summary className="cursor-pointer px-4 py-3 text-sm font-semibold text-amber-100 hover:bg-white/5">Mapa y acciones de los módulos</summary>
      <div className="p-4">
        <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
          {BUILDINGS.map((building) => {
            const Icon = building.icon;
            const isSelected = selectedBuilding === building.id;
            return (
              <button
                key={building.id}
                type="button"
                onClick={() => enterBuilding(building.id)}
                aria-pressed={isSelected}
                className={`flex cursor-pointer items-center gap-2 rounded-xl border p-2.5 text-left transition-colors ${
                  isSelected
                    ? 'border-cyan-400 bg-cyan-950/50 text-white'
                    : 'border-slate-800 bg-slate-900/70 text-slate-300 hover:bg-slate-800'
                }`}
              >
                <Icon className="h-4 w-4 shrink-0 text-cyan-300" />
                <span className="text-sm font-bold leading-tight">
                  Entrar: {building.name}
                </span>
              </button>
            );
          })}
        </div>

        <div className="mt-3 rounded-xl border border-cyan-500/30 bg-slate-950/75 p-3">
          <p className="text-xs font-semibold uppercase tracking-wider text-cyan-300">
            {interiorBuilding ? 'Estás dentro de' : 'Módulo seleccionado'}: {selectedMeta.name}
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
      </details>
    </section>
  );
}
