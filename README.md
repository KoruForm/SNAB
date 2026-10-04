# SNAB

Mobile-first SNAB app foundation, built for deployment as a Node.js web app on Hostinger.

## Current state

v0.4.0 is the full interactive UX demo using the approved v0.4 brand artwork. Seller creation, sample scan, highlight correction, optional prices, demo publishing, sale-day controls, sharing previews, A4 PDF signs and QR posters are connected to the buyer map/list, hunt results, sale details, within-sale search, item views, directions walkthrough, saved finds and treasure list. Me includes drafts, published sales and a demo profile. Community code HAMILTON joins the sample event.

Start at `/map` to browse, or `/sell` → **Try a ready-made demo sale** to try publishing and the sale-day tools. The central navigation action is a raised yellow circle with a dark plus and no label.

Sales and photos persist in IndexedDB; preferences persist in localStorage. Publishing adds a listing to this browser's demo catalogue. Fixtures, search, matching, scan progress, statistics, estimates, maps, directions and account identity are explicitly simulated. No provider credentials, remote calls, real navigation or public listing service are needed. Clearing browser data removes local changes. See `docs/IMPLEMENTATION-STATUS.md` for UX coverage and integration work for the next phase.

Supabase owner-only database and private-storage setup is prepared in `supabase/migrations/001_seller_foundation.sql`; it has not been applied to a database. No provider credentials are needed for the local seller flow.

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
