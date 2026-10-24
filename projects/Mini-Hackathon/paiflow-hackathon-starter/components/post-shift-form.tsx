"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { toStroops } from "@/lib/amount";
import { useCurrentProfile } from "@/lib/market/react";
import { mutateMarket } from "@/lib/market/store";

const TIERS = ["1", "2", "5", "10"] as const; // XLM; stored as stroop strings.

export function PostShiftForm() {
  const router = useRouter();
  const { profile } = useCurrentProfile();
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [location, setLocation] = useState("");
  const [startsAt, setStartsAt] = useState("");
  const [endsAt, setEndsAt] = useState("");
  const [tier, setTier] = useState<(typeof TIERS)[number]>(TIERS[0]);
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    setBusy(true);
    try {
      if (!profile) throw new Error("Pick a profile first.");
      if (title.trim().length < 4) throw new Error("Title is too short.");
      if (!location.trim()) throw new Error("Location is required.");
      const start = new Date(startsAt);
      const end = new Date(endsAt);
      if (
        !Number.isFinite(start.getTime()) ||
        !Number.isFinite(end.getTime()) ||
        end <= start
      )
        throw new Error("End must be after start.");
      const id = `shift-${crypto.randomUUID().slice(0, 8)}`;
      await mutateMarket((state) => {
        state.shifts.push({
          id,
          posterId: profile.id,
          title: title.trim(),
          description: description.trim(),
          location: location.trim(),
          startsAt: start.toISOString(),
          endsAt: end.toISOString(),
          amountStroops: toStroops(tier),
          status: "open",
          createdAt: new Date().toISOString(),
        });
      });
      router.push(`/shift/${id}`);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not post the shift.");
      setBusy(false);
    }
  }

  return (
    <>
      <header>
        <h1>Post a shift</h1>
        <span className="chip">TESTNET</span>
      </header>
      <p>
        You pay the listed XLM into an on-chain escrow when you accept a
        substitute. Whitelisted pay tiers only (1 / 2 / 5 / 10 XLM).
      </p>
      <form onSubmit={submit}>
        <label>
          Title
          <input
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            placeholder="Café morning rush cover"
            required
          />
        </label>
        <label>
          Description
          <input
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            placeholder="What the cover needs to do, any requirements"
          />
        </label>
        <label>
          Location
          <input
            value={location}
            onChange={(e) => setLocation(e.target.value)}
            placeholder="Campus Café, Student Center"
            required
          />
        </label>
        <label>
          Starts
          <input
            type="datetime-local"
            value={startsAt}
            onChange={(e) => setStartsAt(e.target.value)}
            required
          />
        </label>
        <label>
          Ends
          <input
            type="datetime-local"
            value={endsAt}
            onChange={(e) => setEndsAt(e.target.value)}
            required
          />
        </label>
        <label>
          Pay (escrowed in XLM)
          <select value={tier} onChange={(e) => setTier(e.target.value as (typeof TIERS)[number])}>
            {TIERS.map((t) => (
              <option key={t} value={t}>
                {t} XLM
              </option>
            ))}
          </select>
        </label>
        <button disabled={busy}>{busy ? "Posting…" : "Post shift"}</button>
        {error && (
          <p role="alert">{error}</p>
        )}
      </form>
    </>
  );
}
