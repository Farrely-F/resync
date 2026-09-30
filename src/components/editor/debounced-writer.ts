/**
 * Debounced, ordered writer for the editor's write-through.
 *
 * The editor has no save button, so the contract has to be exact:
 *
 * - only the newest value is written, so a burst of keystrokes is one write;
 * - `flush()` writes whatever is still waiting, so the last keystroke is never
 *   left in a timer that the page might not survive;
 * - writes are serialised in order, so a slow write can never be overtaken by a
 *   newer one and leave an older record in storage;
 * - a failed write is reported and the next one still happens, because a
 *   transient failure must not wedge every later edit.
 *
 * The clock and the storage call are the only things it touches, both passed in,
 * so the rules above are testable without a browser or a real timer.
 */
export interface DebouncedWriter<T> {
  /** Replaces any waiting value; the newest call wins. */
  schedule(value: T): void;
  /** Writes anything waiting now, resolving once every queued write was attempted. */
  flush(): Promise<void>;
}

/**
 * Timer seam.
 *
 * `setTimeout` returns a number in the browser and a `Timeout` object in Node,
 * and this module is built for the browser but tested in Node. The seam keeps
 * that difference in one place, and lets a test drive the debounce with a clock
 * it controls. `set` must return a handle that is not `null`, and `clear` must
 * accept `null` as a no-op.
 */
export interface Timers {
  set(handler: () => void, delayMs: number): unknown;
  clear(handle: unknown): void;
}

export const systemTimers: Timers = {
  set(handler, delayMs) {
    return setTimeout(handler, delayMs);
  },
  clear(handle) {
    clearTimeout(handle as number);
  },
};

export function createDebouncedWriter<T>(
  write: (value: T) => Promise<void>,
  {
    delayMs,
    onError,
    timers = systemTimers,
  }: { delayMs: number; onError?: (error: unknown) => void; timers?: Timers },
): DebouncedWriter<T> {
  let timer: unknown = null;
  let waiting: { value: T } | null = null;
  let chain: Promise<void> = Promise.resolve();

  function clearTimer() {
    timers.clear(timer);
    timer = null;
  }

  function start() {
    const next = waiting;
    waiting = null;

    if (next === null) {
      return chain;
    }

    // The catch is what keeps the queue alive: a rejected write is reported and
    // the next value still gets its turn.
    chain = chain
      .then(() => write(next.value))
      .catch((error: unknown) => {
        onError?.(error);
      });

    return chain;
  }

  return {
    schedule(value: T) {
      waiting = { value };
      clearTimer();
      timer = timers.set(() => {
        timer = null;
        void start();
      }, delayMs);
    },

    flush() {
      clearTimer();
      return start();
    },
  };
}
