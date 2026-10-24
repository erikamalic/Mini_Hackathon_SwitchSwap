import { describe, expect, it } from "vitest";
import { MARKET_STATE_KEY, threadIdFor } from "@/lib/market/types";
import {
  assertMarketState,
  loadState,
  mutateMarket,
  saveState,
} from "@/lib/market/store";
import { seedState } from "@/lib/market/seed";

function fakeStorage() {
  const values = new Map<string, string>();
  return {
    values,
    get length() {
      return values.size;
    },
    key: (i: number) => [...values.keys()][i] ?? null,
    getItem: (k: string) => values.get(k) ?? null,
    setItem: (k: string, v: string) => {
      values.set(k, v);
    },
    removeItem: (k: string) => {
      values.delete(k);
    },
  };
}

describe("market store", () => {
  it("seeds on empty storage and persists valid state", () => {
    const storage = fakeStorage();
    const state = loadState(storage);
    expect(state.version).toBe(1);
    expect(state.shifts.length).toBeGreaterThan(0);
    expect(storage.getItem(MARKET_STATE_KEY)).toBeTruthy();
    const again = loadState(storage);
    expect(again).toEqual(state);
  });

  it("reseeds on corrupt JSON without touching other keys", async () => {
    const storage = fakeStorage();
    storage.setItem("paiflow-sdk-payment-v2:scope", "keep-me");
    storage.setItem(MARKET_STATE_KEY, "{corrupt");
    const state = loadState(storage);
    expect(state.shifts.length).toBeGreaterThan(0);
    expect(storage.getItem("paiflow-sdk-payment-v2:scope")).toBe("keep-me");
    expect(() => assertMarketState({ version: 2 })).toThrow();
  });

  it("mutateMarket applies transitions and persists them", async () => {
    const storage = fakeStorage();
    const seeded = loadState(storage);
    const shift = seeded.shifts.find((s) => s.status === "open")!;
    const claimId = "claim-test-1";
    await mutateMarket(
      (s) => {
        s.claims.push({
          id: claimId,
          shiftId: shift.id,
          workerId: "p-dev",
          status: "pending",
          createdAt: new Date().toISOString(),
        });
      },
      storage,
    );
    await mutateMarket(
      (s) => {
        const sh = s.shifts.find((x) => x.id === shift.id)!;
        sh.status = "accepted";
        sh.acceptedClaimId = claimId;
      },
      storage,
    );
    // A second "tab" (same storage) sees the first tab's writes.
    const final = loadState(storage);
    expect(final.shifts.find((s) => s.id === shift.id)?.status).toBe("accepted");
    expect(final.claims.find((c) => c.id === claimId)?.status).toBe("pending");
  });

  it("computes deterministic thread ids", () => {
    expect(threadIdFor("shift-a", "p-dev")).toBe("thread:shift-a:p-dev");
  });

  it("seed passes its own validator", () => {
    expect(() => assertMarketState(seedState())).not.toThrow();
  });
});
