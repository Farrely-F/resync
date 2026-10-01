import { describe, expect, it } from "vitest";

import { describeThrown } from "@/components/system/describe-thrown";

describe("describeThrown", () => {
  it("keeps the message and the digest of a server failure", () => {
    const error = Object.assign(new Error("Server Components render error"), { digest: "8f14e45f" });

    expect(describeThrown(error)).toEqual({ message: "Server Components render error", digest: "8f14e45f" });
  });

  it("reports no digest when the error carries none", () => {
    expect(describeThrown(new Error("boom")).digest).toBeNull();
  });

  it("treats an empty message as no message", () => {
    expect(describeThrown(new Error("")).message).toBeNull();
  });

  it("reads a thrown string, because anything can be thrown", () => {
    expect(describeThrown("quota exceeded")).toEqual({ message: "quota exceeded", digest: null });
  });

  it("reports nothing for a thrown value it cannot read", () => {
    expect(describeThrown({ reason: "unknown" })).toEqual({ message: null, digest: null });
    expect(describeThrown(undefined)).toEqual({ message: null, digest: null });
  });

  it("ignores a non-string digest", () => {
    const error = Object.assign(new Error("boom"), { digest: 42 });

    expect(describeThrown(error).digest).toBeNull();
  });
});
