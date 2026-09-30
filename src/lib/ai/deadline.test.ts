import { describe, expect, it } from "vitest";

import { withDeadline } from "@/lib/ai/deadline";

describe("withDeadline", () => {
  it("passes a signal through and returns the value when the call finishes in time", async () => {
    let sawSignal = false;

    const result = await withDeadline(
      async (signal) => {
        sawSignal = signal instanceof AbortSignal;
        return "done";
      },
      1_000,
      () => new Error("timed out"),
    );

    expect(result).toBe("done");
    expect(sawSignal).toBe(true);
  });

  it("fails with the caller's error when the call never answers, and aborts it", async () => {
    let signal: AbortSignal | undefined;
    const never = new Promise<never>(() => undefined);

    await expect(
      withDeadline(
        (own) => {
          signal = own;
          return never;
        },
        20,
        () => new Error("deadline reached"),
      ),
    ).rejects.toThrow("deadline reached");

    expect(signal?.aborted).toBe(true);
  });

  it("reports the failure the call itself produced rather than waiting for the deadline", async () => {
    await expect(
      withDeadline(
        async () => {
          throw new Error("provider said no");
        },
        1_000,
        () => new Error("deadline reached"),
      ),
    ).rejects.toThrow("provider said no");
  });
});
