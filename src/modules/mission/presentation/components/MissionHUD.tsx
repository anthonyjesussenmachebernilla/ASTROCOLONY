'use client';

import { useState } from 'react';
import { BatteryCharging, Bot, ChevronRight, Eye, Footprints, House, Layers3, Leaf, Settings2, Shield, Wind } from 'lucide-react';
import type { CSSProperties } from 'react';
import type { MissionSimulationState } from '@/modules/simulation/domain/types';
import { useAdventureStore } from '@/stores/adventure.store';
import { ADVENTURE_STEPS, EMPTY_ADVENTURE, getAdventureStep } from '@/modules/adventure/domain/adventure';
import './MissionHUD.css';

export type ColonyCamera = 'explore' | 'first-person' | 'overview';
interface Props {
  mission: MissionSimulationState;
  camera: ColonyCamera;
  onCameraChange: (camera: ColonyCamera) => void;
  onOpenAdventure: () => void;
  onOpenPanel: () => void;
  onOpenSettings: () => void;
}
const CAMERAS = [
  { id: 'explore', label: 'Explorar', icon: Footprints },
  { id: 'first-person', label: 'Primera persona', icon: Eye },
  { id: 'overview', label: 'Desde arriba', icon: Layers3 },
] as const;

export function MissionHUD({ mission, camera, onCameraChange, onOpenAdventure, onOpenPanel, onOpenSettings }: Props) {
  const [showCameras, setShowCameras] = useState(false);
  const progress = useAdventureStore((state) => state.missions[mission.missionId]) ?? EMPTY_ADVENTURE;
  const task = ADVENTURE_STEPS[getAdventureStep(mission, progress)];
  const stats = [
    { name: 'Energía', value: mission.resources.energy, icon: BatteryCharging, color: '#f9d177' },
    { name: 'Oxígeno', value: mission.resources.oxygen, icon: Wind, color: '#a9e4ed' },
    { name: 'Alimentos', value: mission.resources.food, icon: Leaf, color: '#c0dc9b' },
    { name: 'Blindaje', value: mission.resources.radiationProtection, icon: Shield, color: '#b1cdea' },
  ];
  const currentCamera = CAMERAS.find((option) => option.id === camera) ?? CAMERAS[0];
  const CameraIcon = currentCamera.icon;
  return <div className="mission-hud-hud">
    <header className="mission-hud-header">
      <div className="mission-hud-location"><strong>Aurora-1</strong><span>Sol {Math.min(mission.currentTurn, mission.maxTurns)} de {mission.maxTurns}</span></div>
      <div className="mission-hud-resources" aria-label="Reservas de la base">{stats.map(({ name, value, icon: Icon, color }) => <div key={name} className="mission-hud-resource" data-low={value < 30} style={{ '--resource-color': color } as CSSProperties} aria-label={`${name}: ${Math.round(value)} por ciento${value < 30 ? ', reserva baja' : ''}`}><Icon size={18} aria-hidden="true" /><span className="mission-hud-resource-name">{name}</span><strong>{Math.round(value)}<small>%</small></strong>{value < 30 && <span className="mission-hud-low">!</span>}</div>)}</div>
      <button type="button" className="mission-hud-icon-button" aria-label="Abrir opciones" onClick={onOpenSettings}><Settings2 size={20} /></button>
    </header>
    {mission.activeEvent && <button type="button" className="mission-hud-alert" onClick={onOpenPanel}><span />{mission.activeEvent.title}<ChevronRight size={16} /></button>}
    <div className="mission-hud-footer">
      <button type="button" className="mission-hud-task" onClick={onOpenAdventure} aria-label={`Mi misión: ${task.title}`}><span className="mission-hud-bot"><Bot size={25} /></span><span><small>Tu siguiente paso</small><strong>{task.title}</strong></span><ChevronRight size={19} /></button>
      <div className="mission-hud-tools">
        <div className="mission-hud-camera"><button type="button" className="mission-hud-tool" aria-expanded={showCameras} aria-controls="colony-camera-options" onClick={() => setShowCameras((value) => !value)}><CameraIcon size={18} /><span>Vista</span></button>
          {showCameras && <div className="mission-hud-camera-options" id="colony-camera-options" role="group" aria-label="Vista de la colonia">{CAMERAS.map(({ id, label, icon: Icon }) => <button key={id} type="button" aria-pressed={camera === id} onClick={() => { onCameraChange(id); setShowCameras(false); }}><Icon size={18} />{label}</button>)}</div>}
        </div>
        <button type="button" className="mission-hud-tool" onClick={onOpenPanel}><House size={18} /><span>Mi base</span></button>
      </div>
    </div>
  </div>;
}
