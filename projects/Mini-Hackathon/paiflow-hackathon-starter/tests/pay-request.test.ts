import { describe, expect, it, vi } from "vitest";

vi.mock("server-only", () => ({}));

import { parsePayAction } from "@/lib/pay-request";

const FROM = "G".padEnd(56, "A");

describe("parsePayAction", () => {
  it("accepts the three actions with exact shapes", () => {
    expect(
      parsePayAction(
        JSON.stringify({ action: "prepare", from: FROM, amountStroops: "10000000" }),
      ),
    ).toEqual({ action: "prepare", from: FROM, amountStroops: "10000000" });
    expect(
      parsePayAction(JSON.stringify({ action: "status", txHash: "a".repeat(64) })),
    ).toEqual({ action: "status", txHash: "a".repeat(64) });
    expect(
      parsePayAction(
        JSON.stringify({ action: "submit", signedXdr: "x", preparationRequestId: "p" }),
      ),
    ).toEqual({ action: "submit", signedXdr: "x", preparationRequestId: "p" });
    expect(
      parsePayAction(JSON.stringify({ action: "submit", signedXdr: "x" })),
    ).toEqual({ action: "submit", signedXdr: "x", preparationRequestId: undefined });
  });

  it("rejects extra keys, missing fields and malformed stroops", () => {
    for (const body of [
      { action: "prepare", from: FROM, amountStroops: "10000000", extra: 1 },
      { action: "prepare", from: FROM },
      { action: "prepare", from: FROM, amountStroops: "1e7" },
      { action: "prepare", from: FROM, amountStroops: "123" },
      { action: "prepare", from: FROM, amountStroops: 10000000 },
      { action: "status", txHash: "a".repeat(63) },
      { action: "submit", signedXdr: "x", other: true },
      { action: "unknown" },
      null,
      ["prepare"],
      "text",
    ]) {
      expect(() => parsePayAction(JSON.stringify(body))).toThrow("Invalid request");
    }
  });

  it("rejects oversized and non-JSON bodies", () => {
    expect(() => parsePayAction("x".repeat(210001))).toThrow("too large");
    expect(() => parsePayAction("{bad")).toThrow("Invalid request");
  });
});
