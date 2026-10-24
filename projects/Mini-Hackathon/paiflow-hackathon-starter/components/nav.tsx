"use client";
import Link from "next/link";
import { useMarket, useCurrentProfile } from "@/lib/market/react";

export function Nav() {
  const state = useMarket();
  const { profile, switchTo } = useCurrentProfile();
  return (
    <nav className="nav">
      <span className="brand">
        ShiftSwap <span className="chip">TESTNET</span>
      </span>
      <Link href="/feed">Feed</Link>
      <Link href="/post">Post a shift</Link>
      <Link href="/profile">Profile</Link>
      <Link href="/pay">Payment demo</Link>
      <label className="identity">
        Acting as{" "}
        <select
          value={profile?.id ?? ""}
          onChange={(e) => switchTo(e.target.value)}
        >
          {state.profiles.map((p) => (
            <option key={p.id} value={p.id}>
              {p.name}
            </option>
          ))}
        </select>
      </label>
    </nav>
  );
}
