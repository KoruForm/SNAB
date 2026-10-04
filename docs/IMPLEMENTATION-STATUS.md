# SNAB UX coverage — v0.4.0

Reference: user-supplied garage-sale master wireframes. Approved artwork: v0.4-smoothed. Repository: KoruForm/SNAB. Deployment: Hostinger.

The current phase is a complete interactive UX mock. Backend services and production integrations are intentionally the next phase. All primary screens and journeys are connected; demo fixtures and simulations are labelled in the interface.

| Wireframe flow | Route and working interaction |
| --- | --- |
| Home map / list | `/map`: illustrative Hamilton map, selectable pins, sale cards, map/list toggle, date/radius/category/open filters and empty state |
| Sale start / event code | `/sell`: blank sale or ready-made demo; HAMILTON event code; invalid-code feedback |
| When | `/sell/when`: multiple days, date/time validation, back/continue, persistence |
| Where / privacy | `/sell/where`: address/town, demo area preview, sale-day/show-now/area-only controls |
| Wide photos / camera capture | `/sell/photos`: device file picker and camera capture input, saved thumbnails, removal, manual or demo-scan path |
| AI processing | `/sell/processing`: simulated progress, skip, storage error and retry; never sends photos to AI |
| Review / correct / optional prices | `/sell/review`: sample suggestions, keep/fix/remove, categories, confirm all, optional asking prices, skip prices, manual additions |
| Preview / publish | `/sell/preview`: editable title/description, buyer preview, local demo publication; listing appears on this browser's map |
| Search and match bands | `/hunt`: text queries, simple synonym matching, Great/Good/Possible reasons, sort/open filters and empty results |
| Sale detail / saved heart | `/sale/[id]`: cover, privacy-aware location, days, status, categories, save, highlights, illustrative tappable photo markers, photo gallery, report simulation, share copy |
| Within-sale search | `/sale/[id]/search`: query/category filtering of available highlights |
| Item view / pricing | `/item/[saleId]/[itemId]`: sale photo or category illustration, asking price/sample estimate, save, gone state, link to sale |
| Treasure list / saved finds | `/saved`: add/remove interests, demo match counts, saved sales/items, empty states; browser persistence |
| Directions | `/directions/[id]`: illustrative route and next-step walkthrough; hidden address state shows area only |
| Sale-day controls | `/manage/[id]`: open/close confirmation/reopen, lots left/some gone, item gone/restore, fresh photo, edit, buyer preview |
| Views and saves | Clearly labelled sample statistics; available item count uses actual local state |
| Share / signs / QR / invites | Copyable post and invitation previews, actual downloadable A4 PDF sign with valid QR URL, QR poster preview/PDF; no messages are sent |
| Community day | `/event`: HAMILTON fixture/local-sale catalogue, event banner and seller join route |
| Profile / Me | `/account` demo name/sign-in/sign-out; `/me` draft resume, published sale management, buyer views, delete confirmation |
| Bottom navigation | Map / Hunt / raised yellow plus / Saved / Me on every app screen |

## Data and simulation boundaries

Local sales and photo blobs are saved in IndexedDB on the same origin, device and browser profile. Favourites, treasure interests, demo profile and demo reports use localStorage. Refresh retains state. Browser storage eviction, clearing site data and private profile closure can remove it. A local sale URL opened in another browser will show unavailable; sample sale URLs work because their fixtures are supplied to every browser. Exported local-sale signs disclose that limitation.

The illustrated map is not geocoded. Distances, routes, scan results, price estimates, matching and engagement statistics are demonstrations. Asking prices and item availability are seller-editable local state. Exact street text is projected according to the privacy choice across buyer detail, directions, share text and sign export; this is UX behaviour, not server-side access control.

## Next phase: hookups

Connect authentication and cross-device persistence, remote photo storage, geocoding/maps/directions, image analysis and reliable jobs, server-controlled public publication, event lookup, actual analytics, reporting/moderation, notifications and social integration. Supabase migration `001_seller_foundation.sql` is prepared but has not been applied. Credentials are not required for this demo.

Server-side address privacy is prepared in `002_public_sale_privacy.sql` (not yet applied). Buyers read sales only through `list_public_sales()` and `get_public_sale(id)`, which return the street and exact coordinates only while the reveal setting allows it (Pacific/Auckland date; never for drafts, closed sales or after the last sale day) and otherwise the town plus a coarse grid point of about 1 km. `npm run test:db` applies the migrations to a scratch Postgres and checks this, along with separate-account access, in CI. The app's demo projection uses the same rule (`addressVisible` in `lib/drafts/types.ts`).

Before production publication, wire the buyer screens to those functions, strip photo location metadata on upload, and provide migration of selected local drafts. Do not expose private tables or hidden coordinates to public clients.

## Validation

Lint, TypeScript production build, automated storage/privacy/search/publication/availability tests, Postgres address-privacy and access-policy tests, plus live browser checks of buyer and seller transitions. The device camera is opened only when the user chooses to take a photo.
