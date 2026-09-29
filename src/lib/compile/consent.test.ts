import { describe, expect, it } from "vitest";

import {
  consentStorageKey,
  grantConsent,
  readConsent,
  revokeConsent,
  type ConsentStore,
} from "@/lib/compile/consent";

function memoryStore(initial: Record<string, string> = {}): ConsentStore & { values: Map<string, string> } {
  const values = new Map(Object.entries(initial));
  return {
    values,
    getItem: (key) => values.get(key) ?? null,
    setItem: (key, value) => void values.set(key, value),
    removeItem: (key) => void values.delete(key),
  };
}

describe("engine download consent", () => {
  it("starts with no consent, so nothing can download", () => {
    expect(readConsent(memoryStore())).toBeNull();
  });

  it("remembers a granted decision and the size that was agreed to", () => {
    const store = memoryStore();
    expect(store.values.has(consentStorageKey)).toBe(false);

    const record = grantConsent(store, 127_755_145, () => "2026-09-29T10:00:00.000Z");

    expect(record).toEqual({ version: 1, grantedAt: "2026-09-29T10:00:00.000Z", bytes: 127_755_145 });
    expect(readConsent(store)).toEqual(record);
    expect(store.values.get(consentStorageKey)).toBe(JSON.stringify(record));
  });

  it("is revocable: after revoking, the download is gated again", () => {
    const store = memoryStore();
    grantConsent(store, 127_755_145);
    expect(readConsent(store)).not.toBeNull();

    revokeConsent(store);

    expect(readConsent(store)).toBeNull();
    expect(store.values.has(consentStorageKey)).toBe(false);
  });

  it("treats an unparsable or outdated record as no consent", () => {
    expect(readConsent(memoryStore({ [consentStorageKey]: "{" }))).toBeNull();
    expect(readConsent(memoryStore({ [consentStorageKey]: "null" }))).toBeNull();
    expect(readConsent(memoryStore({ [consentStorageKey]: '"granted"' }))).toBeNull();
    expect(readConsent(memoryStore({ [consentStorageKey]: JSON.stringify({ version: 0, grantedAt: "x", bytes: 1 }) }))).toBeNull();
    expect(readConsent(memoryStore({ [consentStorageKey]: JSON.stringify({ version: 1, bytes: 1 }) }))).toBeNull();
    expect(readConsent(memoryStore({ [consentStorageKey]: JSON.stringify({ version: 1, grantedAt: 5, bytes: 1 }) }))).toBeNull();
  });

  it("works without a store (server render, or storage blocked) without throwing", () => {
    expect(readConsent(null)).toBeNull();
    expect(grantConsent(null, 10).bytes).toBe(10);
    expect(() => revokeConsent(null)).not.toThrow();
  });
});
