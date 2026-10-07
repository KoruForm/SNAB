import { currentUserId, getSupabase } from "../supabase/client";
import * as local from "./local";
import * as remote from "./remote";
import type { Draft, DraftPatch, DraftPhoto } from "./types";

// Signed-in sellers keep drafts in their Supabase account; everyone else keeps them in this browser.
export { MAX_PHOTO_BYTES, MAX_PHOTOS } from "./limits";
async function account() {
  const supabase = getSupabase();
  const userId = supabase && await currentUserId();
  return supabase && userId ? { supabase, userId } : null;
}

export async function createDraft(): Promise<Draft> { const a = await account(); return a ? remote.createRemoteDraft(a.supabase, a.userId) : local.createDraft(); }
export async function getDraft(id: string): Promise<Draft | undefined> { const a = await account(); return a ? remote.getRemoteDraft(a.supabase, id) : local.getDraft(id); }
export async function listDrafts(): Promise<Draft[]> { const a = await account(); return a ? remote.listRemoteDrafts(a.supabase) : local.listDrafts(); }
export async function updateDraft(id: string, patch: DraftPatch): Promise<Draft> { const a = await account(); return a ? remote.updateRemoteDraft(a.supabase, id, patch) : local.updateDraft(id, patch); }
export async function getPhotos(draftId: string): Promise<DraftPhoto[]> { const a = await account(); return a ? remote.getRemotePhotos(a.supabase, draftId) : local.getPhotos(draftId); }
export async function addPhotos(draftId: string, files: File[]): Promise<void> { const a = await account(); return a ? remote.addRemotePhotos(a.supabase, a.userId, draftId, files) : local.addPhotos(draftId, files); }
export async function removePhoto(id: string): Promise<void> { const a = await account(); return a ? remote.removeRemotePhoto(a.supabase, id) : local.removePhoto(id); }
export async function deleteDraft(id: string): Promise<void> { const a = await account(); return a ? remote.deleteRemoteDraft(a.supabase, id) : local.deleteDraft(id); }

export async function signedIn(): Promise<boolean> { return Boolean(await account()); }

// Drafts made on this device before signing in stay here until the seller moves them. The ready-made demo sale stays behind.
export async function listDeviceDrafts(): Promise<Draft[]> { return (await account()) ? (await local.listDrafts()).filter(d => !d.readyMade) : []; }
export async function moveDeviceDraftToAccount(id: string): Promise<Draft> {
  const a = await account();
  if (!a) throw new Error("Sign in to move this sale to your account.");
  const draft = await local.getDraft(id);
  if (!draft) throw new Error("This draft no longer exists on this device.");
  if (draft.readyMade) throw new Error("The demo sale stays on this device. Start a new sale to list it for real.");
  const photos = await local.getPhotos(id);
  const created = await remote.createRemoteDraft(a.supabase, a.userId);
  try {
    const { title, description, days, location, categories, highlights, status, items, demoScan, eventCode, dayMode, abundance, details, partner } = draft;
    await remote.updateRemoteDraft(a.supabase, created.id, { title, description, days, location, categories, highlights, status, items, demoScan, eventCode, dayMode, abundance, details, partner });
    const files = photos.filter(p => p.blob).map(p => new File([p.blob!], p.name, { type: p.type }));
    if (files.length) await remote.addRemotePhotos(a.supabase, a.userId, created.id, files);
  } catch (error) {
    await remote.deleteRemoteDraft(a.supabase, created.id).catch(() => undefined);
    throw error;
  }
  await local.deleteDraft(id);
  return (await remote.getRemoteDraft(a.supabase, created.id)) ?? created;
}
