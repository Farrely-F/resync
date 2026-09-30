import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { currentLogLevel, cut, logEvent, logLevelFromEnv, newRequestId, redact, setLogLevel } from "./log";

/** Everything written to either stream while `fn` runs, as parsed lines. */
function capture(fn: () => void): { lines: Record<string, unknown>[]; stdout: string; stderr: string } {
  let stdout = "";
  let stderr = "";
  const out = vi.spyOn(process.stdout, "write").mockImplementation((chunk: unknown) => {
    stdout += String(chunk);
    return true;
  });
  const err = vi.spyOn(process.stderr, "write").mockImplementation((chunk: unknown) => {
    stderr += String(chunk);
    return true;
  });

  try {
    fn();
  } finally {
    out.mockRestore();
    err.mockRestore();
  }

  const lines = `${stdout}${stderr}`
    .split("\n")
    .filter((line) => line.length > 0)
    .map((line) => JSON.parse(line) as Record<string, unknown>);

  return { lines, stdout, stderr };
}

const originalLevel = currentLogLevel();

beforeEach(() => {
  setLogLevel("debug");
});

afterEach(() => {
  setLogLevel(originalLevel);
});

describe("logLevelFromEnv", () => {
  it("reads a level, whatever its case and padding", () => {
    expect(logLevelFromEnv("debug")).toBe("debug");
    expect(logLevelFromEnv("  WARN ")).toBe("warn");
  });

  it("falls back to info for anything else, including nothing", () => {
    // A typo in LOG_LEVEL must not silence the log: the failure you need is the
    // one that arrives when logging was misconfigured.
    expect(logLevelFromEnv(undefined)).toBe("info");
    expect(logLevelFromEnv("")).toBe("info");
    expect(logLevelFromEnv("verbose")).toBe("info");
  });
});

describe("logEvent", () => {
  it("writes one JSON object per line, with the fields the caller passed", () => {
    const { lines } = capture(() => logEvent("info", "ai.call.started", { requestId: "r1", promptChars: 42 }));

    expect(lines).toHaveLength(1);
    expect(lines[0]).toMatchObject({ level: "info", event: "ai.call.started", requestId: "r1", promptChars: 42 });
    expect(typeof lines[0].ts).toBe("string");
  });

  it("sends warnings and errors to stderr, and the rest to stdout", () => {
    const warn = capture(() => logEvent("warn", "ai.attempt.failed", {}));
    const info = capture(() => logEvent("info", "ai.attempt.succeeded", {}));

    expect(warn.stderr).toContain("ai.attempt.failed");
    expect(warn.stdout).toBe("");
    expect(info.stdout).toContain("ai.attempt.succeeded");
    expect(info.stderr).toBe("");
  });

  it("drops lines below the level, and keeps the ones at it", () => {
    setLogLevel("warn");

    expect(capture(() => logEvent("debug", "ai.retry.scheduled", {})).lines).toHaveLength(0);
    expect(capture(() => logEvent("info", "ai.call.started", {})).lines).toHaveLength(0);
    expect(capture(() => logEvent("warn", "ai.attempt.failed", {})).lines).toHaveLength(1);
    expect(capture(() => logEvent("error", "ai.call.failed", {})).lines).toHaveLength(1);
  });

  it("cannot have its own fields overwritten by a caller", () => {
    const { lines } = capture(() => logEvent("info", "real.event", { event: "fake", level: "error", ts: "1970" }));

    expect(lines[0]).toMatchObject({ event: "real.event", level: "info" });
    expect(lines[0].ts).not.toBe("1970");
  });

});

describe("redact", () => {
  it("removes a credential by the name of its field", () => {
    expect(redact({ apiKey: "sk-live-1234567890abcdef", authorization: "Bearer abc" })).toEqual({
      apiKey: "[redacted]",
      authorization: "[redacted]",
    });
  });

  it("removes a credential that appears inside a string, under any name", () => {
    // The name of the field is not a reliable signal: a key ends up in a header
    // dump, an error message or a URL, and those are named after the request.
    const redacted = redact({ note: "failed with gsk_ABCDEFGHIJKLMNOPQRSTUV and sk-abcdefghijklmnopqrst" });

    expect(redacted).toEqual({ note: "failed with [redacted] and [redacted]" });
  });

  it("keeps the shape of what it is given, to a bounded depth", () => {
    const redacted = redact({ a: { b: { c: { d: { e: "deep" } } } } });

    expect(JSON.stringify(redacted)).toContain("depth limit");
  });

  it("describes an Error rather than logging it as an empty object", () => {
    expect(redact(new TypeError("fetch failed"))).toEqual({ name: "TypeError", message: "fetch failed" });
  });
});

describe("cut", () => {
  it("leaves a short value alone", () => {
    expect(cut("short", 10)).toBe("short");
  });

  it("marks how much was dropped", () => {
    // A silently truncated body reads like a complete one that ended oddly.
    expect(cut("0123456789abc", 10)).toBe("0123456789… [3 more characters]");
  });
});

describe("newRequestId", () => {
  it("produces a distinct id per call", () => {
    expect(newRequestId()).not.toBe(newRequestId());
  });
});
