import { describe, expect, it } from "vitest";

import { createInFlightCollapser } from "@/lib/ai/inflight";

function deferred<T>() {
  const { promise, resolve, reject } = Promise.withResolvers<T>();
  return { promise, resolve, reject };
}

describe("createInFlightCollapser", () => {
  it("runs one call for concurrent requests with the same key", async () => {
    const collapser = createInFlightCollapser();
    const gate = deferred<string>();
    let calls = 0;

    const call = () => {
      calls += 1;
      return gate.promise;
    };

    const first = collapser.run("same", call);
    const second = collapser.run("same", call);

    expect(first).toBe(second);
    gate.resolve("answer");

    expect(await first).toBe("answer");
    expect(await second).toBe("answer");
    expect(calls).toBe(1);
    expect(collapser.size()).toBe(0);
  });

  it("keeps different keys apart", async () => {
    const collapser = createInFlightCollapser();
    let calls = 0;
    const call = async () => {
      calls += 1;
      return calls;
    };

    expect(await Promise.all([collapser.run("a", call), collapser.run("b", call)])).toEqual([1, 2]);
    expect(calls).toBe(2);
  });

  it("does not cache: once an entry settles, the next request runs again", async () => {
    const collapser = createInFlightCollapser();
    let calls = 0;
    const call = async () => {
      calls += 1;
      return calls;
    };

    await collapser.run("k", call);
    await collapser.run("k", call);

    expect(calls).toBe(2);
  });

  it("lets a failed call leave the map, and gives every waiter the failure", async () => {
    const collapser = createInFlightCollapser();
    const gate = deferred<string>();
    const call = () => gate.promise;

    const first = collapser.run("k", call);
    const second = collapser.run("k", call);
    gate.reject(new Error("provider refused"));

    await expect(first).rejects.toThrow("provider refused");
    await expect(second).rejects.toThrow("provider refused");
    expect(collapser.size()).toBe(0);

    // The next caller is not handed the dead promise.
    expect(await collapser.run("k", async () => "fresh")).toBe("fresh");
  });
});
