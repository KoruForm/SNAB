"use client";
import Image from "next/image";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { useEffect, useState, type FormEvent } from "react";
import { addPhotos, createDraft, getDraft, getPhotos, MAX_PHOTOS, removePhoto, updateDraft } from "../lib/drafts/storage";
import { CATEGORIES, formatDay, localDateKey, publicAddress, validateDays, type Category, type Draft, type DraftPhoto, type MockItem, type SaleDay } from "../lib/drafts/types";
import DraftPhotoImage from "./draft-photo";
import { createDemoDraft, publishDemo } from "../lib/mock/actions";
import { CategoryArt, DemoMap } from "./buyer-ui";

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
  const [items, setItems] = useState<MockItem[]>([]);
  const [eventCode, setEventCode] = useState(search.get("event") || "");

  useEffect(() => {
    if (!id || step === "start") return;
    let cancelled = false;
    Promise.all([getDraft(id), getPhotos(id)]).then(([found, storedPhotos]) => {
      if (cancelled) return;
      if (!found) { setError("This draft couldn’t be found on this device."); return; }
      setDraft(found); setPhotos(storedPhotos); setDays(found.days); setLocation(found.location); setCategories(found.categories); setItems(found.items || []); setHighlights(found.highlights.filter(h => !found.items?.some(i => i.label === h)).join("\n")); setTitle(found.title); setDescription(found.description);
    }).catch(e => { if (!cancelled) setError(errorText(e)); });
    return () => { cancelled = true; };
  }, [id, step]);

  function href(next: string) { return `/sell/${next}?draft=${id}`; }
  async function start(demo = false) {
    setBusy(true); setError("");
    try { if (eventCode && eventCode.toUpperCase().trim() !== "HAMILTON") throw new Error("Try the demo community code HAMILTON."); const code = eventCode.toUpperCase().trim() || undefined; const created = demo ? await createDemoDraft(code) : await createDraft(); if (!demo && code) await updateDraft(created.id, { eventCode: code }); router.push(`/sell/${demo ? "preview" : "when"}?draft=${created.id}`); }
    catch (e) { setError(errorText(e)); setBusy(false); }
  }
  async function save(patch: Parameters<typeof updateDraft>[1], next?: string) {
    if (!id) return;
    setBusy(true); setError(""); setNotice("");
    try { const updated = await updateDraft(id, patch); setDraft(updated); if (next) router.push(href(next)); else { setSaved(true); setNotice("Listing saved on this device."); } }
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
    void save({ location: { address, town, reveal: String(data.get("reveal") || "sale-day") as Draft["location"]["reveal"] } }, "photos");
  }
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
    setTitle(submittedTitle); setDescription(submittedDescription);
    const submitter = (event.nativeEvent as SubmitEvent).submitter as HTMLButtonElement | null;
    if (submitter?.value === "publish" && id) {
      setBusy(true); setError(""); try { await publishDemo(id, submittedTitle, submittedDescription); router.push(`/manage/${id}?published=1`); } catch(e) { setError(errorText(e)); setBusy(false); }
    } else await save({ title: submittedTitle, description: submittedDescription });
  }

  const messages = <>{error && <p className="form-message error-message" role="alert">{error}</p>}{notice && <p className="form-message success-message" role="status">{notice}</p>}</>;
  if (step === "start") return <div className="start-sale"><p className="eyebrow">Garage Sales Made Easy</p><h1>Clear some<br /><span className="highlight">stuff?</span></h1><p className="workspace-lede">Turn what you’ve got into a garage sale worth Snabbing.</p><div className="start-illustration"><Image src="/brand/categories/furniture.svg" alt="Armchair" width={130} height={130} /><Image src="/brand/categories/garden.svg" alt="Plant" width={85} height={85} /><Image src="/brand/categories/books.svg" alt="Books" width={100} height={100} /></div><button className="button button-primary full-width" onClick={() => void start()} disabled={busy}>{busy ? "Starting…" : "Start a sale"}<span aria-hidden="true">→</span></button>{messages}<Link href="/me" className="text-link">Continue an existing draft</Link><button className="button button-quiet full-width demo-start-button" disabled={busy} onClick={() => void start(true)}>Try a ready-made demo sale</button><p className="field-help">Your demo sale is saved on this device. You can edit it, publish it to the demo map and try the sale-day tools.</p><div className="event-banner"><label>Joining a community sale?<input value={eventCode} onChange={e => setEventCode(e.target.value)} maxLength={30} placeholder="Event code · try HAMILTON" /></label><Link href="/event" className="small-link">Explore Hamilton SNAB Day →</Link></div></div>;
  if (!id) return <div className="empty-state"><h1>Start with a draft.</h1><p>Create a sale or choose one from your drafts.</p><Link href="/sell" className="button button-primary">Start a sale</Link><Link href="/me" className="text-link">My drafts</Link></div>;
  if (!draft) return <div className="empty-state">{error ? <><h1>Draft unavailable.</h1>{messages}<Link href="/me" className="button button-primary">Back to my drafts</Link></> : <p role="status">Opening your draft…</p>}</div>;
  const index = stages.indexOf(step);
  return <div className="wizard"><div className="wizard-heading"><Link href={index > 0 ? href(stages[index - 1]) : "/me"} className="back-link">← {index > 0 ? "Back" : "My drafts"}</Link><span>Step {index + 1} of 5</span></div><ol className="step-rail" aria-label="Sale setup progress">{stageNames.map((name, i) => <li key={name} className={i === index ? "current" : ""} aria-current={i === index ? "step" : undefined}><span>{i + 1}</span>{name}</li>)}</ol>
    {step === "when" && <form onSubmit={saveDays}><p className="eyebrow">When?</p><h1>When are<br />you selling?</h1><p className="workspace-lede">Add your sale days and opening times. All times are New Zealand local time.</p><div className="form-stack">{days.map((day, i) => <fieldset className="day-card" key={i}><legend>Sale day {i + 1}</legend><label>Date<input type="date" name={`date-${i}`} value={day.date} min={localDateKey(new Date())} required onChange={e => setDays(days.map((d, n) => n === i ? { ...d, date: e.target.value } : d))} /></label><div className="field-pair"><label>Starts<input type="time" name={`starts-${i}`} value={day.starts} required onChange={e => setDays(days.map((d, n) => n === i ? { ...d, starts: e.target.value } : d))} /></label><label>Finishes<input type="time" name={`finishes-${i}`} value={day.finishes} required onChange={e => setDays(days.map((d, n) => n === i ? { ...d, finishes: e.target.value } : d))} /></label></div>{days.length > 1 && <button type="button" className="text-button" onClick={() => setDays(days.filter((_, n) => n !== i))}>Remove this day</button>}</fieldset>)}<button className="button button-quiet" type="button" onClick={() => setDays([...days, { date: "", starts: "08:00", finishes: "13:00" }])}>＋ Add another day</button></div>{messages}<button className="button button-primary full-width continue-button" disabled={busy}>{busy ? "Saving…" : "Save and continue"}<span aria-hidden="true">→</span></button></form>}
    {step === "where" && <form onSubmit={saveLocation}><p className="eyebrow">Where?</p><h1>Where’s<br />the sale?</h1><p className="workspace-lede">Set the location and choose when buyers can see your address.</p><div className="form-stack"><label>Street address<input name="address" autoComplete="street-address" value={location.address} maxLength={200} required placeholder="Street number and name" onChange={e => setLocation({ ...location, address: e.target.value })} /></label><label>Town or suburb<input name="town" autoComplete="address-level2" value={location.town} maxLength={100} required placeholder="e.g. Hamilton East" onChange={e => setLocation({ ...location, town: e.target.value })} /></label><div><DemoMap sales={[]} /><p className="field-help">Demo area preview · your address is saved with this sale.</p></div><fieldset className="privacy-options"><legend>Who can see your address?</legend>{[{ value: "sale-day", title: "Reveal on sale day", text: "Recommended. Only your town or suburb appears before the sale." }, { value: "now", title: "Show the address when published", text: "Buyers can see the exact address as soon as the listing is live." }, { value: "area-only", title: "Approximate area only", text: "Keep the street address hidden in the public listing." }].map(option => <label className="radio-card" key={option.value}><input type="radio" name="reveal" value={option.value} checked={location.reveal === option.value} onChange={() => setLocation({ ...location, reveal: option.value as Draft["location"]["reveal"] })} /><span><strong>{option.title}</strong><small>{option.text}</small></span></label>)}</fieldset></div>{messages}<button className="button button-primary full-width continue-button" disabled={busy}>{busy ? "Saving…" : "Save and continue"}<span aria-hidden="true">→</span></button></form>}
    {step === "photos" && <section><p className="eyebrow">Show your stuff</p><h1>A few<br /><span className="highlight">wide shots.</span></h1><p className="workspace-lede">Take photos of tables, shelves, boxes and piles. No need to photograph every item separately.</p><div className="photo-actions"><label className={`photo-picker ${busy ? "disabled-picker" : ""}`}><input type="file" accept="image/*" capture="environment" disabled={busy} onChange={e => { void choosePhotos(e.currentTarget.files); e.currentTarget.value = ""; }} /><span aria-hidden="true">◎</span><strong>Take a photo</strong></label><label className={`photo-picker ${busy ? "disabled-picker" : ""}`}><input type="file" accept="image/*" multiple disabled={busy} onChange={e => { void choosePhotos(e.currentTarget.files); e.currentTarget.value = ""; }} /><span aria-hidden="true">＋</span><strong>Choose photos</strong></label></div><div className="photo-summary"><strong>{photos.length} {photos.length === 1 ? "photo" : "photos"} saved</strong><span>Up to {MAX_PHOTOS} · 20 MB each</span></div>{photos.length > 0 && <div className="draft-photo-grid">{photos.map((photo, i) => <figure key={photo.id}><DraftPhotoImage photo={photo} /><figcaption><span>Photo {i + 1}</span><button type="button" disabled={busy} onClick={() => void remove(photo.id)} aria-label={`Remove photo ${i + 1}`}>×</button></figcaption></figure>)}</div>}{messages}<p className="field-help">Photos stay on this device. Try the demo scan to walk through the suggested highlights.</p><Link href={href("processing")} className="button button-primary full-width continue-button">{photos.length ? "I’m done · find the highlights" : "Try the demo scan"}<span aria-hidden="true">→</span></Link><Link href={href("review")} aria-disabled={busy} onClick={e => { if (busy) e.preventDefault(); }} className="text-link">{photos.length ? "Review manually instead" : "Continue without photos"}<span aria-hidden="true">→</span></Link></section>}
    {step === "review" && <form onSubmit={saveReview}><p className="eyebrow">Your highlights</p><h1>What’s worth<br /><span className="highlight">a Snab?</span></h1><p className="workspace-lede">Choose the kinds of things you’re selling and add a few highlights.</p>{draft.demoScan && <p className="local-note compact-note">Demo highlights · check, fix or remove each suggestion. Sample estimates are there to show the pricing flow.</p>}{items.length > 0 && <><div className="section-heading"><h2>Check the highlights</h2><button className="text-button" type="button" onClick={() => setItems(items.map(i => ({ ...i, confirmed: true })))}>These look right ✓</button></div><div className="review-items">{items.map(item => <article className="review-item" key={item.id}><div className="review-item-heading"><CategoryArt category={item.category} size={42} /><strong>{item.label}</strong><button className="remove-interest" type="button" aria-label={`Remove ${item.label}`} onClick={() => setItems(items.filter(i => i.id !== item.id))}>×</button></div><label>Highlight<input name={`label-${item.id}`} defaultValue={item.label} maxLength={80} required /></label><div className="field-pair"><label>Category<select name={`category-${item.id}`} defaultValue={item.category}>{CATEGORIES.map(c=><option key={c}>{c}</option>)}</select></label><label>Asking price <span className="optional-label">optional</span><input name={`price-${item.id}`} value={item.price || ""} placeholder="e.g. $25" maxLength={30} onChange={e=>setItems(items.map(i=>i.id===item.id?{...i,price:e.target.value}:i))} /></label></div>{item.estimate && <p className="field-help">Sample estimate: {item.estimate}</p>}<label className="inline-checkbox"><input type="checkbox" name={`confirmed-${item.id}`} checked={item.confirmed} onChange={e=>setItems(items.map(i=>i.id===item.id?{...i,confirmed:e.target.checked}:i))} />Keep this highlight</label></article>)}</div><button className="text-button" type="button" onClick={()=>setItems(items.map(i=>({...i,price:undefined})))}>Skip prices · ask at the sale</button></>}<fieldset className="category-picker"><legend>What’s at your sale?</legend>{CATEGORIES.map(category => <label key={category} className={categories.includes(category) ? "selected" : ""}><input type="checkbox" name="categories" value={category} checked={categories.includes(category)} onChange={e => setCategories(e.target.checked ? [...categories, category] : categories.filter(c => c !== category))} />{category !== "Other" && <Image src={`/brand/categories/${category.toLowerCase()}.svg`} alt="" width={35} height={35} />}<span>{category}</span></label>)}</fieldset><label className="highlight-field">Additional finds <span className="optional-label">optional</span><textarea name="highlights" rows={5} value={highlights} maxLength={1214} onChange={e => setHighlights(e.target.value)} placeholder={"Cordless drill\nBookshelf\nOld computer parts"} /><small>One per line, up to 15. You don’t need to list everything.</small></label>{messages}<button className="button button-primary full-width continue-button" disabled={busy}>{busy ? "Saving…" : "Save and preview"}<span aria-hidden="true">→</span></button></form>}
    {step === "preview" && <section><p className="eyebrow">Your listing</p><h1>Almost<br /><span className="highlight">Snab-ready.</span></h1><form className="listing-editor" onSubmit={e => void saveListing(e)}><label>Sale title<input name="title" value={title} onChange={e => { setTitle(e.target.value); setSaved(false); }} required maxLength={100} placeholder="e.g. Saturday Garage Clearout" /></label><label>Tell buyers a little more <span className="optional-label">optional</span><textarea name="description" rows={4} maxLength={2000} value={description} placeholder="What’s there? Any tips for visiting?" onChange={e => { setDescription(e.target.value); setSaved(false); }} /></label><button className="button button-primary full-width" disabled={busy}>{busy ? "Saving…" : saved ? "Saved on this device ✓" : "Save listing"}</button><button className="button button-primary full-width" name="intent" value="publish" disabled={busy}>{busy ? "Publishing…" : "Publish to the demo map →"}</button><p className="field-help">Demo publishing · your sale appears in this browser’s map and buyer flow.</p></form>{messages}<div className="buyer-preview-heading"><h2>Preview as a buyer</h2><span>Local preview</span></div><article className="sale-preview-card">{photos[0] ? <DraftPhotoImage photo={photos[0]} className="sale-cover" /> : <div className="sale-cover empty-cover"><Image src="/brand/categories/furniture.svg" alt="" width={75} height={75} /><span>Add a photo to show your sale</span></div>}<div className="sale-preview-body"><h2>{title || "Your garage sale"}</h2><span className="draft-badge">{draft.status === "draft" ? "Draft · ready to preview" : "Published demo sale"}</span><ul className="sale-days-list">{draft.days.map((day, i) => <li key={i}><strong>{formatDay(day)}</strong><span>{day.starts}–{day.finishes}</span></li>)}</ul><p className="public-location">{publicAddress(draft)}</p><div className="category-chips">{draft.categories.map(c => <span key={c}>{c}</span>)}</div>{description && <p className="sale-description">{description}</p>}{draft.highlights.length > 0 && <><h3>Worth a look</h3><ul className="highlights-list">{draft.highlights.map(h => <li key={h}>{h}</li>)}</ul></>}</div></article><details className="private-summary" onToggle={e => setShowExactAddress(e.currentTarget.open)}><summary>Your private location settings</summary>{showExactAddress && <p>{draft.location.address}, {draft.location.town}<br />Visibility: {draft.location.reveal === "sale-day" ? "reveal on sale day" : draft.location.reveal === "now" ? "show when published" : "area only"}</p>}</details><Link href="/me" className="text-link">Back to my drafts</Link></section>}
  </div>;
}
