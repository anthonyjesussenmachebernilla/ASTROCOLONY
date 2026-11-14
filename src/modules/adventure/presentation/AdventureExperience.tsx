'use client';

import Link from 'next/link';
import { useState } from 'react';
import { BookOpen, Bot, House, Lightbulb, ChevronLeft, Menu, Move, RotateCcw } from 'lucide-react';
import type { ActionType, BuildingId, MissionSimulationState } from '@/modules/simulation/domain/types';
import { useAdventureStore } from '@/stores/adventure.store';
import { useGameStore } from '@/stores/game.store';
import { ADVENTURE_STEPS, EMPTY_ADVENTURE, getAdventureStep, type ChallengeId } from '../domain/adventure';
import { AdventureDialog } from './AdventureDialog';
import { DiscoveryNotebook } from './DiscoveryNotebook';
import { EngineeringChallenge } from './EngineeringChallenge';
import { ExplorerPreferences } from './ExplorerPreferences';
import { ReadAloud } from './ReadAloud';
import { ActionDeck } from '@/modules/mission/presentation/components/ActionDeck';
import { COLONY_BUILDINGS } from '@/modules/mission/presentation/components/colony-buildings';
import { NasaEventsPanel } from '@/modules/nasa/presentation/NasaEventsPanel';
import { NasaGalleryPanel } from '@/modules/nasa/presentation/NasaGalleryPanel';
import './adventure.css';

export type HubView = 'mission' | 'base' | 'notebook' | 'science' | 'settings' | 'modules' | 'controls';
const TITLES: Record<HubView | ChallengeId, string> = { mission: 'Mi misión', base: 'Mi base', notebook: 'Mi cuaderno', science: 'Ciencia NASA', settings: 'Opciones', modules: 'Explorar los módulos', controls: 'Cómo explorar', solar: 'Atrapa la luz', circuit: 'Conecta el invernadero', leak: 'Detective de fugas' };

export function AdventureExperience({ initialView = 'mission', mission, selectedBuilding = null, onClose, onEnterBuilding, onAction, onAdvance, onRescue, available }: {
  initialView?: HubView; mission: MissionSimulationState; selectedBuilding?: BuildingId | null;
  onClose: () => void; onEnterBuilding: (id: BuildingId) => void;
  onAction: (action: ActionType) => void; onAdvance: () => void; onRescue: () => void; available: boolean;
}) {
  const { helpMode, narration, missions, completeChallenge, classifyEvidence } = useAdventureStore();
  const { lastError, clearError, reducedMotion, toggleReducedMotion, startNewMission, isSyncing } = useGameStore();
  const progress = missions[mission.missionId] ?? EMPTY_ADVENTURE;
  const step = getAdventureStep(mission, progress);
  const task = ADVENTURE_STEPS[step];
  const [view, setView] = useState<HubView | ChallengeId>(initialView);
  const [hint, setHint] = useState(0);
  const [showMore, setShowMore] = useState(false);
  const isChallenge = view === 'solar' || view === 'circuit' || view === 'leak';
  const chapter = ['inspect', 'solar', 'circuit', 'grow', 'observe'].includes(step) ? 'Las luces del invernadero' : step === 'leak' ? 'El silbido' : 'La señal de Aurora';
  const act = () => {
    if (step === 'inspect') { onEnterBuilding('GREENHOUSE'); onClose(); }
    else if (step === 'solar' || step === 'circuit' || step === 'leak') setView(step);
    else if (step === 'grow') { onClose(); onAction('ACTIVATE_GREENHOUSE'); }
    else if (step === 'observe') { onClose(); onAdvance(); }
    else if (step === 'research') { onClose(); onAction('CONDUCT_RESEARCH'); }
    else setView('notebook');
  };
  const chooseView = (next: HubView) => { setView(next); setShowMore(false); setHint(0); };
  return <AdventureDialog title={TITLES[view]} onClose={onClose}>
    {!isChallenge && <nav className="adventure-tabs adventure-hub-tabs" aria-label="Tu aventura">{([{ id: 'mission', label: 'Misión', icon: Bot }, { id: 'base', label: 'Base', icon: House }, { id: 'notebook', label: 'Cuaderno', icon: BookOpen }] as const).map(({ id, label, icon: Icon }) => <button key={id} type="button" aria-pressed={view === id} onClick={() => chooseView(id)}><Icon size={17} />{label}</button>)}<button type="button" className="adventure-more-button" aria-label="Más opciones" aria-expanded={showMore} onClick={() => setShowMore((value) => !value)}><Menu size={20} /></button></nav>}
    {showMore && <div className="adventure-more-options">{(['modules', 'science', 'settings', 'controls'] as const).map((id) => <button key={id} type="button" onClick={() => chooseView(id)}>{TITLES[id]}</button>)}</div>}
    {view === 'mission' && <div className="adventure-simple-mission">
      <span className="adventure-chapter-label">{chapter}</span><h3 className="adventure-task-title">{task.title}</h3><p className="adventure-story-text">{task.text}</p>
      <div className="adventure-buttons"><button type="button" className="adventure-primary" disabled={!available} onClick={act}>{task.action}</button></div>
      <button type="button" className="adventure-text-button" onClick={() => setHint((value) => value + 1)}><Lightbulb size={17} />{hint ? 'Otra pista' : 'Necesito una pista'}</button>
      {hint > 0 && <p role="status" className="adventure-hint"><Bot size={20} />{helpMode === 'guided' || hint > 1 ? task.hint : task.text}</p>}
      <ReadAloud key={`${step}-${narration}`} enabled={narration} text={`${task.title}. ${task.text}. ${hint > 0 ? task.hint : ''}`} />
      {!available && <p role="status">{mission.status === 'IN_PROGRESS' ? 'Esperamos a que la partida termine de guardarse.' : 'Puedes consultar tu cuaderno o probar otro plan.'}</p>}
      {mission.status === 'DEFEAT' && !mission.actionHistory.some((action) => action.kind === 'RESCUE') && <button type="button" className="adventure-primary" onClick={() => { onClose(); onRescue(); }}>Preparar la misión de rescate</button>}
    </div>}
    {view === 'base' && <>
      <div className="adventure-base-resources" aria-label="Reservas de la base">{[{ label: 'Energía', value: mission.resources.energy }, { label: 'Oxígeno', value: mission.resources.oxygen }, { label: 'Comida', value: mission.resources.food }, { label: 'Blindaje', value: mission.resources.radiationProtection }].map(({ label, value }) => <div key={label}><span>{label}</span><strong>{value}<small>%</small></strong></div>)}</div>
      {mission.activeEvent && <details className="adventure-inline-detail"><summary>Acontecimiento: {mission.activeEvent.title}</summary><p>{mission.activeEvent.kidSummary}</p><p className="adventure-note">Evento de la misión · Simulación.</p></details>}
      <ActionDeck compact available={available} mission={mission} selectedBuilding={selectedBuilding} lastError={lastError} onClearError={clearError} onExecuteAction={(action) => { onClose(); onAction(action); }} onAdvanceTurn={() => { onClose(); onAdvance(); }} />
      <details className="adventure-inline-detail"><summary>Estado de la tripulación</summary><p>Salud: {mission.resources.crewHealth}%. Ciencia: {mission.resources.science}.</p></details>
    </>}
    {view === 'notebook' && <DiscoveryNotebook mission={mission} progress={progress} onClassify={() => classifyEvidence(mission.missionId)} onPractice={setView} />}
    {isChallenge && <><button type="button" className="adventure-text-button" onClick={() => setView('mission')}><ChevronLeft size={17} />Volver a mi misión</button><EngineeringChallenge key={view} challenge={view as ChallengeId} mode={helpMode} onComplete={() => { completeChallenge(mission.missionId, view as ChallengeId); setView('mission'); setHint(0); }} /><ReadAloud key={`${view}-${narration}`} enabled={narration} text={`${ADVENTURE_STEPS[view as ChallengeId].text}. ${helpMode === 'guided' ? ADVENTURE_STEPS[view as ChallengeId].hint : ''}`} /></>}
    {view === 'science' && <div className="adventure-science"><p className="adventure-note">Los registros de NASA son observaciones. Aurora-1, su baliza y sus cosechas rápidas pertenecen a una simulación educativa.</p><NasaEventsPanel /><details className="adventure-inline-detail"><summary>Explorar imágenes reales de NASA</summary><NasaGalleryPanel /></details></div>}
    {view === 'modules' && <div className="adventure-module-list"><p>Elige un lugar para entrar y explorar sus equipos.</p>{COLONY_BUILDINGS.map(({ id, name, icon: Icon }) => <button type="button" key={id} onClick={() => { onEnterBuilding(id); onClose(); }}><Icon size={21} />{name}</button>)}</div>}
    {view === 'settings' && <div className="adventure-settings"><ExplorerPreferences /><label className="adventure-setting-row"><span>Reducir movimiento</span><input type="checkbox" checked={reducedMotion} onChange={toggleReducedMotion} /></label><button type="button" className="adventure-text-button" onClick={() => chooseView('controls')}><Move size={18} />Cómo moverme</button><div className="adventure-settings-footer"><Link href="/" onClick={onClose}>Volver al inicio</Link><button type="button" disabled={isSyncing} onClick={() => { onClose(); void startNewMission(); }}><RotateCcw size={16} />Nueva misión</button></div></div>}
    {view === 'controls' && <div className="adventure-controls-help"><p>Usa los botones del escenario para abrir tu misión y cuidar la base.</p><dl><div><dt>W A S D / Flechas</dt><dd>Caminar por la colonia</dd></div><div><dt>Arrastrar</dt><dd>Mirar alrededor</dd></div><div><dt>E</dt><dd>Entrar al módulo cercano</dd></div><div><dt>V / Vista</dt><dd>Cambiar de cámara</dd></div><div><dt>Tab</dt><dd>Abrir Mi base</dd></div><div><dt>Esc</dt><dd>Cerrar el panel</dd></div></dl><p className="adventure-note">En pantalla táctil puedes usar las flechas para caminar. También puedes elegir un módulo desde «Más opciones».</p></div>}
  </AdventureDialog>;
}
