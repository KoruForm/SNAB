import Image from "next/image";

// AI-generated placeholder photography (see docs/PLACEHOLDER-PHOTOS.md). Fictional people, not real sellers or outcomes.
export const PHOTOS = {
  hero: { src: "/photos/01-home-hero.webp", alt: "A seller and buyer smiling as a secondhand chair finds a new home.", position: "70% 35%" },
  startSale: { src: "/photos/02-start-sale.webp", alt: "Two friends setting up books and household goods for a garage sale.", position: "45% 35%" },
  reclaimedSpace: { src: "/photos/03-reclaimed-space.webp", alt: "A relaxed seller enjoying a cuppa beside a cleared garage.", position: "78% 30%" },
  photoGuide: { src: "/photos/04-photo-upload-guide.webp", alt: "A seller taking a wide photo of a garage-sale table.", position: "45% 45%" },
  buyerDiscovery: { src: "/photos/05-buyer-discovery.webp", alt: "A buyer inspecting a secondhand lamp while chatting with the seller.", position: "55% 35%" },
  communitySale: { src: "/photos/06-community-sale.webp", alt: "Neighbours and visitors browsing a shared driveway garage sale.", position: "50% 45%" },
  saleFinished: { src: "/photos/07-sale-finished.webp", alt: "Two friends relaxing with mugs of tea after a garage sale.", position: "55% 40%" },
} as const;

export type PhotoName = keyof typeof PHOTOS;

export function SnapPhoto({ name, className = "", caption, sizes = "(max-width: 620px) 100vw, 560px", priority = false }: { name: PhotoName; className?: string; caption?: string; sizes?: string; priority?: boolean }) {
  const photo = PHOTOS[name];
  return <figure className={`snap-photo ${className}`}><div className="snap-photo-frame"><Image src={photo.src} alt={photo.alt} fill sizes={sizes} priority={priority} style={{ objectFit: "cover", objectPosition: photo.position }} /></div>{caption && <figcaption>{caption}</figcaption>}</figure>;
}
