import { create } from 'zustand';
import { z } from 'zod';
import { EMPTY_ADVENTURE, type AdventureProgress, type ChallengeId, type HelpMode } from '@/modules/adventure/domain/adventure';

const KEY = 'astrocolony_adventure_v1';
const SavedSchema = z.object({
  helpMode: z.enum(['guided', 'explorer']).default('guided'),
  narration: z.boolean().default(false),
  missions: z.record(z.string(), z.object({
    inspectedGreenhouse: z.boolean(),
    completed: z.array(z.enum(['solar', 'circuit', 'leak'])),
    classifiedEvidence: z.boolean(),
  })).default({}),
});
interface AdventureStore {
  ready: boolean;
  helpMode: HelpMode;
  narration: boolean;
  missions: Record<string, AdventureProgress>;
  load: () => void;
  setHelpMode: (mode: HelpMode) => void;
  setNarration: (value: boolean) => void;
  inspectGreenhouse: (missionId: string) => void;
  completeChallenge: (missionId: string, challenge: ChallengeId) => void;
  classifyEvidence: (missionId: string) => void;
}

function persist(state: Pick<AdventureStore, 'helpMode' | 'narration' | 'missions'>) {
  try { localStorage.setItem(KEY, JSON.stringify({ helpMode: state.helpMode, narration: state.narration, missions: state.missions })); } catch { /* Play remains available when storage is blocked. */ }
}

export const useAdventureStore = create<AdventureStore>((set, get) => {
  const updateProgress = (missionId: string, update: (progress: AdventureProgress) => AdventureProgress) => {
    if (missionId === 'bootstrapping') return;
    const { [missionId]: previous, ...others } = get().missions;
    const missions = { ...others, [missionId]: update(previous ?? EMPTY_ADVENTURE) };
    // Retain recent local adventures without allowing unlimited browser-storage growth.
    const recent = Object.fromEntries(Object.entries(missions).slice(-20));
    set({ missions: recent }); persist(get());
  };
  return {
    ready: false, helpMode: 'guided', narration: false, missions: {},
    load: () => {
      if (get().ready) return;
      try {
        const saved = SavedSchema.safeParse(JSON.parse(localStorage.getItem(KEY) ?? '{}'));
        if (saved.success) set({ ...saved.data, ready: true }); else set({ ready: true });
      } catch { set({ ready: true }); }
    },
    setHelpMode: (helpMode) => { set({ helpMode }); persist(get()); },
    setNarration: (narration) => { set({ narration }); persist(get()); },
    inspectGreenhouse: (id) => updateProgress(id, (p) => ({ ...p, inspectedGreenhouse: true })),
    completeChallenge: (id, challenge) => updateProgress(id, (p) => ({ ...p, completed: [...new Set([...p.completed, challenge])] })),
    classifyEvidence: (id) => updateProgress(id, (p) => ({ ...p, classifiedEvidence: true })),
  };
});
