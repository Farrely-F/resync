import { openDB, type DBSchema, type IDBPDatabase } from "idb";

import { withSections } from "@/lib/resume/schema";
import type { JdRecord, ResumeRecord, StorageApi, StorageEstimate } from "@/lib/storage/types";

/**
 * IndexedDB-backed local storage.
 *
 * IndexedDB rather than localStorage because résumé data is structured, can exceed
 * the ~5 MB string-only localStorage budget, and every write here happens while
 * the user is on a phone: localStorage would block the main thread.
 */

const databaseName = "resync";
const databaseVersion = 1;

interface ResyncSchema extends DBSchema {
  resumes: { key: string; value: ResumeRecord };
  jds: { key: string; value: JdRecord };
}

type ResyncDatabase = IDBPDatabase<ResyncSchema>;

function upgrade(database: IDBPDatabase<ResyncSchema>) {
  if (!database.objectStoreNames.contains("resumes")) {
    database.createObjectStore("resumes", { keyPath: "id" });
  }
  if (!database.objectStoreNames.contains("jds")) {
    database.createObjectStore("jds", { keyPath: "id" });
  }
}

/** Newest first: the library shows recent work without a second pass. */
function byUpdatedAtDesc<T extends { updatedAt: string }>(records: T[]): T[] {
  return [...records].sort((a, b) => b.updatedAt.localeCompare(a.updatedAt));
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
      return byUpdatedAtDesc(records.map(repairResume));
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
      return byUpdatedAtDesc(await (await database()).getAll("jds"));
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
