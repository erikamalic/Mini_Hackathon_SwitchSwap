"use client";
import { useState } from "react";
import Link from "next/link";
import { fromStroops } from "@/lib/amount";
import { useMarket, useCurrentProfile } from "@/lib/market/react";
import { resetMarket } from "@/lib/market/store";
import type { ShiftStatus } from "@/lib/market/types";

const FILTERS: { key: ShiftStatus | "all"; label: string }[] = [
  { key: "all", label: "All" },
  { key: "open", label: "Open" },
  { key: "accepted", label: "Accepted" },
  { key: "escrowed", label: "Escrowed" },
  { key: "completed", label: "Completed" },
];

function formatWhen(iso: string): string {
  const d = new Date(iso);
  return Number.isFinite(d.getTime())
    ? d.toLocaleString(undefined, {
        month: "short",
        day: "numeric",
        hour: "2-digit",
        minute: "2-digit",
      })
    : iso;
}

export function ShiftFeed() {
  const state = useMarket();
  const { profile } = useCurrentProfile();
  const [filter, setFilter] = useState<ShiftStatus | "all">("open");
  const shifts = [...state.shifts]
    .filter((s) => filter === "all" || s.status === filter)
    .sort((a, b) => a.startsAt.localeCompare(b.startsAt));
  const nameOf = (id: string) =>
    state.profiles.find((p) => p.id === id)?.name ?? id;
  return (
    <>
      <header>
        <h1>ShiftSwap</h1>
        <span className="chip">TESTNET</span>
      </header>
      <p>
        Working student need a shift covered? Post it with XLM pay. Free
        between classes? Claim a shift, cover it, get paid through an on-chain
        escrow. Browsing as <strong>{profile?.name}</strong>.
      </p>
      <p>
        <Link href="/post">
          <button>Post a shift</button>
        </Link>{" "}
        <button
          onClick={() => {
            if (window.confirm("Reset all demo data to the original seed?"))
              resetMarket();
          }}
        >
          Reset demo data
        </button>
      </p>
      <p className="filters" role="tablist">
        {FILTERS.map((f) => (
          <button
            key={f.key}
            className={f.key === filter ? "chip" : ""}
            onClick={() => setFilter(f.key)}
          >
            {f.label}
          </button>
        ))}
      </p>
      {shifts.length === 0 && <p>No shifts in this state yet.</p>}
      <ol className="cards">
        {shifts.map((s) => {
          const claims = state.claims.filter(
            (c) => c.shiftId === s.id && c.status === "pending",
          ).length;
          return (
            <li key={s.id} className="card">
              <p>
                <span className={`status status-${s.status}`}>{s.status}</span>{" "}
                <strong>{s.title}</strong>
              </p>
              <p>
                {fromStroops(s.amountStroops)} XLM · {s.location} ·{" "}
                {formatWhen(s.startsAt)} → {formatWhen(s.endsAt)}
              </p>
              <p>
                Posted by {nameOf(s.posterId)}
                {claims > 0 ? ` · ${claims} pending claim${claims > 1 ? "s" : ""}` : ""}
              </p>
              <Link href={`/shift/${s.id}`}>View & claim →</Link>
            </li>
          );
        })}
      </ol>
    </>
  );
}
