import { openDB, type DBSchema, type IDBPDatabase } from "idb";

import type { DocumentRecord } from "@/lib/documents/types";
import type { MatchReport } from "@/lib/match/types";
import { withSections } from "@/lib/resume/schema";
import type { JdRecord, ResumeRecord, StorageApi, StorageEstimate } from "@/lib/storage/types";

/**
 * IndexedDB-backed local storage.
 *
 * IndexedDB rather than localStorage because résumé data is structured, can exceed
 * the ~5 MB string-only localStorage budget, and every write here happens while
 * the user is on a phone: localStorage would block the main thread.
 *
 * Version history:
 *   1 — resumes, job descriptions
 *   2 — match reports, indexed by input identity so repeat analyses are free
 *   3 — documents written from a report (cover letter, outreach, interview prep)
 */

const databaseName = "resync";
const databaseVersion = 3;

interface ResyncSchema extends DBSchema {
  resumes: { key: string; value: ResumeRecord };
  jds: { key: string; value: JdRecord };
  reports: { key: string; value: MatchReport; indexes: { "by-input-hash": string } };
  documents: { key: string; value: DocumentRecord; indexes: { "by-report": string } };
}

type ResyncDatabase = IDBPDatabase<ResyncSchema>;

function upgrade(database: IDBPDatabase<ResyncSchema>) {
  if (!database.objectStoreNames.contains("resumes")) {
    database.createObjectStore("resumes", { keyPath: "id" });
  }
  if (!database.objectStoreNames.contains("jds")) {
    database.createObjectStore("jds", { keyPath: "id" });
  }
  if (!database.objectStoreNames.contains("reports")) {
    const reports = database.createObjectStore("reports", { keyPath: "id" });
    reports.createIndex("by-input-hash", "inputHash");
  }
  if (!database.objectStoreNames.contains("documents")) {
    const documents = database.createObjectStore("documents", { keyPath: "id" });
    documents.createIndex("by-report", "reportId");
  }
}

/** Newest first: lists show recent work without a second pass. */
function byTimestampDesc<T>(records: T[], key: keyof T & string): T[] {
  return [...records].sort((a, b) => String(b[key]).localeCompare(String(a[key])));
}

/**
 * Repairs a stored record on read. Resumes parsed by an older build may lack
 * section configuration or carry section ids this build does not render.
 */
function repairResume(record: ResumeRecord): ResumeRecord {
  return { ...record, resume: withSections(record.resume) };
}

/**
 * How long a version upgrade waits for another tab to step aside.
 *
 * An upgrade cannot start while another tab holds the previous version open, and
 * the browser says nothing about how long that will be. Unbounded, that is a page
 * that loads forever with nothing on it — which is what a version bump looks like
 * to anyone with the app open in two tabs. Ten seconds is long enough for a tab
 * to close itself, and short enough that the reader gets an answer.
 */
const upgradeWaitMs = 10_000;

export const upgradeBlockedMessage =
  "Another tab of resync is open with an older version of the app, and this browser will not upgrade the database while it is. Close the other tab and reload this page; nothing stored here has been changed.";

export function createStorage(options: { name?: string } = {}): StorageApi {
  const name = options.name ?? databaseName;

  let connection: Promise<ResyncDatabase> | null = null;
  /**
   * Set when this tab was the one holding the old version open. Its connection is
   * closed so the newer tab can upgrade, and every later call reports that this
   * tab is out of date rather than serving reads from a closed database.
   */
  let superseded = false;

  const open = () =>
    new Promise<ResyncDatabase>((resolve, reject) => {
      let settled = false;
      const timer = setTimeout(() => {
        if (!settled) {
          settled = true;
          reject(new Error(upgradeBlockedMessage));
        }
      }, upgradeWaitMs);

      openDB<ResyncSchema>(name, databaseVersion, {
        upgrade,
        // Fired in the tab holding the older version: it steps aside, because the
        // newer schema is about to exist whether or not this tab agrees.
        blocking: (_currentVersion, _blockedVersion, event) => {
          superseded = true;
          const database_ = event.target as IDBDatabase | null;
          database_?.close();
        },
      }).then(
        (database_) => {
          if (!settled) {
            settled = true;
            clearTimeout(timer);
            resolve(database_);
          }
        },
        (error: unknown) => {
          if (!settled) {
            settled = true;
            clearTimeout(timer);
            reject(error instanceof Error ? error : new Error(String(error)));
          }
        },
      );
    });

  const database = () => {
    if (superseded) {
      return Promise.reject(new Error("This tab is running an older version of resync. Reload the page to continue."));
    }

    return (connection ??= open().catch((error: unknown) => {
      // A failed open must not be cached, or every later call inherits the failure.
      connection = null;
      throw error;
    }));
  };

  return {
    async listResumes() {
      const records = await (await database()).getAll("resumes");
      return byTimestampDesc(records.map(repairResume), "updatedAt");
    },

    async getResume(id) {
      const record = await (await database()).get("resumes", id);
      return record ? repairResume(record) : null;
    },

    async putResume(record) {
      await (await database()).put("resumes", record);
    },

    async deleteResume(id) {
      await (await database()).delete("resumes", id);
    },

    async listJds() {
      return byTimestampDesc(await (await database()).getAll("jds"), "updatedAt");
    },

    async getJd(id) {
      return (await (await database()).get("jds", id)) ?? null;
    },

    async putJd(record) {
      await (await database()).put("jds", record);
    },

    async deleteJd(id) {
      await (await database()).delete("jds", id);
    },

    async listReports() {
      return byTimestampDesc(await (await database()).getAll("reports"), "createdAt");
    },

    async getReport(id) {
      return (await (await database()).get("reports", id)) ?? null;
    },

    async putReport(report) {
      await (await database()).put("reports", report);
    },

    async deleteReport(id) {
      await (await database()).delete("reports", id);
    },

    async findReportByInputHash(inputHash) {
      const matches = await (await database()).getAllFromIndex("reports", "by-input-hash", inputHash);
      return byTimestampDesc(matches, "createdAt")[0] ?? null;
    },

    async listDocuments() {
      return byTimestampDesc(await (await database()).getAll("documents"), "updatedAt");
    },

    async getDocument(id) {
      return (await (await database()).get("documents", id)) ?? null;
    },

    async putDocument(record) {
      await (await database()).put("documents", record);
    },

    async deleteDocument(id) {
      await (await database()).delete("documents", id);
    },

    async deleteDocumentsForReport(reportId) {
      const database_ = await database();
      const keys = await database_.getAllKeysFromIndex("documents", "by-report", reportId);

      await Promise.all(keys.map((key) => database_.delete("documents", key)));
    },

    async estimate(): Promise<StorageEstimate> {
      // Browsers report usage across the whole origin, which includes the cached
      // TeX engine assets; callers must present that accordingly.
      const estimate = await navigator.storage?.estimate?.();
      if (!estimate) {
        return { supported: false, usageBytes: 0, quotaBytes: null };
      }

      return {
        supported: true,
        usageBytes: estimate.usage ?? 0,
        quotaBytes: estimate.quota ?? null,
      };
    },

    async clearUserData() {
      if (connection) {
        (await connection).close();
        connection = null;
      }

      await new Promise<void>((resolve, reject) => {
        const request = indexedDB.deleteDatabase(name);
        request.onsuccess = () => resolve();
        request.onerror = () => reject(request.error ?? new Error("Failed to delete database"));
        request.onblocked = () => reject(new Error("Another tab is still using the database"));
      });
    },
  };
}

let defaultStorage: StorageApi | null = null;

export function getStorage(): StorageApi {
  defaultStorage ??= createStorage();
  return defaultStorage;
}
