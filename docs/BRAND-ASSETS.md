# SNAB approved brand assets

Approved source: SNAB-asset-library-v0.4-smoothed.zip (4 October 2026).
Earlier packs are superseded. The SVG masters in `public/brand` are copied unchanged from v0.4. They are the approved artwork, not new interpretations. The source pack’s sticker crops remain references; low-resolution crops are not enlarged as finished UI assets.

Palette: paper #F7F3E8, ink #222321, yellow #F2C94C, blue #244D61, clay #C86F50, green #4F9B68.
Display: Bowlby One. Body/UI: Atkinson Hyperlegible Next.
Prominent explanatory line: Garage Sales Made Easy.

This release updates the landing page and local photo-preview route. AI, remote uploads, database, map/search and sale publishing remain unconnected and are described as planned functionality.

## Sale sign (A4 PDF)

- `design/sign/a4-template.svg` is Josh's sign design (Affinity export, 2481 × 3508 px = A4 at 300 dpi) with the per-sale text left out.
- `public/sign/a4-template.png` is that SVG rendered in Chromium with Bowlby One SC installed, then reduced to a 32-colour palette. Re-render it whenever the SVG changes.
- `lib/mock/sign.ts` draws the title, days and address over it in Bowlby One SC (`public/sign/BowlbyOneSC-Regular.ttf`, SIL Open Font License) and puts the QR code in the white square. Design sizes: title 30 pt, day 24 pt, date and time 20 pt, address 36 pt; one or two days are drawn larger, and everything shrinks to fit long text.

## Social post and story images

- `design/social/sale-post.svg` (1080 × 1350) and `design/social/sale-story.svg` (1080 × 1920) are Josh's templates. Each was split in Chromium into `public/social/<kind>-base.png` (everything but the photo), `<kind>-mask.png` (the photo's torn edge, as alpha) and `<kind>-photo.jpg` (his sample photo, used when a sale has no photo).
- `lib/mock/social.ts` draws the seller's first photo into the mask, then the title, up to three days (e.g. "SATURDAY / 10 OCT / 8AM - 1PM"), the buyer-visible address and up to three category tags in Bowlby One SC, and saves a JPEG. The story's bottom orange strip is left empty for Instagram's link sticker.
- To do: category tags are plain text for now. Josh is making a paper-label background for each category to replace them.
