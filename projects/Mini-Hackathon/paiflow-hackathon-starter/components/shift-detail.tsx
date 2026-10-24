"use client";
import { useState } from "react";
import { fromStroops } from "@/lib/amount";
import { useMarket, useCurrentProfile } from "@/lib/market/react";
import { mutateMarket } from "@/lib/market/store";
import { threadIdFor } from "@/lib/market/types";
import type { Profile, Shift } from "@/lib/market/types";
import type { PublicConfig } from "@/lib/types";
import { PaymentPanel } from "@/components/payment-panel";
import { ChatThread } from "@/components/chat-thread";

export function ShiftDetail({
  shiftId,
  config,
}: {
  shiftId: string;
  config: PublicConfig;
}) {
  const state = useMarket();
  const { profile } = useCurrentProfile();
  const [note, setNote] = useState("");
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  const [stars, setStars] = useState(5);
  const [comment, setComment] = useState("");

  const found = state.shifts.find((s) => s.id === shiftId);
  if (!found || !profile)
    return (
      <main>
        <p role="alert">Shift not found.</p>
      </main>
    );
  const shift: Shift = found;
  const me: Profile = profile;
  const poster = state.profiles.find((p) => p.id === shift.posterId);
  const claims = state.claims.filter((c) => c.shiftId === shift.id);
  const myClaim = claims.find((c) => c.workerId === me.id);
  const acceptedClaim = claims.find((c) => c.id === shift.acceptedClaimId);
  const worker = acceptedClaim
    ? state.profiles.find((p) => p.id === acceptedClaim.workerId)
    : undefined;
  const isPoster = me.id === shift.posterId;
  const myThreads = state.threads.filter(
    (t) => t.shiftId === shift.id && (isPoster || t.workerId === me.id),
  );
  const myRating = state.ratings.find(
    (r) => r.shiftId === shift.id && r.raterId === me.id,
  );

  async function act(fn: (s: typeof state) => void, message?: string) {
    setError("");
    setBusy(true);
    try {
      await mutateMarket(fn);
    } catch (err) {
      setError(
        err instanceof Error ? err.message : (message ?? "Action failed."),
      );
    } finally {
      setBusy(false);
    }
  }

  function claimShift() {
    void act((s) => {
      if (s.claims.some((c) => c.shiftId === shift.id && c.workerId === me.id))
        throw new Error("You already claimed this shift.");
      const id = `claim-${crypto.randomUUID().slice(0, 8)}`;
      s.claims.push({
        id,
        shiftId: shift.id,
        workerId: me.id,
        note: note.trim() || undefined,
        status: "pending",
        createdAt: new Date().toISOString(),
      });
      const tid = threadIdFor(shift.id, me.id);
      if (!s.threads.some((t) => t.id === tid))
        s.threads.push({
          id: tid,
          shiftId: shift.id,
          posterId: shift.posterId,
          workerId: me.id,
          createdAt: new Date().toISOString(),
        });
    });
  }

  function acceptClaim(claimId: string) {
    void act((s) => {
      const sh = s.shifts.find((x) => x.id === shift.id);
      if (!sh || sh.status !== "open") throw new Error("Shift is not open.");
      sh.status = "accepted";
      sh.acceptedClaimId = claimId;
      for (const c of s.claims)
        if (c.shiftId === shift.id && c.status === "pending" && c.id !== claimId)
          c.status = "declined";
    });
  }

  function declineClaim(claimId: string) {
    void act((s) => {
      const c = s.claims.find((x) => x.id === claimId);
      if (c && c.status === "pending") c.status = "declined";
    });
  }

  function withdrawClaim() {
    void act((s) => {
      const c = s.claims.find(
        (x) => x.shiftId === shift.id && x.workerId === me.id,
      );
      if (c && c.status === "pending") c.status = "withdrawn";
    });
  }

  /** Idempotent: safe against React double-invoke and re-renders. */
  function markEscrowed(status: "SUCCESS" | "FAILED", txHash: string) {
    void mutateMarket((s) => {
      const sh = s.shifts.find((x) => x.id === shift.id);
      if (!sh) return;
      if (status === "SUCCESS" && sh.status !== "escrowed") {
        sh.status = "escrowed";
        sh.escrowTxHash = txHash;
      }
      if (status === "FAILED" && sh.status === "accepted") {
        // Escrow failed: reopen so another worker can be accepted.
        sh.status = "open";
        sh.acceptedClaimId = undefined;
        for (const c of s.claims)
          if (c.id === shift.acceptedClaimId && c.status === "accepted")
            c.status = "pending";
      }
    }).catch(() => {});
  }

  function markComplete() {
    void act((s) => {
      const sh = s.shifts.find((x) => x.id === shift.id);
      if (!sh || sh.status !== "escrowed")
        throw new Error("Only an escrowed shift can be completed.");
      sh.status = "completed";
    });
  }

  function cancelShift() {
    void act((s) => {
      const sh = s.shifts.find((x) => x.id === shift.id);
      if (!sh) return;
      if (sh.status === "escrowed")
        throw new Error("Escrowed shifts must be completed, not cancelled.");
      sh.status = "cancelled";
      sh.acceptedClaimId = undefined;
      for (const c of s.claims)
        if (c.shiftId === shift.id && c.status === "pending") c.status = "declined";
    });
  }

  function rate() {
    void act((s) => {
      const rateeId = isPoster ? worker?.id : shift.posterId;
      if (!rateeId || rateeId === me.id)
        throw new Error("No counterpart to rate.");
      if (s.ratings.some((r) => r.shiftId === shift.id && r.raterId === me.id))
        throw new Error("You already rated this shift.");
      s.ratings.push({
        id: `rate-${crypto.randomUUID().slice(0, 8)}`,
        shiftId: shift.id,
        raterId: me.id,
        rateeId,
        stars: stars as 1 | 2 | 3 | 4 | 5,
        comment: comment.trim() || undefined,
        createdAt: new Date().toISOString(),
      });
    });
    setComment("");
  }

  const pendingClaims = claims.filter((c) => c.status === "pending");

  return (
    <>
      <header>
        <h1>{shift.title}</h1>
        <span className={`status status-${shift.status}`}>{shift.status}</span>
      </header>
      <p>
        <strong>{fromStroops(shift.amountStroops)} XLM</strong> · {shift.location}{" "}
        · {shift.startsAt} → {shift.endsAt}
      </p>
      <p>{shift.description}</p>
      <p>
        Posted by {poster?.name} ({poster?.tagline})
      </p>
      {shift.escrowTxHash && (
        <p>
          Escrow transaction: <code>{shift.escrowTxHash}</code>
        </p>
      )}
      {config.ready && (
        <p>
          <a href={config.deploymentUrl} target="_blank" rel="noreferrer">
            Review the payment deployment and its recipients
          </a>
        </p>
      )}

      {!isPoster && shift.status === "open" && !myClaim && (
        <section>
          <h2>Claim this shift</h2>
          <label>
            Note to the poster (optional)
            <input
              value={note}
              onChange={(e) => setNote(e.target.value)}
              placeholder="Why you’re a great fit"
            />
          </label>
          <button disabled={busy} onClick={claimShift}>
            Claim shift
          </button>
        </section>
      )}
      {!isPoster && myClaim?.status === "pending" && (
        <section>
          <p>Your claim is pending the poster’s decision.</p>
          <button disabled={busy} onClick={withdrawClaim}>
            Withdraw claim
          </button>
        </section>
      )}

      {isPoster && shift.status === "open" && (
        <section>
          <h2>Claims ({pendingClaims.length})</h2>
          {pendingClaims.length === 0 && <p>No claims yet — share the link!</p>}
          {pendingClaims.map((c) => {
            const claimant = state.profiles.find((p) => p.id === c.workerId);
            return (
              <div key={c.id} className="claim">
                <p>
                  <strong>{claimant?.name}</strong> — {claimant?.tagline}
                </p>
                {c.note && <p>{c.note}</p>}
                <button disabled={busy} onClick={() => acceptClaim(c.id)}>
                  Accept & request escrow
                </button>{" "}
                <button disabled={busy} onClick={() => declineClaim(c.id)}>
                  Decline
                </button>
              </div>
            );
          })}
        </section>
      )}

      {isPoster && shift.status === "accepted" && (
        <section>
          <h2>Escrow payment</h2>
          <p>
            Accepting a substitute means paying {fromStroops(shift.amountStroops)}{" "}
            XLM into the on-chain flow now. It routes to the deployment’s
            configured recipients (worker payout + platform split) once
            confirmed.
          </p>
        </section>
      )}
      {isPoster &&
        config.ready &&
        (shift.status === "accepted" || shift.status === "escrowed") && (
          <PaymentPanel
            scope={config.scope}
            recoveryKey={`paiflow-sdk-payment-v2:${config.scope}:${shift.id}`}
            amountStroops={shift.amountStroops}
            shiftId={shift.id}
            heading={`Escrow ${fromStroops(shift.amountStroops)} XLM for ${worker?.name ?? "your substitute"}`}
            onTerminal={markEscrowed}
          />
        )}
      {isPoster && !config.ready && shift.status === "accepted" && (
        <aside>{config.message}</aside>
      )}

      {(shift.status === "escrowed" || shift.status === "completed") && (
        <section>
          <h2>Completion</h2>
          {shift.status === "escrowed" && (
            <p>
              Escrow confirmed on-chain. Either party can mark the shift done
              once the work happened.
            </p>
          )}
          {shift.status === "escrowed" && (
            <button disabled={busy} onClick={markComplete}>
              Mark shift complete
            </button>
          )}
          {shift.status === "completed" && !myRating && (
            <div>
              <p>Rate {isPoster ? (worker?.name ?? "your substitute") : (poster?.name ?? "the poster")}:</p>
              <label>
                Stars
                <select
                  value={stars}
                  onChange={(e) => setStars(Number(e.target.value))}
                >
                  {[5, 4, 3, 2, 1].map((n) => (
                    <option key={n} value={n}>
                      {n}
                    </option>
                  ))}
                </select>
              </label>
              <label>
                Comment (optional)
                <input
                  value={comment}
                  onChange={(e) => setComment(e.target.value)}
                />
              </label>
              <button disabled={busy} onClick={rate}>
                Submit rating
              </button>
            </div>
          )}
          {myRating && <p>Your rating: {"★".repeat(myRating.stars)}</p>}
        </section>
      )}

      {isPoster && ["open", "accepted"].includes(shift.status) && (
        <p>
          <button disabled={busy} onClick={cancelShift}>
            Cancel shift
          </button>
        </p>
      )}

      {myThreads.map((t) => (
        <ChatThread
          key={t.id}
          threadId={t.id}
          meId={me.id}
          otherName={
            t.workerId === me.id
              ? (poster?.name ?? "the poster")
              : (state.profiles.find((p) => p.id === t.workerId)?.name ??
                "the claimant")
          }
        />
      ))}

      {error && <p role="alert">{error}</p>}
    </>
  );
}
