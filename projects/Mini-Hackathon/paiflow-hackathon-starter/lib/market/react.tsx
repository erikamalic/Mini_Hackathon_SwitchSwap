"use client";
import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useState,
  useSyncExternalStore,
} from "react";
import { getMarket, loadIdentity, saveIdentity, subscribeMarket } from "@/lib/market/store";
import { MARKET_IDENTITY_KEY } from "@/lib/market/types";
import type { MarketState, Profile } from "@/lib/market/types";

const MarketContext = createContext<MarketState | null>(null);

export function useMarket(): MarketState {
  const state = useContext(MarketContext);
  if (!state) throw new Error("useMarket must be used inside MarketProvider.");
  return state;
}

export function MarketProvider({ children }: { children: React.ReactNode }) {
  const state = useSyncExternalStore(subscribeMarket, getMarket, getMarket);
  return (
    <MarketContext.Provider value={state}>{children}</MarketContext.Provider>
  );
}

export type CurrentProfile = {
  profile: Profile | undefined;
  /** Switch which profile this browser tab acts as (for the two-tab demo). */
  switchTo: (profileId: string) => void;
};

export function useCurrentProfile(): CurrentProfile {
  const state = useMarket();
  const [id, setId] = useState<string | null>(() =>
    typeof window === "undefined" ? null : loadIdentity(),
  );
  useEffect(() => {
    if (typeof window === "undefined") return;
    const onStorage = (event: StorageEvent) => {
      if (event.key === MARKET_IDENTITY_KEY) setId(loadIdentity());
    };
    window.addEventListener("storage", onStorage);
    return () => window.removeEventListener("storage", onStorage);
  }, []);
  const profile = state.profiles.find((p) => p.id === id) ?? state.profiles[0];
  const switchTo = useCallback((profileId: string) => {
    saveIdentity(profileId);
    setId(profileId);
  }, []);
  return { profile, switchTo };
}
