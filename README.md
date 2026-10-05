# SNAB

Mobile-first SNAB app foundation, built for deployment as a Node.js web app on Hostinger.

## Current state

v0.4.0 is the full interactive UX demo using the approved v0.4 brand artwork. Seller creation, sample scan, highlight correction, optional prices, demo publishing, sale-day controls, sharing previews, A4 PDF signs and QR posters are connected to the buyer map/list, hunt results, sale details, within-sale search, item views, directions walkthrough, saved finds and treasure list. Me includes drafts, published sales and a demo profile. Community code HAMILTON joins the sample event.

Start at `/` for the mobile-first introduction, `/map` to find sales, or `/sell` → **Try a ready-made demo sale** to try publishing and the sale-day tools. Bottom navigation has four labelled destinations: Find, Sell, Saved and Me, with the SNAB paper highlight behind the active icon.

Find combines list/map browsing and item matching; existing `/hunt?q=…` links still work. Search, day, category, area and view stay in the URL. Maps and sample distances remain illustrative. The seller flow presents three groups (Details, Photos & highlights, Preview) while retaining the five underlying forms and their validation. See `docs/MOBILE-REDESIGN.md` for design assets and verification.

Sales and photos persist in IndexedDB; preferences persist in localStorage. Publishing adds a listing to this browser's demo catalogue. Fixtures, search, matching, scan progress, statistics, estimates, maps, directions and account identity are explicitly simulated. No provider credentials, remote calls, real navigation or public listing service are needed. Clearing browser data removes local changes. See `docs/IMPLEMENTATION-STATUS.md` for UX coverage and integration work for the next phase.

Supabase owner-only database and private-storage setup is prepared in `supabase/migrations/001_seller_foundation.sql`, server-enforced address privacy for buyers in `002_public_sale_privacy.sql`, and account draft sync in `003_seller_draft_sync.sql`, and buyer browsing in `004_buyer_browse.sql`. 001–003 are applied to the live Supabase project. `npm run test:db` checks them against a local Postgres. No provider credentials are needed for the local seller flow.

## Seller accounts (Supabase)

With no Supabase settings the app runs as the local demo above. When `NEXT_PUBLIC_SUPABASE_URL` and `NEXT_PUBLIC_SUPABASE_ANON_KEY` are set (see `.env.example`), `/account` offers email sign-in links, and a signed-in seller's drafts, sale days, address and photos are saved to their account instead of the browser. Photos go to the private `sale-photos` bucket and are shown through short-lived signed links. Drafts started before signing in can be moved to the account from **Me**. Buyers on any device see every seller's published sales through `browse_sales()` (migration `004`), with the street hidden until the seller's chosen time and photos shown through short-lived signed links. A sale drops off once its last sale day has passed. The ready-made demo sale is only offered when signed out and never moves to an account.

To set up a Supabase project:

1. Run the migrations in `supabase/migrations/` in order in the SQL editor.
2. In **Authentication → URL configuration**, set the site URL and add `<site>/account` as a redirect URL for each environment (for example `http://localhost:3000/account`).
3. Put the project URL and anon key in `.env.local` locally, or in Hostinger's environment variables before building. Never add the service-role key.

## Maps and addresses

Maps use MapLibre with OpenFreeMap's free tiles (no key; `NEXT_PUBLIC_MAP_STYLE_URL` swaps the style). MapLibre's worker is served from the installed package at `/maplibre/<version>/…` because the bundler can't follow it.

- **Sellers** type their street on the "Where" step and pick a real NZ address. `/api/address` asks Geoapify when `GEOAPIFY_API_KEY` is set (server-only), otherwise the keyless Photon service; both use OpenStreetMap, which carries the LINZ address list. The pin can be dragged or the map tapped to place it, and is saved as the private `exact_latitude`/`exact_longitude`.
- **Buyers** get an exact pin only when `browse_sales()` sends the street. Until then they get the centre of the sale's 0.01° grid cell and see a dashed circle of 750 m that always contains the real spot.
- **Near me** keeps the buyer's position on their device (rounded to about 100 m) and measures to the point they can see, never to a hidden street. At pilot scale every listed sale is loaded and filtered on the phone; a server-side area query can come later.

## Coming soon page

`/coming-soon` is a pre-launch page in the landing style with a "Be first to know" email sign-up. Sign-ups go through `register_interest()` (migration `005`) into `interest_signups`, which nobody can read through the API; view them in the Supabase dashboard. It is currently the home page (`COMING_SOON_DEFAULT = true` in `lib/launch.ts`); the app's own landing page is at `/welcome` and every other route works as before. Set it to `false` (or `NEXT_PUBLIC_COMING_SOON=off` before building) to put the app landing back on `/`.

Sellers see real views and saves for their listed sales on the Manage page (migration `007`). Opening a sale page counts one view per device per day, and saving or unsaving a sale updates the save count. Browsers send a random device code; the server keeps only a hash of it per sale, so nothing ties a view to a person, and the seller's own visits don't count.

## Stack

- Next.js App Router + React + TypeScript
- Hostinger Node.js Web App deployment
- Supabase planned for Auth, PostgreSQL/PostGIS, pgvector, and private photo storage
- MapLibre planned for map rendering

## Local development

Requires Node.js 22 or newer.

```sh
npm install
npm run dev
```

Open http://localhost:3000.

## Hostinger deployment

1. Push this repository to GitHub.
2. In Hostinger, choose **Add website → Deploy Web App** and connect `KoruForm/SNAB`.
3. Use the Next.js framework preset. Set Node.js 22 or 24.
4. Build command: `npm run build`; start command: `npm run start`.
5. Add environment variables in Hostinger only when integrations are implemented. Never commit API keys.
6. Deploy to a staging subdomain first.

Hostinger's managed Node.js app hosting is available on qualifying Business Web Hosting and Cloud plans. Confirm the exact plan in hPanel before deployment.

## Product principles

- Photos describe a whole sale; sellers do not catalogue every object.
- AI results are candidates, with uncertainty visible and seller corrections kept.
- Sale transactions remain in person.
- Exact home addresses must not be exposed before the seller's reveal setting allows it.
- No AI-provider key or private credentials belong in this public repository.
