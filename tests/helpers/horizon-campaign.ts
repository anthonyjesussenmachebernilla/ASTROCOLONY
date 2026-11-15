import { readFileSync } from 'node:fs';
import { runInNewContext } from 'node:vm';

export type Resources = Record<'energy' | 'oxygen' | 'food' | 'shield', number>;
type Entry = { sol: number; choice: string; before: Resources | null; after: Resources | null; migrated?: boolean };
export type CampaignState = {
  sol: number; completed: boolean; finished: boolean; assistedSols: number[];
  pending: { choice: string; before: Resources; after: Resources } | null;
  history: Entry[];
};
type Transition = { state: CampaignState; resources: Resources };
export type CampaignApi = {
  days: { station: string; choices: { id: string }[]; clue?: string }[];
  coinTotal: number;
  initial: () => CampaignState;
  resolve: (state: CampaignState, id: string, resources: Resources) => Transition | null;
  advance: (state: CampaignState, resources: Resources) => ({ blocked: false; reward: number } & Transition) | { blocked: true } | null;
  retry: (state: CampaignState) => Transition | null;
  assist: (state: CampaignState, resources: Resources) => Transition | null;
  restore: (raw: unknown) => CampaignState | null;
  migrate: (step: number, resources: Resources) => CampaignState | null;
};
export function loadCampaign(): CampaignApi {
  const context = { window: {} as { MarsCampaign: CampaignApi } };
  runInNewContext(readFileSync('public/horizonte/campaign.js', 'utf8'), context);
  return context.window.MarsCampaign;
}
