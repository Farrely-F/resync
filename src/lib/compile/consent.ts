/**
 * Consent for the engine download.
 *
 * The first compile has to move 127.76 MB onto the device. On a phone that can
 * be a real cost, so it never happens implicitly: the panel asks, states the
 * measured size and warns about mobile data, and only a recorded decision lets
 * the download run. The decision is stored under a versioned key so a record
 * written by an older build (or a hand-edited value) is treated as no consent at
 * all rather than trusted.
 *
 * Cookies are not used: this is a client-only app with no server session, and
 * localStorage is the smallest store that survives a reload.
 */

export const consentStorageKey = "resync.tex-engine-consent.v1";

const consentVersion = 1;

export interface ConsentRecord {
  version: number;
  /** ISO timestamp of the decision. */
  grantedAt: string;
  /** The size the user agreed to, so a copy change is visible in the record. */
  bytes: number;
}

/** The two methods of `localStorage` this module needs, so a test can supply its own. */
export interface ConsentStore {
  getItem(key: string): string | null;
  setItem(key: string, value: string): void;
  removeItem(key: string): void;
}

function defaultStore(): ConsentStore | null {
  return typeof localStorage === "undefined" ? null : localStorage;
}

function parse(raw: string | null): ConsentRecord | null {
  if (!raw) {
    return null;
  }

  let value: unknown;
  try {
    value = JSON.parse(raw);
  } catch {
    return null;
  }

  if (typeof value !== "object" || value === null) {
    return null;
  }

  const record = value as Partial<ConsentRecord>;
  if (record.version !== consentVersion || typeof record.grantedAt !== "string" || typeof record.bytes !== "number") {
    return null;
  }

  return { version: consentVersion, grantedAt: record.grantedAt, bytes: record.bytes };
}

/** The recorded decision, or null when the download has not been agreed to. */
export function readConsent(store: ConsentStore | null = defaultStore()): ConsentRecord | null {
  return store ? parse(store.getItem(consentStorageKey)) : null;
}

/** Records consent for `bytes`. Returns the record that was written. */
export function grantConsent(
  store: ConsentStore | null,
  bytes: number,
  now: () => string = () => new Date().toISOString(),
): ConsentRecord {
  const record: ConsentRecord = { version: consentVersion, grantedAt: now(), bytes };
  store?.setItem(consentStorageKey, JSON.stringify(record));
  return record;
}

/** Withdraws consent. The next compile asks again. */
export function revokeConsent(store: ConsentStore | null = defaultStore()): void {
  store?.removeItem(consentStorageKey);
}
