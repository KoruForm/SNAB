# SNAB

Mobile-first SNAB app foundation, built for deployment as a Node.js web app on Hostinger.

## Current state

v0.3.0 includes the approved v0.4 brand assets, a persistent app shell, and a working local seller journey: dates → address/privacy → saved photos → manual highlights → editable listing preview. `/me` resumes multiple drafts. `/scan` redirects to the sale flow.

Drafts and photo blobs are stored in IndexedDB, on the same device/browser. No account, remote upload, AI, map search or public publishing is connected. Buyer destinations explicitly show their unavailable state. See `docs/IMPLEMENTATION-STATUS.md` for the full wireframe coverage and next integration gate.

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
