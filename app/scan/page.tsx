"use client";

import Link from "next/link";
import Image from "next/image";
import { useEffect, useRef, useState } from "react";

type SelectedPhoto = { file: File; preview: string };

export default function ScanPage() {
  const [photos, setPhotos] = useState<SelectedPhoto[]>([]);
  const objectUrls = useRef(new Set<string>());

  useEffect(() => {
    const urls = objectUrls.current;
    return () => {
      urls.forEach((url) => URL.revokeObjectURL(url));
      urls.clear();
    };
  }, []);

  function addPhotos(files: FileList | null) {
    if (!files) return;
    const imageFiles = Array.from(files).filter((file) => file.type.startsWith("image/"));
    setPhotos((current) => [
      ...current,
      ...imageFiles.map((file) => {
        const preview = URL.createObjectURL(file);
        objectUrls.current.add(preview);
        return { file, preview };
      }),
    ]);
  }

  function removePhoto(preview: string) {
    URL.revokeObjectURL(preview);
    objectUrls.current.delete(preview);
    setPhotos((current) => current.filter((photo) => photo.preview !== preview));
  }

  return (
    <main className="scan-shell">
      <header className="scan-topbar">
        <Link className="brand-link" href="/" aria-label="SNAB home"><Image src="/brand/snab-highlight-final-b.svg" alt="SNAB" width={140} height={69} priority /></Link>
        <Link className="back-link" href="/">← Back home</Link>
      </header>

      <section className="scan-intro">
        <p className="eyebrow"><span className="sticker-dot" /> Private photo preview</p>
        <h1>Show us your<br /><span className="highlight">sale stuff.</span></h1>
        <p className="hero-lede">Wide photos of tables, shelves and piles are perfect. No need to photograph every item on its own.</p>
      </section>

      <section className="upload-panel" aria-labelledby="upload-heading">
        <div className="upload-heading-row">
          <div>
            <p className="eyebrow">Step 01 · Add photos</p>
            <h2 id="upload-heading">A few wide shots</h2>
          </div>
          <span className="photo-count">{photos.length} {photos.length === 1 ? "photo" : "photos"}</span>
        </div>

        <label className="upload-box">
          <input
            type="file"
            accept="image/*"
            capture="environment"
            multiple
            onChange={(event) => {
              addPhotos(event.currentTarget.files);
              event.currentTarget.value = "";
            }}
          />
          <span className="upload-icon" aria-hidden="true">＋</span>
          <strong>Take or choose photos</strong>
          <span className="upload-help">You can add several at once</span>
        </label>

        {photos.length > 0 && (
          <div className="photo-grid" aria-label="Selected photo previews">
            {photos.map((photo, index) => (
              <figure className="photo-tile" key={photo.preview}>
                {/* Local preview only. The file is not uploaded or sent to a model. */}
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={photo.preview} alt={`Selected sale photo ${index + 1}`} />
                <figcaption>
                  <span>PHOTO {String(index + 1).padStart(2, "0")}</span>
                  <button type="button" onClick={() => removePhoto(photo.preview)} aria-label={`Remove photo ${index + 1}`}>×</button>
                </figcaption>
              </figure>
            ))}
          </div>
        )}

        <div className="privacy-note">
          <span className="privacy-icon" aria-hidden="true">↗</span>
          <p><strong>Private preview.</strong> These photos stay in this browser. Analysis and upload will be connected in a later build.</p>
        </div>
        <button className="button button-primary analyze-button" type="button" disabled>
          AI analysis is not connected yet
        </button>
      </section>

      <aside className="what-next">
        <p className="eyebrow">What we’ll test next</p>
        <div className="next-steps">
          <span><b>1</b> Categories</span><span><b>2</b> What it spotted</span><span><b>3</b> Natural-language search</span>
        </div>
      </aside>
    </main>
  );
}
