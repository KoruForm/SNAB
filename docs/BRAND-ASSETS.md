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
