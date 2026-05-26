// src/lib/storage/session.ts
//
// Persist the user's confirmed Squad + current MatchPlan + userContext
// across page reloads via localStorage. We intentionally do NOT persist:
//   - The chat message history (function references would need to be
//     rehydrated and the value-to-bytes ratio is poor for follow-ups).
//   - The uploaded image (object URLs don't survive a reload and dataURL
//     encoding bloats storage).
//
// Schema is versioned so we can drop old shapes safely if it changes.

import type { MatchPlan, Squad } from "@/lib/ai/matchPlanSchema";

const STORAGE_KEY = "valai:session:v1";
const SCHEMA_VERSION = 1;

export type StoredSession = {
  version: number;
  squad: Squad;
  plan: MatchPlan;
  userContext: string;
  updatedAt: string;
};

function isBrowser(): boolean {
  return typeof window !== "undefined" && typeof window.localStorage !== "undefined";
}

export function loadSession(): StoredSession | null {
  if (!isBrowser()) return null;
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as StoredSession;
    if (!parsed || parsed.version !== SCHEMA_VERSION) return null;
    if (!parsed.squad || !parsed.plan) return null;
    return parsed;
  } catch {
    return null;
  }
}

export function saveSession(input: {
  squad: Squad;
  plan: MatchPlan;
  userContext: string;
}): void {
  if (!isBrowser()) return;
  try {
    const payload: StoredSession = {
      version: SCHEMA_VERSION,
      squad: input.squad,
      plan: input.plan,
      userContext: input.userContext,
      updatedAt: new Date().toISOString(),
    };
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(payload));
  } catch {
    // Quota / serialization failures are non-fatal — the app still works
    // without persistence, just loses state on reload.
  }
}

export function clearSession(): void {
  if (!isBrowser()) return;
  try {
    window.localStorage.removeItem(STORAGE_KEY);
  } catch {
    // ignore
  }
}
