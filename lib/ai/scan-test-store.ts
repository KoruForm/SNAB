// On-device store for the scan field test: photos taken at a sale wait here until each AI has answered and the
// tester has marked every item right or wrong. Nothing leaves the phone except the photo sent for scanning,
// and the results file the tester chooses to save.
import type { ScanResult, ScanSupplier } from "./scan-test-types";

export type ScanVerdict = "right" | "wrong";
export type ScanShot = {
  id: string;
  takenAt: string;
  photo: Blob;
  results: Partial<Record<ScanSupplier, ScanResult>>;
  errors: Partial<Record<ScanSupplier, string>>;
  // Keyed by `${supplier}:${itemIndex}`.
  verdicts: Record<string, ScanVerdict>;
  missed: string;
};

const DB_NAME = "snab-scan-test";
let dbPromise: Promise<IDBDatabase> | undefined;
function db(): Promise<IDBDatabase> {
  if (typeof indexedDB === "undefined") return Promise.reject(new Error("This browser can’t store photos. Try Chrome or Safari."));
  dbPromise ??= new Promise((resolve, reject) => {
    const request = indexedDB.open(DB_NAME, 1);
    request.onupgradeneeded = () => { request.result.createObjectStore("shots", { keyPath: "id" }); };
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => { dbPromise = undefined; reject(request.error); };
  });
  return dbPromise;
}

function run<T>(mode: IDBTransactionMode, work: (store: IDBObjectStore) => IDBRequest<T> | void): Promise<T | undefined> {
  return db().then(database => new Promise((resolve, reject) => {
    const tx = database.transaction("shots", mode);
    const request = work(tx.objectStore("shots"));
    tx.oncomplete = () => resolve(request ? request.result : undefined);
    tx.onerror = tx.onabort = () => reject(tx.error?.name === "QuotaExceededError" ? new Error("Phone storage is full. Save your results and clear some photos.") : tx.error);
  }));
}

export async function listShots(): Promise<ScanShot[]> {
  const shots = (await run<ScanShot[]>("readonly", store => store.getAll())) ?? [];
  return shots.sort((a, b) => a.takenAt.localeCompare(b.takenAt));
}
export async function saveShot(shot: ScanShot): Promise<void> { await run("readwrite", store => { store.put(shot); }); }
export async function deleteShot(id: string): Promise<void> { await run("readwrite", store => { store.delete(id); }); }
