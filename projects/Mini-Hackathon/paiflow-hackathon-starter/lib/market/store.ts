import { seedState } from "@/lib/market/seed";
import {
  MARKET_IDENTITY_KEY,
  MARKET_STATE_KEY,
  threadIdFor,
} from "@/lib/market/types";
import type { MarketState } from "@/lib/market/types";

const WRITE_LOCK = "campusmarket:v1:write";
const SHIFT_ID = /^[a-z0-9-]{4,64}$/;
const PROFILE_ID = /^[a-z0-9-]{2,64}$/;
const ISO = /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(\.\d+)?Z$/;
const STROOPS = /^\d{5,12}$/;

function isRecord(v: unknown): v is Record<string, unknown> {
  return !!v && typeof v === "object" && !Array.isArray(v);
}
function isIso(v: unknown): boolean {
  return typeof v === "string" && ISO.test(v) && Number.isFinite(Date.parse(v));
}
function isOptIso(v: unknown): boolean {
  return v === undefined || isIso(v);
}
function isOptStr(v: unknown): boolean {
  return v === undefined || typeof v === "string";
}

/** Narrow validation, fail-closed like lib/recovery.ts. Throws on any mismatch. */
export function assertMarketState(raw: unknown): MarketState {
  const s = raw;
  if (!isRecord(s) || s.version !== 1 || !isIso(s.seededAt))
    throw new Error("Invalid market state.");
  const profiles = s.profiles;
  const shifts = s.shifts;
  const claims = s.claims;
  const threads = s.threads;
  const messages = s.messages;
  const ratings = s.ratings;
  if (
    !Array.isArray(profiles) ||
    !Array.isArray(shifts) ||
    !Array.isArray(claims) ||
    !Array.isArray(threads) ||
    !Array.isArray(messages) ||
    !Array.isArray(ratings)
  )
    throw new Error("Invalid market state.");
  const profileIds = new Set<string>();
  for (const p of profiles) {
    if (
      !isRecord(p) ||
      typeof p.id !== "string" ||
      !PROFILE_ID.test(p.id) ||
      typeof p.name !== "string" ||
      typeof p.tagline !== "string" ||
      !isIso(p.createdAt)
    )
      throw new Error("Invalid profile in market state.");
    profileIds.add(p.id as string);
  }
  const shiftIds = new Set<string>();
  for (const sh of shifts) {
    if (
      !isRecord(sh) ||
      typeof sh.id !== "string" ||
      !SHIFT_ID.test(sh.id) ||
      !profileIds.has(String(sh.posterId)) ||
      typeof sh.title !== "string" ||
      typeof sh.description !== "string" ||
      typeof sh.location !== "string" ||
      !isIso(sh.startsAt) ||
      !isIso(sh.endsAt) ||
      typeof sh.amountStroops !== "string" ||
      !STROOPS.test(sh.amountStroops) ||
      !["open", "accepted", "escrowed", "completed", "cancelled"].includes(
        String(sh.status),
      ) ||
      !isIso(sh.createdAt) ||
      !isOptStr(sh.acceptedClaimId) ||
      !isOptStr(sh.escrowTxHash)
    )
      throw new Error("Invalid shift in market state.");
    shiftIds.add(sh.id as string);
  }
  for (const c of claims) {
    if (
      !isRecord(c) ||
      typeof c.id !== "string" ||
      !shiftIds.has(String(c.shiftId)) ||
      !profileIds.has(String(c.workerId)) ||
      !isOptStr(c.note) ||
      !["pending", "accepted", "declined", "withdrawn"].includes(
        String(c.status),
      ) ||
      !isIso(c.createdAt)
    )
      throw new Error("Invalid claim in market state.");
  }
  for (const t of threads) {
    if (
      !isRecord(t) ||
      typeof t.id !== "string" ||
      t.id !== threadIdFor(String(t.shiftId), String(t.workerId)) ||
      !shiftIds.has(String(t.shiftId)) ||
      !profileIds.has(String(t.posterId)) ||
      !profileIds.has(String(t.workerId)) ||
      !isIso(t.createdAt)
    )
      throw new Error("Invalid thread in market state.");
  }
  for (const m of messages) {
    if (
      !isRecord(m) ||
      typeof m.id !== "string" ||
      typeof m.threadId !== "string" ||
      !profileIds.has(String(m.senderId)) ||
      typeof m.body !== "string" ||
      m.body.length > 2000 ||
      !isIso(m.sentAt)
    )
      throw new Error("Invalid message in market state.");
  }
  for (const r of ratings) {
    if (
      !isRecord(r) ||
      typeof r.id !== "string" ||
      !shiftIds.has(String(r.shiftId)) ||
      !profileIds.has(String(r.raterId)) ||
      !profileIds.has(String(r.rateeId)) ||
      (typeof r.stars !== "number" || ![1, 2, 3, 4, 5].includes(r.stars)) ||
      !isOptStr(r.comment) ||
      !isIso(r.createdAt)
    )
      throw new Error("Invalid rating in market state.");
  }
  return s as unknown as MarketState;
}

function defaultStorage(): Pick<Storage, "getItem" | "setItem"> {
  if (typeof localStorage !== "undefined") return localStorage;
  const mem = new Map<string, string>();
  return {
    getItem: (k) => mem.get(k) ?? null,
    setItem: (k, v) => {
      mem.set(k, v);
    },
  };
}

export function loadState(
  storage: Pick<Storage, "getItem" | "setItem"> = defaultStorage(),
): MarketState {
  const raw = storage.getItem(MARKET_STATE_KEY);
  if (!raw) {
    const seeded = seedState();
    saveState(seeded, storage);
    return seeded;
  }
  try {
    return assertMarketState(JSON.parse(raw));
  } catch {
    const seeded = seedState();
    saveState(seeded, storage);
    return seeded;
  }
}

export function saveState(
  state: MarketState,
  storage: Pick<Storage, "getItem" | "setItem"> = defaultStorage(),
): void {
  const raw = JSON.stringify(assertMarketState(state));
  storage.setItem(MARKET_STATE_KEY, raw);
  if (storage.getItem(MARKET_STATE_KEY) !== raw)
    throw new Error("Market storage unavailable. Changes were not saved.");
}

export function resetMarket(): MarketState {
  const seeded = seedState();
  saveState(seeded);
  cache = seeded;
  notify();
  return seeded;
}

// --- Module cache + subscriptions (browser only) ---

let cache: MarketState | null = null;
const listeners = new Set<() => void>();
let listening = false;

function notify() {
  for (const l of listeners) l();
}

function ensureBrowserListener() {
  if (listening || typeof window === "undefined") return;
  listening = true;
  window.addEventListener("storage", (event) => {
    if (event.key === MARKET_STATE_KEY) {
      cache = loadState();
      notify();
    }
    if (event.key === MARKET_IDENTITY_KEY) notify();
  });
}

export function getMarket(): MarketState {
  if (!cache) {
    ensureBrowserListener();
    cache = loadState();
  }
  return cache;
}

export function subscribeMarket(listener: () => void): () => void {
  ensureBrowserListener();
  listeners.add(listener);
  return () => listeners.delete(listener);
}

/** Re-read storage (used by the chat poll). Skips silently while a write lock is held. */
export async function refreshMarket(): Promise<void> {
  const locks =
    typeof navigator !== "undefined" ? navigator.locks : undefined;
  if (!locks) {
    cache = loadState();
    notify();
    return;
  }
  await locks.request(WRITE_LOCK, { ifAvailable: true }, async (lock) => {
    if (!lock) return; // a write is in flight; its notification will follow
    cache = loadState();
    notify();
  });
}

/**
 * Lock-guarded read-modify-write. Always re-reads storage under the Web Lock
 * before applying fn, so concurrent tabs cannot clobber each other. Without
 * Web Locks (tests, older browsers) it degrades to a plain read-modify-write.
 * An explicit storage overrides the default (used in tests).
 */
export async function mutateMarket<T>(
  fn: (state: MarketState) => T | Promise<T>,
  storage?: Pick<Storage, "getItem" | "setItem">,
): Promise<T> {
  const store = storage ?? defaultStorage();
  const apply = async (state: MarketState) => {
    const result = await fn(state);
    saveState(state, store);
    cache = state;
    notify();
    return result;
  };
  const locks = typeof navigator !== "undefined" ? navigator.locks : undefined;
  if (!locks) return apply(loadState(store));
  return locks.request(WRITE_LOCK, async (lock) => {
    if (!lock) throw new Error("Market storage is busy. Try again.");
    return apply(loadState(store));
  });
}

// --- Identity (which profile this browser tab acts as) ---

let identityCache: string | null | undefined;

export function loadIdentity(): string | null {
  if (identityCache !== undefined) return identityCache;
  ensureBrowserListener();
  const raw =
    typeof localStorage !== "undefined"
      ? localStorage.getItem(MARKET_IDENTITY_KEY)
      : null;
  if (!raw || !PROFILE_ID.test(raw)) {
    identityCache = null;
    return null;
  }
  identityCache = raw;
  return raw;
}

export function saveIdentity(profileId: string): void {
  if (!PROFILE_ID.test(profileId))
    throw new Error("Invalid profile identity.");
  if (typeof localStorage === "undefined")
    throw new Error("Local storage unavailable.");
  localStorage.setItem(MARKET_IDENTITY_KEY, profileId);
  if (localStorage.getItem(MARKET_IDENTITY_KEY) !== profileId)
    throw new Error("Identity could not be saved.");
  identityCache = profileId;
  notify();
}

export function clearIdentityCacheForTests(): void {
  identityCache = undefined;
}
