import { afterEach, describe, expect, it, vi } from "vitest";

import { createDebouncedWriter, systemTimers, type Timers } from "@/components/editor/debounced-writer";

/**
 * A clock the test drives, so the debounce rules are decided by the test rather
 * than by wall time. `set` hands back an id and `clear` drops it, which is all
 * the writer is allowed to assume of a timer.
 */
function manualClock() {
  let nextId = 1;
  const armed = new Map<number, () => void>();

  const timers: Timers = {
    set(handler) {
      const id = nextId;
      nextId += 1;
      armed.set(id, handler);
      return id;
    },
    clear(handle) {
      armed.delete(handle as number);
    },
  };

  return {
    timers,
    armedCount: () => armed.size,
    fire() {
      const handlers = [...armed.values()];
      armed.clear();
      for (const handler of handlers) {
        handler();
      }
    },
  };
}

/** Records the values it is asked to write, in order. */
function recorder() {
  const writes: number[] = [];
  return {
    writes,
    write: (value: number) => {
      writes.push(value);
      return Promise.resolve();
    },
  };
}

afterEach(() => {
  vi.useRealTimers();
});

describe("createDebouncedWriter", () => {
  it("writes once, with the newest value, after the delay", async () => {
    const clock = manualClock();
    const { writes, write } = recorder();
    const writer = createDebouncedWriter(write, { delayMs: 500, timers: clock.timers });

    writer.schedule(1);
    writer.schedule(2);
    writer.schedule(3);

    expect(writes).toEqual([]);
    expect(clock.armedCount()).toBe(1);

    clock.fire();
    await writer.flush();

    expect(writes).toEqual([3]);
  });

  it("waits the delay before writing and no longer", async () => {
    vi.useFakeTimers();
    const { writes, write } = recorder();
    const writer = createDebouncedWriter(write, { delayMs: 500, timers: systemTimers });

    writer.schedule(1);
    await vi.advanceTimersByTimeAsync(499);
    expect(writes).toEqual([]);

    await vi.advanceTimersByTimeAsync(1);
    expect(writes).toEqual([1]);
  });

  it("writes a waiting value immediately on flush", async () => {
    const clock = manualClock();
    const { writes, write } = recorder();
    const writer = createDebouncedWriter(write, { delayMs: 500, timers: clock.timers });

    writer.schedule(1);
    await writer.flush();

    expect(writes).toEqual([1]);
    expect(clock.armedCount()).toBe(0);
  });

  it("does not lose the last keystroke when flush follows a burst", async () => {
    const clock = manualClock();
    const { writes, write } = recorder();
    const writer = createDebouncedWriter(write, { delayMs: 500, timers: clock.timers });

    writer.schedule(1);
    writer.schedule(2);
    clock.fire();
    writer.schedule(3);
    await writer.flush();

    expect(writes).toEqual([2, 3]);
  });

  it("writes nothing on flush when nothing was scheduled", async () => {
    const clock = manualClock();
    const { writes, write } = recorder();
    const writer = createDebouncedWriter(write, { delayMs: 500, timers: clock.timers });

    await writer.flush();
    await writer.flush();

    expect(writes).toEqual([]);
  });

  it("keeps writes in order when the storage call is slow", async () => {
    const clock = manualClock();
    const started: number[] = [];
    const releases: (() => void)[] = [];
    const settle = async () => {
      for (let round = 0; round < 4; round += 1) {
        await Promise.resolve();
      }
    };
    const writer = createDebouncedWriter<number>(
      (value) =>
        new Promise<void>((resolve) => {
          started.push(value);
          releases.push(resolve);
        }),
      { delayMs: 500, timers: clock.timers },
    );

    writer.schedule(1);
    clock.fire();
    await settle();
    expect(started).toEqual([1]);

    writer.schedule(2);
    void writer.flush();
    await settle();
    // The second write waits for the first to settle, so storage never sees 2 before 1.
    expect(started).toEqual([1]);

    releases[0]();
    await settle();
    expect(started).toEqual([1, 2]);

    releases[1]();
    await writer.flush();
  });

  it("reports a failed write and still writes the next value", async () => {
    const clock = manualClock();
    const errors: unknown[] = [];
    const attempts: number[] = [];
    const writer = createDebouncedWriter<number>(
      (value) => {
        attempts.push(value);
        return value === 1 ? Promise.reject(new Error("quota exceeded")) : Promise.resolve();
      },
      { delayMs: 500, timers: clock.timers, onError: (error) => errors.push(error) },
    );

    writer.schedule(1);
    await writer.flush();
    writer.schedule(2);
    await writer.flush();

    expect(attempts).toEqual([1, 2]);
    expect(errors).toHaveLength(1);
  });
});
