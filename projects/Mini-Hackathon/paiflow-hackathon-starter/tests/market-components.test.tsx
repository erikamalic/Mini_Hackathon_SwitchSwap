import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

beforeEach(() => {
  vi.stubGlobal("self", globalThis);
});
afterEach(() => {
  vi.unstubAllGlobals();
});
import TestRenderer, { act } from "react-test-renderer";
import { MarketProvider } from "@/lib/market/react";
import { ShiftFeed } from "@/components/shift-feed";

async function render(ui: React.ReactElement) {
  let renderer!: TestRenderer.ReactTestRenderer;
  await act(async () => {
    renderer = TestRenderer.create(ui);
  });
  return renderer;
}

function textOf(node: unknown): string {
  if (node == null || typeof node === "boolean") return "";
  if (typeof node === "string" || typeof node === "number") return String(node);
  if (Array.isArray(node)) return node.map(textOf).join("");
  if (typeof node === "object" && "children" in node)
    return textOf((node as { children: unknown }).children);
  return "";
}

describe("market components", () => {
  it("ShiftFeed renders seeded shifts with XLM pay", async () => {
    const renderer = await render(
      <MarketProvider>
        <ShiftFeed />
      </MarketProvider>,
    );
    const text = textOf(renderer.toJSON());
    expect(text).toContain("Café morning rush cover");
    expect(text).toContain("1 XLM");
    expect(text).toContain("5 XLM");
    renderer.unmount();
  });
});
