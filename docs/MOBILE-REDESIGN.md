# Mobile redesign

The redesign uses the existing SNAB SVG logo with warm paper, ink and yellow. The landing page explains the buyer and seller journeys with direct Find and Sell actions. Editorial photography has no promotional sticker overlay. Display type is Bowlby One; body type is Atkinson Hyperlegible Next. Fonts are served locally with their OFL licences in `public/fonts`.

## Editable assets and components

- `public/brand/nav-highlight.svg`: vector silhouette based on the supplied yellow paper shape. Used behind the active bottom-navigation icon; the label remains outside it.
- `public/editorial/good-finds.png`: generated editorial image from the approved concept. This is not a real seller's listing photo. Provenance is in the adjacent README.
- `app/page.tsx` and `app/globals.css`: responsive landing page and shared design tokens.
- `components/workspace-shell.tsx`: four labelled navigation destinations.
- `components/buyer-ui.tsx` and `app/(workspace)/discovery.css`: unified discovery and sale details. Superseded rules were removed from `workspace.css`.
- `components/seller-wizard.tsx` and `app/(workspace)/seller-redesign.css`: seller progress and photo layout. Uploaded files, optional photos, draft IDs and account/device storage remain connected to the existing implementation.

## Behaviour retained

Both `/map` and `/hunt` render Find. Query, date, category, area, sample-distance, open-now, sort and view controls use URL parameters, including browser Back. Search retains synonyms and available-item match reasons. Weekend filtering uses the current/upcoming Auckland Saturday and Sunday. Unknown-distance listings remain visible under distance filters.

Sale details still use the privacy-safe buyer address, and hidden addresses lead to **View the area**. Item search, saved sales/items, sharing, community-event links and owner management remain available. The five seller forms still save and validate dates, location, photos, highlights and listing preview; the three progress groups are presentation only.

## Verification and limits

The local automated suite covers listing privacy, ranking, draft/photo storage and publishing, plus new combined-filter and weekend-boundary tests. Lint and production build are required checks. Browser QA covers the landing page at 320px and 390px, search and history, saving, hidden-address directions, and uploading a photo to a local draft.

This change does not turn the illustrative map into real navigation, add an AI service, or change database schemas. Account-connected upload/sign-in and live Hostinger deployment need their configured environment; local visual checks use demo mode. The branch is intended for review before deployment.
