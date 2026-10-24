"use client";
import { useEffect, useRef, useState } from "react";
import type { Prepared, Result } from "@/lib/types";
import {
  BrowserRequestError,
  browserRequest,
  RESPONSE_DEADLINE_MS,
} from "@/lib/browser-api";
import {
  assertStatus,
  confirmOriginal,
  CONFIRMATION_PENDING,
  CONFIRMATION_UNRESOLVED,
} from "@/lib/confirmation";
import { connectWallet, signPrepared } from "@/lib/wallet";
import { assertOriginal } from "@/lib/transaction";
import {
  readRecovery,
  saveRecovery,
  terminal,
  assertNoConflictingRecovery,
} from "@/lib/recovery";
import type { Recovery } from "@/lib/recovery";

type Operation = {
  signal: AbortSignal;
  valid: () => boolean;
  save: (record: Recovery) => void;
  message: (message: string) => void;
};

export type PaymentTerminal = "SUCCESS" | "FAILED";

export function usePayment(opts: {
  /** Deployment scope from publicConfig (baseUrl/deploymentId). */
  scope: string;
  /** Full localStorage key for this payment's recovery record. */
  recoveryKey: string;
  /** Whitelisted stroop amount for prepare. */
  amountStroops: string;
  /** Marketplace escrow correlation, stored in the recovery record. */
  shiftId?: string;
  onTerminal?: (status: PaymentTerminal, txHash: string) => void;
}) {
  const { scope, recoveryKey: key, amountStroops, shiftId, onTerminal } = opts;
  const [address, setAddress] = useState("");
  const [record, setRecord] = useState<Recovery | null>(null);
  const [busy, setBusy] = useState(false);
  const [confirming, setConfirming] = useState(false);
  const [message, setMessage] = useState("");
  const [blocked, setBlocked] = useState(true);
  const scopeKey = useRef(key);
  scopeKey.current = key;
  const loadedKey = useRef<string | null>(null);
  const active = useRef<AbortController | null>(null);
  const resumed = useRef(new Set<string>());
  const onTerminalRef = useRef(onTerminal);
  onTerminalRef.current = onTerminal;

  useEffect(() => {
    loadedKey.current = null;
    active.current?.abort();
    active.current = null;
    setBusy(false);
    setConfirming(false);
    resumed.current.clear();
    setBlocked(true);
    setRecord(null);
    setAddress("");
    setMessage("");
    if (!key) return;
    try {
      assertNoConflictingRecovery(localStorage, key, scope);
      const raw = localStorage.getItem(key);
      if (raw) setRecord(readRecovery(scope, raw));
      loadedKey.current = key;
      setBlocked(false);
    } catch (error) {
      setMessage(
        error instanceof Error
          ? error.message
          : "Recovery storage could not be read. Preserve it for support before starting another payment.",
      );
    }
    return () => {
      loadedKey.current = null;
      active.current?.abort();
    };
  }, [key, scope]);

  async function run(
    action: (current: Recovery | null, op: Operation) => Promise<void>,
  ) {
    if (!key || active.current || blocked || loadedKey.current !== key) return;
    const controller = new AbortController();
    active.current = controller;
    const valid = () =>
      !controller.signal.aborted &&
      scopeKey.current === key &&
      loadedKey.current === key;
    const op: Operation = {
      signal: controller.signal,
      valid,
      save: (r) => {
        if (!valid())
          throw new DOMException("Operation cancelled", "AbortError");
        if (r.scope !== scope)
          throw new Error(
            "Recovery scope mismatch. Retain the original record.",
          );
        saveRecovery(localStorage, key, r);
        setRecord(r);
      },
      message: (text) => {
        if (valid()) setMessage(text);
      },
    };
    setBusy(true);
    setMessage("");
    try {
      if (!navigator.locks)
        throw new Error(
          "This browser needs Web Locks support for safe payment recovery.",
        );
      await navigator.locks.request(
        key,
        { ifAvailable: true },
        async (lock) => {
          if (!valid()) return;
          if (!lock)
            throw new Error(
              "Another tab is handling this deployment's payment. Return to that tab.",
            );
          assertNoConflictingRecovery(localStorage, key, scope);
          const raw = localStorage.getItem(key);
          const current = raw ? readRecovery(scope, raw) : null;
          setRecord(current);
          await action(current, op);
        },
      );
    } catch (error) {
      op.message(
        error instanceof Error
          ? error.message
          : "Unresolved operation. Keep the original record.",
      );
    } finally {
      if (active.current === controller) {
        active.current = null;
        if (scopeKey.current === key && loadedKey.current === key) {
          setBusy(false);
          setConfirming(false);
        }
      }
    }
  }

  function statusMessage(result: Result) {
    if (result.status === "SUCCESS")
      return "Original transaction confirmed. This does not verify downstream payouts or fulfil an application order.";
    if (result.status === "FAILED")
      return "Original transaction failed on the network. Its evidence is retained until acknowledged.";
    return `Original transaction: ${result.status}. UNKNOWN, rejection, expiry or missing history never prove replacement is safe.`;
  }

  async function checkOriginal(current: Recovery, op: Operation) {
    if (!op.valid()) return;
    resumed.current.add(`${key}:${current.prepared.txHash}`);
    op.message(CONFIRMATION_PENDING);
    setConfirming(true);
    const outcome = await confirmOriginal({
      txHash: current.prepared.txHash,
      signal: op.signal,
      lookup: (signal, remainingMs) =>
        browserRequest<Result>(
          "/api/pay",
          { action: "status", txHash: current.prepared.txHash },
          signal,
          remainingMs,
        ),
      onResult: (result) => {
        op.save({ ...current, status: result.status });
        if (
          result.status === "SUCCESS" ||
          result.status === "FAILED" ||
          result.status === "REJECTED"
        )
          op.message(statusMessage(result));
        if (result.status === "SUCCESS" || result.status === "FAILED")
          onTerminalRef.current?.(result.status, result.txHash);
      },
    });
    if (outcome === "unresolved") op.message(CONFIRMATION_UNRESOLVED);
  }

  useEffect(() => {
    if (blocked || busy || !record?.attempted || !record.signedXdr || terminal(record))
      return;
    const identity = `${key}:${record.prepared.txHash}`;
    if (resumed.current.has(identity)) return;
    resumed.current.add(identity);
    void run(async (current, op) => {
      if (current?.attempted && current.signedXdr && !terminal(current))
        await checkOriginal(current, op);
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [key, blocked, busy, record]);

  async function connect(_current: Recovery | null, op: Operation) {
    await browserRequest("/api/integration", undefined, op.signal);
    const addr = await connectWallet();
    if (op.valid()) setAddress(addr);
  }

  async function prepare(current: Recovery | null, op: Operation) {
    if (current)
      throw new Error("Resolve the existing payment before preparing another.");
    if (!address) throw new Error("Connect Freighter first.");
    const prepared = await browserRequest<Prepared>(
      "/api/pay",
      { action: "prepare", from: address, amountStroops },
      op.signal,
    );
    if (!op.valid()) return;
    op.save({ version: 2, scope, address, prepared, shiftId });
    op.message("Prepared and saved. Review the wallet transaction before approving.");
  }

  async function sign(current: Recovery | null, op: Operation) {
    if (!current || current.signedXdr || terminal(current)) return;
    if (address !== current.address)
      throw new Error("Connect the original consenting wallet.");
    const next = { ...current, signing: true };
    op.save(next);
    const signedXdr = await signPrepared(current.prepared, current.address);
    assertOriginal(current.prepared.xdr, signedXdr, current.prepared.txHash);
    op.save({ ...next, signing: false, signedXdr });
    op.message("Exact signed envelope saved. Submit when ready.");
  }

  async function submit(current: Recovery | null, op: Operation) {
    if (!current?.signedXdr || terminal(current)) return;
    assertOriginal(
      current.prepared.xdr,
      current.signedXdr,
      current.prepared.txHash,
    );
    const next = { ...current, attempted: true };
    resumed.current.add(`${key}:${current.prepared.txHash}`);
    op.save(next);
    let result: Result;
    try {
      result = await browserRequest<Result>(
        "/api/pay",
        {
          action: "submit",
          signedXdr: current.signedXdr,
          preparationRequestId: current.prepared.preparationRequestId,
        },
        op.signal,
        RESPONSE_DEADLINE_MS,
      );
    } catch (error) {
      if (!op.valid()) return;
      if (
        error instanceof BrowserRequestError &&
        error.status < 500 &&
        error.code !== "UPSTREAM_RPC"
      )
        throw error;
      await checkOriginal(next, op);
      return;
    }
    if (!op.valid()) return;
    if (result.txHash !== current.prepared.txHash)
      throw new Error("Response hash mismatch. Keep the original record.");
    if (result.status === "REJECTED") {
      op.save({ ...next, status: "REJECTED" });
      op.message(statusMessage(result));
      return;
    }
    await checkOriginal(next, op);
  }

  async function checkStatus(current: Recovery | null, op: Operation) {
    if (!current) return;
    const result = await browserRequest<Result>(
      "/api/pay",
      { action: "status", txHash: current.prepared.txHash },
      op.signal,
      RESPONSE_DEADLINE_MS,
    );
    if (!op.valid()) return;
    assertStatus(result, current.prepared.txHash);
    op.save({ ...current, status: result.status });
    op.message(statusMessage(result));
    if (result.status === "SUCCESS" || result.status === "FAILED")
      onTerminalRef.current?.(result.status, result.txHash);
  }

  async function clear(current: Recovery | null, op: Operation) {
    if (!current || !terminal(current))
      throw new Error(
        "Check final SUCCESS or FAILED before clearing this record.",
      );
    if (!op.valid()) return;
    localStorage.removeItem(key);
    if (localStorage.getItem(key) !== null)
      throw new Error("Could not clear stored evidence.");
    setRecord(null);
    op.message(
      "Final transaction acknowledged. A new demo payment is now possible.",
    );
  }

  function stopConfirming() {
    active.current?.abort();
    setMessage(CONFIRMATION_UNRESOLVED);
  }

  return {
    address,
    record,
    busy,
    confirming,
    message,
    blocked,
    connect: () => run(connect),
    prepare: () => run(prepare),
    sign: () => run(sign),
    submit: () => run(submit),
    checkStatus: () => run(checkStatus),
    clear: () => run(clear),
    stopConfirming,
  };
}
