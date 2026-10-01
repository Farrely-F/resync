import { describe, expect, it } from "vitest";

import { diffWords } from "@/lib/suggestions/diff";

describe("diffWords", () => {
  it("marks only the words that changed", () => {
    expect(diffWords("Built the wallet UI", "Built the web3 wallet UI")).toEqual([
      { kind: "same", text: "Built the " },
      { kind: "added", text: "web3 " },
      { kind: "same", text: "wallet UI" },
    ]);
  });

  it("reports removals and identical text", () => {
    expect(diffWords("a b c", "a c").some((part) => part.kind === "removed")).toBe(true);
    expect(diffWords("same text", "same text")).toEqual([{ kind: "same", text: "same text" }]);
  });
});
