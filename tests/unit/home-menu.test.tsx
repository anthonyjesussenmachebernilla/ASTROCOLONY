import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import HomePage from '@/app/page';
import { ACTIVE_MISSION_STORAGE_KEY, useGameStore } from '@/stores/game.store';

const push = vi.hoisted(() => vi.fn());
vi.mock('next/navigation', () => ({ useRouter: () => ({ push }) }));
const renderHome = () => render(<HomePage />);

describe('menú principal', () => {
  beforeEach(() => {
    window.localStorage.clear();
    push.mockClear();
    useGameStore.setState({ isPersisted: false, isSyncing: false, lastError: null, reducedMotion: false });
    vi.unstubAllGlobals();
  });

  it('Comenzar crea una misión nueva antes de mostrar el tutorial', async () => {
    const mission = { ...useGameStore.getState().mission, missionId: 'new-mission-123' };
    const fetchMock = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({ mission, version: 1, astrobot: useGameStore.getState().astrobot,
        projectedProduction: useGameStore.getState().projectedProduction,
        projectedConsumption: useGameStore.getState().projectedConsumption }),
    });
    vi.stubGlobal('fetch', fetchMock);
    renderHome();

    fireEvent.click(screen.getByRole('button', { name: /Comenzar/i }));
    await waitFor(() => expect(push).toHaveBeenCalledWith('/intro'));
    expect(fetchMock).toHaveBeenCalledWith('/api/missions', expect.objectContaining({ method: 'POST' }));
    expect(window.localStorage.getItem(ACTIVE_MISSION_STORAGE_KEY)).toBe('new-mission-123');
  });

  it('Continuar abre la partida persistida y no la demo independiente', async () => {
    window.localStorage.setItem(ACTIVE_MISSION_STORAGE_KEY, 'saved-mission-123');
    const fetchMock = vi.fn().mockResolvedValue({ ok: true, json: async () => ({ mission: { status: 'IN_PROGRESS' } }) });
    vi.stubGlobal('fetch', fetchMock);
    renderHome();

    const continueButton = screen.getByRole('button', { name: /Continuar/i });
    await waitFor(() => expect(continueButton).toBeEnabled());
    fireEvent.click(continueButton);
    await waitFor(() => expect(push).toHaveBeenCalledWith('/game/legacy'));
    expect(fetchMock).toHaveBeenCalledWith('/api/missions/saved-mission-123');
  });

  it('Configuración guarda el movimiento reducido', async () => {
    const view = renderHome();
    fireEvent.click(screen.getByRole('button', { name: /Configuración/i }));
    fireEvent.click(screen.getByRole('tab', { name: /Accesibilidad/i }));
    fireEvent.click(screen.getByRole('checkbox', { name: /Reducir movimiento/i }));
    expect(window.localStorage.getItem('astrocolony_reduced_motion')).toBe('true');
    view.unmount();
    useGameStore.setState({ reducedMotion: false });
    renderHome();
    fireEvent.click(screen.getByRole('button', { name: /Configuración/i }));
    fireEvent.click(screen.getByRole('tab', { name: /Accesibilidad/i }));
    expect(screen.getByRole('checkbox', { name: /Reducir movimiento/i })).toBeChecked();
  });

  it('muestra los atajos reales sin opciones de música', () => {
    renderHome();
    fireEvent.click(screen.getByRole('button', { name: /Configuración/i }));
    expect(screen.getByText('Entrar, usar o salir')).toBeInTheDocument();
    expect(screen.getByText('P / Tab')).toBeInTheDocument();
    expect(screen.queryByRole('tab', { name: /Audio/i })).not.toBeInTheDocument();
  });

  it('conserva el modo elegido en el menú', () => {
    const view = renderHome();
    fireEvent.click(screen.getByRole('button', { name: /Comandante \(10–12\)/i }));
    expect(localStorage.getItem('astrocolony-mode')).toBe('comandante');
    view.unmount();
    renderHome();
    expect(screen.getByRole('button', { name: /Comandante \(10–12\)/i })).toHaveAttribute('aria-pressed', 'true');
  });
});
