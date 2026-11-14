'use client';

import { useEffect, useState } from 'react';
import { ArrowLeft, Bot, House, Settings2, X } from 'lucide-react';
import { useSpaceWeather } from '@/modules/nasa/presentation/useSpaceWeather';
import type { ActionType, BuildingId, MissionSimulationState, SpaceEventRecord } from '@/modules/simulation/domain/types';
import { ColonyScene3D } from './ColonyScene3D';
import { MissionHUD, type ColonyCamera } from './MissionHUD';
import { AdventureExperience, type HubView } from '@/modules/adventure/presentation/AdventureExperience';
import { useAdventureStore } from '@/stores/adventure.store';
import { COLONY_BUILDINGS } from './colony-buildings';

interface ColonyMapProps {
  selectedBuilding: BuildingId | null;
  onSelectBuilding: (id: BuildingId) => void;
  activeEvent: SpaceEventRecord | null;
  reducedMotion: boolean;
  mission: MissionSimulationState;
  isSyncing: boolean;
  isPersisted: boolean;
  onAdvance: () => void;
  onRescue: () => void;
  onExecuteAction: (actionType: ActionType) => void | Promise<void>;
}

export function ColonyMap({ selectedBuilding, onSelectBuilding, activeEvent, reducedMotion, mission, isSyncing, isPersisted, onExecuteAction, onAdvance, onRescue }: ColonyMapProps) {
  const [hubView, setHubView] = useState<HubView | null>(null);
  const [interiorBuilding, setInteriorBuilding] = useState<BuildingId | null>(null);
  const [camera, setCamera] = useState<ColonyCamera>('explore');
  const [nearbyBuilding, setNearbyBuilding] = useState<BuildingId | null>(null);
  const [inspectedEquipment, setInspectedEquipment] = useState<string | null>(null);
  useEffect(() => {
    const handleKey = (event: KeyboardEvent) => {
      if (document.querySelector('dialog[open]') || (event.target instanceof HTMLElement && event.target.closest('input, textarea, select, [contenteditable]'))) return;
      if (event.key.toLowerCase() === 'v') setCamera((value) => value === 'explore' ? 'first-person' : value === 'first-person' ? 'overview' : 'explore');
      if (event.key === 'Tab' && (event.target === document.body || event.target instanceof HTMLCanvasElement)) {
        event.preventDefault(); setHubView('base');
      }
    };
    window.addEventListener('keydown', handleKey);
    return () => window.removeEventListener('keydown', handleKey);
  }, []);
  const enterBuilding = (id: BuildingId) => {
    if (id === 'GREENHOUSE') useAdventureStore.getState().inspectGreenhouse(mission.missionId);
    onSelectBuilding(id); setInteriorBuilding(id); setInspectedEquipment(null);
  };
  const weather = useSpaceWeather();
  const selectedMeta = COLONY_BUILDINGS.find((building) => building.id === interiorBuilding);
  const nearbyMeta = COLONY_BUILDINGS.find((building) => building.id === nearbyBuilding);
  const move = (key: string, down: boolean) => window.dispatchEvent(new KeyboardEvent(down ? 'keydown' : 'keyup', { key, bubbles: true }));

  return <section className="colony-viewport">
    <ColonyScene3D greenhousePowered={mission.actionHistory.some((action) => action.actionType === 'ACTIVATE_GREENHOUSE')} resources={mission.resources} activeEventType={activeEvent?.type ?? null} selectedBuilding={selectedBuilding} onSelectBuilding={onSelectBuilding} reducedMotion={reducedMotion} weatherLevel={weather?.level ?? 'CALM'} interiorBuilding={interiorBuilding} onEnterBuilding={enterBuilding} onInspect={setInspectedEquipment} firstPerson={camera === 'first-person'} overview={camera === 'overview'} onNearbyChange={setNearbyBuilding} />
    {!interiorBuilding && <MissionHUD mission={mission} camera={camera} onCameraChange={setCamera} onOpenAdventure={() => setHubView('mission')} onOpenPanel={() => setHubView('base')} onOpenSettings={() => setHubView('settings')} />}
    {!interiorBuilding && nearbyMeta && <button type="button" className="colony-enter" onClick={() => enterBuilding(nearbyMeta.id)}>Entrar a {nearbyMeta.name} <kbd>E</kbd></button>}
    {!interiorBuilding && camera === 'first-person' && <div aria-hidden="true" className="pointer-events-none absolute left-1/2 top-1/2 z-10 h-1.5 w-1.5 -translate-x-1/2 -translate-y-1/2 rounded-full bg-white/70" />}
    {!interiorBuilding && camera !== 'overview' && <div className="colony-touch-controls" aria-label="Controles de movimiento">{[{ key: 'w', label: 'Avanzar', symbol: '↑' }, { key: 'a', label: 'Mover a la izquierda', symbol: '←' }, { key: 's', label: 'Retroceder', symbol: '↓' }, { key: 'd', label: 'Mover a la derecha', symbol: '→' }].map(({ key, label, symbol }) => <button key={key} type="button" aria-label={label} onPointerDown={(event) => { event.currentTarget.setPointerCapture(event.pointerId); move(key, true); }} onPointerUp={() => move(key, false)} onPointerCancel={() => move(key, false)} onLostPointerCapture={() => move(key, false)}>{symbol}</button>)}</div>}
    {interiorBuilding && <>
      <div className="colony-interior-header"><button type="button" onClick={() => setInteriorBuilding(null)}><ArrowLeft size={18} />Salir<span> · {selectedMeta?.name}</span></button><button type="button" aria-label="Abrir opciones" onClick={() => setHubView('settings')}><Settings2 size={20} /></button></div>
      <div className="colony-interior-footer"><button type="button" onClick={() => setHubView('mission')}><Bot size={21} />Mi misión</button><button type="button" onClick={() => setHubView('base')}><House size={19} />Mi base</button></div>
      {inspectedEquipment && <div role="status" className="colony-inspection"><p>{inspectedEquipment}</p><button type="button" aria-label="Cerrar información del equipo" onClick={() => setInspectedEquipment(null)}><X size={18} /></button></div>}
    </>}
    {hubView && <AdventureExperience key={hubView} initialView={hubView} mission={mission} selectedBuilding={selectedBuilding} onClose={() => setHubView(null)} onEnterBuilding={enterBuilding} onAction={onExecuteAction} onAdvance={onAdvance} onRescue={onRescue} available={isPersisted && !isSyncing && mission.status === 'IN_PROGRESS'} />}
  </section>;
}
