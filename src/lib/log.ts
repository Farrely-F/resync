/**
 * Structured logging for the server.
 *
 * One JSON object per line: warnings and errors on stderr, everything else on
 * stdout. That is the shape a log drain can index and a person can still read
 * through `| jq`, and it is the difference between an incident that takes a
 * minute and one that takes an hour — with prose the value you need was never
 * part of the format.
 *
 * Two things are never logged, and both are load-bearing:
 *
 *   - Credentials. A key in a log line is a key that has to be rotated.
 *   - The prompt. On every AI path in this app the prompt is the reader's resume
 *     text, and the product is built on that text staying in their browser. So
 *     callers pass counts and identifiers, never documents, and `redact` is the
 *     net for the times a caller forgets.
 *
 * A log line is not a place for a decision: nothing here changes control flow,
 * and no caller may depend on the return of `logEvent` (it has none).
 */

export const logLevels = ["debug", "info", "warn", "error"] as const;

export type LogLevel = (typeof logLevels)[number];

const levelRank: Record<LogLevel, number> = { debug: 10, info: 20, warn: 30, error: 40 };

/**
 * The longest a single string field keeps. A provider error body is worth
 * reading and rarely longer than this; a stack or a document that slipped
 * through is truncated rather than allowed to make one log line 200 KB.
 */
export const logValueLimit = 4_000;

const secretKeys = /(api[-_]?key|authorization|auth|bearer|token|secret|password|credential|cookie)/i;
const secretValues = /\b(sk-[A-Za-z0-9_-]{16,}|gsk_[A-Za-z0-9_-]{16,}|Bearer\s+[A-Za-z0-9._-]{16,})/g;

let threshold: LogLevel = logLevelFromEnv(process.env.LOG_LEVEL);

export function isLogLevel(value: unknown): value is LogLevel {
  return typeof value === "string" && (logLevels as readonly string[]).includes(value);
}

/** An unset or unrecognised level is `info`: quiet enough for production, loud
 *  enough to see failures without changing anything. */
export function logLevelFromEnv(value: string | undefined): LogLevel {
  const normalised = value?.trim().toLowerCase();
  return isLogLevel(normalised) ? normalised : "info";
}

/** Tests and scripts only: production picks the level up from `LOG_LEVEL`. */
export function setLogLevel(level: LogLevel): void {
  threshold = level;
}

export function currentLogLevel(): LogLevel {
  return threshold;
}

/** Correlates every line written while handling one request. */
export function newRequestId(): string {
  return globalThis.crypto.randomUUID();
}

export type LogFields = Record<string, unknown>;

/** Long values are cut and marked, so a reader knows the tail is missing. */
export function cut(value: string, limit = logValueLimit): string {
  return value.length <= limit ? value : `${value.slice(0, limit)}… [${value.length - limit} more characters]`;
}

/**
 * Removes credentials, bounds every string, and keeps the depth finite. Applied
 * to every field of every line, so a caller that passes a request object cannot
 * leak the key inside it.
 */
export function redact(value: unknown, depth = 0): unknown {
  if (typeof value === "string") {
    return cut(value.replace(secretValues, "[redacted]"));
  }

  if (value === null || value === undefined || typeof value !== "object") {
    return value;
  }

  if (depth >= 4) {
    return "[depth limit]";
  }

  // An Error's own properties are not enumerable, so it would otherwise log as {}.
  if (value instanceof Error) {
    return { name: value.name, message: cut(value.message) };
  }

  if (Array.isArray(value)) {
    return value.slice(0, 50).map((item) => redact(item, depth + 1));
  }

  const out: Record<string, unknown> = {};
  for (const [key, item] of Object.entries(value)) {
    out[key] = secretKeys.test(key) ? "[redacted]" : redact(item, depth + 1);
  }
  return out;
}

const reserved = new Set(["ts", "level", "event"]);

export function logEvent(level: LogLevel, event: string, fields: LogFields = {}): void {
  if (levelRank[level] < levelRank[threshold]) {
    return;
  }

  const record: Record<string, unknown> = { ts: new Date().toISOString(), level, event };
  for (const [key, value] of Object.entries(fields)) {
    if (!reserved.has(key)) {
      record[key] = redact(value);
    }
  }

  const line = `${JSON.stringify(record)}\n`;
  const sink = level === "warn" || level === "error" ? process.stderr : process.stdout;

  if (typeof sink?.write !== "function") {
    // Reached only if this module is pulled into a bundle without Node's streams.
    // Logging is not worth a crash, so the line still goes somewhere and the app
    // keeps working.
    console[level === "debug" ? "log" : level](line.trimEnd());
    return;
  }

  sink.write(line);
}
