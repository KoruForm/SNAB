# SNAB UX implementation status — v0.3.0

Source: garage-sale-ai-ux-master-wireframes.png supplied 4 October 2026.
Approved artwork: v0.4-smoothed. Repository: KoruForm/SNAB. Host: Hostinger.

## Implemented in this release

- Persistent Map / Hunt / Sell / Saved / Me navigation and responsive app shell.
- Start a local sale draft; resume multiple drafts from Me.
- Multiple sale days, dates and times, validation and NZ local-time wording.
- Address and town input; sale-day / show-now / area-only privacy choices.
- Camera-request input and separate multi-file picker; persisted photo blobs, thumbnails and removal.
- Manual categories and highlights; no invented AI results.
- Editable title and description; saved listing and buyer preview.
- Buyer preview honours the selected address setting, including NZ sale-day dates.
- Delete a local draft and its photos after an in-app confirmation.
- Legacy /scan URL redirects to the seller flow.

Data is in IndexedDB on the same origin, browser profile and device. It survives refresh and ordinary browser restarts. It does not sync, and clearing browser data or browser storage eviction can remove it. Private/incognito profiles may remove data when closed. There is no account identity or public listing in this release.

## Still missing from the wireframe

| Feature | Status |
| --- | --- |
| Accounts, authentication and cross-device drafts | Supabase project/credentials not connected |
| Remote photo uploads | Schema prepared; not connected |
| Geocoding, map position and nearby map | Not connected |
| AI processing, retry worker, grouped inventory and seller corrections | Not connected |
| Public publishing | Disabled until server persistence and privacy projection exist |
| Buyer results, sale details, within-sale search and item views | Not built |
| Treasure Lists, saved sales and matching notifications | Not built |
| Directions | Not built |
| Community event codes | Not built |
| Sale-day status, statistics, fresh photos and sold/gone controls | Not built |
| Social sharing, post text, PDF signs, QR posters and invitations | Not built |
| Price suggestions | Deferred from first release |

The Map / Hunt / Saved destinations explicitly explain their current unavailable state. No fake sales, fake processing or fake sign-in are shown.

## Next implementation gate

Connect one Supabase project and its Auth configuration. Apply the owner-only migration in `supabase/migrations/001_seller_foundation.sql` to an isolated development project, then verify owner/non-owner policies with separate accounts. It has not been applied or executed against Postgres in this release.

After connection: add the authenticated repository adapter, migrate selected local drafts with consent, upload photos privately, implement an idempotent analysis worker, and publish through a server-controlled public projection. Exact address and exact coordinates must stay out of public responses until permitted. Do not expose the private table or return hidden coordinates to the browser.

Reference docs:
- https://supabase.com/docs/guides/database/postgres/row-level-security
- https://supabase.com/docs/guides/storage/security/access-control
- https://supabase.com/docs/guides/storage/buckets/fundamentals
