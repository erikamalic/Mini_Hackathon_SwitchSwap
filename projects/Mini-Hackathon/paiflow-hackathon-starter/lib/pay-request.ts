import "server-only";

export type PayAction =
  | { action: "prepare"; from: string; amountStroops: string }
  | { action: "status"; txHash: string }
  | {
      action: "submit";
      signedXdr: string;
      preparationRequestId?: string;
    };

const STROOPS = /^\d{5,12}$/;
const TX_HASH = /^[a-f0-9]{64}$/;

/** Narrow request validation, factored out of the route for testability. */
export function parsePayAction(text: string): PayAction {
  if (text.length > 210000) throw new Error("Request too large.");
  let b: unknown;
  try {
    b = JSON.parse(text);
  } catch {
    throw new Error("Invalid request.");
  }
  if (!b || typeof b !== "object" || Array.isArray(b))
    throw new Error("Invalid request.");
  const v = b as Record<string, unknown>;
  if (
    v.action === "prepare" &&
    typeof v.from === "string" &&
    typeof v.amountStroops === "string" &&
    STROOPS.test(v.amountStroops) &&
    Object.keys(v).length === 3
  )
    return { action: "prepare", from: v.from, amountStroops: v.amountStroops };
  if (
    v.action === "status" &&
    typeof v.txHash === "string" &&
    TX_HASH.test(v.txHash) &&
    Object.keys(v).length === 2
  )
    return { action: "status", txHash: v.txHash };
  if (
    v.action === "submit" &&
    typeof v.signedXdr === "string" &&
    v.signedXdr.length <= 200000 &&
    (v.preparationRequestId === undefined ||
      (typeof v.preparationRequestId === "string" &&
        v.preparationRequestId.length <= 200)) &&
    Object.keys(v).every((k) =>
      ["action", "signedXdr", "preparationRequestId"].includes(k),
    )
  )
    return {
      action: "submit",
      signedXdr: v.signedXdr,
      preparationRequestId: v.preparationRequestId as string | undefined,
    };
  throw new Error("Invalid request.");
}
