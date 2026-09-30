"use client";

import { useCallback, useEffect, useMemo, useState } from "react";

import { createDebouncedWriter } from "@/components/editor/debounced-writer";

/**
 * Write-through for the editor: no save button, no lost keystroke.
 *
 * The value is debounced so a burst of typing is one write, and the queue is
 * flushed three ways so the newest keystroke still reaches storage when the page
 * goes away:
 *
 * - when the tab is hidden (`visibilitychange`), which fires before a tab is
 *   closed or backgrounded on mobile and is the last reliable moment to write;
 * - on `pagehide`, for a navigation that skips the visibility change;
 * - on unmount, for an in-app navigation.
 *
 * `delayMs` is short on purpose: it bounds how much typing a crash could lose,
 * and the flush paths above cover the cases a timer cannot.
 */
export type SaveStatus = "idle" | "pending" | "saved" | "error";

export interface DebouncedSave<T> {
  /** Queues a value; the newest call wins. */
  save(value: T): void;
  /** Writes anything queued now. */
  flush(): Promise<void>;
  status: SaveStatus;
}

export const saveDebounceMs = 500;

export function useDebouncedSave<T>(
  write: (value: T) => Promise<void>,
  { delayMs = saveDebounceMs }: { delayMs?: number } = {},
): DebouncedSave<T> {
  const [status, setStatus] = useState<SaveStatus>("idle");

  const writer = useMemo(
    () =>
      createDebouncedWriter<T>(
        async (value) => {
          try {
            await write(value);
            setStatus("saved");
          } catch {
            // The writer reports the failure to its own queue; the status is what
            // the editor shows, and it must not claim a save that did not happen.
            setStatus("error");
          }
        },
        { delayMs },
      ),
    [write, delayMs],
  );

  useEffect(() => {
    function flushWhenHidden() {
      if (document.visibilityState === "hidden") {
        void writer.flush();
      }
    }

    function flushNow() {
      void writer.flush();
    }

    document.addEventListener("visibilitychange", flushWhenHidden);
    window.addEventListener("pagehide", flushNow);

    return () => {
      document.removeEventListener("visibilitychange", flushWhenHidden);
      window.removeEventListener("pagehide", flushNow);
      // The cleanup runs on unmount, so an in-app navigation flushes too.
      void writer.flush();
    };
  }, [writer]);

  const save = useCallback(
    (value: T) => {
      setStatus("pending");
      writer.schedule(value);
    },
    [writer],
  );

  const flush = useCallback(() => writer.flush(), [writer]);

  return { save, flush, status };
}
