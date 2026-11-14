import { randomUUID } from 'node:crypto';
import { cookies } from 'next/headers';

export const SESSION_COOKIE_NAME = 'astrocolony_session';

export async function getOrCreateAnonymousSessionId(): Promise<{
  sessionId: string;
  isNew: boolean;
}> {
  const store = await cookies();
  const existing = store.get(SESSION_COOKIE_NAME)?.value;
  if (existing && existing.length >= 16) {
    return { sessionId: existing, isNew: false };
  }
  return { sessionId: randomUUID(), isNew: true };
}

export async function getAnonymousSessionId(): Promise<string | null> {
  const store = await cookies();
  const existing = store.get(SESSION_COOKIE_NAME)?.value;
  return existing && existing.length >= 16 ? existing : null;
}
