"use client";
import { useEffect, useRef, useState } from "react";
import type { DraftPhoto } from "../lib/drafts/types";
export default function DraftPhotoImage({ photo, className = "" }: { photo: DraftPhoto; className?: string }) {
  const image = useRef<HTMLImageElement>(null);
  const [failed, setFailed] = useState(false);
  useEffect(() => {
    if (!image.current) return;
    if (!photo.blob) { if (photo.url) image.current.src = photo.url; return; }
    const url = URL.createObjectURL(photo.blob);
    image.current.src = url;
    return () => URL.revokeObjectURL(url);
  }, [photo.blob, photo.url]);
  if (failed) return <span className={`photo-placeholder preview-unavailable ${className}`}>Photo saved · this browser can’t preview {photo.name}. Try JPG or PNG.</span>;
  // Blob URLs are managed on the image element as a browser resource and revoked on unmount;
  // account photos use short-lived signed URLs from private storage.
  // eslint-disable-next-line @next/next/no-img-element
  return <img ref={image} className={className} alt={photo.name || "Your sale photo"} onError={() => setFailed(true)} />;
}
