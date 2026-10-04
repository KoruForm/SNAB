"use client";
import Link from "next/link";
import { useEffect, useState } from "react";
import { deleteDraft, getPhotos, listDrafts } from "../lib/drafts/storage";
import { draftProgress, formatDay, type Draft, type DraftPhoto } from "../lib/drafts/types";
import DraftPhotoImage from "./draft-photo";
import { usePreferences } from "../lib/mock/use-catalogue";
type DraftCard = { draft: Draft; photos: DraftPhoto[] };
export default function MyDrafts() {
  const {prefs} = usePreferences();
  const [cards, setCards] = useState<DraftCard[] | null>(null);
  const [error, setError] = useState("");
  const [removeId, setRemoveId] = useState<string>();
  const [busy, setBusy] = useState(false);
  async function refresh() { const drafts = await listDrafts(); setCards(await Promise.all(drafts.map(async draft => ({ draft, photos: await getPhotos(draft.id) })))); }
  useEffect(() => {
    let cancelled = false;
    listDrafts().then(drafts => Promise.all(drafts.map(async draft => ({ draft, photos: await getPhotos(draft.id) })))).then(found => { if (!cancelled) setCards(found); }).catch(e => { if (!cancelled) setError(e.message || "Couldn’t open your drafts."); });
    return () => { cancelled = true; };
  }, []);
  async function remove() { if (!removeId) return; setBusy(true); try { await deleteDraft(removeId); setRemoveId(undefined); await refresh(); } catch (e) { setError(e instanceof Error ? e.message : "Couldn’t remove draft."); } finally { setBusy(false); } }
  return <section className="my-drafts"><p className="eyebrow">Your space</p><h1>My<br /><span className="highlight">Snab space.</span></h1><p className="workspace-lede">Keep going from where you left off.</p><div className="profile-card"><div className="profile-avatar">{prefs.name?.slice(0,1).toUpperCase() || "S"}</div><div><strong>{prefs.demoSignedIn ? `Hi, ${prefs.name}` : "Make yourself at home"}</strong><p>{prefs.demoSignedIn ? "Demo profile · this device" : "Try a profile with your own name."}</p><Link href="/account" className="small-link">{prefs.demoSignedIn ? "Edit profile →" : "Create demo profile →"}</Link></div></div><div className="section-heading"><h2>My sales</h2><Link className="small-link" href="/saved">Saved finds →</Link></div>{error && <p className="error-message form-message" role="alert">{error}</p>}{cards === null && !error && <p role="status">Loading your drafts…</p>}{cards?.length === 0 && <div className="empty-card"><h2>A little room for a new sale.</h2><p>Start with a date. Add photos when you’re ready.</p><Link href="/sell" className="button button-primary">Start a sale →</Link></div>}<div className="draft-list">{cards?.map(({ draft, photos }) => <article className="draft-card" key={draft.id}>{photos[0] && <DraftPhotoImage photo={photos[0]} className="draft-card-cover" />}<div className="draft-card-body"><span className="draft-badge">{draft.status === "draft" ? "Saved draft" : draft.status === "closed" ? "Sale closed" : "Published demo sale"}</span><h2>{draft.title || "Untitled garage sale"}</h2><p>{formatDay(draft.days[0])} · {draft.location.town || "Location to be added"}</p><p>{photos.length} photos · {draft.status === "draft" ? `${draftProgress(draft, photos.length)} of 5 setup steps ready` : "Sale-day tools ready"}</p><div className="draft-card-actions"><Link className="button button-primary" href={draft.status === "draft" ? `/sell/when?draft=${draft.id}` : `/manage/${draft.id}`}>{draft.status === "draft" ? "Continue" : "Manage sale"}</Link><Link className="button button-quiet" href={draft.status === "draft" ? `/sell/preview?draft=${draft.id}` : `/sale/${draft.id}`}>{draft.status === "draft" ? "Preview" : "Buyer view"}</Link><button className="text-button" onClick={() => setRemoveId(draft.id)}>Delete</button></div>{removeId === draft.id && <div className="delete-confirm" role="alert"><p>Delete this draft and its photos from this device? This cannot be undone.</p><button className="button button-danger" onClick={() => void remove()} disabled={busy}>{busy ? "Deleting…" : "Delete draft"}</button><button className="button button-quiet" onClick={() => setRemoveId(undefined)} disabled={busy}>Keep it</button></div>}</div></article>)}</div>{Boolean(cards?.length) && <Link href="/sell" className="button button-quiet full-width">＋ Start another sale</Link>}<p className="field-help">Your demo sales, photos and profile are saved in this browser.</p></section>;
}
