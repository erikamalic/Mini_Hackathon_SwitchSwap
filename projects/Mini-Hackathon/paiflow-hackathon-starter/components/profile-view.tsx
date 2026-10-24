"use client";
import Link from "next/link";
import { useState } from "react";
import { addStroops, fromStroops } from "@/lib/amount";
import { useMarket, useCurrentProfile } from "@/lib/market/react";
import { mutateMarket } from "@/lib/market/store";
import type { Profile } from "@/lib/market/types";

export function ProfileView() {
  const state = useMarket();
  const { profile } = useCurrentProfile();
  const [wallet, setWallet] = useState(profile?.walletAddress ?? "");
  const [error, setError] = useState("");
  if (!profile) return <p role="alert">No profile available.</p>;
  const me: Profile = profile;

  const myShifts = state.shifts.filter((s) => s.posterId === profile.id);
  const myClaims = state.claims.filter((c) => c.workerId === profile.id);
  const worked = state.shifts.filter(
    (s) =>
      s.status === "completed" &&
      s.acceptedClaimId &&
      myClaims.some((c) => c.id === s.acceptedClaimId),
  );
  const earnings = worked
    .map((s) => s.amountStroops)
    .reduce((sum, a) => addStroops(sum, a), "0");
  const ratings = state.ratings.filter((r) => r.rateeId === profile.id);
  const avg = ratings.length
    ? (ratings.reduce((s, r) => s + r.stars, 0) / ratings.length).toFixed(1)
    : null;

  async function saveWallet() {
    setError("");
    try {
      await mutateMarket((s) => {
        const p = s.profiles.find((x) => x.id === me.id);
        if (!p) throw new Error("Profile not found.");
        const trimmed = wallet.trim();
        if (trimmed && !/^G[A-Z2-7]{55}$/.test(trimmed))
          throw new Error("Enter a valid public Stellar address (G…).");
        p.walletAddress = trimmed || undefined;
      });
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not save.");
    }
  }

  return (
    <>
      <header>
        <h1>{profile.name}</h1>
      </header>
      <p>{profile.tagline}</p>
      <p>
        Earned <strong>{fromStroops(earnings)} XLM</strong> across {worked.length}{" "}
        completed shift{worked.length === 1 ? "" : "s"}
        {avg ? ` · ${avg}★ average rating (${ratings.length})` : ""}
      </p>
      <section>
        <h2>Wallet (testnet)</h2>
        <p>
          Used to display your payout address to posters. Payments are signed
          with Freighter at escrow time.
        </p>
        <label>
          Public Stellar address
          <input
            value={wallet}
            onChange={(e) => setWallet(e.target.value)}
            placeholder="G…"
          />
        </label>
        <button onClick={saveWallet}>Save wallet</button>
        {error && <p role="alert">{error}</p>}
      </section>
      <section>
        <h2>My posted shifts</h2>
        {myShifts.length === 0 && <p>None yet — post one!</p>}
        <ol>
          {myShifts.map((s) => (
            <li key={s.id}>
              <Link href={`/shift/${s.id}`}>{s.title}</Link> —{" "}
              {fromStroops(s.amountStroops)} XLM — {s.status}
            </li>
          ))}
        </ol>
      </section>
      <section>
        <h2>My claims</h2>
        {myClaims.length === 0 && <p>No claims yet.</p>}
        <ol>
          {myClaims.map((c) => {
            const s = state.shifts.find((x) => x.id === c.shiftId);
            return (
              <li key={c.id}>
                <Link href={`/shift/${c.shiftId}`}>{s?.title ?? c.shiftId}</Link>{" "}
                — {c.status}
              </li>
            );
          })}
        </ol>
      </section>
      {ratings.length > 0 && (
        <section>
          <h2>Ratings received</h2>
          {ratings.map((r) => (
            <p key={r.id}>
              {"★".repeat(r.stars)}
              {r.comment ? ` — ${r.comment}` : ""}
            </p>
          ))}
        </section>
      )}
    </>
  );
}
