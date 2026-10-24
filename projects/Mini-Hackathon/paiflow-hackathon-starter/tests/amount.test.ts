import { describe, expect, it } from "vitest";
import {
  addStroops,
  compareStroops,
  toStroops,
  fromStroops,
} from "@/lib/amount";
describe("amount conversion", () => {
  it.each([
    ["1", "10000000"],
    ["0.0000001", "1"],
    ["10.5", "105000000"],
    ["9007199254740993.1234567", "90071992547409931234567"],
  ])("converts %s without floating point", (decimal, stroops) => {
    expect(toStroops(decimal)).toBe(stroops);
    expect(fromStroops(stroops)).toBe(decimal);
  });
  it.each([
    "0",
    "-1",
    "1e7",
    "NaN",
    "Infinity",
    "1.12345678",
    " 1",
    "1.",
    ".5",
    "1,000",
    "9".repeat(40),
  ])("rejects invalid payment %s", (value) =>
    expect(() => toStroops(value)).toThrow(),
  );
  it("handles the i128 limit", () => {
    const max = ((1n << 127n) - 1n).toString();
    expect(toStroops(fromStroops(max))).toBe(max);
    expect(() => fromStroops((1n << 127n).toString())).toThrow();
    expect(fromStroops("0")).toBe("0");
  });
  it("adds and compares stroop strings without floating point", () => {
    expect(addStroops("10000000", "20000000")).toBe("30000000");
    expect(compareStroops("10000000", "20000000")).toBe(-1);
    expect(compareStroops("20000000", "10000000")).toBe(1);
    expect(compareStroops("10000000", "10000000")).toBe(0);
    expect(() => addStroops("x", "1")).toThrow();
    expect(() => compareStroops("1", "1.5")).toThrow();
  });
});
