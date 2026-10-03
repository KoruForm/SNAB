"use client";
import Image from "next/image";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { useEffect, useState, type FormEvent } from "react";
import { addPhotos, createDraft, getDraft, getPhotos, MAX_PHOTOS, removePhoto, updateDraft } from "../lib/drafts/storage";
import { CATEGORIES, formatDay, localDateKey, publicAddress, validateDays, type Category, type Draft, type DraftPhoto, type SaleDay } from "../lib/drafts/types";
import DraftPhotoImage from "./draft-photo";

const stages = ["when", "where", "photos", "review", "preview"];
const stageNames = ["When", "Where", "Photos", "Highlights", "Preview"];
export type WizardStep = "start" | "when" | "where" | "photos" | "review" | "preview";
function errorText(error: unknown) { return error instanceof Error ? error.message : "Something went wrong. Please try again."; }
export default function SellerWizard({ step }: { step: WizardStep }) {
  const router = useRouter();
  const search = useSearchParams();
  const id = search.get("draft");
  const [draft, setDraft] = useState<Draft>();
  const [photos, setPhotos] = useState<DraftPhoto[]>([]);
  const [days, setDays] = useState<SaleDay[]>([]);
  const [location, setLocation] = useState<Draft["location"]>({ address: "", town: "", reveal: "sale-day" });
  const [categories, setCategories] = useState<Category[]>([]);
  const [highlights, setHighlights] = useState("");
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  const [busy, setBusy] = useState(false);
  const [saved, setSaved] = useState(false);
  const [showExactAddress, setShowExactAddress] = useState(false);

  useEffect(() => {
    if (!id || step === "start") return;
    let cancelled = false;
    Promise.all([getDraft(id), getPhotos(id)]).then(([found, storedPhotos]) => {
      if (cancelled) return;
      if (!found) { setError("This draft couldn’t be found on this device."); return; }
      setDraft(found); setPhotos(storedPhotos); setDays(found.days); setLocation(found.location); setCategories(found.categories); setHighlights(found.highlights.join("\n")); setTitle(found.title); setDescription(found.description);
    }).catch(e => { if (!cancelled) setError(errorText(e)); });
    return () => { cancelled = true; };
  }, [id, step]);

  function href(next: string) { return `/sell/${next}?draft=${id}`; }
  async function start() {
    setBusy(true); setError("");
    try { const created = await createDraft(); router.push(`/sell/when?draft=${created.id}`); }
    catch (e) { setError(errorText(e)); setBusy(false); }
  }
  async function save(patch: Parameters<typeof updateDraft>[1], next?: string) {
    if (!id) return;
    setBusy(true); setError(""); setNotice("");
    try { const updated = await updateDraft(id, patch); setDraft(updated); if (next) router.push(href(next)); else { setSaved(true); setNotice("Listing saved on this device."); } }
    catch (e) { setError(errorText(e)); }
    finally { setBusy(false); }
  }
  function saveDays(event: FormEvent) { event.preventDefault(); const problem = validateDays(days); if (problem) { setError(problem); return; } void save({ days: [...days].sort((a, b) => a.date.localeCompare(b.date)) }, "where"); }
  function saveLocation(event: FormEvent) { event.preventDefault(); if (!location.address.trim() || !location.town.trim()) { setError("Add your street address and town or suburb."); return; } void save({ location: { ...location, address: location.address.trim(), town: location.town.trim() } }, "photos"); }
  async function choosePhotos(files: FileList | null) {
    if (!files || !id) return;
    setBusy(true); setError(""); setNotice("");
    try { await addPhotos(id, Array.from(files)); setPhotos(await getPhotos(id)); setNotice("Photos saved with this draft on your device."); }
    catch (e) { setError(errorText(e)); }
    finally { setBusy(false); }
  }
  async function remove(photoId: string) {
    if (!id) return;
    setBusy(true); setError("");
    try { await removePhoto(photoId); setPhotos(await getPhotos(id)); }
    catch (e) { setError(errorText(e)); }
    finally { setBusy(false); }
  }
  function saveReview(event: FormEvent) { event.preventDefault(); const items = highlights.split("\n").map(s => s.trim()).filter(Boolean); if (items.length > 15 || items.some(s => s.length > 80)) { setError("Use up to 15 highlights, with no more than 80 characters each."); return; } void save({ categories, highlights: [...new Set(items)] }, "preview"); }
  function saveListing(event: FormEvent) { event.preventDefault(); if (!title.trim()) { setError("Give your sale a title before saving the listing."); return; } void save({ title: title.trim(), description: description.trim() }); }

  const messages = <>{error && <p className="form-message error-message" role="alert">{error}</p>}{notice && <p className="form-message success-message" role="status">{notice}</p>}</>;
  if (step === "start") return <div className="start-sale"><p className="eyebrow">Garage Sales Made Easy</p><h1>Clear some<br /><span className="highlight">stuff?</span></h1><p className="workspace-lede">Turn what you’ve got into a garage sale worth Snabbing.</p><div className="start-illustration"><Image src="/brand/categories/furniture.svg" alt="Armchair" width={130} height={130} /><Image src="/brand/categories/garden.svg" alt="Plant" width={85} height={85} /><Image src="/brand/categories/books.svg" alt="Books" width={100} height={100} /></div><button className="button button-primary full-width" onClick={start} disabled={busy}>{busy ? "Starting…" : "Start a sale"}<span aria-hidden="true">→</span></button>{messages}<Link href="/me" className="text-link">Continue an existing draft</Link><div className="local-note"><strong>Your draft, on this device.</strong><p>Dates, address and photos are saved in this browser. No account needed for this test. Clearing browser data removes drafts; they won’t sync to another device yet.</p></div><div className="future-feature"><strong>Joining a community sale?</strong><p>Event codes are coming when we connect sale publishing.</p></div></div>;
  if (!id) return <div className="empty-state"><h1>Start with a draft.</h1><p>Create a sale or choose one from your drafts.</p><Link href="/sell" className="button button-primary">Start a sale</Link><Link href="/me" className="text-link">My drafts</Link></div>;
  if (!draft) return <div className="empty-state">{error ? <><h1>Draft unavailable.</h1>{messages}<Link href="/me" className="button button-primary">Back to my drafts</Link></> : <p role="status">Opening your draft…</p>}</div>;
  const index = stages.indexOf(step);
  return <div className="wizard"><div className="wizard-heading"><Link href={index > 0 ? href(stages[index - 1]) : "/me"} className="back-link">← {index > 0 ? "Back" : "My drafts"}</Link><span>Step {index + 1} of 5</span></div><ol className="step-rail" aria-label="Sale setup progress">{stageNames.map((name, i) => <li key={name} className={i === index ? "current" : ""} aria-current={i === index ? "step" : undefined}><span>{i + 1}</span>{name}</li>)}</ol>
    {step === "when" && <form onSubmit={saveDays}><p className="eyebrow">When?</p><h1>When are<br />you selling?</h1><p className="workspace-lede">Add your sale days and opening times. All times are New Zealand local time.</p><div className="form-stack">{days.map((day, i) => <fieldset className="day-card" key={i}><legend>Sale day {i + 1}</legend><label>Date<input type="date" value={day.date} min={localDateKey(new Date())} required onChange={e => setDays(days.map((d, n) => n === i ? { ...d, date: e.target.value } : d))} /></label><div className="field-pair"><label>Starts<input type="time" value={day.starts} required onChange={e => setDays(days.map((d, n) => n === i ? { ...d, starts: e.target.value } : d))} /></label><label>Finishes<input type="time" value={day.finishes} required onChange={e => setDays(days.map((d, n) => n === i ? { ...d, finishes: e.target.value } : d))} /></label></div>{days.length > 1 && <button type="button" className="text-button" onClick={() => setDays(days.filter((_, n) => n !== i))}>Remove this day</button>}</fieldset>)}<button className="button button-quiet" type="button" onClick={() => setDays([...days, { date: "", starts: "08:00", finishes: "13:00" }])}>＋ Add another day</button></div>{messages}<button className="button button-primary full-width continue-button" disabled={busy}>{busy ? "Saving…" : "Save and continue"}<span aria-hidden="true">→</span></button></form>}
    {step === "where" && <form onSubmit={saveLocation}><p className="eyebrow">Where?</p><h1>Where’s<br />the sale?</h1><p className="workspace-lede">Set the location and choose when buyers can see your address.</p><div className="form-stack"><label>Street address<input autoComplete="street-address" value={location.address} maxLength={200} required placeholder="Street number and name" onChange={e => setLocation({ ...location, address: e.target.value })} /></label><label>Town or suburb<input autoComplete="address-level2" value={location.town} maxLength={100} required placeholder="e.g. Hamilton East" onChange={e => setLocation({ ...location, town: e.target.value })} /></label><p className="field-help">Address lookup and map positioning aren’t connected yet. This address stays in your local draft.</p><fieldset className="privacy-options"><legend>Who can see your address?</legend>{[{ value: "sale-day", title: "Reveal on sale day", text: "Recommended. Only your town or suburb appears before the sale." }, { value: "now", title: "Show the address when published", text: "Buyers can see the exact address as soon as the listing is live." }, { value: "area-only", title: "Approximate area only", text: "Keep the street address hidden in the public listing." }].map(option => <label className="radio-card" key={option.value}><input type="radio" name="reveal" value={option.value} checked={location.reveal === option.value} onChange={() => setLocation({ ...location, reveal: option.value as Draft["location"]["reveal"] })} /><span><strong>{option.title}</strong><small>{option.text}</small></span></label>)}</fieldset></div>{messages}<button className="button button-primary full-width continue-button" disabled={busy}>{busy ? "Saving…" : "Save and continue"}<span aria-hidden="true">→</span></button></form>}
    {step === "photos" && <section><p className="eyebrow">Show your stuff</p><h1>A few<br /><span className="highlight">wide shots.</span></h1><p className="workspace-lede">Take photos of tables, shelves, boxes and piles. No need to photograph every item separately.</p><div className="photo-actions"><label className={`photo-picker ${busy ? "disabled-picker" : ""}`}><input type="file" accept="image/*" capture="environment" disabled={busy} onChange={e => { void choosePhotos(e.currentTarget.files); e.currentTarget.value = ""; }} /><span aria-hidden="true">◎</span><strong>Take a photo</strong></label><label className={`photo-picker ${busy ? "disabled-picker" : ""}`}><input type="file" accept="image/*" multiple disabled={busy} onChange={e => { void choosePhotos(e.currentTarget.files); e.currentTarget.value = ""; }} /><span aria-hidden="true">＋</span><strong>Choose photos</strong></label></div><div className="photo-summary"><strong>{photos.length} {photos.length === 1 ? "photo" : "photos"} saved</strong><span>Up to {MAX_PHOTOS} · 20 MB each</span></div>{photos.length > 0 && <div className="draft-photo-grid">{photos.map((photo, i) => <figure key={photo.id}><DraftPhotoImage photo={photo} /><figcaption><span>Photo {i + 1}</span><button type="button" disabled={busy} onClick={() => void remove(photo.id)} aria-label={`Remove photo ${i + 1}`}>×</button></figcaption></figure>)}</div>}{messages}<p className="local-note compact-note">Photos are stored in this browser with your draft. They haven’t been uploaded or sent to AI.</p><Link href={href("review")} aria-disabled={busy} onClick={e => { if (busy) e.preventDefault(); }} className="button button-primary full-width continue-button">{photos.length ? "I’m done · review the highlights" : "Continue without photos"}<span aria-hidden="true">→</span></Link></section>}
    {step === "review" && <form onSubmit={saveReview}><p className="eyebrow">Your highlights</p><h1>What’s worth<br /><span className="highlight">a Snab?</span></h1><p className="workspace-lede">Choose the kinds of things you’re selling and add a few highlights.</p><div className="local-note compact-note"><strong>Manual review for now.</strong> AI scanning isn’t connected. These are your own selections; no items have been detected from your photos.</div><fieldset className="category-picker"><legend>What’s at your sale?</legend>{CATEGORIES.map(category => <label key={category} className={categories.includes(category) ? "selected" : ""}><input type="checkbox" checked={categories.includes(category)} onChange={e => setCategories(e.target.checked ? [...categories, category] : categories.filter(c => c !== category))} />{category !== "Other" && <Image src={`/brand/categories/${category.toLowerCase()}.svg`} alt="" width={35} height={35} />}<span>{category}</span></label>)}</fieldset><label className="highlight-field">Notable finds <span className="optional-label">optional</span><textarea rows={5} value={highlights} maxLength={1214} onChange={e => setHighlights(e.target.value)} placeholder={"Cordless drill\nBookshelf\nOld computer parts"} /><small>One per line, up to 15. You don’t need to list everything.</small></label>{messages}<button className="button button-primary full-width continue-button" disabled={busy}>{busy ? "Saving…" : "Save and preview"}<span aria-hidden="true">→</span></button></form>}
    {step === "preview" && <section><p className="eyebrow">Your listing</p><h1>Almost<br /><span className="highlight">Snab-ready.</span></h1><form className="listing-editor" onSubmit={saveListing}><label>Sale title<input value={title} onChange={e => { setTitle(e.target.value); setSaved(false); }} required maxLength={100} placeholder="e.g. Saturday Garage Clearout" /></label><label>Tell buyers a little more <span className="optional-label">optional</span><textarea rows={4} maxLength={2000} value={description} placeholder="What’s there? Any tips for visiting?" onChange={e => { setDescription(e.target.value); setSaved(false); }} /></label><button className="button button-primary full-width" disabled={busy}>{busy ? "Saving…" : saved ? "Saved on this device ✓" : "Save listing"}</button></form>{messages}<div className="buyer-preview-heading"><h2>Preview as a buyer</h2><span>Local preview</span></div><article className="sale-preview-card">{photos[0] ? <DraftPhotoImage photo={photos[0]} className="sale-cover" /> : <div className="sale-cover empty-cover"><Image src="/brand/categories/furniture.svg" alt="" width={75} height={75} /><span>Add a photo to show your sale</span></div>}<div className="sale-preview-body"><h2>{title || "Your garage sale"}</h2><span className="draft-badge">Draft · not published</span><ul className="sale-days-list">{draft.days.map((day, i) => <li key={i}><strong>{formatDay(day)}</strong><span>{day.starts}–{day.finishes}</span></li>)}</ul><p className="public-location">{publicAddress(draft)}</p><div className="category-chips">{draft.categories.map(c => <span key={c}>{c}</span>)}</div>{description && <p className="sale-description">{description}</p>}{draft.highlights.length > 0 && <><h3>Worth a look</h3><ul className="highlights-list">{draft.highlights.map(h => <li key={h}>{h}</li>)}</ul></>}</div></article><div className="publish-note"><strong>Saved draft. Publishing is next.</strong><p>Accounts and cloud storage need to be connected before this can appear publicly. Your address privacy choice will then be enforced on the server.</p><button className="button button-primary full-width" disabled>Public publishing isn’t connected yet</button></div><details className="private-summary" onToggle={e => setShowExactAddress(e.currentTarget.open)}><summary>Your private location settings</summary>{showExactAddress && <p>{draft.location.address}, {draft.location.town}<br />Visibility: {draft.location.reveal === "sale-day" ? "reveal on sale day" : draft.location.reveal === "now" ? "show when published" : "area only"}</p>}</details><Link href="/me" className="text-link">Back to my drafts</Link></section>}
  </div>;
}
