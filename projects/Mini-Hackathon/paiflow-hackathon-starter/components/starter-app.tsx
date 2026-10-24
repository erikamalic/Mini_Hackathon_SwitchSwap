"use client";
import type { PublicConfig } from "@/lib/types";
import { PaymentPanel } from "@/components/payment-panel";

/** Original starter demo: a fixed 1 XLM payment against the configured deployment. */
export function StarterApp({ config }: { config: PublicConfig }) {
  if (!config.ready)
    return (
      <main>
        <header>
          <h1>Paiflow SDK payment starter</h1>
          <span className="chip" data-testid="network-chip">
            TESTNET
          </span>
        </header>
        <aside>{config.message}</aside>
      </main>
    );
  return (
    <main>
      <header>
        <h1>Paiflow SDK payment starter</h1>
        <span className="chip" data-testid="network-chip">
          TESTNET
        </span>
      </header>
      <p>
        A minimal 1 XLM payment demo using the server-side Paiflow SDK and
        Freighter. Use your own native-XLM Receive deployment. No goods or
        orders are fulfilled by this example.
      </p>
      <p>
        <a href={config.deploymentUrl} target="_blank" rel="noreferrer">
          Review your deployment and its recipients
        </a>
      </p>
      <PaymentPanel
        scope={config.scope}
        recoveryKey={`paiflow-sdk-payment-v2:${config.scope}`}
        amountStroops="10000000"
        heading="Connect, prepare, sign, submit"
      />
      <aside>
        This local demo has no app authentication, order database, rate limit
        or business verification. Do not deploy it as a production checkout. A
        production application must bind prepared transactions to authorised
        orders and keep durable server-side recovery evidence. Browser storage
        is not a backup; deleting it loses recovery.
      </aside>
    </main>
  );
}
