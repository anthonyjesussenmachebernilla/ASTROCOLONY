'use client';

import { useState } from 'react';
import { LifeBuoy } from 'lucide-react';
import { useGameStore } from '@/stores/game.store';
import { AdventureDialog } from './AdventureDialog';
import { EngineeringChallenge } from './EngineeringChallenge';

export function RescueExperience({ onClose }: { onClose: () => void }) {
  const [practiced, setPracticed] = useState(false);
  const { mission, isSyncing, lastError, rescueMission } = useGameStore();
  const rescue = async () => { await rescueMission(); if (useGameStore.getState().mission.status === 'IN_PROGRESS') onClose(); };
  return <AdventureDialog title="Misión de rescate" onClose={onClose} busy={isSyncing}>
    <p className="adventure-story-text">La tripulación está esperando ayuda. Aprender también significa probar otra estrategia.</p>
    {!practiced ? <><p>Practica cómo sellar una fuga antes de enviar suministros.</p><EngineeringChallenge challenge="leak" mode="guided" onComplete={() => setPracticed(true)} /></> : <><p className="adventure-hint"><LifeBuoy size={30} />¡Listo para volver! Conservas tu misión y tus descubrimientos.</p><p>El rescate llevará las reservas vitales a un mínimo de 45 y la salud a 70. Limpia las averías y los efectos pendientes para que puedas probar otro plan.</p><p className="adventure-note">Es una ayuda educativa inventada. Puedes usarla una vez por misión.</p><button type="button" className="adventure-primary" disabled={isSyncing || mission.status !== 'DEFEAT'} onClick={() => void rescue()}>{isSyncing ? 'Llegando a la base…' : 'Enviar suministros y continuar'}</button></>}
    {lastError && <p role="alert" className="adventure-feedback">{lastError}</p>}
  </AdventureDialog>;
}
