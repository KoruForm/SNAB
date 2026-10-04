import { blankDraft, type Draft, type DraftPhoto } from "./types";

const DB_NAME = "snab-local-drafts";
export const MAX_PHOTOS = 40;
export const MAX_PHOTO_BYTES = 20 * 1024 * 1024;
let dbPromise: Promise<IDBDatabase> | undefined;
function db(): Promise<IDBDatabase> {
  if (typeof indexedDB === "undefined") return Promise.reject(new Error("This browser doesn’t support draft storage. Try a current browser with storage enabled."));
  if (!dbPromise) {
    dbPromise = new Promise((resolve, reject) => {
      const request = indexedDB.open(DB_NAME, 1);
      request.onupgradeneeded = () => {
        request.result.createObjectStore("drafts", { keyPath: "id" });
        const photos = request.result.createObjectStore("photos", { keyPath: "id" });
        photos.createIndex("draftId", "draftId");
      };
      request.onsuccess = () => {
        request.result.onversionchange = () => { request.result.close(); dbPromise = undefined; };
        resolve(request.result);
      };
      request.onerror = () => { dbPromise = undefined; reject(request.error); };
      request.onblocked = () => { dbPromise = undefined; reject(new Error("Close other SNAB tabs and try again.")); };
    });
  }
  return dbPromise;
}
function fail(tx: IDBTransaction): Error {
  if (tx.error?.name === "QuotaExceededError") return new Error("Your browser storage is full. Remove a few photos or choose smaller images and try again.");
  return tx.error || new Error("Couldn’t save this draft. Check that browser storage is enabled and try again.");
}

export async function createDraft(): Promise<Draft> {
  const draft = blankDraft(crypto.randomUUID());
  const database = await db();
  await new Promise<void>((resolve, reject) => {
    const tx = database.transaction("drafts", "readwrite");
    tx.objectStore("drafts").add(draft);
    tx.oncomplete = () => resolve(); tx.onerror = tx.onabort = () => reject(fail(tx));
  });
  return draft;
}
export async function getDraft(id: string): Promise<Draft | undefined> {
  const database = await db();
  return new Promise((resolve, reject) => {
    const request = database.transaction("drafts").objectStore("drafts").get(id);
    request.onsuccess = () => resolve(request.result); request.onerror = () => reject(request.error);
  });
}
export async function listDrafts(): Promise<Draft[]> {
  const database = await db();
  return new Promise((resolve, reject) => {
    const request = database.transaction("drafts").objectStore("drafts").getAll();
    request.onsuccess = () => resolve((request.result as Draft[]).sort((a, b) => b.updatedAt.localeCompare(a.updatedAt)));
    request.onerror = () => reject(request.error);
  });
}
export async function updateDraft(id: string, patch: Partial<Pick<Draft, "title" | "description" | "days" | "location" | "categories" | "highlights" | "status" | "items" | "demoScan" | "eventCode" | "dayMode" | "abundance">>): Promise<Draft> {
  const database = await db();
  return new Promise((resolve, reject) => {
    const tx = database.transaction("drafts", "readwrite");
    const store = tx.objectStore("drafts");
    let result: Draft;
    const request = store.get(id);
    request.onsuccess = () => {
      if (!request.result) { tx.abort(); return; }
      result = { ...request.result, ...patch, updatedAt: new Date().toISOString() };
      store.put(result);
    };
    tx.oncomplete = () => resolve(result); tx.onerror = tx.onabort = () => reject(fail(tx));
  });
}
export async function getPhotos(draftId: string): Promise<DraftPhoto[]> {
  const database = await db();
  return new Promise((resolve, reject) => {
    const request = database.transaction("photos").objectStore("photos").index("draftId").getAll(draftId);
    request.onsuccess = () => resolve((request.result as DraftPhoto[]).sort((a, b) => a.createdAt.localeCompare(b.createdAt) || a.id.localeCompare(b.id)));
    request.onerror = () => reject(request.error);
  });
}
export async function addPhotos(draftId: string, files: File[]): Promise<void> {
  const database = await db();
  const valid = files.filter(f => f.type.startsWith("image/"));
  if (!valid.length) throw new Error("Choose image files to add to your sale.");
  if (valid.some(f => f.size > MAX_PHOTO_BYTES)) throw new Error("Each photo needs to be smaller than 20 MB. Choose a smaller version and try again.");
  await new Promise<void>((resolve, reject) => {
    const tx = database.transaction(["drafts", "photos"], "readwrite");
    const draftStore = tx.objectStore("drafts");
    const photoStore = tx.objectStore("photos");
    let error: Error | undefined;
    const draft = draftStore.get(draftId);
    draft.onsuccess = () => {
      if (!draft.result) { error = new Error("This draft no longer exists."); tx.abort(); return; }
      const count = photoStore.index("draftId").count(draftId);
      count.onsuccess = () => {
        if (count.result + valid.length > MAX_PHOTOS) { error = new Error(`Keep each draft to ${MAX_PHOTOS} photos for this early build.`); tx.abort(); return; }
        const now = new Date().toISOString();
        valid.forEach((file, index) => photoStore.add({ id: crypto.randomUUID(), draftId, name: file.name, type: file.type, blob: file, createdAt: new Date(Date.now() + index).toISOString() } satisfies DraftPhoto));
        draftStore.put({ ...draft.result, updatedAt: now });
      };
    };
    tx.oncomplete = () => resolve(); tx.onerror = tx.onabort = () => reject(error || fail(tx));
  });
}
export async function removePhoto(id: string): Promise<void> {
  const database = await db();
  return new Promise((resolve, reject) => {
    const tx = database.transaction("photos", "readwrite"); tx.objectStore("photos").delete(id);
    tx.oncomplete = () => resolve(); tx.onerror = tx.onabort = () => reject(fail(tx));
  });
}
export async function deleteDraft(id: string): Promise<void> {
  const database = await db();
  return new Promise((resolve, reject) => {
    const tx = database.transaction(["drafts", "photos"], "readwrite");
    tx.objectStore("drafts").delete(id);
    const photoStore = tx.objectStore("photos");
    const cursor = photoStore.index("draftId").openCursor(IDBKeyRange.only(id));
    cursor.onsuccess = () => { if (cursor.result) { photoStore.delete(cursor.result.primaryKey); cursor.result.continue(); } };
    tx.oncomplete = () => resolve(); tx.onerror = tx.onabort = () => reject(fail(tx));
  });
}
