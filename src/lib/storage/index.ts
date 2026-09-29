import { openDB, type DBSchema, type IDBPDatabase } from "idb";

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
 */

const databaseName = "resync";
const databaseVersion = 2;

interface ResyncSchema extends DBSchema {
  resumes: { key: string; value: ResumeRecord };
  jds: { key: string; value: JdRecord };
  reports: { key: string; value: MatchReport; indexes: { "by-input-hash": string } };
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

export function createStorage(options: { name?: string } = {}): StorageApi {
  const name = options.name ?? databaseName;

  let connection: Promise<ResyncDatabase> | null = null;

  const database = () =>
    (connection ??= openDB<ResyncSchema>(name, databaseVersion, {
      upgrade,
    }));

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
