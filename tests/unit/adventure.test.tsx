import { act, fireEvent, render, screen, cleanup } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { EMPTY_ADVENTURE, getAdventureStep, previewNextSol, type AdventureProgress } from '@/modules/adventure/domain/adventure';
import { EngineeringChallenge } from '@/modules/adventure/presentation/EngineeringChallenge';
import { DiscoveryNotebook } from '@/modules/adventure/presentation/DiscoveryNotebook';
import { createInitialMissionState, applyPlayerAction } from '@/modules/simulation/domain/simulation-engine';
import { advanceTurn } from '@/modules/simulation/domain/turn-resolver';
import { useAdventureStore } from '@/stores/adventure.store';
import { ReadAloud } from '@/modules/adventure/presentation/ReadAloud';

afterEach(cleanup);
const initial = () => createInitialMissionState({ missionId: 'adventure-test', randomSeed: 42 });
describe('aventura educativa', () => {
  it('includes the next harvest and applies resource bounds in the decision preview', () => {
    const cultivated = applyPlayerAction(initial(), 'ACTIVATE_GREENHOUSE').state;
    expect(previewNextSol(cultivated).food).toBe(87);
    cultivated.resources.food = 100;
    expect(previewNextSol(cultivated).food).toBe(99);
  });
  it('requires inspection, engineering, a real decision and an advanced sol before the harvest', () => {
    let mission = initial();
    let progress: AdventureProgress = { ...EMPTY_ADVENTURE, completed: [] };
    expect(getAdventureStep(mission, progress)).toBe('inspect');
    progress = { ...progress, inspectedGreenhouse: true };
    expect(getAdventureStep(mission, progress)).toBe('solar');
    progress.completed = ['solar']; expect(getAdventureStep(mission, progress)).toBe('circuit');
    progress.completed = ['solar', 'circuit']; expect(getAdventureStep(mission, progress)).toBe('grow');
    mission = applyPlayerAction(mission, 'ACTIVATE_GREENHOUSE').state;
    expect(getAdventureStep(mission, progress)).toBe('observe');
    mission = advanceTurn(mission).state;
    expect(getAdventureStep(mission, progress)).toBe('leak');
    progress.completed.push('leak'); expect(getAdventureStep(mission, progress)).toBe('research');
    mission = applyPlayerAction(mission, 'CONDUCT_RESEARCH').state;
    expect(getAdventureStep(mission, progress)).toBe('evidence');
    expect(getAdventureStep(mission, { ...progress, classifiedEvidence: true })).toBe('complete');
  });
  it('allows retrying a wrong panel orientation before saving success', () => {
    const done = vi.fn(); render(<EngineeringChallenge challenge="solar" mode="explorer" onComplete={done} />);
    fireEvent.click(screen.getByRole('button', { name: 'Comprobar mi solución' }));
    expect(done).not.toHaveBeenCalled(); expect(screen.getByRole('status')).toHaveTextContent('Todavía podemos captar');
    fireEvent.change(screen.getByRole('slider'), { target: { value: '60' } });
    fireEvent.click(screen.getByRole('button', { name: 'Comprobar mi solución' }));
    fireEvent.click(screen.getByRole('button', { name: 'Guardar descubrimiento' })); expect(done).toHaveBeenCalledOnce();
  });
  it('does not power the lamps until the battery and lamps are on and the diversion is off', () => {
    render(<EngineeringChallenge challenge="circuit" mode="guided" onComplete={vi.fn()} />);
    fireEvent.click(screen.getByRole('switch', { name: /Batería/ }));
    fireEvent.click(screen.getByRole('switch', { name: /Desvío/ }));
    fireEvent.click(screen.getByRole('switch', { name: /Lámparas/ }));
    fireEvent.click(screen.getByRole('button', { name: 'Comprobar mi solución' }));
    expect(screen.getByRole('status')).toHaveTextContent('desvía');
    fireEvent.click(screen.getByRole('switch', { name: /Desvío/ }));
    fireEvent.click(screen.getByRole('button', { name: 'Comprobar mi solución' }));
    expect(screen.getByRole('status')).toHaveTextContent('¡Las lámparas reciben electricidad!');
  });
  it('requires locating and sealing the leaking door; choosing another point is recoverable', () => {
    render(<EngineeringChallenge challenge="leak" mode="explorer" onComplete={vi.fn()} />);
    fireEvent.click(screen.getByRole('button', { name: /Ventana/ }));
    fireEvent.click(screen.getByRole('button', { name: 'Colocar parche' }));
    expect(screen.getByRole('button', { name: /Sello de la puerta/ })).toHaveTextContent('Pierde 8');
    fireEvent.click(screen.getByRole('button', { name: 'Comprobar mi solución' }));
    expect(screen.queryByRole('button', { name: 'Guardar descubrimiento' })).not.toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: /Sello de la puerta/ }));
    fireEvent.click(screen.getByRole('button', { name: 'Colocar parche' }));
    fireEvent.click(screen.getByRole('button', { name: 'Comprobar mi solución' }));
    expect(screen.getByRole('status')).toHaveTextContent('¡Fuga sellada!');
  });
  it('requires distinguishing both an observation and an unverified hypothesis', () => {
    let mission = applyPlayerAction(initial(), 'ACTIVATE_GREENHOUSE').state;
    mission = applyPlayerAction(advanceTurn(mission).state, 'CONDUCT_RESEARCH').state;
    const done = vi.fn();
    render(<DiscoveryNotebook mission={mission} progress={{ inspectedGreenhouse: true, completed: ['solar', 'circuit', 'leak'], classifiedEvidence: false }} onClassify={done} onPractice={vi.fn()} />);
    fireEvent.click(screen.getAllByRole('button', { name: 'Hipótesis' })[0]);
    expect(done).not.toHaveBeenCalled();
    fireEvent.click(screen.getAllByRole('button', { name: 'Observación' })[0]);
    expect(done).not.toHaveBeenCalled();
    fireEvent.click(screen.getByRole('button', { name: 'Hipótesis' }));
    expect(done).toHaveBeenCalledOnce();
  });
});

describe('guardado local de ayudas y descubrimientos', () => {
  beforeEach(() => { localStorage.clear(); useAdventureStore.setState({ ready: false, missions: {}, helpMode: 'guided', narration: false }); });
  it('reloads progress for the correct mission and preserves help preferences', () => {
    const store = useAdventureStore.getState(); store.setHelpMode('explorer'); store.setNarration(true);
    store.inspectGreenhouse('m1'); store.completeChallenge('m1', 'solar'); store.completeChallenge('m1', 'solar');
    useAdventureStore.setState({ ready: false, missions: {}, helpMode: 'guided', narration: false });
    useAdventureStore.getState().load(); const loaded = useAdventureStore.getState();
    expect(loaded.helpMode).toBe('explorer'); expect(loaded.narration).toBe(true);
    expect(loaded.missions.m1.completed).toEqual(['solar']); expect(loaded.missions.m2).toBeUndefined();
  });
  it('recovers safely from invalid browser storage', () => {
    localStorage.setItem('astrocolony_adventure_v1', '{bad-json'); useAdventureStore.getState().load();
    expect(useAdventureStore.getState().ready).toBe(true); expect(useAdventureStore.getState().missions).toEqual({});
  });
});

describe('lectura opcional de Astrobot', () => {
  it('stops on request without claiming that the browser lacks a voice, and reports real voice failures', () => {
    let utterance: SpeechSynthesisUtterance | undefined;
    class TestUtterance { lang = ''; rate = 1; onend: (() => void) | null = null; onerror: ((event: { error: string }) => void) | null = null; }
    vi.stubGlobal('SpeechSynthesisUtterance', TestUtterance);
    vi.stubGlobal('speechSynthesis', {
      speak: (value: SpeechSynthesisUtterance) => { utterance = value; },
      cancel: () => utterance?.onerror?.({ error: 'canceled' } as SpeechSynthesisErrorEvent),
    });
    try {
      render(<ReadAloud text="Explora el invernadero" enabled />);
      fireEvent.click(screen.getByRole('button', { name: 'Escuchar a Astrobot' }));
      expect(screen.getByRole('button', { name: 'Detener lectura' })).toBeInTheDocument();
      fireEvent.click(screen.getByRole('button', { name: 'Detener lectura' }));
      expect(screen.queryByText(/no tiene una voz/)).not.toBeInTheDocument();
      fireEvent.click(screen.getByRole('button', { name: 'Escuchar a Astrobot' }));
      act(() => utterance?.onerror?.({ error: 'voice-unavailable' } as SpeechSynthesisErrorEvent));
      expect(screen.getByRole('status')).toHaveTextContent('no tiene una voz disponible');
      cleanup();
    } finally { vi.unstubAllGlobals(); }
  });
});
