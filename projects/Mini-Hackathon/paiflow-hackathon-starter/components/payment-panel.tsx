"use client";
import { usePayment } from "@/lib/use-payment";
import { fromStroops } from "@/lib/amount";
import { terminal } from "@/lib/recovery";

export function PaymentPanel(opts: {
  scope: string;
  recoveryKey: string;
  amountStroops: string;
  shiftId?: string;
  heading: string;
  onTerminal?: (status: "SUCCESS" | "FAILED", txHash: string) => void;
}) {
  const p = usePayment(opts);
  const { record, busy, confirming, message, blocked, address } = p;
  return (
    <section>
      <h2>{opts.heading}</h2>
      <p>
        Payment: {fromStroops(opts.amountStroops)} testnet XLM plus network
        fees. Review the full transaction in Freighter.
      </p>
      <p>
        <button disabled={busy || blocked || !!address} onClick={p.connect}>
          Connect Freighter
        </button>{" "}
        Wallet: {address || "Not connected"}
      </p>
      <p>
        <button
          disabled={busy || blocked || !address || !!record}
          onClick={p.prepare}
        >
          Prepare {fromStroops(opts.amountStroops)} XLM payment
        </button>{" "}
        <button
          disabled={
            busy || !record || !!record.signedXdr || terminal(record) || blocked
          }
          onClick={p.sign}
        >
          Sign original transaction
        </button>{" "}
        <button
          disabled={
            busy ||
            !record?.signedXdr ||
            (!!record && terminal(record)) ||
            blocked
          }
          onClick={p.submit}
        >
          {record?.attempted
            ? "Retry exact saved envelope"
            : "Submit saved envelope"}
        </button>
      </p>
      {record && (
        <>
          <p>
            Original transaction: <code>{record.prepared.txHash}</code>
          </p>
          <p>Preparation expires: {record.prepared.expiresAt}</p>
          <p>Status: {record.status || "Not checked"}</p>
        </>
      )}
      <p>
        <button disabled={busy || !record || blocked} onClick={p.checkStatus}>
          Check original transaction
        </button>{" "}
        <button
          disabled={busy || !record || !terminal(record) || blocked}
          onClick={p.clear}
        >
          Acknowledge final result and clear
        </button>
      </p>
      <p>
        Transaction confirmation alone is not payout verification — confirm the
        split payout on the deployment’s activity page and recipient balances.
      </p>
      <p role="status" aria-live="polite">
        {confirming ? message : busy ? "Working…" : message}
      </p>
      {confirming && (
        <button onClick={p.stopConfirming}>Stop checking</button>
      )}
    </section>
  );
}
