"use client";
import Image from "next/image";
import Link from "next/link";
import { SnapPhoto } from "./snap-photo";
import { useRouter, useSearchParams } from "next/navigation";
import { useCallback, useEffect, useState, type FormEvent } from "react";
import { addPhotos, createDraft, getDraft, getPhotos, MAX_PHOTOS, removePhoto, updateDraft } from "../lib/drafts/storage";
import { CATEGORIES, formatDay, localDateKey, MAX_SALE_DAYS, publicAddress, TITLE_MAX, validateDays, type Category, type Draft, type DraftPhoto, type MockItem, type SaleDay } from "../lib/drafts/types";
import DraftPhotoImage from "./draft-photo";
import { createDemoDraft, publishDemo } from "../lib/mock/actions";
import { CategoryArt } from "./buyer-ui";
import { AddressSearch } from "./address-search";
import { LocationPicker } from "./sale-map";
import { useAccount } from "../lib/supabase/use-account";
import { CodeSignIn } from "./code-sign-in";
import { DemandChips, DemandMatches, PlannedDatesPicker, readExtras, SaleExtrasFields } from "./seller-helpers";
import { PriceGuide } from "./seller-tools";
import { cleanDetails, clock } from "../lib/sale-details";
import { rememberedPartner } from "../lib/partners";
import "../app/(workspace)/seller-redesign.css";

const stages = ["when", "where", "photos", "review", "preview"];
const stageNames = ["When", "Where", "Photos", "Highlights", "Preview"];
const stageGroups = ["Details", "Photos & highlights", "Preview"];
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
  const [items, setItems] = useState<MockItem[]>([]);
  const [eventCode, setEventCode] = useState(search.get("event") || "");
  const [mapUnavailable, setMapUnavailable] = useState(false);
  const noMap = useCallback(() => setMapUnavailable(true), []);
  const { userId, configured: accounts, loading: accountLoading } = useAccount();
  const savedWhere = userId ? "in your account" : "on this device";

  useEffect(() => {
    if (!id || step === "start") return;
    let cancelled = false;
    Promise.all([getDraft(id), getPhotos(id)]).then(([found, storedPhotos]) => {
      if (cancelled) return;
      if (!found) { setError(`This draft couldn’t be found ${userId ? "in your account" : "on this device"}.`); return; }
      setDraft(found); setPhotos(storedPhotos); setDays(found.days); setLocation(found.location); setCategories(found.categories); setItems(found.items || []); setHighlights(found.highlights.filter(h => !found.items?.some(i => i.label === h)).join("\n")); setTitle(found.title); setDescription(found.description);
    }).catch(e => { if (!cancelled) setError(errorText(e)); });
    return () => { cancelled = true; };
  }, [id, step, userId]);

  function href(next: string) { return `/sell/${next}?draft=${id}`; }
  async function start(demo = false) {
    setBusy(true); setError("");
    try { if (eventCode && eventCode.toUpperCase().trim() !== "HAMILTON") throw new Error("Try the demo community code HAMILTON."); const code = eventCode.toUpperCase().trim() || undefined; const created = demo ? await createDemoDraft(code) : await createDraft(); const partner = demo ? undefined : rememberedPartner(); if (!demo && (code || partner)) await updateDraft(created.id, { eventCode: code, partner }); router.push(`/sell/${demo ? "preview" : "when"}?draft=${created.id}`); }
    catch (e) { setError(errorText(e)); setBusy(false); }
  }
  async function save(patch: Parameters<typeof updateDraft>[1], next?: string) {
    if (!id) return;
    setBusy(true); setError(""); setNotice("");
    try { const updated = await updateDraft(id, patch); setDraft(updated); if (next) router.push(href(next)); else { setSaved(true); setNotice(`Listing saved ${savedWhere}.`); } }
    catch (e) { setError(errorText(e)); }
    finally { setBusy(false); }
  }
  function saveDays(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const data = new FormData(event.currentTarget);
    const submittedDays = days.map((_, i) => ({ date: String(data.get(`date-${i}`) || ""), starts: String(data.get(`starts-${i}`) || ""), finishes: String(data.get(`finishes-${i}`) || "") }));
    const problem = validateDays(submittedDays);
    if (problem) { setError(problem); return; }
    void save({ days: submittedDays.sort((a, b) => a.date.localeCompare(b.date)) }, "where");
  }
  function saveLocation(event: FormEvent<HTMLFormElement>) {
    event.preventDefault(); const data = new FormData(event.currentTarget);
    const address = String(data.get("address") || "").trim(); const town = String(data.get("town") || "").trim();
    if (!address || !town) { setError("Add your street address and town or suburb."); return; }
    const pinned = typeof location.latitude === "number" && typeof location.longitude === "number";
    // The pin is what puts the sale on buyers' map; only skip it when this device can't show the map at all.
    if (!pinned && !mapUnavailable) { setError("Pick your address from the list, or tap the map where your sale is."); return; }
    void save({ location: { address, town, reveal: String(data.get("reveal") || "sale-day") as Draft["location"]["reveal"], ...(pinned ? { latitude: location.latitude, longitude: location.longitude } : {}) } }, "photos");
  }
  async function choosePhotos(files: FileList | null) {
    if (!files?.length || !id || busy) return;
    setBusy(true); setError(""); setNotice("");
    try { await addPhotos(id, Array.from(files)); setPhotos(await getPhotos(id)); setNotice(`Photos saved ${savedWhere}.`); }
    catch (e) { setError(errorText(e)); }
    finally { setBusy(false); }
  }
  async function remove(photoId: string) {
    if (!id || busy) return;
    setBusy(true); setError(""); setNotice("");
    try { await removePhoto(photoId); setPhotos(await getPhotos(id)); setNotice(`Photo removed. Your draft is saved ${savedWhere}.`); }
    catch (e) { setError(errorText(e)); }
    finally { setBusy(false); }
  }
  function saveReview(event: FormEvent<HTMLFormElement>) {
    event.preventDefault(); const data = new FormData(event.currentTarget);
    const additional = String(data.get("highlights") || "").split("\n").map(s => s.trim()).filter(Boolean);
    const reviewed = items.map(item => ({ ...item, label: String(data.get(`label-${item.id}`) || "").trim(), price: String(data.get(`price-${item.id}`) || "").trim() || undefined, category: String(data.get(`category-${item.id}`) || item.category) as Category, confirmed: data.has(`confirmed-${item.id}`) }));
    if (reviewed.some(i => !i.label)) { setError("Give each highlight a name, or remove it."); return; }
    if (reviewed.some(i => !i.confirmed)) { setError("Confirm the highlights you want to keep, or remove any that aren’t right."); return; }
    const labels = [...new Set([...reviewed.map(i=>i.label), ...additional])];
    if (labels.length > 15 || labels.some(s => s.length > 80)) { setError("Use up to 15 highlights, with no more than 80 characters each."); return; }
    const allItems = [...reviewed, ...additional.filter(label=>!reviewed.some(i=>i.label===label)).map((label,n)=>({id:`manual-${n}`,label,category:categories[0] || "Other" as Category,description:label,available:true,confirmed:true}))];
    void save({ categories: [...new Set([...data.getAll("categories") as Category[], ...reviewed.map(i=>i.category)])], highlights: labels, items: allItems }, "preview");
  }
  async function saveListing(event: FormEvent<HTMLFormElement>) {
    event.preventDefault(); const data = new FormData(event.currentTarget);
    const submittedTitle = String(data.get("title") || "").trim(); const submittedDescription = String(data.get("description") || "").trim();
    if (!submittedTitle) { setError("Give your sale a title before saving the listing."); return; }
    if (submittedTitle.length > TITLE_MAX) { setError(`Keep your sale title to ${TITLE_MAX} characters so it fits on your sign.`); return; }
    setTitle(submittedTitle); setDescription(submittedDescription);
    const submitter = (event.nativeEvent as SubmitEvent).submitter as HTMLButtonElement | null;
    const details = cleanDetails(readExtras(data, draft?.details));
    if (submitter?.value === "publish" && id) {
      setBusy(true); setError(""); try { await updateDraft(id, { details }); await publishDemo(id, submittedTitle, submittedDescription); router.push(`/manage/${id}?published=1`); } catch(e) { setError(errorText(e)); setBusy(false); }
    } else await save({ title: submittedTitle, description: submittedDescription, details });
  }

  const messages = <>{error && <p className="form-message error-message" role="alert">{error}</p>}{notice && <p className="form-message success-message" role="status">{notice}</p>}</>;
  if (step === "start") return <div className="start-sale"><h1>Turn your good stuff into someone else’s <span className="highlight">treasure.</span></h1><SnapPhoto name="startSale" className="start-photo" priority /><ol className="start-steps"><li><span>1</span>Add the details</li><li><span>2</span>Share your items</li><li><span>3</span>Get found by local neighbours</li></ol><DemandChips />{accounts && !userId
      // Without an account a sale only lives in this browser, so real sellers sign in before they start.
      ? accountLoading ? <p role="status">Checking your account…</p> : <div className="sell-sign-in"><p className="field-help">Sign in first so buyers on any phone can find your sale. We’ll email you a 6-digit code, no password needed.</p><CodeSignIn sendLabel="Email me a code to start" /></div>
      : <button className="button button-primary full-width" onClick={() => void start()} disabled={busy}>{busy ? "Starting…" : "Create a garage sale"}</button>}{messages}{!userId && <button className="button button-quiet full-width demo-start-button" disabled={busy} onClick={() => void start(true)}>Try a ready-made demo sale</button>}<Link href="/me" className="text-link">Continue an existing draft</Link><p className="field-help">{userId ? "Your sale is saved to your account. Sign out if you just want to try the demo sale." : "Your demo sale is saved on this device. You can edit it, publish it to the demo map and try the sale-day tools."}</p>{!accounts && <div className="event-banner"><label>Joining a community sale?<input value={eventCode} onChange={e => setEventCode(e.target.value)} maxLength={30} placeholder="Event code · try HAMILTON" /></label><Link href="/event" className="small-link">Explore Hamilton SNAB Day →</Link></div>}</div>;
  if (!id) return <div className="empty-state"><h1>Start with a draft.</h1><p>Create a sale or choose one from your drafts.</p><Link href="/sell" className="button button-primary">Start a sale</Link><Link href="/me" className="text-link">My drafts</Link></div>;
  if (!draft) return <div className="empty-state">{error ? <><h1>Draft unavailable.</h1>{messages}<Link href="/me" className="button button-primary">Back to my drafts</Link></> : <p role="status">Opening your draft…</p>}</div>;
  const index = stages.indexOf(step);
  const groupIndex = index < 2 ? 0 : index < 4 ? 1 : 2;
  return <div className="wizard">
    <div className="wizard-heading">
      <Link href={index > 0 ? href(stages[index - 1]) : "/me"} className="back-link" aria-label={index > 0 ? `Back to ${stageNames[index - 1].toLowerCase()}` : "My drafts"} aria-disabled={busy} onClick={e => { if (busy) e.preventDefault(); }}>‹</Link>
      <strong>Create your sale</strong>
      <span>{groupIndex + 1} of 3</span>
    </div>
    <ol className="sale-step-groups" aria-label="Sale setup progress">
      {stageGroups.map((name, i) => <li key={name} className={i === groupIndex ? "current" : i < groupIndex ? "done" : ""} aria-current={i === groupIndex ? "step" : undefined}>
        <span className="sale-step-number" aria-hidden="true">{i < groupIndex ? "✓" : i + 1}</span>
        <span>{name}</span>
        {i < groupIndex && <span className="sr-only"> complete</span>}
      </li>)}
    </ol>
    <p className="sale-substep">{stageNames[index]}{index < 4 && <span> · Part {index % 2 + 1} of 2</span>}</p>
    {step === "when" && <form onSubmit={saveDays}><p className="eyebrow">When?</p><h1>When are<br />you selling?</h1><p className="workspace-lede">Add your sale days and opening times. All times are New Zealand local time.</p><PlannedDatesPicker onPick={date => setDays(current => { const free = current.findIndex(d => !d.date); return current.map((d, n) => n === (free < 0 ? 0 : free) ? { ...d, date } : d); })} /><div className="form-stack">{days.map((day, i) => <fieldset className="day-card" key={i}><legend>Sale day {i + 1}</legend><label>Date<input type="date" name={`date-${i}`} value={day.date} min={localDateKey(new Date())} required onChange={e => setDays(days.map((d, n) => n === i ? { ...d, date: e.target.value } : d))} /></label><div className="field-pair"><label>Starts<input type="time" name={`starts-${i}`} value={day.starts} required onChange={e => setDays(days.map((d, n) => n === i ? { ...d, starts: e.target.value } : d))} /></label><label>Finishes<input type="time" name={`finishes-${i}`} value={day.finishes} required onChange={e => setDays(days.map((d, n) => n === i ? { ...d, finishes: e.target.value } : d))} /></label></div>{days.length > 1 && <button type="button" className="text-button" onClick={() => setDays(days.filter((_, n) => n !== i))}>Remove this day</button>}</fieldset>)}{days.length < MAX_SALE_DAYS && <button className="button button-quiet" type="button" onClick={() => setDays([...days, { date: "", starts: "08:00", finishes: "13:00" }])}>＋ Add another day</button>}</div>{messages}<button className="button button-primary full-width continue-button" disabled={busy}>{busy ? "Saving…" : "Save and continue"}<span aria-hidden="true">→</span></button></form>}
    {step === "where" && <form onSubmit={saveLocation}><p className="eyebrow">Where?</p><h1>Where’s<br />the sale?</h1><p className="workspace-lede">Set the location and choose when buyers can see your address.</p><div className="form-stack"><AddressSearch value={location.address} onType={address => setLocation(current => ({ ...current, address }))} onPick={found => setLocation(current => ({ ...current, address: found.address, town: found.town || current.town, latitude: found.lat, longitude: found.lng }))} /><label>Town or suburb<input name="town" autoComplete="address-level2" value={location.town} maxLength={100} required placeholder="e.g. Hamilton East" onChange={e => setLocation({ ...location, town: e.target.value })} /></label><div><LocationPicker point={typeof location.latitude === "number" && typeof location.longitude === "number" ? { lat: location.latitude, lng: location.longitude } : null} onChange={point => setLocation(current => ({ ...current, latitude: point.lat, longitude: point.lng }))} onUnavailable={noMap} /><p className="field-help">Check the pin is on your place. Tap the map or drag the pin to move it. Buyers only see a rough area until your chosen time.</p></div><fieldset className="privacy-options"><legend>Who can see your address?</legend>{[{ value: "sale-day", title: "Reveal on sale day", text: "Recommended. Only your town or suburb appears before the sale." }, { value: "now", title: "Show the address when published", text: "Buyers can see the exact address as soon as the listing is live." }, { value: "area-only", title: "Approximate area only", text: "Keep the street address hidden in the public listing." }].map(option => <label className="radio-card" key={option.value}><input type="radio" name="reveal" value={option.value} checked={location.reveal === option.value} onChange={() => setLocation({ ...location, reveal: option.value as Draft["location"]["reveal"] })} /><span><strong>{option.title}</strong><small>{option.text}</small></span></label>)}</fieldset></div>{messages}<button className="button button-primary full-width continue-button" disabled={busy}>{busy ? "Saving…" : "Save and continue"}<span aria-hidden="true">→</span></button></form>}
    {step === "photos" && <section className="sale-photos" aria-busy={busy}>
      <h1>Show off the<br /><span className="highlight">good stuff.</span></h1>
      <p className="workspace-lede">A few photos of your tables and boxes. No need to shoot every item.</p>
      {photos.length > 0 ? <div className="sale-photo-gallery">
        {photos.map((photo, i) => <figure key={photo.id} className={i === 0 ? "sale-photo-cover" : "sale-photo-thumb"}>
          <DraftPhotoImage photo={photo} />
          <figcaption>
            <span>{i === 0 ? "Cover photo" : `Photo ${i + 1}`}</span>
            <button type="button" disabled={busy} onClick={() => void remove(photo.id)} aria-label={i === 0 ? "Remove cover photo" : `Remove photo ${i + 1}`}>Remove</button>
          </figcaption>
        </figure>)}
      </div> : <div className="sale-photo-empty">
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d="M8 5.5 9.5 3h5L16 5.5h3.5a2 2 0 0 1 2 2v11a2 2 0 0 1-2 2h-15a2 2 0 0 1-2-2v-11a2 2 0 0 1 2-2Z"/><circle cx="12" cy="12.5" r="4"/></svg>
        <strong>Start with a wide shot.</strong>
        <p>Your first photo will be the cover of your sale.</p>
      </div>}
      <div className="sale-photo-add">
        <label className={`sale-photo-upload ${busy || photos.length >= MAX_PHOTOS ? "disabled-picker" : ""}`}>
          <input type="file" accept="image/*" multiple disabled={busy || photos.length >= MAX_PHOTOS} onChange={e => { void choosePhotos(e.currentTarget.files); e.currentTarget.value = ""; }} />
          <span className="sale-photo-plus" aria-hidden="true">＋</span>
          <span><strong>{photos.length ? "Add more photos" : "Add your photos"}</strong><small>Choose from your photo library</small></span>
        </label>
        <label className={`sale-camera-upload ${busy || photos.length >= MAX_PHOTOS ? "disabled-picker" : ""}`}>
          <input type="file" accept="image/*" capture="environment" disabled={busy || photos.length >= MAX_PHOTOS} onChange={e => { void choosePhotos(e.currentTarget.files); e.currentTarget.value = ""; }} />
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d="M8 5.5 9.5 3h5L16 5.5h3.5a2 2 0 0 1 2 2v11a2 2 0 0 1-2 2h-15a2 2 0 0 1-2-2v-11a2 2 0 0 1 2-2Z"/><circle cx="12" cy="12.5" r="4"/></svg>
          <span>Take a photo</span>
        </label>
      </div>
      <div className="photo-summary"><strong>{photos.length} of {MAX_PHOTOS} photos</strong><span>Up to 20 MB each</span></div>
      {busy && <p className="sale-photo-status" role="status">Saving photo changes…</p>}
      {!busy && !error && !notice && photos.length > 0 && <p className="sale-photo-status"><span aria-hidden="true">✓</span> Photos saved {savedWhere}.</p>}
      {messages}
      <p className="field-help">{userId ? "Photos are private until you publish. Location data is removed before they’re saved to your account." : "Photos stay on this device. You can add more later."}</p>
      <div className="sale-photo-next">
        <Link href={href("review")} aria-disabled={busy} onClick={e => { if (busy) e.preventDefault(); }} className="button button-primary full-width continue-button">{photos.length ? "Next · add your highlights" : "Continue without photos"}<span aria-hidden="true">→</span></Link>
        {!userId && <Link href={href("processing")} aria-disabled={busy} onClick={e => { if (busy) e.preventDefault(); }} className="text-link">Try the demo highlight scan<span aria-hidden="true"> →</span></Link>}
        <p className="field-help">You’ll check your listing before publishing.</p>
      </div>
    </section>}
    {step === "review" && <form onSubmit={saveReview}><p className="eyebrow">Your highlights</p><h1>What’s worth<br /><span className="highlight">a Snab?</span></h1><p className="workspace-lede">Choose the kinds of things you’re selling and add a few highlights.</p>{draft.demoScan && <p className="local-note compact-note">Demo highlights · check, fix or remove each suggestion. Sample estimates are there to show the pricing flow.</p>}{items.length > 0 && <><div className="section-heading"><h2>Check the highlights</h2><button className="text-button" type="button" onClick={() => setItems(items.map(i => ({ ...i, confirmed: true })))}>These look right ✓</button></div><div className="review-items">{items.map(item => <article className="review-item" key={item.id}><div className="review-item-heading"><CategoryArt category={item.category} size={42} /><strong>{item.label}</strong><button className="remove-interest" type="button" aria-label={`Remove ${item.label}`} onClick={() => setItems(items.filter(i => i.id !== item.id))}>×</button></div><label>Highlight<input name={`label-${item.id}`} defaultValue={item.label} maxLength={80} required /></label><div className="field-pair"><label>Category<select name={`category-${item.id}`} defaultValue={item.category}>{CATEGORIES.map(c=><option key={c}>{c}</option>)}</select></label><label>Asking price <span className="optional-label">optional</span><input name={`price-${item.id}`} value={item.price || ""} placeholder="e.g. $25" maxLength={30} onChange={e=>setItems(items.map(i=>i.id===item.id?{...i,price:e.target.value}:i))} /></label></div>{item.estimate && <p className="field-help">Sample estimate: {item.estimate}</p>}<label className="inline-checkbox"><input type="checkbox" name={`confirmed-${item.id}`} checked={item.confirmed} onChange={e=>setItems(items.map(i=>i.id===item.id?{...i,confirmed:e.target.checked}:i))} />Keep this highlight</label></article>)}</div><button className="text-button" type="button" onClick={()=>setItems(items.map(i=>({...i,price:undefined})))}>Skip prices · ask at the sale</button></>}<fieldset className="category-picker"><legend>What’s at your sale?</legend>{CATEGORIES.map(category => <label key={category} className={categories.includes(category) ? "selected" : ""}><input type="checkbox" name="categories" value={category} checked={categories.includes(category)} onChange={e => setCategories(e.target.checked ? [...categories, category] : categories.filter(c => c !== category))} />{category !== "Other" && <Image src={`/brand/categories/${category.toLowerCase()}.svg`} alt="" width={35} height={35} />}<span>{category}</span></label>)}</fieldset><DemandMatches items={[...items, ...highlights.split("\n").map(h => h.trim()).filter(Boolean).map((label, n) => ({ id: `typed-${n}`, label, category: "Other" as Category, description: label, available: true, confirmed: true }))]} /><PriceGuide /><label className="highlight-field">Additional finds <span className="optional-label">optional</span><textarea name="highlights" rows={5} value={highlights} maxLength={1214} onChange={e => setHighlights(e.target.value)} placeholder={"Cordless drill\nBookshelf\nOld computer parts"} /><small>One per line, up to 15. You don’t need to list everything.</small></label>{messages}<button className="button button-primary full-width continue-button" disabled={busy}>{busy ? "Saving…" : "Save and preview"}<span aria-hidden="true">→</span></button></form>}
    {step === "preview" && <section><p className="eyebrow">Your listing</p><h1>Almost<br /><span className="highlight">Snab-ready.</span></h1><form className="listing-editor" onSubmit={e => void saveListing(e)}><label>Sale title<input name="title" value={title} onChange={e => { setTitle(e.target.value); setSaved(false); }} required maxLength={TITLE_MAX} placeholder="e.g. Saturday Garage Clearout" /><small className="field-help">Short and punchy works best on your sign · {title.length}/{TITLE_MAX}</small></label><label>Tell buyers a little more <span className="optional-label">optional</span><textarea name="description" rows={4} maxLength={2000} value={description} placeholder="What’s there? Any tips for visiting?" onChange={e => { setDescription(e.target.value); setSaved(false); }} /></label><SaleExtrasFields details={draft.details} /><button className="button button-quiet full-width" disabled={busy}>{busy ? "Saving…" : saved ? `Saved ${savedWhere} ✓` : "Save listing"}</button><button className="button button-primary full-width" name="intent" value="publish" disabled={busy}>{busy ? "Publishing…" : userId ? "Publish my sale →" : "Publish to the demo map →"}</button><p className="field-help">{userId ? "Buyers on any phone can find your sale once it’s published. Your street stays hidden until your chosen time." : "Demo publishing · your sale appears in this browser’s map and buyer flow."}</p></form>{messages}<div className="buyer-preview-heading"><h2>Preview as a buyer</h2><span>Local preview</span></div><article className="sale-preview-card">{photos[0] ? <DraftPhotoImage photo={photos[0]} className="sale-cover" /> : <div className="sale-cover empty-cover"><Image src="/brand/categories/furniture.svg" alt="" width={75} height={75} /><span>Add a photo to show your sale</span></div>}<div className="sale-preview-body"><h2>{title || "Your garage sale"}</h2><span className="draft-badge">{draft.status === "draft" ? "Draft · ready to preview" : userId ? "Published sale" : "Published demo sale"}</span><ul className="sale-days-list">{draft.days.map((day, i) => <li key={i}><strong>{formatDay(day)}</strong><span>{clock(day.starts)}–{clock(day.finishes)}</span></li>)}</ul><p className="public-location">{publicAddress(draft)}</p><div className="category-chips">{draft.categories.map(c => <span key={c}>{c}</span>)}</div>{description && <p className="sale-description">{description}</p>}{draft.highlights.length > 0 && <><h3>Worth a look</h3><ul className="highlights-list">{draft.highlights.map(h => <li key={h}>{h}</li>)}</ul></>}</div></article><details className="private-summary" onToggle={e => setShowExactAddress(e.currentTarget.open)}><summary>Your private location settings</summary>{showExactAddress && <p>{draft.location.address}, {draft.location.town}<br />Visibility: {draft.location.reveal === "sale-day" ? "reveal on sale day" : draft.location.reveal === "now" ? "show when published" : "area only"}</p>}</details><Link href="/me" className="text-link">Back to my drafts</Link></section>}
  </div>;
}
