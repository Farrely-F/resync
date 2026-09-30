import { describe, expect, it } from "vitest";

import { shouldAutoCompile, type AutoPreviewInput } from "./auto-preview";

const ready: AutoPreviewInput = {
  enabled: true,
  engineReady: true,
  blocked: false,
  compiledTex: null,
  tex: "\\documentclass{article}",
};

describe("shouldAutoCompile", () => {
  it("compiles once when nothing has been compiled yet", () => {
    expect(shouldAutoCompile(ready)).toBe(true);
  });

  it("does not compile the same text twice", () => {
    // The regression this guards: compiling whenever the effect re-runs, which
    // turns one edit into an endless compile loop.
    expect(shouldAutoCompile({ ...ready, compiledTex: ready.tex })).toBe(false);
  });

  it("compiles again after an edit", () => {
    expect(shouldAutoCompile({ ...ready, compiledTex: ready.tex, tex: "\\documentclass{book}" })).toBe(true);
  });

  it("stays off when the reader has switched it off", () => {
    expect(shouldAutoCompile({ ...ready, enabled: false })).toBe(false);
    expect(shouldAutoCompile({ ...ready, enabled: false, compiledTex: ready.tex, tex: "changed" })).toBe(false);
  });

  it("never starts an engine download or a consent prompt on its own", () => {
    expect(shouldAutoCompile({ ...ready, engineReady: false })).toBe(false);
  });

  it("waits while the source check reports a problem", () => {
    expect(shouldAutoCompile({ ...ready, blocked: true })).toBe(false);
  });

  it("treats a failed compile as something to retry after the next edit", () => {
    // A failure leaves the compiled text unset, so the next change is tried again
    // rather than the document being stuck permanently uncompiled.
    const failed = { ...ready, compiledTex: null, tex: "\\documentclass{article}" };
    expect(shouldAutoCompile(failed)).toBe(true);
  });
});
